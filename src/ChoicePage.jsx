import React from "react";
// import "./ChoicePage.css";

function ChoicePage({ onRentalChoice, onProfileChoice, onCycleOwner, onActiveRentals, isAdmin, onBackToAdmin }) {
  return (
    <div className="choice-page">

      {isAdmin && (
        <button
          className="back-admin-button"
          onClick={onBackToAdmin}
        >
          ← Back to Admin
        </button>
      )}

      {/* ---------------- PROFILE ---------------- */}
      <div className="choice-profile">
        <div className="profile-image-container">
          {/* <button ></button> */}
          <img
            src="/profile.png"
            alt="Profile"
            className="profile-image"
            onClick={onProfileChoice}
          />
        </div>
      </div>

      {/* ---------------- HEADING ---------------- */}
      <div className="choice-header">
        <h1>Welcome to NITK Cycle Sharing</h1>
        <p>What would you like to do?</p>
      </div>

      {/* ---------------- OPTIONS ---------------- */}
      <div className="choice-container">

        {/* RENT A CYCLE */}
        <div className="choice-card">
          <div className="choice-icon">
            🚲
          </div>

          <h2>Rent a Cycle</h2>

          <p>
            Find an available cycle and rent it for your journey.
          </p>

          <button className="choice-button"
            onClick={onRentalChoice}>
            Rent a Cycle
          </button>
        </div>


        {/* MY CYCLES */}
        <div className="choice-card">
          <div className="choice-icon">
            🚴
          </div>

          <h2>My Cycles</h2>

          <p>
            View and manage the cycles you have listed.
          </p>

          <button className="choice-button"
            onClick={(onCycleOwner)}
          >
            My Cycles
          </button>
        </div>


        {/* ONGOING RENTS */}
        <div className="choice-card">
          <div className="choice-icon">
            📋
          </div>

          <h2>Ongoing Rents</h2>

          <p>
            Check your currently rented cycles and rental status.
          </p>

          <button className="choice-button"
            onClick={(onActiveRentals)}
          >
            Ongoing Rents
          </button>
        </div>

      </div>

    </div>
  );
}

export default ChoicePage;