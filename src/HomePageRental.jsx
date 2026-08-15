
import React, { useEffect, useState } from "react";
import "./HomePageRental.css";
import { supabase } from "./supabase";

import NotificationBell from "./NotificationBell";
import applogo from "./assets/UGO_logo.jpeg";

function Home({ onProfile, BackToChoice, onViewDetails, onNotifications }) {
  // =========================================
  // CYCLE DATA
  // =========================================

  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================
  // GET CYCLES FROM SUPABASE
  // =========================================

  useEffect(() => {
    const fetchCycles = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("cycles")
        .select(`
          *,
          cycle_images (
            image_url,
            display_order
          )
        `)
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching cycles:", error);

        setError("Unable to load cycles.");
        setCycles([]);
        setLoading(false);

        return;
      }

      // Convert Supabase data into the format
      // used by the existing UI

      const formattedCycles = (data || []).map((cycle) => {
        const sortedImages = [...(cycle.cycle_images || [])].sort(
          (a, b) =>
            (a.display_order ?? 0) -
            (b.display_order ?? 0)
        );

        return {
          // REAL SUPABASE UUID
          id: cycle.id,

          brand:
            cycle.brand ||
            cycle.title ||
            "Cycle",

          model:
            cycle.model ||
            "",

          image:
            sortedImages.length > 0
              ? supabase.storage
                  .from("cycle-images")
                  .getPublicUrl(
                    sortedImages[0].image_url
                  ).data.publicUrl
              : null,

          images: sortedImages.map((image) => {
            const { data } = supabase.storage
              .from("cycle-images")
              .getPublicUrl(image.image_url);

            return data.publicUrl;
          }),

          hourlyPrice:
            cycle.price_per_hour ?? 0,

          dailyPrice:
            cycle.price_per_day ?? 0,

          location:
            cycle.location ||
            "Location not specified",

          description:
            cycle.description ||
            "",

          cycle_type:
            cycle.cycle_type ||
            "",

          condition:
            cycle.condition ||
            "",

          price_per_hour:
            cycle.price_per_hour ?? 0,

          price_per_day:
            cycle.price_per_day ?? 0,

          // Your cycles table does not contain
          // a rating column.
          rating: 0,

          // Geared filter
          geared:
            cycle.cycle_type?.toLowerCase() === "gear" ||
            cycle.cycle_type?.toLowerCase() === "geared",

          status:
            cycle.status,

          is_verified:
            cycle.is_verified,

          owner_id:
            cycle.owner_id,
        };
      });

      setCycles(formattedCycles);
      setLoading(false);
    };

    fetchCycles();
  }, []);

  // =========================================
  // FILTER STATES
  // =========================================

  const [search, setSearch] = useState("");

  const [hourlyPrice, setHourlyPrice] =
    useState(100);

  const [dailyPrice, setDailyPrice] =
    useState(500);

  const [rating, setRating] =
    useState(0);

  const [location, setLocation] =
    useState("All");

  const [geared, setGeared] =
    useState("All");

  // =========================================
  // FILTER LOGIC
  // =========================================

  const filteredCycles = cycles.filter((cycle) => {
    const searchText =
      search.toLowerCase().trim();

    const searchMatch =
      cycle.brand
        .toLowerCase()
        .includes(searchText) ||

      cycle.location
        .toLowerCase()
        .includes(searchText) ||

      cycle.model
        .toLowerCase()
        .includes(searchText);

    const hourlyMatch =
      cycle.hourlyPrice <= hourlyPrice;

    const dailyMatch =
      cycle.dailyPrice <= dailyPrice;

    const ratingMatch =
      cycle.rating >= rating;

    const locationMatch =
      location === "All" ||
      cycle.location === location;

    const gearedMatch =
      geared === "All" ||
      (geared === "Geared" && cycle.geared) ||
      (geared === "Non-Geared" && !cycle.geared);

    return (
      searchMatch &&
      hourlyMatch &&
      dailyMatch &&
      ratingMatch &&
      locationMatch &&
      gearedMatch
    );
  });

  // =========================================
  // RESET FILTERS
  // =========================================

  const resetFilters = () => {
    setHourlyPrice(100);
    setDailyPrice(500);
    setRating(0);
    setLocation("All");
    setGeared("All");
    setSearch("");
  };

  // =========================================
  // DYNAMIC LOCATIONS
  // =========================================

  const locations = [
    ...new Set(
      cycles
        .map((cycle) => cycle.location)
        .filter(Boolean)
    ),
  ];

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="home-page">

      {/* =================================
          NAVBAR
      ================================= */}

      <nav className="home-navbar">

        {/* LOGO */}

        <div className="home-logo">

          <div className="home-logo-icon">
            <img
              src = {applogo}
              alt = "NITK Cycle Sharing"
            />
          </div>

          <div>
            <h2>NITK Cycle</h2>

            <span>
              SHARING
            </span>
          </div>

        </div>


        {/* SEARCH */}

        <div className="cycle-search">

          <span className="search-icon">
            🔍
          </span>

          <input
            type="text"
            placeholder="Search cycles by brand, model or location..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>


        {/* NAVIGATION */}

        <div className="navbar-actions">

          <NotificationBell onClick={onNotifications} />

          <button
            className="nav-home-btn"
            onClick={BackToChoice}
          >
            Home
          </button>

          <button
            className="nav-profile-btn"
            onClick={onProfile}
          >
            Profile
          </button>

        </div>

      </nav>


      {/* =================================
          MAIN CONTENT
      ================================= */}

      <div className="home-main">

        {/* =================================
            SIDEBAR
        ================================= */}

        <aside className="filter-sidebar">

          <div className="filter-heading">

            <div>
              <h2>
                Filters
              </h2>

              <p>
                Find your perfect ride
              </p>
            </div>

            <button
              className="reset-btn"
              onClick={resetFilters}
            >
              Reset
            </button>

          </div>


          {/* PRICE PER HOUR */}

          <div className="filter-section">

            <label>
              Price per Hour
            </label>

            <div className="price-value">
              ₹{hourlyPrice}
            </div>

            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={hourlyPrice}
              onChange={(e) =>
                setHourlyPrice(
                  Number(e.target.value)
                )
              }
            />

            <div className="range-labels">
              <span>₹10</span>
              <span>₹100+</span>
            </div>

          </div>


          {/* PRICE PER DAY */}

          <div className="filter-section">

            <label>
              Price per Day
            </label>

            <div className="price-value">
              ₹{dailyPrice}
            </div>

            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={dailyPrice}
              onChange={(e) =>
                setDailyPrice(
                  Number(e.target.value)
                )
              }
            />

            <div className="range-labels">
              <span>₹50</span>
              <span>₹500+</span>
            </div>

          </div>


          {/* RATING */}

          <div className="filter-section">

            <label>
              Minimum Rating
            </label>

            <div className="rating-options">

              {[0, 3, 4, 4.5].map(
                (value) => (

                  <button
                    key={value}
                    className={
                      rating === value
                        ? "rating-option active"
                        : "rating-option"
                    }
                    onClick={() =>
                      setRating(value)
                    }
                  >

                    {value === 0
                      ? "All"
                      : <>★ {value}+</>
                    }

                  </button>

                )
              )}

            </div>

          </div>


          {/* LOCATION */}

          <div className="filter-section">

            <label>
              Location
            </label>

            <select
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
            >

              <option value="All">
                All Locations
              </option>

              {locations.map(
                (item) => (

                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>

                )
              )}

            </select>

          </div>


          {/* CYCLE TYPE */}

          <div className="filter-section">

            <label>
              Cycle Type
            </label>

            <div className="gear-options">

              <button
                className={
                  geared === "All"
                    ? "gear-btn active"
                    : "gear-btn"
                }
                onClick={() =>
                  setGeared("All")
                }
              >
                All
              </button>

              <button
                className={
                  geared === "Geared"
                    ? "gear-btn active"
                    : "gear-btn"
                }
                onClick={() =>
                  setGeared("Geared")
                }
              >
                ⚙ Geared
              </button>

              <button
                className={
                  geared === "Non-Geared"
                    ? "gear-btn active"
                    : "gear-btn"
                }
                onClick={() =>
                  setGeared("Non-Geared")
                }
              >
                ○ Non-Geared
              </button>

            </div>

          </div>

        </aside>


        {/* =================================
            CYCLE CONTENT
        ================================= */}

        <main className="cycle-content">

          <div className="content-header">

            <div>

              <p className="content-small-title">
                NITK CYCLE SHARING
              </p>

              <h1>
                Available Cycles
              </h1>

              <p>
                Choose a cycle and start your ride.
              </p>

            </div>

            <div className="cycle-count">

              {loading
                ? "Loading..."
                : `${filteredCycles.length} cycles found`
              }

            </div>

          </div>


          {/* =================================
              LOADING
          ================================= */}

          {loading && (

            <div className="no-results">

              <div>
                🚲
              </div>

              <h2>
                Loading cycles...
              </h2>

              <p>
                Getting available cycles from NITK
                Cycle Sharing.
              </p>

            </div>

          )}


          {/* =================================
              ERROR
          ================================= */}

          {!loading && error && (

            <div className="no-results">

              <div>
                ⚠️
              </div>

              <h2>
                Unable to load cycles
              </h2>

              <p>
                {error}
              </p>

              <button
                onClick={() =>
                  window.location.reload()
                }
              >
                Try Again
              </button>

            </div>

          )}


          {/* =================================
              CYCLE CARDS
          ================================= */}

          {!loading && !error && (

            <div className="cycle-grid">

              {filteredCycles.length > 0 ? (

                filteredCycles.map(
                  (cycle) => (

                    <div
                      className="cycle-card"
                      key={cycle.id}
                    >

                      {/* IMAGE */}

                      <div className="cycle-image">

                        {cycle.image ? (

                          <img
                            src={cycle.image}
                            alt={cycle.brand}
                          />

                        ) : (

                          <div className="cycle-placeholder">
                            🚲
                          </div>

                        )}

                        <span className="available-badge">
                          Available
                        </span>

                      </div>


                      {/* DETAILS */}

                      <div className="cycle-details">

                        {/* BRAND + RATING */}

                        <div className="cycle-title-row">

                          <div className="cycle-name">

                            <h2>
                              {cycle.brand}
                            </h2>

                            {cycle.model && (
                              <span className="cycle-model">
                                {cycle.model}
                              </span>
                            )}

                          </div>

                          <span className="rating">

                            {cycle.rating > 0
                              ? `★ ${cycle.rating}`
                              : "New"
                            }

                          </span>

                        </div>


                        {/* LOCATION */}

                        <p className="cycle-location">
                          📍 {cycle.location}
                        </p>


                        {/* PRICES */}

                        <div className="cycle-info">

                          <div>

                            <span>
                              Per Hour
                            </span>

                            <strong>
                              ₹{cycle.hourlyPrice}
                            </strong>

                          </div>

                          <div>

                            <span>
                              Per Day
                            </span>

                            <strong>
                              ₹{cycle.dailyPrice}
                            </strong>

                          </div>

                        </div>


                        {/* BOTTOM ROW */}

                        <div className="cycle-bottom-row">

                          <div className="cycle-type">

                            {cycle.geared ? (

                              <span>
                                ⚙ Geared
                              </span>

                            ) : (

                              <span>
                                ○ Non-Geared
                              </span>

                            )}

                          </div>


                          <button
                            className="rent-btn"
                            onClick={() =>
                              onViewDetails(cycle)
                            }
                          >
                            View Details
                          </button>

                        </div>

                      </div>

                    </div>

                  )

                )

              ) : (

                <div className="no-results">

                  <div>
                    🚲
                  </div>

                  <h2>
                    No cycles found
                  </h2>

                  <p>
                    Try changing your filters or search.
                  </p>

                  <button
                    onClick={resetFilters}
                  >
                    Clear Filters
                  </button>

                </div>

              )}

            </div>

          )}

        </main>

      </div>


      {/* =================================
          FOOTER
      ================================= */}

      <footer className="home-footer">

        <div className="footer-brand">

          <h2>
            🚲 NITK Cycle Sharing
          </h2>

          <p>
            Affordable and convenient cycle
            sharing for the NITK community.
          </p>

        </div>

{/* 
        <div className="footer-links">

          <a href="#home">
            Home
          </a>

          <a href="#cycles">
            Cycles
          </a>

          <a href="#about">
            About
          </a>

          <a href="#help">
            Help
          </a>

        </div> */}


        <div className="footer-copy">

          <p>
            © 2026 NITK Cycle Sharing
          </p>

        </div>

      </footer>

    </div>
  );
}

export default Home;
