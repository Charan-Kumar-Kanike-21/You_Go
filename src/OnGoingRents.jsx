import React, { useEffect, useState } from "react";
import "./OnGoingRents.css";

// Change this import path according to your project
import { supabase } from "./supabase";

function OnGoingRents({ onReportIssue, onReturn }) {
  // ============================================================
  // CONFIGURATION
  // ============================================================

  // Your team can change this value later.
  // Extra charge is calculated per minute.
  const EXTRA_TIME_RATE_PER_MINUTE = 5;

  // Grace period after rental completion
  const GRACE_PERIOD_MINUTES = 15;

  // ============================================================
  // STATE
  // ============================================================

  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRenter, setIsRenter] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnMethod, setReturnMethod] = useState("");

  // ============================================================
  // FETCH ACTIVE RENTAL
  // ============================================================

  useEffect(() => {
    fetchActiveRental();
  }, []);

  const fetchActiveRental = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please login to view your active rental.");
        setLoading(false);
        return;
      }

      // ========================================================
      // ASSUMED RENTALS TABLE
      //
      // user_id
      // cycle_id
      // start_time
      // end_time
      // rental_amount
      // security_deposit
      // status
      // ========================================================

      const { data, error } = await supabase
        .from("booking_table")
        .select(`
            *,
            cycles (
            id,
            brand,
            model,
            location,
            owner_id,
            cycle_images (
                image_url,
                display_order
            )
            )
        `)
        .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
        .is("returned_at", null)
        .is("cancelled_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setIsRenter(data?.renter_id === user.id);
      setRental(data);
    } catch (err) {
      console.error("Error fetching rental:", err);
      setError("Unable to load your active rental.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LIVE CLOCK
  // ============================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ============================================================
  // TIME CALCULATIONS
  // ============================================================

  const getTimeInformation = () => {
    if (!rental) {
      return {
        totalDuration: 0,
        elapsed: 0,
        remaining: 0,
        graceRemaining: 0,
        extraMinutes: 0,
        rentalCompleted: false,
        inGracePeriod: false,
        extraTimeStarted: false,
      };
    }

    const start = new Date(rental.start_time).getTime();
    const end = new Date(rental.end_time).getTime();
    const now = currentTime.getTime();

    const totalDuration = end - start;

    // Before rental completion
    if (now <= end) {
      return {
        totalDuration,
        elapsed: Math.max(0, now - start),
        remaining: end - now,
        graceRemaining: GRACE_PERIOD_MINUTES * 60 * 1000,
        extraMinutes: 0,
        rentalCompleted: false,
        inGracePeriod: false,
        extraTimeStarted: false,
      };
    }

    // Rental completed
    const timeAfterRental = now - end;

    const gracePeriod =
      GRACE_PERIOD_MINUTES * 60 * 1000;

    // Still inside grace period
    if (timeAfterRental <= gracePeriod) {
      return {
        totalDuration,
        elapsed: totalDuration,
        remaining: 0,
        graceRemaining: gracePeriod - timeAfterRental,
        extraMinutes: 0,
        rentalCompleted: true,
        inGracePeriod: true,
        extraTimeStarted: false,
      };
    }

    // Extra time started
    const extraTime = timeAfterRental - gracePeriod;

    const extraMinutes = Math.ceil(
      extraTime / (60 * 1000)
    );

    return {
      totalDuration,
      elapsed: totalDuration,
      remaining: 0,
      graceRemaining: 0,
      extraMinutes,
      rentalCompleted: true,
      inGracePeriod: false,
      extraTimeStarted: true,
    };
  };

  const timeInfo = getTimeInformation();

  // ============================================================
  // SECURITY DEPOSIT CALCULATION
  // ============================================================

  const originalDeposit =
    Number(rental?.security_deposit) || 0;

  const deduction = Math.min(
    originalDeposit,
    timeInfo.extraMinutes *
      EXTRA_TIME_RATE_PER_MINUTE
  );

  const remainingDeposit = Math.max(
    0,
    originalDeposit - deduction
  );

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (milliseconds) => {
    if (milliseconds <= 0) {
      return "00:00:00";
    }

    const totalSeconds = Math.floor(
      milliseconds / 1000
    );

    const hours = Math.floor(
      totalSeconds / 3600
    );

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );

    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  // ============================================================
  // TIME BAR
  // ============================================================

  const getProgress = () => {
    if (!rental || !timeInfo.totalDuration) {
      return 0;
    }

    if (timeInfo.extraTimeStarted) {
      return 100;
    }

    const progress =
      (timeInfo.elapsed /
        timeInfo.totalDuration) *
      100;

    return Math.min(100, Math.max(0, progress));
  };

  // ============================================================
  // RETURN CYCLE
  // ============================================================

  const openReturnModal = () => {
    setShowReturnModal(true);
    setReturnMethod("");
  };

  const closeReturnModal = () => {
    setShowReturnModal(false);
    setReturnMethod("");
  };

  const confirmReturnMethod = async () => {
    if (!returnMethod) {
      return;
    }

    if (!rental?.id) {
      alert("Booking ID is missing.");
      return;
    }

    console.log("Returning booking:", rental.id);
    console.log("Return method:", returnMethod);

    closeReturnModal();

    if (onReturn) {
      onReturn(rental.id);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="my-rental-page">

        <div className="rental-loading">
          Loading your active rental...
        </div>

      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div className="my-rental-page">

        <div className="rental-message">

          <h2>Unable to load rental</h2>

          <p>{error}</p>

          <button
            className="retry-btn"
            onClick={fetchActiveRental}
          >
            Try Again
          </button>

        </div>

      </div>
    );
  }
  // ============================================================
  // NO ACTIVE RENTAL
  // ============================================================

  if (!rental) {
    return (
      <div className="my-rental-page">

        <div className="rental-message">
          <div className="empty-icon">🚲</div>

          <h2>No Active Rental</h2>

          <p>
            You currently don't have any rented cycle.
          </p>
        </div>

      </div>
    );
  }

  // ============================================================
  // CYCLE IMAGE
  // ============================================================

  const sortedImages =
    rental.cycles?.cycle_images?.sort(
      (a, b) =>
        (a.display_order || 0) -
        (b.display_order || 0)
    ) || [];

  const cycleImage =
    sortedImages[0]?.image_url ||
    "/assets/cycle-placeholder.jpg";

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <div className="my-rental-page">

      {/* HEADER */}

      <div className="my-rental-header">
        <div>
          <p className="page-small-title">
            ACTIVE RENTAL
          </p>

          <h1>My Rented Cycle</h1>

          <p className="page-description">
            Track your rental time and return your
            cycle safely.
          </p>
        </div>

        <div>
          <div className="active-badge">
            <span></span>
            Active Rental
          </div>
        </div>
      </div>

      {/* RENTAL CARD */}

      <div className="rental-card">

        {/* CYCLE SECTION */}

        <div className="cycle-section">

          <div className="cycle-image-container">
            <img
              src={cycleImage}
              alt={
                rental.cycles?.brand ||
                "Rented cycle"
              }
              className="cycle-image"
            />
          </div>

          <div className="cycle-details">

            <p className="cycle-label">
              YOUR RENTED CYCLE
            </p>

            <h2>
              {rental.cycles?.brand ||
                "Cycle"}
              {rental.cycles?.model
                ? ` ${rental.cycles.model}`
                : ""}
            </h2>

            <p className="cycle-location">
              📍 {rental.cycles?.location ||
                "Location unavailable"}
            </p>

          </div>

        </div>

        {/* TIME SECTION */}

        <div className="time-section">

          {!timeInfo.rentalCompleted && (
            <>
              <p className="section-label">
                TIME REMAINING
              </p>

              <div className="time-value">
                {formatTime(
                  timeInfo.remaining
                )}
              </div>

              <div className="time-bar">
                <div
                  className="time-bar-fill"
                  style={{
                    width: `${getProgress()}%`,
                  }}
                />
              </div>

              <div className="time-bar-labels">
                <span>
                  Rental Started
                </span>

                <span>
                  Rental Ends
                </span>
              </div>
            </>
          )}

          {/* GRACE PERIOD */}

          {timeInfo.inGracePeriod && (
            <div className="grace-box">

              <div className="grace-icon">
                ⏳
              </div>

              <div>
                <h3>
                  Grace Period
                </h3>

                <p>
                  Your rental time has ended.
                  You have additional time to
                  reach the owner's location.
                </p>

                <strong>
                  {formatTime(
                    timeInfo.graceRemaining
                  )}{" "}
                  remaining
                </strong>
              </div>

            </div>
          )}

          {/* EXTRA TIME */}

          {timeInfo.extraTimeStarted && (
            <div className="extra-time-box">

              <div className="extra-time-header">
                <span>
                  ⚠ Extra Time
                </span>

                <span>
                  {timeInfo.extraMinutes} min
                </span>
              </div>

              <p>
                Your 15-minute grace period
                has ended. Extra-time charges
                are now being deducted from
                your security deposit.
              </p>

              <div className="extra-rate">
                ₹{EXTRA_TIME_RATE_PER_MINUTE}
                /minute
              </div>

            </div>
          )}

        </div>

        {/* INFORMATION TABLE */}

        <div className="rental-info">

          <h3>Rental Information</h3>

          <div className="info-table">

            <div className="info-row">
              <span>
                Rental Amount
              </span>

              <strong>
                ₹
                {Number(
                  rental.rental_price || 0
                ).toFixed(2)}
              </strong>
            </div>

            <div className="info-row">
              <span>
                Security Deposit
              </span>

              <strong>
                ₹
                {originalDeposit.toFixed(2)}
              </strong>
            </div>

            <div className="info-row">
              <span>
                Extra Time
              </span>

              <strong>
                {timeInfo.extraMinutes} min
              </strong>
            </div>

            <div className="info-row">
              <span>
                Deposit Deducted
              </span>

              <strong className="deduction">
                -₹{deduction.toFixed(2)}
              </strong>
            </div>

            <div className="info-row remaining-row">
              <span>
                Remaining Deposit
              </span>

              <strong>
                ₹{remainingDeposit.toFixed(2)}
              </strong>
            </div>

          </div>

        </div>

        {/* RETURN BUTTON */}

       {/* ACTION BUTTONS */}

            <div className="return-section">

            <div className="rental-action-buttons">

                <button
                className="report-issue-btn"
                onClick={() => onReportIssue(rental)}
                >
                ⚠️ Report an Issue
                </button>

                {isRenter && <button
                className="return-cycle-btn"
                onClick={openReturnModal}
                >
                Return Cycle
                </button>}

            </div>

            <p>
                Having a problem with the cycle?
                Report it to the administration.
            </p>

            </div>

      </div>

      {/* RETURN MODAL */}

      {showReturnModal && (
        <div
          className="modal-overlay"
          onClick={closeReturnModal}
        >

          <div
            className="return-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="close-modal"
              onClick={closeReturnModal}
            >
              ×
            </button>

            <h2>
              Return Cycle
            </h2>

            <p>
              Where would you like to return
              the cycle?
            </p>

            <div className="return-options">

              <button
                className={`return-option ${
                  returnMethod === "owner"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setReturnMethod("owner")
                }
              >
                <span className="option-icon">
                  👤
                </span>

                <div>
                  <strong>
                    Return to Owner
                  </strong>

                  <small>
                    Return the cycle directly
                    to the owner.
                  </small>
                </div>
              </button>

              <button
                className={`return-option ${
                  returnMethod === "admin"
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setReturnMethod("admin")
                }
              >
                <span className="option-icon">
                  🛡️
                </span>

                <div>
                  <strong>
                    Return to Admin
                  </strong>

                  <small>
                    Use this if the owner is
                    unavailable.
                  </small>
                </div>
              </button>

            </div>

            <button
              className="confirm-return-btn"
              disabled={!returnMethod}
              onClick={
                confirmReturnMethod
              }
            >
              Continue
            </button>

            <p className="otp-note">
              OTP confirmation will be required
              to complete the return.
            </p>

          </div>

        </div>
      )}

    </div>
  );
}

export default OnGoingRents;