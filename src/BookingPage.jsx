import React, { useState, useEffect } from "react";
import "./BookingPage.css";
import { supabase } from "./supabase";
import OwnerDetails from "./OwnerDetails";

function BookingPage({ cycle, onBack, onOwnerDetails}) {
  const [hours, setHours] = useState("");
  const [days, setDays] = useState("");
  const numericHours = Number(hours) || 0;
  const numericDays = Number(days) || 0;

  const pricePerHour = Number(cycle?.price_per_hour) || 0;
  const pricePerDay = Number(cycle?.price_per_day) || 0;

  const hourlyAmount = numericHours * pricePerHour;
  const dailyAmount = numericDays * pricePerDay;

  const totalPrice = hourlyAmount + dailyAmount;
  const [owner, setOwner] = useState(null);
  const [ownerLoading, setOwnerLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const handleHoursChange = (e) => {
    let value = Number(e.target.value);

    if (Number.isNaN(value)) {
      setHours("");
      return;
    }

    // Prevent negative hours
    value = Math.max(0, value);

    // Convert hours into days automatically
    if (value >= 24) {
      const additionalDays = Math.floor(value / 24);
      const remainingHours = value % 24;

      const currentDays = Number(days) || 0;
      const newDays = currentDays + additionalDays;

      // Maximum rental duration = 7 days
      if (newDays > 7) {
        setDays("7");
        setHours("0");
        return;
      }

      setDays(String(newDays));
      setHours(String(remainingHours));

      return;
    }

    setHours(String(value));
  };


  const handleDaysChange = (e) => {
    let value = Number(e.target.value);

    if (Number.isNaN(value)) {
      setDays("");
      return;
    }

    // Prevent negative days
    value = Math.max(0, value);

    // Maximum = 7 days
    if (value > 7) {
      value = 7;
    }

    setDays(String(value));
  };

  useEffect(() => {
  const fetchOwnerDetails = async () => {
    if (!cycle?.owner_id) {
      setOwnerLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          full_name,
          phone,
          avatar_url,
          hostel
        `)
        .eq("id", cycle.owner_id)
        .single();

      if (error) {
        console.error("Error fetching owner:", error);
        setOwner(null);
      } else {
        setOwner(data);
      }
    } catch (error) {
      console.error("Owner fetch error:", error);
      setOwner(null);
    } finally {
      setOwnerLoading(false);
    }
  };

  fetchOwnerDetails();
  }, [cycle]);
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

    if (
      hours === "" ||
      days === ""
    ) {
      setMessage(
        "Please enter the rental duration."
      );

      setMessageType("error");
      return;
    }

    const bookingHours = Number(hours);
    const bookingDays = Number(days);

    if (
      Number.isNaN(bookingHours) ||
      Number.isNaN(bookingDays) ||
      bookingHours < 0 ||
      bookingDays < 0
    ) {
      setMessage(
        "Please enter a valid rental duration."
      );

      setMessageType("error");
      return;
    }

    /*
    * Hours must always be 0–23.
    */
    if (bookingHours > 23) {
      setMessage(
        "Hours must be between 0 and 23."
      );

      setMessageType("error");
      return;
    }

    /*
    * Days must always be 0–7.
    */
    if (bookingDays > 7) {
      setMessage(
        "Maximum rental duration is 7 days."
      );

      setMessageType("error");
      return;
    }

    /*
    * Calculate total rental duration.
    */
    const totalRentalHours =
      bookingDays * 24 + bookingHours;

    /*
    * Cannot exceed 7 days.
    */
    if (totalRentalHours > 168) {
      setMessage(
        "Maximum rental duration is 7 days."
      );

      setMessageType("error");
      return;
    }

    /*
    * Cannot be zero.
    */
    if (totalRentalHours === 0) {
      setMessage(
        "Rental duration cannot be zero."
      );

      setMessageType("error");
      return;
    }

    try {

      setBooking(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setMessage(
          "Please login before booking a cycle."
        );

        setMessageType("error");
        return;
      }

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
        "https://stem61.app.n8n.cloud/webhook/booking",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(
            bookingData
          ),
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

      console.error(
        "Booking error:",
        error
      );

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

              <div className="booking-top-actions">

                {cycle.rating && (
                  <div className="booking-rating">
                    ★ {cycle.rating}
                  </div>
                )}

                <button
                  className="owner-details-btn"
                  onClick={onOwnerDetails}
                >
                  👤 Owner Details
                </button>

              </div>

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
                max = "23"
                value={hours}
                onChange={handleHoursChange}
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
                max = "7"
                value={days}
                onChange={handleDaysChange}
                placeholder="0"
              />

              <span>
                Enter number of days
              </span>

            </div>

          </div>

          {/* PRICE CALCULATION */}

          <section className="booking-total-card">

            <div className="total-price-header">
              <div>
                <p>RENTAL COST</p>
                <h2>Total Price</h2>
              </div>

              <div className="total-price-value">
                ₹{totalPrice.toFixed(2)}
              </div>
            </div>


            <div className="price-breakdown">

              <div className="price-breakdown-row">

                <span>
                  {numericDays} day
                  {numericDays !== 1 ? "s" : ""}
                  {" × "}
                  ₹{pricePerDay.toFixed(2)}
                </span>

                <strong>
                  ₹{dailyAmount.toFixed(2)}
                </strong>

              </div>


              <div className="price-breakdown-row">

                <span>
                  {numericHours} hour
                  {numericHours !== 1 ? "s" : ""}
                  {" × "}
                  ₹{pricePerHour.toFixed(2)}
                </span>

                <strong>
                  ₹{hourlyAmount.toFixed(2)}
                </strong>

              </div>


              <div className="price-divider"></div>


              <div className="price-breakdown-total">

                <span>Total</span>

                <strong>
                  ₹{totalPrice.toFixed(2)}
                </strong>

              </div>

            </div>

          </section>

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
          disabled={
            booking ||
            (numericHours === 0 && numericDays === 0)
          }
        >
          {booking
            ? "Sending Request..."
            : `Confirm Booking · ₹${totalPrice.toFixed(2)}`}
        </button>

        </div>

      </main>

    </div>
  );
}

export default BookingPage;