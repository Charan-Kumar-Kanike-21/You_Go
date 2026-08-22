import React, { useEffect, useState, useRef } from "react";
import "./OTP.css";
import { supabase } from "./supabase";

function OTP({ onBookingId, onBackToNotifications, onContinue }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Booking information shown on the OTP page.
  const [renterName, setRenterName] = useState("Loading...");
  const [cycleName, setCycleName] = useState("Loading...");
  const [bookingLoading, setBookingLoading] = useState(true);

  const inputRefs = useRef([]);

  // ------------------------------------------------------------
  // FETCH RENTER + CYCLE DETAILS
  // ------------------------------------------------------------
  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!onBookingId) {
        setRenterName("Renter");
        setCycleName("Cycle");
        setBookingLoading(false);
        return;
      }

      try {
        setBookingLoading(true);

        const {
          data: booking,
          error: bookingError,
        } = await supabase
          .from("booking_table")
          .select(`
            id,
            renter_id,
            cycle_id,
            cycles (
              id,
              brand,
              model
            )
          `)
          .eq("id", onBookingId)
          .maybeSingle();

        if (bookingError) throw bookingError;

        if (!booking) {
          setRenterName("Renter");
          setCycleName("Cycle");
          return;
        }

        // Fetch renter name from profiles using booking_table.renter_id.
        if (booking.renter_id) {
          const {
            data: renterProfile,
            error: renterError,
          } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", booking.renter_id)
            .maybeSingle();

          if (renterError) throw renterError;

          setRenterName(
            renterProfile?.full_name?.trim() ||
            renterProfile?.email?.split("@")[0] ||
            "Renter"
          );
        } else {
          setRenterName("Renter");
        }

        const cycle = booking.cycles;

        const cycleLabel = [
          cycle?.brand,
          cycle?.model,
        ]
          .filter(Boolean)
          .join(" ");

        setCycleName(cycleLabel || "Cycle");
      } catch (error) {
        console.error("Error fetching OTP booking details:", error);
        setRenterName("Renter");
        setCycleName("Cycle");
      } finally {
        setBookingLoading(false);
      }
    };

    fetchBookingDetails();
  }, [onBookingId]);

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

    if (verifying) return;

    setVerifying(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch(
        "https://ugo-cyclesharing.app.n8n.cloud/webhook/otp-verification",
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

      /*
       * The webhook may return different response formats, and in some
       * n8n workflows it may return an empty/very small response even
       * though the database was successfully updated.
       */
      const responseText = await response.text();

      let result = null;

      if (responseText) {
        try {
          result = JSON.parse(responseText);
        } catch {
          result = responseText;
        }
      }

      console.log("OTP verification HTTP status:", response.status);
      console.log("OTP verification webhook response:", result);

      if (!response.ok) {
        const backendError =
          typeof result === "string"
            ? result
            : result?.message ||
              result?.error ||
              result?.body?.message ||
              result?.body?.error ||
              "";

        throw new Error(
          backendError ||
          `OTP verification failed: ${response.status} ${response.statusText}`
        );
      }

      /*
       * ------------------------------------------------------------
       * SOURCE OF TRUTH: booking_table.status
       * ------------------------------------------------------------
       *
       * Your booking status enum contains `otp_verified`.
       * After the backend verifies the OTP, it should update the
       * booking status to otp_verified.
       *
       * This is more reliable than depending on the exact text/shape
       * returned by the n8n webhook.
       */
      let bookingStatus = null;

      const checkBookingStatus = async () => {
        const {
          data: booking,
          error: bookingError,
        } = await supabase
          .from("booking_table")
          .select("status")
          .eq("id", onBookingId)
          .maybeSingle();

        if (bookingError) {
          console.error(
            "Error checking booking verification status:",
            bookingError
          );
          return null;
        }

        return booking?.status
          ? String(booking.status).trim().toLowerCase()
          : null;
      };

      /*
       * Give the backend a short amount of time to finish updating
       * booking_table. We check a few times instead of assuming that
       * the HTTP response itself means verification succeeded.
       */
      for (let attempt = 0; attempt < 5; attempt++) {
        bookingStatus = await checkBookingStatus();

        console.log(
          `Booking status check ${attempt + 1}:`,
          bookingStatus
        );

        if (
          bookingStatus === "payment_pending" ||
          bookingStatus === "active"
        ) {
          break;
        }

        if (attempt < 4) {
          await new Promise((resolve) =>
            setTimeout(resolve, 500)
          );
        }
      }

      /*
       * Also inspect the webhook response. This is a fallback in case
       * the backend confirms verification in its response but the DB
       * update has not become visible yet.
       */
      const responseCandidates = [];

      const collectResponseValues = (value) => {
        if (value === null || value === undefined) return;

        if (typeof value === "string") {
          responseCandidates.push(value);
          return;
        }

        if (typeof value !== "object") return;

        Object.entries(value).forEach(([key, child]) => {
          if (
            key.toLowerCase().includes("otp") ||
            key.toLowerCase().includes("verif") ||
            key.toLowerCase().includes("success") ||
            key.toLowerCase().includes("status") ||
            key.toLowerCase().includes("message") ||
            key.toLowerCase().includes("result") ||
            key.toLowerCase().includes("response")
          ) {
            if (
              typeof child === "string" ||
              typeof child === "boolean" ||
              typeof child === "number"
            ) {
              responseCandidates.push(String(child));
            }
          }

          if (child && typeof child === "object") {
            collectResponseValues(child);
          }
        });
      };

      if (Array.isArray(result)) {
        result.forEach(collectResponseValues);
      } else {
        collectResponseValues(result);
      }

      const normalizedResponse = responseCandidates
        .join(" ")
        .trim()
        .toLowerCase();

      const responseConfirmsVerification =
        normalizedResponse.includes("otp verified") ||
        normalizedResponse.includes("otp successfully verified") ||
        normalizedResponse.includes("otp verification successful") ||
        normalizedResponse.includes("successfully verified") ||
        normalizedResponse.includes("verification successful") ||
        normalizedResponse.includes("verification success") ||
        normalizedResponse.includes("verified successfully") ||
        normalizedResponse.includes("verified: true") ||
        normalizedResponse.includes("success: true");

      /*
       * SUCCESS:
       * - Prefer booking_table.status = otp_verified/active.
       * - Otherwise accept an explicit verification confirmation
       *   from the webhook.
       */
      const verified =
        bookingStatus === "payment_pending" ||
        bookingStatus === "active" ||
        responseConfirmsVerification;

      if (!verified) {
        console.error(
          "OTP verification was not confirmed.",
          {
            bookingStatus,
            webhookResponse: result,
          }
        );

        setError(
          "OTP verification was not confirmed by the backend. Please try again."
        );
        return;
      }

      /*
       * Clear every previous error before changing the screen.
       * This prevents the red OTP error from remaining visible
       * after a successful verification.
       */
      setError("");
      setSuccess(true);
    } catch (error) {
      console.error("OTP verification error:", error);

      setSuccess(false);
      setError(
        error.message ||
        "Unable to verify OTP. Please try again."
      );
    } finally {
      setVerifying(false);
    }
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
          onClick={onBackToNotifications}
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
            OTP Successfully Verified
          </h1>

          <p>
            OTP successfully verified.
            The rental can now officially begin.
          </p>

          <div className="rental-status">
            <span className="status-dot"></span>
            Rental Active
          </div>

          <button
            className="continue-button"
            onClick={onContinue}
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
        onClick={onBackToNotifications}
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
            <strong>
              {bookingLoading ? "Loading..." : renterName}
            </strong>
          </div>

          <div className="info-row">
            <span>Cycle</span>
            <strong>
              {bookingLoading ? "Loading..." : cycleName}
            </strong>
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
          disabled={verifying}
        >
          {verifying ? (
            <>
              <span className="otp-loading-spinner" aria-hidden="true"></span>
              Verifying OTP...
            </>
          ) : (
            "Verify & Start Rental"
          )}
        </button>

        {/* Clear */}
        <button
          className="clear-button"
          onClick={handleClear}
          disabled={verifying}
        >
          Clear OTP
        </button>

        {verifying && (
          <div className="otp-verifying-message" role="status">
            <span className="otp-loading-spinner" aria-hidden="true"></span>
            <span>Waiting for backend confirmation...</span>
          </div>
        )}

        <p className="security-note">
          🔒 The rental will begin only after
          successful verification.
        </p>

      </main>

    </div>
  );
}

export default OTP;