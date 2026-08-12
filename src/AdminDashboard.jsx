
import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./AdminDashboard.css";

import NotificationBell from "./NotificationBell";

function AdminDashboard({ onAdminToStudent, onNotifications }) {
  const [activeSection, setActiveSection] = useState("overview");

  const [selectedUser, setSelectedUser] = useState(null);

  const [currentAdmin, setCurrentAdmin] = useState(null);

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState("");

  const [users, setUsers] = useState([]);

  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */

  useEffect(() => {
    initializeAdmin();
  }, []);

  /*
   * =========================================================
   * GET CURRENT ADMIN
   * =========================================================
   */

  const initializeAdmin = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!user) {
        console.error("No authenticated user found.");
        return;
      }

      setCurrentAdmin(user);

      await fetchAdminNotifications(user.id);
      await fetchUsers();
    } catch (error) {
      console.error("Admin initialization failed:", error);

      setAlertsError(
        "Unable to initialize the admin dashboard."
      );

      setAlertsLoading(false);
    }
  };

  /*
   * =========================================================
   * FETCH USERS
   * =========================================================
   *
   * Users come from profiles. Rental counts come from booking_table.
   */

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError("");

      const { data: profiles, error: profilesError } =
        await supabase
          .from("profiles")
          .select("id, full_name, email, is_blocked, created_at")
          .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: bookings, error: bookingsError } =
        await supabase
          .from("booking_table")
          .select("renter_id");

      if (bookingsError) throw bookingsError;

      const rentalCounts = {};

      (bookings || []).forEach((booking) => {
        if (booking.renter_id) {
          rentalCounts[booking.renter_id] =
            (rentalCounts[booking.renter_id] || 0) + 1;
        }
      });

      const formattedUsers = (profiles || []).map((profile) => ({
        id: profile.id,
        name: profile.full_name || "User",
        email: profile.email || "—",
        status: profile.is_blocked ? "Blocked" : "Active",
        rentals: rentalCounts[profile.id] || 0,
        joined: profile.created_at
          ? new Date(profile.created_at).toLocaleDateString()
          : "—",
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsersError("Unable to load user accounts.");
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  /*
   * =========================================================
   * FETCH ADMIN NOTIFICATIONS
   * =========================================================
   *
   * notifications table:
   *
   * id
   * user_id
   * title
   * message
   * type
   * is_read
   * related_id
   * created_at
   *
   * Only notifications belonging to the logged-in
   * admin are fetched.
   */

  const fetchAdminNotifications = async (adminId) => {
    try {
      setAlertsLoading(true);
      setAlertsError("");

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", adminId)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setAlerts(data || []);
    } catch (error) {
      console.error(
        "Failed to fetch admin notifications:",
        error
      );

      setAlertsError(
        "Unable to load administrative notifications."
      );
    } finally {
      setAlertsLoading(false);
    }
  };

  /*
   * =========================================================
   * REALTIME ADMIN NOTIFICATIONS
   * =========================================================
   */

  useEffect(() => {
    if (!currentAdmin) return;

    const channel = supabase
      .channel(
        `admin-notifications-${currentAdmin.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentAdmin.id}`,
        },
        (payload) => {
          setAlerts((currentAlerts) => [
            payload.new,
            ...currentAlerts,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentAdmin]);

  /*
   * =========================================================
   * MARK ONE NOTIFICATION AS READ
   * =========================================================
   */

  const markNotificationAsRead = async (notification) => {
    if (notification.is_read) {
      return;
    }

    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", notification.id)
        .eq("user_id", currentAdmin.id);

      if (error) {
        throw error;
      }

      setAlerts((currentAlerts) =>
        currentAlerts.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      );
    }
  };

  /*
   * =========================================================
   * MARK ALL NOTIFICATIONS AS READ
   * =========================================================
   */

  const markAllNotificationsAsRead = async () => {
    if (!currentAdmin) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("user_id", currentAdmin.id)
        .eq("is_read", false);

      if (error) {
        throw error;
      }

      setAlerts((currentAlerts) =>
        currentAlerts.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error
      );
    }
  };

  /*
   * =========================================================
   * TAKE KEYS RESPONSIBILITY
   * =========================================================
   *
   * For now this marks the notification as read.
   *
   * Later, this can be connected to the actual rental/return
   * resolution table once that workflow is finalized.
   */

  const handleKeyReturnNotification = async (
    notification
  ) => {
    await markNotificationAsRead(notification);
  };

  /*
   * =========================================================
   * BLOCK / UNBLOCK USER
   * =========================================================
   *
   * This function is intentionally isolated.
   *
   * Replace "profiles" and "is_blocked" below with your
   * actual profile/account table and column if different.
   */

  const toggleUserStatus = async (user) => {
    try {
      const newBlockedState =
        user.status !== "Blocked";

      /*
       * IMPORTANT:
       *
       * This is the only place where the admin dashboard
       * attempts to modify another user's account.
       *
       * Your Supabase RLS must separately verify that the
       * authenticated admin is allowed to perform this action.
       */

      const { error } = await supabase
        .from("profiles")
        .update({
          is_blocked: newBlockedState,
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      const newStatus = newBlockedState
        ? "Blocked"
        : "Active";

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                status: newStatus,
              }
            : item
        )
      );

      if (selectedUser?.id === user.id) {
        setSelectedUser({
          ...selectedUser,
          status: newStatus,
        });
      }
    } catch (error) {
      console.error(
        "Failed to update user account status:",
        error
      );

      alert(
        "Unable to change the account status."
      );
    }
  };

  /*
   * =========================================================
   * USER ACCOUNT
   * =========================================================
   */

  const openUserAccount = (user) => {
    setSelectedUser(user);
  };

  const closeUserAccount = () => {
    setSelectedUser(null);
  };


  /*
   * =========================================================
   * NOTIFICATION HELPERS
   * =========================================================
   */

  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "booking":
      case "new_cycle":
      case "cycle":
        return "🚲";

      case "booking_cancelled":
      case "cancelled":
      case "warning":
        return "⚠";

      case "payment":
        return "₹";

      case "key_return":
      case "return":
        return "🔑";

      case "report":
      case "user_report":
        return "⚠";

      default:
        return "🔔";
    }
  };

  const formatNotificationTime = (date) => {
    if (!date) return "";

    const notificationDate =
      new Date(date);

    const now = new Date();

    const difference =
      now.getTime() -
      notificationDate.getTime();

    const minutes =
      Math.floor(
        difference / (1000 * 60)
      );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes} min ago`;
    }

    const hours =
      Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours} hr ago`;
    }

    const days =
      Math.floor(hours / 24);

    if (days < 7) {
      return `${days} day${
        days > 1 ? "s" : ""
      } ago`;
    }

    return notificationDate.toLocaleDateString();
  };

  /*
   * =========================================================
   * UNREAD COUNT
   * =========================================================
   */

  const unreadAlerts =
    alerts.filter(
      (alert) => !alert.is_read
    ).length;

  /*
   * =========================================================
   * USER ACCOUNT VIEW
   * =========================================================
   */

  if (selectedUser) {
    return (
      <div className="admin-page">

        <header className="admin-topbar">

          <div className="admin-brand">

            <div className="admin-logo">
              A
            </div>

            <div>
              <strong>
                Campus Cycle
              </strong>

              <span>
                Administration
              </span>
            </div>

          </div>

          <button
            className="back-admin-button"
            onClick={closeUserAccount}
          >
            ← Back to Admin
          </button>

        </header>


        <main className="user-view-container">

          <div className="user-view-header">

            <div className="user-profile-large">
              {selectedUser.name?.charAt(0) ||
                "U"}
            </div>

            <div>

              <span className="section-label">
                USER ACCOUNT
              </span>

              <h1>
                {selectedUser.name}
              </h1>

              <p>
                {selectedUser.email}
              </p>

            </div>

          </div>


          <section className="user-detail-grid">

            <div className="detail-card">
              <span>User ID</span>

              <strong>
                {selectedUser.id}
              </strong>
            </div>


            <div className="detail-card">
              <span>
                Account Status
              </span>

              <strong
                className={
                  selectedUser.status ===
                  "Blocked"
                    ? "blocked-text"
                    : "active-text"
                }
              >
                {selectedUser.status}
              </strong>
            </div>


            <div className="detail-card">
              <span>
                Total Rentals
              </span>

              <strong>
                {selectedUser.rentals}
              </strong>
            </div>


            <div className="detail-card">
              <span>
                Joined
              </span>

              <strong>
                {selectedUser.joined}
              </strong>
            </div>

          </section>


          <section className="admin-user-actions">

            <div>

              <span className="section-label">
                ADMIN ACTIONS
              </span>

              <h2>
                Account Control
              </h2>

              <p>
                Administrators can block or unblock
                accounts according to platform
                terms and conditions.
              </p>

            </div>


            <button
              className={
                selectedUser.status ===
                "Blocked"
                  ? "unblock-button"
                  : "block-button"
              }
              onClick={() =>
                toggleUserStatus(
                  selectedUser
                )
              }
            >
              {selectedUser.status ===
              "Blocked"
                ? "Unblock Account"
                : "Block Account"}
            </button>

          </section>


          <div className="view-only-notice">

            <span>
              👁
            </span>

            <div>

              <strong>
                View-only access
              </strong>

              <p>
                Administrators can inspect user
                accounts but cannot directly modify
                the user's personal information,
                rental history, or other records
                through this dashboard.
              </p>

            </div>

          </div>

        </main>

      </div>
    );
  }


  /*
   * =========================================================
   * MAIN ADMIN DASHBOARD
   * =========================================================
   */

  return (
    <div className="admin-page">

      {/* =====================================================
          TOP NAVBAR
          ===================================================== */}

      <header className="admin-topbar">

        <div className="admin-brand">

          <div className="admin-logo">
            A
          </div>

          <div>
            <strong>
              Campus Cycle
            </strong>

            <span>
              Administration
            </span>
          </div>

        </div>


        <div className="admin-top-actions">

          <NotificationBell
            onClick={onNotifications}
          />

          <button
            className="student-dashboard-button"
            onClick={
              onAdminToStudent
            }
          >
            Student Dashboard ↗
          </button>


          <div className="admin-profile">

            <div className="admin-avatar">
              AD
            </div>

            <div className="admin-profile-text">

              <strong>
                Administrator
              </strong>

              <span>
                Admin
              </span>

            </div>

          </div>

        </div>

      </header>


      <div className="admin-layout">

        {/* ===================================================
            SIDEBAR
            =================================================== */}

        <aside className="admin-sidebar">

          <div className="sidebar-heading">
            ADMIN PANEL
          </div>


          <button
            className={
              activeSection === "overview"
                ? "sidebar-item active"
                : "sidebar-item"
            }
            onClick={() =>
              setActiveSection(
                "overview"
              )
            }
          >
            <span>◈</span>
            Overview
          </button>


          <button
            className={
              activeSection === "users"
                ? "sidebar-item active"
                : "sidebar-item"
            }
            onClick={() =>
              setActiveSection(
                "users"
              )
            }
          >
            <span>◎</span>
            Users
          </button>


          <button
            className={
              activeSection === "rentals"
                ? "sidebar-item active"
                : "sidebar-item"
            }
            onClick={() =>
              setActiveSection(
                "rentals"
              )
            }
          >
            <span>↔</span>
            Rentals
          </button>


          <aside className="admin-sidebar">

  <div className="sidebar-heading">
    ADMIN PANEL
  </div>

  <button
    className={
      activeSection === "overview"
        ? "sidebar-item active"
        : "sidebar-item"
    }
    onClick={() => setActiveSection("overview")}
  >
    <span>◈</span>
    Overview
  </button>

    <button
      className={
        activeSection === "users"
          ? "sidebar-item active"
          : "sidebar-item"
      }
      onClick={() => setActiveSection("users")}
    >
      <span>◎</span>
      Users
    </button>

    <button
      className={
        activeSection === "rentals"
          ? "sidebar-item active"
          : "sidebar-item"
      }
      onClick={() => setActiveSection("rentals")}
    >
      <span>↔</span>
      Rentals
    </button>

    <div className="sidebar-divider"></div>

    <button
      className="sidebar-item"
      onClick={onAdminToStudent}
    >
      <span>↗</span>
      Student View
    </button>

  </aside>


          <div className="sidebar-divider"></div>


          <button
            className="sidebar-item"
            onClick={
              onAdminToStudent
            }
          >
            <span>↗</span>
            Student View
          </button>

        </aside>


        {/* ===================================================
            MAIN CONTENT
            =================================================== */}

        <main className="admin-content">

          {/* =================================================
              OVERVIEW
              ================================================= */}

          {activeSection ===
            "overview" && (
            <>

              <div className="admin-page-heading">

                <div>

                  <span className="section-label">
                    PLATFORM OVERVIEW
                  </span>

                  <h1>
                    Admin Dashboard
                  </h1>

                  <p>
                    Monitor the campus cycle-sharing
                    platform and handle administrative
                    operations.
                  </p>

                </div>


                <div className="system-status">

                  <span></span>

                  System Operational

                </div>

              </div>


              <section className="admin-stats">

                <div className="admin-stat-card">

                  <span className="stat-icon">
                    ◎
                  </span>

                  <div>

                    <span>
                      Total Users
                    </span>

                    <strong>
                      —
                    </strong>

                    <small>
                      Platform-wide
                    </small>

                  </div>

                </div>


                <div className="admin-stat-card">

                  <span className="stat-icon">
                    ↔
                  </span>

                  <div>

                    <span>
                      Active Rentals
                    </span>

                    <strong>
                      —
                    </strong>

                    <small>
                      Currently ongoing
                    </small>

                  </div>

                </div>


                <div className="admin-stat-card">

                  <span className="stat-icon">
                    🚲
                  </span>

                  <div>

                    <span>
                      Available Cycles
                    </span>

                    <strong>
                      —
                    </strong>

                    <small>
                      Across campus
                    </small>

                  </div>

                </div>


                <div className="admin-stat-card warning-stat">

                  <span className="stat-icon">
                    !
                  </span>

                  <div>

                    <span>
                      Pending Actions
                    </span>

                    <strong>
                      {unreadAlerts}
                    </strong>

                    <small>
                      From notifications
                    </small>

                  </div>

                </div>

              </section>


              <section className="admin-main-grid">

                {/* ==========================================
                    OPERATIONAL ALERTS
                    ========================================== */}

                <div className="admin-panel">

                  <div className="panel-header">

                    <div>

                      <span className="section-label">
                        NEEDS ATTENTION
                      </span>

                      <h2>
                        Operational Alerts
                      </h2>

                    </div>


                    <button
                      className="view-all-button"
                      onClick={() =>
                        setActiveSection(
                          "alerts"
                        )
                      }
                    >
                      View all
                    </button>

                  </div>


                  {alertsLoading ? (

                    <div className="empty-alerts">

                      <span>
                        ↻
                      </span>

                      <h3>
                        Loading notifications...
                      </h3>

                    </div>

                  ) : alertsError ? (

                    <div className="empty-alerts">

                      <span>
                        ⚠
                      </span>

                      <h3>
                        Unable to load notifications
                      </h3>

                      <p>
                        {alertsError}
                      </p>

                      <button
                        className="take-keys-button"
                        onClick={() =>
                          currentAdmin &&
                          fetchAdminNotifications(
                            currentAdmin.id
                          )
                        }
                      >
                        Try Again
                      </button>

                    </div>

                  ) : alerts.length === 0 ? (

                    <div className="empty-alerts">

                      <span>
                        ✓
                      </span>

                      <h3>
                        All clear
                      </h3>

                      <p>
                        There are no pending
                        administrative notifications.
                      </p>

                    </div>

                  ) : (

                    <div className="alert-list">

                      {alerts
                        .filter(
                          (alert) =>
                            !alert.is_read
                        )
                        .slice(0, 3)
                        .map(
                          (alert) => (
                            <div
                              className="admin-alert"
                              key={alert.id}
                              onClick={() =>
                                markNotificationAsRead(
                                  alert
                                )
                              }
                            >

                              <div
                                className={
                                  alert.type ===
                                    "key_return" ||
                                  alert.type ===
                                    "report" ||
                                  alert.type ===
                                    "user_report"
                                    ? "alert-indicator high"
                                    : "alert-indicator"
                                }
                              >
                                {getNotificationIcon(
                                  alert.type
                                )}
                              </div>


                              <div className="alert-content">

                                <div className="alert-title-row">

                                  <strong>
                                    {alert.title}
                                  </strong>

                                  <span>
                                    {formatNotificationTime(
                                      alert.created_at
                                    )}
                                  </span>

                                </div>


                                <p>
                                  {alert.message}
                                </p>


                                {(
                                  alert.type ===
                                    "key_return" ||
                                  alert.type ===
                                    "return"
                                ) && (
                                  <button
                                    className="take-keys-button"
                                    onClick={(
                                      event
                                    ) => {
                                      event.stopPropagation();

                                      handleKeyReturnNotification(
                                        alert
                                      );
                                    }}
                                  >
                                    Take Keys Responsibility
                                  </button>
                                )}

                              </div>

                            </div>
                          )
                        )}

                    </div>

                  )}

                </div>


                {/* ==========================================
                    QUICK ACTIONS
                    ========================================== */}

                <div className="admin-panel">

                  <div className="panel-header">

                    <div>

                      <span className="section-label">
                        ADMIN TOOLS
                      </span>

                      <h2>
                        Quick Actions
                      </h2>

                    </div>

                  </div>


                  <div className="quick-actions">

                    <button
                      onClick={() =>
                        setActiveSection(
                          "users"
                        )
                      }
                    >

                      <span>
                        ◎
                      </span>

                      <div>

                        <strong>
                          Search Users
                        </strong>

                        <small>
                          View any account
                        </small>

                      </div>

                      <b>
                        →
                      </b>

                    </button>


                    <button
                      onClick={() =>
                        setActiveSection(
                          "rentals"
                        )
                      }
                    >

                      <span>
                        ↔
                      </span>

                      <div>

                        <strong>
                          Monitor Rentals
                        </strong>

                        <small>
                          Platform-wide activity
                        </small>

                      </div>

                      <b>
                        →
                      </b>

                    </button>

                    <button
                      onClick={
                        onAdminToStudent
                      }
                    >

                      <span>
                        ↗
                      </span>

                      <div>

                        <strong>
                          Student Dashboard
                        </strong>

                        <small>
                          Open student interface
                        </small>

                      </div>

                      <b>
                        →
                      </b>

                    </button>

                  </div>

                </div>

              </section>

            </>
          )}


          {/* =================================================
              USERS
              ================================================= */}

          {activeSection ===
            "users" && (
            <>

              <div className="admin-page-heading">

                <div>

                  <span className="section-label">
                    ACCOUNT MANAGEMENT
                  </span>

                  <h1>
                    Users
                  </h1>

                  <p>
                    View user accounts and apply
                    permitted account restrictions.
                  </p>

                </div>

              </div>


              <section className="admin-panel users-panel">

                <div className="panel-header">

                  <div>

                    <h2>
                      User Accounts
                    </h2>

                  </div>

                  <span className="record-count">
                    {users.length} shown
                  </span>

                </div>


                <div className="user-table">

                  <div className="user-table-head">

                    <span>
                      User
                    </span>

                    <span>
                      User ID
                    </span>

                    <span>
                      Rentals
                    </span>

                    <span>
                      Status
                    </span>

                    <span>
                      Action
                    </span>

                  </div>


                  {usersLoading ? (
                    <div className="empty-alerts">
                      <span>↻</span>
                      <h3>Loading users...</h3>
                    </div>
                  ) : usersError ? (
                    <div className="empty-alerts">
                      <span>⚠</span>
                      <h3>Unable to load users</h3>
                      <p>{usersError}</p>
                      <button
                        className="take-keys-button"
                        onClick={fetchUsers}
                      >
                        Try Again
                      </button>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="empty-alerts">
                      <span>✓</span>
                      <h3>No users found</h3>
                    </div>
                  ) : (
                    users.map(
                      (user) => (
                        <div
                          className="user-table-row"
                          key={user.id}
                        >

                          <div className="table-user">
                            <div className="table-avatar">
                              {user.name?.charAt(0) || "U"}
                            </div>

                            <div>
                              <strong>{user.name}</strong>
                              <small>{user.email}</small>
                            </div>
                          </div>

                          <span className="table-id">
                            {user.id}
                          </span>

                          <span>{user.rentals}</span>

                          <span
                            className={
                              user.status === "Blocked"
                                ? "status-blocked"
                                : "status-active"
                            }
                          >
                            {user.status}
                          </span>

                          <button
                            className="view-user-button"
                            onClick={() => openUserAccount(user)}
                          >
                            View Account
                          </button>

                        </div>
                      )
                    )
                  )}

                </div>

              </section>

            </>
          )}


          {/* =================================================
              RENTALS
              ================================================= */}

          {activeSection ===
            "rentals" && (
            <>

              <div className="admin-page-heading">

                <div>

                  <span className="section-label">
                    PLATFORM ACTIVITY
                  </span>

                  <h1>
                    Rental Monitoring
                  </h1>

                  <p>
                    Monitor ongoing and recently
                    completed cycle rentals.
                  </p>

                </div>

              </div>


              <section className="rental-monitor-grid">

                <div className="monitor-card">

                  <span>
                    Active Rentals
                  </span>

                  <strong>
                    —
                  </strong>

                  <small>
                    Currently in progress
                  </small>

                </div>


                <div className="monitor-card">

                  <span>
                    Started Today
                  </span>

                  <strong>
                    —
                  </strong>

                  <small>
                    Rental sessions
                  </small>

                </div>


                <div className="monitor-card">

                  <span>
                    Completed Today
                  </span>

                  <strong>
                    —
                  </strong>

                  <small>
                    Successfully returned
                  </small>

                </div>


                <div className="monitor-card">

                  <span>
                    Return Issues
                  </span>

                  <strong>
                    {alerts.filter(
                      (alert) =>
                        alert.type ===
                          "key_return" ||
                        alert.type ===
                          "return"
                    ).length}
                  </strong>

                  <small>
                    From notifications
                  </small>

                </div>

              </section>


              <section className="admin-panel">

                <div className="panel-header">

                  <div>

                    <span className="section-label">
                      LIVE OPERATIONS
                    </span>

                    <h2>
                      Current Activity
                    </h2>

                  </div>

                </div>


                <div className="activity-list">

                  <div className="activity-row">

                    <span className="activity-dot"></span>

                    <div>

                      <strong>
                        Rental monitoring
                      </strong>

                      <small>
                        Live rental data can be connected
                        to the rentals table here.
                      </small>

                    </div>

                    <span>
                      Monitoring
                    </span>

                  </div>


                  <div className="activity-row">

                    <span className="activity-dot warning"></span>

                    <div>

                      <strong>
                        Return assistance
                      </strong>

                      <small>
                        Admin notifications are monitored
                        in real time.
                      </small>

                    </div>

                    <span>
                      Active
                    </span>

                  </div>

                </div>

              </section>

            </>
          )}

        </main>

      </div>

    </div>
  );
}

export default AdminDashboard;