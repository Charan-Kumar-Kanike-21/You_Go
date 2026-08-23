import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "./supabase";
import "./ReviewPage.css";

const ReviewPage = ({ bookingId: propBookingId, onBackHome }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const bookingId = propBookingId || searchParams.get("bookingId");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);

  const [reviewType, setReviewType] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadReviewData();
  }, [bookingId]);

  const loadReviewData = async () => {
    try {
      setLoading(true);
      setError("");

      if (!bookingId) {
        setError("Booking information is missing.");
        return;
      }

      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        setError("Please login to submit a review.");
        return;
      }

      setUser(currentUser);

      // --------------------------------------------------
      // FETCH BOOKING
      // --------------------------------------------------

      const { data: bookingData, error: bookingError } =
        await supabase
          .from("booking_table")
          .select(`
            id,
            owner_id,
            renter_id,
            cycle_id,
            status,
            start_time,
            end_time,
            total_amount,
            rental_price,
            no_of_hours,
            no_of_days
          `)
          .eq("id", bookingId)
          .single();

      if (bookingError) {
        console.error("Booking fetch error:", bookingError);
        throw new Error("Unable to load booking details.");
      }

      setBooking(bookingData);

      // --------------------------------------------------
      // CHECK USER ROLE
      // --------------------------------------------------

      let currentReviewType = null;

      if (bookingData.renter_id === currentUser.id) {
        // Renter rates the cycle
        currentReviewType = "cycle";
      } else if (bookingData.owner_id === currentUser.id) {
        // Owner rates the renter
        currentReviewType = "user";
      } else {
        throw new Error(
          "You are not authorized to review this booking."
        );
      }

      setReviewType(currentReviewType);

      // --------------------------------------------------
      // MAKE SURE RENTAL IS COMPLETED / RETURNED
      // --------------------------------------------------

      if (
        bookingData.status !== "completed" &&
        bookingData.status !== "returned"
      ) {
        setError(
          "You can submit a review only after the cycle has been returned."
        );
        return;
      }

      // --------------------------------------------------
      // CHECK EXISTING REVIEW
      // --------------------------------------------------

      const { data: existingReview, error: reviewError } =
        await supabase
          .from("reviews")
          .select("id, rating, comment")
          .eq("booking_id", bookingId)
          .eq("reviewer_id", currentUser.id)
          .eq("review_type", currentReviewType)
          .maybeSingle();

      if (reviewError) {
        console.error("Review check error:", reviewError);
        throw new Error("Unable to check existing review.");
      }

      if (existingReview) {
        setAlreadyReviewed(true);
        setRating(existingReview.rating || 0);
        setComment(existingReview.comment || "");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // RATING
  // --------------------------------------------------

  const handleRating = (value) => {
    if (alreadyReviewed || submitting) return;

    setRating(value);
  };

  // --------------------------------------------------
  // SUBMIT REVIEW
  // --------------------------------------------------

  const handleSubmit = async () => {
    try {
      setError("");
      setSuccess("");

      if (!booking || !user) {
        setError("Booking information is unavailable.");
        return;
      }

      if (!rating) {
        setError("Please select a rating.");
        return;
      }

      if (rating < 1 || rating > 5) {
        setError("Please select a rating between 1 and 5.");
        return;
      }

      if (alreadyReviewed) {
        setError("You have already reviewed this booking.");
        return;
      }

      setSubmitting(true);

      const reviewData = {
        booking_id: booking.id,
        reviewer_id: user.id,
        cycle_id: booking.cycle_id,
        rating,
        comment: comment.trim() || null,
        review_type: reviewType,
      };

      // Owner reviewing renter
      if (reviewType === "user") {
        reviewData.reviewee_id = booking.renter_id;
      }

      // Renter reviewing cycle
      if (reviewType === "cycle") {
        reviewData.reviewee_id = null;
      }

      const { error: insertError } = await supabase
        .from("reviews")
        .insert(reviewData);

      if (insertError) {
        console.error("Review insert error:", insertError);

        if (insertError.code === "23505") {
          setAlreadyReviewed(true);
          setError("You have already submitted a review for this booking.");
        } else {
          throw insertError;
        }

        return;
      }

      setSuccess("Your review has been submitted successfully.");
      setAlreadyReviewed(true);

      setTimeout(() => {
        if (typeof onBackHome === "function") {
          onBackHome();
        } else {
          navigate("/rentals");
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to submit your review. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="review-page">
        <div className="review-loading">
          <div className="review-spinner"></div>
          <p>Loading review...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="review-page">

      {/* HEADER */}
      <header className="review-header">

        <button
          className="review-back-btn"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div className="review-header-content">
          <div className="review-eyebrow">
            UGO · CYCLE SHARING
          </div>

          <h1>
            {reviewType === "cycle"
              ? "Rate Your Ride"
              : "Rate Your Renter"}
          </h1>

          <p>
            {reviewType === "cycle"
              ? "Tell us how your cycle rental experience was."
              : "Tell us how the renter maintained and returned your cycle."}
          </p>
        </div>
      </header>

      <main className="review-container">

        {/* REVIEW CARD */}
        <section className="review-card">

          <div className="review-icon">
            {reviewType === "cycle" ? "🚲" : "👤"}
          </div>

          <div className="review-card-heading">
            <h2>
              {reviewType === "cycle"
                ? "How was the cycle?"
                : "How was the renter?"}
            </h2>

            <p>
              {reviewType === "cycle"
                ? "Rate the condition and overall rental experience."
                : "Rate how responsibly the renter used and returned your cycle."}
            </p>
          </div>

          {/* STARS */}
          <div className="rating-section">

            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${
                    rating >= star ? "active" : ""
                  }`}
                  onClick={() => handleRating(star)}
                  disabled={alreadyReviewed || submitting}
                  aria-label={`Rate ${star} out of 5`}
                >
                  ★
                </button>
              ))}
            </div>

            <div className="rating-label">
              {rating === 0 && "Select a rating"}

              {rating === 1 && "Poor"}

              {rating === 2 && "Needs improvement"}

              {rating === 3 && "Good"}

              {rating === 4 && "Very good"}

              {rating === 5 && "Excellent"}
            </div>
          </div>

          {/* COMMENT */}
          <div className="comment-section">

            <label htmlFor="review-comment">
              {reviewType === "cycle"
                ? "Share your experience"
                : "How did the renter maintain the cycle?"}
            </label>

            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                reviewType === "cycle"
                  ? "Was the cycle in good condition? How was your rental experience?"
                  : "Was the cycle returned in good condition? Was the renter responsible?"
              }
              maxLength={500}
              disabled={alreadyReviewed || submitting}
            />

            <div className="comment-count">
              {comment.length}/500
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="review-message error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          {/* SUCCESS */}
          {success && (
            <div className="review-message success">
              <span>✓</span>
              <p>{success}</p>
            </div>
          )}

          {/* SUBMIT */}
          {!alreadyReviewed && (
            <button
              className="submit-review-btn"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? (
                <>
                  <span className="button-spinner"></span>
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          )}

          {alreadyReviewed && !success && (
            <div className="already-reviewed">
              <span>✓</span>
              <div>
                <strong>Review submitted</strong>
                <p>
                  You have already reviewed this rental.
                </p>
              </div>
            </div>
          )}

        </section>

        {/* BOOKING INFO */}
        {booking && (
          <section className="booking-summary">

            <div>
              <span className="summary-label">
                Rental
              </span>

              <strong>
                {booking.no_of_days > 0
                  ? `${booking.no_of_days} ${
                      booking.no_of_days === 1
                        ? "day"
                        : "days"
                    }`
                  : `${booking.no_of_hours || 0} ${
                      booking.no_of_hours === 1
                        ? "hour"
                        : "hours"
                    }`}
              </strong>
            </div>

            <div>
              <span className="summary-label">
                Amount
              </span>

              <strong>
                ₹{Number(booking.total_amount || 0).toFixed(2)}
              </strong>
            </div>

            <div>
              <span className="summary-label">
                Status
              </span>

              <strong className="returned-status">
                Returned
              </strong>
            </div>

          </section>
        )}

      </main>
    </div>
  );
};

export default ReviewPage;