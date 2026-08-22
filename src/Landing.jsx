import React, { useEffect, useState } from "react";
import "./Landing.css";

import logoImage from "./assets/UGO_logo.jpeg";
import {
  installPWA,
  getInstallPrompt,
} from "./pwaInstall";

const INSTALL_STORAGE_KEY = "ugo_app_installed";

function Landing({ onFinish }) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  // =========================================================
  // CHECK WHETHER APP IS INSTALLED
  // =========================================================

  const checkInstalled = () => {
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches;

    const iosStandalone =
      window.navigator.standalone === true;

    const savedInstallState =
      localStorage.getItem(INSTALL_STORAGE_KEY) === "true";

    return (
      standaloneMode ||
      iosStandalone ||
      savedInstallState
    );
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setStarted(true);
    }, 300);

    setIsInstalled(checkInstalled());

    // PWA successfully installed
    const handleAppInstalled = () => {
      console.log("UGO PWA installed successfully");

      localStorage.setItem(
        INSTALL_STORAGE_KEY,
        "true"
      );

      setIsInstalled(true);
      setInstalling(false);
    };

    window.addEventListener(
      "appinstalled",
      handleAppInstalled
    );

    return () => {
      clearTimeout(startTimer);

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled
      );
    };
  }, []);

  // =========================================================
  // GO TO NEXT PAGE
  // =========================================================

  const handleContinue = () => {
    setFinished(true);

    setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 700);
  };

  // =========================================================
  // INSTALL PWA
  // =========================================================

  const handleInstall = async () => {
    if (installing) return;

    setInstalling(true);

    try {
      const prompt = getInstallPrompt();

      console.log(
        "Install event available:",
        !!prompt
      );

      if (!prompt) {
        alert(
          "The install option is not available right now. Please refresh the page and try again."
        );

        setInstalling(false);
        return;
      }

      const result = await installPWA();

      console.log(
        "Install result:",
        result
      );

      /*
        If the installation was accepted,
        store the installed state.
      */
      if (
        result?.outcome === "accepted" ||
        result === "accepted"
      ) {
        localStorage.setItem(
          INSTALL_STORAGE_KEY,
          "true"
        );

        setIsInstalled(true);
      }

      setInstalling(false);

    } catch (error) {
      console.error(
        "PWA installation error:",
        error
      );

      setInstalling(false);
    }
  };

  return (
    <div
      className={`landing ${
        started
          ? "animation-started"
          : ""
      } ${
        finished
          ? "landing-finished"
          : ""
      }`}
    >

      {/* BACKGROUND */}

      <div className="background-glow"></div>

      <div className="road"></div>


      {/* TOP BRAND */}

      <div className="top-bar">
        <div className="brand">
          NITK{" "}
          <span>
            CYCLE SHARING
          </span>
        </div>
      </div>


      {/* MAIN CONTENT */}

      <div className="landing-content">

        {/* LOGO */}

        <div className="logo-container">

          <div className="logo-glow"></div>

          <img
            src={logoImage}
            alt="NITK Cycle Sharing"
            className="main-logo"
          />

        </div>


        {/* WELCOME TEXT */}

        <div className="welcome">

          <h1>
            Your Ride.
          </h1>

          <h1>
            Our Campus.
          </h1>

          <h1 className="green-text">
            One Community.
          </h1>

          <p>
            Share. Ride. Explore.
          </p>

        </div>


        {/* ACTION BUTTONS */}

        <div className="landing-actions">

          {!isInstalled ? (
            <>
              <button
                type="button"
                className="install-button"
                onClick={handleInstall}
                disabled={installing}
              >
                <span className="button-icon">
                  📲
                </span>

                {installing
                  ? "Installing..."
                  : "Install UGO App"}
              </button>


              <button
                type="button"
                className="browser-button"
                onClick={handleContinue}
              >
                Continue in Browser

                <span>
                  →
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="start-button"
              onClick={handleContinue}
            >
              Get Started

              <span>
                →
              </span>
            </button>
          )}

        </div>

      </div>


      {/* FOOTER */}

      <div className="bottom-section">
        <p>
          Welcome to NITK Cycle Sharing
        </p>
      </div>

    </div>
  );
}

export default Landing;