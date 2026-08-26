import React, { useEffect, useState, useRef } from "react";
import "./OnGoingRents.css";
import { supabase } from "./supabase";
import { useUgOCall } from "./CallProvider";

const EXTRA_TIME_RATE_PER_MINUTE = 5;
const GRACE_PERIOD_MINUTES = 15;
const LOW_TIME_WARNING_MINUTES = 5;

/* ============================================================
   CHAT BOX
   ============================================================ */

function RentalChat({
  userId,
  ownerId,
  renterId,
  participantName,
}) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState("");
  const messagesEndRef = useRef(null);

  const validParticipants =
    Boolean(userId) &&
    Boolean(ownerId) &&
    Boolean(renterId) &&
    ownerId !== renterId &&
    (userId === ownerId || userId === renterId);

  useEffect(() => {
    let cancelled = false;

    const initializeConversation = async () => {
      if (!validParticipants) {
        if (!cancelled) {
          setChatLoading(false);
          setChatError("Chat participants are unavailable.");
        }
        return;
      }

      setChatLoading(true);
      setChatError("");

      try {
        // The schema has one conversation for each user/owner pair.
        // Always use the actual renter/owner IDs rather than guessing
        // their roles from the current user's position.
        const { data: existing, error: findError } = await supabase
          .from("chat_conversations")
          .select("id")
          .eq("user_id", renterId)
          .eq("owner_id", ownerId)
          .maybeSingle();

        if (findError) throw findError;

        if (existing?.id) {
          if (!cancelled) {
            setConversationId(existing.id);
          }
          return;
        }

        // No conversation exists yet. Create it so the first message
        // can be typed/sent immediately from either side.
        const { data: created, error: createError } = await supabase
          .from("chat_conversations")
          .insert({
            user_id: renterId,
            owner_id: ownerId,
          })
          .select("id")
          .single();

        if (createError) {
          // Another client may have created it at the same time.
          // Re-read the conversation instead of leaving the chat disabled.
          const { data: retryData, error: retryError } = await supabase
            .from("chat_conversations")
            .select("id")
            .eq("user_id", renterId)
            .eq("owner_id", ownerId)
            .maybeSingle();

          if (retryError) {
            throw retryError;
          }

          if (!cancelled && retryData?.id) {
            setConversationId(retryData.id);
          } else {
            throw createError;
          }
        } else if (!cancelled && created?.id) {
          setConversationId(created.id);
        }
      } catch (err) {
        console.error("Chat initialization failed:", err);
        if (!cancelled) {
          setChatError(
            err?.message
              ? `Unable to open chat: ${err.message}`
              : "Unable to open chat right now."
          );
          setConversationId(null);
        }
      } finally {
        if (!cancelled) {
          setChatLoading(false);
        }
      }
    };

    initializeConversation();

    return () => {
      cancelled = true;
    };
  }, [userId, ownerId, renterId, validParticipants]);

  useEffect(() => {
    if (!conversationId || !userId) return;

    let cancelled = false;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(
          "id, conversation_id, sender_id, message, is_read, created_at"
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Unable to load chat messages:", error);
        if (!cancelled) setChatError("Unable to load messages.");
        return;
      }

      if (!cancelled) {
        setMessages(data || []);

        const unreadIds = (data || [])
          .filter((msg) => msg.sender_id !== userId && !msg.is_read)
          .map((msg) => msg.id);

        if (unreadIds.length) {
          await supabase
            .from("chat_messages")
            .update({ is_read: true })
            .in("id", unreadIds);
        }
      }
    };

    loadMessages();

    const channel = supabase
      .channel(`chat-messages-${conversationId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new;

          setMessages((previous) => {
            if (previous.some((msg) => msg.id === newMessage.id)) {
              return previous;
            }
            return [...previous, newMessage];
          });

          if (newMessage.sender_id !== userId) {
            await supabase
              .from("chat_messages")
              .update({ is_read: true })
              .eq("id", newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (event) => {
    event?.preventDefault();

    const message = messageText.trim();
    if (!message || !conversationId || !userId || loading) return;

    setLoading(true);
    setChatError("");

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          message,
        })
        .select(
          "id, conversation_id, sender_id, message, is_read, created_at"
        )
        .single();

      if (error) throw error;

      setMessages((previous) =>
        previous.some((msg) => msg.id === data.id)
          ? previous
          : [...previous, data]
      );
      setMessageText("");
    } catch (err) {
      console.error("Unable to send chat message:", err);
      setChatError("Message could not be sent.");
    } finally {
      setLoading(false);
    }
  };

  const chatReady = Boolean(conversationId) && !chatLoading;

  return (
    <div className="rental-chat-box">
      <div className="rental-chat-header">
        <div>
          <span className="chat-title">Chat</span>
          <span className="chat-subtitle">
            with {participantName || "the other user"}
          </span>
        </div>
      </div>

      <div className="rental-chat-messages">
        {chatLoading ? (
          <div className="chat-empty">Opening chat...</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            No messages yet. Start the conversation.
          </div>
        ) : (
          messages.map((msg) => {
            const mine = msg.sender_id === userId;

            return (
              <div
                key={msg.id}
                className={`chat-message-row ${mine ? "mine" : "theirs"}`}
              >
                <div className={`chat-message ${mine ? "mine" : "theirs"}`}>
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {chatError && <div className="chat-error">{chatError}</div>}

      <form className="rental-chat-input-row" onSubmit={sendMessage}>
        <input
          type="text"
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          placeholder={
            chatReady
              ? `Message ${participantName || "user"}...`
              : "Opening chat..."
          }
          maxLength={1000}
          disabled={!chatReady || loading}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!messageText.trim() || !chatReady || loading}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}

/* ============================================================
   RENTAL CARD
   ============================================================ */

function RentalCard({
  rental,
  currentUserId,
  isRenter,
  onReportIssue,
  onReturn,
  startCall,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnMethod, setReturnMethod] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const parseRentalTime = (value) => {
    if (value === null || value === undefined || value === "") return NaN;

    // Supabase timestamptz values are normally ISO strings.
    // Also handle Unix timestamps stored as seconds or milliseconds.
    if (typeof value === "number") {
      return value < 100000000000 ? value * 1000 : value;
    }

    const text = String(value).trim();

    if (/^\d+(\.\d+)?$/.test(text)) {
      const numericValue = Number(text);
      return numericValue < 100000000000
        ? numericValue * 1000
        : numericValue;
    }

    return new Date(text).getTime();
  };

  const getTimeInformation = () => {
    // IMPORTANT: the timeline belongs only to this booking.
    // Both renter and owner receive the exact same start/end timestamps
    // from booking_table and therefore see the same countdown.
    const start = parseRentalTime(
      rental.start_time ??
        rental.rental_start_time ??
        rental.started_at
    );

    const end = parseRentalTime(
      rental.end_time ??
        rental.rental_end_time ??
        rental.ends_at
    );

    const now = currentTime.getTime();
    const gracePeriod = GRACE_PERIOD_MINUTES * 60 * 1000;

    const validStart = Number.isFinite(start);
    const validEnd = Number.isFinite(end);
    const validTimeline = validStart && validEnd && end > start;

    if (validEnd) {
      if (now <= end) {
        const remaining = Math.max(0, end - now);
        const remainingMinutes = Math.ceil(remaining / (60 * 1000));

        // If both timestamps are available, the progress timeline is
        // calculated strictly from this booking's start_time/end_time.
        const totalDuration = validTimeline ? end - start : 0;
        const elapsed = validTimeline
          ? Math.min(totalDuration, Math.max(0, now - start))
          : 0;

        return {
          start,
          end,
          totalDuration,
          elapsed,
          remaining,
          graceRemaining: gracePeriod,
          extraMinutes: 0,
          rentalCompleted: false,
          inGracePeriod: false,
          extraTimeStarted: false,
          invalidTime: !validEnd,
          incompleteTimeline: !validTimeline,
          lowTimeWarning: remainingMinutes <= LOW_TIME_WARNING_MINUTES,
          remainingMinutes,
        };
      }

      const timeAfterRental = now - end;

      if (timeAfterRental <= gracePeriod) {
        return {
          start,
          end,
          totalDuration: validTimeline ? end - start : 0,
          elapsed: validTimeline ? end - start : 0,
          remaining: 0,
          graceRemaining: Math.max(0, gracePeriod - timeAfterRental),
          extraMinutes: 0,
          rentalCompleted: true,
          inGracePeriod: true,
          extraTimeStarted: false,
          invalidTime: false,
          incompleteTimeline: !validTimeline,
          lowTimeWarning: false,
          remainingMinutes: 0,
        };
      }

      // Extra time is based ONLY on this booking's end_time.
      const extraTimeFromThisRental = Math.max(0, now - end);
      const extraMinutesForThisRental = Math.max(
        0,
        Math.ceil(extraTimeFromThisRental / (60 * 1000))
      );

      return {
        start,
        end,
        totalDuration: validTimeline ? end - start : 0,
        elapsed: validTimeline ? end - start : 0,
        remaining: 0,
        graceRemaining: 0,
        extraMinutes: extraMinutesForThisRental,
        rentalCompleted: true,
        inGracePeriod: false,
        extraTimeStarted: true,
        invalidTime: false,
        incompleteTimeline: !validTimeline,
        lowTimeWarning: false,
        remainingMinutes: 0,
      };
    }

    // Only the absence of a usable end_time makes the countdown impossible.
    // A missing start_time must NOT hide a valid end countdown.
    return {
      start,
      end,
      totalDuration: 0,
      elapsed: 0,
      remaining: 0,
      graceRemaining: 0,
      extraMinutes: 0,
      rentalCompleted: false,
      inGracePeriod: false,
      extraTimeStarted: false,
      invalidTime: true,
      incompleteTimeline: true,
      lowTimeWarning: false,
      remainingMinutes: 0,
    };
  };

  const timeInfo = getTimeInformation();

  const deduction =
    timeInfo.extraMinutes * EXTRA_TIME_RATE_PER_MINUTE;

  const formatTime = (milliseconds) => {
    if (milliseconds <= 0) return "00:00:00";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  };

  const formatTimelineDate = (timestamp) => {
    if (!Number.isFinite(timestamp)) return "Time unavailable";

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(timestamp));
  };

  const progress = timeInfo.extraTimeStarted
    ? 100
    : timeInfo.totalDuration
    ? Math.min(
        100,
        Math.max(0, (timeInfo.elapsed / timeInfo.totalDuration) * 100)
      )
    : 0;

  const sortedImages = [...(rental.cycles?.cycle_images || [])].sort(
    (a, b) => (a.display_order || 0) - (b.display_order || 0)
  );

  const cycleImagePath = sortedImages[0]?.image_url;
  const { data: cycleImageUrlData } = cycleImagePath
    ? supabase.storage.from("cycle-images").getPublicUrl(cycleImagePath)
    : { data: null };

  const cycleImage =
    cycleImageUrlData?.publicUrl ||
    cycleImagePath ||
    "/assets/cycle-placeholder.jpg";

  const ownerName =
    rental.owner_profile?.full_name?.trim() ||
    rental.owner_profile?.email?.split("@")[0] ||
    "Owner";

  const renterName =
    rental.renter_profile?.full_name?.trim() ||
    rental.renter_profile?.email?.split("@")[0] ||
    "Renter";

  const participantId = isRenter ? rental.owner_id : rental.renter_id;
  const participantName = isRenter ? ownerName : renterName;

  const openReturnModal = () => {
    if (!isRenter) return;
    setShowReturnModal(true);
    setReturnMethod("");
  };

  const closeReturnModal = () => {
    setShowReturnModal(false);
    setReturnMethod("");
  };

  const confirmReturnMethod = () => {
    if (!returnMethod || !rental?.id) return;

    closeReturnModal();

    if (onReturn) {
      onReturn(rental.id);
    }
  };

  return (
    <div className="rental-card">
      <div className="rental-card-number cycle-rented-heading">
        {isRenter ? "YOUR ACTIVE RENTAL" : "CYCLE RENTED BY USER"}
      </div>

      <div className="cycle-section">
        <div className="cycle-image-container">
          <img
            src={cycleImage}
            alt={rental.cycles?.brand || "Rented cycle"}
            className="cycle-image"
          />
        </div>

        <div className="cycle-details">
          <p className="cycle-label">RENTED CYCLE</p>

          <h2>
            {rental.cycles?.brand || "Cycle"}
            {rental.cycles?.model ? ` ${rental.cycles.model}` : ""}
          </h2>

          <p className="cycle-location">
            📍 {rental.cycles?.location || "Location unavailable"}
          </p>

          <div
            className={`ongoing-booking-status status-${String(
              rental.booking_status || "unknown"
            )
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`}
            style={{
              display: "inline-block",
              marginTop: "10px",
              padding: "6px 12px",
              borderRadius: "999px",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            {String(rental.booking_status || "unknown")
              .replace(/[_-]+/g, " ")
              .replace(/\s+/g, " ")
              .replace(/\b\w/g, (letter) => letter.toUpperCase())}
          </div>

          <div className="owner-details">
            {isRenter ? (
              <>
                <div className="owner-detail-item">
                  <span className="owner-detail-label">OWNER</span>
                  <strong>{ownerName}</strong>
                </div>

              </>
            ) : (
              <>
                <div className="owner-detail-item">
                  <span className="owner-detail-label">RENTER</span>
                  <strong>{renterName}</strong>
                </div>

              </>
            )}

            <div className="owner-detail-item">
              <span className="owner-detail-label">CYCLE LOCATION</span>
              <strong>
                {rental.cycles?.location || "Location unavailable"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`time-section ${
          timeInfo.lowTimeWarning ? "time-section-warning" : ""
        }`}
      >
        {timeInfo.invalidTime ? (
          <div className="grace-box">
            <div className="grace-icon">⏱</div>
            <div>
              <h3>Rental Time Unavailable</h3>
              <p>
                The rental end time could not be read correctly for this booking.
                Please contact the administration.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rental-timeline-heading">
              <div>
                <p className="section-label">RENTAL TIMELINE</p>
                <h3>Cycle Return Timeline</h3>
                <p className="timeline-subtitle">
                  This timeline is the same for both the renter and the owner.
                </p>
              </div>

              <div
                className={`timeline-status ${
                  timeInfo.lowTimeWarning ? "timeline-status-warning" : ""
                }`}
              >
                {timeInfo.extraTimeStarted
                  ? "Extra Time"
                  : timeInfo.inGracePeriod
                  ? "Grace Period"
                  : "Rental Active"}
              </div>
            </div>

            <div className="rental-timeline">
              <div className="timeline-point timeline-start">
                <span className="timeline-dot" />
                <div className="timeline-point-content">
                  <span className="timeline-point-label">START TIME</span>
                  <strong>
                    {formatTimelineDate(timeInfo.start)}
                  </strong>
                </div>
              </div>

              <div className="timeline-track">
                <div className="timeline-track-base">
                  <div
                    className={`timeline-track-progress ${
                      timeInfo.lowTimeWarning
                        ? "timeline-track-progress-warning"
                        : ""
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="timeline-remaining">
                  {timeInfo.extraTimeStarted ? (
                    <span>Rental time ended</span>
                  ) : timeInfo.inGracePeriod ? (
                    <span>Rental time ended</span>
                  ) : (
                    <span>
                      {timeInfo.remainingMinutes} minute
                      {timeInfo.remainingMinutes === 1 ? "" : "s"} remaining
                    </span>
                  )}
                </div>
              </div>

              <div className="timeline-point timeline-end">
                <span
                  className={`timeline-dot ${
                    timeInfo.lowTimeWarning ? "timeline-dot-warning" : ""
                  }`}
                />
                <div className="timeline-point-content">
                  <span className="timeline-point-label">END TIME</span>
                  <strong>{formatTimelineDate(timeInfo.end)}</strong>
                </div>
              </div>
            </div>

            {!timeInfo.rentalCompleted && (
              <div className="countdown-panel">
                <div className="countdown-label">
                  <span>TIME REMAINING</span>
                  {timeInfo.lowTimeWarning && <b>RETURN SOON</b>}
                </div>

                <div
                  className={`time-value ${
                    timeInfo.lowTimeWarning ? "time-value-warning" : ""
                  }`}
                >
                  {formatTime(timeInfo.remaining)}
                </div>

                {timeInfo.lowTimeWarning && (
                  <div className="low-time-warning">
                    ⚠️ Rental ending soon — please return the cycle on time.
                  </div>
                )}
              </div>
            )}

            {timeInfo.incompleteTimeline && (
              <div className="timeline-note">
                Start time is unavailable, but the countdown is still running
                from this booking's end time.
              </div>
            )}

            {timeInfo.inGracePeriod && (
              <div className="grace-box">
                <div className="grace-icon">⏳</div>
                <div>
                  <h3>Grace Period</h3>
                  <p>
                    Your rental time has ended. You have additional time to reach
                    the owner's location.
                  </p>
                  <strong>
                    {formatTime(timeInfo.graceRemaining)} remaining
                  </strong>
                </div>
              </div>
            )}

            {timeInfo.extraTimeStarted && (
              <div className="extra-time-box">
                <div className="extra-time-header">
                  <span>⚠ Extra Time</span>
                  <span>{timeInfo.extraMinutes} min</span>
                </div>

                <p>
                  Your 15-minute grace period has ended. Extra-time charges are now
                  being deducted from your security deposit.
                </p>

                <div className="extra-rate">
                  ₹{EXTRA_TIME_RATE_PER_MINUTE}/minute
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="rental-info">
        <h3>Rental Information</h3>

        <div className="info-table">
          <div className="info-row">
            <span>Rental Amount</span>
            <strong>₹{Number(rental.rental_price || 0).toFixed(2)}</strong>
          </div>

          <div className="info-row">
            <span>Extra Time</span>
            <strong>{timeInfo.extraMinutes} min</strong>
          </div>

          <div className="info-row">
            <span>Deduction</span>
            <strong className="deduction">-₹{deduction.toFixed(2)}</strong>
          </div>

          <div className="info-row remaining-row">
            <span>Net Amount</span>
            <strong>
              ₹{(
                Number(rental.rental_price || 0) - deduction
              ).toFixed(2)}
            </strong>
          </div>
        </div>
      </div>

      <div className="rental-contact-section">
        <div className="rental-contact-heading">
          <div>
            <p className="section-label">RENTAL COMMUNICATION</p>
            <h3>{isRenter ? `Contact ${ownerName}` : `Contact ${renterName}`}</h3>
          </div>

          <button
            className="rental-call-btn"
            onClick={() =>
              startCall({
                id: rental.id,
                renter_id: rental.renter_id,
                owner_id: rental.owner_id,
                status: rental.booking_status || rental.status,
              })
            }
          >
            📞 Call
          </button>
        </div>

        <button
          type="button"
          className="rental-chat-toggle"
          onClick={() => setChatOpen((open) => !open)}
        >
          💬 {chatOpen ? "Hide Chat" : "Open Chat"}
        </button>

        {chatOpen && participantId && (
          <RentalChat
            userId={currentUserId}
            ownerId={rental.owner_id}
            renterId={rental.renter_id}
            participantName={participantName}
          />
        )}
      </div>

      <div
        className={`return-section ${
          isRenter ? "renter-actions" : "owner-actions"
        }`}
      >
        <div className="rental-action-buttons">
          <button
            className="report-issue-btn"
            onClick={() => onReportIssue?.(rental)}
          >
            ⚠️ Report an Issue
          </button>

          {isRenter && rental.booking_status !== "return_pending" && (
            <button className="return-cycle-btn" onClick={openReturnModal}>
              Return Cycle
            </button>
          )}
        </div>

        <p>
          {isRenter
            ? "Having a problem with the cycle? Report it to the administration."
            : "Report any issue with this cycle to the administration."}
        </p>
      </div>

      {isRenter && showReturnModal && (
        <div className="modal-overlay" onClick={closeReturnModal}>
          <div className="return-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeReturnModal}>
              ×
            </button>

            <h2>Return Cycle</h2>

            <p>Where would you like to return the cycle?</p>

            <div className="return-options">
              <button
                className={`return-option ${
                  returnMethod === "owner" ? "selected" : ""
                }`}
                onClick={() => setReturnMethod("owner")}
              >
                <span className="option-icon">👤</span>
                <div>
                  <strong>Return to Owner</strong>
                  <small>Return the cycle directly to the owner.</small>
                </div>
              </button>

              <button
                className={`return-option ${
                  returnMethod === "admin" ? "selected" : ""
                }`}
                onClick={() => setReturnMethod("admin")}
              >
                <span className="option-icon">🛡️</span>
                <div>
                  <strong>Return to Admin</strong>
                  <small>Use this if the owner is unavailable.</small>
                </div>
              </button>
            </div>

            <button
              className="confirm-return-btn"
              disabled={!returnMethod}
              onClick={confirmReturnMethod}
            >
              Continue
            </button>

            <p className="otp-note">
              OTP confirmation will be required to complete the return.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

function OnGoingRents({ onReportIssue, onReturn }) {
  const { startCall } = useUgOCall();

  const [rentals, setRentals] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOngoingRentals = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please login to view your active rentals.");
        setRentals([]);
        return;
      }

      setCurrentUserId(user.id);

      const { data: bookingRows, error: bookingError } = await supabase
        .from("booking_table")
        .select(`
          *,
          cycles (
            id,
            brand,
            model,
            owner_id,
            location
          )
        `)
        .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
        // IMPORTANT:
        // The ongoing-rental page is controlled by booking_table.status.
        // Both active and return_pending bookings must be shown.
        // Do NOT filter them using returned_at or cancelled_at because
        // those fields must not hide a valid booking
        // whose booking status is still active/return_pending.
        .in("status", ["active", "return_pending"])
        .order("created_at", { ascending: true });

      if (bookingError) throw bookingError;

      const bookings = bookingRows || [];

      if (!bookings.length) {
        setRentals([]);
        return;
      }

      const cycleIds = [
        ...new Set(
          bookings
            .map((booking) => booking.cycle_id || booking.cycles?.id)
            .filter(Boolean)
        ),
      ];

      const profileIds = [
        ...new Set(
          bookings
            .flatMap((booking) => [booking.owner_id, booking.renter_id])
            .filter(Boolean)
        ),
      ];

      const [imagesResult, profilesResult] = await Promise.all([
cycleIds.length
            ? supabase
                .from("cycle_images")
                .select("cycle_id, image_url, display_order")
                .in("cycle_id", cycleIds)
                .order("display_order", { ascending: true })
            : Promise.resolve({ data: [], error: null }),
profileIds.length
            ? supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", profileIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (imagesResult.error) {
        console.warn("Unable to load cycle images:", imagesResult.error);
      }


      if (profilesResult.error) {
        console.warn("Unable to load participant profiles:", profilesResult.error);
      }

      const imagesByCycle = new Map();

      (imagesResult.data || []).forEach((image) => {
        const key = String(image.cycle_id);

        if (!imagesByCycle.has(key)) {
          imagesByCycle.set(key, []);
        }

        imagesByCycle.get(key).push(image);
      });

      // The ongoing-rental status comes directly from booking_table.
      // Each booking already contains its own booking id and status.
      const bookingStatusById = new Map(
        bookings.map((booking) => [
          String(booking.id),
          booking.status,
        ])
      );

      const profilesById = new Map(
        (profilesResult.data || []).map((profile) => [
          String(profile.id),
          profile,
        ])
      );


      const enrichedRentals = bookings.map((booking) => {
        const cycleId = booking.cycle_id || booking.cycles?.id;
        const cycle = booking.cycles || {};
        // booking_table is the only source of truth for booking status, start_time, and end_time.
        const bookingStatus = bookingStatusById.get(String(booking.id));

        // Location belongs to the cycle record.
        const cycleLocation =
          typeof cycle.location === "string" && cycle.location.trim()
            ? cycle.location.trim()
            : "Location unavailable";

        return {
          ...booking,
          cycles: {
            ...cycle,
            location: cycleLocation,
            cycle_images: imagesByCycle.get(String(cycleId)) || [],
          },
          booking_id: booking.id,

          // SOURCE OF TRUTH FOR ONGOING RENTAL:
          // booking_table.status
          booking_status: bookingStatus || booking.status || null,
          owner_profile: profilesById.get(String(booking.owner_id)) || null,
          renter_profile: profilesById.get(String(booking.renter_id)) || null,
        };
      });

      // Oldest rental gets priority. The latest rental is deliberately
      // given the least preference as requested.
      enrichedRentals.sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );

      setRentals(enrichedRentals);
    } catch (err) {
      console.error("Error fetching rentals:", err);
      setError("Unable to load your active rentals.");
      setRentals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOngoingRentals();
  }, []);

  // Realtime refresh:
  // booking_table controls the ongoing rental, including status,
  // start_time, and end_time.
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`ongoing-rentals-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_table",
        },
        () => {
          fetchOngoingRentals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  if (loading) {
    return (
      <div className="my-rental-page">
        <div className="rental-loading">Loading your active rentals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-rental-page">
        <div className="rental-message">
          <h2>Unable to load rentals</h2>
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchOngoingRentals}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!rentals.length) {
    return (
      <div className="my-rental-page">
        <div className="rental-message no-active-rental">
          <div className="empty-icon">🚲</div>
          <h2>No Active Rental</h2>
          <p>You currently don't have any active or return-pending cycle rentals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-rental-page">
      <div className="my-rental-header">
        <div>
          <p className="page-small-title">ACTIVE RENTALS</p>
          <h1>My Ongoing Rentals</h1>
          <p className="page-description">
            Track all your active cycle rentals and communicate with the other
            user for each rental.
          </p>
        </div>

        <div>
          <div className="active-badge">
            <span></span>
            {rentals.length} Active Rental{rentals.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="ongoing-rentals-list">
        {rentals.map((rental, index) => {
          const isRenter = rental.renter_id === currentUserId;

          return (
            <RentalCard
              key={rental.id}
              rental={rental}
              currentUserId={currentUserId}
              isRenter={isRenter}
              onReportIssue={onReportIssue}
              onReturn={onReturn}
              startCall={startCall}
            />
          );
        })}
      </div>
    </div>
  );
}

export default OnGoingRents;
