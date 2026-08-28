import React, { useEffect, useState, useRef } from "react";
import "./OTP.css";
import { supabase } from "./supabase";

function OTP({ onBookingId, onBackToNotifications, onContinue, actionType, notification }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [backendMessage, setBackendMessage] = useState("");
  const [renterName, setRenterName] = useState("Loading...");
  const [cycleName, setCycleName] = useState("Loading...");
  const [bookingLoading, setBookingLoading] = useState(true);
  const inputRefs = useRef([]);

  const normalizedAction = String(actionType || notification?.action_type || "").trim().toLowerCase();
  const isReturnOtp = normalizedAction.includes("return") && normalizedAction.includes("otp");

  const webhook = isReturnOtp
    ? "https://ugo-cyclesharing.app.n8n.cloud/webhook/return"
    : "https://ugo-cyclesharing.app.n8n.cloud/webhook/otp-verification";

  useEffect(() => {
    const load = async () => {
      if (!onBookingId) {
        setRenterName("Renter");
        setCycleName("Cycle");
        setBookingLoading(false);
        return;
      }
      try {
        const { data: booking, error: bookingError } = await supabase
          .from("booking_table")
          .select(`id, renter_id, cycle_id, cycles (id, brand, model)`)
          .eq("id", onBookingId)
          .maybeSingle();

        if (bookingError) throw bookingError;
        if (!booking) throw new Error("Booking not found");

        if (booking.renter_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", booking.renter_id)
            .maybeSingle();

          setRenterName(
            profile?.full_name?.trim() ||
            profile?.email?.split("@")[0] ||
            "Renter"
          );
        } else {
          setRenterName("Renter");
        }

        const cycle = booking.cycles;
        setCycleName([cycle?.brand, cycle?.model].filter(Boolean).join(" ") || "Cycle");
      } catch (e) {
        console.error("Error fetching OTP booking details:", e);
        setRenterName("Renter");
        setCycleName("Cycle");
      } finally {
        setBookingLoading(false);
      }
    };
    load();
  }, [onBookingId]);

  const handleChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const value = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!value) return;
    const next = ["", "", "", "", "", ""];
    value.split("").forEach((d, i) => { next[i] = d; });
    setOtp(next);
    inputRefs.current[Math.min(value.length, 5)]?.focus();
  };

  const extractMessage = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) {
      for (const item of value) {
        const m = extractMessage(item);
        if (m) return m;
      }
      return "";
    }
    if (typeof value === "object") {
      return String(
        value.message ||
        value.body?.message ||
        value.data?.message ||
        value.response?.message ||
        value.response ||
        value.result?.message ||
        value.result ||
        ""
      ).trim();
    }
    return "";
  };

  const responseConfirmsVerification = (value) => {
    if (!value) return false;
    const text = JSON.stringify(value).toLowerCase();
    return (
      text.includes('"verified":true') ||
      text.includes('"success":true') ||
      text.includes('"status":"verified"') ||
      text.includes('"status":"success"') ||
      text.includes("otp verified") ||
      text.includes("otp successfully verified") ||
      text.includes("otp verification successful") ||
      text.includes("successfully verified") ||
      text.includes("verification successful")
    );
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    if (!onBookingId) {
      setError("Booking information is missing.");
      return;
    }
    if (verifying) return;

    setVerifying(true);
    setError("");
    setBackendMessage("");
    setSuccess(false);

    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          booking_id: onBookingId,
          OTP: enteredOtp,
        }),
      });

      const text = await response.text();
      let result = null;
      if (text) {
        try { result = JSON.parse(text); }
        catch { result = text; }
      }

      const message = extractMessage(result);

      if (!response.ok) {
        throw new Error(message || `OTP verification failed: ${response.status}`);
      }

      if (message) setBackendMessage(message);

      if (isReturnOtp) {
        if (!responseConfirmsVerification(result) &&
            !/verified|success/i.test(message)) {
          setError(message || "Return OTP verification was not confirmed by the backend.");
          setBackendMessage("");
          return;
        }
        setSuccess(true);
        return;
      }

      let bookingStatus = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data } = await supabase
          .from("booking_table")
          .select("status")
          .eq("id", onBookingId)
          .maybeSingle();

        bookingStatus = String(data?.status || "").trim().toLowerCase();

        if (["otp_verified", "payment_pending", "active"].includes(bookingStatus)) break;
        if (attempt < 4) await new Promise(r => setTimeout(r, 500));
      }

      const verified =
        ["otp_verified", "payment_pending", "active"].includes(bookingStatus) ||
        responseConfirmsVerification(result);

      if (!verified) {
        setError(message || "OTP verification was not confirmed by the backend. Please try again.");
        setBackendMessage("");
        return;
      }

      setSuccess(true);
    } catch (e) {
      console.error("OTP verification error:", e);
      setSuccess(false);
      setBackendMessage("");
      setError(e.message || "Unable to verify OTP. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleClear = () => {
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setSuccess(false);
    setBackendMessage("");
    inputRefs.current[0]?.focus();
  };

  if (success) {
    return (
      <div className="owner-otp-page">
        <button type="button" className="otp-back-button" onClick={onBackToNotifications}>
          <span className="otp-back-arrow">←</span><span>Notifications</span>
        </button>
        <div className="otp-success-card">
          <div className="success-icon">✓</div>
          <span className="otp-eyebrow">VERIFICATION SUCCESSFUL</span>
          <h1>{isReturnOtp ? "Return OTP Verified" : "OTP Successfully Verified"}</h1>
          {backendMessage ? (
            <p className="otp-backend-message" role="status">{backendMessage}</p>
          ) : (
            <p>{isReturnOtp ? "The return OTP has been successfully verified." : "OTP successfully verified. The rental can now officially begin."}</p>
          )}
          <div className="rental-status">
            <span className="status-dot"></span>
            {isReturnOtp ? "Return Verified" : "Rental Active"}
          </div>
          <button className="continue-button" onClick={onContinue}>Continue</button>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-otp-page">
      <button type="button" className="otp-back-button" onClick={onBackToNotifications}>
        <span className="otp-back-arrow">←</span><span>Notifications</span>
      </button>

      <main className="otp-container">
        <div className="otp-icon">🔐</div>
        <span className="otp-eyebrow">{isReturnOtp ? "RETURN VERIFICATION" : "OWNER VERIFICATION"}</span>
        <h1>{isReturnOtp ? "Verify Return" : "Verify Renter"}</h1>
        <p className="otp-description">
          {isReturnOtp
            ? "Enter the 6-digit OTP provided for returning the cycle."
            : "Enter the 6-digit OTP provided by the renter to start the rental."}
        </p>

        <div className="booking-info">
          <div className="info-row"><span>Renter</span><strong>{bookingLoading ? "Loading..." : renterName}</strong></div>
          <div className="info-row"><span>Cycle</span><strong>{bookingLoading ? "Loading..." : cycleName}</strong></div>
        </div>

        <div className="otp-input-container" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input key={index} ref={el => { inputRefs.current[index] = el; }}
              className={`otp-input ${error ? "otp-error" : ""}`}
              type="text" inputMode="numeric" maxLength="1" value={digit}
              disabled={verifying}
              onChange={e => handleChange(e.target.value, index)}
              onKeyDown={e => handleKeyDown(e, index)}
              aria-label={`OTP digit ${index + 1}`} />
          ))}
        </div>

        {verifying && (
          <div className="otp-verifying-message" role="status" aria-live="polite">
            <span className="otp-loading-spinner"></span>
            <span>Verifying OTP with the backend...</span>
          </div>
        )}

        {error && !verifying && <p className="otp-error-message">{error}</p>}

        <button className="verify-button" onClick={handleVerify} disabled={verifying}>
          {verifying ? "Verifying OTP..." : isReturnOtp ? "Verify Return OTP" : "Verify & Start Rental"}
        </button>

        <button className="clear-button" onClick={handleClear} disabled={verifying}>
          Clear OTP
        </button>

        <p className="security-note">🔒 Verification is completed only after successful backend confirmation.</p>
      </main>
    </div>
  );
}

export default OTP;
