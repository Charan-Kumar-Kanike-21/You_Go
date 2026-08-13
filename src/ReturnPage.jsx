import React, { useEffect, useRef, useState } from "react";
import "./ReturnPage.css";
import { supabase } from "./supabase";

function ReturnPage({ bookingId, onBack, onBackHome }) {
  const [booking, setBooking] = useState(null);

  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(false);
  const [returned, setReturned] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  const [cameraError, setCameraError] = useState("");
  const [error, setError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // ============================================================
  // FETCH BOOKING
  // ============================================================

  useEffect(() => {
    fetchBooking();

    return () => {
      stopCamera();
    };
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please login to continue.");
        return;
      }

      let query = supabase
        .from("booking_table")
        .select(`
          *,
          cycles (
            id,
            brand,
            model,
            location
          )
        `);

      // If bookingId was passed from OnGoingRents
      if (bookingId) {
        query = query.eq("id", bookingId);
      } else {
        // Fallback: find current booking for logged-in user
        query = query
          .eq("renter_id", user.id)
          .is("returned_at", null)
          .is("cancelled_at", null)
          .order("created_at", { ascending: false })
          .limit(1);
      }

      const { data, error: bookingError } = bookingId
        ? await query.single()
        : await query.maybeSingle();

      if (bookingError) {
        throw bookingError;
      }

      if (!data) {
        setError("No active rental found.");
        return;
      }

      setBooking(data);

    } catch (err) {
      console.error("Booking fetch error:", err);
      setError("Unable to load your rental.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CAMERA
  // ============================================================

  const openCamera = async () => {
    try {
      setCameraError("");
      setCapturedPhoto(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Camera access is not supported by this browser."
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
        audio: false,
      });

      streamRef.current = stream;

      setCameraOpen(true);

      // Wait for video element to render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.error("Video play error:", err);
          });
        }
      }, 100);

    } catch (err) {
      console.error("Camera error:", err);

      if (err.name === "NotAllowedError") {
        setCameraError(
          "Camera permission was denied. Please allow camera access."
        );
      } else if (err.name === "NotFoundError") {
        setCameraError(
          "No camera was found on this device."
        );
      } else {
        setCameraError(
          "Unable to access the camera."
        );
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // ============================================================
  // CAPTURE PHOTO
  // ============================================================

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setCameraError(
        "Camera is not ready yet. Please wait a moment."
      );
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imageData = canvas.toDataURL(
      "image/jpeg",
      0.85
    );

    setCapturedPhoto(imageData);

    stopCamera();
    setCameraOpen(false);
  };

  // ============================================================
  // RETAKE PHOTO
  // ============================================================

  const retakePhoto = async () => {
    setCapturedPhoto(null);
    await openCamera();
  };

  // ============================================================
  // CONVERT BASE64 TO BLOB
  // ============================================================

  const dataURLToBlob = (dataURL) => {
    const parts = dataURL.split(",");

    const mime = parts[0].match(
      /:(.*?);/
    )[1];

    const binary = atob(parts[1]);

    const array = new Uint8Array(
      binary.length
    );

    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    return new Blob([array], {
      type: mime,
    });
  };

  // ============================================================
  // CONFIRM RETURN
  // ============================================================

  const handleReturn = async () => {
    if (!booking?.id) {
      setError("Booking information is missing.");
      return;
    }

    if (!capturedPhoto) {
      setError(
        "Please capture a photo of the cycle before returning."
      );
      return;
    }

    try {
      setReturning(true);
      setError("");

      // ========================================================
      // GET CURRENT USER
      // ========================================================

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You must be logged in to return the cycle."
        );
      }

      // ========================================================
      // CONVERT PHOTO
      // ========================================================

      const photoBlob =
        dataURLToBlob(capturedPhoto);

      // ========================================================
      // CREATE UNIQUE FILE PATH
      // ========================================================

      const filePath =
        `${booking.id}/${Date.now()}_return.jpg`;

      // ========================================================
      // UPLOAD TO SUPABASE STORAGE
      // ========================================================

      const {
        error: uploadError,
      } = await supabase.storage
        .from("return-images")
        .upload(
          filePath,
          photoBlob,
          {
            contentType: "image/jpeg",
            upsert: false,
          }
        );

      if (uploadError) {
        console.error(
          "Image upload error:",
          uploadError
        );

        throw new Error(
          "Unable to upload return photo."
        );
      }

      // ========================================================
      // GET PUBLIC IMAGE URL
      // ========================================================

      const {
        data: publicUrlData,
      } = supabase.storage
        .from("return-images")
        .getPublicUrl(filePath);

      const imageUrl =
        publicUrlData?.publicUrl;

      if (!imageUrl) {
        throw new Error(
          "Unable to generate image URL."
        );
      }

      console.log(
        "Return image URL:",
        imageUrl
      );

      // ========================================================
      // SEND TO BACKEND
      // ========================================================

      const response = await fetch(
        "https://stem61.app.n8n.cloud/webhook/return",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            booking_id: booking.id,
            image_url: imageUrl,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Backend returned ${response.status}`
        );
      }

      // ========================================================
      // RETURN SUCCESSFUL
      // ========================================================

      setReturned(true);

    } catch (err) {
      console.error(
        "Return process error:",
        err
      );

      setError(
        err.message ||
          "Unable to complete the return."
      );
    } finally {
      setReturning(false);
    }
  };

  // ============================================================
  // REPORT
  // ============================================================

  const handleReport = () => {
    /*
     * Keep your existing Report Page navigation here.
     * We are not changing it.
     */
    console.log("Open Report Page");
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="return-page">
        <main className="return-success-card">
          <p>Loading rental...</p>
        </main>
      </div>
    );
  }

  // ============================================================
  // ERROR / NO BOOKING
  // ============================================================

  if (!booking) {
    return (
      <div className="return-page">
        <main className="return-success-card">

          <div className="return-success-icon">
            !
          </div>

          <h1>
            Unable to Load Rental
          </h1>

          <p>
            {error ||
              "No active rental found."}
          </p>

        </main>
      </div>
    );
  }

  // ============================================================
  // SUCCESS
  // ============================================================

  if (returned) {
    return (
      <div className="return-page">

        <main className="return-success-card">

          <div className="return-success-icon">
            ✓
          </div>

          <span className="return-eyebrow">
            RETURN SUCCESSFUL
          </span>

          <h1>
            Cycle Returned
          </h1>

          <p>
            Your rental has been successfully
            completed. Thank you for using
            NITK Cycle Sharing.
          </p>

          <div className="return-status">
            <span className="return-status-dot"></span>
            Rental Completed
          </div>
          <div>
            <button
              className="return-home-button"
              onClick={onBackHome}
            >
              ← Back to Home
            </button>
          </div>

        </main>

      </div>
    );
  }

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <div className="return-page">

      <main className="return-container">

        <button
          className="return-back-button"
          onClick={onBack}
          disabled={returning}
        >
          ← Back
        </button>

        {/* Header Icon */}

        <div className="return-icon">
          🚲
        </div>

        <span className="return-eyebrow">
          ACTIVE RENTAL
        </span>

        <h1>
          Return Cycle
        </h1>

        <p className="return-description">
          Return the cycle to the owner and
          confirm the completion of your rental.
        </p>

        {/* Rental Information */}

        <section className="rental-info">

          <div className="rental-info-row">
            <span>Cycle</span>

            <strong>
              {booking.cycles?.brand ||
                "Campus Cycle"}

              {booking.cycles?.model
                ? ` ${booking.cycles.model}`
                : ""}
            </strong>
          </div>

          <div className="rental-info-row">
            <span>Booking ID</span>

            <strong>
              {booking.id.slice(0, 8)}...
            </strong>
          </div>

          <div className="rental-info-row">
            <span>Rental Started</span>

            <strong>
              {booking.start_time
                ? new Date(
                    booking.start_time
                  ).toLocaleString()
                : "Not available"}
            </strong>
          </div>

          <div className="rental-info-row">
            <span>Rental Ends</span>

            <strong>
              {booking.end_time
                ? new Date(
                    booking.end_time
                  ).toLocaleString()
                : "Not available"}
            </strong>
          </div>

        </section>

        {/* Error */}

        {error && (
          <div className="return-error">
            {error}
          </div>
        )}

        {/* =====================================================
            CAMERA SECTION
        ====================================================== */}

        {cameraOpen && (
          <section className="camera-section">

            <h3>
              Capture Return Photo
            </h3>

            <p>
              Take a clear photo showing the
              condition of the cycle.
            </p>

            <div className="camera-preview">

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
              />

            </div>

            {cameraError && (
              <p className="camera-error">
                {cameraError}
              </p>
            )}

            <button
              className="capture-button"
              onClick={capturePhoto}
            >
              📸 Capture Photo
            </button>

            <button
              className="cancel-camera-button"
              onClick={() => {
                stopCamera();
                setCameraOpen(false);
              }}
            >
              Cancel
            </button>

          </section>
        )}

        {/* =====================================================
            CAPTURED PHOTO
        ====================================================== */}

        {capturedPhoto && !cameraOpen && (
          <section className="captured-photo-section">

            <h3>
              Return Photo
            </h3>

            <p>
              Make sure the cycle and its condition
              are clearly visible.
            </p>

            <img
              src={capturedPhoto}
              alt="Captured cycle condition"
              className="captured-photo"
            />

            <button
              className="retake-button"
              onClick={retakePhoto}
              disabled={returning}
            >
              🔄 Retake Photo
            </button>

          </section>
        )}

        {/* Camera error */}

        {cameraError && !cameraOpen && (
          <div className="return-error">
            {cameraError}
          </div>
        )}

        {/* =====================================================
            RETURN BUTTON
        ====================================================== */}

        {!cameraOpen && !capturedPhoto && (
          <button
            className="return-button"
            onClick={openCamera}
            disabled={returning}
          >
            📷 Take Return Photo
          </button>
        )}

        {capturedPhoto && (
          <button
            className="return-button"
            onClick={handleReturn}
            disabled={returning}
          >
            {returning
              ? "Processing Return..."
              : "Confirm Return"}
          </button>
        )}

        {/* =====================================================
            REPORT
        ====================================================== */}

        <div className="report-section">

          <div className="report-divider">
            <span>Having an issue?</span>
          </div>

          <p>
            Report any damage, problem, or issue
            related to this rental.
          </p>

          <button
            className="report-button"
            onClick={handleReport}
            disabled={returning}
          >
            ⚠ Report an Issue
          </button>

        </div>

        <p className="return-security-note">
          🔒 Your rental will be marked complete
          only after the return is confirmed.
        </p>

        {/* Hidden canvas used for photo capture */}

        <canvas
          ref={canvasRef}
          style={{ display: "none" }}
        />

      </main>

    </div>
  );
}

export default ReturnPage;