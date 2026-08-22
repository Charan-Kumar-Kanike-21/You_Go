import {
  useState,
  useEffect,
} from "react";

import "./Login.css";

import logoImage from "./assets/UGO_logo.jpeg";

import "./SignUp.css";

import { supabase } from "./supabase";

import {
  installPWA,
  getInstallPrompt,
  checkPWAInstalled,
} from "./pwaInstall";


function Login({
  onCreateAccount,
  onLoginSuccess,
  onForgotPassword,
}) {

  const [showPassword, setShowPassword] =
    useState(false);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [rememberMe, setRememberMe] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [isInstalled, setIsInstalled] =
    useState(false);

  const [installing, setInstalling] =
    useState(false);


  // =========================================================
  // CHECK INSTALLATION
  // =========================================================

  useEffect(() => {

    const detectInstallation =
      async () => {

        const installed =
          await checkPWAInstalled();

        console.log(
          "UGO installed on Login:",
          installed
        );

        setIsInstalled(
          installed
        );
      };


    detectInstallation();


    // =======================================================
    // APP INSTALLED EVENT
    // =======================================================

    const handleAppInstalled =
      () => {

        console.log(
          "🎉 UGO PWA installed from Login."
        );

        setIsInstalled(true);
        setInstalling(false);
      };


    window.addEventListener(
      "ugo-app-installed",
      handleAppInstalled
    );


    return () => {

      window.removeEventListener(
        "ugo-app-installed",
        handleAppInstalled
      );

    };

  }, []);


  // =========================================================
  // INSTALL PWA
  // =========================================================

  const handleInstall =
    async () => {

      if (installing) {
        return;
      }

      setInstalling(true);


      try {

        const prompt =
          getInstallPrompt();


        console.log(
          "Install event available:",
          !!prompt
        );


        if (!prompt) {

          console.log(
            "No install prompt currently available."
          );


          const installed =
            await checkPWAInstalled();


          if (installed) {

            setIsInstalled(true);

          }


          return;
        }


        const result =
          await installPWA();


        console.log(
          "Install result:",
          result
        );


        if (
          result?.installed === true ||
          result?.outcome ===
            "accepted"
        ) {

          setIsInstalled(true);
        }


      } catch (error) {

        console.error(
          "Login PWA install error:",
          error
        );

      } finally {

        setInstalling(false);

      }
    };


  // =========================================================
  // HANDLE LOGIN
  // =========================================================

  const handleSubmit =
    async (e) => {

      e.preventDefault();


      const cleanEmail =
        email
          .trim()
          .toLowerCase();


      // =======================================================
      // BASIC VALIDATION
      // =======================================================

      if (
        !cleanEmail ||
        !password
      ) {

        alert(
          "Please enter your email and password."
        );

        return;
      }


      // =======================================================
      // NITK EMAIL VALIDATION
      // =======================================================

      if (
        !cleanEmail.endsWith(
          "@nitk.edu.in"
        )
      ) {

        alert(
          "Please use an email address ending with @nitk.edu.in"
        );

        return;
      }


      setLoading(true);


      try {

        // =====================================================
        // SUPABASE LOGIN
        // =====================================================

        const {
          data,
          error,
        } =
          await supabase.auth.signInWithPassword({
            email:
              cleanEmail,

            password:
              password,
          });


        console.log(
          "Supabase Login Response:",
          data
        );


        // =====================================================
        // HANDLE SUPABASE ERROR
        // =====================================================

        if (error) {

          console.error(
            "Supabase login error:",
            error
          );


          if (
            error.message ===
            "Invalid login credentials"
          ) {

            alert(
              "Invalid email or password."
            );

          } else {

            alert(
              error.message
            );

          }

          return;
        }


        // =====================================================
        // CHECK USER
        // =====================================================

        if (!data.user) {

          alert(
            "Login failed. Please try again."
          );

          return;
        }


        console.log(
          "Logged in user:",
          data.user
        );

        console.log(
          data.user.id
        );


        // =====================================================
        // CHECK USER ROLE
        // =====================================================

        const {
          data: profile,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select("role")
            .eq(
              "id",
              data.user.id
            )
            .single();


        console.log(
          data.user.id
        );


        if (profileError) {

          console.error(
            "Profile fetch error:",
            profileError
          );

          alert(
            "Unable to determine user role."
          );

          return;
        }


        console.log(
          "User profile:",
          profile
        );


        // =====================================================
        // REDIRECT BASED ON ROLE
        // =====================================================

        alert(
          "Login successful!"
        );


        if (
          profile.role ===
          "admin"
        ) {

          onLoginSuccess(
            "admin"
          );

        } else {

          onLoginSuccess(
            "student"
          );

        }


      } catch (error) {

        console.error(
          "Unexpected login error:",
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

    <div className="login-page">


      {/* =================================
          BACKGROUND
      ================================= */}

      <div className="background-glow"></div>


      {/* =================================
          TOP BRAND
      ================================= */}

      <header className="login-header">

        <div className="brand">

          <span className="brand-white">
            NITK
          </span>

          <span className="brand-green">
            {" "}CYCLE SHARING
          </span>

        </div>

      </header>


      {/* =================================
          LOGIN SECTION
      ================================= */}

      <main className="login-container">


        {/* LOGIN CARD */}

        <div className="login-card">


          {/* =================================
              LOGO
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

          <h1>
            Welcome Back
          </h1>


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
                  setEmail(
                    e.target.value
                  )
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
                    setPassword(
                      e.target.value
                    )
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
                onClick={
                  onForgotPassword
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
              disabled={loading}
            >

              <span>

                {loading
                  ? "Logging in..."
                  : "Login"}

              </span>


              {!loading && (

                <span className="arrow">
                  →
                </span>

              )}

            </button>


            {/* =================================
                INSTALL BUTTON
            ================================= */}

            {!isInstalled && (

              <div className="install-app-section">

                <button
                  type="button"
                  className="install-app-button"
                  onClick={
                    handleInstall
                  }
                  disabled={
                    installing
                  }
                >

                  📲{" "}

                  {installing
                    ? "Installing..."
                    : "Install UGO App"}

                </button>

              </div>

            )}

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
              onClick={
                onCreateAccount
              }
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