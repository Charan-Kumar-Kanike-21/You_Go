import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import useWebRTCCall from "./useWebRTCCall";
import "./CallInterface.css";

/*
 * CallInterface
 *
 * This component handles:
 *
 * 1. Incoming call detection
 * 2. Accept
 * 3. Reject
 * 4. Active voice call
 * 5. Mute / unmute
 * 6. End call
 *
 * It should be rendered somewhere that remains mounted
 * while the user is using the UgO application.
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
   * --------------------------------------------------------
   * Listen for incoming calls
   * --------------------------------------------------------
   */

  /*
   * --------------------------------------------------------
   * HANDLE INCOMING CALL
   * --------------------------------------------------------
   *
   * A call_session contains both participants, but it does
   * not store which participant initiated the call.
   *
   * The current browser already knows the booking it is
   * calling through outgoingBookingId. Therefore, ignore
   * that booking here so the caller cannot see its own
   * incoming-call popup.
   */
  const handleIncomingCall = useCallback(
    (call) => {
      if (!call) {
        return;
      }

      /*
       * Only calls in the initial calling state can
       * produce an answer/reject popup.
       */
      if (call.status !== "calling") {
        return;
      }

      /*
       * CRITICAL:
       * If this browser initiated a call for the same
       * booking, do not show the incoming interface.
       */
      if (
        outgoingBookingId &&
        call.booking_id === outgoingBookingId
      ) {
        console.log(
          "Ignoring own outgoing call:",
          call.id
        );
        return;
      }

      /*
       * Make sure the current user is actually one of
       * the two participants.
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

  useEffect(() => {
    if (!supabase || !userId) {
      return;
    }

    /*
     * Listen for calls where the current user is either
     * the owner or the renter.
     *
     * We later ignore calls belonging to the booking that
     * this same browser is currently calling from.
     */
    const channel = supabase
      .channel(
        `incoming-calls-${userId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          handleIncomingCall(payload.new);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
          filter: `renter_id=eq.${userId}`,
        },
        (payload) => {
          handleIncomingCall(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    handleIncomingCall,
    supabase,
    userId,
    outgoingBookingId,
  ]);

  /*
   * --------------------------------------------------------
   * Start a call
   * --------------------------------------------------------
   *
   * This function is what your existing
   * "Call Owner" button should call.
   */

  const startCall = useCallback(
    async (booking) => {
      if (!booking) {
        console.error(
          "Booking information is required."
        );
        return;
      }

      if (!userId) {
        console.error(
          "User is not authenticated."
        );
        return;
      }

      /*
       * Only renter or owner belonging to this
       * booking can initiate the call.
       */
      if (
        booking.renter_id !== userId &&
        booking.owner_id !== userId
      ) {
        console.error(
          "You are not part of this booking."
        );
        return;
      }

      /*
       * Calls should only be allowed during
       * an active rental.
       */
      if (
        booking.status !== "active" &&
        booking.status !== "return_pending"
      ) {
        console.error(
          "Calling is available only during an active rental or while a return is pending."
        );
        return;
      }

      /*
       * Prevent multiple calls from the same
       * interface.
       */
      if (activeCall || incomingCall) {
        console.log(
          "A call is already in progress."
        );
        return;
      }

      try {
        /*
         * Create call session.
         */
        const { data: call, error } =
          await supabase
            .from("call_sessions")
            .insert({
              booking_id: booking.id,
              renter_id:
                booking.renter_id,
              owner_id:
                booking.owner_id,
              status: "calling",
            })
            .select("*")
            .single();

        if (error) {
          throw error;
        }

        if (!call) {
          throw new Error(
            "Call session was not created."
          );
        }

        /*
         * The person who pressed the button
         * becomes the caller.
         */
        setActiveCall({
          callId: call.id,
          remoteUserId:
            userId === booking.renter_id
              ? booking.owner_id
              : booking.renter_id,
          isCaller: true,
        });
      } catch (error) {
        console.error(
          "Failed to start UgO call:",
          error
        );
      }
    },
    [
      activeCall,
      incomingCall,
      supabase,
      userId,
    ]
  );

  /*
   * --------------------------------------------------------
   * Accept incoming call
   * --------------------------------------------------------
   */

  const acceptCall = useCallback(
    async () => {
      if (!incomingCall) {
        return;
      }

      try {
        /*
         * Mark call as ringing.
         */
        const { error } =
          await supabase
            .from("call_sessions")
            .update({
              status: "ringing",
            })
            .eq(
              "id",
              incomingCall.id
            );

        if (error) {
          throw error;
        }

        /*
         * Receiver joins WebRTC.
         */
        setActiveCall({
          callId: incomingCall.id,
          remoteUserId:
            userId === incomingCall.renter_id
              ? incomingCall.owner_id
              : incomingCall.renter_id,
          isCaller: false,
        });

        setIncomingCall(null);
      } catch (error) {
        console.error(
          "Failed to accept call:",
          error
        );
      }
    },
    [incomingCall, supabase]
  );

  /*
   * --------------------------------------------------------
   * Reject incoming call
   * --------------------------------------------------------
   */

  const rejectCall = useCallback(
    async () => {
      if (!incomingCall) {
        return;
      }

      try {
        await supabase
          .from("call_sessions")
          .update({
            status: "rejected",
            ended_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            incomingCall.id
          );
      } catch (error) {
        console.error(
          "Failed to reject call:",
          error
        );
      }

      setIncomingCall(null);
    },
    [incomingCall, supabase]
  );

  /*
   * --------------------------------------------------------
   * Active WebRTC call
   * --------------------------------------------------------
   */

  if (activeCall) {
    return (
      <ActiveCall
        supabase={supabase}
        userId={userId}
        call={activeCall}
        onClose={() => {
          setActiveCall(null);
        }}
      />
    );
  }

  /*
   * --------------------------------------------------------
   * Incoming call popup
   * --------------------------------------------------------
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
              onClick={rejectCall}
            >
              Reject
            </button>

            <button
              type="button"
              className="ugo-call-accept-button"
              onClick={acceptCall}
            >
              Accept
            </button>

          </div>

        </div>

      </div>
    );
  }

  /*
   * Nothing to display when there is
   * no incoming or active call.
   */

  return null;
};


/*
 * ============================================================
 * ACTIVE CALL COMPONENT
 * ============================================================
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
    callId: call.callId,
    userId,
    isCaller: call.isCaller,
    enabled: true,
  });

  /*
   * Close local interface when call has ended.
   */
  useEffect(() => {
    if (
      callStatus === "ended" ||
      callStatus === "failed"
    ) {
      const timer = setTimeout(() => {
        onClose();
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [callStatus, onClose]);

  const handleEndCall = async () => {
    await endCall();
    onClose();
  };

  let statusText = "Connecting...";

  if (callStatus === "ringing") {
    statusText = "Ringing...";
  }

  if (callStatus === "connecting") {
    statusText = "Connecting...";
  }

  if (callStatus === "connected") {
    statusText = "Connected";
  }

  if (callStatus === "failed") {
    statusText =
      "Unable to establish the call";
  }

  if (callStatus === "disconnected") {
    statusText =
      "Connection interrupted";
  }

  if (callStatus === "ended") {
    statusText = "Call ended";
  }

  return (
    <div className="ugo-active-call-overlay">

      {/*
       * Hidden audio element.
       *
       * WebRTC puts the remote audio stream
       * into this element.
       */}

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
            onClick={toggleMute}
          >
            {isMuted
              ? "Unmute"
              : "Mute"}
          </button>

          <button
            type="button"
            className="ugo-call-end-button"
            onClick={handleEndCall}
          >
            End Call
          </button>

        </div>

      </div>

    </div>
  );
};

export default CallInterface;