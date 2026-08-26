import { useCallback, useEffect, useRef, useState } from "react";

/*
  WebRTC configuration.

  STUN is enough for initial testing.
  Later, add your TURN server here for production reliability.
*/

const RTC_CONFIGURATION = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

export default function useWebRTCCall({
  supabase,
  callId,
  userId,
  isCaller = false,
  enabled = true,
}) {
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const signalChannelRef = useRef(null);

  /*
   * --------------------------------------------------------
   * WEBRTC SIGNALING STATE
   * --------------------------------------------------------
   *
   * These refs solve signaling race conditions.
   */

  // ICE candidates that arrive before the remote
  // offer/answer has been applied.
  const pendingIceCandidatesRef = useRef([]);

  // Prevent the same signal from being processed twice.
  const processedSignalsRef = useRef(new Set());

  // Prevent the caller from creating multiple offers.
  const offerCreatedRef = useRef(false);

  // Make signal processing sequential.
  // This prevents offer/ICE/answer processing from
  // happening at the same time.
  const signalQueueRef = useRef(Promise.resolve());

  const [callStatus, setCallStatus] = useState(
    isCaller ? "connecting" : "ringing"
  );

  const [isMuted, setIsMuted] = useState(false);

  /*
   * --------------------------------------------------------
   * CREATE WEBRTC PEER CONNECTION
   * --------------------------------------------------------
   */

  const createPeerConnection = useCallback(async () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const peerConnection =
      new RTCPeerConnection(RTC_CONFIGURATION);

    peerConnectionRef.current = peerConnection;

    /*
     * Request microphone permission.
     */

    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

    localStreamRef.current = stream;

    /*
     * Add microphone tracks to WebRTC.
     */

    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    /*
     * Receive remote audio.
     */

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject =
          remoteStream;

        remoteAudioRef.current
          .play()
          .catch((error) => {
            console.warn(
              "Remote audio autoplay was blocked:",
              error
            );
          });
      }
    };

    /*
     * ------------------------------------------------------
     * SEND ICE CANDIDATES
     * ------------------------------------------------------
     */

    peerConnection.onicecandidate = async (
      event
    ) => {
      if (!event.candidate) {
        return;
      }

      try {
        const { error } =
          await supabase
            .from("call_signals")
            .insert({
              call_id: callId,
              sender_id: userId,
              signal_type: "ice-candidate",
              signal_data:
                event.candidate.toJSON(),
            });

        if (error) {
          console.error(
            "Failed to send ICE candidate:",
            error
          );
        }
      } catch (error) {
        console.error(
          "Failed to send ICE candidate:",
          error
        );
      }
    };

    /*
     * ------------------------------------------------------
     * MONITOR CONNECTION
     * ------------------------------------------------------
     */

    peerConnection.onconnectionstatechange =
      async () => {
        const state =
          peerConnection.connectionState;

        console.log(
          "WebRTC connection state:",
          state
        );

        if (state === "connecting") {
          setCallStatus("connecting");
        }

        if (state === "connected") {
          setCallStatus("connected");

          const { error } =
            await supabase
              .from("call_sessions")
              .update({
                status: "connected",
                started_at:
                  new Date().toISOString(),
              })
              .eq("id", callId);

          if (error) {
            console.error(
              "Failed to update call as connected:",
              error
            );
          }
        }

        if (state === "failed") {
          setCallStatus("failed");
        }

        if (state === "disconnected") {
          setCallStatus("disconnected");
        }

        if (state === "closed") {
          setCallStatus("ended");
        }
      };

    return peerConnection;
  }, [callId, supabase, userId]);

  /*
   * --------------------------------------------------------
   * ADD PENDING ICE CANDIDATES
   * --------------------------------------------------------
   *
   * ICE candidates can arrive before the remote
   * description has been applied.
   *
   * Once the remote description is available,
   * add all queued candidates.
   */

  const flushPendingIceCandidates =
    useCallback(async (peerConnection) => {
      if (
        !peerConnection.remoteDescription
      ) {
        return;
      }

      const pendingCandidates =
        pendingIceCandidatesRef.current;

      if (
        pendingCandidates.length === 0
      ) {
        return;
      }

      console.log(
        `Adding ${pendingCandidates.length} queued ICE candidate(s).`
      );

      pendingIceCandidatesRef.current = [];

      for (const candidate of pendingCandidates) {
        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.error(
            "Failed to add queued ICE candidate:",
            error
          );
        }
      }
    }, []);

  /*
   * --------------------------------------------------------
   * CREATE OFFER
   * --------------------------------------------------------
   */

  const createOffer = useCallback(async () => {
    /*
     * Prevent duplicate offers.
     */

    if (offerCreatedRef.current) {
      console.log(
        "WebRTC offer already created. Skipping duplicate offer."
      );

      return;
    }

    offerCreatedRef.current = true;

    try {
      const peerConnection =
        await createPeerConnection();

      const offer =
        await peerConnection.createOffer();

      await peerConnection.setLocalDescription(
        offer
      );

      /*
       * Store offer in call_sessions.
       */

      const { error: updateError } =
        await supabase
          .from("call_sessions")
          .update({
            offer: offer,
            status: "ringing",
          })
          .eq("id", callId);

      if (updateError) {
        throw updateError;
      }

      /*
       * Send offer through signaling table.
       */

      const { error: signalError } =
        await supabase
          .from("call_signals")
          .insert({
            call_id: callId,
            sender_id: userId,
            signal_type: "offer",
            signal_data: offer,
          });

      if (signalError) {
        throw signalError;
      }

      console.log(
        "WebRTC offer sent."
      );
    } catch (error) {
      console.error(
        "Failed to create WebRTC offer:",
        error
      );

      /*
       * Allow retry if offer creation failed.
       */

      offerCreatedRef.current = false;

      setCallStatus("failed");
    }
  }, [
    callId,
    createPeerConnection,
    supabase,
    userId,
  ]);

  /*
   * --------------------------------------------------------
   * HANDLE A SINGLE WEBRTC SIGNAL
   * --------------------------------------------------------
   */

  const handleSignal = useCallback(
    async (signal) => {
      if (!signal) {
        return;
      }

      /*
       * Ignore our own signals.
       */

      if (signal.sender_id === userId) {
        return;
      }

      /*
       * Create a unique key for this signal.
       *
       * Normally call_signals has an id.
       * The fallback also works if id is unavailable.
       */

      const signalKey =
        signal.id ||
        `${signal.call_id}-${signal.sender_id}-${signal.signal_type}-${JSON.stringify(
          signal.signal_data
        )}`;

      /*
       * Ignore duplicate signals.
       */

      if (
        processedSignalsRef.current.has(
          signalKey
        )
      ) {
        console.log(
          "Ignoring duplicate WebRTC signal:",
          signal.signal_type
        );

        return;
      }

      /*
       * Create peer connection.
       */

      const peerConnection =
        await createPeerConnection();

      try {
        /*
         * ----------------------------------------------------
         * INCOMING OFFER
         * ----------------------------------------------------
         *
         * Receiver / owner side.
         */

        if (
          signal.signal_type === "offer" &&
          !isCaller
        ) {
          /*
           * If an offer has already been applied,
           * don't apply it again.
           */

          if (
            peerConnection.remoteDescription
          ) {
            console.log(
              "Remote offer already exists. Ignoring duplicate offer."
            );

            processedSignalsRef.current.add(
              signalKey
            );

            return;
          }

          console.log(
            "Received WebRTC offer."
          );

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              signal.signal_data
            )
          );

          /*
           * Add any ICE candidates that arrived
           * before the offer.
           */

          await flushPendingIceCandidates(
            peerConnection
          );

          /*
           * Create answer.
           */

          const answer =
            await peerConnection.createAnswer();

          await peerConnection.setLocalDescription(
            answer
          );

          /*
           * Save answer.
           */

          const { error: updateError } =
            await supabase
              .from("call_sessions")
              .update({
                answer: answer,
                status: "ringing",
              })
              .eq("id", callId);

          if (updateError) {
            throw updateError;
          }

          /*
           * Send answer.
           */

          const { error: signalError } =
            await supabase
              .from("call_signals")
              .insert({
                call_id: callId,
                sender_id: userId,
                signal_type: "answer",
                signal_data: answer,
              });

          if (signalError) {
            throw signalError;
          }

          processedSignalsRef.current.add(
            signalKey
          );

          console.log(
            "WebRTC answer sent."
          );

          return;
        }

        /*
         * ----------------------------------------------------
         * INCOMING ANSWER
         * ----------------------------------------------------
         *
         * Caller / renter side.
         */

        if (
          signal.signal_type === "answer" &&
          isCaller
        ) {
          /*
           * If an answer is already present,
           * don't apply it again.
           */

          if (
            peerConnection.remoteDescription
          ) {
            console.log(
              "Remote answer already exists. Ignoring duplicate answer."
            );

            processedSignalsRef.current.add(
              signalKey
            );

            return;
          }

          console.log(
            "Received WebRTC answer."
          );

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              signal.signal_data
            )
          );

          /*
           * Add ICE candidates that may have
           * arrived before the answer.
           */

          await flushPendingIceCandidates(
            peerConnection
          );

          processedSignalsRef.current.add(
            signalKey
          );

          return;
        }

        /*
         * ----------------------------------------------------
         * INCOMING ICE CANDIDATE
         * ----------------------------------------------------
         */

        if (
          signal.signal_type ===
          "ice-candidate"
        ) {
          /*
           * If remote description is not ready yet,
           * queue this candidate.
           */

          if (
            !peerConnection.remoteDescription
          ) {
            console.log(
              "Remote description not ready. Queueing ICE candidate."
            );

            pendingIceCandidatesRef.current.push(
              signal.signal_data
            );

            processedSignalsRef.current.add(
              signalKey
            );

            return;
          }

          /*
           * Remote description is ready,
           * so add ICE immediately.
           */

          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(
                signal.signal_data
              )
            );

            console.log(
              "ICE candidate added."
            );

            processedSignalsRef.current.add(
              signalKey
            );
          } catch (error) {
            console.error(
              "Failed to add ICE candidate:",
              error
            );
          }

          return;
        }
      } catch (error) {
        console.error(
          "Failed to process WebRTC signal:",
          error
        );

        setCallStatus("failed");
      }
    },
    [
      callId,
      createPeerConnection,
      flushPendingIceCandidates,
      isCaller,
      supabase,
      userId,
    ]
  );

  /*
   * --------------------------------------------------------
   * QUEUE SIGNAL PROCESSING
   * --------------------------------------------------------
   *
   * Realtime signals and database-recovered signals
   * are processed one at a time.
   *
   * This is important because:
   *
   * OFFER
   *   ↓
   * ANSWER
   *   ↓
   * ICE
   *
   * should not be processed simultaneously.
   */

  const enqueueSignal = useCallback(
    (signal) => {
      signalQueueRef.current =
        signalQueueRef.current
          .then(async () => {
            await handleSignal(signal);
          })
          .catch((error) => {
            console.error(
              "WebRTC signal queue error:",
              error
            );
          });

      return signalQueueRef.current;
    },
    [handleSignal]
  );

  /*
   * --------------------------------------------------------
   * RECOVER EXISTING SIGNALS
   * --------------------------------------------------------
   *
   * IMPORTANT FIX:
   *
   * Supabase Realtime only gives us INSERT events
   * that happen while we are subscribed.
   *
   * If the caller already inserted the offer before
   * the owner accepted the call, the owner will miss
   * that realtime event.
   *
   * Therefore, after SUBSCRIBED, the receiver checks
   * the database for signals that already exist.
   */

  const recoverExistingSignals =
    useCallback(async () => {
      if (!callId || isCaller) {
        return;
      }

      try {
        console.log(
          "Checking for existing WebRTC signals..."
        );

        const {
          data: existingSignals,
          error,
        } = await supabase
          .from("call_signals")
          .select("*")
          .eq("call_id", callId);

        if (error) {
          throw error;
        }

        if (
          existingSignals &&
          existingSignals.length > 0
        ) {
          console.log(
            `Found ${existingSignals.length} existing WebRTC signal(s).`
          );

          /*
           * IMPORTANT:
           * Process OFFER first.
           *
           * Then process ICE candidates.
           *
           * This guarantees that an ICE candidate
           * doesn't get processed before the offer.
           */

          const offers =
            existingSignals.filter(
              (signal) =>
                signal.signal_type ===
                  "offer" &&
                signal.sender_id !== userId
            );

          const otherSignals =
            existingSignals.filter(
              (signal) =>
                signal.signal_type !==
                  "offer" &&
                signal.sender_id !== userId
            );

          for (const signal of offers) {
            await enqueueSignal(signal);
          }

          for (const signal of otherSignals) {
            await enqueueSignal(signal);
          }
        } else {
          console.log(
            "No existing WebRTC signals found."
          );
        }

        /*
         * --------------------------------------------------
         * FALLBACK:
         * Check call_sessions.offer directly.
         * --------------------------------------------------
         *
         * This protects against a situation where
         * call_sessions contains the offer but the
         * call_signals row is unavailable.
         */

        const {
          data: callSession,
          error: sessionError,
        } = await supabase
          .from("call_sessions")
          .select("offer, answer")
          .eq("id", callId)
          .maybeSingle();

        if (sessionError) {
          console.warn(
            "Could not check call_sessions for fallback offer:",
            sessionError
          );

          return;
        }

        if (
          callSession?.offer &&
          !isCaller
        ) {
          /*
           * Check whether an offer was already found.
           */

          const offerAlreadyFound =
            existingSignals?.some(
              (signal) =>
                signal.signal_type ===
                  "offer" &&
                signal.sender_id !== userId
            );

          if (!offerAlreadyFound) {
            console.log(
              "Found offer in call_sessions. Recovering it."
            );

            await enqueueSignal({
              id: `fallback-offer-${callId}`,
              call_id: callId,
              sender_id: "remote",
              signal_type: "offer",
              signal_data:
                callSession.offer,
            });
          }
        }
      } catch (error) {
        console.error(
          "Failed to recover existing WebRTC signals:",
          error
        );
      }
    }, [
      callId,
      enqueueSignal,
      isCaller,
      supabase,
      userId,
    ]);

  /*
   * --------------------------------------------------------
   * SUBSCRIBE TO WEBRTC SIGNALING
   * --------------------------------------------------------
   */

  useEffect(() => {
    if (
      !enabled ||
      !callId ||
      !userId ||
      !supabase
    ) {
      return;
    }

    let cancelled = false;

    /*
     * Reset signaling state for this call.
     */

    pendingIceCandidatesRef.current = [];
    processedSignalsRef.current.clear();
    offerCreatedRef.current = false;
    signalQueueRef.current =
      Promise.resolve();

    const setupSignaling = async () => {
      const channel = supabase
        .channel(`call-signals-${callId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "call_signals",
            filter: `call_id=eq.${callId}`,
          },
          async (payload) => {
            if (cancelled) {
              return;
            }

            console.log(
              "Realtime WebRTC signal received:",
              payload.new.signal_type
            );

            /*
             * Queue realtime signal.
             */

            await enqueueSignal(
              payload.new
            );
          }
        )
        .subscribe(async (status) => {
          console.log(
            "Call signaling status:",
            status
          );

          if (
            status !== "SUBSCRIBED" ||
            cancelled
          ) {
            return;
          }

          /*
           * ------------------------------------------------
           * CALLER
           * ------------------------------------------------
           *
           * Caller creates offer only after
           * realtime subscription is ready.
           */

          if (isCaller) {
            await createOffer();

            return;
          }

          /*
           * ------------------------------------------------
           * RECEIVER
           * ------------------------------------------------
           *
           * Receiver checks existing signals because
           * the offer may have been created before the
           * receiver accepted the call.
           */

          await recoverExistingSignals();
        });

      signalChannelRef.current = channel;
    };

    setupSignaling();

    /*
     * ------------------------------------------------------
     * CLEANUP
     * ------------------------------------------------------
     */

    return () => {
      cancelled = true;

      if (signalChannelRef.current) {
        supabase.removeChannel(
          signalChannelRef.current
        );

        signalChannelRef.current = null;
      }

      /*
       * Clear pending signaling state.
       */

      pendingIceCandidatesRef.current = [];
      processedSignalsRef.current.clear();
      offerCreatedRef.current = false;
    };
  }, [
    callId,
    createOffer,
    enqueueSignal,
    isCaller,
    recoverExistingSignals,
    supabase,
    userId,
    enabled,
  ]);

  /*
   * --------------------------------------------------------
   * MUTE / UNMUTE MICROPHONE
   * --------------------------------------------------------
   */

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) {
      return;
    }

    const audioTracks =
      localStreamRef.current.getAudioTracks();

    audioTracks.forEach((track) => {
      track.enabled = !track.enabled;
    });

    setIsMuted(
      audioTracks.length > 0
        ? !audioTracks[0].enabled
        : false
    );
  }, []);

  /*
   * --------------------------------------------------------
   * END CALL
   * --------------------------------------------------------
   */

  const endCall = useCallback(async () => {
    try {
      /*
       * Stop microphone.
       */

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        localStreamRef.current = null;
      }

      /*
       * Close WebRTC connection.
       */

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      /*
       * Remove remote audio.
       */

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject =
          null;
      }

      /*
       * Clear queued ICE candidates.
       */

      pendingIceCandidatesRef.current = [];

      /*
       * Mark call as ended.
       */

      const { error } =
        await supabase
          .from("call_sessions")
          .update({
            status: "ended",
            ended_at:
              new Date().toISOString(),
          })
          .eq("id", callId);

      if (error) {
        console.error(
          "Failed to update call as ended:",
          error
        );
      }

      setCallStatus("ended");
    } catch (error) {
      console.error(
        "Failed to end call:",
        error
      );
    }
  }, [callId, supabase]);

  /*
   * --------------------------------------------------------
   * CLEANUP WHEN COMPONENT DISAPPEARS
   * --------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        localStreamRef.current = null;
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      pendingIceCandidatesRef.current = [];
      processedSignalsRef.current.clear();
      signalQueueRef.current =
        Promise.resolve();
    };
  }, []);

  /*
   * --------------------------------------------------------
   * RETURN
   * --------------------------------------------------------
   */

  return {
    callStatus,
    isMuted,
    toggleMute,
    endCall,
    remoteAudioRef,
  };
}