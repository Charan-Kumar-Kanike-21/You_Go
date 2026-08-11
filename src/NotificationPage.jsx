import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./NotificationPage.css";

const notificationIcons = {
  booking: "🚲",
  cancellation: "⚠️",
  completion: "✅",
  payment: "💰",
  cycle: "🚲",
  approval: "🔐",
  report: "🚨",
  general: "🔔",
};

function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  /*
   * -------------------------------------------------------
   * Fetch notifications
   * -------------------------------------------------------
   */
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setError("You must be logged in to view notifications.");
        return;
      }

      const { data, error: notificationError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (notificationError) throw notificationError;

      setNotifications(data || []);
    } catch (err) {
      console.error("Notification fetch error:", err);
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * -------------------------------------------------------
   * Initial load + realtime subscription
   * -------------------------------------------------------
   */
  useEffect(() => {
    let channel;

    const initialize = async () => {
      await fetchNotifications();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((current) => [
              payload.new,
              ...current,
            ]);
          }
        )
        .subscribe();
    };

    initialize();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  /*
   * -------------------------------------------------------
   * Mark single notification as read
   * -------------------------------------------------------
   */
  const markAsRead = async (notification) => {
    if (notification.is_read) return;

    // Optimistic UI update
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, is_read: true }
          : item
      )
    );

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id);

    if (error) {
      console.error("Mark as read error:", error);

      // Revert if database update failed
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: false }
            : item
        )
      );
    }
  };

  /*
   * -------------------------------------------------------
   * Mark all notifications as read
   * -------------------------------------------------------
   */
  const markAllAsRead = async () => {
    if (markingAll) return;

    try {
      setMarkingAll(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (err) {
      console.error("Mark all as read error:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  /*
   * -------------------------------------------------------
   * Relative time
   * -------------------------------------------------------
   */
  const getRelativeTime = (date) => {
    if (!date) return "";

    const now = new Date();
    const created = new Date(date);

    const seconds = Math.floor(
      (now - created) / 1000
    );

    if (seconds < 60) {
      return "Just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return `${minutes} minute${
        minutes !== 1 ? "s" : ""
      } ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours} hour${
        hours !== 1 ? "s" : ""
      } ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }

    return created.toLocaleDateString();
  };

  /*
   * -------------------------------------------------------
   * Notification action
   * -------------------------------------------------------
   *
   * We don't perform navigation here.
   *
   * The parent/application can later decide what to do
   * with related_id / action_type.
   * -------------------------------------------------------
   */
  const handleAction = (notification) => {
    markAsRead(notification);

    console.log(
      "Notification action:",
      notification
    );

    /*
     * Later your teammates can connect this to:
     *
     * booking page
     * cycle page
     * admin verification page
     * report page
     * etc.
     */
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  /*
   * -------------------------------------------------------
   * Loading
   * -------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="notification-page">
        <div className="notification-loading">
          <div className="loading-icon">🔄</div>

          <h2>Loading notifications...</h2>

          <p>
            Please wait while we get your latest updates.
          </p>
        </div>
      </div>
    );
  }

  /*
   * -------------------------------------------------------
   * Page
   * -------------------------------------------------------
   */
  return (
    <div className="notification-page">

      <main className="notification-container">

        {/* Header */}
        <section className="notification-header">

          <div>
            <span className="notification-eyebrow">
              NITK CYCLE SHARING
            </span>

            <h1>
              Notifications
            </h1>

            <p>
              Stay updated with your latest activity
              and important updates.
            </p>
          </div>

          <div className="notification-header-right">

            {unreadCount > 0 && (
              <span className="unread-count">
                {unreadCount} unread
              </span>
            )}

            <button
              className="mark-all-button"
              onClick={markAllAsRead}
              disabled={
                markingAll || unreadCount === 0
              }
            >
              {markingAll
                ? "Marking..."
                : "Mark all as read"}
            </button>

          </div>

        </section>

        {/* Error */}
        {error && (
          <div className="notification-error">

            <div className="state-icon">
              ⚠️
            </div>

            <h2>
              Unable to load notifications
            </h2>

            <p>{error}</p>

            <button
              className="retry-button"
              onClick={fetchNotifications}
            >
              Try Again
            </button>

          </div>
        )}

        {/* Empty */}
        {!error && notifications.length === 0 && (
          <div className="notification-empty">

            <div className="empty-icon">
              🔔
            </div>

            <h2>
              No notifications
            </h2>

            <p>
              You're all caught up!
              <br />
              New updates will appear here.
            </p>

          </div>
        )}

        {/* Notifications */}
        {!error && notifications.length > 0 && (
          <section className="notification-list">

            {notifications.map((notification) => {

              const icon =
                notificationIcons[
                  notification.type
                ] || notificationIcons.general;

              return (
                <article
                  key={notification.id}
                  className={`notification-card ${
                    !notification.is_read
                      ? "unread"
                      : ""
                  }`}
                  onClick={() =>
                    markAsRead(notification)
                  }
                >

                  <div className="notification-icon">
                    {icon}
                  </div>

                  <div className="notification-content">

                    <div className="notification-title-row">

                      <h3>
                        {notification.title}
                      </h3>

                      {!notification.is_read && (
                        <span className="unread-dot" />
                      )}

                    </div>

                    <p>
                      {notification.message}
                    </p>

                    <div className="notification-footer">

                      <span className="notification-time">
                        {getRelativeTime(
                          notification.created_at
                        )}
                      </span>

                      {notification.type && (
                        <span className="notification-type">
                          {notification.type}
                        </span>
                      )}

                    </div>

                  </div>

                  {/*
                   * ------------------------------------------------
                   * OPTIONAL ADMIN / USER ACTION
                   *
                   * If your database later contains:
                   *
                   * action_type
                   * action_label
                   *
                   * this button automatically becomes available.
                   * ------------------------------------------------
                   */}

                  {notification.action_type && (
                    <button
                      className="notification-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAction(notification);
                      }}
                    >
                      {notification.action_label ||
                        "View"}
                    </button>
                  )}

                </article>
              );
            })}

          </section>
        )}

      </main>
    </div>
  );
}

export default NotificationPage;