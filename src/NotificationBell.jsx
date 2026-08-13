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
      <span className="bell-icon">
        🔔
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