import React, { useState } from "react";
import "./ReportPage.css";
import { supabase } from "./supabase";

function ReportPage({ rental, onBack, reportedUserId, reporterRole }) {
    if (!rental) {

    return (

      <div className="report-page">

        <div className="report-card">

          <h2>Rental information unavailable</h2>

          <p>

            We couldn't find the rental associated

            with this report.

          </p>

          <button

            className="report-back-btn"

            onClick={onBack}

          >

            ← Back to Ongoing Rentals

          </button>

        </div>

      </div>

    );}

  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      setError("Please describe the issue.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Please login again.");
      }

      if (!reportedUserId) {
        throw new Error("Unable to determine the user being reported.");
      }

      // ============================================
      // CREATE REPORT
      // ============================================

        const { data, error: insertError } = await supabase
        .from("reports")
        .insert([
          {
            reported_by: user.id,
            reported_user_id: reportedUserId,
            cycle_id: rental.cycle_id,
            booking_id: rental.id,
            reporter_role: reporterRole,
            reason: "Rental Issue",
            description: description.trim(),
            status: "pending",
          },
        ])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log("Report submitted:", data);

      alert("Issue reported successfully.");

      onBack();

    } catch (err) {
      console.error("Report submission error:", err);

      setError(
        err.message || "Unable to submit your report."
      );
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="report-page">

      <div className="report-card">

        {/* HEADER */}

        <div className="report-header">

          <button
            className="report-back-btn"
            onClick={onBack}
          >
            ← Back
          </button>

          <div className="report-icon">
            ⚠️
          </div>

          <h1>Report an Issue</h1>

          <p>
            Tell us what went wrong with your
            rented cycle.
          </p>

        </div>

        {/* CYCLE INFORMATION */}

        <div className="reported-cycle">

          <div>
            <span>Cycle</span>

            <strong>
              {rental?.cycles?.brand || "Cycle"}

              {rental?.cycles?.model
                ? ` ${rental.cycles.model}`
                : ""}
            </strong>
          </div>

          <div>
            <span>Location</span>

            <strong>
              📍{" "}
              {rental?.cycles?.location ||
                "Unavailable"}
            </strong>
          </div>

        </div>

        {/* FORM */}

        <form onSubmit={handleSubmit}>

          <div className="report-field">

            <label>
              Describe the issue
            </label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Example: The rear brake is not working properly..."
              rows={7}
              maxLength={1000}
            />

            <div className="character-count">
              {description.length}/1000
            </div>

          </div>

          {error && (
            <div className="report-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="submit-report-btn"
            disabled={submitting}
          >
            {submitting
              ? "Submitting..."
              : "Submit Report"}
          </button>

        </form>

        <p className="report-note">
          Your report will be reviewed by the
          administration.
        </p>

      </div>

    </div>
  );
}

export default ReportPage;