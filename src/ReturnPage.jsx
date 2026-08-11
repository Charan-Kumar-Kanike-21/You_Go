
import React, { useState } from "react";
import "./ReturnPage.css";

function ReturnPage() {
  const [returning, setReturning] = useState(false);
  const [returned, setReturned] = useState(false);

  const handleReturn = () => {
    setReturning(true);

    /*
     * TEMPORARY FRONTEND BEHAVIOUR
     *
     * Later this button will call the backend/Supabase
     * logic that actually completes the rental.
     */

    setTimeout(() => {
      setReturning(false);
      setReturned(true);
    }, 1200);
  };

  const handleReport = () => {
    /*
     * Your teammates will connect this button
     * to the existing Report Page.
     */
    console.log("Open Report Page");
  };

  if (returned) {
    return (
      <div className="return-page">

        <main className="return-success-card">

          <div className="return-success-icon">
            ✓
          </div>

          <span className="return-eyebrow">
            RETURN SUCCESSFUL
          </span>

          <h1>
            Cycle Returned
          </h1>

          <p>
            Your rental has been successfully completed.
            Thank you for using NITK Cycle Sharing.
          </p>

          <div className="return-status">
            <span className="return-status-dot"></span>
            Rental Completed
          </div>

        </main>

      </div>
    );
  }

  return (
    <div className="return-page">

      <main className="return-container">

        {/* Header Icon */}
        <div className="return-icon">
          🚲
        </div>

        <span className="return-eyebrow">
          ACTIVE RENTAL
        </span>

        <h1>
          Return Cycle
        </h1>

        <p className="return-description">
          Return the cycle to the owner and confirm
          the completion of your rental.
        </p>


        {/* Rental Information */}
        <section className="rental-info">

          <div className="rental-info-row">
            <span>Cycle</span>
            <strong>
              Campus Cycle #104
            </strong>
          </div>

          <div className="rental-info-row">
            <span>Owner</span>
            <strong>
              Owner Name
            </strong>
          </div>

          <div className="rental-info-row">
            <span>Rental Started</span>
            <strong>
              10:30 AM
            </strong>
          </div>

          <div className="rental-info-row">
            <span>Duration</span>
            <strong>
              2h 15m
            </strong>
          </div>

        </section>


        {/* Return Instructions */}
        <div className="return-instructions">

          <div className="instruction-icon">
            ℹ
          </div>

          <div>
            <h3>
              Before returning
            </h3>

            <p>
              Make sure the cycle is safely handed
              back to the owner before confirming
              the return.
            </p>
          </div>

        </div>


        {/* Return Button */}
        <button
          className="return-button"
          onClick={handleReturn}
          disabled={returning}
        >
          {returning
            ? "Confirming Return..."
            : "Confirm Return"}
        </button>


        {/* Report Section */}
        <div className="report-section">

          <div className="report-divider">
            <span>Having an issue?</span>
          </div>

          <p>
            Report any damage, problem, or issue
            related to this rental.
          </p>

          <button
            className="report-button"
            onClick={handleReport}
          >
            ⚠ Report an Issue
          </button>

        </div>


        <p className="return-security-note">
          🔒 Your rental will be marked complete only
          after the return is confirmed.
        </p>

      </main>

    </div>
  );
}

export default ReturnPage;