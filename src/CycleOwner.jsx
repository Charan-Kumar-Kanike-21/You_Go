import React, { useEffect, useState } from "react";
import "./CycleOwner.css";
import { supabase } from "./supabase";

import NotificationBell from "./NotificationBell";
import applogo from "./assets/UGO_logo.jpeg";

function CycleOwner({ onBack, onListCycle, onNotifications, onEditCycle }) {
  const [cycles, setCycles] = useState([]);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  // =========================================
  // GET CURRENT USER + PROFILE + CYCLES
  // =========================================

  const fetchOwnerData = async () => {
    setLoading(true);
    setError("");

    try {
      // ---------------------------------------
      // GET LOGGED-IN USER
      // ---------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      // ---------------------------------------
      // GET PROFILE
      // ---------------------------------------

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            email,
            phone,
            avatar_url,
            hostel,
            role,
            is_verified
          `)
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
      }

      setProfile(profileData);

      // ---------------------------------------
      // GET OWNER'S CYCLES
      // ---------------------------------------

      const { data: cycleData, error: cycleError } =
        await supabase
          .from("cycles")
          .select(`
            *,
            cycle_images (
              image_url,
              display_order
            )
          `)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

      if (cycleError) {
        throw cycleError;
      }

      // ---------------------------------------
      // FORMAT CYCLES
      // ---------------------------------------

      const formattedCycles = (cycleData || []).map((cycle) => {
        const sortedImages = [...(cycle.cycle_images || [])].sort(
          (a, b) =>
            (a.display_order ?? 0) -
            (b.display_order ?? 0)
        );

        const imageUrls = sortedImages.map((image) => {
          const { data } = supabase.storage
            .from("cycle-images")
            .getPublicUrl(image.image_url);

          return data.publicUrl;
        });

        return {
          ...cycle,

          image:
            imageUrls.length > 0
              ? imageUrls[0]
              : null,

          images: imageUrls,
        };
      });

      setCycles(formattedCycles);
    } catch (err) {
      console.error("Error loading owner data:", err);

      setError(
        err.message || "Unable to load your cycles."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // INITIAL LOAD
  // =========================================

  useEffect(() => {
    fetchOwnerData();
  }, []);

  // =========================================
  // DELETE CYCLE
  // =========================================

  const handleDelete = async (cycle) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${cycle.brand || "this cycle"}"?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(cycle.id);

    try {
      // ---------------------------------------
      // GET IMAGE RECORDS
      // ---------------------------------------

      const { data: imageRecords, error: imageFetchError } =
        await supabase
          .from("cycle_images")
          .select("image_url")
          .eq("cycle_id", cycle.id);

      if (imageFetchError) {
        throw imageFetchError;
      }

      // ---------------------------------------
      // DELETE FILES FROM STORAGE
      // ---------------------------------------

      if (imageRecords && imageRecords.length > 0) {
        const imagePaths = imageRecords
          .map((item) => item.image_url)
          .filter(Boolean);

        if (imagePaths.length > 0) {
          const { error: storageError } =
            await supabase.storage
              .from("cycle-images")
              .remove(imagePaths);

          if (storageError) {
            console.warn(
              "Storage deletion warning:",
              storageError
            );
          }
        }
      }

      // ---------------------------------------
      // DELETE IMAGE RECORDS
      // ---------------------------------------

      const { error: imageDeleteError } =
        await supabase
          .from("cycle_images")
          .delete()
          .eq("cycle_id", cycle.id);

      if (imageDeleteError) {
        throw imageDeleteError;
      }

      // ---------------------------------------
      // DELETE CYCLE
      // ---------------------------------------

      const { error: cycleDeleteError } =
        await supabase
          .from("cycles")
          .delete()
          .eq("id", cycle.id);

      if (cycleDeleteError) {
        throw cycleDeleteError;
      }

      // ---------------------------------------
      // UPDATE UI
      // ---------------------------------------

      setCycles((previousCycles) =>
        previousCycles.filter(
          (item) => item.id !== cycle.id
        )
      );

      alert("Cycle deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);

      alert(
        err.message ||
          "Unable to delete the cycle."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================
  // PROFILE DISPLAY
  // =========================================

  const ownerName =
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    "Cycle Owner";

  // =========================================
  // RENDER
  // =========================================

  return (
    <div className="owner-page">

      {/* =========================================
          NAVBAR
      ========================================= */}

      <nav className="owner-navbar">

        <div className="owner-brand">
          <div className="owner-brand-icon">
            <img
              src = {applogo}
              alt = "NITK Cycle Sharing"
            />
          </div>

          <div>
            <h2>NITK Cycle</h2>
            <span>SHARING</span>
          </div>
        </div>

        <div className="owner-brand">
        <NotificationBell
          className = "Bell-in-Owner"
          onClick={onNotifications}
        />

        <button
          className="owner-back-btn"
          onClick={onBack}
        >
          ← Home
        </button>
        </div>

      </nav>


      {/* =========================================
          HERO
      ========================================= */}

      <section className="owner-hero">

        <div className="owner-hero-content">

          <p className="owner-small-title">
            CYCLE OWNER DASHBOARD
          </p>

          <h1>
            Welcome, {ownerName}
          </h1>

          <p>
            Manage your cycles and make them
            available to the NITK community.
          </p>

        </div>

        <div className="owner-hero-icon">
          🚴
        </div>

      </section>


      {/* =========================================
          ACTION CARDS
      ========================================= */}

      <section className="owner-actions">

        {/* LIST CYCLE */}

        <button
          className="owner-action-card list-action"
          onClick={onListCycle}
        >

          <div className="action-icon">
            ➕
          </div>

          <div className="action-content"
            // onClick = {}
          >
            <h2>List a Cycle</h2>

            <p>
              Add a cycle and make it available
              for other students.
            </p>
          </div>

          <span className="action-arrow">
            →
          </span>

        </button>


        {/* LISTED CYCLES */}

        <div className="owner-action-card">

          <div className="action-icon">
            🚲
          </div>

          <div className="action-content">
            <h2>Listed Cycles</h2>

            <p>
              You currently have{" "}
              <strong>{cycles.length}</strong>{" "}
              cycle{cycles.length !== 1 ? "s" : ""} listed.
            </p>
          </div>

        </div>

      </section>


      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <main className="owner-main">

        <div className="owner-section-header">

          <div>
            <p>YOUR LISTINGS</p>

            <h2>
              My Listed Cycles
            </h2>
          </div>

          <button
            className="refresh-btn"
            onClick={fetchOwnerData}
            disabled={loading}
          >
            ↻ Refresh
          </button>

        </div>


        {/* =========================================
            LOADING
        ========================================= */}

        {loading && (

          <div className="owner-state">

            <div className="state-icon">
              🚲
            </div>

            <h2>
              Loading your cycles...
            </h2>

            <p>
              Getting your listings from Supabase.
            </p>

          </div>

        )}


        {/* =========================================
            ERROR
        ========================================= */}

        {!loading && error && (

          <div className="owner-state error-state">

            <div className="state-icon">
              ⚠️
            </div>

            <h2>
              Unable to load your cycles
            </h2>

            <p>
              {error}
            </p>

            <button
              className="retry-btn"
              onClick={fetchOwnerData}
            >
              Try Again
            </button>

          </div>

        )}


        {/* =========================================
            EMPTY STATE
        ========================================= */}

        {!loading &&
          !error &&
          cycles.length === 0 && (

            <div className="owner-state">

              <div className="state-icon">
                🚲
              </div>

              <h2>
                No cycles listed yet
              </h2>

              <p>
                List your first cycle and start
                sharing it with the NITK community.
              </p>

              <button
                className="empty-list-btn"
                onClick={onListCycle}
              >
                + List My First Cycle
              </button>

            </div>
          )}


        {/* =========================================
            CYCLE GRID
        ========================================= */}

        {!loading &&
          !error &&
          cycles.length > 0 && (

            <div className="owner-cycle-grid">

              {cycles.map((cycle) => (

                <div
                  className="owner-cycle-card"
                  key={cycle.id}
                >

                  {/* IMAGE */}

                  <div className="owner-cycle-image">

                    {cycle.image ? (

                      <img
                        src={cycle.image}
                        alt={
                          cycle.brand ||
                          "Cycle"
                        }
                      />

                    ) : (

                      <div className="no-cycle-image">
                        🚲
                      </div>

                    )}

                    <span
                      className={
                        cycle.status === "available"
                          ? "status-badge available"
                          : "status-badge"
                      }
                    >
                      {cycle.status ||
                        "Listed"}
                    </span>

                  </div>


                  {/* DETAILS */}

                  <div className="owner-cycle-details">

                    <div className="owner-cycle-title">

                      <div>
                        <h3>
                          {cycle.brand ||
                            "Unnamed Cycle"}
                        </h3>

                        {cycle.model && (
                          <p>
                            {cycle.model}
                          </p>
                        )}
                      </div>

                      <span>
                        🚲
                      </span>

                    </div>


                    <div className="owner-cycle-info">

                      <div>
                        <span>
                          Type
                        </span>

                        <strong>
                          {cycle.cycle_type ||
                            "Not specified"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Condition
                        </span>

                        <strong>
                          {cycle.condition ||
                            "Not specified"}
                        </strong>
                      </div>

                    </div>


                    <div className="owner-cycle-location">
                      📍{" "}
                      {cycle.location ||
                        "Location not specified"}
                    </div>


                    <div className="owner-cycle-pricing">

                      <div>
                        <span>
                          Per Hour
                        </span>

                        <strong>
                          ₹
                          {cycle.price_per_hour ??
                            0}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Per Day
                        </span>

                        <strong>
                          ₹
                          {cycle.price_per_day ??
                            0}
                        </strong>
                      </div>

                    </div>
                    

                    <div className="Owner-Edit-Delete">
                    <button
                      className="edit-cycle-btn"
                      onClick={() => onEditCycle(cycle.id)}
                    >
                      ✏️ Edit Cycle
                    </button>

                    {/* DELETE */}

                    <button
                      className="delete-cycle-btn"
                      onClick={() =>
                        handleDelete(cycle)
                      }
                      disabled={
                        deletingId === cycle.id
                      }
                    >
                      {deletingId === cycle.id
                        ? "Deleting..."
                        : "🗑 Delete Cycle"}
                    </button>
                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

      </main>


      {/* =========================================
          FOOTER
      ========================================= */}

      <footer className="owner-footer">

        <p>
          🚲 NITK Cycle Sharing
        </p>

        <span>
          © 2026 NITK Cycle Sharing
        </span>

      </footer>

    </div>
  );
}

export default CycleOwner;