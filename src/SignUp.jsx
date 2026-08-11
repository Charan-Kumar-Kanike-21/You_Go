import React, { useState } from "react";
import "./SignUp.css";
import logo from "./assets/app_logo.png";
import { supabase } from "./supabase";

function SignUp({ onBackToLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  // -----------------------------
  // HANDLE INPUT CHANGES
  // -----------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Mobile number: allow only digits
    if (name === "mobile") {
      const digitsOnly = value.replace(/\D/g, "");

      // Maximum 10 digits
      if (digitsOnly.length <= 10) {
        setFormData({
          ...formData,
          mobile: digitsOnly,
        });
      }

      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // -----------------------------
  // HANDLE SIGNUP
  // -----------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = formData.email.trim().toLowerCase();
    const mobile = formData.mobile.trim();

    // -----------------------------
    // NITK EMAIL VALIDATION
    // -----------------------------

    if (!email.endsWith("@nitk.edu.in")) {
      alert("Please use an email address ending with @nitk.edu.in");
      return;
    }

    // -----------------------------
    // MOBILE VALIDATION
    // -----------------------------

    if (!/^\d{10}$/.test(mobile)) {
      alert("Mobile number must contain exactly 10 digits.");
      return;
    }

    // -----------------------------
    // PASSWORD VALIDATION
    // -----------------------------

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // -----------------------------
    // START LOADING
    // -----------------------------

    setLoading(true);

    try {
      // -----------------------------
      // SUPABASE SIGNUP
      // -----------------------------

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: formData.password,
      });

      console.log("Supabase Auth Response:", data);

      // -----------------------------
      // HANDLE SUPABASE ERROR
      // -----------------------------

      if (error) {
        console.error("Supabase signup error:", error);
        alert(error.message);
        return;
      }

      // -----------------------------
      // SUCCESS
      // -----------------------------

      console.log("User created:", data.user);

      alert(
        "Account created successfully! Please check your NITK email and click the verification link."
      );

      // You can navigate to your verification page here later.
      // Example:
      // onSignupSuccess(email);

    } catch (error) {
      console.error("Unexpected signup error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // PAGE
  // -----------------------------

  return (
    <div className="signup-card">

      {/* Logo */}
      <div className="signup-logo">
        <img src={logo} alt="Cycle Logo" />
      </div>

      {/* Heading */}
      <h1>Create Account</h1>

      <p className="signup-subtitle">
        Join the NITK Cycle Sharing Community
      </p>

      <form onSubmit={handleSubmit}>

        {/* Email */}
        <div className="input-group">
          <label>NITK Email</label>

          <input
            type="email"
            name="email"
            placeholder="example@nitk.edu.in"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <small className="email-hint">
            Only @nitk.edu.in email addresses are allowed
          </small>
        </div>

        {/* Mobile Number */}
        <div className="input-group">
          <label>Mobile Number</label>

          <input
            type="tel"
            name="mobile"
            placeholder="Enter 10-digit mobile number"
            value={formData.mobile}
            onChange={handleChange}
            maxLength="10"
            inputMode="numeric"
            required
          />

          <small className="email-hint">
            Enter exactly 10 digits
          </small>
        </div>

        {/* Password */}
        <div className="input-group">
          <label>Password</label>

          <input
            type="password"
            name="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        {/* Confirm Password */}
        <div className="input-group">
          <label>Confirm Password</label>

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        {/* Terms */}
        <div className="terms">
          <input
            type="checkbox"
            required
          />

          <span>
            I agree to the terms and conditions
          </span>
        </div>

        {/* Create Account */}
        <button
          type="submit"
          className="signup-button"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

      </form>

      {/* Login */}
      <p className="login-text">
        Already have an account?

        <button
          type="button"
          onClick={onBackToLogin}
          className="login-link"
        >
          Login
        </button>
      </p>

    </div>
  );
}

export default SignUp;