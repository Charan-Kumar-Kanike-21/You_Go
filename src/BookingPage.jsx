import React, { useState } from "react";
import "./BookingPage.css";
import { supabase } from "./supabase";

function BookingPage({ cycle, onBack, onOwnerDetails }) {
  const [hours, setHours] = useState("0");
  const [days, setDays] = useState("0");
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [currentImage, setCurrentImage] = useState(0);

  const numericHours = Number(hours) || 0;
  const numericDays = Number(days) || 0;

  const pricePerHour = Number(cycle?.price_per_hour) || 0;
  const pricePerDay = Number(cycle?.price_per_day) || 0;

  const hourlyAmount = numericHours * pricePerHour;
  const dailyAmount = numericDays * pricePerDay;
  const totalPrice = hourlyAmount + dailyAmount;

  const images =
    Array.isArray(cycle?.images) && cycle.images.length > 0
      ? cycle.images
      : cycle?.image
        ? [cycle.image]
        : [];

  const handleHoursChange = (e) => {
    let value = Number(e.target.value);

    if (Number.isNaN(value)) {
      setHours("");
      return;
    }

    value = Math.max(0, Math.floor(value));

    if (value >= 24) {
      const additionalDays = Math.floor(value / 24);
      const remainingHours = value % 24;
      const currentDays = Number(days) || 0;
      const newDays = currentDays + additionalDays;

      if (newDays > 7) {
        setDays("7");
        setHours("0");
        return;
      }

      setDays(String(newDays));
      setHours(String(remainingHours));
      return;
    }

    setHours(String(Math.min(value, 23)));
  };

  const handleDaysChange = (e) => {
    let value = Number(e.target.value);

    if (Number.isNaN(value)) {
      setDays("");
      return;
    }

    value = Math.max(0, Math.floor(value));
    setDays(String(Math.min(value, 7)));
  };

  const showMessage = (text, type = "error") => {
    setMessage(text);
    setMessageType(type);
  };

  const handleBooking = async () => {
    setMessage("");
    setMessageType("");

    // Authentication must be checked before creating/sending any booking.
    // Logged-in users may continue; logged-out users receive a clear login message.
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        showMessage("You need to login to confirm your booking.");
        return;
      }
    } catch (error) {
      console.error("Authentication check error:", error);
      showMessage("Please login before confirming your booking.");
      return;
    }

    if (hours === "" || days === "") {
      showMessage("Please enter the rental duration.");
      return;
    }

    const bookingHours = Number(hours);
    const bookingDays = Number(days);

    if (
      Number.isNaN(bookingHours) ||
      Number.isNaN(bookingDays) ||
      bookingHours < 0 ||
      bookingDays < 0 ||
      bookingHours > 23 ||
      bookingDays > 7
    ) {
      showMessage("Please enter a valid rental duration.");
      return;
    }

    const totalRentalHours = bookingDays * 24 + bookingHours;

    if (totalRentalHours > 168) {
      showMessage("Maximum rental duration is 7 days.");
      return;
    }

    if (totalRentalHours === 0) {
      showMessage("Rental duration cannot be zero.");
      return;
    }

    try {
      setBooking(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const bookingData = {
        cycle_id: cycle.id,
        student_id: user.id,
        hours: String(bookingHours),
        days: String(bookingDays),
        price_per_hour: pricePerHour,
        price_per_day: pricePerDay,
        hourly_amount: hourlyAmount,
        daily_amount: dailyAmount,
        total_price: totalPrice,
      };

      const response = await fetch(
        "https://ugo-cyclesharing.app.n8n.cloud/webhook/booking",
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

      showMessage(
        "Booking request sent successfully to the cycle owner.",
        "success"
      );
    } catch (error) {
      console.error("Booking error:", error);
      showMessage("Unable to send booking request. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  if (!cycle) {
    return (
      <div className="booking-page">
        <div className="booking-error">
          <div className="error-icon">!</div>
          <h2>Cycle not found</h2>
          <p>Please go back and select a cycle again.</p>
          <button onClick={onBack}>← Back to Cycles</button>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    if (images.length < 2) return;
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    if (images.length < 2) return;
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="booking-page">
      <nav className="booking-navbar">
        <button className="booking-brand" onClick={onBack} aria-label="Back">
          <span className="brand-mark">🚲</span>
          <span className="brand-copy">
            <strong>NITK</strong>
            <small>CYCLE SHARING</small>
          </span>
        </button>

        <div className="nav-context">
          <span>BOOKING</span>
          <i />
          <strong>{cycle.brand || "Cycle"}</strong>
        </div>

        <button className="booking-back-btn" onClick={onBack}>
          <span>←</span>
          <span>Back</span>
        </button>
      </nav>

      <main className="booking-main">
        <div className="booking-page-heading">
          <div>
            <span className="eyebrow">CYCLE BOOKING</span>
            <h1>Book your ride</h1>
            <p>Review the cycle, choose your duration, and confirm.</p>
          </div>

          <div className="secure-note">
            <span className="secure-dot" />
            Campus verified
          </div>
        </div>

        <section className="booking-layout">
          <article className="cycle-card">
            <div className="cycle-visual">
              {images.length > 0 ? (
                <img
                  src={images[currentImage]}
                  alt={`${cycle.brand || "Cycle"} ${currentImage + 1}`}
                />
              ) : (
                <div className="booking-image-placeholder">
                  <span>🚲</span>
                  <small>No cycle image</small>
                </div>
              )}

              <span className="availability-badge">
                <span />
                Available
              </span>

              {images.length > 1 && (
                <>
                  <button
                    className="image-arrow image-arrow-left"
                    onClick={previousImage}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>

                  <button
                    className="image-arrow image-arrow-right"
                    onClick={nextImage}
                    aria-label="Next image"
                  >
                    ›
                  </button>

                  <div className="image-counter">
                    {currentImage + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            <div className="cycle-info">
              <div className="cycle-title-row">
                <div>
                  <span className="section-kicker">CYCLE</span>
                  <h2>{cycle.brand || "Cycle"}</h2>
                </div>

                {cycle.rating && (
                  <div className="rating-chip">
                    <span>★</span>
                    {cycle.rating}
                  </div>
                )}
              </div>

              <div className="location-row">
                <span className="location-icon">⌖</span>
                <div>
                  <small>Pickup location</small>
                  <strong>
                    {cycle.location || "Location not available"}
                  </strong>
                </div>
              </div>

              <div className="cycle-spec-grid">
                <div>
                  <small>Brand</small>
                  <strong>{cycle.brand || "Not specified"}</strong>
                </div>
                <div>
                  <small>Model</small>
                  <strong>{cycle.model || "Not specified"}</strong>
                </div>
                <div>
                  <small>Type</small>
                  <strong>{cycle.cycle_type || "Not specified"}</strong>
                </div>
                <div>
                  <small>Condition</small>
                  <strong>{cycle.condition || "Not specified"}</strong>
                </div>
              </div>

              <div className="description-row">
                <small>Description</small>
                <p>
                  {cycle.description ||
                    "No additional description provided by the owner."}
                </p>
              </div>

              <div className="cycle-bottom-row">
                <div className="cycle-prices">
                  <div>
                    <small>Hourly</small>
                    <strong>₹{pricePerHour.toFixed(0)}</strong>
                    <span>/ hr</span>
                  </div>
                  <div>
                    <small>Daily</small>
                    <strong>₹{pricePerDay.toFixed(0)}</strong>
                    <span>/ day</span>
                  </div>
                </div>

                <button
                  className="owner-details-btn"
                  onClick={onOwnerDetails}
                  type="button"
                >
                  <span>👤</span>
                  Owner
                </button>
              </div>
            </div>
          </article>

          <aside className="booking-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">RENTAL DURATION</span>
                <h2>How long do you need it?</h2>
              </div>
              <span className="max-duration">Max 7 days</span>
            </div>

            <div className="duration-inputs">
              <label className="duration-field">
                <span>Days</span>
                <div className="number-input">
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={days}
                    onChange={handleDaysChange}
                    placeholder="0"
                    inputMode="numeric"
                  />
                  <em>days</em>
                </div>
              </label>

              <label className="duration-field">
                <span>Hours</span>
                <div className="number-input">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={hours}
                    onChange={handleHoursChange}
                    placeholder="0"
                    inputMode="numeric"
                  />
                  <em>hrs</em>
                </div>
              </label>
            </div>

            <div className="duration-note">
              <span>◷</span>
              Start time is automatically recorded when the booking is created.
            </div>

            <div className="price-card">
              <div className="price-card-top">
                <div>
                  <span>ESTIMATED RENTAL COST</span>
                  <strong>₹{totalPrice.toFixed(2)}</strong>
                </div>
                <span className="price-status">
                  {numericDays || numericHours ? "Calculated" : "Enter duration"}
                </span>
              </div>

              <div className="price-lines">
                <div>
                  <span>
                    {numericDays} day{numericDays !== 1 ? "s" : ""} × ₹
                    {pricePerDay.toFixed(2)}
                  </span>
                  <strong>₹{dailyAmount.toFixed(2)}</strong>
                </div>

                <div>
                  <span>
                    {numericHours} hour{numericHours !== 1 ? "s" : ""} × ₹
                    {pricePerHour.toFixed(2)}
                  </span>
                  <strong>₹{hourlyAmount.toFixed(2)}</strong>
                </div>
              </div>

              <div className="price-total-row">
                <span>Total</span>
                <strong>₹{totalPrice.toFixed(2)}</strong>
              </div>
            </div>

            {message && (
              <div
                className={`booking-message ${
                  messageType === "success" ? "success" : "error"
                }`}
                role="alert"
              >
                <span>{messageType === "success" ? "✓" : "!"}</span>
                {message}
              </div>
            )}

            <button
              className="book-cycle-btn"
              onClick={handleBooking}
              disabled={
                booking || (numericHours === 0 && numericDays === 0)
              }
            >
              <span>
                {booking
                  ? "Sending request..."
                  : `Confirm booking · ₹${totalPrice.toFixed(2)}`}
              </span>
              {!booking && <b>→</b>}
            </button>

            <p className="booking-footnote">
              By confirming, your request will be sent to the cycle owner.
            </p>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default BookingPage;
