import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./Profile.css";

import appLogo from "./assets/UGO_logo.jpeg";

function ProfilePage({ onBack, onLogout, onBookingHistory }) {
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
    const getProfile = async () => {
      try {
        // Get currently logged-in user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error(
            "No logged-in user found:",
            authError
          );
          return;
        }

        setUser(user);

        // Get profile details from profiles table
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            phone,
            avatar_url,
            email
          `)
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error(
            "Error loading profile:",
            profileError
          );

          // Email can still come from Auth
          setEmail(user.email || "");

          return;
        }

        console.log("Profile loaded:", profile);

        // Set profile information
        setFullName(profile.full_name || "");
        setPhone(profile.phone || "");
        setProfilePhoto(profile.avatar_url || "");
        setEmail(profile.email || user.email || "");

      } catch (error) {
        console.error(
          "Unexpected profile loading error:",
          error
        );
      }
    };

    getProfile();
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
      // Make sure we have logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("User session not found.");
        return;
      }

      // ==========================================
      // UPDATE PROFILES TABLE
      // ==========================================

      const {
        data: updatedProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone,
          avatar_url: profilePhoto || null,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (profileError) {
        console.error(
          "Profile update error:",
          profileError
        );

        setError(
          "Unable to update profile details."
        );

        return;
      }

      console.log(
        "Updated profile:",
        updatedProfile
      );

      // ==========================================
      // UPDATE PASSWORD IF PROVIDED
      // ==========================================

      if (newPassword.trim() !== "") {
        const {
          error: passwordError,
        } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) {
          setError(passwordError.message);
          return;
        }
      }

      // ==========================================
      // UPDATE LOCAL STATE
      // ==========================================

      setFullName(
        updatedProfile.full_name || ""
      );

      setPhone(
        updatedProfile.phone || ""
      );

      setProfilePhoto(
        updatedProfile.avatar_url || ""
      );

      setNewPassword("");

      setIsEditing(false);

    } catch (error) {
      console.error(
        "Unexpected profile update error:",
        error
      );

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

 // handlelogging out 
  const handleLogout = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmed) {
      return;
    }

    try {
      // Remove saved page
      localStorage.removeItem("cycle_last_page");

      // Sign out from Supabase
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Logout error:",
          error
        );

        alert(
          "Unable to logout. Please try again."
        );

        return;
      }

      // App.jsx will automatically receive
      // the SIGNED_OUT event and navigate to Login.

    } catch (error) {

      console.error(
        "Unexpected logout error:",
        error
      );

      alert(
        "Something went wrong while logging out."
      );
    }
  };


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
                <span className="profile-email-text">
                  {email || "Not provided"}
                </span>

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

            <button
              className="booking-history-profile-btn"
              type="button"
              onClick={() => {
                if (typeof onBookingHistory === "function") {
                  onBookingHistory();
                }
              }}
            >
              <span className="profile-btn-icon">▣</span>
              <span>Booking History</span>
            </button>

            {!isEditing ? (
              <button
                className="edit-profile-btn"
                type="button"
                onClick={handleEdit}
              >
                <span className="profile-btn-icon">✎</span>
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                className="save-profile-btn"
                type="button"
                onClick={handleUpdate}
              >
                <span className="profile-btn-icon">✓</span>
                <span>Update Profile</span>
              </button>
            )}

            <button
              className="logout-profile-btn"
              type="button"
              onClick={handleLogout}
            >
              <span className="profile-btn-icon">↪</span>
              <span>Logout</span>
            </button>

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