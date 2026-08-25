import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { supabase } from "./supabase";

import Landing from "./Landing";
import Login from "./Login";
import SignUp from "./SignUp";
// import ChoicePage from "./ChoicePage";
import HomePageRental from "./HomePageRental";
import Listing from "./Listing";
import Profile from "./Profile";
import ForgotPassword from "./ForgotPassword";
import BookingPage from "./BookingPage";
import BookingHistory from "./BookingHistory";
import CycleOwner from "./CycleOwner";
import OnGoingRents from "./OnGoingRents";
import ReportPage from "./ReportPage";
import NotificationPage from "./NotificationPage";
import OTP from "./OTP";
import ReturnPage from "./ReturnPage";
import AdminDashboard from "./AdminDashboard";
import OwnerDetails from "./OwnerDetails";
import CycleVerification from "./CycleVerification";
import TermsAndConditions from "./TermsAndConditions";
import ResetPassword from "./ResetPassword";
import ReturnProcessing from "./ReturnProcessing";
import ReviewPage from "./ReviewPage";
import "./App.css";

function AppContent() {
  // ============================================================
// PUSH NOTIFICATION HELPERS
// ============================================================

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (
    base64String + padding
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) =>
      char.charCodeAt(0)
    )
  );
};
const enablePushNotifications = async () => {
  try {
    console.log("🔔 Starting push notification setup...");

    if (!userId) {
      alert("Please log in first.");
      return;
    }

    if (!("Notification" in window)) {
      alert(
        "This browser does not support notifications."
      );
      return;
    }

    if (!("serviceWorker" in navigator)) {
      alert(
        "Service Worker is not supported."
      );
      return;
    }

    if (!("PushManager" in window)) {
      alert(
        "Push notifications are not supported."
      );
      return;
    }

    // --------------------------------------------------------
    // 1. Ask for notification permission
    // --------------------------------------------------------

    const permission =
      await Notification.requestPermission();

    console.log(
      "Notification permission:",
      permission
    );

    if (permission !== "granted") {
      alert(
        "Notification permission was not granted."
      );
      return;
    }

    // --------------------------------------------------------
    // 2. Get the active service worker
    // --------------------------------------------------------

    const registration =
      await navigator.serviceWorker.ready;

    console.log(
      "✅ Service Worker ready:",
      registration
    );

    // --------------------------------------------------------
    // 3. Check whether subscription already exists
    // --------------------------------------------------------

    let subscription =
      await registration.pushManager.getSubscription();

    // --------------------------------------------------------
    // 4. Create subscription if necessary
    // --------------------------------------------------------

    if (!subscription) {
      const vapidPublicKey =
        import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        throw new Error(
          "VITE_VAPID_PUBLIC_KEY is missing from .env"
        );
      }

      console.log(
        "Creating new push subscription..."
      );

      subscription =
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(
              vapidPublicKey
            ),
        });
    }

    console.log(
      "✅ Push subscription:",
      subscription
    );

    // --------------------------------------------------------
    // 5. Convert subscription to JSON
    // --------------------------------------------------------

    const subscriptionJSON =
      subscription.toJSON();

    console.log(
      "Subscription JSON:",
      subscriptionJSON
    );

    // --------------------------------------------------------
    // 6. Check whether this device is already saved
    // --------------------------------------------------------

    const { data: existingSubscription, error: checkError } =
      await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq(
          "endpoint",
          subscription.endpoint
        )
        .maybeSingle();

    if (checkError) {
      console.error(
        "Subscription check error:",
        checkError
      );

      throw checkError;
    }

    // --------------------------------------------------------
    // 7. Save only if not already present
    // --------------------------------------------------------

    if (!existingSubscription) {
      const { error: insertError } =
        await supabase
          .from("push_subscriptions")
          .insert({
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh:
              subscriptionJSON.keys?.p256dh,
            auth:
              subscriptionJSON.keys?.auth,
          });

      if (insertError) {
        console.error(
          "Subscription insert error:",
          insertError
        );

        throw insertError;
      }

      console.log(
        "✅ Push subscription saved to Supabase."
      );
    } else {
      console.log(
        "✅ This device is already registered."
      );
    }

    alert(
      "🔔 Notifications enabled successfully!"
    );

  } catch (error) {
    console.error(
      "❌ Push notification setup failed:",
      error
    );

    alert(
      "Failed to enable notifications. Check the console."
    );
  }
};
  // =========================================================
  // CURRENT PAGE
  // =========================================================

  const navigate = useNavigate();
  const location = useLocation();

  /*
   * Each existing in-app page gets a real browser history entry.
   *
   * IMPORTANT:
   * The existing page-state architecture is preserved.
   * React Router is only added as the history layer.
   */
  const pagePaths = {
    Landing: "/",
    Login: "/login",
    SignUp: "/signup",
    // ChoicePage: "/choice",
    HomePageRental: "/rentals",
    Listing: "/listing",
    Profile: "/profile",
    ForgotPassword: "/forgot-password",
    BookingPage: "/booking",
    BookingHistory: "/booking-history",
    CycleOwner: "/my-cycles",
    OnGoingRents: "/ongoing-rentals",
    ReportPage: "/report",
    NotificationPage: "/notifications",
    OTP: "/otp",
    ReturnPage: "/return",
    ReturnProcessing: "/return-processing",
    ReviewPage: "/review",
    AdminDashboard: "/admin",
    OwnerDetails: "/owner-details",
    CycleVerification: "/cycle-verification",
    TermsAndConditions: "/terms",
    ResetPassword: "/reset-password",
  };

  const pathToPage = Object.entries(pagePaths).reduce(
    (map, [pageName, path]) => {
      map[path] = pageName;
      return map;
    },
    {}
  );

  const [page, setPageState] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  /*
   * Existing code throughout this file calls setPage(...).
   * We keep that API unchanged, but now every page change also
   * creates a browser history entry.
   */
  const setPage = (nextPage) => {
    setPageState(nextPage);

    const nextPath = pagePaths[nextPage];

    if (!nextPath) {
      return;
    }

    if (location.pathname !== nextPath) {
      navigate(nextPath);
    }
  };
  const handleReturnProcessing = (bookingId) => {
    setSelectedBookingId(bookingId);
    setPage("ReturnProcessing");
  };

  // =========================================================
  // RETURN PROCESSING → REVIEW PAGE
  // =========================================================

  const handleReturnReview = () => {
    if (!selectedBookingId) {
      console.error(
        "Cannot open review page: booking ID is missing."
      );
      return;
    }

    setPage("ReviewPage");
  };

  /*
   * Handle Chrome back/forward buttons and Android/iOS browser
   * gestures. React Router updates location, and this effect
   * updates the existing page state without pushing another
   * history entry.
   */
  useEffect(() => {
    const previousPage = pathToPage[location.pathname];

    if (!previousPage) {
      return;
    }

    setPageState((currentPage) =>
      currentPage === previousPage
        ? currentPage
        : previousPage
    );
  }, [location.pathname]);

  const [selectedCycleId, setSelectedCycleId] = useState(null);

  useEffect(() => {
    if (window.location.pathname === "/reset-password") {
      setPage("ResetPassword");
    }
  }, []);
useEffect(() => {
  const checkRecovery = async () => {
    // Direct reset-password URL
    if (window.location.pathname === "/reset-password") {
      setPage("ResetPassword");
      return;
    }

    // Listen for Supabase recovery event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      console.log("Supabase auth event:", event);

      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery detected");
        setPage("ResetPassword");
      }
    });

    return () => subscription.unsubscribe();
  };

  checkRecovery();
}, []);
  useEffect(() => {
    const debugPWA = async () => {
      console.log("========================================");
      console.log("        UGO PWA DEBUG START");
      console.log("========================================");

      // --------------------------------------------------
      // 1. Browser information
      // --------------------------------------------------

      console.log("Browser:", navigator.userAgent);
      console.log("HTTPS:", window.location.protocol === "https:");
      console.log("Current URL:", window.location.href);

      // --------------------------------------------------
      // 2. Manifest
      // --------------------------------------------------

      const manifestLink = document.querySelector(
        'link[rel="manifest"]'
      );

      console.log(
        "Manifest <link> found:",
        !!manifestLink
      );

      if (manifestLink) {
        console.log(
          "Manifest URL:",
          manifestLink.href
        );

        try {
          const response = await fetch(
            manifestLink.href,
            {
              cache: "no-store",
            }
          );

          console.log(
            "Manifest HTTP status:",
            response.status
          );

          console.log(
            "Manifest content-type:",
            response.headers.get("content-type")
          );

          if (!response.ok) {
            console.error(
              "❌ Manifest cannot be loaded."
            );
          } else {
            const manifest =
              await response.json();

            console.log(
              "✅ Manifest loaded successfully:"
            );

            console.table(manifest);

            // --------------------------------------------------
            // Manifest fields
            // --------------------------------------------------

            console.log(
              "Manifest name:",
              manifest.name
            );

            console.log(
              "Manifest short_name:",
              manifest.short_name
            );

            console.log(
              "Manifest start_url:",
              manifest.start_url
            );

            console.log(
              "Manifest display:",
              manifest.display
            );

            console.log(
              "Manifest theme_color:",
              manifest.theme_color
            );

            console.log(
              "Manifest background_color:",
              manifest.background_color
            );

            console.log(
              "Manifest icons:",
              manifest.icons
            );

            // --------------------------------------------------
            // 3. Check every icon
            // --------------------------------------------------

            if (
              !manifest.icons ||
              manifest.icons.length === 0
            ) {
              console.error(
                "❌ No icons found in manifest."
              );
            } else {

              for (
                const icon of manifest.icons
              ) {

                console.log(
                  "--------------------------------"
                );

                console.log(
                  "Checking icon:",
                  icon.src
                );

                console.log(
                  "Expected size:",
                  icon.sizes
                );

                console.log(
                  "Declared type:",
                  icon.type
                );

                try {

                  const iconResponse =
                    await fetch(
                      icon.src,
                      {
                        cache: "no-store",
                      }
                    );

                  console.log(
                    "HTTP status:",
                    iconResponse.status
                  );

                  console.log(
                    "Actual content-type:",
                    iconResponse.headers.get(
                      "content-type"
                    )
                  );

                  if (!iconResponse.ok) {

                    console.error(
                      "❌ ICON NOT FOUND:",
                      icon.src
                    );

                    continue;
                  }

                  const blob =
                    await iconResponse.blob();

                  console.log(
                    "Actual blob type:",
                    blob.type
                  );

                  console.log(
                    "Actual file size:",
                    blob.size,
                    "bytes"
                  );

                  // Load image to check actual dimensions

                  const image =
                    new Image();

                  image.onload = () => {

                    console.log(
                      "Actual dimensions:",
                      `${image.naturalWidth}x${image.naturalHeight}`
                    );

                    console.log(
                      "Expected dimensions:",
                      icon.sizes
                    );

                    const expected =
                      icon.sizes.split("x");

                    const expectedWidth =
                      Number(expected[0]);

                    const expectedHeight =
                      Number(expected[1]);

                    if (
                      image.naturalWidth ===
                        expectedWidth &&
                      image.naturalHeight ===
                        expectedHeight
                    ) {

                      console.log(
                        "✅ Icon dimensions are correct."
                      );

                    } else {

                      console.error(
                        "❌ Icon dimensions are WRONG."
                      );

                    }

                  };

                  image.onerror = () => {

                    console.error(
                      "❌ Browser cannot decode this image:",
                      icon.src
                    );

                  };

                  image.src =
                    URL.createObjectURL(blob);

                } catch (error) {

                  console.error(
                    "❌ Icon test failed:",
                    icon.src,
                    error
                  );

                }

              }

            }

          }

        } catch (error) {

          console.error(
            "❌ Error reading manifest:",
            error
          );

        }

      } else {

        console.error(
          "❌ No <link rel='manifest'> found."
        );

      }


      // --------------------------------------------------
      // 4. Service Worker
      // --------------------------------------------------

      console.log(
        "========================================"
      );

      console.log(
        "        SERVICE WORKER"
      );

      console.log(
        "========================================"
      );

      if (
        "serviceWorker" in navigator
      ) {

        console.log(
          "✅ Service Worker API supported."
        );

        try {

          const registrations =
            await navigator.serviceWorker
              .getRegistrations();

          console.log(
            "Service worker registrations:",
            registrations
          );

          if (
            registrations.length === 0
          ) {

            console.error(
              "❌ NO SERVICE WORKER REGISTERED."
            );

          } else {

            registrations.forEach(
              (registration, index) => {

                console.log(
                  `Service Worker ${index + 1}:`
                );

                console.log(
                  "Scope:",
                  registration.scope
                );

                console.log(
                  "Installing:",
                  registration.installing
                );

                console.log(
                  "Waiting:",
                  registration.waiting
                );

                console.log(
                  "Active:",
                  registration.active
                );

              }
            );

          }

        } catch (error) {

          console.error(
            "❌ Service worker check failed:",
            error
          );

        }

      } else {

        console.error(
          "❌ Service Workers are not supported."
        );

      }


      // --------------------------------------------------
      // 5. beforeinstallprompt support
      // --------------------------------------------------

      console.log(
        "========================================"
      );

      console.log(
        "        INSTALL PROMPT"
      );

      console.log(
        "========================================"
      );

      console.log(
        "beforeinstallprompt supported:",
        "onbeforeinstallprompt" in window
      );


      // --------------------------------------------------
      // 6. Display mode
      // --------------------------------------------------

      console.log(
        "========================================"
      );

      console.log(
        "        DISPLAY MODE"
      );

      console.log(
        "========================================"
      );

      console.log(
        "Standalone:",
        window.matchMedia(
          "(display-mode: standalone)"
        ).matches
      );

      console.log(
        "Browser:",
        window.matchMedia(
          "(display-mode: browser)"
        ).matches
      );


      console.log(
        "========================================"
      );

      console.log(
        "        UGO PWA DEBUG END"
      );

      console.log(
        "========================================"
      );
    };


    debugPWA();

  }, []);

  const loadCurrentUser = async (session) => {
    if (!session?.user) {
      setUserId(null);
      return null;
    }

    const user = session.user;

    setUserId(user.id);

    // Get profile information from Supabase
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        phone,
        avatar_url,
        role,
        email
      `)
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Unable to load user profile:", error);
      return null;
    }

    console.log("Current user profile:", profile);

    return profile;
  };

  const openRazorpay = (payment) => {

    if (!window.Razorpay) {
      console.error("Razorpay Checkout is not loaded");
      return;
    }

    console.log("Opening Razorpay with:");
    console.log("Key:", "rzp_live_TSl3eQnxqmNP83");
    console.log("Order:", payment.provider_order_id);
    console.log("Amount:", Number(payment.amount) * 100);

    const options = {
      key: "rzp_live_TSl3eQnxqmNP83",

      amount: Math.round(Number(payment.amount) * 100),

      currency: payment.currency,

      name: "UgO",

      description: "Cycle Rental",

      order_id: payment.provider_order_id,

      handler: function (response) {

        console.log("PAYMENT SUCCESS");
        console.log(response);

        console.log(
          "Payment ID:",
          response.razorpay_payment_id
        );

        console.log(
          "Order ID:",
          response.razorpay_order_id
        );

        console.log(
          "Signature:",
          response.razorpay_signature
        );
      }
    };

    const razorpay = new window.Razorpay(options);

    razorpay.open();
  };

  useEffect(() => {
  const script = document.createElement("script");

  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;

  script.onload = () => {
    console.log("Razorpay Checkout loaded");
  };

  script.onerror = () => {
    console.error("Failed to load Razorpay Checkout");
  };

  document.body.appendChild(script);

  return () => {
    document.body.removeChild(script);
  };
}, []);

  const [userId, setUserId] = useState(null);

  const [bookingId, setBookingId] = useState("");
useEffect(() => {
  if (!userId) return;

  const channel = supabase
    .channel(`payment-updates-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'payment_table',
        filter: `renter_id=eq.${userId}`
      },
      (payload) => {
        console.log("NEW PAYMENT:", payload.new);

        openRazorpay(payload.new);
      }
    )
    .subscribe((status) => {
      console.log("Payment realtime status:", status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);

useEffect(() => {
  let mounted = true;

  // ============================================================
  // RESTORE / REFRESH SUPABASE SESSION
  // ============================================================

  const restoreSession = async () => {
    try {
      console.log("Checking Supabase session...");

      /*
       * getSession() gets the persisted session.
       *
       * Supabase will normally refresh an expired access token
       * using the stored refresh token.
       */
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error(
          "Session restore error:",
          error
        );

        if (mounted) {
          setUserId(null);
          setPage("Landing");//........................................
        }

        return;
      }

      // ========================================================
      // NO SESSION AT ALL
      // ========================================================

      if (!session) {
        console.log(
          "No active Supabase session."
        );

        if (mounted) {
          setUserId(null);

          localStorage.removeItem(
            "cycle_last_page"
          );

          setPage("Landing");
        }

        return;
      }

      // ========================================================
      // SESSION EXISTS
      // ========================================================

      console.log(
        "Supabase session found:",
        session.user.email
      );

      console.log(
        "Access token expires at:",
        new Date(
          session.expires_at * 1000
        )
      );

      console.log(
        "Refresh token exists:",
        !!session.refresh_token
      );

      // ========================================================
      // LOAD USER PROFILE
      // ========================================================

      const profile =
        await loadCurrentUser(session);

      if (!profile) {
        console.error(
          "Unable to load profile for authenticated user."
        );

        if (mounted) {
          setPage("Landing");//.......................................
        }

        return;
      }

      // ========================================================
      // RESTORE LAST PAGE
      // ========================================================

      const savedPage =
        localStorage.getItem(
          "cycle_last_page"
        );

      const restorablePages = [
        // "ChoicePage",
        "HomePageRental",
        "Listing",
        "Profile",
        "CycleOwner",
        "OnGoingRents",
        "AdminDashboard",
        "NotificationPage",
        "BookingHistory",
      ];

      if (
        savedPage &&
        restorablePages.includes(savedPage)
      ) {
        console.log(
          "Restoring previous page:",
          savedPage
        );

        if (mounted) {
          setPage(savedPage);
        }
      } else {
        if (mounted) {
          if (
            profile.role === "admin"
          ) {
            setPage("AdminDashboard");
          } else {
            setPage("HomePageRental");
          }
        }
      }

    } catch (error) {
      console.error(
        "Unexpected session restoration error:",
        error
      );

      if (mounted) {
        setUserId(null);
        setPage("Landing");
      }

    } finally {
      if (mounted) {
        setAuthLoading(false);
      }
    }
  };


  // ============================================================
  // RUN SESSION RESTORATION
  // ============================================================

  restoreSession();


  // ============================================================
  // AUTH STATE LISTENER
  // ============================================================

  const {
    data: authListener,
  } =
    supabase.auth.onAuthStateChange(
      async (event, session) => {

        console.log(
          "Supabase Auth event:",
          event
        );


        // ======================================================
        // SIGNED OUT
        // ======================================================

        if (
          event === "SIGNED_OUT"
        ) {

          console.log(
            "User signed out."
          );

          if (mounted) {

            setUserId(null);

            localStorage.removeItem(
              "cycle_last_page"
            );

            setPage("HomePageRental");
          }

          return;
        }


        // ======================================================
        // TOKEN REFRESHED
        // ======================================================

        /*
         * THIS IS VERY IMPORTANT.
         *
         * When the access token expires, Supabase should use
         * the refresh token to generate a new access token.
         *
         * The event received here is:
         *
         * TOKEN_REFRESHED
         *
         * We DO NOT send the user to Login.
         */

        if (
          event === "TOKEN_REFRESHED"
        ) {

          if (!session) {

            console.warn(
              "TOKEN_REFRESHED received without session."
            );

            return;
          }

          console.log(
            "Supabase access token refreshed."
          );

          console.log(
            "New expiry:",
            new Date(
              session.expires_at * 1000
            )
          );

          /*
           * The user is still authenticated.
           *
           * Do NOT change page.
           * Do NOT send user to Login.
           */

          if (mounted) {
            setUserId(
              session.user.id
            );
          }

          return;
        }


        // ======================================================
        // USER UPDATED
        // ======================================================

        if (
          event === "USER_UPDATED"
        ) {

          if (!session) {
            return;
          }

          console.log(
            "User information updated."
          );

          if (mounted) {
            setUserId(
              session.user.id
            );
          }

          return;
        }


        // ======================================================
        // SIGNED IN
        // ======================================================

        if (
          event === "SIGNED_IN"
        ) {

          if (!session) {

            console.warn(
              "SIGNED_IN event without session."
            );

            return;
          }

          console.log(
            "User signed in:",
            session.user.email
          );


          // ----------------------------------------------------
          // LOAD PROFILE
          // ----------------------------------------------------

          const profile =
            await loadCurrentUser(
              session
            );

          if (!profile) {

            console.error(
              "Unable to detect user profile."
            );

            if (mounted) {
              setPage("Login");
            }

            return;
          }


          // ----------------------------------------------------
          // SAVE USER ID
          // ----------------------------------------------------

          if (mounted) {
            setUserId(
              session.user.id
            );
          }


          // ----------------------------------------------------
          // RESTORE LAST PAGE
          // ----------------------------------------------------

          const savedPage =
            localStorage.getItem(
              "cycle_last_page"
            );

          const restorablePages = [
            // "ChoicePage",
            "HomePageRental",
            "Listing",
            "Profile",
            "CycleOwner",
            "OnGoingRents",
            "AdminDashboard",
            "NotificationPage",
          ];


          if (
            savedPage &&
            restorablePages.includes(
              savedPage
            )
          ) {

            console.log(
              "Restoring previous page after login:",
              savedPage
            );

            if (mounted) {
              setPage(savedPage);
            }

          } else {

            if (mounted) {

              if (
                profile.role === "admin"
              ) {
                setPage(
                  "AdminDashboard"
                );
              } else {
                setPage(
                  "HomePageRental"
                );
              }
            }
          }

          return;
        }


        // ======================================================
        // OTHER AUTH EVENTS
        // ======================================================

        console.log(
          "Unhandled Supabase auth event:",
          event
        );

      }
    );


  // ============================================================
  // CLEANUP
  // ============================================================

  return () => {

    mounted = false;

    authListener.subscription.unsubscribe();

  };

}, []);

  useEffect(() => {
    if (!page) {
      return;
    }

    const pagesToSave = [
      // "ChoicePage",
      "HomePageRental",
      "Listing",
      "Profile",
      "CycleOwner",
      "OnGoingRents",
      "AdminDashboard",
      "NotificationPage",
      "BookingHistory",
    ];

    if (pagesToSave.includes(page)) {
      localStorage.setItem(
        "cycle_last_page",
        page
      );
    }
  }, [page]);

  // =========================================================
  // CYCLE / BOOKING
  // =========================================================

  const [selectedCycle, setSelectedCycle] = useState(null);

  // =========================================================
  // PROFILE
  // =========================================================

  const [profileReturnPage, setProfileReturnPage] =
    useState("HomePageRental");

  const [selectedBookingId, setSelectedBookingId] = useState(null);

  // =========================================================
  // BOOKING HISTORY
  // =========================================================
  // Stores the page from which Booking History was opened.
  // This is intentionally independent from ChoicePage because
  // ChoicePage is being removed from the active flow.
  const [bookingHistoryReturnPage, setBookingHistoryReturnPage] =
    useState("HomePageRental");

  // Preserve BookingPage duration while visiting Booking History.
  const [bookingDraft, setBookingDraft] = useState({
    days: "0",
    hours: "0",
  });

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  const [notificationReturnPage, setNotificationReturnPage] =
    useState("HomePageRental");

  // =========================================================
  // ADMIN
  // =========================================================

  const [isAdminChoicePage, setIsAdminChoicePage] =
    useState(false);

  // =========================================================
  // OWNER DETAILS
  // =========================================================

  const [ownerDetails, setOwnerDetails] = useState(null);

  // =========================================================
  // REPORT SYSTEM
  // =========================================================

  const [reportRental, setReportRental] = useState(null);

  const [reporterRole, setReporterRole] = useState(null);

  const [reportedUserId, setReportedUserId] = useState(null);

  const [editingCycleId, setEditingCycleId] = useState(null);

  // =========================================================
  // ONGOING RENT RETURN PAGE
  // =========================================================

  const [ongoingRentsReturnPage, setOngoingRentsReturnPage] =
    useState("HomePageRental");

  // =========================================================
  // HANDLE REPORT ISSUE
  // =========================================================
  //
  // role can be:
  //
  // "renter" -> renter reports owner
  // "owner"  -> owner reports renter
  //
  // =========================================================

  const handleReportIssue = (rental, role) => {
    console.log("====================================");
    console.log("REPORT ISSUE");
    console.log("Rental:", rental);
    console.log("Reporter role:", role);
    console.log("====================================");

    // -------------------------------------------------------
    // Make sure rental exists
    // -------------------------------------------------------

    if (!rental) {
      console.error(
        "Rental information is missing."
      );

      alert(
        "Unable to open the report page because rental information is missing."
      );

      return;
    }

    // -------------------------------------------------------
    // Make sure role is valid
    // -------------------------------------------------------

    if (role !== "renter" && role !== "owner") {
      console.error(
        "Invalid reporter role:",
        role
      );

      alert(
        "Invalid reporter role."
      );

      return;
    }

    // -------------------------------------------------------
    // Find the user being reported
    // -------------------------------------------------------

    let targetUserId = null;

    // =======================================================
    // RENTER REPORTING OWNER
    // =======================================================

    if (role === "renter") {
      targetUserId =
        rental.owner_id ||
        rental.cycle_owner_id ||
        rental.owner?.id ||
        rental.cycles?.owner_id ||
        null;
    }

    // =======================================================
    // OWNER REPORTING RENTER
    // =======================================================

    if (role === "owner") {
      targetUserId =
        rental.renter_id ||
        rental.user_id ||
        rental.renter?.id ||
        rental.booked_by ||
        null;
    }

    // -------------------------------------------------------
    // Debug
    // -------------------------------------------------------

    console.log(
      "User being reported:",
      targetUserId
    );

    // -------------------------------------------------------
    // If target user cannot be found
    // -------------------------------------------------------

    if (!targetUserId) {
      console.error(
        "Unable to determine user being reported.",
        {
          rental,
          role,
        }
      );

      alert(
        "Unable to determine the user being reported."
      );

      return;
    }

    // -------------------------------------------------------
    // Store report information
    // -------------------------------------------------------

    setReportRental(rental);

    setReporterRole(role);

    setReportedUserId(targetUserId);

    // -------------------------------------------------------
    // Open report page
    // -------------------------------------------------------

    setPage("ReportPage");
  };

  // =========================================================
  // HOME PAGE → BOOKING PAGE
  // =========================================================

  const handleViewDetails = (cycle) => {
    setSelectedCycle(cycle);

    localStorage.setItem(
      "cycle_selected_id",
      cycle.id
    );

    setPage("BookingPage");
  };
  // =========================================================
  // BOOKING PAGE → HOME PAGE
  // =========================================================

  const handleBookingBack = () => {
    setSelectedCycle(null);

    setPage("HomePageRental");
  };

  // =========================================================
  // OPEN BOOKING HISTORY
  // =========================================================

  const handleOpenBookingHistory = (
    returnPage = "HomePageRental"
  ) => {
    setBookingHistoryReturnPage(returnPage);
    setPage("BookingHistory");
  };

 
  // =========================================================
  //  handle Otp Page Continue
  // =========================================================

  const handleOtpPageContinue = () => {
  setPage("BookingHistory");
};
  // =========================================================
  // BOOKING REQUEST SUCCESS
  // =========================================================

  const handleBookingSuccess = () => {
    // The selected cycle remains in state, so returning from
    // Booking History brings the user back to the same BookingPage.
    setBookingHistoryReturnPage("BookingPage");
    setPage("BookingHistory");
  };

  // =========================================================
  // OPEN OWNER DETAILS
  // =========================================================

  const handleOpenOwnerDetails = async () => {
    if (!selectedCycle?.owner_id) {
      console.error(
        "Owner ID not found for this cycle."
      );

      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(`
        full_name,
        phone,
        avatar_url
      `)
      .eq(
        "id",
        selectedCycle.owner_id
      )
      .single();

    if (error) {
      console.error(
        "Error fetching owner:",
        error
      );

      setOwnerDetails(null);
    } else {
      setOwnerDetails(data);
    }

    setPage("OwnerDetails");
  };

  // =========================================================
  // OPEN CYCLE OWNER PAGE
  // =========================================================

  const handleCycleOwner = () => {
    setPage("CycleOwner");
  };

  // =========================================================
  // OPEN NOTIFICATION PAGE
  // =========================================================

  const handleOpenNotifications = (
    returnPage
  ) => {
    setNotificationReturnPage(returnPage);

    setPage("NotificationPage");
  };

  // =========================================================
  // NOTIFICATION BACK
  // =========================================================

  const handleNotificationBack = () => {
    setPage(notificationReturnPage);
  };

  // =========================================================
  // LANDING → LOGIN
  // =========================================================

  const handleLandingFinish = () => {
    setPage("HomePageRental");
  };

  // =========================================================
  // ADMIN → CHOICE PAGE
  // =========================================================

  const handleBackToHomePageRental = () => {
    setPage("HomePageRental");

  };

  // =========================================================
  // LOGIN → SIGN UP
  // =========================================================

  const handleCreateAccount = () => {
    setPage("SignUp");
  };

  // =========================================================
  // SIGN UP → LOGIN
  // =========================================================

  const handleBackToLogin = () => {
    setPage("Login");
  };

  // =========================================================
  // LOGIN SUCCESS
  // =========================================================

  const handleLoginSuccess = (role) => {
    setIsAdminChoicePage(false);

    if (role === "admin") {
      setPage("AdminDashboard");
    } else {
      setPage("HomePageRental")
    }
  };

  // =========================================================
  // CHOICE PAGE → RENTAL HOME PAGE
  // =========================================================

  const handleRentalChoice = () => {
    setPage("HomePageRental");
  };

  // =========================================================
  // FORGOT PASSWORD
  // =========================================================

  const handleForgotPassword = () => {
    setPage("ForgotPassword");
  };

  // =========================================================
  // CHOICE PAGE → LISTING
  // =========================================================

  const handleListingChoice = () => {
    setPage("Listing");
  };

  const handleNotifications = () => {
    setPage("NotificationPage");
  }

  // =========================================================
  // OPEN ONGOING RENTS
  // =========================================================

  const handleOnGoingRents = (
    returnPage = "HomePageRental"
  ) => {
    setOngoingRentsReturnPage(returnPage);

    setPage("OnGoingRents");
  };

  // =========================================================
  // ONGOING RENTS BACK
  // =========================================================

  const handleOnGoingRentsBack = () => {
    setPage(ongoingRentsReturnPage);
  };

  // =========================================================
  // OPEN PROFILE
  // =========================================================

  const handleOpenProfile = (
    returnPage
  ) => {
    setProfileReturnPage(returnPage);

    setPage("Profile");
  };

  // =========================================================
  // PROFILE BACK
  // =========================================================

  const handleProfileBack = () => {
    setPage(profileReturnPage);
  };

  // =========================================================
  // MOBILE / RENTAL SECTION NAVIGATION
  // =========================================================
  // This navigation is intentionally limited to the three
  // student rental pages. Existing page connections remain
  // unchanged; these are additional shortcuts.
  // =========================================================

  const rentalNavPages = [
    "HomePageRental",
    "OnGoingRents",
    "CycleOwner",
  ];

  const handleRentalNav = (targetPage) => {
    if (!rentalNavPages.includes(targetPage)) return;

    if (targetPage === "HomePageRental") {
      setPage("HomePageRental");
      return;
    }

    if (targetPage === "OnGoingRents") {
      setOngoingRentsReturnPage("HomePageRental");
      setPage("OnGoingRents");
      return;
    }

    if (targetPage === "CycleOwner") {
      setPage("CycleOwner");
    }
  };

  // Swipe left  = next rental section
  // Swipe right = previous rental section
  useEffect(() => {
    if (!rentalNavPages.includes(page)) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const handleTouchStart = (event) => {
      if (!event.touches || event.touches.length !== 1) return;

      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      tracking = true;
    };

    const handleTouchEnd = (event) => {
      if (!tracking || !event.changedTouches?.length) return;

      const endX = event.changedTouches[0].clientX;
      const endY = event.changedTouches[0].clientY;

      const deltaX = endX - startX;
      const deltaY = endY - startY;

      tracking = false;

      // Ignore normal vertical scrolling.
      if (Math.abs(deltaX) < 70) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

      const currentIndex = rentalNavPages.indexOf(page);
      if (currentIndex === -1) return;

      if (deltaX < 0 && currentIndex < rentalNavPages.length - 1) {
        handleRentalNav(rentalNavPages[currentIndex + 1]);
      }

      if (deltaX > 0 && currentIndex > 0) {
        handleRentalNav(rentalNavPages[currentIndex - 1]);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });

    window.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [page]);

  const RentalBottomNav = () => {
    if (!rentalNavPages.includes(page)) return null;

    return (
      <nav
        className="rental-bottom-nav"
        aria-label="Rental navigation"
      >
        <button
          type="button"
          className={`rental-nav-item ${
            page === "HomePageRental" ? "active" : ""
          }`}
          onClick={() =>
            handleRentalNav("HomePageRental")
          }
          aria-label="Home rentals"
          aria-current={
            page === "HomePageRental" ? "page" : undefined
          }
        >
          <span className="rental-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5.5 9.5V21h13V9.5" />
              <path d="M9.5 21v-6h5v6" />
            </svg>
          </span>
          <span className="rental-nav-label">
            Home Rentals
          </span>
        </button>

        <button
          type="button"
          className={`rental-nav-item ${
            page === "OnGoingRents" ? "active" : ""
          }`}
          onClick={() =>
            handleRentalNav("OnGoingRents")
          }
          aria-label="Ongoing rentals"
          aria-current={
            page === "OnGoingRents" ? "page" : undefined
          }
        >
          <span className="rental-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 12a8 8 0 0 1 13.7-5.7" />
              <path d="M18 4v5h-5" />
              <path d="M20 12a8 8 0 0 1-13.7 5.7" />
              <path d="M6 20v-5h5" />
            </svg>
          </span>
          <span className="rental-nav-label">
            Ongoing Rentals
          </span>
        </button>

        <button
          type="button"
          className={`rental-nav-item ${
            page === "CycleOwner" ? "active" : ""
          }`}
          onClick={() =>
            handleRentalNav("CycleOwner")
          }
          aria-label="My cycles"
          aria-current={
            page === "CycleOwner" ? "page" : undefined
          }
        >
          <span className="rental-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="6" cy="17" r="3" />
              <circle cx="18" cy="17" r="3" />
              <path d="M6 17l4-8h4l4 8" />
              <path d="M10 9 7.5 6H5" />
              <path d="M14 9h3l2 3" />
              <path d="M10 9l3 8" />
            </svg>
          </span>
          <span className="rental-nav-label">
            My Cycles
          </span>
        </button>
      </nav>
    );
  };

const handleNotificationAction = async (
  action,
  notification
) => {
  console.log("Notification action:", action);
  console.log("Notification:", notification);

  /*
  |--------------------------------------------------------------------------
  | MARK NOTIFICATION AS READ
  |--------------------------------------------------------------------------
  |
  | The notification ID comes from:
  |
  | notification.id
  |
  | We update only that particular notification.
  |
  */

  const markNotificationAsRead = async () => {
    if (!notification?.id) {
      console.error(
        "Cannot mark notification as read: notification ID missing."
      );
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", notification.id)
        .select()
        .single();

      if (error) {
        console.error(
          "Error marking notification as read:",
          error
        );

        return false;
      }

      console.log(
        "Notification marked as read:",
        data
      );

      return true;

    } catch (error) {
      console.error(
        "Unexpected error while marking notification as read:",
        error
      );

      return false;
    }
  };


  /*
  |--------------------------------------------------------------------------
  | MARK AS READ FIRST
  |--------------------------------------------------------------------------
  |
  | Since you specifically want:
  |
  | Button clicked
  |       ↓
  | is_read = true
  |       ↓
  | perform action
  |
  | we do it here before the switch.
  |
  */

  const markedAsRead =
    await markNotificationAsRead();


  /*
  |--------------------------------------------------------------------------
  | If database update failed
  |--------------------------------------------------------------------------
  |
  | We can still stop the action so that the frontend
  | does not navigate while the notification state
  | remains inconsistent.
  |
  */

  if (!markedAsRead) {
    console.warn(
      "Notification could not be marked as read. Action cancelled."
    );

    return;
  }


  /*
  |--------------------------------------------------------------------------
  | PERFORM THE ACTUAL ACTION
  |--------------------------------------------------------------------------
  */

  switch (action) {

    // --------------------------------------------------
    // ENTER RENTAL OTP
    // --------------------------------------------------

    case "enter_rental_OTP":
      setBookingId(notification.action_data.booking_id)

      setPage("OTP");

      break;


    // --------------------------------------------------
    // REPORT OWNER
    // --------------------------------------------------

    case "report_owner":

      setPage("ReportPage");

      break;


    // --------------------------------------------------
    // VIEW CYCLE
    // --------------------------------------------------

    case "view_cycle":

      if (
        notification?.action_data?.cycle_id
      ) {

        setSelectedCycleId(
          notification.action_data.cycle_id
        );

        setPage(
          "CycleVerification"
        );

      } else {

        console.error(
          "cycle_id missing from notification.action_data"
        );

      }

      break;


    // --------------------------------------------------
    // VIEW RENTAL
    // --------------------------------------------------

    case "view_rental":

      setPage("OnGoingRents");

      break;


    // --------------------------------------------------
    // VIEW EXTENSION
    // --------------------------------------------------

    case "view_extension":

      setPage("Extension");

      break;


    // --------------------------------------------------
    // CYCLE RETURNED
    // --------------------------------------------------

    case "cycle_returned":

        try {

          const response = await fetch(
            "https://example.com/webhook/cycle-returned"
          );

          if (!response.ok) {

            throw new Error(
              "Failed to call cycle returned webhook"
            );

          }

          const data =
            await response.json();

          console.log(
            "Cycle returned backend response:",
            data
          );

        } catch (error) {

          console.error(
            "Cycle returned error:",
            error
          );

        }

      break;


    // --------------------------------------------------
    // VIEW REPORT
    // --------------------------------------------------

    case "view_report":

      setPage("CycleVerification");

      break;


    // --------------------------------------------------
    // VIEW ACCOUNT
    // --------------------------------------------------

    case "view_account":

      setPage("Profile");

      break;


    // --------------------------------------------------
    // RETRY PAYMENT
    // --------------------------------------------------

    case "retry_payment":

      try {

        const response = await fetch(
          "https://example.com/api/create-payment-order",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({

              booking_id:
                notification?.action_data
                  ?.booking_id,

              amount:
                notification?.action_data
                  ?.amount || 500,

              currency:
                "INR",

            }),
          }
        );


        if (!response.ok) {

          throw new Error(
            "Failed to create payment order"
          );

        }


        const order =
          await response.json();


        const options = {

          key:
            "rzp_live_TSl3eQnxqmNP83",

          amount:
            order.amount,

          currency:
            order.currency,

          name:
            "UgO",

          description:
            "Cycle Rental Payment",

          order_id:
            order.order_id,


          handler:
            function (
              paymentResponse
            ) {

              console.log(
                "Razorpay payment successful:",
                paymentResponse
              );

            },


          prefill: {

            name:
              "Student Name",

            email:
              "student@example.com",

            contact:
              "9999999999",

          },


          theme: {

            color:
              "#3399cc",

          },

        };


        /*
         * Razorpay Checkout
         */

        const razorpay =
          new window.Razorpay(
            options
          );


        razorpay.open();

      } catch (error) {

        console.error(
          "Retry payment error:",
          error
        );

      }

      break;


    // --------------------------------------------------
    // VIEW DISPUTE
    // --------------------------------------------------

    case "view_dispute":

      setPage("Report");

      break;

    case "accepted_rental_request":
      try {

        const response = await fetch(
          "https://ugo-cyclesharing.app.n8n.cloud/webhook/booking-acceptance",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({

              booking_id:
                notification?.action_data
                  ?.booking_id,
              status:
                "accepted"
            }),
          }
        );


        if (!response.ok) {

          throw new Error(
            "Failed to Accept Rental Request"
          );

        }

        const data =
          await response.json();

        console.log(
          "your request has been accepted successfully",
          data
        );

      } catch (error) {

        console.error(
          "Request response error",
          error
        );

      }
      break;
    
    case "rejected_rental_request":
      try {

        const response = await fetch(
          "https://stem61.app.n8n.cloud/webhook/booking-acceptance",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({

              booking_id:
                notification?.action_data
                  ?.booking_id,
              status:
                "rejected"
            }),
          }
        );


        if (!response.ok) {

          throw new Error(
            "Failed to Accept Rental Request"
          );

        }

        const data =
          await response.json();

        console.log(
          "your request has been accepted successfully",
          data
        );

      } catch (error) {

        console.error(
          "Request response error",
          error
        );

      }
      break;
    
    // --------------------------------------------------
    // VIEW SECURITY
    // --------------------------------------------------

    case "view_security":

      setPage("Security");

      break;

    // --------------------------------------------------
    // REGENERATE RENTAL OTP
    // --------------------------------------------------

    case "regenerate_rental_otp":

      try {

        const response = await fetch(
          "https://ugo-cyclesharing.app.n8n.cloud/webhook/renerate-otp",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              booking_id:
                notification?.action_data?.booking_id,

              // Send the existing notification details too
              notification_id:
                notification?.id,

              owner_id:
                notification?.action_data?.owner_id,

              renter_id:
                notification?.action_data?.renter_id,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to regenerate rental OTP"
          );
        }

        /*
         * The backend may return JSON, but we should not fail just
         * because the webhook returns an empty/non-JSON response.
         */
        const responseText = await response.text();

        let data = {};

        if (responseText) {
          try {
            data = JSON.parse(responseText);
          } catch {
            data = {
              message: responseText,
            };
          }
        }

        console.log(
          "Rental OTP regenerated successfully:",
          data
        );

        /*
         * IMPORTANT:
         * Return the backend result to NotificationPage.
         *
         * NotificationPage uses the returned expiry_time immediately
         * to restart the 15-minute countdown. Supabase realtime/fetch
         * will subsequently pick up the actual user notification and
         * session OTP generated by the backend.
         */
        return data;

      } catch (error) {

        console.error(
          "Regenerate rental OTP error:",
          error
        );

        /*
         * Propagate the error so NotificationPage does NOT show
         * "OTP regenerated" when the backend call actually failed.
         */
        throw error;
      }


    // --------------------------------------------------
    // UNKNOWN ACTION
    // --------------------------------------------------

    default:

      console.warn(
        "Unknown notification action:",
        action
      );

      break;
  }
};
  // =========================================================
  // RETURN JSX
  // =========================================================

  return (
    <>

      {userId && (
        <button
          onClick={enablePushNotifications}
          style={{
            position: "fixed",
            bottom: "20px",
            left: "20px",
            zIndex: 99999,
            padding: "12px 18px",
            borderRadius: "10px",
            border: "none",
            background: "white",
            color: "#031f16",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          🔔 Enable Notifications
        </button>
      )}
      {/* =====================================================
          LANDING PAGE
      ===================================================== */}

      {page === "Landing" && (
        <Landing
          onFinish={handleLandingFinish}
        />
      )}

      {/* =====================================================
          LOGIN PAGE
      ===================================================== */}

      {page === "Login" && (
        <Login
          onCreateAccount={
            handleCreateAccount
          }
          onLoginSuccess={
            handleLoginSuccess
          }
          onForgotPassword={
            handleForgotPassword
          }
        />
      )}

      {/* =====================================================
          BOOKING PAGE
      ===================================================== */}

      {page === "BookingPage" && (
        <BookingPage
          cycle={selectedCycle}
          onBack={handleBookingBack}
          onOwnerDetails={
            handleOpenOwnerDetails
          }
          initialDays={bookingDraft.days}
          initialHours={bookingDraft.hours}
          onDurationChange={(days, hours) => {
            setBookingDraft((previous) => {
              const nextDays = String(days);
              const nextHours = String(hours);

              if (
                previous.days === nextDays &&
                previous.hours === nextHours
              ) {
                return previous;
              }

              return {
                days: nextDays,
                hours: nextHours,
              };
            });
          }}
          onBookingSuccess={handleBookingSuccess}
          onBackToLogin = {handleBackToLogin}
        />
      )}


      {/* =====================================================
          BOOKING HISTORY
          ===================================================== */}

      {page === "BookingHistory" && (
        <BookingHistory
          onBack={() => {
            setPage(bookingHistoryReturnPage);
          }}
        />
      )}

      {/* =====================================================
          SIGN UP PAGE
      ===================================================== */}

      {page === "SignUp" && (
        <SignUp
          onBackToLogin={
            handleBackToLogin
          }
          onTermsClick={() =>
            setPage(
              "TermsAndConditions"
            )
          }
        />
      )}

      {/* =====================================================
          CHOICE PAGE
      ===================================================== */}

      {/* {page === "ChoicePage" && (
        <ChoicePage
          onRentalChoice={
            handleRentalChoice
          }
          onProfileChoice={() =>
            handleOpenProfile(
              "ChoicePage"
            )
          }
          onCycleOwner={
            handleCycleOwner
          }
          onActiveRentals={() =>
            handleOnGoingRents(
              "ChoicePage"
            )
          }
          isAdmin={
            isAdminChoicePage
          }
          onBackToAdmin={() =>
            setPage(
              "AdminDashboard"
            )
          }
        />
      )} */}

      {/* =====================================================
          RENTAL HOME PAGE
      ===================================================== */}

      {page === "HomePageRental" && (
        <HomePageRental
          onProfile={() =>
            handleOpenProfile(
              "HomePageRental"
            )
          }
          onViewDetails={
            handleViewDetails
          }
          onNotifications={() =>
            handleOpenNotifications(
              "HomePageRental"
            )
          }
          handleBackToLogin={
            () =>
            handleBackToLogin()
          }
        />
      )}

      {/* =====================================================
          CYCLE LISTING PAGE
      ===================================================== */}

      {page === "Listing" && (
        <Listing
          onBack={handleCycleOwner}
          // editCycleId={}
        />
      )}

      {/* =====================================================
          PROFILE PAGE
      ===================================================== */}

      {page === "Profile" && (
        <Profile
          onBack={handleProfileBack}
          onBookingHistory={() =>
            handleOpenBookingHistory("Profile")
          }
          onLogout={async () => {

            const { error } =
              await supabase.auth.signOut();

            if (error) {
              console.error(
                "Logout error:",
                error
              );

              alert(
                "Unable to log out. Please try again."
              );

              return;
            }

            localStorage.removeItem(
              "cycle_last_page"
            );

          }}
        />
      )}

      {/* =====================================================
          FORGOT PASSWORD
      ===================================================== */}

      {page === "ForgotPassword" && (
        <ForgotPassword
          onBackToLogin={
            handleBackToLogin
          }
        />
      )}

      {/* =====================================================
          CYCLE OWNER PAGE
      ===================================================== */}

      {page === "CycleOwner" && (
        <CycleOwner
          onListCycle={
            handleListingChoice
          }
          onNotifications={() =>
            handleOpenNotifications(
              "CycleOwner"
            )
          }
          onEditCycle={(cycleId) => {
            setEditingCycleId(cycleId);
            setPage("Listing");
          }}
          handleBackToLogin={
            () =>
            handleBackToLogin()
          }
          onProfile={() =>
            handleOpenProfile(
              "CycleOwner"
            )
          }
        />
      )}

      {/* =====================================================
          ONGOING RENTALS
      ===================================================== */}

      {page === "OnGoingRents" && (
        <OnGoingRents
          onBack={
            handleOnGoingRentsBack
          }

          /*
           * IMPORTANT:
           *
           * The logged-in user is the renter here.
           * Therefore reporterRole = "renter".
           *
           * The owner_id from the rental will be used
           * as the reportedUserId.
           */

          onReportIssue={(rental) =>
            handleReportIssue(
              rental,
              "renter"
            )
          }

          onReturn={(bookingId) => {
            setSelectedBookingId(bookingId);
            setPage("ReturnPage");
          }}

          onNotifications={() =>
            handleOpenNotifications(
              "onGoingRents"
            )
          }
        />
      )}

      {/* =====================================================
          NOTIFICATION PAGE
      ===================================================== */}

      {page === "NotificationPage" && (
        <NotificationPage
          onAction = {handleNotificationAction}
          onBack = {handleNotificationBack}
        />
      )}

      {/* =====================================================
          REPORT PAGE
      ===================================================== */}

      {page === "ReportPage" && (
        <ReportPage
          rental={reportRental}
          reportedUserId={
            reportedUserId
          }
          reporterRole={
            reporterRole
          }
          onBack={
            handleOnGoingRents
          }
        />
      )}

      {/* =====================================================
          OTP
      ===================================================== */}

      {page === "OTP" && (
        <OTP
          onBookingId = {bookingId}
          onBackToNotifications={handleNotifications}
          onContinue = {handleOtpPageContinue}
        />
      )}

      {/* =====================================================
          RETURN PAGE
      ===================================================== */}

      {page === "ReturnPage" && (
        <ReturnPage 
           bookingId = {selectedBookingId}
           onBack={handleOnGoingRents}
           onBackHome={handleBackToHomePageRental}
           onReturnProcessing={handleReturnProcessing}
        />
      )}

      {/* =====================================================
          ADMIN DASHBOARD
      ===================================================== */}

      {page === "AdminDashboard" && (
        <AdminDashboard
          onNotifications={() =>
            handleOpenNotifications(
              "AdminDashboard"
            )
          }
          onAdminToStudent={
            handleBackToHomePageRental
          }
          onProfile={() => handleOpenProfile("AdminDashboard")}
        />
      )}

      {/* =====================================================
          OWNER DETAILS
      ===================================================== */}

      {page === "OwnerDetails" && (
        <OwnerDetails
          owner={ownerDetails}
          onBack={() =>
            setPage(
              "BookingPage"
            )
          }
        />
      )}

      {/* =====================================================
          CYCLE VERIFICATION
      ===================================================== */}

      {page === "CycleVerification" && (
        <CycleVerification
          cycleId={
            selectedCycleId
          }
          onBack = {() => {setPage("NotificationPage")}}
        />
      )}

      {/* =====================================================
          TERMS AND CONDITIONS
      ===================================================== */}

      {page === "TermsAndConditions" && (
        <TermsAndConditions
          onBack={() =>
            setPage("SignUp")
          }
        />
      )}

      {page === "ResetPassword" && (
        <ResetPassword
          onBackToLogin={() => {
            window.history.replaceState({}, "", "/");
            setPage("Login");
          }}
        />
      )}

      {/* =====================================================
          RENTAL SECTION BOTTOM NAVIGATION
          Visible only on HomePageRental, OnGoingRents,
          and CycleOwner. This is an additional connection
          and does not replace existing navigation.
      ===================================================== */}
      <RentalBottomNav />
      {/* =====================================================
          REVIEW PAGE
      ===================================================== */}

      {page === "ReviewPage" && (
        <ReviewPage
          bookingId={selectedBookingId}
          onBackHome={handleBackToHomePageRental}
        />
      )}

      {/* =====================================================
          RETURN PROCESSING
      ===================================================== */}

      {page === "ReturnProcessing" && (
        <ReturnProcessing
          bookingId={selectedBookingId}
          onBackHome={handleBackToHomePageRental}
          onReview={handleReturnReview}
        />
      )}
    </>
  );
}

/*
 * BrowserRouter supplies the browser history stack used by
 * Chrome's back button, Android/iOS swipe-back gestures, and
 * forward navigation.
 *
 * All existing Supabase/authentication/component connections
 * remain inside AppContent unchanged.
 */
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;