
import React, { useState } from "react";
import "./SignUp.css";
import logoImage from "./assets/app_logo.png";

function SignUp({ onBackToLogin }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // -----------------------------
  // HANDLE INPUT CHANGES
  // -----------------------------

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // -----------------------------
  // HANDLE SIGNUP
  // -----------------------------

  const handleSubmit = (e) => {
    e.preventDefault();

    // Check passwords
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    console.log("User Details:", formData);

    alert("Account created successfully!");

    // Backend/database can be connected here later
  };

  // -----------------------------
  // PAGE
  // -----------------------------

  return (
    <div className="signup-page">

      <div className="signup-card">

        {/* Logo */}
        <div className="signup-logo">
          <img src={logoImage} alt="Cycle Logo" />
        </div>

        {/* Heading */}
        <h1>Create Account</h1>

        <p className="signup-subtitle">
          Join the NITK Cycle Sharing Community
        </p>

        {/* Signup Form */}
        <form onSubmit={handleSubmit}>

          {/* Full Name */}
          <div className="input-group">
            <label>Full Name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email */}
          <div className="input-group">
            <label>Email</label>

            <input
              type="email"
              name="email"
              placeholder="Enter your NITK email"
              value={formData.email}
              onChange={handleChange}
              required
            />
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

          {/* Create Account Button */}
          <button
            type="submit"
            className="signup-button"
          >
            Create Account
          </button>

        </form>

        {/* Login Link */}
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

    </div>
  );
}

export default SignUp;

