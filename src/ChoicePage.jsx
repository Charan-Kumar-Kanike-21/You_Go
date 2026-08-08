
import React from "react";
import "./ChoicePage.css";

function ChoicePage() {
  return (
    <div className="choice-page">

      {/* Header */}
      <header className="choice-header">
        <div className="choice-logo">
          <div className="choice-logo-circle">C</div>
          <span>Cycle</span>
        </div>
      </header>


      {/* Main Content */}
      <main className="choice-container">

        {/* Profile Section */}
        <section className="profile-section">

          <div className="profile-picture">
            <span>👤</span>
          </div>

          <h1>Welcome Back!</h1>

          <p>What would you like to do?</p>

        </section>


        {/* Choices */}
        <section className="choice-grid">

          {/* Rent a Cycle */}
          <button className="choice-card">

            <div className="choice-icon">
              🚲
            </div>

            <div className="choice-text">
              <h2>Rent a Cycle</h2>
              <p>
                Find and rent a cycle from the campus community.
              </p>
            </div>

            <span className="arrow">→</span>

          </button>


          {/* My Cycles */}
          <button className="choice-card">

            <div className="choice-icon">
              🔑
            </div>

            <div className="choice-text">
              <h2>My Cycles</h2>
              <p>
                Manage the cycles you have listed for rent.
              </p>
            </div>

            <span className="arrow">→</span>

          </button>


          {/* Active Rentals */}
          <button className="choice-card">

            <div className="choice-icon">
              🛞
            </div>

            <div className="choice-text">
              <h2>Active Rentals</h2>
              <p>
                View the cycles you are currently renting.
              </p>
            </div>

            <span className="arrow">→</span>

          </button>


          {/* Profile */}
          <button className="choice-card">

            <div className="choice-icon">
              👤
            </div>

            <div className="choice-text">
              <h2>Profile</h2>
              <p>
                View and manage your account settings.
              </p>
            </div>

            <span className="arrow">→</span>

          </button>

        </section>

      </main>

    </div>
  );
}

export default ChoicePage;

