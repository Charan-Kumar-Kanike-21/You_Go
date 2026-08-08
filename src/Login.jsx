import React, { useState } from "react";
import "./Login.css";
import logoImage from "./assets/app_logo.png";
import "./SignUp.css";
import { supabase } from './supabase';

function Login({onCreateAccount}) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const testSupabase = async () => {
  const { data, error } = await supabase
    .from('cycles')
    .select('*');

  console.log('Data:', data);
  console.log('Error:', error);
};  

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    console.log("Login Details:", {
      email,
      password,
      rememberMe,
    });

    alert("Login successful!");
  };

  return (
    <div className="login-page">

      {/* Background glow */}
      <div className="background-glow"></div>

      {/* =================================
          TOP BRAND
      ================================= */}
      <header className="login-header">
        <div className="brand">
          <span className="brand-white">NITK</span>
          <span className="brand-green"> CYCLE SHARING</span>
        </div>
      </header>


      {/* =================================
          LOGIN SECTION
      ================================= */}
      <main className="login-container">

        {/* LOGIN CARD / TABLE */}
        <div className="login-card">

          {/* =================================
              LOGO AT TOP OF LOGIN CARD
          ================================= */}
          <div className="login-logo">
            <img
              src={logoImage}
              alt="NITK Cycle Sharing Logo"
            />
          </div>


          {/* =================================
              HEADING
          ================================= */}
          <h1>Welcome Back</h1>

          <p className="login-subtitle">
            Login to NITK Cycle Sharing
          </p>


          {/* =================================
              LOGIN FORM
          ================================= */}
          <form
            onSubmit={handleSubmit}
            className="login-form"
          >

            {/* EMAIL */}
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


            {/* PASSWORD */}
            <div className="input-group">

              <label htmlFor="password">
                Password
              </label>

              <div className="password-wrapper">

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  required
                />

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>


            {/* =================================
                REMEMBER + FORGOT
            ================================= */}
            <div className="login-options">

              <label className="remember-me">

                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) =>
                    setRememberMe(
                      e.target.checked
                    )
                  }
                />

                <span>
                  Remember me
                </span>

              </label>


              <button
                type="button"
                className="forgot-password"
                onClick={() =>
                  alert(
                    "Password reset feature coming soon."
                  )
                }
              >
                Forgot password?
              </button>

            </div>


            {/* =================================
                LOGIN BUTTON
            ================================= */}
            <button
              type="submit"
              className="login-button"
            >
              <span>Login</span>

              <span className="arrow">
                →
              </span>
            </button>

          </form>


          {/* =================================
              SIGN UP
          ================================= */}
          <div className="signup-section">

            <span>
              Don't have an account?
            </span>

            <button
              type="button"
              onClick={onCreateAccount}
              className="create-account-link"
            >
              Create an account
            </button>

          </div>

        </div>

      </main>


      {/* =================================
          FOOTER
      ================================= */}
      <footer className="login-footer">

        <p>
          Welcome to NITK Cycle Sharing
        </p>

      </footer>

    </div>
  );
}

export default Login;