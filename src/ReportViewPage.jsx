import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./ReportViewPage.css";

/*
 * ReportViewPage
 *
 * Opens when an admin presses "View Report".
 *
 * Expected navigation data:
 *   reportId / report_id
 *   notification.action_data.report_id
 *   bookingId / booking_id
 *   cycleId / cycle_id
 *
 * The page also works when only reportId is supplied because the
 * remaining information is fetched from the reports table.
 */
function ReportViewPage({
  reportId,
  report_id,
  notification,
  pageData,
  onBack,
}) {
  const [report, setReport] = useState(null);
  const [ownerName, setOwnerName] = useState("");
  const [renterName, setRenterName] = useState("");
  const [reportedPersonName, setReportedPersonName] = useState("");

  const [cycle, setCycle] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getActionData = () => {
    const notificationActionData =
      notification?.action_data &&
      typeof notification.action_data === "object"
        ? notification.action_data
        : {};

    const pageActionData =
      pageData?.action_data &&
      typeof pageData.action_data === "object"
        ? pageData.action_data
        : {};

    return {
      ...pageActionData,
      ...notificationActionData,
      ...(typeof pageData === "object" ? pageData : {}),
    };
  };

  const firstValue = (...values) =>
    values.find(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    );

  const fetchProfileName = async (userId) => {
    if (!userId) return "";

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return "";
    }

    return (
      data?.full_name?.trim() ||
      data?.email?.split("@")[0] ||
      ""
    );
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");

      const actionData = getActionData();

      const selectedReportId = firstValue(
        reportId,
        report_id,
        actionData.report_id,
        actionData.reportId,
        notification?.report_id
      );

      let reportData = null;

      /*
       * -------------------------------------------------------
       * FETCH REPORT
       * -------------------------------------------------------
       */
      if (selectedReportId) {
        const { data, error: reportError } = await supabase
          .from("reports")
          .select("*")
          .eq("id", selectedReportId)
          .maybeSingle();

        if (reportError) throw reportError;
        reportData = data;
      } else {
        /*
         * If the notification contains the report itself, allow
         * the page to display it without requiring report_id.
         */
        reportData = actionData.report || null;
      }

      if (!reportData) {
        throw new Error("Report information could not be found.");
      }

      setReport(reportData);

      /*
       * -------------------------------------------------------
       * RESOLVE IDS
       * -------------------------------------------------------
       */
      const bookingId = firstValue(
        reportData.booking_id,
        actionData.booking_id,
        actionData.bookingId
      );

      const cycleId = firstValue(
        reportData.cycle_id,
        actionData.cycle_id,
        actionData.cycleId
      );

      const reportedUserId = firstValue(
        reportData.reported_user_id,
        actionData.reported_user_id,
        actionData.reportedUserId
      );

      let booking = null;

      /*
       * -------------------------------------------------------
       * FETCH BOOKING
       *
       * Owner/renter details are only relevant when the report
       * is associated with a rental.
       * -------------------------------------------------------
       */
      if (bookingId) {
        const { data, error: bookingError } = await supabase
          .from("booking_table")
          .select(`
            id,
            owner_id,
            renter_id,
            cycle_id
          `)
          .eq("id", bookingId)
          .maybeSingle();

        if (bookingError) {
          console.error("Booking fetch error:", bookingError);
        } else {
          booking = data;
        }
      }

      const ownerId = firstValue(
        booking?.owner_id,
        reportData.owner_id,
        actionData.owner_id,
        actionData.ownerId
      );

      const renterId = firstValue(
        booking?.renter_id,
        reportData.renter_id,
        actionData.renter_id,
        actionData.renterId
      );

      /*
       * -------------------------------------------------------
       * FETCH NAMES
       * -------------------------------------------------------
       */
      const [resolvedOwnerName, resolvedRenterName, resolvedReportedName] =
        await Promise.all([
          fetchProfileName(ownerId),
          fetchProfileName(renterId),
          fetchProfileName(reportedUserId),
        ]);

      setOwnerName(
        firstValue(
          resolvedOwnerName,
          reportData.owner_name,
          actionData.owner_name,
          actionData.ownerName
        ) || ""
      );

      setRenterName(
        firstValue(
          resolvedRenterName,
          reportData.renter_name,
          actionData.renter_name,
          actionData.renterName
        ) || ""
      );

      setReportedPersonName(
        firstValue(
          resolvedReportedName,
          reportData.reported_user_name,
          actionData.reported_user_name,
          actionData.reportedUserName
        ) || ""
      );

      /*
       * -------------------------------------------------------
       * FETCH CYCLE
       *
       * Cycle information is shown ONLY when a cycle is actually
       * associated with this report.
       * -------------------------------------------------------
       */
      const finalCycleId = firstValue(
        cycleId,
        booking?.cycle_id
      );

      if (finalCycleId) {
        const { data: cycleData, error: cycleError } = await supabase
          .from("cycles")
          .select(`
            id,
            brand,
            model,
            location
          `)
          .eq("id", finalCycleId)
          .maybeSingle();

        if (cycleError) {
          console.error("Cycle fetch error:", cycleError);
        } else {
          setCycle(cycleData || null);
        }
      } else {
        setCycle(null);
      }
    } catch (err) {
      console.error("Report fetch error:", err);
      setError(
        err.message || "Unable to load the report."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportId, report_id, notification, pageData]);

  const formatDate = (value) => {
    if (!value) return "Not available";

    try {
      return new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return value;
    }
  };

  const displayValue = (value, fallback = "Not available") =>
    firstValue(value) || fallback;

  const getReportType = () => {
    const type = firstValue(
      report?.report_type,
      report?.type,
      report?.category
    );

    if (type) {
      return String(type)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    if (report?.cycle_id) return "Cycle Issue";
    if (report?.reported_user_id) return "User Report";

    return "General Issue";
  };

  const hasRentalPeople =
    Boolean(ownerName || renterName);

  const hasCycleDetails = Boolean(cycle);

  if (loading) {
    return (
      <div className="report-view-page">
        <main className="report-view-card report-view-state">
          <div className="report-view-spinner" />
          <h2>Loading Report</h2>
          <p>Please wait while we fetch the report details.</p>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="report-view-page">
        <main className="report-view-card report-view-state">
          <div className="report-view-state-icon">!</div>
          <h2>Unable to Load Report</h2>
          <p>{error || "Report information is unavailable."}</p>

          {onBack && (
            <button
              type="button"
              className="report-view-back-button"
              onClick={onBack}
            >
              ← Back
            </button>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="report-view-page">
      <main className="report-view-container">

        <header className="report-view-header">
          <button
            type="button"
            className="report-view-back-button"
            onClick={onBack}
          >
            ← Back
          </button>

          <div className="report-view-title-area">
            <div className="report-view-eyebrow">
              UGO · ADMIN REPORT
            </div>

            <div className="report-view-title-row">
              <div className="report-view-icon">🚨</div>

              <div>
                <h1>Report Details</h1>
                <p>
                  Review the issue reported by a UGO user.
                </p>
              </div>
            </div>
          </div>

          <span className="report-view-status">
            {displayValue(report.status, "Pending")}
          </span>
        </header>

        <section className="report-view-card">

          <div className="report-view-section-heading">
            <span className="report-view-section-number">01</span>
            <div>
              <h2>Report Information</h2>
              <p>Details submitted for administrative review.</p>
            </div>
          </div>

          <div className="report-view-info-grid">

            <div className="report-view-info-item report-view-wide">
              <span>Issue Type</span>
              <strong>{getReportType()}</strong>
            </div>

            <div className="report-view-info-item">
              <span>Reported On</span>
              <strong>
                {formatDate(
                  report.created_at ||
                  report.reported_at
                )}
              </strong>
            </div>

            <div className="report-view-info-item">
              <span>Report ID</span>
              <strong className="report-view-id">
                {displayValue(report.id)}
              </strong>
            </div>

            <div className="report-view-info-item report-view-wide">
              <span>Reason</span>
              <strong>
                {displayValue(
                  report.reason,
                  "Reason not provided"
                )}
              </strong>
            </div>

            <div className="report-view-description report-view-wide">
              <span>Issue Description</span>
              <p>
                {displayValue(
                  report.description,
                  "No description was provided."
                )}
              </p>
            </div>

          </div>
        </section>

        {hasRentalPeople && (
          <section className="report-view-card">

            <div className="report-view-section-heading">
              <span className="report-view-section-number">02</span>
              <div>
                <h2>People Involved</h2>
                <p>
                  Displayed when the report is associated with
                  users or a rental.
                </p>
              </div>
            </div>

            <div className="report-view-people-grid">

              {ownerName && (
                <div className="report-view-person">
                  <div className="report-view-person-icon">
                    O
                  </div>

                  <div>
                    <span>Owner Name</span>
                    <strong>{ownerName}</strong>
                  </div>
                </div>
              )}

              {renterName && (
                <div className="report-view-person">
                  <div className="report-view-person-icon">
                    R
                  </div>

                  <div>
                    <span>Renter Name</span>
                    <strong>{renterName}</strong>
                  </div>
                </div>
              )}

              {reportedPersonName && (
                <div className="report-view-person report-view-person-reported">
                  <div className="report-view-person-icon">
                    !
                  </div>

                  <div>
                    <span>Reported Person</span>
                    <strong>{reportedPersonName}</strong>
                  </div>
                </div>
              )}

            </div>
          </section>
        )}

        {hasCycleDetails && (
          <section className="report-view-card">

            <div className="report-view-section-heading">
              <span className="report-view-section-number">03</span>
              <div>
                <h2>Cycle Details</h2>
                <p>
                  Shown only because this report is linked to a cycle.
                </p>
              </div>
            </div>

            <div className="report-view-cycle-card">

              <div className="report-view-cycle-icon">
                🚲
              </div>

              <div className="report-view-cycle-details">

                <div>
                  <span>Cycle</span>
                  <strong>
                    {displayValue(cycle.brand, "Cycle")}
                    {cycle.model
                      ? ` ${cycle.model}`
                      : ""}
                  </strong>
                </div>

                <div>
                  <span>Location</span>
                  <strong>
                    {displayValue(
                      cycle.location,
                      "Location unavailable"
                    )}
                  </strong>
                </div>

              </div>

            </div>
          </section>
        )}

        <section className="report-view-card report-view-summary-card">

          <div className="report-view-summary-icon">
            ✓
          </div>

          <div>
            <h2>Administrative Review</h2>
            <p>
              This report is available for the administration
              to investigate and take the appropriate action.
            </p>
          </div>

        </section>

      </main>
    </div>
  );
}

export default ReportViewPage;
