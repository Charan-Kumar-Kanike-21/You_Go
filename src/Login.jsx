// import React, { useState } from "react";
// import "./Login.css";
// import logoImage from "./assets/app_logo.png";
// import "./SignUp.css";
// import { supabase } from './supabase';

// function Login({onCreateAccount}) {
//   const [showPassword, setShowPassword] = useState(false);
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [rememberMe, setRememberMe] = useState(false);
//   const testSupabase = async () => {
//   const { data, error } = await supabase
//     .from('cycles')
//     .select('*');

//   console.log('Data:', data);
//   console.log('Error:', error);
// };  

//   const handleSubmit = (e) => {
//     e.preventDefault();

//     if (!email || !password) {
//       alert("Please enter your email and password.");
//       return;
//     }

//     console.log("Login Details:", {
//       email,
//       password,
//       rememberMe,
//     });

//     alert("Login successful!");
//   };

//   return (
//     <div className="login-page">

//       {/* Background glow */}
//       <div className="background-glow"></div>

//       {/* =================================
//           TOP BRAND
//       ================================= */}
//       <header className="login-header">
//         <div className="brand">
//           <span className="brand-white">NITK</span>
//           <span className="brand-green"> CYCLE SHARING</span>
//         </div>
//       </header>


//       {/* =================================
//           LOGIN SECTION
//       ================================= */}
//       <main className="login-container">

//         {/* LOGIN CARD / TABLE */}
//         <div className="login-card">

//           {/* =================================
//               LOGO AT TOP OF LOGIN CARD
//           ================================= */}
//           <div className="login-logo">
//             <img
//               src={logoImage}
//               alt="NITK Cycle Sharing Logo"
//             />
//           </div>


//           {/* =================================
//               HEADING
//           ================================= */}
//           <h1>Welcome Back</h1>

//           <p className="login-subtitle">
//             Login to NITK Cycle Sharing
//           </p>


//           {/* =================================
//               LOGIN FORM
//           ================================= */}
//           <form
//             onSubmit={handleSubmit}
//             className="login-form"
//           >

//             {/* EMAIL */}
//             <div className="input-group">

//               <label htmlFor="email">
//                 NITK Email
//               </label>

//               <input
//                 id="email"
//                 type="email"
//                 value={email}
//                 onChange={(e) =>
//                   setEmail(e.target.value)
//                 }
//                 placeholder="yourname@nitk.edu.in"
//                 required
//               />

//             </div>


//             {/* PASSWORD */}
//             <div className="input-group">

//               <label htmlFor="password">
//                 Password
//               </label>

//               <div className="password-wrapper">

//                 <input
//                   id="password"
//                   type={
//                     showPassword
//                       ? "text"
//                       : "password"
//                   }
//                   value={password}
//                   onChange={(e) =>
//                     setPassword(e.target.value)
//                   }
//                   placeholder="Enter your password"
//                   required
//                 />

//                 <button
//                   type="button"
//                   className="show-password"
//                   onClick={() =>
//                     setShowPassword(
//                       !showPassword
//                     )
//                   }
//                 >
//                   {showPassword
//                     ? "Hide"
//                     : "Show"}
//                 </button>

//               </div>

//             </div>


//             {/* =================================
//                 REMEMBER + FORGOT
//             ================================= */}
//             <div className="login-options">

//               <label className="remember-me">

//                 <input
//                   type="checkbox"
//                   checked={rememberMe}
//                   onChange={(e) =>
//                     setRememberMe(
//                       e.target.checked
//                     )
//                   }
//                 />

//                 <span>
//                   Remember me
//                 </span>

//               </label>


//               <button
//                 type="button"
//                 className="forgot-password"
//                 onClick={() =>
//                   alert(
//                     "Password reset feature coming soon."
//                   )
//                 }
//               >
//                 Forgot password?
//               </button>

//             </div>


//             {/* =================================
//                 LOGIN BUTTON
//             ================================= */}
//             <button
//               type="submit"
//               className="login-button"
//             >
//               <span>Login</span>

//               <span className="arrow">
//                 →
//               </span>
//             </button>

//           </form>


//           {/* =================================
//               SIGN UP
//           ================================= */}
//           <div className="signup-section">

//             <span>
//               Don't have an account?
//             </span>

//             <button
//               type="button"
//               onClick={onCreateAccount}
//               className="create-account-link"
//             >
//               Create an account
//             </button>

//           </div>

//         </div>

//       </main>


//       {/* =================================
//           FOOTER
//       ================================= */}
//       <footer className="login-footer">

//         <p>
//           Welcome to NITK Cycle Sharing
//         </p>

//       </footer>

//     </div>
//   );
// }

// export default Login;







import React, { useState } from "react";
import "./Login.css";
import logoImage from "./assets/UGO_logo.jpeg";
import "./SignUp.css";
import { supabase } from "./supabase";

function Login({ onCreateAccount, onLoginSuccess, onForgotPassword })  {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // HANDLE LOGIN
  // -----------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------

    if (!cleanEmail || !password) {
      alert("Please enter your email and password.");
      return;
    }

    // -----------------------------
    // NITK EMAIL VALIDATION
    // -----------------------------

    if (!cleanEmail.endsWith("@nitk.edu.in")) {
      alert("Please use an email address ending with @nitk.edu.in");
      return;
    }

    // -----------------------------
    // START LOADING
    // -----------------------------

    setLoading(true);

    try {
      // -----------------------------
      // SUPABASE LOGIN
      // -----------------------------

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

      console.log("Supabase Login Response:", data);

      // -----------------------------
      // HANDLE SUPABASE ERROR
      // -----------------------------

      if (error) {
        console.error("Supabase login error:", error);

        if (error.message === "Invalid login credentials") {
          alert("Invalid email or password.");
        } else {
          alert(error.message);
        }

        return;
      }

      // -----------------------------
      // CHECK USER
      // -----------------------------

      if (!data.user) {
        alert("Login failed. Please try again.");
        return;
      }

      console.log("Logged in user:", data.user);

      // -----------------------------
      // SUCCESS
      // -----------------------------


      alert("Login successful!");
      onLoginSuccess();

      /*
        You can navigate to your homepage here.

        For example, if App.jsx provides a function:

        onLoginSuccess();

        Then you can call:

        onLoginSuccess();
      */

    } catch (error) {
      console.error("Unexpected login error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
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
                    setRememberMe(e.target.checked)
                  }
                />

                <span>
                  Remember me
                </span>

              </label>


              <button
                type="button"
                className="forgot-password"
                onClick={onForgotPassword}
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
                {loading ? "Logging in..." : "Login"}
              </span>

              {!loading && (
                <span className="arrow">
                  →
                </span>
              )}
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
