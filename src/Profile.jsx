import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./Profile.css";

import appLogo from "./assets/app_logo.png";

function ProfilePage({ onBack }) {
  const [user, setUser] = useState("");

  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [profilePhoto, setProfilePhoto] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [error, setError] = useState("");


  // =========================================
  // GET LOGGED-IN USER FROM SUPABASE
  // =========================================

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.log("No logged-in user found");
        return;
      }

      setUser(user);

      setFullName(
        user.user_metadata?.full_name || ""
      );

      setPhone(
        user.user_metadata?.phone || ""
      );

      setProfilePhoto(
        user.user_metadata?.profile_photo || ""
      );

      // Email comes directly from Supabase Auth
      setEmail(user.email || "");
    };

    getUser();
  }, []);


  // =========================================
  // PROFILE PHOTO
  // =========================================

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Profile photo must be less than 2MB.");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setProfilePhoto(reader.result);
      setError("");
    };

    reader.readAsDataURL(file);
  };


  // =========================================
  // PHONE NUMBER
  // =========================================

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");

    if (value.length <= 10) {
      setPhone(value);
    }
  };


  // =========================================
  // UPDATE PROFILE
  // =========================================

  const handleUpdate = async () => {
    setError("");

    // Full name validation
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    // Phone validation
    if (!/^\d{10}$/.test(phone)) {
      setError(
        "Mobile number must contain exactly 10 digits."
      );
      return;
    }

    // Password validation
    if (
      newPassword.trim() !== "" &&
      newPassword.length < 6
    ) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    try {
      const updateData = {
        data: {
          full_name: fullName.trim(),
          phone: phone,
          profile_photo: profilePhoto,
        },
      };

      // Change password only if entered
      if (newPassword.trim() !== "") {
        updateData.password = newPassword;
      }

      const {
        data,
        error: updateError,
      } = await supabase.auth.updateUser(updateData);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Update local user
      if (data?.user) {
        setUser(data.user);
      }

      setNewPassword("");

      setIsEditing(false);

    } catch (err) {
      console.error(err);

      setError(
        "Unable to update profile. Please try again."
      );
    }
  };


  // =========================================
  // EDIT PROFILE
  // =========================================

  const handleEdit = () => {
    setError("");
    setIsEditing(true);
  };


  // =========================================
  // INITIAL
  // =========================================

  const initial =
    fullName.trim().length > 0
      ? fullName.trim().charAt(0).toUpperCase()
      : "U";


  return (
    <div className="profile-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="profile-top-header">

        <div className="profile-brand">
          <span className="brand-u">U</span>
          <span className="brand-go">GO</span>
        </div>

        <button
          className="profile-back-btn"
          onClick={onBack}
        >
          ← Back
        </button>

      </header>


      {/* =====================================
          MAIN
      ===================================== */}

      <main className="profile-container">

        <div className="profile-card">

          {/* =================================
              APP LOGO
          ================================= */}

          <div className="profile-logo-container">

            <img
              src={appLogo}
              alt="NITK Cycle Sharing"
              className="profile-app-logo"
            />

          </div>


          {/* =================================
              TITLE
          ================================= */}

          <div className="profile-header">

            <h1>My Profile</h1>

            <p>
              View and manage your account details
            </p>

          </div>


          {/* =================================
              PROFILE PHOTO
          ================================= */}

          <div className="profile-photo-section">

            <div className="profile-photo">

              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile"
                />
              ) : (
                <span>{initial}</span>
              )}

            </div>


            {isEditing && (
              <>
                <input
                  type="file"
                  id="profilePhotoInput"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  hidden
                />

                <label
                  htmlFor="profilePhotoInput"
                  className="change-photo-btn"
                >
                  📷 Change Photo
                </label>
              </>
            )}

          </div>


          {/* =================================
              ERROR MESSAGE
          ================================= */}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}


          {/* =================================
              DETAILS
          ================================= */}

          <div className="profile-details">

            {/* FULL NAME */}

            <div className="profile-field">

              <label>Full Name</label>

              {isEditing ? (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="profile-value">
                  {fullName || "Not provided"}
                </div>
              )}

            </div>


            {/* PHONE NUMBER */}

            <div className="profile-field">

              <label>Phone Number</label>

              {isEditing ? (
                <input
                  type="text"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength="10"
                  inputMode="numeric"
                  placeholder="10 digit mobile number"
                />
              ) : (
                <div className="profile-value">
                  {phone || "Not provided"}
                </div>
              )}

            </div>


            {/* NITK EMAIL */}

            <div className="profile-field">

              <label>NITK Email</label>

              <div className="profile-value non-editable">
                {email || "Not provided"}

                <span className="lock-icon">
                  🔒
                </span>
              </div>

            </div>


            {/* PASSWORD */}

            <div className="profile-field">

              <label>Password</label>

              {isEditing ? (
                <>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    placeholder="Enter new password"
                  />

                  <span className="password-note">
                    Leave empty if you don't want to
                    change your password.
                  </span>
                </>
              ) : (
                <div className="profile-value password-value">
                  ••••••••••
                </div>
              )}

            </div>

          </div>


          {/* =================================
              BUTTON
          ================================= */}

          <div className="profile-actions">

            {!isEditing ? (

              <button
                className="edit-profile-btn"
                onClick={handleEdit}
              >
                ✎ &nbsp; Edit Profile
              </button>

            ) : (

              <button
                className="save-profile-btn"
                onClick={handleUpdate}
              >
                Update Profile
              </button>

            )}

          </div>

        </div>

      </main>


      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="profile-footer">

        © 2026 UGO • NITK Cycle Sharing

      </footer>

    </div>
  );
}

export default ProfilePage;