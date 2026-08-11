import React, { useEffect, useState } from "react";
import "./Landing.css";

import logoImage from "./assets/UGO_logo.jpeg";

function Landing({ onFinish }) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setStarted(true);
    }, 300);

    const finishTimer = setTimeout(() => {
      setFinished(true);

      setTimeout(() => {
        if (onFinish) {
          onFinish();
        }
      }, 1000);
    }, 7000);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  const handleGetStarted = () => {
    setFinished(true);

    setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 1000);
  };

  return (
    <div
      className={`landing ${
        started ? "animation-started" : ""
      } ${finished ? "landing-finished" : ""}`}
    >

      {/* Background */}
      <div className="background-glow"></div>
      <div className="road"></div>

      {/* Top Logo / Brand */}
      <div className="top-bar">
        <div className="brand">
          NITK <span>CYCLE SHARING</span>
        </div>
      </div>

      {/* Main Logo */}
      <div className="logo-container">
        <div className="logo-glow"></div>

        <img
          src={logoImage}
          alt="NITK Cycle Sharing"
          className="main-logo"
        />
      </div>

      {/* Welcome Text */}
      <div className="welcome">

        <h1>Your Ride.</h1>

        <h1>Our Campus.</h1>

        <h1 className="green-text">
          One Community.
        </h1>

        <p>
          Share. Ride. Explore.
        </p>

      </div>

      {/* Get Started */}
      <button
        className="start-button"
        onClick={handleGetStarted}
      >
        Get Started
        <span>→</span>
      </button>

      {/* Footer text only */}
      <div className="bottom-section">
        <p>
          Welcome to NITK Cycle Sharing
        </p>
      </div>

    </div>
  );
}

export default Landing;