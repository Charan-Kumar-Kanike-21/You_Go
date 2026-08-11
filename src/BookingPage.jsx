import React, { useState } from "react";
import "./BookingPage.css";
import { supabase } from "./supabase";

function BookingPage({ cycle, onBack }) {
  const [hours, setHours] = useState("");
  const [days, setDays] = useState("");
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [currentImage, setCurrentImage] = useState(0);

  if (!cycle) {
    return (
      <div className="booking-page">
        <div className="booking-error">
          <h2>Cycle not found</h2>
          <p>Please go back and select a cycle again.</p>

          <button onClick={onBack}>
            ← Back to Cycles
          </button>
        </div>
      </div>
    );
  }

  const handleBooking = async () => {
    setMessage("");
    setMessageType("");

    const numericHours = Number(hours);
    const numericDays = Number(days);

    if (
      hours === "" ||
      days === "" ||
      numericHours < 0 ||
      numericDays < 0
    ) {
      setMessage("Please enter a valid rental duration.");
      setMessageType("error");
      return;
    }

    if (numericHours === 0 && numericDays === 0) {
      setMessage("Rental duration cannot be zero.");
      setMessageType("error");
      return;
    }

    try {
      setBooking(true);

      // Get currently logged-in student
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setMessage("Please login before booking a cycle.");
        setMessageType("error");
        return;
      }

      // Exact payload expected by your n8n booking webhook
      const bookingData = {
        cycle_id: cycle.id,
        student_id: user.id,
        hours: String(numericHours),
        days: String(numericDays),
      };

      const response = await fetch(
        "https://stem61.app.n8n.cloud/webhook/booking",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookingData),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Booking request failed with status ${response.status}`
        );
      }

      setMessage(
        "Booking request sent successfully to the cycle owner."
      );
      setMessageType("success");

    } catch (error) {
      console.error("Booking error:", error);

      setMessage(
        "Unable to send booking request. Please try again."
      );
      setMessageType("error");

    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="booking-page">

      {/* NAVBAR */}
      <nav className="booking-navbar">

        <div className="booking-logo">
          <div className="booking-logo-icon">
            🚲
          </div>

          <div>
            <h2>NITK Cycle</h2>
            <span>SHARING</span>
          </div>
        </div>

        <button
          className="booking-back-btn"
          onClick={onBack}
        >
          ← Back
        </button>

      </nav>


      {/* MAIN CONTENT */}
      <main className="booking-main">

        <div className="booking-header">
          <p>NITK CYCLE SHARING</p>
          <h1>Cycle Details</h1>
          <span>
            Review the cycle details before sending your booking request.
          </span>
        </div>


        {/* BOOKING CARD */}
        <section className="booking-card">

          {/* LEFT - IMAGE */}
          <div className="booking-image-section ">

        <div className="booking-main-image">

        {cycle.images && cycle.images.length > 0 ? (

        <>

        <img
            src={cycle.images[currentImage]}
            alt={`${cycle.brand} ${currentImage + 1}`}
        />

        {/* LEFT ARROW */}
        {cycle.images.length > 1 && (
            <button
            className="image-arrow image-arrow-left"
            onClick={() =>
                setCurrentImage(
                currentImage === 0
                    ? cycle.images.length - 1
                    : currentImage - 1
                )
            }
            >
            ←
            </button>
        )}

        {/* RIGHT ARROW */}
        {cycle.images.length > 1 && (
            <button
            className="image-arrow image-arrow-right"
            onClick={() =>
                setCurrentImage(
                currentImage === cycle.images.length - 1
                    ? 0
                    : currentImage + 1
                )
            }
            >
            →
            </button>
        )}

        {/* IMAGE COUNTER */}
        {cycle.images.length > 1 && (
            <div className="image-counter">
                {currentImage + 1} / {cycle.images.length}
            </div>
        )}

        </>

        ) : cycle.image ? (

        <img
        src={cycle.image}
        alt={cycle.brand || "Cycle"}
        />

        ) : (

        <div className="booking-image-placeholder">
            🚲
        </div>

        )}

        <span className="booking-available">
        Available
        </span>

    </div>

          </div>


          {/* RIGHT - DETAILS */}
          <div className="booking-details">

            <div className="booking-title-row">

              <div>
                <p className="booking-small-label">
                  CYCLE
                </p>

                <h2>
                  {cycle.brand || "Cycle"}
                </h2>
              </div>

              {cycle.rating && (
                <div className="booking-rating">
                  ★ {cycle.rating}
                </div>
              )}

            </div>


            {/* LOCATION */}
            <div className="booking-detail-item">

              <span className="detail-icon">
                📍
              </span>

              <div>
                <label>Pickup Location</label>
                <strong>
                  {cycle.location || "Location not available"}
                </strong>
              </div>

            </div>


            {/* BRAND / MODEL */}
            <div className="booking-detail-grid">

              <div className="booking-detail-box">
                <span>Brand</span>
                <strong>
                  {cycle.brand || "Not specified"}
                </strong>
              </div>

              <div className="booking-detail-box">
                <span>Model</span>
                <strong>
                  {cycle.model || "Not specified"}
                </strong>
              </div>

            </div>


            {/* TYPE / CONDITION */}
            <div className="booking-detail-grid">

              <div className="booking-detail-box">
                <span>Cycle Type</span>
                <strong>
                  {cycle.cycle_type || "Not specified"}
                </strong>
              </div>

              <div className="booking-detail-box">
                <span>Condition</span>
                <strong>
                  {cycle.condition || "Not specified"}
                </strong>
              </div>

            </div>


            {/* DESCRIPTION */}
            <div className="booking-description">

              <span>Description</span>

              <p>
                {cycle.description ||
                  "No additional description provided by the owner."}
              </p>

            </div>


            {/* PRICING */}
            <div className="booking-pricing">

              <div>
                <span>Per Hour</span>
                <strong>
                  ₹{cycle.price_per_hour ?? "--"}
                </strong>
              </div>

              <div>
                <span>Per Day</span>
                <strong>
                  ₹{cycle.price_per_day ?? "--"}
                </strong>
              </div>

            </div>

          </div>

        </section>


        {/* RENTAL DURATION */}
        <section className="rental-duration-card">

          <div className="duration-heading">
            <div>
              <p>RENTAL DURATION</p>
              <h2>How long do you need the cycle?</h2>
            </div>

            <span>
              Start time is automatically recorded.
            </span>
          </div>


          <div className="duration-inputs">

            <div className="duration-input-group">

              <label>
                Hours
              </label>

              <input
                type="number"
                min="0"
                value={hours}
                onChange={(event) =>
                  setHours(event.target.value)
                }
                placeholder="0"
              />

              <span>
                Enter number of hours
              </span>

            </div>


            <div className="duration-input-group">

              <label>
                Days
              </label>

              <input
                type="number"
                min="0"
                value={days}
                onChange={(event) =>
                  setDays(event.target.value)
                }
                placeholder="0"
              />

              <span>
                Enter number of days
              </span>

            </div>

          </div>

        </section>


        {/* MESSAGE */}
        {message && (
          <div
            className={
              messageType === "success"
                ? "booking-message success"
                : "booking-message error"
            }
          >
            {message}
          </div>
        )}


        {/* BOOK BUTTON */}
        <div className="booking-action">

          <button
            className="book-cycle-btn"
            onClick={handleBooking}
            disabled={booking}
          >
            {booking
              ? "Sending Request..."
              : "Book Cycle 🚲"}
          </button>

        </div>

      </main>

    </div>
  );
}

export default BookingPage;