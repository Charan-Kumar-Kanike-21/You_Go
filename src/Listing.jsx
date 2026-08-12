
import React, { useState, useEffect } from "react";
import "./Listing.css";
import { supabase } from "./supabase";

function MyCycles({ onBack }) {

  // =====================================================
  // STATES
  // =====================================================

  const [images, setImages] = useState([null, null, null]);

  const [draftId, setDraftId] = useState(null);

  const [saving, setSaving] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [loadingDraft, setLoadingDraft] = useState(true);


  // =====================================================
  // IMAGE UPLOAD / PREVIEW
  // =====================================================

  const handleImageUpload = (index, event) => {

    const file = event.target.files[0];

    if (file) {

      const updatedImages = [...images];

      updatedImages[index] = file;

      setImages(updatedImages);
    }
  };


  // =====================================================
  // LOAD DRAFT WHEN PAGE OPENS
  // =====================================================

  useEffect(() => {

    loadDraft();

  }, []);


  // =====================================================
  // LOAD EXISTING DRAFT
  // =====================================================

  const loadDraft = async () => {

    try {

      setLoadingDraft(true);


      // =================================================
      // GET LOGGED-IN USER
      // =================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();


      if (userError) {
        throw userError;
      }


      if (!user) {

        setLoadingDraft(false);

        return;
      }


      // =================================================
      // GET PROFILE
      // =================================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .maybeSingle();


      if (profileError) {
        throw profileError;
      }


      // =================================================
      // FIND USER'S LATEST DRAFT
      // =================================================

      const {
        data: draft,
        error: draftError,
      } = await supabase
        .from("cycles")
        .select("*")
        .eq("owner_id", user.id)
        .eq("status", "draft")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();


      if (draftError) {
        throw draftError;
      }


      // =================================================
      // GET FORM
      // =================================================

      const form = document.querySelector("form");


      // =================================================
      // LOAD PROFILE DATA
      // =================================================

      if (profile && form) {

        form.elements.ownerName.value =
          profile.full_name || "";

        form.elements.phone.value =
          profile.phone || "";

        form.elements.email.value =
          profile.email || "";
      }


      // =================================================
      // NO DRAFT
      // =================================================

      if (!draft) {

        setLoadingDraft(false);

        return;
      }


      // =================================================
      // SAVE DRAFT ID
      // =================================================

      setDraftId(draft.id);


      // =================================================
      // LOAD CYCLE DATA INTO FORM
      // =================================================

      if (form) {

        form.elements.brand.value =
          draft.brand || "";

        form.elements.model.value =
          draft.model || "";

        form.elements.cycleType.value =
          draft.cycle_type || "";

        form.elements.condition.value =
          draft.condition || "";

        form.elements.pricePerHour.value =
          draft.price_per_hour ?? "";

        form.elements.pricePerDay.value =
          draft.price_per_day ?? "";

        form.elements.location.value =
          draft.location || "";

        form.elements.description.value =
          draft.description || "";
      }


      // =================================================
      // LOAD SAVED IMAGES
      // =================================================

      const {
        data: savedImages,
        error: imagesError,
      } = await supabase
        .from("cycle_images")
        .select("image_url, display_order")
        .eq("cycle_id", draft.id)
        .order("display_order", {
          ascending: true,
        });


      if (imagesError) {
        throw imagesError;
      }


      const loadedImages = [
        null,
        null,
        null,
      ];


      if (savedImages) {

        savedImages.forEach((image) => {
        const index = image.display_order - 1;

        if (index >= 0 && index < 3) {

          const {
            data: publicUrlData,
          } = supabase.storage
            .from("cycle-images")
            .getPublicUrl(image.image_url);

          loadedImages[index] = publicUrlData.publicUrl;
          }
        });
      }


      setImages(loadedImages);


    } catch (error) {

      console.error(
        "Error loading draft:",
        error
      );

    } finally {

      setLoadingDraft(false);
    }
  };


  // =====================================================
  // SAVE DRAFT
  // =====================================================

  const saveDraft = async () => {

    try {

      setSaving(true);


      // =================================================
      // GET LOGGED-IN USER
      // =================================================

      
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        alert("Supabase session missing. Please login again.");
        return;
      }

      const user = session.user;

      console.log("UPLOAD SESSION:", session);
      console.log("UPLOAD USER:", user.id);

      if (!user) {

        alert("Please login first.");

        return;
      }


      // =================================================
      // GET FORM
      // =================================================

      const form = document.querySelector("form");


      // =================================================
      // OWNER DETAILS
      // =================================================

      const ownerName =
        form.elements.ownerName.value;

      const phone =
        form.elements.phone.value;

      const email =
        form.elements.email.value;


      // =================================================
      // CYCLE DETAILS
      // =================================================

      const brand =
        form.elements.brand.value;

      const model =
        form.elements.model.value;

      const cycleType =
        form.elements.cycleType.value;

      const condition =
        form.elements.condition.value;


      const pricePerHour =
        form.elements.pricePerHour.value
          ? Number(
              form.elements.pricePerHour.value
            )
          : null;


      const pricePerDay =
        form.elements.pricePerDay.value
          ? Number(
              form.elements.pricePerDay.value
            )
          : null;


      const location =
        form.elements.location.value;


      const description =
        form.elements.description.value;


      // =================================================
      // UPDATE PROFILE
      // =================================================

      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .update({

          full_name:
            ownerName || null,

          phone:
            phone || null,

          email:
            email || null,

        })
        .eq("id", user.id);


      if (profileError) {
        throw profileError;
      }


      // =================================================
      // CYCLE DATA
      // =================================================

      const cycleData = {

        owner_id: user.id,

        title:
          brand || null,

        description:
          description || null,

        cycle_type:
          cycleType || null,

        brand:
          brand || null,

        model:
          model || null,

        condition:
          condition || null,

        price_per_hour:
          pricePerHour,

        price_per_day:
          pricePerDay,

        location:
          location || null,

        status:
          "draft",

        is_verified:
          false,
      };


      // =================================================
      // INSERT OR UPDATE DRAFT
      // =================================================

      let cycle;


      if (draftId) {

        // ---------------------------------------------
        // UPDATE EXISTING DRAFT
        // ---------------------------------------------

        const {
          data,
          error,
        } = await supabase
          .from("cycles")
          .update(cycleData)
          .eq("id", draftId)
          .eq("owner_id", user.id)
          .select()
          .single();


        if (error) {
          throw error;
        }


        cycle = data;

      } else {

        // ---------------------------------------------
        // CREATE NEW DRAFT
        // ---------------------------------------------

        const {
          data,
          error,
        } = await supabase
          .from("cycles")
          .insert(cycleData)
          .select()
          .single();


        if (error) {
          throw error;
        }


        cycle = data;


        setDraftId(cycle.id);
      }


      // =================================================
      // UPLOAD IMAGES
      // =================================================

      for (
        let i = 0;
        i < images.length;
        i++
      ) {

        const file = images[i];


        // ---------------------------------------------
        // NO IMAGE
        // ---------------------------------------------

        if (!file) {
          continue;
        }


        // ---------------------------------------------
        // IMAGE ALREADY EXISTS
        // ---------------------------------------------

        if (typeof file === "string") {
          continue;
        }


        // ---------------------------------------------
        // GET EXTENSION
        // ---------------------------------------------

        const extension =
          file.name
            .split(".")
            .pop();


        // ---------------------------------------------
        // UNIQUE FILE NAME
        // ---------------------------------------------

        const fileName =
          `${cycle.id}_image${i + 1}.${extension}`;


        // ---------------------------------------------
        // UPLOAD TO STORAGE
        // ---------------------------------------------

        const {
          error: uploadError,
        } = await supabase.storage
          .from("cycle-images")
          .upload(
            fileName,
            file,
            {
              upsert: true,
            }
          );


        if (uploadError) {
          throw uploadError;
        }


        // ---------------------------------------------
        // CHECK cycle_images
        // ---------------------------------------------

        const {
          data: existingImage,
          error: existingImageError,
        } = await supabase
          .from("cycle_images")
          .select("id")
          .eq(
            "cycle_id",
            cycle.id
          )
          .eq(
            "display_order",
            i + 1
          )
          .maybeSingle();


        if (existingImageError) {
          throw existingImageError;
        }


        // ---------------------------------------------
        // UPDATE EXISTING IMAGE RECORD
        // ---------------------------------------------

        if (existingImage) {

          const {
            error: updateImageError,
          } = await supabase
            .from("cycle_images")
            .update({

              image_url:
                fileName,

            })
            .eq(
              "id",
              existingImage.id
            );


          if (updateImageError) {
            throw updateImageError;
          }

        }

        // ---------------------------------------------
        // INSERT NEW IMAGE RECORD
        // ---------------------------------------------

        else {

          const {
            error: insertImageError,
          } = await supabase
            .from("cycle_images")
            .insert({

              cycle_id:
                cycle.id,

              image_url:
                fileName,

              display_order:
                i + 1,

            });


          if (insertImageError) {
            throw insertImageError;
          }
        }
      }


      alert(
        "Draft saved successfully!"
      );


    } catch (error) {

      console.error(
        "Save draft error:",
        error
      );


      alert(
        "Failed to save draft: " +
        error.message
      );

    } finally {

      setSaving(false);
    }
  };


  // =====================================================
  // FINAL LISTING
  // =====================================================

  const handleSubmit = async (event) => {

    event.preventDefault();

    if(submitting) return;

    setSubmitting(true);


    try {

      // =================================================
      // CHECK ALL THREE IMAGES
      // =================================================

      if (
        images.some(
          (image) => !image
        )
      ) {

        alert(
          "Please upload all 3 cycle images."
        );

        return;
      }


      // =================================================
      // GET LOGGED-IN USER
      // =================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();


      if (userError) {
        throw userError;
      }


      if (!user) {

        alert(
          "Please login first."
        );

        return;
      }


      // =================================================
      // GET FORM VALUES
      // =================================================

      const form =
        event.target;


      const ownerName =
        form.elements.ownerName.value;

      const phone =
        form.elements.phone.value;

      const email =
        form.elements.email.value;


      const brand =
        form.elements.brand.value;

      const model =
        form.elements.model.value;

      const cycleType =
        form.elements.cycleType.value;

      const condition =
        form.elements.condition.value;


      const pricePerHour =
        Number(
          form.elements.pricePerHour.value
        );


      const pricePerDay =
        Number(
          form.elements.pricePerDay.value
        );


      const location =
        form.elements.location.value;


      const description =
        form.elements.description.value;


      // =================================================
      // UPDATE PROFILE
      // =================================================

      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .update({

          full_name:
            ownerName,

          phone:
            phone,

          email:
            email,

        })
        .eq("id", user.id);


      if (profileError) {
        throw profileError;
      }


      // =================================================
      // INSERT / UPDATE CYCLE
      // =================================================

      let cycle;


      if (draftId) {

        // ---------------------------------------------
        // CONVERT DRAFT → PENDING
        // ---------------------------------------------

        const {
          data,
          error,
        } = await supabase
          .from("cycles")
          .update({

            owner_id:
              user.id,

            title:
              brand,

            description:
              description,

            cycle_type:
              cycleType,

            brand:
              brand,

            model:
              model,

            condition:
              condition,

            price_per_hour:
              pricePerHour,

            price_per_day:
              pricePerDay,

            location:
              location,

            // IMPORTANT
            status:
              "pending",

            is_verified:
              false,

          })
          .eq("id", draftId)
          .eq("owner_id", user.id)
          .select()
          .single();


        if (error) {
          throw error;
        }


        cycle = data;

      } else {

        // ---------------------------------------------
        // NO DRAFT → CREATE NEW CYCLE
        // ---------------------------------------------

        const {
          data,
          error,
        } = await supabase
          .from("cycles")
          .insert({

            owner_id:
              user.id,

            title:
              brand,

            description:
              description,

            cycle_type:
              cycleType,

            brand:
              brand,

            model:
              model,

            condition:
              condition,

            price_per_hour:
              pricePerHour,

            price_per_day:
              pricePerDay,

            location:
              location,

            status:
              "pending",

            is_verified:
              false,

          })
          .select()
          .single();


        if (error) {
          throw error;
        }


        cycle = data;
      }


      // =================================================
      // UPLOAD / UPDATE THREE IMAGES
      // =================================================

      for (
        let i = 0;
        i < images.length;
        i++
      ) {

        const file =
          images[i];


        // ---------------------------------------------
        // EXISTING IMAGE FROM STORAGE
        // ---------------------------------------------

        if (
          typeof file === "string"
        ) {
          continue;
        }


        // ---------------------------------------------
        // FILE EXTENSION
        // ---------------------------------------------

        const extension =
          file.name
            .split(".")
            .pop();


        // ---------------------------------------------
        // FILE NAME
        // ---------------------------------------------

        const fileName =
          `${cycle.id}_image${i + 1}.${extension}`;


        // ---------------------------------------------
        // STORAGE UPLOAD
        // ---------------------------------------------

        const {
          error: uploadError,
        } = await supabase.storage
          .from("cycle-images")
          .upload(
            fileName,
            file,
            {
              upsert: true,
            }
          );


        if (uploadError) {
          throw uploadError;
        }


        // ---------------------------------------------
        // CHECK IMAGE DATABASE RECORD
        // ---------------------------------------------

        const {
          data: existingImage,
          error: existingImageError,
        } = await supabase
          .from("cycle_images")
          .select("id")
          .eq(
            "cycle_id",
            cycle.id
          )
          .eq(
            "display_order",
            i + 1
          )
          .maybeSingle();


        if (existingImageError) {
          throw existingImageError;
        }


        // ---------------------------------------------
        // UPDATE
        // ---------------------------------------------

        if (existingImage) {

          const {
            error:
              updateImageError,
          } = await supabase
            .from("cycle_images")
            .update({

              image_url:
                fileName,

            })
            .eq(
              "id",
              existingImage.id
            );


          if (updateImageError) {
            throw updateImageError;
          }

        }

        // ---------------------------------------------
        // INSERT
        // ---------------------------------------------

        else {

          const {
            error:
              insertImageError,
          } = await supabase
            .from("cycle_images")
            .insert({

              cycle_id:
                cycle.id,

              image_url:
                fileName,

              display_order:
                i + 1,

            });


          if (insertImageError) {
            throw insertImageError;
          }
        }
      }


      // =================================================
      // SUCCESS
      // =================================================
      // =================================================
      // TRIGGER BACKEND VERIFICATION
      // =================================================

      const webhookResponse = await fetch(
        "https://stem61.app.n8n.cloud/webhook/cycle-listing-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "pending",
            reason: "",
            admin_id: "",
            cycle_id: cycle.id,
          }),
        }
      );

      if (!webhookResponse.ok) {
        throw new Error("Failed to trigger cycle verification backend");
      }

      alert(
        "Cycle submitted successfully! It is now waiting for admin verification."
      );


      // =================================================
      // CLEAR FORM AFTER FINAL SUBMISSION
      // =================================================

      setDraftId(null);

      setImages([
        null,
        null,
        null,
      ]);


    } catch (error) {

      console.error(
        "Cycle listing error:",
        error
      );


      alert(
        "Failed to list cycle: " +
        error.message
      );
    }

    finally {
      setSubmitting(false);
    }
  };


  // =====================================================
  // JSX
  // =====================================================

  return (

    <div className="my-cycles-page">


      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="my-cycles-navbar">

        <div className="my-cycles-logo">
          🚲 CycleShare
        </div>


        <button
          className="back-btn"
          onClick={onBack}
        >
          ← Back
        </button>

      </nav>


      {/* =================================================
          FORM CONTAINER
      ================================================= */}

      <div className="cycle-form-wrapper">


        <div className="cycle-form-header">

          <h1>
            List Your Cycle
          </h1>

          <p>
            Add your cycle details and make it available for other students.
          </p>

        </div>


        {loadingDraft && (

          <p className="section-description">
            Checking for saved draft...
          </p>

        )}


        <form
          onSubmit={handleSubmit}
        >


          {/* =================================================
              OWNER DETAILS
          ================================================= */}

          <div className="form-section">

            <h2>
              Owner Details
            </h2>


            <div className="form-grid">


              <div className="input-group">

                <label>
                  Owner Name
                </label>

                <input
                  type="text"
                  name="ownerName"
                  placeholder="Enter your name"
                  required
                />

              </div>


              <div className="input-group">

                <label>
                  Phone Number
                </label>

                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter phone number"
                  required
                />

              </div>


              <div className="input-group full-width">

                <label>
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="Enter email address"
                  required
                />

              </div>


            </div>

          </div>


          {/* =================================================
              CYCLE DETAILS
          ================================================= */}

          <div className="form-section">

            <h2>
              Cycle Details
            </h2>


            <div className="form-grid">


              <div className="input-group">

                <label>
                  Cycle Brand Name
                </label>

                <input
                  type="text"
                  name="brand"
                  placeholder="Example: Hero, Firefox, Hercules"
                  required
                />

              </div>


              <div className="input-group">

                <label>
                  Cycle Model
                </label>

                <input
                  type="text"
                  name="model"
                  placeholder="Enter cycle model"
                />

              </div>


              <div className="input-group">

                <label>
                  Cycle Type
                </label>


                <select
                  name="cycleType"
                  required
                >

                  <option value="">
                    Select cycle type
                  </option>

                  <option value="mountain">
                    Mountain Bike
                  </option>

                  <option value="road">
                    Road Bike
                  </option>

                  <option value="hybrid">
                    Hybrid
                  </option>

                  <option value="gear">
                    Gear Cycle
                  </option>

                  <option value="normal">
                    Normal Cycle
                  </option>

                </select>

              </div>


              <div className="input-group">

                <label>
                  Cycle Condition
                </label>


                <select
                  name="condition"
                  required
                >

                  <option value="">
                    Select condition
                  </option>

                  <option value="excellent">
                    Excellent
                  </option>

                  <option value="good">
                    Good
                  </option>

                  <option value="average">
                    Average
                  </option>

                </select>

              </div>


            </div>

          </div>


          {/* =================================================
              PRICING
          ================================================= */}

          <div className="form-section">

            <h2>
              Rental Pricing
            </h2>


            <div className="form-grid">


              <div className="input-group">

                <label>
                  Price Per Hour (₹)
                </label>


                <input
                  type="number"
                  name="pricePerHour"
                  min="1"
                  max="100"
                  placeholder="Maximum ₹100"
                  required
                />


                <span className="input-hint">
                  Maximum allowed: ₹100/hour
                </span>

              </div>


              <div className="input-group">

                <label>
                  Price Per Day (₹)
                </label>


                <input
                  type="number"
                  name="pricePerDay"
                  min="1"
                  max="500"
                  placeholder="Maximum ₹500"
                  required
                />


                <span className="input-hint">
                  Maximum allowed: ₹500/day
                </span>

              </div>


            </div>

          </div>


          {/* =================================================
              LOCATION
          ================================================= */}

          <div className="form-section">

            <h2>
              Cycle Location
            </h2>


            <div className="input-group">

              <label>
                Pickup / Cycle Location
              </label>


              <input
                type="text"
                name="location"
                placeholder="Example: NITK Main Gate, Hostel Block, Surathkal"
                required
              />

            </div>

          </div>


          {/* =================================================
              AVAILABILITY
          ================================================= */}

          <div className="form-section">

            <h2>
              Cycle Availability
            </h2>


            <p className="section-description">
              Set the time during which other students can rent or pick up your cycle.
              Use the 24-hour clock.
            </p>


            <div className="form-grid">


              <div className="input-group">

                <label>
                  Available From
                </label>


                <input
                  type="time"
                  name="availableFrom"
                  min="00:00"
                  max="23:59"
                />


                <span className="input-hint">
                  Example: 09:00 = 9:00 AM
                </span>

              </div>


              <div className="input-group">

                <label>
                  Available Until
                </label>


                <input
                  type="time"
                  name="availableUntil"
                  min="00:00"
                  max="23:59"
                />


                <span className="input-hint">
                  Example: 18:30 = 6:30 PM
                </span>

              </div>


            </div>


            <div className="input-group availability-days-group">

              <label>
                Available Days
              </label>


              <div className="days-grid">


                <label className="day-option">

                  <input
                    type="checkbox"
                    name="availableDays"
                    value="monday"
                  />

                  <span>
                    Monday
                  </span>

                </label>


                <label className="day-option">

                  <input
                    type="checkbox"
                    name="availableDays"
                    value="tuesday"
                  />

                  <span>
                    Tuesday
                  </span>

                </label>


                <label className="day-option">

                  <input
                    type="checkbox"
                    name="availableDays"
                    value="wednesday"
                  />

                  <span>
                    Wednesday
                  </span>

                </label>


                <label className="day-option">

                  <input
                    type="checkbox"
                    name="availableDays"
                    value="thursday"
                  />

                  <span>
                    Thursday
                  </span>

                </label>


                <label className="day-option">

                  <input
                    type="checkbox"
                    name="availableDays"
                    value="friday"
                  />

                  <span>
                    Friday
                  </span>

                </label>


                <label className="day-option">

                  <input
                    type="checkbox"
                    name="availableDays"
                    value="saturday"
                  />

                  <span>
                    Saturday
                  </span>

                </label>


                <label className="day-option">

                  <input
                    type="checkbox"
                    name="availableDays"
                    value="sunday"
                  />

                  <span>
                    Sunday
                  </span>

                </label>


              </div>

            </div>

          </div>


          {/* =================================================
              IMAGES
          ================================================= */}

          <div className="form-section">

            <h2>
              Cycle Images
            </h2>


            <p className="section-description">
              Upload exactly 3 clear images of your cycle.
            </p>


            <div className="image-upload-grid">


              {[0, 1, 2].map(
                (index) => (

                  <label
                    className="image-upload-box"
                    key={index}
                  >


                    {images[index] ? (

                      <img
                        src={
                          typeof images[index] ===
                          "string"
                            ? images[index]
                            : URL.createObjectURL(
                                images[index]
                              )
                        }
                        alt={`Cycle ${
                          index + 1
                        }`}
                      />

                    ) : (

                      <>

                        <div className="upload-icon">
                          ＋
                        </div>

                        <span>
                          Upload Image {
                            index + 1
                          }
                        </span>

                      </>

                    )}


                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleImageUpload(
                          index,
                          event
                        )
                      }
                    />


                  </label>

                )
              )}


            </div>

          </div>


          {/* =================================================
              ADDITIONAL DETAILS
          ================================================= */}

          <div className="form-section">

            <h2>
              Additional Details
            </h2>


            <div className="input-group">

              <label>
                Description
              </label>


              <textarea
                name="description"
                rows="5"
                placeholder="Mention any additional information about your cycle..."
              ></textarea>

            </div>

          </div>


          {/* =================================================
              BUTTONS
          ================================================= */}

          <div className="submit-area">


            {/* SAVE DRAFT */}

            <button
              type="button"
              className="list-cycle-btn"
              onClick={saveDraft}
              disabled={saving}
            >

              {saving
                ? "Saving..."
                : "Save Draft"}

            </button>


            {/* FINAL SUBMISSION */}

              <button
                type="submit"
                className="list-cycle-btn"
                disabled={saving || submitting}
              >
                {submitting ? "Listing Cycle..." : "List My Cycle 🚲"}
              </button>


          </div>


        </form>

      </div>

    </div>
  );
}

export default MyCycles;