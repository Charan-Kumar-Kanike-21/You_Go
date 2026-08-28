import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import CallInterface from "./CallInterface";
import useWebRTCCall from "./useWebRTCCall";
import "./CallProvider.css";

/*
============================================================
CALL CONTEXT
============================================================
*/

const CallContext = createContext(null);

/*
============================================================
useUgOCall
============================================================
*/

export const useUgOCall = () => {
  const context = useContext(CallContext);

  if (!context) {
    throw new Error(
      "useUgOCall must be used inside UgOCallProvider."
    );
  }

  return context;
};

/*
============================================================
UgOCallProvider
============================================================
*/

const UgOCallProvider = ({
  children,
  supabase,
  userId,
}) => {
  const [callRequest, setCallRequest] =
    useState(null);

  const [authenticatedUserId, setAuthenticatedUserId] =
    useState(userId || null);

  /*
  ----------------------------------------------------------
  RESOLVE AUTHENTICATED USER
  ----------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    const loadAuthenticatedUser = async () => {
      try {
        if (userId) {
          if (mounted) {
            setAuthenticatedUserId(userId);
          }

          return;
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (mounted) {
          setAuthenticatedUserId(
            user?.id || null
          );
        }
      } catch (error) {
        console.error(
          "Failed to resolve authenticated user for calling:",
          error
        );

        if (mounted) {
          setAuthenticatedUserId(null);
        }
      }
    };

    loadAuthenticatedUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setAuthenticatedUserId(
            userId ||
              session?.user?.id ||
              null
          );
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase, userId]);

  const effectiveUserId =
    userId || authenticatedUserId;

  /*
  ----------------------------------------------------------
  START CALL
  ----------------------------------------------------------
  */

  const startCall = useCallback(
    (booking) => {
      if (!booking) {
        console.error(
          "Cannot start call: booking is missing."
        );

        return;
      }

      setCallRequest({
        booking,
      });
    },
    []
  );

  /*
  ----------------------------------------------------------
  FINISH OUTGOING CALL
  ----------------------------------------------------------
  */

  const handleCallFinished = useCallback(() => {
    setCallRequest(null);
  }, []);

  return (
    <CallContext.Provider
      value={{
        startCall,
      }}
    >
      {children}

      {/* =====================================================
          INCOMING CALL INTERFACE

          Existing call UI remains unchanged.
          ===================================================== */}

      <CallInterface
        supabase={supabase}
        userId={effectiveUserId}
        outgoingBookingId={
          callRequest?.booking?.id || null
        }
      />

      {/* =====================================================
          OUTGOING CALL

          Existing flow remains unchanged.
          ===================================================== */}

      {callRequest && (
        <StartCallBridge
          supabase={supabase}
          userId={effectiveUserId}
          booking={callRequest.booking}
          onFinished={handleCallFinished}
        />
      )}
    </CallContext.Provider>
  );
};

/*
============================================================
START CALL BRIDGE
============================================================
*/

const StartCallBridge = ({
  supabase,
  userId,
  booking,
  onFinished,
}) => {
  const [call, setCall] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const createCall = async () => {
      try {
        if (!booking) {
          throw new Error(
            "Booking information is missing."
          );
        }

        if (!userId) {
          throw new Error(
            "User is not authenticated."
          );
        }

        /*
        ------------------------------------------------------
        VERIFY USER IS PART OF BOOKING
        ------------------------------------------------------
        */

        if (
          booking.renter_id !== userId &&
          booking.owner_id !== userId
        ) {
          throw new Error(
            "You are not a participant in this booking."
          );
        }

        /*
        ------------------------------------------------------
        CALLING ONLY DURING ACTIVE RENTAL
        ------------------------------------------------------
        */

        if (
          booking.status !== "active" &&
          booking.status !== "return_pending"
        ) {
          throw new Error(
            "Calling is available only during an active rental or while a return is pending."
          );
        }

        /*
        ------------------------------------------------------
        CREATE CALL SESSION
        ------------------------------------------------------

        IMPORTANT:
        This is intentionally the same structure as
        your previous working call implementation.

        No caller_id is added here.
        ------------------------------------------------------
        */

        const {
          data,
          error,
        } = await supabase
          .from("call_sessions")
          .insert({
            booking_id:
              booking.id,

            renter_id:
              booking.renter_id,

            owner_id:
              booking.owner_id,
               caller_id:
               userId,
            status:
              "calling",
             
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "Call session was not created."
          );
        }

        if (cancelled) {
          return;
        }

        /*
        ------------------------------------------------------
        STORE CREATED CALL
        ------------------------------------------------------
        */

        setCall(data);
      } catch (error) {
        console.error(
          "Failed to create UgO call:",
          error
        );

        onFinished();
      }
    };

    createCall();

    return () => {
      cancelled = true;
    };
  }, [
    booking,
    onFinished,
    supabase,
    userId,
  ]);

  if (!call) {
    return null;
  }

  return (
    <OutgoingCall
      supabase={supabase}
      userId={userId}
      call={call}
      onFinished={onFinished}
    />
  );
};

/*
============================================================
OUTGOING CALL
============================================================
*/

const OutgoingCall = ({
  supabase,
  userId,
  call,
  onFinished,
}) => {
  return (
    <OutgoingWebRTCInterface
      supabase={supabase}
      userId={userId}
      call={call}
      onFinished={onFinished}
    />
  );
};

/*
============================================================
OUTGOING WEBRTC INTERFACE
============================================================
*/

const OutgoingWebRTCInterface = ({
  supabase,
  userId,
  call,
  onFinished,
}) => {
  const {
    callStatus,
    isMuted,
    toggleMute,
    endCall,
    remoteAudioRef,
  } = useWebRTCCall({
    supabase,
    callId: call.id,
    userId,
    isCaller: true,
    enabled: true,
  });

  /*
  ----------------------------------------------------------
  END CALL
  ----------------------------------------------------------
  */

  const handleEndCall = async () => {
    try {
      await endCall();
    } catch (error) {
      console.error(
        "Failed to end call:",
        error
      );
    } finally {
      onFinished();
    }
  };

  /*
  ----------------------------------------------------------
  STATUS
  ----------------------------------------------------------
  */

  let statusText =
    "Calling owner...";

  if (
    callStatus === "connecting"
  ) {
    statusText =
      "Connecting...";
  }

  if (
    callStatus === "ringing"
  ) {
    statusText =
      "Ringing...";
  }

  if (
    callStatus === "connected"
  ) {
    statusText =
      "Connected";
  }

  if (
    callStatus === "disconnected"
  ) {
    statusText =
      "Connection interrupted";
  }

  if (
    callStatus === "failed"
  ) {
    statusText =
      "Unable to establish the call";
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
            onClick={toggleMute}
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

/*
============================================================
EXPORT
============================================================
*/

export default UgOCallProvider;