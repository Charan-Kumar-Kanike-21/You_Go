
import React, { useState } from "react";

import Landing from "./Landing";
import Login from "./Login";
import SignUp from "./SignUp";

function App() {

  // -----------------------------
  // PAGE STATE
  // -----------------------------

  const [showLanding, setShowLanding] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

  // -----------------------------
  // LANDING FINISHED
  // -----------------------------

  const handleLandingFinish = () => {
    setShowLanding(false);
  };

  // -----------------------------
  // OPEN SIGNUP PAGE
  // -----------------------------

  const handleCreateAccount = () => {
    setShowSignup(true);
  };

  // -----------------------------
  // BACK TO LOGIN
  // -----------------------------

  const handleBackToLogin = () => {
    setShowSignup(false);
  };

  // -----------------------------
  // DISPLAY PAGES
  // -----------------------------

  return (
    <>
      {showLanding ? (

        // LANDING PAGE
        <Landing
          onFinish={handleLandingFinish}
        />

      ) : showSignup ? (

        // SIGNUP PAGE
        <SignUp
          onBackToLogin={handleBackToLogin}
        />

      ) : (

        // LOGIN PAGE
        <Login
          onCreateAccount={handleCreateAccount}
        />

      )}
    </>
  );
}

export default App;
