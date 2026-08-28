import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import useWebRTCCall from "./useWebRTCCall";
import "./CallInterface.css";

/*
============================================================
CALL INTERFACE
============================================================
*/

const CallInterface = ({
  supabase,
  userId,
  outgoingBookingId = null,
}) => {
  const [incomingCall, setIncomingCall] =
    useState(null);

  const [activeCall, setActiveCall] =
    useState(null);

  /*
  ==========================================================
  HANDLE INCOMING CALL
  ==========================================================
  */

  const handleIncomingCall =
    useCallback(
      (call) => {
        if (!call) {
          return;
        }

        /*
        ------------------------------------------------------
        ONLY CALLING SESSIONS
        ------------------------------------------------------
        */

        if (
          call.status !== "calling"
        ) {
          return;
        }

        /*
        ------------------------------------------------------
        IGNORE OUR OWN OUTGOING CALL
        ------------------------------------------------------

        We use outgoingBookingId exactly as your
        existing working flow does.
        ------------------------------------------------------
        */

        if (
          outgoingBookingId &&
          call.booking_id ===
            outgoingBookingId
        ) {
          console.log(
            "Ignoring own outgoing call:",
            call.id
          );

          return;
        }

        /*
        ------------------------------------------------------
        USER MUST BE A PARTICIPANT
        ------------------------------------------------------
        */

        if (
          call.renter_id !== userId &&
          call.owner_id !== userId
        ) {
          return;
        }

        console.log(
          "Incoming UgO call:",
          call
        );

        setIncomingCall(call);
      },
      [
        outgoingBookingId,
        userId,
      ]
    );

  /*
  ==========================================================
  SUPABASE REALTIME
  ==========================================================
  */

  useEffect(() => {
    if (
      !supabase ||
      !userId
    ) {
      return;
    }

    const channel =
      supabase
        .channel(
          `incoming-calls-${userId}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "call_sessions",
            filter:
              `owner_id=eq.${userId}`,
          },
          (payload) => {
            handleIncomingCall(
              payload.new
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "call_sessions",
            filter:
              `renter_id=eq.${userId}`,
          },
          (payload) => {
            handleIncomingCall(
              payload.new
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    handleIncomingCall,
    supabase,
    userId,
  ]);

  /*
  ==========================================================
  NEW:
  SERVICE WORKER MESSAGE
  ==========================================================

  This does NOT create a WebRTC call.

  It only recovers the existing call_sessions record
  and feeds it into the existing incoming-call UI.
  ==========================================================
  */

  useEffect(() => {
    if (
      !supabase ||
      !userId
    ) {
      return;
    }

    if (
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const handleServiceWorkerMessage =
      async (event) => {
        const data =
          event.data;

        if (
          !data ||
          data.type !==
            "INCOMING_CALL_NOTIFICATION"
        ) {
          return;
        }

        const callId =
          data.call_id;

        if (!callId) {
          return;
        }

        console.log(
          "Incoming call from Service Worker:",
          callId
        );

        try {
          /*
          ----------------------------------------------------
          FETCH EXISTING CALL SESSION
          ----------------------------------------------------
          */

          const {
            data: call,
            error,
          } = await supabase
            .from("call_sessions")
            .select("*")
            .eq(
              "id",
              callId
            )
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (!call) {
            console.warn(
              "Call session not found:",
              callId
            );

            return;
          }

          /*
          ----------------------------------------------------
          SEND INTO EXISTING CALL HANDLER
          ----------------------------------------------------
          */

          handleIncomingCall(
            call
          );
        } catch (error) {
          console.error(
            "Failed to recover incoming call:",
            error
          );
        }
      };

    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage
      );
    };
  }, [
    handleIncomingCall,
    supabase,
    userId,
  ]);

  /*
  ==========================================================
  NEW:
  CHECK URL FOR CALL FROM SERVICE WORKER
  ==========================================================

  This handles the case where UgO was completely closed
  and the notification opens:

  /?incoming_call=CALL_ID
  ==========================================================
  */

  useEffect(() => {
    if (
      !supabase ||
      !userId
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const callId =
      params.get(
        "incoming_call"
      );

    if (!callId) {
      return;
    }

    let cancelled = false;

    const loadIncomingCall =
      async () => {
        try {
          console.log(
            "Loading notification call:",
            callId
          );

          const {
            data: call,
            error,
          } = await supabase
            .from("call_sessions")
            .select("*")
            .eq(
              "id",
              callId
            )
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (
            cancelled ||
            !call
          ) {
            return;
          }

          handleIncomingCall(
            call
          );

          /*
          ----------------------------------------------------
          REMOVE CALL QUERY FROM URL
          ----------------------------------------------------
          */

          const cleanUrl =
            new URL(
              window.location.href
            );

          cleanUrl.searchParams.delete(
            "incoming_call"
          );

          cleanUrl.searchParams.delete(
            "booking_id"
          );

          cleanUrl.searchParams.delete(
            "call_action"
          );

          window.history.replaceState(
            {},
            document.title,
            cleanUrl.pathname +
              cleanUrl.search +
              cleanUrl.hash
          );
        } catch (error) {
          console.error(
            "Failed to load notification call:",
            error
          );
        }
      };

    loadIncomingCall();

    return () => {
      cancelled = true;
    };
  }, [
    handleIncomingCall,
    supabase,
    userId,
  ]);

  /*
  ==========================================================
  ACCEPT CALL
  ==========================================================
  */

  const acceptCall =
    useCallback(
      async () => {
        if (
          !incomingCall
        ) {
          return;
        }

        try {
          /*
          ----------------------------------------------------
          MARK CALL AS RINGING
          ----------------------------------------------------
          */

          const {
            error,
          } = await supabase
            .from(
              "call_sessions"
            )
            .update({
              status:
                "ringing",
            })
            .eq(
              "id",
              incomingCall.id
            );

          if (error) {
            throw error;
          }

          /*
          ----------------------------------------------------
          EXISTING WEBRTC RECEIVER FLOW
          ----------------------------------------------------
          */

          setActiveCall({
            callId:
              incomingCall.id,

            remoteUserId:
              userId ===
              incomingCall.renter_id
                ? incomingCall.owner_id
                : incomingCall.renter_id,

            isCaller:
              false,
          });

          setIncomingCall(
            null
          );
        } catch (error) {
          console.error(
            "Failed to accept call:",
            error
          );
        }
      },
      [
        incomingCall,
        supabase,
        userId,
      ]
    );

  /*
  ==========================================================
  REJECT CALL
  ==========================================================
  */

  const rejectCall =
    useCallback(
      async () => {
        if (
          !incomingCall
        ) {
          return;
        }

        try {
          const {
            error,
          } = await supabase
            .from(
              "call_sessions"
            )
            .update({
              status:
                "rejected",

              ended_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              incomingCall.id
            );

          if (error) {
            throw error;
          }
        } catch (error) {
          console.error(
            "Failed to reject call:",
            error
          );
        }

        setIncomingCall(
          null
        );
      },
      [
        incomingCall,
        supabase,
      ]
    );

  /*
  ==========================================================
  ACTIVE WEBRTC CALL
  ==========================================================
  */

  if (activeCall) {
    return (
      <ActiveCall
        supabase={supabase}
        userId={userId}
        call={activeCall}
        onClose={() => {
          setActiveCall(
            null
          );
        }}
      />
    );
  }

  /*
  ==========================================================
  INCOMING CALL POPUP
  ==========================================================
  */

  if (incomingCall) {
    return (
      <div className="ugo-incoming-call-overlay">

        <div className="ugo-incoming-call-card">

          <div className="ugo-call-icon">
            📞
          </div>

          <h2>
            Incoming UgO Call
          </h2>

          <p>
            Your renter is calling you.
          </p>

          <div className="ugo-incoming-call-buttons">

            <button
              type="button"
              className="ugo-call-reject-button"
              onClick={
                rejectCall
              }
            >
              Reject
            </button>

            <button
              type="button"
              className="ugo-call-accept-button"
              onClick={
                acceptCall
              }
            >
              Accept
            </button>

          </div>

        </div>

      </div>
    );
  }

  return null;
};

/*
============================================================
ACTIVE CALL
============================================================
*/

const ActiveCall = ({
  supabase,
  userId,
  call,
  onClose,
}) => {
  const {
    callStatus,
    isMuted,
    toggleMute,
    endCall,
    remoteAudioRef,
  } = useWebRTCCall({
    supabase,
    callId:
      call.callId,
    userId,
    isCaller:
      call.isCaller,
    enabled: true,
  });

  /*
  ----------------------------------------------------------
  CLOSE AFTER CALL ENDS
  ----------------------------------------------------------
  */

  useEffect(() => {
    if (
      callStatus === "ended" ||
      callStatus === "failed"
    ) {
      const timer =
        setTimeout(() => {
          onClose();
        }, 1000);

      return () => {
        clearTimeout(
          timer
        );
      };
    }
  }, [
    callStatus,
    onClose,
  ]);

  /*
  ----------------------------------------------------------
  END CALL
  ----------------------------------------------------------
  */

  const handleEndCall =
    async () => {
      await endCall();
      onClose();
    };

  /*
  ----------------------------------------------------------
  STATUS TEXT
  ----------------------------------------------------------
  */

  let statusText =
    "Connecting...";

  if (
    callStatus === "ringing"
  ) {
    statusText =
      "Ringing...";
  }

  if (
    callStatus === "connecting"
  ) {
    statusText =
      "Connecting...";
  }

  if (
    callStatus === "connected"
  ) {
    statusText =
      "Connected";
  }

  if (
    callStatus === "failed"
  ) {
    statusText =
      "Unable to establish the call";
  }

  if (
    callStatus === "disconnected"
  ) {
    statusText =
      "Connection interrupted";
  }

  if (
    callStatus === "ended"
  ) {
    statusText =
      "Call ended";
  }

  /*
  ----------------------------------------------------------
  UI
  ----------------------------------------------------------
  */

  return (
    <div className="ugo-active-call-overlay">

      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
      />

      <div className="ugo-active-call-card">

        <div className="ugo-active-call-icon">
          📞
        </div>

        <h2>
          UgO Voice Call
        </h2>

        <p className="ugo-call-status">
          {statusText}
        </p>

        <div className="ugo-call-controls">

          <button
            type="button"
            className="ugo-call-mute-button"
            onClick={
              toggleMute
            }
          >
            {isMuted
              ? "Unmute"
              : "Mute"}
          </button>

          <button
            type="button"
            className="ugo-call-end-button"
            onClick={
              handleEndCall
            }
          >
            End Call
          </button>

        </div>

      </div>

    </div>
  );
};

export default CallInterface;