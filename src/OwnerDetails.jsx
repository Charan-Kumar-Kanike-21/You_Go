import React from "react";
import "./OwnerDetails.css";

function OwnerDetails({ owner, onBack }) {
  return (
    <div className="owner-details-page">

      {/* NAVBAR */}
      <nav className="owner-details-navbar">

        <div className="owner-details-logo">
          <div className="owner-details-logo-icon">
            🚲
          </div>

          <div>
            <h2>NITK Cycle</h2>
            <span>SHARING</span>
          </div>
        </div>

        <button
          className="owner-back-btn"
          onClick={onBack}
        >
          ← Back to Booking
        </button>

      </nav>

      {/* MAIN */}
      <main className="owner-details-main">

        <div className="owner-details-header">
          <p>OWNER INFORMATION</p>
          <h1>Cycle Owner</h1>
          <span>
            Contact information of the person who owns this cycle.
          </span>
        </div>

        <section className="owner-details-card">

          {/* PROFILE PHOTO */}
          <div className="owner-photo-section">

            {owner?.avatar_url ? (
              <img
                src={owner.avatar_url}
                alt={owner.full_name || "Owner"}
                className="owner-photo"
              />
            ) : (
              <div className="owner-photo-placeholder">
                👤
              </div>
            )}

          </div>

          {/* OWNER INFORMATION */}
          <div className="owner-info-section">

            <div className="owner-info-box">
              <span>NAME</span>
              <strong>
                {owner?.full_name || "Not available"}
              </strong>
            </div>

            <div className="owner-info-box">
              <span>PHONE NUMBER</span>
              <strong>
                {owner?.phone || "Not available"}
              </strong>
            </div>

          </div>

          <div className="owner-security-note">
            🔒 Private account information such as email and password
            is protected.
          </div>

        </section>

      </main>

    </div>
  );
}

export default OwnerDetails;