import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

import Landing from "./Landing";
import Login from "./Login";
import SignUp from "./SignUp";
import ChoicePage from "./ChoicePage";
import HomePageRental from "./HomePageRental";
import Listing from "./Listing";
import Profile from "./Profile";
import ForgotPassword from "./ForgotPassword";
import BookingPage from "./BookingPage";
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

function App() {
  // =========================================================
  // CURRENT PAGE
  // =========================================================

  const [page, setPage] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [selectedCycleId, setSelectedCycleId] = useState(null);

  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session restore error:", error);

          if (mounted) {
            localStorage.removeItem("cycle_last_page");
            setPage("Landing");
          }

          return;
        }

        // =========================================
        // NO ACTIVE SESSION
        // =========================================

        if (!session) {
          localStorage.removeItem("cycle_last_page");

          if (mounted) {
            setPage("Landing");
          }

          return;
        }

        // =========================================
        // VALID SESSION
        // =========================================

        const savedPage = localStorage.getItem(
          "cycle_last_page"
        );

        // Pages that should NEVER be restored
        const invalidPages = [
          "Landing",
          "Login",
          "SignUp",
          "ForgotPassword",
          "TermsAndConditions",
        ];

        if (
          savedPage &&
          !invalidPages.includes(savedPage)
        ) {
          if (mounted) {
            setPage(savedPage);
          }
        } else {
          // User is authenticated but there is
          // no usable previous page.

          if (mounted) {
            setPage("ChoicePage");
          }
        }

      } catch (error) {
        console.error(
          "Unexpected session restoration error:",
          error
        );

        if (mounted) {
          setPage("Landing");
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    restoreSession();

    // =========================================
    // LISTEN FOR LOGIN / LOGOUT / SESSION CHANGE
    // =========================================

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange(
      (event, session) => {

        console.log(
          "Auth event:",
          event
        );

        // USER LOGGED OUT
        if (event === "SIGNED_OUT" || !session) {
          localStorage.removeItem(
            "cycle_last_page"
          );

          if (mounted) {
            setPage("Login");
          }

          return;
        }

        // USER LOGGED IN
        if (event === "SIGNED_IN") {
          const savedPage =
            localStorage.getItem(
              "cycle_last_page"
            );

          if (
            savedPage &&
            ![
              "Landing",
              "Login",
              "SignUp",
              "ForgotPassword",
              "TermsAndConditions",
            ].includes(savedPage)
          ) {
            setPage(savedPage);
          } else {
            setPage("ChoicePage");
          }
        }
      }
    );

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
      "ChoicePage",
      "HomePageRental",
      "Listing",
      "Profile",
      "CycleOwner",
      "OnGoingRents",
      "AdminDashboard",
      "BookingPage",
      "OwnerDetails",
      "ReportPage",
      "ReturnPage",
      "CycleVerification",
      "NotificationPage",
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
    useState("ChoicePage");

  const [selectedBookingId, setSelectedBookingId] = useState(null);

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  const [notificationReturnPage, setNotificationReturnPage] =
    useState("ChoicePage");

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
    useState("ChoicePage");

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
    setPage("Login");
  };

  // =========================================================
  // ADMIN → CHOICE PAGE
  // =========================================================

  const handleBackToChoice = () => {
    setPage("ChoicePage");

    setIsAdminChoicePage(true);
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
      setPage("ChoicePage");
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

  // =========================================================
  // OPEN ONGOING RENTS
  // =========================================================

  const handleOnGoingRents = (
    returnPage = "ChoicePage"
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
  // NOTIFICATION ACTIONS
  // =========================================================

  // const handleNotificationAction = (
  //   notification,
  //   actionType
  // ) => {
  //   switch (actionType) {
  //     // -----------------------------------------------------
  //     // RETURN CYCLE
  //     // -----------------------------------------------------

  //     case "RETURN_CYCLE":
  //       setPage("ReturnPage");
  //       break;

  //     // -----------------------------------------------------
  //     // VIEW RENTAL
  //     // -----------------------------------------------------

  //     case "VIEW_RENTAL":
  //       setPage("OnGoingRents");
  //       break;

  //     // -----------------------------------------------------
  //     // VIEW REPORT
  //     // -----------------------------------------------------

  //     case "VIEW_REPORT":
  //       setPage("ReportPage");
  //       break;

  //     // -----------------------------------------------------
  //     // VIEW CYCLE
  //     // -----------------------------------------------------

  //     case "VIEW_CYCLE":
  //       if (
  //         notification.type ===
  //         "CYCLE_VERIFICATION_ASSIGNED"
  //       ) {
  //         if (!notification.cycle_id) {
  //           console.error(
  //             "Cycle ID is missing from notification:",
  //             notification
  //           );

  //           alert(
  //             "Cycle ID not found in this notification."
  //           );

  //           return;
  //         }

  //         setSelectedCycle({
  //           id: notification.cycle_id,
  //         });

  //         setPage("CycleVerification");
  //       } else {
  //         setPage("BookingPage");
  //       }

  //       break;

  //     // -----------------------------------------------------
  //     // VIEW EXTENSION
  //     // -----------------------------------------------------

  //     case "VIEW_EXTENSION":
  //       console.log(
  //         "Open extension request"
  //       );
  //       break;

  //     // -----------------------------------------------------
  //     // VIEW ACCOUNT
  //     // -----------------------------------------------------

  //     case "VIEW_ACCOUNT":
  //       console.log(
  //         "Open account"
  //       );
  //       break;

  //     // -----------------------------------------------------
  //     // RETRY PAYMENT
  //     // -----------------------------------------------------

  //     case "RETRY_PAYMENT":
  //       console.log(
  //         "Retry payment"
  //       );
  //       break;

  //     // -----------------------------------------------------
  //     // VIEW DISPUTE
  //     // -----------------------------------------------------

  //     case "VIEW_DISPUTE":
  //       console.log(
  //         "Open payment dispute"
  //       );
  //       break;

  //     // -----------------------------------------------------
  //     // VIEW SECURITY
  //     // -----------------------------------------------------

  //     case "VIEW_SECURITY":
  //       console.log(
  //         "Open security settings"
  //       );
  //       break;

  //     // -----------------------------------------------------
  //     // DEFAULT
  //     // -----------------------------------------------------

  //     default:
  //       console.log(
  //         "Unknown notification action:",
  //         actionType
  //       );
  //   }
  // };

  // const handleNotificationAction = (
  //   notification,
  //   actionType,
  //   actionData
  // ) => {

  //   console.log(
  //     "Handling notification action:",
  //     {
  //       notification,
  //       actionType,
  //       actionData,
  //     }
  //   );


  //   /* =========================================================
  //     ENTER RENTAL OTP
  //     =========================================================
      
  //     Owner clicks:
      
  //     [ Enter OTP ]
      
  //     Opens OTP page.
      
  //     Required action_data:
  //     {
  //       booking_id,
  //       cycle_id,
  //       renter_id,
  //       owner_id
  //     }
  //   */

  //   if (
  //     actionType === "ENTER_RENTAL_OTP"
  //   ) {

  //     setPage("OTP");

  //     setPageData({
  //       notification,
  //       actionType,
  //       ...actionData,
  //     }); 

  //     return;
  //   }


  //   /* =========================================================
  //     REPORT OWNER
  //     =========================================================
      
  //     Used when:
      
  //     OTP expired because owner was absent.
      
  //     Opens report page.
      
  //     Required action_data:
  //     {
  //       booking_id,
  //       owner_id,
  //       renter_id,
  //       cycle_id
  //     }
  //   */

  //   if (
  //     actionType === "REPORT_OWNER"
  //   ) {

  //     setPage("ReportPage");

  //     setPageData({
  //       notification,
  //       actionType,
  //       ...actionData,
  //     });

  //     return;
  //   }


  //   /* =========================================================
  //     VIEW EXTENSION
  //     =========================================================
      
  //     Opens extension request page.
      
  //     Required action_data:
  //     {
  //       booking_id,
  //       extension_request_id,
  //       cycle_id,
  //       owner_id,
  //       renter_id
  //     }
  //   */

  //   if (
  //     actionType === "VIEW_EXTENSION"
  //   ) {

  //     setCurrentPage("extension");

  //     setPageData({
  //       notification,
  //       actionType,
  //       ...actionData,
  //     });

  //     return;
  //   }


  //   /* =========================================================
  //     RETURN CYCLE
  //     =========================================================
      
  //     Opens return page.
      
  //     Required action_data:
  //     {
  //       booking_id,
  //       cycle_id,
  //       owner_id,
  //       renter_id
  //     }
  //   */

  //   if (
  //     actionType === "RETURN_CYCLE"
  //   ) {

  //     setCurrentPage("return");

  //     setPageData({
  //       notification,
  //       actionType,
  //       ...actionData,
  //     });

  //     return;
  //   }


  //   /* =========================================================
  //     VIEW REPORT
  //     =========================================================
      
  //     Used by admins for:
      
  //     RETURN_PROBLEM_REPORTED
  //     USER_REPORTED
  //     OWNER_REPORTED
  //     RENTER_REPORTED
  //     CYCLE_REPORTED
      
  //     Required action_data:
  //     {
  //       report_id,
  //       reporter_id,
  //       reported_user_id,
  //       booking_id,
  //       cycle_id
  //     }
  //   */

  //   if (
  //     actionType === "VIEW_REPORT"
  //   ) {

  //     setCurrentPage("reportDetails");

  //     setPageData({
  //       notification,
  //       actionType,
  //       ...actionData,
  //     });

  //     return;
  //   }


  //   /* =========================================================
  //     VIEW CYCLE
  //     =========================================================
      
  //     Used mainly for:
      
  //     CYCLE_VERIFICATION_ASSIGNED
      
  //     Opens cycle verification/details page.
      
  //     Required action_data:
  //     {
  //       cycle_id,
  //       owner_id,
  //       admin_id
  //     }
  //   */

  //   if (
  //     actionType === "VIEW_CYCLE"
  //   ) {

  //     setCurrentPage("cycleDetails");

  //     setPageData({
  //       notification,
  //       actionType,
  //       ...actionData,
  //     });

  //     return;
  //   }


  //   /* =========================================================
  //     RETRY PAYMENT
  //     =========================================================
      
  //     Payment failed.
      
  //     Opens payment flow again using the same order details.
      
  //     action_data should contain the information required by
  //     your payment flow, for example:
      
  //     {
  //       booking_id,
  //       payment_id,
  //       order_id,
  //       amount,
  //       currency
  //     }
      
  //     IMPORTANT:
  //     The actual Razorpay initialization should happen in
  //     your payment page/component, not directly inside this
  //     notification router.
  //   */

  //   if (
  //     actionType === "RETRY_PAYMENT"
  //   ) {

  //     setCurrentPage("payment");

  //     setPageData({
  //       notification,
  //       actionType,
  //       ...actionData,
  //     });

  //     return;
  //   }


  //   /* =========================================================
  //     VIEW SECURITY
  //     =========================================================
      
  //     Opens security/review page.
      
  //     Used for:
      
  //     NEW_LOGIN_DETECTED
  //     SECURITY_ALERT
  //     etc.
  //   */

  //   if (
  //     actionType === "VIEW_SECURITY"
  //   ) {

  //     setCurrentPage("security");

  //     setPageData({
  //       notification,
  //       actionType,
  //       ...actionData,
  //     });

  //     return;
  //   }


  //   /* =========================================================
  //     UNKNOWN ACTION
  //     =========================================================
  //   */

  //   console.warn(
  //     "Unknown notification action:",
  //     actionType,
  //     actionData
  //   );
  // };
  // // }

  // if (authLoading || !page) {
  //   return (
  //     <div
  //       style={{
  //         minHeight: "100vh",
  //         display: "flex",
  //         alignItems: "center",
  //         justifyContent: "center",
  //         background:
  //           "radial-gradient(circle at center, rgba(45, 130, 72, 0.75), rgba(6, 27, 20, 1))",
  //         color: "white",
  //         fontSize: "18px",
  //       }}
  //     >
  //       Loading...
  //     </div>
  //   );
  // }



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

      setPage("Report");

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

      setPage("myRentals");

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

      setPage("Report");

      break;


    // --------------------------------------------------
    // VIEW ACCOUNT
    // --------------------------------------------------

    case "view_account":

      setPage("userProfile");

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
            "rzp_test_PSEUDO_KEY",

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

      {page === "ChoicePage" && (
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
      )}

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
          BackToChoice={
            handleBackToChoice
          }
          onViewDetails={
            handleViewDetails
          }
          onNotifications={() =>
            handleOpenNotifications(
              "HomePageRental"
            )
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
        onLogout={() => {
        setPage("Login");
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
          onBack={
            handleBackToChoice
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
            handleOnGoingRentsBack
          }
        />
      )}

      {/* =====================================================
          OTP
      ===================================================== */}

      {page === "OTP" && (
        <OTP
          onBookingId = {bookingId}
        />
      )}

      {/* =====================================================
          RETURN PAGE
      ===================================================== */}

      {page === "ReturnPage" && (
        <ReturnPage 
           bookingId = {selectedBookingId}
           onBack={handleOnGoingRents}
           onBackHome={handleBackToChoice}
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
            handleBackToChoice
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
    </>
  );
}

export default App;