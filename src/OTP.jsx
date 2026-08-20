import React, { useState, useRef } from "react";
import "./OTP.css";

function OTP({ onBookingId, onBackToNotifications }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef([]);

  const handleChange = (value, index) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);

    setOtp(newOtp);
    setError("");

    // Move to next input
    if (value && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event, index) => {
    // Move backwards when pressing Backspace
    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();

    const pastedData = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedData) return;

    const newOtp = [...otp];

    pastedData.split("").forEach((digit, index) => {
      newOtp[index] = digit;
    });

    setOtp(newOtp);

    const nextIndex = Math.min(
      pastedData.length,
      otp.length - 1
    );

    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    try {
      const response = await fetch(
        "https://stem61.app.n8n.cloud/webhook/otp-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            booking_id: onBookingId,
            OTP: enteredOtp,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `OTP verification failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      console.log("n8n response:", result);

      // OTP verification successful
      setError("");
      
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("Unable to verify OTP. Please try again.");
    }

    /*
     * TEMPORARY VERIFICATION
     *
     * Later this will call your backend/Supabase
     * verification logic.
     */

    console.log("OTP entered:", enteredOtp);

    // Demo success
    setSuccess(true);
    setError("");
  };

  const handleClear = () => {
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setSuccess(false);

    inputRefs.current[0]?.focus();
  };

  if (success) {
    return (
      <div className="owner-otp-page">

        <button
          type="button"
          className="otp-back-button"
          onClick={() => {
            if (typeof onBackToNotifications === "function") {
              onBackToNotifications();
            }
          }}
          aria-label="Back to notifications"
        >
          <span className="otp-back-arrow">←</span>
          <span>Notifications</span>
        </button>

        <div className="otp-success-card">

          <div className="success-icon">
            ✓
          </div>

          <span className="otp-eyebrow">
            VERIFICATION SUCCESSFUL
          </span>

          <h1>
            Rental Started
          </h1>

          <p>
            The renter has been successfully verified.
            The rental can now officially begin.
          </p>

          <div className="rental-status">
            <span className="status-dot"></span>
            Rental Active
          </div>

          <button
            className="continue-button"
            onClick={() => {
              console.log("Continue to active rental");
            }}
          >
            Continue
          </button>

        </div>

      </div>
    );
  }

  return (
    <div className="owner-otp-page">

      <button
        type="button"
        className="otp-back-button"
        onClick={() => {
          if (typeof onBackToNotifications === "function") {
            onBackToNotifications();
          }
        }}
        aria-label="Back to notifications"
      >
        <span className="otp-back-arrow">←</span>
        <span>Notifications</span>
      </button>

      <main className="otp-container">

        {/* Top icon */}
        <div className="otp-icon">
          🔐
        </div>

        <span className="otp-eyebrow">
          OWNER VERIFICATION
        </span>

        <h1>
          Verify Renter
        </h1>

        <p className="otp-description">
          Enter the 6-digit OTP provided by the
          renter to start the rental.
        </p>

        {/* Booking information */}
        <div className="booking-info">

          <div className="info-row">
            <span>Renter</span>
            <strong>Student Name</strong>
          </div>

          <div className="info-row">
            <span>Cycle</span>
            <strong>Campus Cycle #104</strong>
          </div>

        </div>

        {/* OTP inputs */}
        <div
          className="otp-input-container"
          onPaste={handlePaste}
        >

          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              className={`otp-input ${
                error ? "otp-error" : ""
              }`}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={digit}
              onChange={(event) =>
                handleChange(
                  event.target.value,
                  index
                )
              }
              onKeyDown={(event) =>
                handleKeyDown(event, index)
              }
              aria-label={`OTP digit ${index + 1}`}
            />
          ))}

        </div>

        {error && (
          <p className="otp-error-message">
            {error}
          </p>
        )}

        {/* Verify */}
        <button
          className="verify-button"
          onClick={handleVerify}
        >
          Verify & Start Rental
        </button>

        {/* Clear */}
        <button
          className="clear-button"
          onClick={handleClear}
        >
          Clear OTP
        </button>

        <p className="security-note">
          🔒 The rental will begin only after
          successful verification.
        </p>

      </main>

    </div>
  );
}

export default OTP;