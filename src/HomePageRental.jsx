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
      .replace(/\b\w/g, (letter) =>
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
  // FETCH + SORT RENTAL CYCLES
  // =========================================
  // HomePageRental owns all cycle data used by this page.
  // Strict priority:
  // 1. availability (available first)
  // 2. price ascending
  // 3. user -> cycle distance ascending
  // 4. cycle -> owner distance ascending
  // 5. rating descending
  // =========================================

  useEffect(() => {
    let mounted = true;

    const fetchCycles = async () => {
      setLoading(true);
      setError("");

      try {
        // 1. cycle_availability is the source of the rental list.
        const { data: availabilityRows, error: availabilityError } =
          await supabase
            .from("cycle_availability")
            .select("*");

        console.log("Availability rows: ",availabilityRows);

        if (availabilityError) throw availabilityError;

        if (!availabilityRows?.length) {
          if (mounted) setCycles([]);
          return;
        }

        // 2. Get only cycles represented in cycle_availability.
        const cycleIds = [
          ...new Set(
            availabilityRows
              .map(getAvailabilityCycleId)
              .filter(Boolean)
          ),
        ];

        console.log("Cycle ids: ", cycleIds);

        if (!cycleIds.length) {
          if (mounted) setCycles([]);
          return;
        }

        
const {
          data: cycleRows,
          error: cycleError,
        } = await supabase
          .from("cycles")
          .select("*")
          .in("id", cycleIds);

        if (cycleError) {
          throw cycleError;
        }

        console.log("Fetched cycles:", cycleRows);


        // =========================================================
        // FETCH CYCLE IMAGES SEPARATELY
        // =========================================================

        const {
          data: cycleImageRows,
          error: cycleImageError,
        } = await supabase
          .from("cycle_images")
          .select(`
            id,
            cycle_id,
            image_url,
            display_order
          `)
          .in("cycle_id", cycleIds)
          .order("display_order", {
            ascending: true,
          });

        if (cycleImageError) {
          throw cycleImageError;
        }

        console.log(
          "Fetched cycle images:",
          cycleImageRows
        );


        // =========================================================
        // GROUP IMAGES BY CYCLE ID
        // =========================================================

        const imagesByCycleId = new Map();

        (cycleImageRows || []).forEach((image) => {

          if (!imagesByCycleId.has(image.cycle_id)) {
            imagesByCycleId.set(
              image.cycle_id,
              []
            );
          }

          imagesByCycleId
            .get(image.cycle_id)
            .push(image);
        });



        if (cycleError) throw cycleError;

        const cycleById = new Map(
          (cycleRows || []).map((cycle) => [cycle.id, cycle])
        );

        // 3. Get current user's profile for Rule #3.
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let userProfile = null;

        if (user) {
          const { data: profile, error: profileError } =
            await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .maybeSingle();

          if (profileError) {
            console.warn(
              "Unable to fetch user profile for cycle sorting:",
              profileError
            );
          } else {
            userProfile = profile;
          }
        }

        const userCoordinates = getCoordinates(userProfile);

        console.log("coordibnates: ", userCoordinates);

        // 4. Fetch owners for Rule #4.
        const ownerIds = [
          ...new Set(
            (cycleRows || [])
              .map((cycle) => cycle.owner_id)
              .filter(Boolean)
          ),
        ];

        const ownerProfilesById = new Map();

        if (ownerIds.length) {
          const { data: ownerProfiles, error: ownerProfilesError } =
            await supabase
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
              ownerProfilesById.set(profile.id, profile);
            });
          }
        }

        const formattedCycles = availabilityRows
          .map((availability) => {
            const cycleId = getAvailabilityCycleId(availability);
            const cycle = cycleById.get(cycleId);

            console.log("cycle: ", cycle);

            if (!cycle) return null;

            const ownerProfile = ownerProfilesById.get(cycle.owner_id);

            console.log("ownerprofile: ", ownerProfile);

            // cycle_availability is the single source of truth
            // for the status shown on HomePageRental.
            const effectiveStatus =
              getAvailabilityStatus(availability);

            const availabilityPriority =
              effectiveStatus === "available" ? 0 : 1;

            // Rule #2: price from cycles.
            const hourlyPrice = Number(
              cycle.price_per_hour ?? cycle.hourly_price ?? 0
            );
            const dailyPrice = Number(
              cycle.price_per_day ?? cycle.daily_price ?? 0
            );

            // Rule #3: cycle location MUST come from cycle_availability.
            const cycleCoordinates = getCoordinates(availability);
            const userDistance = calculateDistanceKm(
              userCoordinates,
              cycleCoordinates
            );

            // Rule #4: owner location comes from profiles.
            const ownerCoordinates = getCoordinates(ownerProfile);
            const ownerDistance = calculateDistanceKm(
              cycleCoordinates,
              ownerCoordinates
            );

             const cycleImages =
              imagesByCycleId.get(
                cycle.id
              ) || [];


            // ---------------------------------------------
            // Images are already ordered by display_order
            // ---------------------------------------------

            const sortedImages =
              [...cycleImages].sort(
                (a, b) =>
                  (a.display_order ?? 0) -
                  (b.display_order ?? 0)
              );


            // ---------------------------------------------
            // Convert Supabase Storage paths to URLs
            // ---------------------------------------------

            const imageUrls =
              sortedImages.map((image) => {

                const {
                  data: publicUrlData,
                } = supabase.storage
                  .from("cycle-images")
                  .getPublicUrl(
                    image.image_url
                  );

                return publicUrlData.publicUrl;
              });

            
            // Rule #5: rating.
            const rating = Number(
              cycle.rating ??
                cycle.owner_rating ??
                ownerProfile?.rating ??
                0
            );

            return {
              id: cycle.id,
              brand: cycle.brand || cycle.title || "Cycle",
              model: cycle.model || "",
              image: imageUrls[0] || null,
              images: imageUrls,
              description: cycle.description || "",
              condition: cycle.condition || "",
              cycle_type: cycle.cycle_type || "",
              hourlyPrice,
              dailyPrice,
              price_per_hour: hourlyPrice,
              price_per_day: dailyPrice,
              location:
                availability.location ||
                availability.location_name ||
                availability.pickup_location ||
                availability.hostel ||
                cycle.location ||
                "Location not specified",
              owner_id: cycle.owner_id,
              ownerName:
                ownerProfile?.full_name?.trim() ||
                ownerProfile?.email?.split("@")[0] ||
                "NITK Owner",
              ownerLocation: ownerProfile?.location || "NITK",
              rating,
              review_count: Number(
                cycle.review_count ??
                  cycle.reviews ??
                  ownerProfile?.review_count ??
                  0
              ),
              geared: ["gear", "geared"].includes(
                String(cycle.cycle_type || "").toLowerCase()
              ),
              // Keep all status fields synchronized with
              // cycle_availability.status.
              status: effectiveStatus,
              cycleStatus: effectiveStatus,
              is_verified: cycle.is_verified,
              availabilityStatus: effectiveStatus,
              availabilityPriority,
              userDistance,
              ownerDistance,
            };
          })
          .filter(Boolean);
          
          console.log("formatted cycles before sorting: ", formattedCycles);

        // STRICT lexicographic sort: later rules only run when
        // every preceding rule is equal.
        formattedCycles.sort((a, b) => {
          if (a.availabilityPriority !== b.availabilityPriority) {
            return a.availabilityPriority - b.availabilityPriority;
          }

          if (a.hourlyPrice !== b.hourlyPrice) {
            return a.hourlyPrice - b.hourlyPrice;
          }

          if (a.userDistance !== b.userDistance) {
            return a.userDistance - b.userDistance;
          }

          if (a.ownerDistance !== b.ownerDistance) {
            return a.ownerDistance - b.ownerDistance;
          }

          if (a.rating !== b.rating) {
            return b.rating - a.rating;
          }

          return 0;
        });

        console.log("formatted cycles after sorting: ", formattedCycles);

        if (mounted) setCycles(formattedCycles);
      } catch (fetchError) {
        console.error("Error fetching rental cycles:", fetchError);

        if (mounted) {
          setCycles([]);
          setError("Unable to load cycles.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCycles();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================
  // REALTIME CYCLE STATUS UPDATES
  // =========================================
  // cycle_availability is the only source of truth for the
  // status displayed on HomePageRental.
  useEffect(() => {
    let mounted = true;

    const refreshCycleStatuses = async () => {
      if (!mounted) return;

      try {
        const {
          data: availabilityRows,
          error: availabilityError,
        } = await supabase
          .from("cycle_availability")
          .select("*");

        if (availabilityError) {
          console.warn(
            "Unable to refresh cycle availability:",
            availabilityError
          );
          return;
        }

        if (!mounted) return;

        setCycles((previousCycles) => {
          const updatedCycles = previousCycles.map((cycle) => {
            const availability = (availabilityRows || []).find(
              (row) =>
                String(getAvailabilityCycleId(row)) ===
                String(cycle.id)
            );

            if (!availability) {
              return cycle;
            }

            const nextStatus =
              getAvailabilityStatus(availability);

            return {
              ...cycle,
              status: nextStatus,
              cycleStatus: nextStatus,
              availabilityStatus: nextStatus,
              availabilityPriority:
                nextStatus === "available" ? 0 : 1,
            };
          });

          return [...updatedCycles].sort((a, b) => {
            if (
              a.availabilityPriority !==
              b.availabilityPriority
            ) {
              return (
                a.availabilityPriority -
                b.availabilityPriority
              );
            }

            if (a.hourlyPrice !== b.hourlyPrice) {
              return a.hourlyPrice - b.hourlyPrice;
            }

            if (a.userDistance !== b.userDistance) {
              return a.userDistance - b.userDistance;
            }

            if (a.ownerDistance !== b.ownerDistance) {
              return a.ownerDistance - b.ownerDistance;
            }

            if (a.rating !== b.rating) {
              return b.rating - a.rating;
            }

            return 0;
          });
        });
      } catch (statusError) {
        console.warn(
          "Dynamic cycle availability refresh failed:",
          statusError
        );
      }
    };

    const availabilityChannel = supabase
      .channel("homepage-cycle-availability-status")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cycle_availability",
        },
        () => {
          refreshCycleStatuses();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(availabilityChannel);
    };
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
    const searchText = String(search || "")
      .trim()
      .toLowerCase();

    const searchableText = [
      cycle.brand,
      cycle.model,
      cycle.location,
      cycle.condition,
      cycle.cycle_type,
      cycle.ownerName,
      cycle.ownerLocation,
      cycle.geared ? "geared" : "non-geared",
      cycle.geared ? "gear" : "non gear",
      cycle.availabilityStatus,
      cycle.status,
      cycle.hourlyPrice,
      cycle.dailyPrice,
      cycle.rating,
    ]
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          value !== ""
      )
      .map((value) => String(value))
      .join(" ")
      .toLowerCase();

    const searchMatch =
      searchText === "" ||
      searchableText.includes(searchText);

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
                : `${filteredCycles.length} cycles`
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
                : `${filteredCycles.length} cycles`
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
                        className={`availability-badge ${
                          cycle.availabilityStatus === "available"
                            ? "available"
                            : cycle.availabilityStatus === "rented"
                            ? "rented"
                            : cycle.availabilityStatus === "unavailable"
                            ? "unavailable"
                            : cycle.availabilityStatus === "maintenance"
                            ? "maintenance"
                            : cycle.availabilityStatus === "booked"
                            ? "booked"
                            : "other"
                        }`}
                      >
                        {formatAvailabilityStatus(cycle.availabilityStatus)}
                      </span>

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

                          {/* 4. GEAR TYPE */}

                        <div
                          className={
                            cycle.geared
                              ? "cycle-gear-badge geared"
                              : "cycle-gear-badge non-geared"
                          }
                        >
                          {cycle.geared ? "⚙ Geared" : "○ Non-Geared"}
                        </div>

                          {/* 5. OWNER NAME + OWNER LOCATION */}

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