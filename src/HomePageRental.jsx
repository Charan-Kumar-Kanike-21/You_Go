import React, { useEffect, useState } from "react";
import "./HomePageRental.css";
import { supabase } from "./supabase";

import NotificationBell from "./NotificationBell";
import applogo from "./assets/UGO_logo.jpeg";

function Home({ onProfile, onViewDetails, onNotifications, handleBackToLogin }) {
  // =========================================
  // CYCLE DATA
  // =========================================

  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================
  // AUTHENTICATION STATE
  // =========================================

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadAuthState = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error checking auth state:", error);
        return;
      }

      if (mounted) {
        setIsLoggedIn(Boolean(data.session));
      }
    };

    loadAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setIsLoggedIn(Boolean(session));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================================
  // LOCATION / SORTING HELPERS
  // =========================================

  const getCoordinate = (record, keys) => {
    for (const key of keys) {
      if (
        record &&
        record[key] !== null &&
        record[key] !== undefined &&
        record[key] !== ""
      ) {
        const value = Number(record[key]);

        if (Number.isFinite(value)) {
          return value;
        }
      }
    }

    return null;
  };

  const getCoordinates = (record) => {
    if (!record) {
      return null;
    }

    // Direct latitude / longitude columns.
    const latitude = getCoordinate(record, [
      "latitude",
      "lat",
      "location_latitude",
      "location_lat",
      "cycle_latitude",
      "cycle_lat",
    ]);

    const longitude = getCoordinate(record, [
      "longitude",
      "lng",
      "lon",
      "location_longitude",
      "location_lng",
      "cycle_longitude",
      "cycle_lng",
    ]);

    if (latitude !== null && longitude !== null) {
      return { latitude, longitude };
    }

    // Support nested location objects if they are used
    // by the database without changing the connection.
    const nestedLocations = [
      record.coordinates,
      record.location_coordinates,
      record.location_data,
      typeof record.location === "object"
        ? record.location
        : null,
    ];

    for (const nested of nestedLocations) {
      if (!nested) {
        continue;
      }

      const nestedLatitude = getCoordinate(nested, [
        "latitude",
        "lat",
      ]);

      const nestedLongitude = getCoordinate(nested, [
        "longitude",
        "lng",
        "lon",
      ]);

      if (
        nestedLatitude !== null &&
        nestedLongitude !== null
      ) {
        return {
          latitude: nestedLatitude,
          longitude: nestedLongitude,
        };
      }
    }

    // Also support a "latitude, longitude" string.
    if (typeof record.location === "string") {
      const parts = record.location
        .split(",")
        .map((part) => Number(part.trim()));

      if (
        parts.length >= 2 &&
        Number.isFinite(parts[0]) &&
        Number.isFinite(parts[1])
      ) {
        return {
          latitude: parts[0],
          longitude: parts[1],
        };
      }
    }

    return null;
  };

  const calculateDistanceKm = (first, second) => {
    if (!first || !second) {
      return Number.POSITIVE_INFINITY;
    }

    const toRadians = (value) =>
      (value * Math.PI) / 180;

    const earthRadiusKm = 6371;

    const latitudeDifference =
      toRadians(
        second.latitude - first.latitude
      );

    const longitudeDifference =
      toRadians(
        second.longitude - first.longitude
      );

    const latitude1 =
      toRadians(first.latitude);

    const latitude2 =
      toRadians(second.latitude);

    const haversine =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(latitude1) *
        Math.cos(latitude2) *
        Math.sin(longitudeDifference / 2) ** 2;

    return (
      earthRadiusKm *
      2 *
      Math.atan2(
        Math.sqrt(haversine),
        Math.sqrt(1 - haversine)
      )
    );
  };

  const getAvailabilityStatus = (availability) => {
    if (!availability) {
      return "unknown";
    }

    return String(
      availability.availability_status ??
        availability.availability ??
        availability.availability_type ??
        availability.status ??
        availability.type ??
        "unknown"
    )
      .trim()
      .toLowerCase();
  };

  const formatAvailabilityStatus = (status) => {
    if (!status || status === "unknown") {
      return "Unavailable";
    }

    return status
      .replace(/[_-]+/g, " ")
      .replace(/\\s+/g, " ")
      .replace(/\\b\\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const getAvailabilityCycleId = (availability) => {
    if (!availability) {
      return null;
    }

    return (
      availability.cycle_id ??
      availability.cycleId ??
      availability.cycle_uuid ??
      availability.cycleID ??
      null
    );
  };

  // =========================================
  // GET CYCLES FROM SUPABASE
  //
  // Priority:
  // 1. Available cycles first.
  // 2. Price ascending inside the availability group.
  // 3. Distance from user to cycle.
  // 4. Distance from cycle to owner.
  // 5. Rating descending.
  // =========================================

  useEffect(() => {
    const fetchCycles = async () => {
      setLoading(true);
      setError("");

      try {
        // -----------------------------------------
        // 1. Fetch availability records FIRST.
        // The availability table is the source of
        // which cycles should be displayed.
        // -----------------------------------------

        const {
          data: availabilityRows,
          error: availabilityError,
        } = await supabase
          .from("cycles_availability")
          .select("*");

        if (availabilityError) {
          throw availabilityError;
        }

        const availabilityByCycle = new Map();

        (availabilityRows || []).forEach((availability) => {
          const cycleId =
            getAvailabilityCycleId(availability);

          if (!cycleId) {
            return;
          }

          const existing =
            availabilityByCycle.get(cycleId);

          // If multiple availability records exist for
          // one cycle, prefer the latest updated record.
          if (!existing) {
            availabilityByCycle.set(
              cycleId,
              availability
            );
            return;
          }

          const existingTime = new Date(
            existing.updated_at ??
              existing.created_at ??
              0
          ).getTime();

          const currentTime = new Date(
            availability.updated_at ??
              availability.created_at ??
              0
          ).getTime();

          if (currentTime >= existingTime) {
            availabilityByCycle.set(
              cycleId,
              availability
            );
          }
        });

        const cycleIds = [
          ...availabilityByCycle.keys(),
        ];

        if (cycleIds.length === 0) {
          setCycles([]);
          setLoading(false);
          return;
        }

        // -----------------------------------------
        // 2. Fetch only cycles that exist in the
        // availability table.
        // -----------------------------------------

        const {
          data: cycleRows,
          error: cycleError,
        } = await supabase
          .from("cycles")
          .select(`
            *,
            cycle_images (
              image_url,
              display_order
            )
          `)
          .in("id", cycleIds);

        if (cycleError) {
          throw cycleError;
        }

        // -----------------------------------------
        // 3. Fetch the logged-in user's profile.
        // -----------------------------------------

        let currentUserProfile = null;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const {
            data: profile,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (profileError) {
            console.warn(
              "Unable to fetch user profile:",
              profileError
            );
          } else {
            currentUserProfile = profile;
          }
        }

        // -----------------------------------------
        // 4. Fetch owner profiles for all cycles.
        // -----------------------------------------

        const ownerIds = [
          ...new Set(
            (cycleRows || [])
              .map((cycle) => cycle.owner_id)
              .filter(Boolean)
          ),
        ];

        const ownerProfilesById = new Map();

        if (ownerIds.length > 0) {
          const {
            data: ownerProfiles,
            error: ownerProfilesError,
          } = await supabase
            .from("profiles")
            .select("*")
            .in("id", ownerIds);

          if (ownerProfilesError) {
            console.warn(
              "Unable to fetch owner profiles:",
              ownerProfilesError
            );
          } else {
            (ownerProfiles || []).forEach((profile) => {
              ownerProfilesById.set(
                profile.id,
                profile
              );
            });
          }
        }

        const userCoordinates =
          getCoordinates(currentUserProfile);

        // -----------------------------------------
        // 5. Format the cycles and calculate the
        // two required distances.
        // -----------------------------------------

        const formattedCycles = (cycleRows || []).map(
          (cycle) => {
            const availability =
              availabilityByCycle.get(cycle.id);

            const sortedImages = [
              ...(cycle.cycle_images || []),
            ].sort(
              (a, b) =>
                (a.display_order ?? 0) -
                (b.display_order ?? 0)
            );

            const ownerProfile =
              ownerProfilesById.get(
                cycle.owner_id
              );

            const cycleCoordinates =
              getCoordinates({
                ...cycle,
                ...availability,
              });

            const ownerCoordinates =
              getCoordinates(ownerProfile);

            const availabilityStatus =
              getAvailabilityStatus(
                availability
              );

            return {
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
                const { data } =
                  supabase.storage
                    .from("cycle-images")
                    .getPublicUrl(
                      image.image_url
                    );

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

              rating:
                cycle.rating ??
                cycle.owner_rating ??
                0,

              review_count:
                cycle.review_count ??
                cycle.reviews ??
                0,

              ownerName:
                cycle.owner_name ||
                cycle.ownerName ||
                ownerProfile?.full_name ||
                ownerProfile?.name ||
                "NITK Owner",

              ownerLocation:
                cycle.owner_location ||
                cycle.ownerLocation ||
                ownerProfile?.location ||
                "NITK",

              geared:
                cycle.cycle_type
                  ?.toLowerCase() === "gear" ||
                cycle.cycle_type
                  ?.toLowerCase() === "geared",

              status:
                cycle.status,

              is_verified:
                cycle.is_verified,

              owner_id:
                cycle.owner_id,

              // Availability information used only
              // for the required ordering.
              availabilityStatus,
              availabilityPriority:
                availabilityStatus === "available"
                  ? 0
                  : 1,

              userDistance:
                calculateDistanceKm(
                  userCoordinates,
                  cycleCoordinates
                ),

              ownerDistance:
                calculateDistanceKm(
                  cycleCoordinates,
                  ownerCoordinates
                ),
            };
          }
        );

        // -----------------------------------------
        // 6. APPLY THE REQUESTED PRIORITY ORDER.
        //
        // Priority is NOT changed:
        // availability → price → user distance
        // → owner distance → rating.
        // -----------------------------------------

        formattedCycles.sort((a, b) => {
          // 1. Available cycles first.
          if (
            a.availabilityPriority !==
            b.availabilityPriority
          ) {
            return (
              a.availabilityPriority -
              b.availabilityPriority
            );
          }

          // 2. Ascending price.
          const priceDifference =
            a.hourlyPrice -
            b.hourlyPrice;

          if (priceDifference !== 0) {
            return priceDifference;
          }

          // 3. Nearest to the user first.
          if (
            a.userDistance !==
            b.userDistance
          ) {
            return (
              a.userDistance -
              b.userDistance
            );
          }

          // 4. Nearest to the owner first.
          if (
            a.ownerDistance !==
            b.ownerDistance
          ) {
            return (
              a.ownerDistance -
              b.ownerDistance
            );
          }

          // 5. Highest rating first.
          return (
            b.rating -
            a.rating
          );
        });

        setCycles(formattedCycles);
      } catch (fetchError) {
        console.error(
          "Error fetching cycles:",
          fetchError
        );

        setError(
          "Unable to load cycles."
        );

        setCycles([]);
      } finally {
        setLoading(false);
      }
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

  // Mobile filter drawer
  const [filterOpen, setFilterOpen] =
    useState(false);

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

  const activeFilterCount = [
    hourlyPrice < 100,
    dailyPrice < 500,
    rating > 0,
    location !== "All",
    geared !== "All",
  ].filter(Boolean).length;

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
            placeholder="Search cycles, brands or locations..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>


        {/* NAVIGATION */}

        <div className="navbar-actions">

          <NotificationBell onClick={onNotifications} />
          {/* 
          <button
            className="nav-home-btn"
            onClick={BackToChoice}
          >
            Home
          </button> */}

          {isLoggedIn ? (
            <button
              className="nav-profile-btn"
              onClick={onProfile}
              type="button"
            >
              Profile
            </button>
          ) : (
            <button
              className="nav-login-btn"
              onClick={handleBackToLogin}
              type="button"
            >
              Login / Sign Up
            </button>
          )}

        </div>

      </nav>


      {/* =================================
          MAIN CONTENT
      ================================= */}

      <div className="home-main">

        {/* =================================
            FILTERS
            Desktop: compact horizontal filter row.
            Mobile: hidden until Filters is tapped.
        ================================= */}

        <aside
          className={
            filterOpen
              ? "filter-sidebar mobile-filter-open"
              : "filter-sidebar"
          }
        >

          <div className="filter-heading">

            <div>
              <h2>Filters</h2>
              <p>Find your perfect ride</p>
            </div>

            <div className="filter-heading-actions">

              <button
                className="reset-btn"
                onClick={resetFilters}
              >
                Reset
              </button>

              <button
                className="mobile-filter-close"
                onClick={() => setFilterOpen(false)}
                aria-label="Close filters"
              >
                ✕
              </button>

            </div>

          </div>

          <div className="filter-controls">

            {/* PRICE PER HOUR */}

            <div className="filter-control filter-price-control">

              <label>Price / hour</label>

              <div className="price-control-value">
                ₹{hourlyPrice}
              </div>

              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={hourlyPrice}
                onChange={(e) =>
                  setHourlyPrice(Number(e.target.value))
                }
              />

              <div className="range-labels">
                <span>₹10</span>
                <span>₹100+</span>
              </div>

            </div>


            {/* PRICE PER DAY */}

            <div className="filter-control filter-price-control">

              <label>Price / day</label>

              <div className="price-control-value">
                ₹{dailyPrice}
              </div>

              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={dailyPrice}
                onChange={(e) =>
                  setDailyPrice(Number(e.target.value))
                }
              />

              <div className="range-labels">
                <span>₹50</span>
                <span>₹500+</span>
              </div>

            </div>


            {/* RATING */}

            <div className="filter-control">

              <label>Rating</label>

              <div className="rating-options">

                {[0, 3, 4, 4.5].map((value) => (

                  <button
                    key={value}
                    className={
                      rating === value
                        ? "rating-option active"
                        : "rating-option"
                    }
                    onClick={() => setRating(value)}
                  >
                    {value === 0
                      ? "All"
                      : <>★ {value}+</>
                    }
                  </button>

                ))}

              </div>

            </div>


            {/* LOCATION */}

            <div className="filter-control">

              <label>Location</label>

              <select
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value)
                }
              >

                <option value="All">
                  All Locations
                </option>

                {locations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}

              </select>

            </div>


            {/* CYCLE TYPE */}

            <div className="filter-control">

              <label>Gear Type</label>

              <div className="gear-options">

                <button
                  className={
                    geared === "All"
                      ? "gear-btn active"
                      : "gear-btn"
                  }
                  onClick={() => setGeared("All")}
                >
                  All
                </button>

                <button
                  className={
                    geared === "Geared"
                      ? "gear-btn active"
                      : "gear-btn"
                  }
                  onClick={() => setGeared("Geared")}
                >
                  ⚙ Geared
                </button>

                <button
                  className={
                    geared === "Non-Geared"
                      ? "gear-btn active"
                      : "gear-btn"
                  }
                  onClick={() => setGeared("Non-Geared")}
                >
                  ○ Non-Geared
                </button>

              </div>

            </div>

          </div>

        </aside>

        <button
          className={
            filterOpen
              ? "mobile-filter-backdrop open"
              : "mobile-filter-backdrop"
          }
          onClick={() => setFilterOpen(false)}
          aria-label="Close filters"
          aria-hidden={!filterOpen}
          type="button"
        />

        {/* =================================
            CYCLE CONTENT
        ================================= */}

        <main className="cycle-content">

          {/* =================================
              MOBILE FILTER TRIGGER
              Filter button stays on the LEFT.
          ================================= */}

          <div className="mobile-filter-row">

            <button
              className="mobile-filter-button"
              onClick={() => setFilterOpen(true)}
              type="button"
            >
              <span className="filter-button-icon">☷</span>
              <span>Filters</span>

              {activeFilterCount > 0 && (
                <span className="mobile-filter-count">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <span className="mobile-result-count">
              {loading
                ? "Loading..."
                : `${filteredCycles.length} available`
              }
            </span>

          </div>


          <div className="content-header">

            <div className="content-title-group">

              <p className="content-small-title">
                NITK CYCLE SHARING
              </p>

              <h1>Browse Cycles</h1>

              <p>
                Find an available cycle and start your ride.
              </p>

            </div>

            <div className="content-tools">

              <div className="cycle-count">
                {loading
                  ? "Loading..."
                  : `${filteredCycles.length} cycles found`
                }
              </div>

            </div>

          </div>

          <div className="mobile-result-row">
            <span>
              {loading
                ? "Loading cycles..."
                : `${filteredCycles.length} available`
              }
            </span>

            <span className="mobile-sort-label">
              Sort by <strong>Newest</strong> ▾
            </span>
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

                    <article
                      className="cycle-card"
                      key={cycle.id}
                    >

                      {/* 1. CYCLE IMAGE + AVAILABILITY */}

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

                        <span
                          className={
                            cycle.availabilityPriority === 0
                              ? "available-badge"
                              : "availability-badge other"
                          }
                        >
                          {formatAvailabilityStatus(
                            cycle.availabilityStatus
                          )}
                        </span>

                        <button
                          className="favorite-btn"
                          type="button"
                          aria-label={`Favorite ${cycle.brand}`}
                        >
                          ♡
                        </button>

                      </div>


                      {/* 2. CARD INFORMATION */}

                      <div className="cycle-details">

                        <div className="cycle-card-main">

                          {/* 2. CYCLE PRICE */}

                          <div className="cycle-title-row">

                            <div className="cycle-name">

                              <h2>{cycle.brand}</h2>

                              {cycle.model && (
                                <span className="cycle-model">
                                  {cycle.model}
                                </span>
                              )}

                              <div className="cycle-price-line">

                                <strong>
                                  ₹{cycle.hourlyPrice}
                                </strong>

                                <span>/hr</span>

                                <i>|</i>

                                <strong>
                                  ₹{cycle.dailyPrice}
                                </strong>

                                <span>/day</span>

                              </div>

                            </div>

                          </div>


                          {/* 3. CYCLE LOCATION */}

                          <p className="cycle-location">
                            <span className="location-icon">⌖</span>
                            {cycle.location}
                          </p>


                          {/* 4. OWNER NAME + OWNER LOCATION */}

                          <div className="owner-row">

                            <div className="owner-avatar">
                              {cycle.ownerName
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="owner-details">

                              <strong>
                                {cycle.ownerName}
                              </strong>

                              <span>
                                <span className="location-icon">⌖</span>
                                {cycle.ownerLocation}
                              </span>

                            </div>

                          </div>

                        </div>


                        {/* 5. RATING */}

                        <div className="cycle-rating-block">

                          <span className="rating-star">
                            ★
                          </span>

                          <strong>
                            {cycle.rating > 0
                              ? cycle.rating
                              : "New"}
                          </strong>

                          {cycle.rating > 0 && (
                            <span className="rating-count">
                              ({cycle.review_count ?? cycle.reviews ?? 0})
                            </span>
                          )}

                        </div>


                        {/* 6. VIEW DETAILS */}

                        <button
                          className="rent-btn"
                          onClick={() =>
                            onViewDetails(cycle)
                          }
                        >
                          View Details
                        </button>

                      </div>

                    </article>

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

// import React, { useEffect, useState } from "react";
// import "./HomePageRental.css";
// import { supabase } from "./supabase";

// import NotificationBell from "./NotificationBell";
// import applogo from "./assets/UGO_logo.jpeg";

// function Home({ onProfile, BackToChoice, onViewDetails, onNotifications }) {
//   // =========================================
//   // CYCLE DATA
//   // =========================================

//   const [cycles, setCycles] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // =========================================
//   // GET CYCLES FROM SUPABASE
//   // =========================================

//   useEffect(() => {
//     const fetchCycles = async () => {
//       setLoading(true);
//       setError("");

//       const { data, error } = await supabase
//         .from("cycles")
//         .select(`
//           *,
//           cycle_images (
//             image_url,
//             display_order
//           )
//         `)
//         .eq("status", "available")
//         .order("created_at", { ascending: false });

//       if (error) {
//         console.error("Error fetching cycles:", error);

//         setError("Unable to load cycles.");
//         setCycles([]);
//         setLoading(false);

//         return;
//       }

//       // Convert Supabase data into the format
//       // used by the existing UI

//       const formattedCycles = (data || []).map((cycle) => {
//         const sortedImages = [...(cycle.cycle_images || [])].sort(
//           (a, b) =>
//             (a.display_order ?? 0) -
//             (b.display_order ?? 0)
//         );

//         return {
//           // REAL SUPABASE UUID
//           id: cycle.id,

//           brand:
//             cycle.brand ||
//             cycle.title ||
//             "Cycle",

//           model:
//             cycle.model ||
//             "",

//           image:
//             sortedImages.length > 0
//               ? supabase.storage
//                   .from("cycle-images")
//                   .getPublicUrl(
//                     sortedImages[0].image_url
//                   ).data.publicUrl
//               : null,

//           images: sortedImages.map((image) => {
//             const { data } = supabase.storage
//               .from("cycle-images")
//               .getPublicUrl(image.image_url);

//             return data.publicUrl;
//           }),

//           hourlyPrice:
//             cycle.price_per_hour ?? 0,

//           dailyPrice:
//             cycle.price_per_day ?? 0,

//           location:
//             cycle.location ||
//             "Location not specified",

//           description:
//             cycle.description ||
//             "",

//           cycle_type:
//             cycle.cycle_type ||
//             "",

//           condition:
//             cycle.condition ||
//             "",

//           price_per_hour:
//             cycle.price_per_hour ?? 0,

//           price_per_day:
//             cycle.price_per_day ?? 0,

//           // Optional owner/rating fields are read when they
//           // are present in the existing cycles row. No new
//           // database connection/query is introduced.
//           rating:
//             cycle.rating ??
//             cycle.owner_rating ??
//             0,

//           ownerName:
//             cycle.owner_name ||
//             cycle.ownerName ||
//             "NITK Owner",

//           ownerLocation:
//             cycle.owner_location ||
//             cycle.ownerLocation ||
//             cycle.location ||
//             "NITK",

//           // Geared filter
//           geared:
//             cycle.cycle_type?.toLowerCase() === "gear" ||
//             cycle.cycle_type?.toLowerCase() === "geared",

//           status:
//             cycle.status,

//           is_verified:
//             cycle.is_verified,

//           owner_id:
//             cycle.owner_id,
//         };
//       });

//       setCycles(formattedCycles);
//       setLoading(false);
//     };

//     fetchCycles();
//   }, []);

//   // =========================================
//   // FILTER STATES
//   // =========================================

//   const [search, setSearch] = useState("");

//   const [hourlyPrice, setHourlyPrice] =
//     useState(100);

//   const [dailyPrice, setDailyPrice] =
//     useState(500);

//   const [rating, setRating] =
//     useState(0);

//   const [location, setLocation] =
//     useState("All");

//   const [geared, setGeared] =
//     useState("All");

//   // Mobile filter drawer
//   const [filterOpen, setFilterOpen] =
//     useState(false);

//   // =========================================
//   // FILTER LOGIC
//   // =========================================

//   const filteredCycles = cycles.filter((cycle) => {
//     const searchText =
//       search.toLowerCase().trim();

//     const searchMatch =
//       cycle.brand
//         .toLowerCase()
//         .includes(searchText) ||

//       cycle.location
//         .toLowerCase()
//         .includes(searchText) ||

//       cycle.model
//         .toLowerCase()
//         .includes(searchText);

//     const hourlyMatch =
//       cycle.hourlyPrice <= hourlyPrice;

//     const dailyMatch =
//       cycle.dailyPrice <= dailyPrice;

//     const ratingMatch =
//       cycle.rating >= rating;

//     const locationMatch =
//       location === "All" ||
//       cycle.location === location;

//     const gearedMatch =
//       geared === "All" ||
//       (geared === "Geared" && cycle.geared) ||
//       (geared === "Non-Geared" && !cycle.geared);

//     return (
//       searchMatch &&
//       hourlyMatch &&
//       dailyMatch &&
//       ratingMatch &&
//       locationMatch &&
//       gearedMatch
//     );
//   });

//   // =========================================
//   // RESET FILTERS
//   // =========================================

//   const resetFilters = () => {
//     setHourlyPrice(100);
//     setDailyPrice(500);
//     setRating(0);
//     setLocation("All");
//     setGeared("All");
//     setSearch("");
//   };

//   // =========================================
//   // DYNAMIC LOCATIONS
//   // =========================================

//   const locations = [
//     ...new Set(
//       cycles
//         .map((cycle) => cycle.location)
//         .filter(Boolean)
//     ),
//   ];

//   const activeFilterCount = [
//     hourlyPrice < 100,
//     dailyPrice < 500,
//     rating > 0,
//     location !== "All",
//     geared !== "All",
//   ].filter(Boolean).length;

//   // =========================================
//   // PAGE
//   // =========================================

//   return (
//     <div className="home-page">

//       {/* =================================
//           NAVBAR
//       ================================= */}

//       <nav className="home-navbar">

//         {/* LOGO */}

//         <div className="home-logo">

//           <div className="home-logo-icon">
//             <img
//               src = {applogo}
//               alt = "NITK Cycle Sharing"
//             />
//           </div>

//           <div>
//             <h2>NITK Cycle</h2>

//             <span>
//               SHARING
//             </span>
//           </div>

//         </div>


//         {/* SEARCH */}

//         <div className="cycle-search">

//           <span className="search-icon">
//             🔍
//           </span>

//           <input
//             type="text"
//             placeholder="Search cycles, brands or locations..."
//             value={search}
//             onChange={(e) =>
//               setSearch(e.target.value)
//             }
//           />

//         </div>


//         {/* NAVIGATION */}

//         <div className="navbar-actions">

//           <NotificationBell onClick={onNotifications} />

//           <button
//             className="nav-home-btn"
//             onClick={BackToChoice}
//           >
//             Home
//           </button>

//           <button
//             className="nav-profile-btn"
//             onClick={onProfile}
//           >
//             Profile
//           </button>

//         </div>

//       </nav>


//       {/* =================================
//           MAIN CONTENT
//       ================================= */}

//       <div className="home-main">

//         {/* =================================
//             FILTERS
//             Desktop: compact horizontal filter row.
//             Mobile: hidden until Filters is tapped.
//         ================================= */}

//         <aside
//           className={
//             filterOpen
//               ? "filter-sidebar mobile-filter-open"
//               : "filter-sidebar"
//           }
//         >

//           <div className="filter-heading">

//             <div>
//               <h2>Filters</h2>
//               <p>Find your perfect ride</p>
//             </div>

//             <div className="filter-heading-actions">

//               <button
//                 className="reset-btn"
//                 onClick={resetFilters}
//               >
//                 Reset
//               </button>

//               <button
//                 className="mobile-filter-close"
//                 onClick={() => setFilterOpen(false)}
//                 aria-label="Close filters"
//               >
//                 ✕
//               </button>

//             </div>

//           </div>

//           <div className="filter-controls">

//             {/* PRICE PER HOUR */}

//             <div className="filter-control filter-price-control">

//               <label>Price / hour</label>

//               <div className="price-control-value">
//                 ₹{hourlyPrice}
//               </div>

//               <input
//                 type="range"
//                 min="10"
//                 max="100"
//                 step="5"
//                 value={hourlyPrice}
//                 onChange={(e) =>
//                   setHourlyPrice(Number(e.target.value))
//                 }
//               />

//               <div className="range-labels">
//                 <span>₹10</span>
//                 <span>₹100+</span>
//               </div>

//             </div>


//             {/* PRICE PER DAY */}

//             <div className="filter-control filter-price-control">

//               <label>Price / day</label>

//               <div className="price-control-value">
//                 ₹{dailyPrice}
//               </div>

//               <input
//                 type="range"
//                 min="50"
//                 max="500"
//                 step="10"
//                 value={dailyPrice}
//                 onChange={(e) =>
//                   setDailyPrice(Number(e.target.value))
//                 }
//               />

//               <div className="range-labels">
//                 <span>₹50</span>
//                 <span>₹500+</span>
//               </div>

//             </div>


//             {/* RATING */}

//             <div className="filter-control">

//               <label>Rating</label>

//               <div className="rating-options">

//                 {[0, 3, 4, 4.5].map((value) => (

//                   <button
//                     key={value}
//                     className={
//                       rating === value
//                         ? "rating-option active"
//                         : "rating-option"
//                     }
//                     onClick={() => setRating(value)}
//                   >
//                     {value === 0
//                       ? "All"
//                       : <>★ {value}+</>
//                     }
//                   </button>

//                 ))}

//               </div>

//             </div>


//             {/* LOCATION */}

//             <div className="filter-control">

//               <label>Location</label>

//               <select
//                 value={location}
//                 onChange={(e) =>
//                   setLocation(e.target.value)
//                 }
//               >

//                 <option value="All">
//                   All Locations
//                 </option>

//                 {locations.map((item) => (
//                   <option key={item} value={item}>
//                     {item}
//                   </option>
//                 ))}

//               </select>

//             </div>


//             {/* CYCLE TYPE */}

//             <div className="filter-control">

//               <label>Gear Type</label>

//               <div className="gear-options">

//                 <button
//                   className={
//                     geared === "All"
//                       ? "gear-btn active"
//                       : "gear-btn"
//                   }
//                   onClick={() => setGeared("All")}
//                 >
//                   All
//                 </button>

//                 <button
//                   className={
//                     geared === "Geared"
//                       ? "gear-btn active"
//                       : "gear-btn"
//                   }
//                   onClick={() => setGeared("Geared")}
//                 >
//                   ⚙ Geared
//                 </button>

//                 <button
//                   className={
//                     geared === "Non-Geared"
//                       ? "gear-btn active"
//                       : "gear-btn"
//                   }
//                   onClick={() => setGeared("Non-Geared")}
//                 >
//                   ○ Non-Geared
//                 </button>

//               </div>

//             </div>

//           </div>

//         </aside>

//         <button
//           className="mobile-filter-backdrop"
//           onClick={() => setFilterOpen(false)}
//           aria-label="Close filters"
//           aria-hidden={!filterOpen}
//         />

//         {/* =================================
//             CYCLE CONTENT
//         ================================= */}

//         <main className="cycle-content">

//           <div className="content-header">

//             <div className="content-title-group">

//               <p className="content-small-title">
//                 NITK CYCLE SHARING
//               </p>

//               <h1>Browse Cycles</h1>

//               <p>
//                 Find an available cycle and start your ride.
//               </p>

//             </div>

//             <div className="content-tools">

//               <div className="cycle-count">
//                 {loading
//                   ? "Loading..."
//                   : `${filteredCycles.length} cycles found`
//                 }
//               </div>

//               <button
//                 className="mobile-filter-button"
//                 onClick={() => setFilterOpen(true)}
//               >
//                 <span>☷</span>
//                 <span>Filters</span>

//                 {activeFilterCount > 0 && (
//                   <span className="mobile-filter-count">
//                     {activeFilterCount}
//                   </span>
//                 )}
//               </button>

//             </div>

//           </div>

//           <div className="mobile-result-row">
//             <span>
//               {loading
//                 ? "Loading cycles..."
//                 : `${filteredCycles.length} available`
//               }
//             </span>

//             <span className="mobile-sort-label">
//               Sort by <strong>Newest</strong> ▾
//             </span>
//           </div>


//           {/* =================================
//               LOADING
//           ================================= */}

//           {loading && (

//             <div className="no-results">

//               <div>
//                 🚲
//               </div>

//               <h2>
//                 Loading cycles...
//               </h2>

//               <p>
//                 Getting available cycles from NITK
//                 Cycle Sharing.
//               </p>

//             </div>

//           )}


//           {/* =================================
//               ERROR
//           ================================= */}

//           {!loading && error && (

//             <div className="no-results">

//               <div>
//                 ⚠️
//               </div>

//               <h2>
//                 Unable to load cycles
//               </h2>

//               <p>
//                 {error}
//               </p>

//               <button
//                 onClick={() =>
//                   window.location.reload()
//                 }
//               >
//                 Try Again
//               </button>

//             </div>

//           )}


//           {/* =================================
//               CYCLE CARDS
//           ================================= */}

//           {!loading && !error && (

//             <div className="cycle-grid">

//               {filteredCycles.length > 0 ? (

//                 filteredCycles.map(
//                   (cycle) => (

//                     <article
//                       className="cycle-card"
//                       key={cycle.id}
//                     >

//                       {/* 1. CYCLE IMAGE + AVAILABILITY */}

//                       <div className="cycle-image">

//                         {cycle.image ? (
//                           <img
//                             src={cycle.image}
//                             alt={cycle.brand}
//                           />
//                         ) : (
//                           <div className="cycle-placeholder">
//                             🚲
//                           </div>
//                         )}

//                         <span className="available-badge">
//                           Available
//                         </span>

//                         <button
//                           className="favorite-btn"
//                           type="button"
//                           aria-label={`Favorite ${cycle.brand}`}
//                         >
//                           ♡
//                         </button>

//                       </div>


//                       {/* 2. CARD INFORMATION */}

//                       <div className="cycle-details">

//                         <div className="cycle-card-main">

//                           {/* 2. CYCLE PRICE */}

//                           <div className="cycle-title-row">

//                             <div className="cycle-name">

//                               <h2>{cycle.brand}</h2>

//                               {cycle.model && (
//                                 <span className="cycle-model">
//                                   {cycle.model}
//                                 </span>
//                               )}

//                               <div className="cycle-price-line">

//                                 <strong>
//                                   ₹{cycle.hourlyPrice}
//                                 </strong>

//                                 <span>/hr</span>

//                                 <i>|</i>

//                                 <strong>
//                                   ₹{cycle.dailyPrice}
//                                 </strong>

//                                 <span>/day</span>

//                               </div>

//                             </div>

//                           </div>


//                           {/* 3. CYCLE LOCATION */}

//                           <p className="cycle-location">
//                             <span className="location-icon">⌖</span>
//                             {cycle.location}
//                           </p>


//                           {/* 4. OWNER NAME + OWNER LOCATION */}

//                           <div className="owner-row">

//                             <div className="owner-avatar">
//                               {cycle.ownerName
//                                 .charAt(0)
//                                 .toUpperCase()}
//                             </div>

//                             <div className="owner-details">

//                               <strong>
//                                 {cycle.ownerName}
//                               </strong>

//                               <span>
//                                 <span className="location-icon">⌖</span>
//                                 {cycle.ownerLocation}
//                               </span>

//                             </div>

//                           </div>

//                         </div>


//                         {/* 5. RATING */}

//                         <div className="cycle-rating-block">

//                           <span className="rating-star">
//                             ★
//                           </span>

//                           <strong>
//                             {cycle.rating > 0
//                               ? cycle.rating
//                               : "New"}
//                           </strong>

//                           {cycle.rating > 0 && (
//                             <span className="rating-count">
//                               ({cycle.review_count ?? cycle.reviews ?? 0})
//                             </span>
//                           )}

//                         </div>


//                         {/* 6. VIEW DETAILS */}

//                         <button
//                           className="rent-btn"
//                           onClick={() =>
//                             onViewDetails(cycle)
//                           }
//                         >
//                           View Details
//                         </button>

//                       </div>

//                     </article>

//                   )

//                 )

//               ) : (

//                 <div className="no-results">

//                   <div>
//                     🚲
//                   </div>

//                   <h2>
//                     No cycles found
//                   </h2>

//                   <p>
//                     Try changing your filters or search.
//                   </p>

//                   <button
//                     onClick={resetFilters}
//                   >
//                     Clear Filters
//                   </button>

//                 </div>

//               )}

//             </div>

//           )}

//         </main>

//       </div>


//       {/* =================================
//           FOOTER
//       ================================= */}

//       <footer className="home-footer">

//         <div className="footer-brand">

//           <h2>
//             🚲 NITK Cycle Sharing
//           </h2>

//           <p>
//             Affordable and convenient cycle
//             sharing for the NITK community.
//           </p>

//         </div>

// {/* 
//         <div className="footer-links">

//           <a href="#home">
//             Home
//           </a>

//           <a href="#cycles">
//             Cycles
//           </a>

//           <a href="#about">
//             About
//           </a>

//           <a href="#help">
//             Help
//           </a>

//         </div> */}


//         <div className="footer-copy">

//           <p>
//             © 2026 NITK Cycle Sharing
//           </p>

//         </div>

//       </footer>

//     </div>
//   );
// }

// export default Home;