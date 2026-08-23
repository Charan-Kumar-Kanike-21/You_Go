import React, { useEffect, useState } from "react";
import "./BookingPage.css";
import { supabase } from "./supabase";

function BookingPage({
  cycle,
  onBack,
  onOwnerDetails,
  onCycleSelect,
  activeFilters,
  onBackToLogin,
  onBookingSuccess,
}) {
  const [hours, setHours] = useState("0");
  const [days, setDays] = useState("0");
  const [booking, setBooking] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [currentImage, setCurrentImage] = useState(0);
  const [suggestedCycles, setSuggestedCycles] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const numericHours = Number(hours) || 0;
  const numericDays = Number(days) || 0;

  const pricePerHour = Number(cycle?.price_per_hour) || 0;
  const pricePerDay = Number(cycle?.price_per_day) || 0;

  const hourlyAmount = numericHours * pricePerHour;
  const dailyAmount = numericDays * pricePerDay;
  const totalPrice = hourlyAmount + dailyAmount;

  // =========================================================
  // RELATED CYCLE SUGGESTIONS
  // =========================================================
  // Suggestions are based on the cycle currently being viewed
  // and, when supplied by the parent, the filters used by the user.
  // Only verified + currently available cycles are suggested.
  const getText = (value) =>
    String(value ?? "").trim().toLowerCase();

  const getCycleImages = (item) => {
    if (Array.isArray(item?.images) && item.images.length > 0) {
      return item.images;
    }

    return item?.image ? [item.image] : [];
  };

  const getGearValue = (item) =>
    getText(
      item?.gear_type ??
        item?.gear ??
        item?.gearType ??
        item?.cycle_gear ??
        item?.transmission
    );

  const getAvailabilityValue = (item) =>
    getText(
      item?.availability_status ??
        item?.availability ??
        item?.status
    );

  const isCycleAvailable = (item) => {
    const status = getText(item?.status);
    return status === "available";
  };

  const filterType = getText(
    activeFilters?.cycle_type ??
      activeFilters?.type ??
      activeFilters?.cycleType
  );

  const filterGear = getText(
    activeFilters?.gear_type ??
      activeFilters?.gear ??
      activeFilters?.gearType
  );

  const filterLocation = getText(activeFilters?.location);
  const [cycleAvailabilityStatus, setCycleAvailabilityStatus] = useState("available");

  const scoreSuggestion = (item) => {
    let score = 0;

    const currentType = getText(
      cycle?.cycle_type ?? cycle?.type
    );
    const itemType = getText(
      item?.cycle_type ?? item?.type
    );

    const currentGear =
      cycle?.geared === true
        ? "geared"
        : cycle?.geared === false
          ? "non-geared"
          : getGearValue(cycle);

    const itemGear =
      item?.geared === true
        ? "geared"
        : item?.geared === false
          ? "non-geared"
          : getGearValue(item);

    const currentLocation = getText(cycle?.location);
    const itemLocation = getText(item?.location);

    const currentBrand = getText(cycle?.brand);
    const itemBrand = getText(item?.brand);

    const currentCondition = getText(cycle?.condition);
    const itemCondition = getText(item?.condition);

    if (currentType && itemType && currentType === itemType) score += 8;
    if (currentGear && itemGear && currentGear === itemGear) score += 7;
    if (
      currentLocation &&
      itemLocation &&
      currentLocation === itemLocation
    ) score += 6;
    if (currentBrand && itemBrand && currentBrand === itemBrand) score += 4;
    if (
      currentCondition &&
      itemCondition &&
      currentCondition === itemCondition
    ) score += 2;

    const currentRating = Number(cycle?.rating) || 0;
    const itemRating = Number(item?.rating) || 0;
    if (currentRating && itemRating >= currentRating) score += 2;

    const currentHourly = Number(cycle?.price_per_hour) || 0;
    const itemHourly = Number(item?.price_per_hour) || 0;
    if (currentHourly && itemHourly) {
      const difference = Math.abs(currentHourly - itemHourly);
      score += Math.max(0, 4 - difference / Math.max(currentHourly, 1));
    }

    // Match filters if the parent already has them.
    if (filterType && itemType === filterType) score += 10;
    if (filterGear && itemGear === filterGear) score += 10;
    if (filterLocation && itemLocation === filterLocation) score += 10;

    return score;
  };

    useEffect(() => {
      let cancelled = false;

      const loadCycleAvailabilityStatus = async () => {
        if (!cycle?.id) return;

        const { data, error } = await supabase
          .from("cycle_availability")
          .select("status")
          .eq("cycle_id", cycle.id)
          .maybeSingle();

        if (error) {
          console.error(
            "Unable to fetch cycle availability status:",
            error
          );
          return;
        }

        if (!cancelled && data?.status) {
          setCycleAvailabilityStatus(
            String(data.status).trim()
          );
        }
      };

      loadCycleAvailabilityStatus();

      return () => {
        cancelled = true;
      };
    }, [cycle?.id]);

useEffect(() => {
  let cancelled = false;

  const loadSuggestions = async () => {
    if (!cycle?.id) {
      setSuggestedCycles([]);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);

    try {
      // =====================================================
      // 1. GET AVAILABILITY FIRST
      //    This is the SAME source used by HomePageRental.
      // =====================================================

      const {
        data: availabilityRows,
        error: availabilityError,
      } = await supabase
        .from("cycle_availability")
        .select("*");

      if (availabilityError) {
        throw availabilityError;
      }

      console.log(
        "Suggestion availability rows:",
        availabilityRows
      );

      if (!availabilityRows?.length) {
        if (!cancelled) {
          setSuggestedCycles([]);
        }
        return;
      }

      // =====================================================
      // 2. FIND ONLY CURRENTLY AVAILABLE CYCLES
      //
      //    Use the same availability logic as HomePageRental.
      // =====================================================

      const getAvailabilityStatusForSuggestion = (
        availability
      ) => {
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

      const availableRows =
        availabilityRows.filter(
          (availability) =>
            getAvailabilityStatusForSuggestion(
              availability
            ) === "available"
        );

      console.log(
        "Available suggestion rows:",
        availableRows
      );

      if (!availableRows.length) {
        if (!cancelled) {
          setSuggestedCycles([]);
        }
        return;
      }

      // =====================================================
      // 3. GET CYCLE IDS FROM cycle_availability
      // =====================================================

      const candidateIds = [
        ...new Set(
          availableRows
            .map(
              (availability) =>
                availability.cycle_id ??
                availability.cycleId ??
                availability.cycle_uuid ??
                availability.cycleID
            )
            .filter(Boolean)
        ),
      ].filter(
        (id) => id !== cycle.id
      );

      console.log(
        "Suggestion candidate IDs:",
        candidateIds
      );

      if (!candidateIds.length) {
        if (!cancelled) {
          setSuggestedCycles([]);
        }
        return;
      }

      // =====================================================
      // 4. FETCH THE ACTUAL CYCLE DETAILS
      //
      //    Do NOT filter by cycles.status here.
      //    cycle_availability is already telling us that
      //    the cycle is currently available.
      // =====================================================

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
        .in("id", candidateIds);

      if (cycleError) {
        throw cycleError;
      }

      console.log(
        "Suggestion cycle rows:",
        cycleRows
      );

      if (!cycleRows?.length) {
        if (!cancelled) {
          setSuggestedCycles([]);
        }
        return;
      }

      // =====================================================
      // 5. MATCH ONLY ADMIN-VERIFIED CYCLES
      //
      //    Admin approval is represented by is_verified.
      // =====================================================

      const verifiedCycles = cycleRows.filter(
        (item) =>
          item.is_verified === true
      );

      console.log(
        "Verified suggestion cycles:",
        verifiedCycles
      );

      if (!verifiedCycles.length) {
        if (!cancelled) {
          setSuggestedCycles([]);
        }
        return;
      }

      // =====================================================
      // 6. CREATE availability MAP
      // =====================================================

      const availabilityByCycleId =
        new Map();

      availableRows.forEach(
        (availability) => {
          const cycleId =
            availability.cycle_id ??
            availability.cycleId ??
            availability.cycle_uuid ??
            availability.cycleID;

          if (
            cycleId &&
            !availabilityByCycleId.has(cycleId)
          ) {
            availabilityByCycleId.set(
              cycleId,
              availability
            );
          }
        }
      );

      // =====================================================
      // 7. FETCH OWNER PROFILES
      // =====================================================

      const ownerIds = [
        ...new Set(
          verifiedCycles
            .map(
              (item) => item.owner_id
            )
            .filter(Boolean)
        ),
      ];

      const ownerProfilesById =
        new Map();

      if (ownerIds.length) {
        const {
          data: ownerProfiles,
          error: ownerProfilesError,
        } = await supabase
          .from("profiles")
          .select("*")
          .in("id", ownerIds);

        if (ownerProfilesError) {
          console.warn(
            "Unable to fetch suggestion owner profiles:",
            ownerProfilesError
          );
        } else {
          (
            ownerProfiles || []
          ).forEach((profile) => {
            ownerProfilesById.set(
              profile.id,
              profile
            );
          });
        }
      }

      // =====================================================
      // 8. NORMALIZE CYCLES
      // =====================================================

      const normalizedCandidates =
        verifiedCycles
          .filter((item) =>
            availabilityByCycleId.has(
              item.id
            )
          )
          .map((item) => {
            const availability =
              availabilityByCycleId.get(
                item.id
              );

            const ownerProfile =
              ownerProfilesById.get(
                item.owner_id
              );

            // ---------------------------------------------
            // Images
            // ---------------------------------------------

            const sortedImages = [
              ...(item.cycle_images || []),
            ].sort(
              (a, b) =>
                (a.display_order ?? 0) -
                (b.display_order ?? 0)
            );

            const imageUrls =
              sortedImages
                .map((image) => {
                  const {
                    data,
                  } =
                    supabase.storage
                      .from(
                        "cycle-images"
                      )
                      .getPublicUrl(
                        image.image_url
                      );

                  return data?.publicUrl;
                })
                .filter(Boolean);

            // ---------------------------------------------
            // Gear
            // ---------------------------------------------

            const cycleType =
              String(
                item.cycle_type || ""
              )
                .trim()
                .toLowerCase();

            const geared =
              cycleType === "gear" ||
              cycleType === "geared";

            // ---------------------------------------------
            // Owner
            // ---------------------------------------------

            const ownerName =
              ownerProfile?.full_name ||
              ownerProfile?.name ||
              ownerProfile?.email?.split(
                "@"
              )[0] ||
              item.owner_name ||
              item.ownerName ||
              "NITK Owner";

            // ---------------------------------------------
            // Rating
            // ---------------------------------------------

            const rating = Number(
              item.rating ??
                item.owner_rating ??
                ownerProfile?.rating ??
                0
            );

            // ---------------------------------------------
            // Prices
            // ---------------------------------------------

            const hourlyPrice =
              Number(
                item.price_per_hour ??
                  item.hourly_price ??
                  0
              );

            const dailyPrice =
              Number(
                item.price_per_day ??
                  item.daily_price ??
                  0
              );

            // ---------------------------------------------
            // Location
            //
            // cycle_availability is the source.
            // ---------------------------------------------

            const location =
              availability?.location ||
              item.location ||
              "Location not specified";

            return {
              ...item,

              id: item.id,

              brand:
                item.brand ||
                item.title ||
                "Cycle",

              model:
                item.model || "",

              image:
                imageUrls[0] || null,

              images:
                imageUrls,

              location,

              description:
                item.description || "",

              condition:
                item.condition || "",

              cycle_type:
                item.cycle_type || "",

              geared,

              gearLabel:
                geared
                  ? "Geared"
                  : "Non-Geared",

              owner_id:
                item.owner_id,

              ownerName,

              rating,

              review_count:
                Number(
                  item.review_count ??
                    item.reviews ??
                    ownerProfile?.review_count ??
                    0
                ),

              price_per_hour:
                hourlyPrice,

              price_per_day:
                dailyPrice,

              hourlyPrice,

              dailyPrice,

              status:
                "available",

              is_verified:
                item.is_verified,

              availabilityStatus:
                "available",
            };
          });

      console.log(
        "Normalized suggestion candidates:",
        normalizedCandidates
      );

      // =====================================================
      // 9. RANK THE CYCLES
      // =====================================================

      const ranked =
        normalizedCandidates
          .map((item) => ({
            ...item,
            _suggestionScore:
              scoreSuggestion(item),
          }))
          .sort(
            (a, b) =>
              b._suggestionScore -
              a._suggestionScore
          )
          .slice(0, 4);

      console.log(
        "FINAL SUGGESTIONS:",
        ranked
      );

      if (!cancelled) {
        setSuggestedCycles(ranked);
      }

    } catch (error) {
      console.error(
        "Unable to load cycle suggestions:",
        error
      );

      if (!cancelled) {
        setSuggestedCycles([]);
      }

    } finally {
      if (!cancelled) {
        setSuggestionsLoading(false);
      }
    }
  };

  loadSuggestions();

  return () => {
    cancelled = true;
  };
}, [
  cycle?.id,
  filterType,
  filterGear,
  filterLocation,
]);

  const images =
    Array.isArray(cycle?.images) && cycle.images.length > 0
      ? cycle.images
      : cycle?.image
        ? [cycle.image]
        : [];

  const handleHoursChange = (e) => {
    let value = Number(e.target.value);

    if (Number.isNaN(value)) {
      setHours("");
      return;
    }

    value = Math.max(0, Math.floor(value));

    if (value >= 24) {
      const additionalDays = Math.floor(value / 24);
      const remainingHours = value % 24;
      const currentDays = Number(days) || 0;
      const newDays = currentDays + additionalDays;

      if (newDays > 7) {
        setDays("7");
        setHours("0");
        return;
      }

      setDays(String(newDays));
      setHours(String(remainingHours));
      return;
    }

    setHours(String(Math.min(value, 23)));
  };

  const handleDaysChange = (e) => {
    let value = Number(e.target.value);

    if (Number.isNaN(value)) {
      setDays("");
      return;
    }

    value = Math.max(0, Math.floor(value));
    setDays(String(Math.min(value, 7)));
  };

  const showMessage = (text, type = "error") => {
    setMessage(text);
    setMessageType(type);
  };

  const handleBooking = async () => {
    setMessage("");
    setMessageType("");

    // =========================================================
    // 1. AUTHENTICATION CHECK
    // =========================================================
    // A booking can only be created by a logged-in user.
    //
    // Use the current Supabase session first. This is important
    // because the booking page should show the Login Required
    // popup immediately when there is no active session.
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Supabase session check error:", sessionError);
        setShowLoginPopup(true);
        return;
      }

      const user = session?.user ?? null;

      if (!user) {
        setShowLoginPopup(true);
        return;
      }

      // =======================================================
      // 2. USER NET BALANCE CHECK
      // =======================================================
      // A user with an outstanding negative balance cannot create
      // another booking. Fetch the balance directly from profiles
      // so this check does not depend on the page that opened this
      // booking screen.
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("net_balance")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        showMessage("Unable to verify your account balance.");
        return;
      }

      const netBalance = Number(profile.net_balance ?? 0);

      if (Number.isNaN(netBalance)) {
        showMessage("Unable to verify your account balance.");
        return;
      }

      if (netBalance < 0) {
        showMessage(
          "Your net balance needs to be cleared before you can make a new booking."
        );
        return;
      }

      // =======================================================
      // 3. OWNER CHECK
      // =======================================================
      // A cycle owner cannot book their own cycle.
      // Fetch owner_id from the database for a fresh check.
      const { data: cycleOwner, error: ownerError } = await supabase
        .from("cycles")
        .select("owner_id")
        .eq("id", cycle.id)
        .maybeSingle();

      if (ownerError) throw ownerError;

      if (!cycleOwner) {
        showMessage("This cycle could not be found.");
        return;
      }

      if (cycleOwner.owner_id === user.id) {
        showMessage("You can't book your own cycle.");
        return;
      }

      // =======================================================
      // 4. RENTAL DURATION VALIDATION
      // =======================================================

      if (hours === "" || days === "") {
        showMessage("Please enter the rental duration.");
        return;
      }

      const bookingHours = Number(hours);
      const bookingDays = Number(days);

      if (
        Number.isNaN(bookingHours) ||
        Number.isNaN(bookingDays) ||
        bookingHours < 0 ||
        bookingDays < 0 ||
        bookingHours > 23 ||
        bookingDays > 7
      ) {
        showMessage("Please enter a valid rental duration.");
        return;
      }

      const totalRentalHours = bookingDays * 24 + bookingHours;

      if (totalRentalHours > 168) {
        showMessage("Maximum rental duration is 7 days.");
        return;
      }

      if (totalRentalHours === 0) {
        showMessage("Rental duration cannot be zero.");
        return;
      }

      // =========================================================
      // 5. FRESHLY CHECK THE CYCLE FROM DATABASE
      // =========================================================
      //
      // Do NOT rely only on the cycle object received by the page.
      // The owner/admin could have changed the cycle after this
      // page was opened.
      //
      // Admin approval:
      //   cycles.is_verified === true
      //
      // Cycle status:
      //   cycles.status === "available"
      //
      // Both are required.
      // =========================================================

      setBooking(true);

      const {
        data: latestCycle,
        error: cycleError,
      } = await supabase
        .from("cycles")
        .select("id, status, is_verified")
        .eq("id", cycle.id)
        .maybeSingle();

      if (cycleError) {
        throw cycleError;
      }

      if (!latestCycle) {
        showMessage("This cycle is no longer available.");
        return;
      }

      // Admin must have approved/verified the cycle.
      if (latestCycle.is_verified !== true) {
        showMessage(
          "This cycle has not been approved by the admin yet."
        );
        return;
      }

      // Cycle itself must currently be available.
      const cycleStatus = String(
        latestCycle.status || ""
      )
        .trim()
        .toLowerCase();

      if (cycleStatus !== "available") {
        showMessage(
          "This cycle is not available for booking."
        );
        return;
      }

      // =========================================================
      // 6. FRESH OWNER AVAILABILITY CHECK
      // =========================================================
      //
      // cycle_availability is the source of the owner's current
      // availability. We check it again immediately before
      // creating the booking request.
      //
      // The same availability field variants already used by
      // HomePageRental are supported.
      // =========================================================

      const {
        data: availabilityRows,
        error: availabilityError,
      } = await supabase
        .from("cycle_availability")
        .select("*")
        .eq("cycle_id", cycle.id);

      if (availabilityError) {
        throw availabilityError;
      }

      if (!availabilityRows || availabilityRows.length === 0) {
        showMessage(
          "This cycle is not available for booking."
        );
        return;
      }

      const getAvailabilityStatus = (availability) =>
        String(
          availability?.availability_status ??
            availability?.availability ??
            availability?.availability_type ??
            availability?.status ??
            availability?.type ??
            ""
        )
          .trim()
          .toLowerCase();

      const hasAvailableOwnerStatus = availabilityRows.some(
        (availability) =>
          getAvailabilityStatus(availability) === "available"
      );

      if (!hasAvailableOwnerStatus) {
        showMessage(
          "This cycle is currently not available from the owner."
        );
        return;
      }

      // =========================================================
      // 7. SEND BOOKING REQUEST
      // =========================================================

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
        "https://ugo-cyclesharing.app.n8n.cloud/webhook/booking",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookingData),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Booking request failed with status ${response.status}`
        );
      }

      showMessage(
        "Booking request sent successfully to the cycle owner.",
        "success"
      );

      // Notify App.jsx so it can navigate to Booking History.
      if (typeof onBookingSuccess === "function") {
        onBookingSuccess();
      } else {
        console.error(
          "BookingPage: onBookingSuccess is not connected."
        );
      }
    } catch (error) {
      console.error("Booking validation/request error:", error);

      // Do not tell the user to login for every possible error.
      // Authentication is handled explicitly above.
      showMessage(
        error?.message ||
          "Unable to confirm the booking. Please try again."
      );
    } finally {
      setBooking(false);
    }
  };

  if (!cycle) {
    return (
      <div className="booking-page">
        <div className="booking-error">
          <div className="error-icon">!</div>
          <h2>Cycle not found</h2>
          <p>Please go back and select a cycle again.</p>
          <button onClick={onBack}>← Back to Cycles</button>
        </div>
      </div>
    );
  }

  const nextImage = () => {
    if (images.length < 2) return;
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    if (images.length < 2) return;
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="booking-page">

      {/* =====================================================
          LOGIN REQUIRED POPUP
          ===================================================== */}

      {showLoginPopup && (
        <div
          className="booking-login-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-login-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLoginPopup(false);
            }
          }}
        >
          <div className="booking-login-popup">

            <div className="booking-login-icon">
              🔐
            </div>

            <h2 id="booking-login-title">
              Login Required
            </h2>

            <p>
              Please login or create an account before
              confirming your booking.
            </p>

            <div className="booking-login-actions">
              <button
                type="button"
                className="booking-login-cancel"
                onClick={() => setShowLoginPopup(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="booking-login-button"
                onClick={() => {
                  setShowLoginPopup(false);

                  if (typeof onBackToLogin === "function") {
                    onBackToLogin();
                  } else {
                    console.error(
                      "BookingPage: onBackToLogin is not connected."
                    );
                  }
                }}
              >
                Login / Sign Up
              </button>
            </div>

          </div>
        </div>
      )}

      <nav className="booking-navbar">
        <button className="booking-brand" onClick={onBack} aria-label="Back">
          <span className="brand-mark">🚲</span>
          <span className="brand-copy">
            <strong>NITK</strong>
            <small>CYCLE SHARING</small>
          </span>
        </button>

        <div className="nav-context">
          <span>BOOKING</span>
          <i />
          <strong>{cycle.brand || "Cycle"}</strong>
        </div>

        <button className="booking-back-btn" onClick={onBack}>
          <span>←</span>
          <span>Back</span>
        </button>
      </nav>

      <main className="booking-main">
        <div className="booking-page-heading">
          <div>
            <span className="eyebrow">CYCLE BOOKING</span>
            <h1>Book your ride</h1>
            <p>Review the cycle, choose your duration, and confirm.</p>
          </div>

          <div className="secure-note">
            <span className="secure-dot" />
            Campus verified
          </div>
        </div>

        <section className="booking-layout">
          <article className="cycle-card">
            <div className="cycle-visual">
              {images.length > 0 ? (
                <img
                  src={images[currentImage]}
                  alt={`${cycle.brand || "Cycle"} ${currentImage + 1}`}
                />
              ) : (
                <div className="booking-image-placeholder">
                  <span>🚲</span>
                  <small>No cycle image</small>
                </div>
              )}

              <span className="availability-badge">
                <span />
                {cycleAvailabilityStatus}
              </span>

              {images.length > 1 && (
                <>
                  <button
                    className="image-arrow image-arrow-left"
                    onClick={previousImage}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>

                  <button
                    className="image-arrow image-arrow-right"
                    onClick={nextImage}
                    aria-label="Next image"
                  >
                    ›
                  </button>

                  <div className="image-counter">
                    {currentImage + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            <div className="cycle-info">
              <div className="cycle-title-row">
                <div>
                  <span className="section-kicker">CYCLE</span>
                  <h2>{cycle.brand || "Cycle"}</h2>
                </div>

                {cycle.rating && (
                  <div className="rating-chip">
                    <span>★</span>
                    {cycle.rating}
                  </div>
                )}
              </div>

              <div className="location-row">
                <span className="location-icon">⌖</span>
                <div>
                  <small>Pickup location</small>
                  <strong>
                    {cycle.location || "Location not available"}
                  </strong>
                </div>
              </div>

              <div className="cycle-spec-grid">
                <div>
                  <small>Brand</small>
                  <strong>{cycle.brand || "Not specified"}</strong>
                </div>
                <div>
                  <small>Model</small>
                  <strong>{cycle.model || "Not specified"}</strong>
                </div>
                <div>
                  <small>Type</small>
                  <strong>{cycle.cycle_type || "Not specified"}</strong>
                </div>
                <div>
                  <small>Condition</small>
                  <strong>{cycle.condition || "Not specified"}</strong>
                </div>
              </div>

              <div className="description-row">
                <small>Description</small>
                <p>
                  {cycle.description ||
                    "No additional description provided by the owner."}
                </p>
              </div>

              <div className="cycle-bottom-row">
                <div className="cycle-prices">
                  <div>
                    <small>Hourly</small>
                    <strong>₹{pricePerHour.toFixed(0)}</strong>
                    <span>/ hr</span>
                  </div>
                  <div>
                    <small>Daily</small>
                    <strong>₹{pricePerDay.toFixed(0)}</strong>
                    <span>/ day</span>
                  </div>
                </div>

                <button
                  className="owner-details-btn"
                  onClick={onOwnerDetails}
                  type="button"
                >
                  <span>👤</span>
                  Owner
                </button>
              </div>
            </div>
          </article>

          <aside className="booking-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">RENTAL DURATION</span>
                <h2>How long do you need it?</h2>
              </div>
              <span className="max-duration">Max 7 days</span>
            </div>

            <div className="duration-inputs">
              <label className="duration-field">
                <span>Days</span>
                <div className="number-input">
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={days}
                    onChange={handleDaysChange}
                    placeholder="0"
                    inputMode="numeric"
                  />
                  <em>days</em>
                </div>
              </label>

              <label className="duration-field">
                <span>Hours</span>
                <div className="number-input">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={hours}
                    onChange={handleHoursChange}
                    placeholder="0"
                    inputMode="numeric"
                  />
                  <em>hrs</em>
                </div>
              </label>
            </div>

            <div className="duration-note">
              <span>◷</span>
              Start time is automatically recorded when the booking is created.
            </div>

            <div className="price-card">
              <div className="price-card-top">
                <div>
                  <span>ESTIMATED RENTAL COST</span>
                  <strong>₹{totalPrice.toFixed(2)}</strong>
                </div>
                <span className="price-status">
                  {numericDays || numericHours ? "Calculated" : "Enter duration"}
                </span>
              </div>

              <div className="price-lines">
                <div>
                  <span>
                    {numericDays} day{numericDays !== 1 ? "s" : ""} × ₹
                    {pricePerDay.toFixed(2)}
                  </span>
                  <strong>₹{dailyAmount.toFixed(2)}</strong>
                </div>

                <div>
                  <span>
                    {numericHours} hour{numericHours !== 1 ? "s" : ""} × ₹
                    {pricePerHour.toFixed(2)}
                  </span>
                  <strong>₹{hourlyAmount.toFixed(2)}</strong>
                </div>
              </div>

              <div className="price-total-row">
                <span>Total</span>
                <strong>₹{totalPrice.toFixed(2)}</strong>
              </div>
            </div>

            {message && (
              <div
                className={`booking-message ${
                  messageType === "success" ? "success" : "error"
                }`}
                role="alert"
              >
                <span>{messageType === "success" ? "✓" : "!"}</span>
                {message}
              </div>
            )}

            <button
              className="book-cycle-btn"
              onClick={handleBooking}
              disabled={booking}
            >
              <span>
                {booking
                  ? "Sending request..."
                  : `Confirm booking · ₹${totalPrice.toFixed(2)}`}
              </span>
              {!booking && <b>→</b>}
            </button>

            <p className="booking-footnote">
              By confirming, your request will be sent to the cycle owner.
            </p>
          </aside>
        </section>

        {/* =====================================================
            RELATED CYCLES — MAXIMUM 4 SUGGESTIONS
            ===================================================== */}
        <section className="cycle-suggestions" aria-label="Suggested cycles">
          <div className="suggestions-heading">
            <div>
              <span className="eyebrow">YOU MAY ALSO LIKE</span>
              <h2>More cycles for your ride</h2>
              <p>
                Suggestions based on this cycle and the preferences you used.
              </p>
            </div>

            {suggestedCycles.length > 0 && (
              <span className="suggestions-count">
                {suggestedCycles.length} suggestions
              </span>
            )}
          </div>

          {suggestionsLoading ? (
            <div className="suggestions-loading">
              Finding similar cycles...
            </div>
          ) : suggestedCycles.length > 0 ? (
            <div className="suggestions-grid">
              {suggestedCycles.map((suggestion) => {
                const suggestionImages = getCycleImages(suggestion);
                const suggestionImage =
                  suggestionImages[0] || null;

                const suggestionGear =
                  suggestion?.gearLabel ||
                  (suggestion?.geared === true
                    ? "Geared"
                    : suggestion?.geared === false
                      ? "Non-Geared"
                      : "Not specified");

                const suggestionOwner =
                  suggestion?.ownerName ||
                  suggestion?.owner_name ||
                  suggestion?.owner?.full_name ||
                  "Cycle owner";

                const suggestionLocation =
                  suggestion?.location ||
                  "Location not available";

                const suggestionRating =
                  Number(suggestion?.rating) || 0;

                return (
                  <article
                    className="suggestion-card"
                    key={suggestion.id}
                  >
                    <div className="suggestion-image">
                      {suggestionImage ? (
                        <img
                          src={suggestionImage}
                          alt={suggestion.brand || "Cycle"}
                        />
                      ) : (
                        <div className="suggestion-image-placeholder">
                          🚲
                        </div>
                      )}

                      <span className="suggestion-availability">
                        <span />
                        Available
                      </span>
                    </div>

                    <div className="suggestion-details">
                      <div className="suggestion-main">
                        <h3>{suggestion.brand || "Cycle"}</h3>

                        <div className="suggestion-location">
                          ⌖ {suggestionLocation}
                        </div>

                        <div className="suggestion-rating">
                          <span>★</span>
                          {suggestionRating
                            ? suggestionRating.toFixed(1)
                            : "New"}
                        </div>

                        <div className="suggestion-tags">
                          <span>{suggestionGear}</span>
                          <span>
                            {suggestion.condition || "Good Condition"}
                          </span>
                        </div>

                        <div className="suggestion-owner">
                          <span className="suggestion-owner-avatar">
                            {String(suggestionOwner)
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                          <strong>{suggestionOwner}</strong>
                        </div>
                      </div>

                      <div className="suggestion-side">
                        <div className="suggestion-prices">
                          <strong>
                            ₹{Number(suggestion.price_per_hour || 0).toFixed(0)}
                          </strong>
                          <span>/ hour</span>

                          <strong>
                            ₹{Number(suggestion.price_per_day || 0).toFixed(0)}
                          </strong>
                          <span>/ day</span>
                        </div>

                        <button
                          type="button"
                          className="suggestion-view-btn"
                          onClick={() => {
                            if (typeof onCycleSelect === "function") {
                              onCycleSelect(suggestion);
                            } else {
                              console.error(
                                "BookingPage: onCycleSelect is not connected."
                              );
                            }
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="suggestions-empty">
              No similar available cycles found right now.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default BookingPage;
