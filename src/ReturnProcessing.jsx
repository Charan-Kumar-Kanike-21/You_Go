import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./ReturnProcessing.css";

function ReturnProcessing({ bookingId, onBackNotifications, onReview }) {
  const [status, setStatus] = useState("processing");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) {
      setError("Booking information is missing.");
      return;
    }

    let mounted = true;

    const checkBookingStatus = async () => {
      const { data, error: fetchError } = await supabase
        .from("booking_table")
        .select("id, status")
        .eq("id", bookingId)
        .single();

      if (fetchError) {
        console.error(
          "Unable to check return status:",
          fetchError
        );
        return;
      }

      if (!mounted) return;

      console.log(
        "Current return booking status:",
        data?.status
      );

      if (data?.status === "completed") {
        setStatus("completed");
      }
    };

    // Check immediately when page opens.
    checkBookingStatus();

    // Listen only to this booking.
    const channel = supabase
      .channel(`return-processing-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "booking_table",
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          console.log(
            "Return booking updated:",
            payload.new
          );

          if (
            payload.new?.status === "completed"
          ) {
            setStatus("completed");
          }
        }
      )
      .subscribe((subscriptionStatus) => {
        console.log(
          "Return processing realtime:",
          subscriptionStatus
        );
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // ============================================================
  // SUCCESS → HOME AFTER 5 SECONDS
  // ============================================================

  useEffect(() => {
    if (status !== "completed") return;

    const timer = setTimeout(() => {
      if (typeof onReview === "function") {
        onReview();
      } else {
        onBackNotifications();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [status, onBackNotifications]);

  // ============================================================
  // SUCCESS SCREEN
  // ============================================================

  if (status === "completed") {
    return (
      <div className="return-processing-page">
        <main className="return-processing-card">

          <div className="return-processing-success-icon">
            ✓
          </div>

          <span className="return-processing-eyebrow">
            RETURN SUCCESSFUL
          </span>

          <h1>
            Rental Successfully Returned
          </h1>

          <p>
            The owner has accepted your return
            request successfully.
          </p>

          <div className="return-processing-status success">
            <span className="return-processing-dot"></span>
            Return Confirmed
          </div>

          <p className="return-processing-redirect">
            Returning to Home Rentals in 5 seconds...
          </p>

        </main>
      </div>
    );
  }

  // ============================================================
  // PROCESSING SCREEN
  // ============================================================

  return (
    <div className="return-processing-page">
      <main className="return-processing-card">

        <div className="return-processing-loader">
          <div className="return-processing-spinner"></div>
        </div>

        <span className="return-processing-eyebrow">
          RETURN PROCESSING
        </span>

        <h1>
          Waiting for Owner
        </h1>

        <p>
          Your return request has been submitted
          successfully.
        </p>

        <p>
          The cycle owner needs to review and
          accept the return before the rental is
          completed.
        </p>

        <div className="return-processing-status">
          <span className="return-processing-dot"></span>
          Waiting for owner confirmation...
        </div>

        <button
          className="return-processing-back-button"
          onClick={onBackNotifications}
        >
          ← Back to Notifications
        </button>

      </main>
    </div>
  );
}

export default ReturnProcessing;