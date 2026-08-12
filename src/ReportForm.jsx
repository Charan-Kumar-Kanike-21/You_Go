import React, { useState } from "react";
import "./ReportForm.css";
import { supabase } from "./supabase";

function ReportForm({
  rental,
  onBack,
  reportedUserId,
  reporterRole = "user",
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /*
   * ---------------------------------------------------------
   * GET THE PERSON BEING REPORTED
   * ---------------------------------------------------------
   *
   * reportedUserId can be passed directly from the previous
   * page.
   *
   * If it is not passed, we try to get it from rental.
   */

  const targetUserId =
    reportedUserId ||
    rental?.reported_user_id ||
    rental?.owner_id ||
    rental?.renter_id ||
    rental?.user_id ||
    null;

  /*
   * ---------------------------------------------------------
   * DETERMINE REPORTER ROLE
   * ---------------------------------------------------------
   *
   * owner -> owner is reporting a renter/user
   * user  -> renter/user is reporting owner
   */

  const normalizedRole =
    reporterRole === "owner"
      ? "owner"
      : "user";

  /*
   * ---------------------------------------------------------
   * SUBMIT REPORT
   * ---------------------------------------------------------
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    /*
     * Validate reason
     */

    if (!reason.trim()) {
      setError("Please select a reason for the report.");
      return;
    }

    /*
     * Validate description
     */

    if (!description.trim()) {
      setError("Please describe the issue.");
      return;
    }

    /*
     * Validate reported user
     */

    if (!targetUserId) {
      setError(
        "Unable to identify the user you are reporting."
      );
      console.error(
        "Missing reportedUserId. Rental object:",
        rental
      );
      return;
    }

    /*
     * Prevent reporting yourself
     */

    try {
      setSubmitting(true);

      /*
       * Get logged-in user
       */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "You must be logged in to submit a report."
        );
      }

      /*
       * Prevent self-reporting
       */

      if (user.id === targetUserId) {
        throw new Error(
          "You cannot report yourself."
        );
      }

      /*
       * -----------------------------------------------------
       * INSERT INTO reports TABLE
       * -----------------------------------------------------
       */

      const reportData = {
        reported_by: user.id,

        reported_user_id: targetUserId,

        cycle_id:
          rental?.cycle_id || null,

        booking_id:
          rental?.booking_id ||
          rental?.id ||
          null,

        reporter_role:
          normalizedRole,

        reason:
          reason.trim(),

        description:
          description.trim(),

        status:
          "pending",

        admin_note:
          null,

        resolved_by:
          null,
      };

      console.log(
        "Submitting report:",
        reportData
      );

      const {
        error: insertError,
      } = await supabase
        .from("reports")
        .insert(reportData);

      if (insertError) {
        throw insertError;
      }

      /*
       * SUCCESS
       */

      alert(
        "Report submitted successfully. The administration will review it."
      );

      /*
       * Return to previous page
       */

      if (onBack) {
        onBack();
      }

    } catch (err) {
      console.error(
        "Report submission error:",
        err
      );

      setError(
        err.message ||
          "Unable to submit the report."
      );

    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * NO RENTAL INFORMATION
   * ---------------------------------------------------------
   */

  if (!rental) {
    return (
      <div className="report-page">

        <div className="report-card">

          <button
            className="report-back-btn"
            onClick={onBack}
          >
            ← Back
          </button>

          <div className="report-empty-icon">
            ⚠️
          </div>

          <h2>
            Rental information unavailable
          </h2>

          <p>
            We couldn't find the rental associated
            with this report.
          </p>

        </div>

      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * DISPLAY NAME
   * ---------------------------------------------------------
   */

  const cycleBrand =
    rental?.cycles?.brand ||
    rental?.cycle?.brand ||
    "Cycle";

  const cycleModel =
    rental?.cycles?.model ||
    rental?.cycle?.model ||
    "";

  const cycleLocation =
    rental?.cycles?.location ||
    rental?.cycle?.location ||
    "Unavailable";

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <div className="report-page">

      <div className="report-card">

        {/* =================================================
            HEADER
            ================================================= */}

        <div className="report-header">

          <button
            className="report-back-btn"
            onClick={onBack}
            type="button"
          >
            ← Back
          </button>

          <div className="report-icon">
            ⚠️
          </div>

          <h1>
            Report {normalizedRole === "owner"
              ? "User"
              : "Owner"}
          </h1>

          <p>
            Please provide the details of the
            issue. Your report will be reviewed
            by the administration.
          </p>

        </div>


        {/* =================================================
            CYCLE INFORMATION
            ================================================= */}

        <div className="reported-cycle">

          <div className="cycle-info-item">

            <span>
              Cycle
            </span>

            <strong>
              {cycleBrand}

              {cycleModel
                ? ` ${cycleModel}`
                : ""}
            </strong>

          </div>


          <div className="cycle-info-item">

            <span>
              Location
            </span>

            <strong>
              📍 {cycleLocation}
            </strong>

          </div>

        </div>


        {/* =================================================
            REPORT FORM
            ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="report-form"
        >

          {/* =================================================
              REASON
              ================================================= */}

          <div className="report-field">

            <label htmlFor="report-reason">
              Reason for report
            </label>

            <select
              id="report-reason"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
            >

              <option value="">
                Select a reason
              </option>

              <option value="Misconduct">
                Misconduct
              </option>

              <option value="Fraudulent Activity">
                Fraudulent Activity
              </option>

              <option value="Damage to Cycle">
                Damage to Cycle
              </option>

              <option value="Failure to Return Cycle">
                Failure to Return Cycle
              </option>

              <option value="Abusive Behaviour">
                Abusive Behaviour
              </option>

              <option value="False Information">
                False Information
              </option>

              <option value="Payment Issue">
                Payment Issue
              </option>

              <option value="Other">
                Other
              </option>

            </select>

          </div>


          {/* =================================================
              DESCRIPTION
              ================================================= */}

          <div className="report-field">

            <label htmlFor="report-description">
              Describe the issue
            </label>

            <textarea
              id="report-description"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder={
                "Please explain what happened..."
              }
              rows={7}
              maxLength={1000}
            />

            <div className="character-count">
              {description.length}/1000
            </div>

          </div>


          {/* =================================================
              ERROR
              ================================================= */}

          {error && (

            <div className="report-error">

              ⚠️ {error}

            </div>

          )}


          {/* =================================================
              SUBMIT
              ================================================= */}

          <button
            type="submit"
            className="submit-report-btn"
            disabled={submitting}
          >

            {submitting
              ? "Submitting Report..."
              : "Submit Report"}

          </button>

        </form>


        {/* =================================================
            NOTE
            ================================================= */}

        <p className="report-note">

          Your report will be stored securely
          and reviewed by the administration.

        </p>

      </div>

    </div>
  );
}

export default ReportForm;