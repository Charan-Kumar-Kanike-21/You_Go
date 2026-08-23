import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./NotificationPage.css";

function NotificationPage({ onAction, onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | CHECK WHETHER NOTIFICATION IS READ-ONLY
  |--------------------------------------------------------------------------
  |
  | We are treating:
  |
  | NONE
  | null
  | undefined
  | ""
  |
  | as read-only notifications.
  |
  */

  const isReadOnlyNotification = (notification) => {
    return (
      !notification.action_type ||
      notification.action_type === "NONE"
    );
  };



  // Local UI state for rental request decisions.
  // The parent/backend action connection remains unchanged.
  const [rentalDecisions, setRentalDecisions] = useState({});
  const [processingRentalId, setProcessingRentalId] = useState(null);

  // Cycle IDs for which this owner already has an active rental.
  // Every other pending request for the same cycle must keep its
  // Accept/Reject buttons visible but disabled.
  const [activeRentalCycleIds, setActiveRentalCycleIds] = useState([]);
  const [otpRegeneratedIds, setOtpRegeneratedIds] = useState({});
  // Notifications selected with the checkboxes.
  const [selectedNotificationIds, setSelectedNotificationIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Rental request details subpage. This is used only for
  // rental_request_received notifications.
  const [selectedRentalDetails, setSelectedRentalDetails] = useState(null);
  const [rentalDetailsLoading, setRentalDetailsLoading] = useState(false);

  // One shared clock drives all notification countdowns.
  // The backend-provided expiry_time remains the source of truth.
  const [currentTime, setCurrentTime] = useState(Date.now());

  const getNotificationExpiry = (notification) => {
    const actionData = notification?.action_data || {};

    /*
     * IMPORTANT:
     * expiry_time from the backend is the source of truth.
     *
     * Do NOT compare it with created_at here.
     *
     * A regenerated OTP has a NEW expiry_time while the notification
     * may still have the OLD created_at. Comparing the two would make
     * the regenerated OTP expire immediately.
     */
    const backendExpiry =
      actionData.expiry_time ||
      actionData.expiryTime ||
      actionData.otp_expires_at ||
      actionData.otp_expires_at_timestamp ||
      actionData.expires_at ||
      actionData.timestampz;

    if (backendExpiry) {
      const expiryTimestamp =
        new Date(backendExpiry).getTime();

      if (Number.isFinite(expiryTimestamp)) {
        return expiryTimestamp;
      }
    }

    /*
     * Only use created_at as a fallback when the backend did not
     * provide an expiry timestamp at all.
     */
    const createdTimestamp =
      new Date(notification?.created_at).getTime();

    return Number.isFinite(createdTimestamp)
      ? createdTimestamp + 15 * 60 * 1000
      : null;
  };

  const getRemainingSeconds = (notification) => {
    const expiryTimestamp =
      getNotificationExpiry(notification);

    if (!expiryTimestamp) return null;

    return Math.max(
      0,
      Math.ceil(
        (expiryTimestamp - currentTime) / 1000
      )
    );
  };

  const isNotificationExpired = (notification) => {
    const remaining =
      getRemainingSeconds(notification);

    return remaining !== null && remaining <= 0;
  };

  const formatRemainingTime = (seconds) => {
    if (seconds === null) return null;

    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const isOtpNotification = (notification) => {
    const actionType =
      String(notification?.action_type || "")
        .trim()
        .toLowerCase();

    const title =
      String(notification?.title || "")
        .trim()
        .toLowerCase();

    const message =
      String(notification?.message || "")
        .trim()
        .toLowerCase();

    return (
      actionType === "enter_rental_otp" ||
      actionType === "otp_verification" ||
      actionType === "rental_otp" ||
      actionType === "rental_otp_generated" ||
      actionType === "pickup_otp_generated" ||
      actionType === "regenerate_rental_otp" ||
      title.includes("rental otp") ||
      title.includes("otp generated") ||
      message.includes("pickup otp") ||
      message.includes("session otp")
    );
  };

  const isOwnerOtpNotification = (notification) => {
    if (!isOtpNotification(notification)) {
      return false;
    }

    const actionData =
      notification?.action_data || {};

    // Prefer an explicit recipient role when supplied by the backend.
    const role = String(
      actionData.role ||
      actionData.recipient_role ||
      actionData.user_role ||
      ""
    ).trim().toLowerCase();

    if (role === "owner") return true;
    if (role === "user" || role === "renter") return false;

    // Prefer explicit owner_id when supplied.
    if (actionData.owner_id) {
      return (
        String(actionData.owner_id) ===
        String(notification?.user_id)
      );
    }

    // Existing owner OTP notifications use enter_rental_OTP.
    return (
      String(notification?.action_type || "")
        .trim()
        .toLowerCase() ===
      "enter_rental_otp"
    );
  };

  const isRentalRequestNotification = (notification) =>
    notification?.action_type ===
    "rental_request_received";

  const getRentalCycleId = (notification) => {
    const data = notification?.action_data || {};

    return (
      data.cycle_id ||
      data.cycleId ||
      data.cycle_uuid ||
      data.cycle?.id ||
      notification?.cycle_id ||
      notification?.cycleId ||
      null
    );
  };

  const getRentalBookingId = (notification) => {
    const data = notification?.action_data || {};

    return (
      data.booking_id ||
      data.bookingId ||
      data.booking?.id ||
      notification?.booking_id ||
      notification?.bookingId ||
      null
    );
  };

  const hasActiveRentalForCycle = (notification) => {
    const cycleId = getRentalCycleId(notification);

    if (!cycleId) return false;

    return activeRentalCycleIds.some(
      (activeCycleId) =>
        String(activeCycleId) === String(cycleId)
    );
  };

  /*
   * Rental decision is persisted inside notifications.action_data.
   *
   * In addition, active bookings are checked directly from booking_table
   * so the one-active-rental-per-cycle rule still works after a refresh
   * or when the other request notifications do not contain a decision.
   *
   * We keep rentalDecisions as a local cache for the current page,
   * but action_data is the source of truth so the decision survives
   * a refresh/reload of the notification page.
   */
  const getPersistedRentalDecision = (notification) => {
    const actionData = notification?.action_data;

    if (!actionData || typeof actionData !== "object") {
      return null;
    }

    const decision =
      actionData.rental_decision ||
      actionData.rentalDecision ||
      null;

    return decision === "accepted" || decision === "rejected"
      ? decision
      : null;
  };

  const getRentalDecision = (notification) =>
    rentalDecisions[notification?.id] ||
    getPersistedRentalDecision(notification) ||
    null;

   const isRentalRequestTemporarilyLocked = (notification) => {
    const decision = getRentalDecision(notification);

    // The request that was itself accepted/rejected must
    // continue showing its final decision.
    if (decision) {
      return false;
    }

    // Another request for this same cycle has already
    // been accepted.
    return hasAcceptedRentalForCycle(notification);
  };

  const hasAcceptedRentalForCycle = (notification) => {
    const cycleId = getRentalCycleId(notification);

    if (!cycleId) return false;

    // First check active bookings fetched from booking_table.
    if (hasActiveRentalForCycle(notification)) {
      const bookingId = getRentalBookingId(notification);

      // If this notification itself is the already-active booking,
      // it must not be blocked by its own active booking.
      if (!bookingId) {
        return true;
      }
    }

    // Also check persisted/local Accepted decisions on notifications.
    return notifications.some((item) => {
      if (String(item.id) === String(notification.id)) {
        return false;
      }

      return (
        getRentalDecision(item) === "accepted" &&
        String(getRentalCycleId(item)) === String(cycleId)
      );
    });
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (updateError) throw updateError;

      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      console.error(
        "Error marking notification as read:",
        err
      );
    }
  };

  /*
   * Open the renter-details subpage for a rental request.
   *
   * The notification action_data normally contains booking_id.
   * We fetch the latest booking + renter profile so the owner sees
   * the actual current renter information.
   */
  const openRentalDetails = async (notification) => {
    if (!isRentalRequestNotification(notification)) return;

    setRentalDetailsLoading(true);
    setSelectedRentalDetails({
      notification,
      renterName: "Loading...",
      renterPhone: "Loading...",
      rentalDuration: "Loading...",
    });

    try {
      const actionData =
        notification?.action_data &&
        typeof notification.action_data === "object"
          ? notification.action_data
          : {};

      const bookingId =
        actionData.booking_id ||
        actionData.bookingId ||
        actionData.booking?.id ||
        notification?.booking_id ||
        null;

      let booking = null;

      if (bookingId) {
        const {
          data,
          error: bookingError,
        } = await supabase
          .from("booking_table")
          .select(`
            id,
            renter_id,
            no_of_hours,
            no_of_days
          `)
          .eq("id", bookingId)
          .maybeSingle();

        if (bookingError) throw bookingError;
        booking = data;
      }

      const renterId =
        booking?.renter_id ||
        actionData.renter_id ||
        actionData.renterId ||
        actionData.user_id ||
        actionData.userId ||
        null;

      let renterProfile = null;

      if (renterId) {
        const {
          data,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("full_name, phone, email")
          .eq("id", renterId)
          .maybeSingle();

        if (profileError) throw profileError;
        renterProfile = data;
      }

      const renterName =
        renterProfile?.full_name?.trim() ||
        renterProfile?.email?.split("@")[0] ||
        actionData.renter_name ||
        actionData.renterName ||
        "Renter";

      const renterPhone =
        renterProfile?.phone ||
        actionData.renter_phone ||
        actionData.renterPhone ||
        "Mobile number unavailable";

      const days =
        booking?.no_of_days ??
        actionData.no_of_days ??
        actionData.noOfDays ??
        actionData.days ??
        0;

      const hours =
        booking?.no_of_hours ??
        actionData.no_of_hours ??
        actionData.noOfHours ??
        actionData.hours ??
        0;

      const numericDays = Number(days) || 0;
      const numericHours = Number(hours) || 0;

      let rentalDuration =
        actionData.rental_duration ||
        actionData.rentalDuration ||
        actionData.duration ||
        null;

      if (!rentalDuration) {
        const durationParts = [];

        if (numericDays > 0) {
          durationParts.push(
            `${numericDays} day${numericDays === 1 ? "" : "s"}`
          );
        }

        if (numericHours > 0) {
          durationParts.push(
            `${numericHours} hour${numericHours === 1 ? "" : "s"}`
          );
        }

        rentalDuration =
          durationParts.length > 0
            ? durationParts.join(" ")
            : "Duration unavailable";
      }

      setSelectedRentalDetails({
        notification,
        renterName,
        renterPhone,
        rentalDuration,
      });
    } catch (err) {
      console.error(
        "Error fetching rental request details:",
        err
      );

      setSelectedRentalDetails({
        notification,
        renterName: "Renter unavailable",
        renterPhone: "Mobile number unavailable",
        rentalDuration: "Duration unavailable",
      });
    } finally {
      setRentalDetailsLoading(false);
    }
  };

  const closeRentalDetails = () => {
    setSelectedRentalDetails(null);
    setRentalDetailsLoading(false);
  };

const handleRentalDecision = async (notification, decision) => {
  if (!notification?.id || processingRentalId) return;

  const currentDecision = getRentalDecision(notification);

  console.log("current desicion :",currentDecision);
  if (currentDecision) return;

  /*
   * TEMPORARY LOCK
   *
   * Another request for this cycle may already have been accepted.
   * The notification remains visible, but Accept/Reject are blocked.
   *
   * The lock is stored in action_data so it survives page refreshes.
   */
  if (isRentalRequestTemporarilyLocked(notification)) {
    return;
  }

  /*
   * Existing same-cycle protection.
   */
  if (
    decision === "accepted" &&
    hasAcceptedRentalForCycle(notification)
  ) {
    return;
  }

  const action =
    decision === "accepted"
      ? "accepted_rental_request"
      : "rejected_rental_request";

  setProcessingRentalId(notification.id);

  try {
    if (typeof onAction !== "function") {
      throw new Error(
        "Notification action handler is not provided."
      );
    }

    /*
     * DO NOT disturb the existing backend connection.
     */
    await onAction(action, notification);

    /*
     * Preserve existing action_data.
     */
    const existingActionData =
      notification?.action_data &&
      typeof notification.action_data === "object"
        ? notification.action_data
        : {};

    /*
     * Store this owner's decision.
     */
    const updatedActionData = {
      ...existingActionData,
      rental_decision: decision,

      /*
       * The notification which was actually accepted/rejected
       * must not be locked.
       */
      rental_locked: false,
    };

    console.log("updated action data :",updatedActionData);

    const {
      data: updatedNotification,
      error: decisionUpdateError,
    } = await supabase
      .from("notifications")
      .update({
        action_data: updatedActionData,
      })
      .eq("id", notification.id)
      .eq("user_id", notification.user_id)
      .select("*")
      .single();

    if (decisionUpdateError) {
      throw decisionUpdateError;
    }

    /*
     * Preserve existing local decision state.
     */
    setRentalDecisions((previous) => ({
      ...previous,
      [notification.id]: decision,
    }));

    console.log("rental descisions :", rentalDecisions);

    /*
     * Update this notification locally.
     */
    setNotifications((previousNotifications) =>
      previousNotifications.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              ...(updatedNotification || {}),
              action_data: updatedActionData,
            }
          : item
      )
    );

    /*
     * =========================================================
     * TEMPORARY BLOCKING
     * =========================================================
     *
     * Only when an owner ACCEPTS a request:
     *
     *   Same cycle
     *        ↓
     * Other rental requests
     *        ↓
     * rental_locked = true
     *
     * Their cards remain visible.
     * Their Accept/Reject buttons become disabled.
     *
     * We do NOT mark them as rejected.
     */
    if (decision === "accepted") {
      const cycleId = getRentalCycleId(notification);

      console.log("cycle id:", cycleId);

      if (cycleId) {
        const lockTimestamp =
          new Date().toISOString();

        const otherRentalNotifications =
          notifications.filter((item) => {
            /*
             * Don't lock the accepted notification itself.
             */
            if (
              String(item.id) ===
              String(notification.id)
            ) {
              return false;
            }

            /*
             * Only rental-request notifications.
             */
            if (
              !isRentalRequestNotification(item)
            ) {
              return false;
            }

            /*
             * Only notifications belonging to
             * the same cycle.
             */
            const itemCycleId =
              getRentalCycleId(item);

            return (
              itemCycleId &&
              String(itemCycleId) ===
                String(cycleId)
            );
          });

        /*
         * Persist the temporary lock in Supabase.
         */
        for (const item of otherRentalNotifications) {
          const itemActionData =
            item?.action_data &&
            typeof item.action_data === "object"
              ? item.action_data
              : {};

          /*
           * Don't overwrite existing action_data.
           */
          const lockedActionData = {
            ...itemActionData,

            rental_locked: true,
            rental_lock_reason:
              "another_request_accepted",
            rental_locked_at: lockTimestamp,
          };

          console.log("locked action data: ",lockedActionData);

          const { error: lockError } =
            await supabase
              .from("notifications")
              .update({
                action_data: lockedActionData,
              })
              .eq("id", item.id)
              .eq("user_id", item.user_id);

          if (lockError) {
            console.error(
              "Unable to temporarily lock rental request:",
              item.id,
              lockError
            );
          }
        }

        /*
         * Immediately update the UI.
         *
         * This means the owner doesn't have to wait for
         * Realtime to see the buttons become disabled.
         */
        setNotifications((previousNotifications) =>
          previousNotifications.map((item) => {
            const shouldLock =
              otherRentalNotifications.some(
                (other) =>
                  String(other.id) ===
                  String(item.id)
              );

            if (!shouldLock) {
              return item;
            }

            const currentActionData =
              item?.action_data &&
              typeof item.action_data === "object"
                ? item.action_data
                : {};

            return {
              ...item,
              action_data: {
                ...currentActionData,
                rental_locked: true,
                rental_lock_reason:
                  "another_request_accepted",
                rental_locked_at: lockTimestamp,
              },
            };
          })
        );
      }
    }

    /*
     * Existing notification-read logic.
     */
    if (!notification.is_read) {
      await markNotificationAsRead(
        notification.id
      );
    }
  } catch (err) {
    console.error(
      "Rental request action failed:",
      err
    );
  } finally {
    setProcessingRentalId(null);
  }
};

  /*
  |--------------------------------------------------------------------------
  | COUNTDOWN CLOCK
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);


  /*
  |--------------------------------------------------------------------------
  | REGENERATE OTP
  |--------------------------------------------------------------------------
  |
  | The backend remains responsible for generating/sending the new OTP
  | and returning/updating the new expiry_time. We only send the existing
  | notification + booking context through the established onAction path.
  |--------------------------------------------------------------------------
  */

  const handleRegenerateOtp = async (notification) => {
    if (!notification?.id || processingRentalId) return;

    try {
      setProcessingRentalId(notification.id);
      setError(null);

      if (typeof onAction !== "function") {
        throw new Error(
          "Notification action handler is not provided."
        );
      }

      /*
       * App.jsx calls the regeneration webhook and RETURNS its
       * backend response to us.
       */
      const backendResult = await onAction(
        "regenerate_rental_otp",
        notification
      );

      if (backendResult === false) {
        throw new Error(
          "OTP regeneration was not completed by the backend."
        );
      }

      /*
       * Extract the NEW expiry timestamp returned by the backend.
       */
      const returnedActionData =
        backendResult?.action_data &&
        typeof backendResult.action_data === "object"
          ? backendResult.action_data
          : {};

      const backendExpiry =
        returnedActionData.expiry_time ||
        returnedActionData.expiryTime ||
        returnedActionData.otp_expires_at ||
        returnedActionData.otp_expires_at_timestamp ||
        returnedActionData.expires_at ||
        returnedActionData.timestampz ||
        backendResult?.expiry_time ||
        backendResult?.expiryTime ||
        backendResult?.otp_expires_at;

      /*
       * If the backend returned an expiry timestamp, use it.
       *
       * If it did not return one, temporarily start a 15-minute
       * client countdown. Realtime/fetch will replace it with the
       * actual backend expiry as soon as the notification is updated.
       */
      const nextExpiry =
        backendExpiry ||
        new Date(
          Date.now() + 15 * 60 * 1000
        ).toISOString();

      /*
       * IMPORTANT:
       * The old notification was expired. We immediately convert the
       * owner card back into the active OTP state by replacing its
       * expiry_time.
       */
      setOtpRegeneratedIds((previous) => ({
        ...previous,
        [notification.id]: true,
      }));

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: false,
                message:
                  "OTP regenerated successfully. Enter the new OTP sent to the renter.",
                action_type:
                  item.action_type || "enter_rental_otp",
                action_data: {
                  ...(item.action_data || {}),
                  ...returnedActionData,
                  expiry_time: nextExpiry,
                },
              }
            : item
        )
      );

      /*
       * Give the backend a moment to finish creating/updating the
       * notification rows before fetching them.
       *
       * Realtime will also refresh the page as soon as Supabase emits
       * the INSERT/UPDATE event.
       */
      await new Promise((resolve) =>
        window.setTimeout(resolve, 1200)
      );

      await fetchNotifications();

    } catch (err) {
      console.error(
        "OTP regeneration failed:",
        err
      );

      setError(
        err.message ||
        "Unable to regenerate OTP."
      );
    } finally {
      setProcessingRentalId(null);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | FETCH NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const fetchNotifications = async () => {

    try {

      setLoading(true);
      setError(null);


      /*
       * Get currently logged-in user.
       */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();


      if (userError) {
        throw userError;
      }


      if (!user) {

        setActiveRentalCycleIds([]);

        setError(
          "User is not logged in."
        );

        return;
      }


      console.log(
        "Fetching notifications for:",
        user.id
      );

      /*
       * Find cycles for which this owner already has an ACTIVE
       * booking. This is the authoritative UI check for the rule:
       *
       *     one active rental per cycle
       *
       * Therefore, if cycle A already has an active booking, all
       * other rental-request notifications for cycle A must keep
       * Accept + Reject visible but disabled.
       *
       * A different cycle can still be accepted normally.
       */
      const {
        data: activeOwnerBookings,
        error: activeBookingError,
      } = await supabase
        .from("booking_table")
        .select("id, cycle_id, renter_id, status")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .is("returned_at", null)
        .is("cancelled_at", null);

      if (activeBookingError) {
        throw activeBookingError;
      }

      const activeCycleIds = (activeOwnerBookings || [])
        .map((booking) => booking.cycle_id)
        .filter(Boolean);

      setActiveRentalCycleIds(activeCycleIds);

      /*
       * Fetch notifications belonging
       * to the current user.
       */

      const {
        data,
        error: notificationError,
      } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });


      if (notificationError) {
        throw notificationError;
      }


      /*
       * Initially store fetched notifications.
       */

      const fetchedNotifications =
        data || [];


      /*
       * Restore rental decisions from the database.
       *
       * The owner may have selected Accept/Reject before leaving
       * the page. Because the choice is stored in action_data,
       * rebuild the local decision cache after every fetch.
       */
      const persistedRentalDecisions = {};

      fetchedNotifications.forEach((notification) => {
        const decision = getPersistedRentalDecision(notification);

        if (decision) {
          persistedRentalDecisions[notification.id] = decision;
        }
      });

      setRentalDecisions(persistedRentalDecisions);

      /*
       * Store fetched notifications as-is.
       * Read/unread status is controlled by the user now.
       */
      setNotifications(fetchedNotifications);

    } catch (err) {

      console.error(
        "Error fetching notifications:",
        err
      );

      setError(
        err.message ||
        "Failed to load notifications."
      );

    } finally {

      setLoading(false);

    }
  };


  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    fetchNotifications();

  }, []);



  /*
  |--------------------------------------------------------------------------
  | REALTIME NOTIFICATION UPDATES
  |--------------------------------------------------------------------------
  |
  | Refresh the current user's notifications whenever the backend
  | creates or updates an OTP notification. This lets the renter see
  | the newly generated session OTP and fresh 15-minute expiry without
  | manually refreshing the page.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let channel = null;

    const subscribeToNotifications = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return;

      channel = supabase
        .channel(`notification-page-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log(
              "Notification realtime update:",
              payload
            );

            fetchNotifications();
          }
        )
        .subscribe((status) => {
          console.log(
            "Notification realtime status:",
            status
          );
        });
    };

    subscribeToNotifications();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);


  /*
  |--------------------------------------------------------------------------
  | NOTIFICATION SELECTION / BULK ACTIONS
  |--------------------------------------------------------------------------
  */

  const toggleNotificationSelection = (notificationId) => {
    setSelectedNotificationIds((previous) =>
      previous.includes(notificationId)
        ? previous.filter((id) => id !== notificationId)
        : [...previous, notificationId]
    );
  };

  const markAllNotificationsAsRead = async () => {
    if (bulkProcessing || notifications.length === 0) return;

    setBulkProcessing(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("User is not logged in.");

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (updateError) throw updateError;

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      setError(err.message || "Unable to mark all notifications as read.");
    } finally {
      setBulkProcessing(false);
    }
  };

  const clearAllNotifications = async () => {
    if (bulkProcessing || notifications.length === 0) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear all notifications?"
    );

    if (!confirmed) return;

    setBulkProcessing(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("User is not logged in.");

      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setNotifications([]);
      setSelectedNotificationIds([]);
    } catch (err) {
      console.error("Error clearing all notifications:", err);
      setError(err.message || "Unable to clear all notifications.");
    } finally {
      setBulkProcessing(false);
    }
  };

  const markSelectedNotificationsAsRead = async () => {
    if (bulkProcessing || selectedNotificationIds.length === 0) return;

    setBulkProcessing(true);

    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", selectedNotificationIds);

      if (updateError) throw updateError;

      const selected = new Set(selectedNotificationIds);

      setNotifications((previous) =>
        previous.map((notification) =>
          selected.has(notification.id)
            ? { ...notification, is_read: true }
            : notification
        )
      );
      setSelectedNotificationIds([]);
    } catch (err) {
      console.error("Error marking selected notifications as read:", err);
      setError(err.message || "Unable to mark selected notifications as read.");
    } finally {
      setBulkProcessing(false);
    }
  };

  const deleteSelectedNotifications = async () => {
    if (bulkProcessing || selectedNotificationIds.length === 0) return;

    setBulkProcessing(true);

    try {
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .in("id", selectedNotificationIds);

      if (deleteError) throw deleteError;

      const selected = new Set(selectedNotificationIds);

      setNotifications((previous) =>
        previous.filter((notification) => !selected.has(notification.id))
      );
      setSelectedNotificationIds([]);
    } catch (err) {
      console.error("Error deleting selected notifications:", err);
      setError(err.message || "Unable to delete selected notifications.");
    } finally {
      setBulkProcessing(false);
    }
  };

  const allNotificationsSelected =
    notifications.length > 0 &&
    selectedNotificationIds.length === notifications.length;

  const toggleSelectAllNotifications = () => {
    setSelectedNotificationIds(
      allNotificationsSelected
        ? []
        : notifications.map((notification) => notification.id)
    );
  };


  /*
  |--------------------------------------------------------------------------
  | GET ACTION BUTTON LABEL
  |--------------------------------------------------------------------------
  */

  const getActionButtonLabel = (
    actionType
  ) => {

    switch (actionType) {

      case "enter_rental_OTP":
        return "Enter OTP";


      case "report_owner":
        return "Report Owner";


      case "view_rental":
        return "View Rental";


      case "view_extension":
        return "View Extension";


      case "cycle_returned":
        return "View";


      case "view_cycle":
        return "View Cycle";


      case "view_report":
        return "View Report";


      case "view_account":
        return "View Account";


      case "retry_payment":
        return "Retry Payment";


      case "view_dispute":
        return "View Dispute";


      case "view_security":
        return "View Security";


      default:
        return "Action";
    }
  };


  /*
  |--------------------------------------------------------------------------
  | FORMAT TITLE
  |--------------------------------------------------------------------------
  */

  const formatNotificationTitle = (
    title
  ) => {

    if (!title) {
      return "Notification";
    }

    return title
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(
        /\b\w/g,
        (char) =>
          char.toUpperCase()
      );
  };


  /*
  |--------------------------------------------------------------------------
  | FORMAT DATE
  |--------------------------------------------------------------------------
  */

  const formatNotificationDate = (
    createdAt
  ) => {

    if (!createdAt) {
      return "";
    }

    try {

      return new Date(
        createdAt
      ).toLocaleString(
        "en-IN",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      );

    } catch {

      return createdAt;

    }
  };


  /*
  |--------------------------------------------------------------------------
  | LOADING SCREEN
  |--------------------------------------------------------------------------
  */

  if (loading) {

    return (

      <div className="notification-page">

        <main className="notification-container">

          <div className="notification-empty">

            <div className="notification-empty-icon notification-empty-bell" aria-hidden="true">♧</div>

            <h2>
              Loading notifications...
            </h2>

            <p>
              Please wait while we fetch
              your notifications.
            </p>

          </div>

        </main>

      </div>

    );
  }


  /*
  |--------------------------------------------------------------------------
  | ERROR SCREEN
  |--------------------------------------------------------------------------
  */

  if (error) {

    return (

      <div className="notification-page">

        <main className="notification-container">

          <div className="notification-empty">

            <div className="notification-empty-icon">
              ⚠️
            </div>

            <h2>
              Unable to load notifications
            </h2>

            <p>
              {error}
            </p>

            <button
              className="notification-action-button"
              onClick={fetchNotifications}
            >
              Try Again
              <span>↻</span>
            </button>

          </div>

        </main>

      </div>

    );
  }


  /*
  |--------------------------------------------------------------------------
  | MAIN PAGE
  |--------------------------------------------------------------------------
  */

                            /*
   * Rental details subpage.
   * This is intentionally rendered only when a rental request
   * notification has been selected.
   */
  if (selectedRentalDetails) {
    return (
      <main className="notification-page rental-details-page">
        <section className="rental-details-subpage">
          <button
            type="button"
            className="rental-details-back-button"
            onClick={closeRentalDetails}
            aria-label="Back to notifications"
          >
            ← Back
          </button>

          <div className="rental-details-header">
            <div className="rental-details-title-group">
              <div className="rental-details-heading-copy">
                <h2>Rental Request Details</h2>
                <p>Review the renter details before accepting the rental.</p>
              </div>
            </div>
          </div>

          {rentalDetailsLoading ? (
            <div className="rental-details-loading">
              <span className="rental-action-spinner" />
              Loading renter details...
            </div>
          ) : (
            <div className="rental-details-list">
              <div className="rental-detail-row">
                <span className="rental-detail-icon" aria-hidden="true">♙</span>
                <div className="rental-detail-content">
                  <span className="rental-detail-label">User Name</span>
                  <strong className="rental-detail-value">
                    {selectedRentalDetails.renterName}
                  </strong>
                </div>
              </div>

              <div className="rental-detail-row">
                <span className="rental-detail-icon" aria-hidden="true">☎</span>
                <div className="rental-detail-content">
                  <span className="rental-detail-label">Mobile Number</span>
                  <strong className="rental-detail-value">
                    {selectedRentalDetails.renterPhone}
                  </strong>
                </div>
              </div>

              <div className="rental-detail-row">
                <span className="rental-detail-icon" aria-hidden="true">◷</span>
                <div className="rental-detail-content">
                  <span className="rental-detail-label">Rental Duration</span>
                  <strong className="rental-detail-value">
                    {selectedRentalDetails.rentalDuration}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (

    <div className="notification-page">

      <main className="notification-container">


        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="notification-header">

          <div className="notification-header-left">

            {onBack && (

              <button
                className="notification-back-button"
                onClick={onBack}
              >
                ← Back
              </button>

            )}


            <span className="notification-eyebrow">
              UGO · CAMPUS CYCLE EXCHANGE
            </span>


            <h1>
              Notifications
            </h1>


            <p>
              Stay updated with your rentals,
              cycle listings and important
              account activity.
            </p>

          </div>

        </header>


        {/* =====================================================
            CONTENT
        ====================================================== */}

        <section className="notification-content">

          {notifications.length > 0 && (
            <>
              <div className="notification-toolbar">
                <div className="notification-toolbar-left">
                  <label className="notification-select-all custom-notification-checkbox select-all-checkbox">
                    <input
                      type="checkbox"
                      checked={allNotificationsSelected}
                      onChange={toggleSelectAllNotifications}
                      disabled={bulkProcessing}
                    />
                    <span className="notification-checkbox-box" aria-hidden="true"></span>
                    <span className="select-all-label">Select all</span>
                  </label>

                  <span className="notification-count">
                    {selectedNotificationIds.length > 0
                      ? `${selectedNotificationIds.length} selected`
                      : `${notifications.length} notification${notifications.length === 1 ? "" : "s"}`}
                  </span>
                </div>

                <div className="notification-toolbar-actions">
                  <button
                    type="button"
                    className="notification-toolbar-button read-all-button"
                    onClick={markAllNotificationsAsRead}
                    disabled={bulkProcessing}
                  >
                    ✓ Mark all as read
                  </button>

                  <button
                    type="button"
                    className="notification-toolbar-button clear-all-button"
                    onClick={clearAllNotifications}
                    disabled={bulkProcessing}
                  >
                    🗑 Clear all notifications
                  </button>
                </div>
              </div>

              {selectedNotificationIds.length > 0 && (
                <div className="notification-selection-bar">
                  <span>{selectedNotificationIds.length} selected</span>

                  <div className="notification-selection-actions">
                    <button
                      type="button"
                      className="selected-mark-read-button"
                      onClick={markSelectedNotificationsAsRead}
                      disabled={bulkProcessing}
                    >
                      ✓ Mark as read
                    </button>

                    <button
                      type="button"
                      className="selected-delete-button"
                      onClick={deleteSelectedNotifications}
                      disabled={bulkProcessing}
                    >
                      🗑 Delete
                    </button>

                    <button
                      type="button"
                      className="notification-cancel-selection"
                      onClick={() => setSelectedNotificationIds([])}
                      disabled={bulkProcessing}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===================================================
              NO NOTIFICATIONS
          ==================================================== */}

          {notifications.length === 0 ? (

            <div className="notification-empty">

              <div className="notification-empty-icon">
                  <span
                    className="notification-bell-icon"
                    aria-hidden="true"
                  ></span>
              </div>


              <h2>
                No notifications
              </h2>


              <p>
                New rental activity,
                cycle updates and important
                announcements will appear here.
              </p>

            </div>

          ) : (


            /* =================================================
               NOTIFICATION LIST
            ================================================== */

            <div className="notification-list">

              {notifications.map(
                (notification) => {


                  /*
                   * Determine whether this notification
                   * is read-only.
                   */

                  const isReadOnly =
                    isReadOnlyNotification(
                      notification
                    );


                  /*
                   * Action notification means
                   * action_type is something other than NONE.
                   */

                  const isAction =
                    !isReadOnly;


                  /*
                   * Get appropriate button label.
                   */

                  const buttonText =
                    getActionButtonLabel(
                      notification.action_type
                    );


                  return (

                    <article
                      key={notification.id}
                      className={`notification-card ${
                        notification.is_read
                          ? "notification-read"
                          : "notification-unread"
                      } ${
                        selectedNotificationIds.includes(notification.id)
                          ? "notification-selected"
                          : ""
                      }`}
                    >


                      <label
                        className="notification-item-checkbox custom-notification-checkbox"
                        aria-label={`Select ${notification.title || "notification"}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedNotificationIds.includes(
                            notification.id
                          )}
                          onChange={() =>
                            toggleNotificationSelection(
                              notification.id
                            )
                          }
                          disabled={bulkProcessing}
                        />
                        <span />
                      </label>

                      {/* =======================================
                          NOTIFICATION ICON
                      ======================================== */}

                      <div className="notification-icon">
                        <span className="notification-bell-icon" aria-hidden="true">♧</span>
                      </div>


                      {/* =======================================
                          NOTIFICATION DETAILS
                      ======================================== */}

                      <div className="notification-details">


                        <div className="notification-title-row">


                          <h3>
                            {formatNotificationTitle(
                              notification.title
                            )}
                          </h3>


                          {/* Unread indicator */}

                          {!notification.is_read && (

                            <span
                              className="unread-dot"
                            ></span>

                          )}

                        </div>


                        {/* Message */}

                        <p className="notification-message">

                          {notification.message}

                        </p>


                        {/* Created time */}

                        <small className="notification-time">

                          {formatNotificationDate(
                            notification.created_at
                          )}

                        </small>

                      </div>


                      {/* =======================================
                          ACTION BUTTONS
                      ======================================= */}

                      {isRentalRequestNotification(notification) ? (

                        <div className="rental-request-actions">

                          {(() => {
                            const decision =
                              getRentalDecision(notification);

                            const cycleAlreadyOccupied =
                              hasAcceptedRentalForCycle(
                                notification
                              );

                              const temporarilyLocked =
                              isRentalRequestTemporarilyLocked(
                                notification
                              );

                            const isProcessing =
                              processingRentalId ===
                              notification.id;

                            const remainingSeconds =
                              getRemainingSeconds(
                                notification
                              );

                            const expired =
                              isNotificationExpired(
                                notification
                              );

                            if (decision === "accepted") {
                              return (
                                <div className="rental-decision accepted-decision">
                                  <span>✓</span>
                                  Accepted
                                </div>
                              );
                            }

                            if (decision === "rejected") {
                              return (
                                <div className="rental-decision rejected-decision">
                                  <span>✕</span>
                                  Rejected
                                </div>
                              );
                            }

                            if (expired) {
                              return (
                                <div className="rental-decision expired-decision">
                                  <span>⌛</span>
                                  Expired
                                </div>
                              );
                            }

                            return (
                              <div className="rental-request-action-stack">
                                {remainingSeconds !== null && (
                                  <div
                                    className={`notification-countdown ${
                                      remainingSeconds <= 60
                                        ? "notification-countdown-warning"
                                        : ""
                                    }`}
                                  >
                                    <span>⏱</span>
                                    Expires in{" "}
                                    <strong>
                                      {formatRemainingTime(
                                        remainingSeconds
                                      )}
                                    </strong>
                                  </div>
                                )}

                                <div
                                  className={`rental-request-action-buttons ${
                                    cycleAlreadyOccupied
                                      ? "rental-cycle-occupied"
                                      : ""
                                  } ${
                                    temporarilyLocked
                                      ? "rental-request-actions-locked"
                                      : ""
                                  }`}
                                >
                                  {/* VIEW RENTER DETAILS */}
                                  <button
                                    type="button"
                                    className="rental-details-icon-button"
                                    onClick={() =>
                                      openRentalDetails(notification)
                                    }
                                    aria-label="View renter details"
                                    title="View renter details"
                                  >
                                    <span
                                      className="rental-profile-icon"
                                      aria-hidden="true"
                                    />
                                  </button>

                                  {/* ACCEPT */}
                                  <button
                                      type="button"
                                      className="notification-action-button accept-button"
                                      disabled={
                                        isProcessing ||
                                        cycleAlreadyOccupied ||
                                        temporarilyLocked
                                      }
                                      onClick={() =>
                                        handleRentalDecision(
                                          notification,
                                          "accepted"
                                        )
                                      }
                                      title={
                                        temporarilyLocked
                                          ? "Temporarily unavailable because another request for this cycle has been accepted."
                                          : cycleAlreadyOccupied
                                          ? "Another rental request for this cycle has already been accepted."
                                          : "Accept this rental request"
                                      }
                                    >
                                      {isProcessing ? (
                                        <span className="rental-action-spinner" />
                                      ) : (
                                        <>
                                          Accept
                                          <span>✓</span>
                                        </>
                                      )}
                                    </button>

                                  {/* REJECT */}
                                  <button
                                    type="button"
                                    className="notification-action-button reject-button"
                                    disabled={
                                      isProcessing ||
                                      temporarilyLocked
                                    }
                                    onClick={() =>
                                      handleRentalDecision(
                                        notification,
                                        "rejected"
                                      )
                                    }
                                    title={
                                      temporarilyLocked
                                        ? "Temporarily unavailable because another request for this cycle has been accepted."
                                        : "Reject this rental request"
                                    }
                                  >
                                    Reject
                                    <span>✕</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                        </div>

                      ) : isOtpNotification(notification) ? (

                        <div className="otp-notification-actions">

                          {(() => {
                            const remainingSeconds =
                              getRemainingSeconds(
                                notification
                              );

                            const expired =
                              isNotificationExpired(
                                notification
                              );

                            const ownerOtp =
                              isOwnerOtpNotification(
                                notification
                              );

                            const isProcessing =
                              processingRentalId ===
                              notification.id;

                            if (expired) {
                              return (
                                <div className="otp-expired-block">
                                  <div className="otp-expired-status">
                                    <span>⌛</span>
                                    OTP Expired
                                  </div>

                                  {ownerOtp && (
                                    <button
                                      type="button"
                                      className="notification-action-button regenerate-otp-button"
                                      disabled={isProcessing}
                                      onClick={() =>
                                        handleRegenerateOtp(
                                          notification
                                        )
                                      }
                                    >
                                      {isProcessing ? (
                                        <span className="rental-action-spinner" />
                                      ) : (
                                        <>
                                          Regenerate OTP
                                          <span>↻</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              );
                            }

  return (
                              <div className="otp-active-block">
                                {otpRegeneratedIds[notification.id] && (
                                  <div className="otp-regenerated-status">
                                    <span>✓</span>
                                    OTP Regenerated
                                  </div>
                                )}

                                {remainingSeconds !== null && (
                                  <div
                                    className={`notification-countdown otp-countdown ${
                                      remainingSeconds <= 60
                                        ? "notification-countdown-warning"
                                        : ""
                                    }`}
                                  >
                                    <span>⏱</span>
                                    Expires in{" "}
                                    <strong>
                                      {formatRemainingTime(
                                        remainingSeconds
                                      )}
                                    </strong>
                                  </div>
                                )}

                                {ownerOtp && (
                                  <button
                                    type="button"
                                    className="notification-action-button"
                                    disabled={isProcessing}
                                    onClick={() => {
                                      if (onAction) {
                                        onAction(
                                          notification.action_type,
                                          notification
                                        );
                                      }
                                    }}
                                  >
                                    Enter OTP
                                    <span>→</span>
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                        </div>

                      ) : (

                        /* =======================================
                          NORMAL SINGLE ACTION BUTTON
                        ======================================== */

                        isAction && (

                          <button
                            className="notification-action-button"

                            onClick={() => {

                              if (onAction) {

                                onAction(
                                  notification.action_type,
                                  notification
                                );

                              } else {

                                console.warn(
                                  "Notification action handler is not provided."
                                );

                              }

                            }}
                          >

                            {buttonText}

                            <span>
                              →
                            </span>

                          </button>

                        )

                      )}

                    </article>

                  );

                }
              )}

            </div>

          )}

        </section>

      </main>

    </div>

  );
}


export default NotificationPage;