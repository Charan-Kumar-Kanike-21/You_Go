import React, { useState } from "react";
import "./Listing.css";
import { supabase } from "./supabase";

function MyCycles({ onBack }) {
  const [images, setImages] = useState([null, null, null]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    cycleType: "",
    condition: "",
    pricePerHour: "",
    pricePerDay: "",
    location: "",
    description: "",
  });

  // -----------------------------
  // HANDLE TEXT INPUT
  // -----------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // -----------------------------
  // HANDLE IMAGE
  // -----------------------------

  const handleImageUpload = (index, event) => {
    const file = event.target.files[0];

    if (!file) return;

    const updatedImages = [...images];
    updatedImages[index] = file;

    setImages(updatedImages);
  };

  // -----------------------------
  // SUBMIT
  // -----------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);

      // --------------------------------
      // 1. GET CURRENT AUTHENTICATED USER
      // --------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Please login before listing a cycle.");
        return;
      }

      console.log("Authenticated user:", user);

      // --------------------------------
      // 2. CHECK THREE IMAGES
      // --------------------------------

      if (images.some((image) => image === null)) {
        alert("Please upload all 3 cycle images.");
        return;
      }

      // --------------------------------
      // 3. INSERT CYCLE
      // --------------------------------

      const { data: cycle, error: cycleError } = await supabase
        .from("cycles")
        .insert({
          owner_id: user.id,

          title: `${formData.brand} ${formData.model}`.trim(),

          description: formData.description,

          cycle_type: formData.cycleType,

          brand: formData.brand,

          model: formData.model,

          condition: formData.condition,

          price_per_hour: Number(formData.pricePerHour),

          price_per_day: Number(formData.pricePerDay),

          location: formData.location,

          status: "pending",

          is_verified: false,
        })
        .select()
        .single();

      if (cycleError) {
        console.error("Cycle insert error:", cycleError);
        throw cycleError;
      }

      console.log("Cycle created:", cycle);

      // --------------------------------
      // 4. UPLOAD THREE IMAGES
      // --------------------------------

      for (let i = 0; i < images.length; i++) {
        const file = images[i];

        // unique filename
        const fileName =
          `${cycle.id}/${Date.now()}-${i}-${file.name}`
            .replace(/\s+/g, "-");

        console.log("Uploading:", fileName);

        const { error: uploadError } = await supabase.storage
          .from("cycle-images")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Image upload error:", uploadError);
          throw uploadError;
        }

        // --------------------------------
        // 5. GET PUBLIC IMAGE URL
        // --------------------------------

        const { data: publicUrlData } = supabase.storage
          .from("cycle-images")
          .getPublicUrl(fileName);

        const imageUrl = publicUrlData.publicUrl;

        console.log("Image URL:", imageUrl);

        // --------------------------------
        // 6. INSERT IMAGE RECORD
        // --------------------------------

        const { error: imageInsertError } = await supabase
          .from("cycle_images")
          .insert({
            cycle_id: cycle.id,
            image_url: imageUrl,
            display_order: i + 1,
          });

        if (imageInsertError) {
          console.error(
            "Cycle image database error:",
            imageInsertError
          );

          throw imageInsertError;
        }
      }

      // --------------------------------
      // 7. SUCCESS
      // --------------------------------

      alert("Cycle listed successfully!");

      console.log("Cycle listing completed:", cycle.id);

      // reset
      setFormData({
        brand: "",
        model: "",
        cycleType: "",
        condition: "",
        pricePerHour: "",
        pricePerDay: "",
        location: "",
        description: "",
      });

      setImages([null, null, null]);

    } catch (error) {
      console.error("Error listing cycle:", error);

      alert(
        error.message ||
        "Something went wrong while listing the cycle."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div>

      {/* NAVBAR */}

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


      {/* FORM */}

      <div className="cycle-form-wrapper">

        <div className="cycle-form-header">

          <h1>List Your Cycle</h1>

          <p>
            Add your cycle details and make it available
            for other students.
          </p>

        </div>


        <form onSubmit={handleSubmit}>

          {/* OWNER */}

          <div className="form-section">

            <h2>Owner Details</h2>

            <div className="form-grid">

              <div className="input-group">

                <label>Owner Name</label>

                <input
                  type="text"
                  placeholder="Enter your name"
                  required
                />

              </div>


              <div className="input-group">

                <label>Phone Number</label>

                <input
                  type="tel"
                  placeholder="Enter phone number"
                  required
                />

              </div>


              <div className="input-group full-width">

                <label>Email</label>

                <input
                  type="email"
                  value="Authenticated NITK account"
                  disabled
                />

              </div>

            </div>

          </div>


          {/* CYCLE DETAILS */}

          <div className="form-section">

            <h2>Cycle Details</h2>

            <div className="form-grid">

              <div className="input-group">

                <label>Cycle Brand Name</label>

                <input
                  type="text"
                  name="brand"
                  placeholder="Example: Hero, Firefox, Hercules"
                  value={formData.brand}
                  onChange={handleChange}
                  required
                />

              </div>


              <div className="input-group">

                <label>Cycle Model</label>

                <input
                  type="text"
                  name="model"
                  placeholder="Enter cycle model"
                  value={formData.model}
                  onChange={handleChange}
                />

              </div>


              <div className="input-group">

                <label>Cycle Type</label>

                <select
                  name="cycleType"
                  value={formData.cycleType}
                  onChange={handleChange}
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

                <label>Cycle Condition</label>

                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
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


          {/* PRICING */}

          <div className="form-section">

            <h2>Rental Pricing</h2>

            <div className="form-grid">

              <div className="input-group">

                <label>Price Per Hour (₹)</label>

                <input
                  type="number"
                  name="pricePerHour"
                  min="1"
                  max="100"
                  placeholder="Maximum ₹100"
                  value={formData.pricePerHour}
                  onChange={handleChange}
                  required
                />

                <span className="input-hint">
                  Maximum allowed: ₹100/hour
                </span>

              </div>


              <div className="input-group">

                <label>Price Per Day (₹)</label>

                <input
                  type="number"
                  name="pricePerDay"
                  min="1"
                  max="500"
                  placeholder="Maximum ₹500"
                  value={formData.pricePerDay}
                  onChange={handleChange}
                  required
                />

                <span className="input-hint">
                  Maximum allowed: ₹500/day
                </span>

              </div>

            </div>

          </div>


          {/* LOCATION */}

          <div className="form-section">

            <h2>Cycle Location</h2>

            <div className="input-group">

              <label>Pickup / Cycle Location</label>

              <input
                type="text"
                name="location"
                placeholder="Example: NITK Main Gate, Hostel Block, Surathkal"
                value={formData.location}
                onChange={handleChange}
                required
              />

            </div>

          </div>


          {/* IMAGES */}

          <div className="form-section">

            <h2>Cycle Images</h2>

            <p className="section-description">
              Upload exactly 3 clear images of your cycle.
            </p>


            <div className="image-upload-grid">

              {[0, 1, 2].map((index) => (

                <label
                  className="image-upload-box"
                  key={index}
                >

                  {images[index] ? (

                    <img
                      src={URL.createObjectURL(images[index])}
                      alt={`Cycle ${index + 1}`}
                    />

                  ) : (

                    <>
                      <div className="upload-icon">
                        ＋
                      </div>

                      <span>
                        Upload Image {index + 1}
                      </span>
                    </>

                  )}


                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      handleImageUpload(index, event)
                    }
                    required
                  />

                </label>

              ))}

            </div>

          </div>


          {/* DESCRIPTION */}

          <div className="form-section">

            <h2>Additional Details</h2>

            <div className="input-group">

              <label>Description</label>

              <textarea
                name="description"
                rows="5"
                placeholder="Mention any additional information about your cycle..."
                value={formData.description}
                onChange={handleChange}
              />

            </div>

          </div>


          {/* SUBMIT */}

          <div className="submit-area">

            <button
              type="submit"
              className="list-cycle-btn"
              disabled={loading}
            >

              {loading
                ? "Listing Cycle..."
                : "List My Cycle 🚲"}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default MyCycles;