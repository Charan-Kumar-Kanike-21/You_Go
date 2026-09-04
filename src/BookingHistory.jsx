import React, { useEffect, useMemo, useState } from "react";
import "./BookingHistory.css";
import { supabase } from "./supabase";

/*
  ============================================================
  BACKEND PLACEHOLDERS
  ------------------------------------------------------------
  Add your real backend URLs here later.
  ============================================================
*/
const WITHDRAW_BACKEND_URL = "https://ugonitk.app.n8n.cloud/webhook/withdraw"; //changed
const PAY_BALANCE_BACKEND_URL = "";
const CANCEL_BOOKING_BACKEND_URL = "https://ugonitk.app.n8n.cloud/webhook/cancel-booking"; //changed

/*
  Add the real support numbers here later.
*/
const SUPPORT_NUMBERS = [
  {
    label: "Cycle Sharing Support",
    number: "XXXXXXXXXX",
  },
  {
    label: "Technical Support",
    number: "XXXXXXXXXX",
  },
];

function BookingHistory({ onBack }) {
  const [bookings, setBookings] = useState([]);
  const [netBalance, setNetBalance] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Subpages
  const [activeSubPage, setActiveSubPage] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Withdraw form
  const [upiId, setUpiId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState("");
  const [withdrawError, setWithdrawError] = useState("");

  // Pay balance
  const [payLoading, setPayLoading] = useState(false);
  const [payMessage, setPayMessage] = useState("");
  const [payError, setPayError] = useState("");

  // Cancel booking
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelError, setCancelError] = useState("");


  // ============================================================
  // FETCH BOOKING HISTORY + NET BALANCE
  // ============================================================

  useEffect(() => {
    fetchBookingHistory();
  }, []);

  const fetchBookingHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setError("Please login to view your booking history.");
        return;
      }

      // Keep the authenticated user id in the same fetch flow.
      // This prevents the booking role from temporarily/defaulting
      // to "Renter" before the separate user lookup finishes.
      setCurrentUserId(user.id);

      // --------------------------------------------------------
      // PROFILE BALANCE
      // --------------------------------------------------------

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("net_balance")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setNetBalance(Number(profile?.net_balance ?? 0));

      // --------------------------------------------------------
      // BOOKINGS
      // Show bookings where the current user is either:
      // 1. renter
      // 2. owner
      //
      // This lets the same history page show both:
      // + amount earned by an owner
      // - extra amount owed by a renter
      // --------------------------------------------------------

      const { data, error: bookingError } = await supabase
        .from("booking_table")
        .select(`
          id,
          created_at,
          rental_price,
          total_amount,
          cycle_id,
          owner_id,
          renter_id,
          start_time,
          end_time,
          updated_at,
          start_time,
          returned_at,
          cancelled_at,
          return_deadline,
          status,

          cycles (
            id,
            brand,
            model,
            location,
            owner_id,

            cycle_images (
              id,
              image_url,
              display_order
            )
          )
        `)
        .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order("created_at", {
          ascending: false,
        });

      if (bookingError) throw bookingError;

      // --------------------------------------------------------
      // OWNER PROFILES
      // Always fetch the owner name from profiles using the
      // booking_table.owner_id. This works regardless of whether
      // the user opened Booking History from Confirm Booking,
      // Profile, or directly.
      // --------------------------------------------------------
      const ownerIds = [
        ...new Set(
          (data || [])
            .map((booking) => booking.owner_id || booking?.cycles?.owner_id)
            .filter(Boolean)
        ),
      ];

      let ownerProfilesById = new Map();

      if (ownerIds.length) {
        const {
          data: ownerProfiles,
          error: ownerProfilesError,
        } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ownerIds);

        if (ownerProfilesError) throw ownerProfilesError;

        ownerProfilesById = new Map(
          (ownerProfiles || []).map((profile) => [profile.id, profile])
        );
      }

      /*
        Resolve storage paths without changing the existing
        cycle_images connection.

        If image_url is already a complete URL, keep it.
        Otherwise use the existing cycle-images bucket.
      */
      const normalizedBookings = (data || []).map((booking) => {
        const cycle = booking?.cycles;
        const images = cycle?.cycle_images || [];

        const normalizedImages = images.map((image) => {
          if (
            typeof image?.image_url === "string" &&
            /^https?:\/\//i.test(image.image_url)
          ) {
            return {
              ...image,
              publicUrl: image.image_url,
            };
          }

          const { data: publicUrlData } = supabase.storage
            .from("cycle-images")
            .getPublicUrl(image?.image_url || "");

          return {
            ...image,
            publicUrl: publicUrlData?.publicUrl || null,
          };
        });

        const ownerId = booking.owner_id || cycle?.owner_id;
        const ownerProfile = ownerProfilesById.get(ownerId);

        const ownerName =
          ownerProfile?.full_name?.trim() ||
          ownerProfile?.email?.split("@")[0] ||
          "Owner";

        return {
          ...booking,
          ownerName,
          cycles: cycle
            ? {
                ...cycle,
                cycle_images: normalizedImages,
              }
            : cycle,
        };
      });

      // The authenticated user ID is already known before bookings
      // are stored, so every strip/details view can reliably determine
      // whether this booking belongs to the owner or renter.
      setBookings(normalizedBookings);
    } catch (err) {
      console.error("Error fetching booking history:", err);

      setError("Unable to load your booking history.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FORMAT HELPERS
  // ============================================================

  const formatMoney = (value) => {
    const amount = Number(value || 0);

    return `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============================================================
  // STATUS
  // ============================================================

  const getStatusLabel = (booking) => {
    if (booking.cancelled_at) return "Cancelled";

    const status = String(booking.status || "")
      .trim()
      .toLowerCase();

    if (!status) return "Unknown";

    return status
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const getStatusClass = (booking) => {
    if (booking.cancelled_at) {
      return "booking-status cancelled";
    }

    const status = String(booking.status || "")
      .trim()
      .toLowerCase();

    const statusClasses = {
      requested: "requested",
      slot_booked: "slot-booked",
      otp_verified: "otp-verified",
      payment_pending: "payment-pending",
      active: "active",
      return_pending: "return-pending",
      completed: "completed",
      cancelled: "cancelled",
      expired: "expired",
      payment_failed: "payment-failed",

      // Keep compatibility with older values.
      confirmed: "confirmed",
      approved: "confirmed",
      accepted: "confirmed",
      pending: "pending",
      rejected: "cancelled",
      declined: "cancelled",
    };

    return `booking-status ${
      statusClasses[status] || "default"
    }`;
  };

  // ============================================================
  // CYCLE IMAGE
  // ============================================================

  const getCycleImage = (booking) => {
    const images = booking?.cycles?.cycle_images || [];

    if (!images.length) return null;

    const sortedImages = [...images].sort(
      (a, b) =>
        (a.display_order ?? 0) - (b.display_order ?? 0)
    );

    return sortedImages[0]?.publicUrl || null;
  };

  // ============================================================
  // CURRENT USER / BOOKING ROLE
  // ============================================================

  const normalizeId = (value) =>
    value == null ? "" : String(value).trim().toLowerCase();

  const isCurrentUserOwner = (booking) => {
    const currentId = normalizeId(currentUserId);
    if (!currentId || !booking) return false;

    const bookingOwnerId = normalizeId(booking.owner_id);
    const cycleOwnerId = normalizeId(booking?.cycles?.owner_id);

    return (
      currentId === bookingOwnerId ||
      currentId === cycleOwnerId
    );
  };

  // ============================================================
  // FINANCIAL HELPERS
  // ============================================================

  /*
    Owner:
      Show the amount earned from this rental as + amount.

    Renter:
      Only show an amount owed when the booking went beyond the
      stored return_deadline.

    There is currently no separate late_fee column in the
    supplied booking schema, so the extra amount is calculated
    as total_amount - rental_price. This does NOT replace your
    backend calculation; when a dedicated late-fee column is
    available, use that field here.
  */
  const getBookingFinancialInfo = (booking) => {
    const isOwner = isCurrentUserOwner(booking);
    const isRenter =
      normalizeId(booking.renter_id) === normalizeId(currentUserId);

    const totalAmount = Number(booking.total_amount || 0);
    const rentalPrice = Number(booking.rental_price || 0);

    if (isOwner && !isRenter) {
      return {
        type: "earned",
        amount: Math.max(totalAmount, 0),
        label: "Rental Earned",
      };
    }

    if (isRenter) {
      const returnedAt = booking.returned_at
        ? new Date(booking.returned_at)
        : null;

      const returnDeadline = booking.return_deadline
        ? new Date(booking.return_deadline)
        : null;

      const exceededDeadline =
        returnedAt &&
        returnDeadline &&
        !Number.isNaN(returnedAt.getTime()) &&
        !Number.isNaN(returnDeadline.getTime()) &&
        returnedAt.getTime() > returnDeadline.getTime();

      const extraAmount = Math.max(
        totalAmount - rentalPrice,
        0
      );

      if (exceededDeadline && extraAmount > 0) {
        return {
          type: "owed",
          amount: extraAmount,
          label: "Extra Amount Due",
        };
      }
    }

    return null;
  };

  /*
    Keep the current user id outside the render map so all
    booking financial calculations use the same authenticated
    user.
  */
  const [currentUserId, setCurrentUserId] = useState(null);

  const positiveBalance = Number(netBalance) > 0;
  const negativeBalance = Number(netBalance) < 0;

  const balanceTextClass = positiveBalance
    ? "balance-positive"
    : negativeBalance
      ? "balance-negative"
      : "balance-zero";

  // ============================================================
  // WITHDRAW
  // ============================================================

  const openWithdrawPage = () => {
    setWithdrawMessage("");
    setWithdrawError("");

    setWithdrawAmount(
      positiveBalance
        ? Number(netBalance).toFixed(2)
        : ""
    );

    setActiveSubPage("withdraw");
  };

  const handleWithdraw = async (event) => {
    event.preventDefault();

    setWithdrawMessage("");
    setWithdrawError("");

    const amount = Number(withdrawAmount);

    if (!upiId.trim()) {
      setWithdrawError("Please enter your UPI ID.");
      return;
    }

    if (!accountHolderName.trim()) {
      setWithdrawError("Please enter the account holder name.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setWithdrawError("Please enter a valid withdrawal amount.");
      return;
    }

    if (amount > Number(netBalance)) {
      setWithdrawError(
        "Withdrawal amount cannot be greater than your available balance."
      );
      return;
    }

    if (!WITHDRAW_BACKEND_URL) {
      setWithdrawError(
        "Withdrawal backend URL is not configured yet. Add it to WITHDRAW_BACKEND_URL in BookingHistory.jsx."
      );
      return;
    }

    try {
      setWithdrawLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response = await fetch(WITHDRAW_BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.id,
          upi_id: upiId.trim(),
          account_holder_name: accountHolderName.trim(),
          withdraw_amount: amount,
          net_balance: Number(netBalance),
        }),
      });

      let responseData = {};

      try {
        responseData = await response.json();
      } catch {
        responseData = {};
      }

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
            "Unable to send withdrawal request."
        );
      }

      setWithdrawMessage(
        responseData?.message ||
          "Withdrawal request sent successfully."
      );
    } catch (err) {
      console.error("Withdrawal request error:", err);

      setWithdrawError(
        err.message ||
          "Unable to send withdrawal request."
      );
    } finally {
      setWithdrawLoading(false);
    }
  };

  // ============================================================
  // CANCEL BOOKING
  // ============================================================

  const canCancelBooking = (booking) => {
    const status = String(booking?.status || "")
      .trim()
      .toLowerCase();

    return status === "requested" || status === "slot_booked";
  };

  const handleCancelBooking = async (booking) => {
    if (!booking?.id || !canCancelBooking(booking)) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    setCancelBookingId(booking.id);
    setCancelMessage("");
    setCancelError("");

    try {
      if (!CANCEL_BOOKING_BACKEND_URL) {
        throw new Error(
          "Cancel booking backend URL is not configured."
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("Please login before cancelling a booking.");
      }

      const response = await fetch(
        CANCEL_BOOKING_BACKEND_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            booking_id: booking.id,
            user_id: user.id,
            status: booking.status,
          }),
        }
      );

      let responseData = {};

      try {
        responseData = await response.json();
      } catch {
        responseData = {};
      }

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
            "Unable to cancel the booking."
        );
      }

      setCancelMessage(
        responseData?.message ||
          "Booking cancelled successfully."
      );

      // Refresh the existing booking history connection so the
      // backend's final booking status is displayed immediately.
      await fetchBookingHistory();
    } catch (err) {
      console.error("Cancel booking error:", err);
      setCancelError(
        err.message ||
          "Unable to cancel the booking. Please try again."
      );
    } finally {
      setCancelBookingId(null);
    }
  };

  // ============================================================
  // PAY NOW
  // ============================================================

  const handlePayNow = async () => {
    setPayMessage("");
    setPayError("");

    if (!PAY_BALANCE_BACKEND_URL) {
      setPayError(
        "Payment backend URL is not configured yet. Add it to PAY_BALANCE_BACKEND_URL in BookingHistory.jsx."
      );
      return;
    }

    try {
      setPayLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response = await fetch(PAY_BALANCE_BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.id,
          amount: Math.abs(Number(netBalance)),
          net_balance: Number(netBalance),
        }),
      });

      let responseData = {};

      try {
        responseData = await response.json();
      } catch {
        responseData = {};
      }

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
            "Unable to start payment."
        );
      }

      setPayMessage(
        responseData?.message ||
          "Payment request sent successfully."
      );
    } catch (err) {
      console.error("Pay balance error:", err);

      setPayError(
        err.message ||
          "Unable to start payment."
      );
    } finally {
      setPayLoading(false);
    }
  };

  // ============================================================
  // SUBPAGE BACK
  // ============================================================

  const handleSubPageBack = () => {
    setActiveSubPage(null);
    setWithdrawMessage("");
    setWithdrawError("");
    setPayMessage("");
    setPayError("");
  };

  // ============================================================
  // BOOKING DETAILS SUBPAGE
  // ============================================================

  const openBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setActiveSubPage("booking-details");
  };

  const closeBookingDetails = () => {
    setSelectedBooking(null);
    setActiveSubPage(null);
  };

  // ============================================================
  // SUBPAGES
  // ============================================================
  if (activeSubPage === "booking-details") {
    const booking = selectedBooking;
    const cycle = booking.cycles || {};
    const image = getCycleImage(booking);
    const isOwner = isCurrentUserOwner(booking);

    const financialInfo = currentUserId
      ? getBookingFinancialInfo(booking)
      : null;

    return (
      <div className="booking-history-page">
        <header className="booking-history-header">
          <button
            type="button"
            className="booking-history-back"
            onClick={closeBookingDetails}
          >
            <span className="back-arrow">←</span>
            <span>Back</span>
          </button>

          <div className="booking-history-title">
            <h1>Booking Details</h1>
            <p>Complete details of your cycle rental.</p>
          </div>
        </header>

        <main className="booking-history-main">
          <section className="booking-details-page-card">
            <div className="booking-details-image">
              {image ? (
                <img
                  src={image}
                  alt={`${cycle.brand || "Cycle"} cycle`}
                />
              ) : (
                <div className="booking-image-placeholder">🚲</div>
              )}
            </div>

            <div className="booking-details-content">
              <div className="booking-details-top">
                <div>
                  <h2>{cycle.brand || "Cycle"}</h2>

                  {cycle.model && (
                    <p className="booking-cycle-model">
                      {cycle.model}
                    </p>
                  )}

                  <span
                    className={`booking-role-badge ${
                      isOwner ? "owner-role" : "renter-role"
                    }`}
                  >
                    {isOwner ? "Cycle Owner" : "Renter"}
                  </span>

                  <p className="booking-owner-name">
                    Owner: <strong>{booking.ownerName || "Owner"}</strong>
                  </p>
                </div>

                <span className={getStatusClass(booking)}>
                  {getStatusLabel(booking)}
                </span>
              </div>

              <div className="booking-location">
                <span>📍</span>
                <span>
                  {cycle.location || "Location not available"}
                </span>
              </div>

              <div className="booking-details-grid">
                <div className="booking-detail-box">
                  <span>Booking Date</span>
                  <strong>{formatDate(booking.created_at)}</strong>
                </div>

                <div className="booking-detail-box">
                  <span>Rental Period</span>
                  <strong>{formatDate(booking.start_time)}</strong>
                </div>

                <div className="booking-detail-box">
                  <span>Start</span>
                  <strong>{formatTime(booking.start_time)}</strong>
                </div>

                <div className="booking-detail-box">
                  <span>End</span>
                  <strong>{formatTime(booking.end_time)}</strong>
                </div>
              </div>

              <div className="booking-details-money">
                <div>
                  <span>Rental Price</span>
                  <strong>
                    {formatMoney(booking.rental_price)}
                  </strong>
                </div>

                <div>
                  <span>Total Amount</span>
                  <strong className="booking-total">
                    {formatMoney(booking.total_amount)}
                  </strong>
                </div>

                {financialInfo && (
                  <div
                    className={`booking-transaction ${
                      financialInfo.type === "earned"
                        ? "transaction-earned"
                        : "transaction-owed"
                    }`}
                  >
                    <span>{financialInfo.label}</span>

                    <strong>
                      {financialInfo.type === "earned" ? "+" : "-"}
                      {formatMoney(financialInfo.amount)}
                    </strong>
                  </div>
                )}
              </div>

              <div className="booking-details-timeline">
                {booking.start_time && (
                  <div>
                    <span>Picked up</span>
                    <strong>
                      {formatDateTime(booking.start_time)}
                    </strong>
                  </div>
                )}

                {booking.returned_at && (
                  <div>
                    <span>Returned</span>
                    <strong>
                      {formatDateTime(booking.returned_at)}
                    </strong>
                  </div>
                )}

                {booking.cancelled_at && (
                  <div>
                    <span>Cancelled</span>
                    <strong>
                      {formatDateTime(booking.cancelled_at)}
                    </strong>
                  </div>
                )}

                {booking.return_deadline && (
                  <div>
                    <span>Return deadline</span>
                    <strong>
                      {formatDateTime(booking.return_deadline)}
                    </strong>
                  </div>
                )}
              </div>

              <div className="booking-id">
                Booking ID:
                <span>{booking.id}</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (activeSubPage === "withdraw") {
    return (
      <div className="booking-history-page">
        <header className="booking-history-header">
          <button
            type="button"
            className="booking-history-back"
            onClick={handleSubPageBack}
          >
            <span className="back-arrow">←</span>
            <span>Back</span>
          </button>

          <div className="booking-history-title">
            <h1>Withdraw Balance</h1>
            <p>Request withdrawal of your earned cycle rental balance.</p>
          </div>
        </header>

        <main className="booking-history-main">
          <section className="booking-subpage-card">
            <div className="subpage-heading">
              <span className="subpage-icon">₹</span>
              <div>
                <span className="subpage-eyebrow">
                  WITHDRAWAL REQUEST
                </span>
                <h2>Withdraw your balance</h2>
                <p>
                  Enter your payment details and submit the request
                  to the backend.
                </p>
              </div>
            </div>

            <div className="subpage-balance-row">
              <span>Available balance</span>
              <strong className="balance-positive">
                +{formatMoney(netBalance)}
              </strong>
            </div>

            <form
              className="withdraw-form"
              onSubmit={handleWithdraw}
            >
              <label>
                <span>UPI ID</span>
                <input
                  type="text"
                  placeholder="example@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </label>

              <label>
                <span>Account Holder Name</span>
                <input
                  type="text"
                  placeholder="Enter account holder name"
                  value={accountHolderName}
                  onChange={(e) =>
                    setAccountHolderName(e.target.value)
                  }
                />
              </label>

              <label>
                <span>Withdraw Amount</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  max={Math.max(Number(netBalance), 0)}
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) =>
                    setWithdrawAmount(e.target.value)
                  }
                />
              </label>

              {withdrawError && (
                <div className="subpage-message error-message">
                  {withdrawError}
                </div>
              )}

              {withdrawMessage && (
                <div className="subpage-message success-message">
                  {withdrawMessage}
                </div>
              )}

              <button
                type="submit"
                className="primary-subpage-button"
                disabled={withdrawLoading}
              >
                {withdrawLoading ? (
                  <>
                    <span className="button-spinner" />
                    Sending request...
                  </>
                ) : (
                  "Request Withdraw"
                )}
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  if (activeSubPage === "pay") {
    return (
      <div className="booking-history-page">
        <header className="booking-history-header">
          <button
            type="button"
            className="booking-history-back"
            onClick={handleSubPageBack}
          >
            <span className="back-arrow">←</span>
            <span>Back</span>
          </button>

          <div className="booking-history-title">
            <h1>Pay Balance</h1>
            <p>Clear the amount pending on your account.</p>
          </div>
        </header>

        <main className="booking-history-main">
          <section className="booking-subpage-card pay-subpage">
            <div className="subpage-heading">
              <span className="subpage-icon negative-icon">₹</span>
              <div>
                <span className="subpage-eyebrow">
                  PAYMENT REQUIRED
                </span>
                <h2>Clear your pending balance</h2>
                <p>
                  Continue to the payment backend to settle the
                  amount due.
                </p>
              </div>
            </div>

            <div className="subpage-balance-row">
              <span>Amount to pay</span>
              <strong className="balance-negative">
                -{formatMoney(Math.abs(Number(netBalance)))}
              </strong>
            </div>

            {payError && (
              <div className="subpage-message error-message">
                {payError}
              </div>
            )}

            {payMessage && (
              <div className="subpage-message success-message">
                {payMessage}
              </div>
            )}

            <button
              type="button"
              className="primary-subpage-button pay-button"
              onClick={handlePayNow}
              disabled={payLoading}
            >
              {payLoading ? (
                <>
                  <span className="button-spinner" />
                  Processing...
                </>
              ) : (
                "Pay Now"
              )}
            </button>
          </section>
        </main>
      </div>
    );
  }

  if (activeSubPage === "support") {
    return (
      <div className="booking-history-page">
        <header className="booking-history-header">
          <button
            type="button"
            className="booking-history-back"
            onClick={handleSubPageBack}
          >
            <span className="back-arrow">←</span>
            <span>Back</span>
          </button>

          <div className="booking-history-title">
            <h1>Support</h1>
            <p>Contact the cycle sharing support team.</p>
          </div>
        </header>

        <main className="booking-history-main">
          <section className="booking-subpage-card support-subpage">
            <div className="subpage-heading">
              <span className="subpage-icon">☎</span>
              <div>
                <span className="subpage-eyebrow">
                  NEED HELP?
                </span>
                <h2>Contact support</h2>
                <p>
                  Call the support team using one of the numbers below.
                </p>
              </div>
            </div>

            <div className="support-number-list">
              {SUPPORT_NUMBERS.map((support) => (
                <a
                  className="support-number-card"
                  key={`${support.label}-${support.number}`}
                  href={`tel:${support.number}`}
                >
                  <div>
                    <strong>{support.label}</strong>
                    <span>{support.number}</span>
                  </div>
                  <span className="support-call-icon">☎</span>
                </a>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="booking-history-page">
      <header className="booking-history-header">
        <button
          type="button"
          className="booking-history-back"
          onClick={onBack}
        >
          <span className="back-arrow">←</span>
          <span>Back</span>
        </button>

        <div className="booking-history-title">
          <h1>Booking History</h1>
          <p>
            View your cycle rentals, earnings and payments.
          </p>
        </div>
      </header>

      <main className="booking-history-main">
        {/* ======================================================
            BALANCE SUMMARY
        ====================================================== */}

        {!loading && !error && (
          <section className="balance-summary-card">
            <div className="balance-summary-left">
              <span className="balance-eyebrow">
                TOTAL BALANCE
              </span>

              <h2 className={balanceTextClass}>
                {netBalance > 0 && "+"}
                {formatMoney(netBalance)}
              </h2>

              <p>
                {positiveBalance
                  ? "This is the amount available for withdrawal from your cycle rental earnings."
                  : negativeBalance
                    ? "This amount is currently due on your account."
                    : "Your account balance is currently settled."}
              </p>
            </div>

            <div className="balance-summary-right">
              {positiveBalance && (
                <button
                  type="button"
                  className="balance-action-button withdraw-balance-button"
                  onClick={openWithdrawPage}
                >
                  <span>↗</span>
                  Withdraw
                </button>
              )}

              {negativeBalance && (
                <button
                  type="button"
                  className="balance-action-button pay-balance-button"
                  onClick={() => {
                    setPayMessage("");
                    setPayError("");
                    setActiveSubPage("pay");
                  }}
                >
                  <span>₹</span>
                  Pay Now
                </button>
              )}

              {!positiveBalance && !negativeBalance && (
                <div className="balance-settled">
                  ✓ Balance Settled
                </div>
              )}
            </div>
          </section>
        )}

        {/* ======================================================
            SUPPORT
        ====================================================== */}

        {!loading && (
          <div className="history-tools">
            <button
              type="button"
              className="support-button"
              onClick={() => setActiveSubPage("support")}
            >
              <span>☎</span>
              Support
            </button>
          </div>
        )}

        {/* ======================================================
            LOADING
        ====================================================== */}

        {loading && (
          <div className="booking-history-state">
            <div className="booking-history-loader" />

            <h3>Loading booking history...</h3>

            <p>
              Please wait while we fetch your rentals and balance.
            </p>
          </div>
        )}

        {/* ======================================================
            ERROR
        ====================================================== */}

        {!loading && error && (
          <div className="booking-history-state error-state">
            <div className="state-icon">!</div>

            <h3>Something went wrong</h3>

            <p>{error}</p>

            <button
              type="button"
              className="retry-booking-btn"
              onClick={fetchBookingHistory}
            >
              Try Again
            </button>
          </div>
        )}

        {/* ======================================================
            EMPTY
        ====================================================== */}

        {!loading &&
          !error &&
          bookings.length === 0 && (
            <div className="booking-history-state">
              <div className="empty-bike-icon">🚲</div>

              <h3>No bookings yet</h3>

              <p>
                Your cycle rental history will appear here after
                you make or receive a booking.
              </p>
            </div>
          )}

        {/* ======================================================
            BOOKING LIST
        ====================================================== */}

        {!loading &&
          !error &&
          bookings.length > 0 && (
            <>
              {(cancelError || cancelMessage) && cancelBookingId === null && (
                <div
                  className={`booking-cancel-feedback ${
                    cancelError ? "error" : "success"
                  } booking-cancel-page-feedback`}
                  role="alert"
                >
                  {cancelError || cancelMessage}
                </div>
              )}

              <div className="booking-history-list">
              {bookings.map((booking) => {
                const cycle = booking.cycles || {};
                const image = getCycleImage(booking);
                const isOwner = isCurrentUserOwner(booking);
                const financialInfo = currentUserId
                  ? getBookingFinancialInfo(booking)
                  : null;


                return (
                  <article
                    className="booking-history-strip"
                    key={booking.id}
                  >
                    <div className="booking-strip-image">
                      {image ? (
                        <img
                          src={image}
                          alt={`${cycle.brand || "Cycle"} cycle`}
                        />
                      ) : (
                        <div className="booking-strip-placeholder">
                          🚲
                        </div>
                      )}
                    </div>

                    <div className="booking-strip-main">
                      <div className="booking-strip-title">
                        <div>
                          <h2>{cycle.brand || "Cycle"}</h2>

                          {cycle.model && (
                            <p>{cycle.model}</p>
                          )}
                        </div>

                        <span className={getStatusClass(booking)}>
                          {getStatusLabel(booking)}
                        </span>
                      </div>

                      <div className="booking-strip-meta">
                        <span>
                          Owner: {booking.ownerName || "Owner"}
                        </span>

                        <span>
                          {isOwner ? "You are the owner" : "You are the Renter"}
                        </span>

                        <span>
                          📍 {cycle.location || "Location not available"}
                        </span>

                        <span>
                          {formatDate(booking.created_at)}
                        </span>
                      </div>

                      {financialInfo && (
                        <span
                          className={`booking-strip-amount ${
                            financialInfo.type === "earned"
                              ? "strip-earned"
                              : "strip-owed"
                          }`}
                        >
                          {financialInfo.type === "earned" ? "+" : "-"}
                          {formatMoney(financialInfo.amount)}
                        </span>
                      )}
                    </div>

                    <div className="booking-strip-actions">
                      <button
                        type="button"
                        className="booking-strip-details-button"
                        onClick={() => openBookingDetails(booking)}
                      >
                        <span>View Details</span>
                        <span>→</span>
                      </button>

                      {canCancelBooking(booking) && (
                        <button
                          type="button"
                          className="booking-strip-cancel-button"
                          onClick={() => handleCancelBooking(booking)}
                          disabled={cancelBookingId === booking.id}
                        >
                          {cancelBookingId === booking.id
                            ? "Cancelling..."
                            : "Cancel Booking"}
                        </button>
                      )}
                    </div>

                  </article>
                );
              })}
              </div>
            </>
          )}
      </main>
    </div>
  );
}

export default BookingHistory;
