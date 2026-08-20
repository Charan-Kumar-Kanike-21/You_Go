import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./NotificationBell.css";

function NotificationBell({ onClick, className = "Bell-in-Owner" }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUnreadCount(0);
        return;
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error(
          "Error fetching notification count:",
          error
        );
        return;
      }

      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Notification count error:", error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    let channel;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      channel = supabase
        .channel(`notification-bell-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <button
      className={`notification-bell ${className}`}
      onClick={onClick}
      title="Notifications"
      aria-label="Notifications"
    >
      <span className="notification-icon">
        <span className="notification-spark spark-one"></span>
        <span className="notification-spark spark-two"></span>
        <span className="notification-spark spark-three"></span>

        <svg
          className="notification-svg"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M18 9.5C18 6.46 16.21 4 12 4C7.79 4 6 6.46 6 9.5V13L4.5 16H19.5L18 13V9.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M10 19C10.45 19.62 11.15 20 12 20C12.85 20 13.55 19.62 14 19"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {unreadCount > 0 && (
        <span className="notification-badge">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

export default NotificationBell;