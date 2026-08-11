
import React, { useState } from "react";
import "./ForgotPassword.css";
import logo from "./assets/app_logo.png";
import { supabase } from "./supabase";

function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    // -----------------------------
    // EMAIL VALIDATION
    // -----------------------------

    if (!cleanEmail) {
      alert("Please enter your email address.");
      return;
    }

    if (!cleanEmail.endsWith("@nitk.edu.in")) {
      alert("Please use an email address ending with @nitk.edu.in");
      return;
    }

    setLoading(true);

    try {
      // -----------------------------
      // SEND PASSWORD RESET EMAIL
      // -----------------------------

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo: "http://localhost:5174/",
          }
        );

      if (error) {
        console.error(
          "Password reset error:",
          error
        );

        alert(error.message);
        return;
      }

      // -----------------------------
      // SUCCESS
      // -----------------------------

      setSent(true);

    } catch (error) {
      console.error(
        "Unexpected password reset error:",
        error
      );

      alert(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">

      {/* Background */}
      <div className="background-glow"></div>

      {/* Header */}
      <header className="forgot-header">
        <div className="brand">
          <span className="brand-white">
            NITK
          </span>

          <span className="brand-green">
            {" "}CYCLE SHARING
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="forgot-container">

        <div className="forgot-card">

          {/* Logo */}
          <div className="forgot-logo">
            <img
              src={logo}
              alt="NITK Cycle Sharing Logo"
            />
          </div>

          {!sent ? (
            <>
              <h1>Reset Password</h1>

              <p className="forgot-subtitle">
                Enter your NITK email address and
                we'll send you a password reset link.
              </p>

              <form
                onSubmit={handleSubmit}
                className="forgot-form"
              >

                <div className="input-group">

                  <label htmlFor="email">
                    NITK Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="yourname@nitk.edu.in"
                    required
                  />

                </div>

                <button
                  type="submit"
                  className="reset-email-button"
                  disabled={loading}
                >
                  {loading
                    ? "Sending..."
                    : "Send Reset Email"}
                </button>

              </form>

              <button
                type="button"
                className="back-login-button"
                onClick={onBackToLogin}
              >
                ← Back to Login
              </button>
            </>
          ) : (
            <>
              <div className="success-icon">
                ✓
              </div>

              <h1>
                Check Your Email
              </h1>

              <p className="forgot-subtitle">
                We have sent a password reset
                link to:
              </p>

              <p className="sent-email">
                {email}
              </p>

              <p className="email-instruction">
                Open your NITK email and click
                the password reset link to create
                a new password.
              </p>

              <button
                type="button"
                className="back-login-button"
                onClick={onBackToLogin}
              >
                ← Back to Login
              </button>
            </>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="forgot-footer">
        <p>
          Welcome to NITK Cycle Sharing
        </p>
      </footer>

    </div>
  );
}

export default ForgotPassword;
