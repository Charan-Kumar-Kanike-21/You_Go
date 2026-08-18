import React, { useState } from "react";
import { supabase } from "./supabase";

function ResetPassword({ onBackToLogin }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      alert("Please fill in both password fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      console.error("Password update error:", error);
      alert(error.message);
      return;
    }

    alert("Password updated successfully! Please log in.");

    await supabase.auth.signOut();

    onBackToLogin();
  };

  return (
    <div>
      <h1>Reset Password</h1>

      <form onSubmit={handleUpdatePassword}>
        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default ResetPassword;