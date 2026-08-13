import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./CycleVerification.css";

/*
|--------------------------------------------------------------------------
| CycleVerification
|--------------------------------------------------------------------------
|
| Expected URL:
|
| /cycle-verification?cycle_id=7dae156d-0ea5-4d3e-9fd7-828442775042
|
| OR the page can be rendered with:
|
| <CycleVerification cycleId="..." />
|
|--------------------------------------------------------------------------
*/

const VERIFICATION_WEBHOOK =
  "https://stem61.app.n8n.cloud/webhook/cycle-listing-verification";

function CycleVerification({ cycleId: propCycleId, onBack }) {
  const [cycleId, setCycleId] = useState(propCycleId || null);

  const [adminId, setAdminId] = useState(null);

  const [cycle, setCycle] = useState(null);
  const [cycleImages, setCycleImages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState(null);

  const [imageIndex, setImageIndex] = useState(0);

const getSessionData = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Session error:", error);
    return null;
  }

  if (!session) {
    console.log("No active session");
    return null;
  }
  setAdminId(session.user.id)
  return session;
};

  /*
  |--------------------------------------------------------------------------
  | Get cycle ID
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (propCycleId) {
      setCycleId(propCycleId);
      return;
    }

    const params = new URLSearchParams(
      window.location.search
    );

    const idFromUrl = params.get("cycle_id");

    if (idFromUrl) {
      setCycleId(idFromUrl);
    } else {
      setError(
        "No cycle ID was provided."
      );

      setLoading(false);
    }
  }, [propCycleId]);

  /*
  |--------------------------------------------------------------------------
  | Load authenticated admin + cycle
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!cycleId) return;

    loadVerificationData();
  }, [cycleId]);

  const loadVerificationData = async () => {
    try {
      setLoading(true);
      setError("");

      /*
       * ---------------------------------------------------------------
       * Get currently authenticated admin
       * ---------------------------------------------------------------
       */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "You must be logged in as an administrator."
        );
      }

      setAdminId(user.id);

      /*
       * ---------------------------------------------------------------
       * Fetch cycle
       * ---------------------------------------------------------------
       */

      const {
        data: cycleData,
        error: cycleError,
      } = await supabase
        .from("cycles")
        .select("*")
        .eq("id", cycleId)
        .single();

      if (cycleError) {
        throw cycleError;
      }

      if (!cycleData) {
        throw new Error(
          "Cycle could not be found."
        );
      }

      setCycle(cycleData);

      /*
       * ---------------------------------------------------------------
       * Fetch cycle images
       * ---------------------------------------------------------------
       */

      const {
        data: imageData,
        error: imageError,
      } = await supabase
        .from("cycle_images")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("created_at", {
          ascending: true,
        });

      if (imageError) {
        console.error(
          "Cycle images could not be loaded:",
          imageError
        );

        /*
         * We don't fail the entire verification page
         * if the cycle itself was successfully loaded.
         */
        setCycleImages([]);
      } else {
        setCycleImages(
          (imageData || []).map(
            normalizeImage
          )
        );
      }
    } catch (err) {
      console.error(
        "Failed to load verification data:",
        err
      );

      setError(
        err.message ||
          "Unable to load cycle verification details."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Convert possible cycle_images formats into usable image URLs
  |--------------------------------------------------------------------------
  |
  | This supports common column names:
  |
  | image_url
  | url
  | public_url
  | storage_path
  | file_path
  |
  | If your actual cycle_images table uses another name,
  | only this function needs to be changed.
  |--------------------------------------------------------------------------
  */

  const normalizeImage = (image) => {
    const directUrl =
      image.image_url ||
      image.url ||
      image.public_url;

    // If it is already a complete URL, use it directly
    if (
      directUrl &&
      (directUrl.startsWith("http://") ||
        directUrl.startsWith("https://"))
    ) {
      return {
        ...image,
        resolvedUrl: directUrl,
      };
    }

    // If image_url is a Storage path, use it
    const storagePath =
      directUrl ||
      image.storage_path ||
      image.file_path ||
      image.path;

    if (storagePath) {
      const { data } = supabase.storage
        .from("cycle-images")
        .getPublicUrl(storagePath);

      return {
        ...image,
        resolvedUrl: data?.publicUrl || null,
      };
    }

    return {
      ...image,
      resolvedUrl: null,
    };
  };

  /*
  |--------------------------------------------------------------------------
  | Image navigation
  |--------------------------------------------------------------------------
  */

  const nextImage = () => {
    if (cycleImages.length === 0) return;

    setImageIndex(
      (current) =>
        (current + 1) %
        cycleImages.length
    );
  };

  const previousImage = () => {
    if (cycleImages.length === 0) return;

    setImageIndex(
      (current) =>
        (current - 1 + cycleImages.length) %
        cycleImages.length
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Useful cycle fields
  |--------------------------------------------------------------------------
  */

  const cycleName = useMemo(() => {
    return (
      cycle?.name ||
      cycle?.cycle_name ||
      cycle?.title ||
      "Campus Cycle"
    );
  }, [cycle]);

  const cycleModel = useMemo(() => {
    return (
      cycle?.model ||
      cycle?.cycle_model ||
      "Not provided"
    );
  }, [cycle]);

  const cycleBrand = useMemo(() => {
    return (
      cycle?.brand ||
      cycle?.manufacturer ||
      "Not provided"
    );
  }, [cycle]);

  const cycleDescription = useMemo(() => {
    return (
      cycle?.description ||
      cycle?.cycle_description ||
      "No description provided."
    );
  }, [cycle]);

  const cyclePrice = useMemo(() => {
    return (
      cycle?.price_per_hour ??
      cycle?.hourly_rate ??
      cycle?.rental_price ??
      null
    );
  }, [cycle]);

  const ownerId = useMemo(() => {
    return (
      cycle?.owner_id ||
      cycle?.user_id ||
      cycle?.created_by ||
      null
    );
  }, [cycle]);

  /*
  |--------------------------------------------------------------------------
  | Submit approval / rejection
  |--------------------------------------------------------------------------
  */

  const submitDecision = async (selectedDecision) => {
    /*
     * ---------------------------------------------------------------
     * Reason is mandatory for BOTH actions
     * ---------------------------------------------------------------
     */

    const cleanedReason =
      reason.trim();

    if (!cleanedReason) {
      setError(
        `Please provide a proper reason before ${
          selectedDecision === "approved"
            ? "approving"
            : "rejecting"
        } this cycle.`
      );

      return;
    }

    if (!adminId) {
      setError(
        "Administrator authentication could not be verified."
      );

      return;
    }

    if (!cycleId) {
      setError(
        "Cycle ID is missing."
      );

      return;
    }

    /*
     * Prevent accidental double submission
     */

    if (submitting) return;

    try {
      setSubmitting(true);

      setError("");
      setSuccessMessage("");

      setDecision(
        selectedDecision
      );

      /*
       * ---------------------------------------------------------------
       * Exact JSON expected by your n8n webhook
       * ---------------------------------------------------------------
       */

      const payload = {
        status: selectedDecision,
        reason: cleanedReason,
        admin_id: adminId,
        cycle_id: cycleId,
      };

      console.log(
        "Sending cycle verification:",
        payload
      );

      /*
       * ---------------------------------------------------------------
       * Send to n8n
       * ---------------------------------------------------------------
       */

      const response = await fetch(
        VERIFICATION_WEBHOOK,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload
          ),
        }
      );

      /*
       * n8n may return JSON OR plain text,
       * so don't assume JSON immediately.
       */

      const responseText =
        await response.text();

      let responseData = null;

      try {
        responseData =
          responseText
            ? JSON.parse(
                responseText
              )
            : null;
      } catch {
        responseData =
          responseText;
      }

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
            responseData?.error ||
            responseData ||
            `Verification request failed with status ${response.status}.`
        );
      }

      /*
       * ---------------------------------------------------------------
       * Success
       * ---------------------------------------------------------------
       */

      setSuccessMessage(
        selectedDecision ===
          "approved"
          ? "Cycle approved successfully."
          : "Cycle rejected successfully."
      );

      /*
       * Disable further accidental decisions
       */

      setCycle((current) =>
        current
          ? {
              ...current,
              verification_status:
                selectedDecision,
            }
          : current
      );

    } catch (err) {
      console.error(
        "Cycle verification failed:",
        err
      );

      setDecision(null);

      setError(
        err.message ||
          "Unable to submit the verification decision."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="cycle-verification-page">

        <div className="verification-loading">

          <div className="loading-spinner"></div>

          <h2>
            Loading cycle details
          </h2>

          <p>
            Preparing the cycle for verification...
          </p>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Error
  |--------------------------------------------------------------------------
  */

  if (error && !cycle) {
    return (
      <div className="cycle-verification-page">

        <div className="verification-error">

          <div className="error-icon">
            !
          </div>

          <h2>
            Unable to open verification
          </h2>

          <p>
            {error}
          </p>

          <button
            className="back-button"
            onClick={onBack}
          >
            ← Go Back
          </button>

        </div>

      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Main page
  |--------------------------------------------------------------------------
  */

  const currentImage =
    cycleImages[imageIndex];

  const alreadyProcessed =
    cycle?.verification_status ===
      "approved" ||
    cycle?.verification_status ===
      "rejected";

  return (
    <div className="cycle-verification-page">

      {/* =========================================================
          TOP BAR
          ========================================================= */}

      <header className="verification-topbar">

        <div className="verification-brand">

          <div className="verification-logo">
            A
          </div>

          <div>
            <strong>
              Campus Cycle
            </strong>

            <span>
              Cycle Verification
            </span>
          </div>

        </div>


        <div className="verification-admin">

          <div className="admin-status-dot"></div>

          Administrator

        </div>

      </header>


      {/* =========================================================
          PAGE CONTENT
          ========================================================= */}

      <main className="verification-container">

        <button
          className="back-button page-back-button"
          onClick={onBack}
        >
          ← Back to Notifications
        </button>


        {/* =======================================================
            PAGE HEADING
            ======================================================= */}

        <div className="verification-heading">

          <div>

            <span className="verification-label">
              NEW CYCLE VERIFICATION
            </span>

            <h1>
              Verify Cycle Listing
            </h1>

            <p>
              Review the owner's submitted cycle
              information and images before approving
              the listing.
            </p>

          </div>


          <div className="verification-id">

            <span>
              CYCLE ID
            </span>

            <strong>
              {cycleId}
            </strong>

          </div>

        </div>


        {/* =======================================================
            ERROR / SUCCESS
            ======================================================= */}

        {error && (
          <div className="verification-message error-message">

            <span>
              !
            </span>

            <p>
              {error}
            </p>

          </div>
        )}


        {successMessage && (
          <div className="verification-message success-message">

            <span>
              ✓
            </span>

            <p>
              {successMessage}
            </p>

          </div>
        )}


        {/* =======================================================
            MAIN GRID
            ======================================================= */}

        <div className="verification-grid">

          {/* =====================================================
              LEFT — IMAGES
              ===================================================== */}

          <section className="verification-card images-card">

            <div className="card-heading">

              <div>

                <span>
                  SUBMITTED EVIDENCE
                </span>

                <h2>
                  Cycle Images
                </h2>

              </div>


              <span className="image-count">
                {cycleImages.length} image
                {cycleImages.length !== 1
                  ? "s"
                  : ""}
              </span>

            </div>


            {cycleImages.length > 0 &&
            currentImage?.resolvedUrl ? (

              <>

                <div className="main-cycle-image">

                  <img
                    src={
                      currentImage.resolvedUrl
                    }
                    alt={`Cycle ${
                      imageIndex + 1
                    }`}
                  />

                  {cycleImages.length >
                    1 && (
                    <>
                      <button
                        className="image-nav previous"
                        onClick={
                          previousImage
                        }
                      >
                        ‹
                      </button>

                      <button
                        className="image-nav next"
                        onClick={
                          nextImage
                        }
                      >
                        ›
                      </button>
                    </>
                  )}

                </div>


                <div className="image-thumbnails">

                  {cycleImages.map(
                    (image, index) => (
                      <button
                        key={
                          image.id ||
                          index
                        }
                        className={
                          index ===
                          imageIndex
                            ? "thumbnail active"
                            : "thumbnail"
                        }
                        onClick={() =>
                          setImageIndex(
                            index
                          )
                        }
                      >

                        {image.resolvedUrl ? (
                          <img
                            src={
                              image.resolvedUrl
                            }
                            alt={`Thumbnail ${
                              index + 1
                            }`}
                          />
                        ) : (
                          <span>
                            No image
                          </span>
                        )}

                      </button>
                    )
                  )}

                </div>

              </>

            ) : (

              <div className="no-images">

                <div>
                  📷
                </div>

                <h3>
                  No cycle images available
                </h3>

                <p>
                  The submitted listing does not
                  currently contain viewable images.
                </p>

              </div>

            )}

          </section>


          {/* =====================================================
              RIGHT — CYCLE INFORMATION
              ===================================================== */}

          <section className="verification-card details-card">

            <div className="card-heading">

              <div>

                <span>
                  LISTING INFORMATION
                </span>

                <h2>
                  Cycle Details
                </h2>

              </div>

            </div>


            <div className="cycle-title-block">

              <div className="cycle-symbol">
                🚲
              </div>

              <div>

                <h3>
                  {cycleName}
                </h3>

                <p>
                  Cycle submitted for verification
                </p>

              </div>

            </div>


            <div className="details-list">

              <div className="detail-row">

                <span>
                  Brand
                </span>

                <strong>
                  {cycleBrand}
                </strong>

              </div>


              <div className="detail-row">

                <span>
                  Model
                </span>

                <strong>
                  {cycleModel}
                </strong>

              </div>


              {cyclePrice !== null && (
                <div className="detail-row">

                  <span>
                    Rental Price
                  </span>

                  <strong>
                    ₹{cyclePrice}
                  </strong>

                </div>
              )}


              <div className="detail-row">

                <span>
                  Owner ID
                </span>

                <strong className="owner-id">
                  {ownerId ||
                    "Not available"}
                </strong>

              </div>


              <div className="detail-row">

                <span>
                  Submitted
                </span>

                <strong>
                  {cycle?.created_at
                    ? new Date(
                        cycle.created_at
                      ).toLocaleString()
                    : "Not available"}
                </strong>

              </div>

            </div>


            <div className="description-section">

              <span>
                DESCRIPTION
              </span>

              <p>
                {cycleDescription}
              </p>

            </div>

          </section>

        </div>


        {/* =======================================================
            VERIFICATION DECISION
            ======================================================= */}

        <section className="verification-decision-card">

          <div className="decision-heading">

            <div>

              <span className="verification-label">
                ADMINISTRATIVE DECISION
              </span>

              <h2>
                Approve or Reject Listing
              </h2>

              <p>
                A reason is required for every
                verification decision.
              </p>

            </div>


            {decision && (
              <div
                className={
                  decision ===
                  "approved"
                    ? "decision-badge approved"
                    : "decision-badge rejected"
                }
              >
                {decision ===
                "approved"
                  ? "APPROVED"
                  : "REJECTED"}
              </div>
            )}

          </div>


          {/* =====================================================
              REASON
              ===================================================== */}

          <div className="reason-section">

            <label htmlFor="verification-reason">
              Verification Reason
              <span>
                Required
              </span>
            </label>

            <textarea
              id="verification-reason"
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value
                )
              }
              placeholder="Enter the reason for your decision. For example: Images are clear and cycle details match the submitted listing."
              disabled={
                submitting ||
                alreadyProcessed ||
                !!successMessage
              }
              maxLength={1000}
            />

            <div className="reason-footer">

              <span>
                Explain clearly why this cycle
                is being approved or rejected.
              </span>

              <span>
                {reason.length}/1000
              </span>

            </div>

          </div>


          {/* =====================================================
              DECISION BUTTONS
              ===================================================== */}

          <div className="decision-actions">

            <button
              className="reject-button"
              disabled={
                submitting ||
                alreadyProcessed ||
                !!successMessage
              }
              onClick={() =>
                submitDecision(
                  "rejected"
                )
              }
            >

              {submitting &&
              decision ===
                "rejected" ? (
                <>
                  <span className="button-spinner"></span>
                  Rejecting...
                </>
              ) : (
                <>
                  ✕
                  Reject Cycle
                </>
              )}

            </button>


            <button
              className="approve-button"
              disabled={
                submitting ||
                alreadyProcessed ||
                !!successMessage
              }
              onClick={() =>
                submitDecision(
                  "approved"
                )
              }
            >

              {submitting &&
              decision ===
                "approved" ? (
                <>
                  <span className="button-spinner"></span>
                  Approving...
                </>
              ) : (
                <>
                  ✓
                  Approve Cycle
                </>
              )}

            </button>

          </div>


          <div className="decision-warning">

            <span>
              ⚠
            </span>

            <p>
              This decision will be sent to the
              verification backend. Make sure the
              cycle details and submitted images have
              been reviewed before proceeding.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default CycleVerification;

