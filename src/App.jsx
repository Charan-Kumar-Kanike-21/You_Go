// import React, { useState } from "react";

// import { supabase } from "./supabase";

// import Landing from "./Landing";
// import Login from "./Login";
// import SignUp from "./SignUp";
// import ChoicePage from "./ChoicePage";
// import HomePageRental from "./HomePageRental";
// import Listing from "./Listing";
// import Profile from "./Profile";
// import ForgotPassword from "./ForgotPassword";
// import BookingPage from "./BookingPage";
// import CycleOwner from "./CycleOwner";
// import OnGoingRents from "./OnGoingRents";
// import ReportPage from "./ReportPage";
// import NotificationPage from "./NotificationPage";
// import OTP from "./OTP";
// import ReturnPage from "./ReturnPage";
// import AdminDashboard from "./AdminDashboard";
// import OwnerDetails from "./OwnerDetails";
// import CycleVerification from "./CycleVerification";
// import NotificationBell from "./NotificationBell";
// import TermsAndConditions from "./TermsAndConditions";
// import ReportForm from "./ReportForm";

// function App() {
//   // =========================================
//   // CURRENT PAGE
//   // =========================================

//   const [page, setPage] = useState("Landing");

//   const [selectedCycle, setSelectedCycle] = useState(null);

//   const [profileReturnPage, setProfileReturnPage] = useState("ChoicePage");

//   const [notificationReturnPage, setNotificationReturnPage] = useState("ChoicePage");

//   const [isAdminChoicePage, setIsAdminChoicePage] = useState(false);

//   const [ownerDetails, setOwnerDetails] = useState(null);

//   const [reportRental, setReportRental] = useState(null);
//   const [reporterRole, setReporterRole] = useState(null);
//   const [reportedUserId, setReportedUserId] = useState(null);

//   const handleReportIssue = (rental, role) => {
//     console.log("Rental for report:", rental);
//     console.log("Reporter role:", role);

//     if (!rental) {
//       console.error("Rental information is missing");
//       return;
//     }

//     let targetUserId = null;

//     // RENTER is reporting the OWNER
//     if (role === "renter") {
//       targetUserId =
//         rental.owner_id ||
//         rental.cycle_owner_id ||
//         rental.owner?.id ||
//         null;
//     }

//     // OWNER is reporting the RENTER
//     if (role === "owner") {
//       targetUserId =
//         rental.renter_id ||
//         rental.user_id ||
//         rental.renter?.id ||
//         null;
//     }

//     console.log("User being reported:", targetUserId);

//     if (!targetUserId) {
//       alert("Unable to determine the user being reported.");
//       return;
//     }

//     setReportRental(rental);
//     setReporterRole(role);
//     setReportedUserId(targetUserId);

//     setPage("ReportPage");
//   };

//   const handleViewDetails = (cycle) => {
//     setSelectedCycle(cycle);
//     setPage("BookingPage");
//   };

//   const handleBookingBack = () => {
//   setSelectedCycle(null);
//   setPage("HomePageRental");
//   };

//   const handleOpenOwnerDetails = async () => {
//   if (!selectedCycle?.owner_id) {
//     console.error("Owner ID not found for this cycle");
//     return;
//   }

//   const { data, error } = await supabase
//     .from("profiles")
//     .select(`
//       full_name,
//       phone,
//       avatar_url
//     `)
//     .eq("id", selectedCycle.owner_id)
//     .single();

//   if (error) {
//     console.error("Error fetching owner:", error);
//     setOwnerDetails(null);
//   } else {
//     setOwnerDetails(data);
//   }

//   setPage("OwnerDetails");
//   };

//   const handleCycleOwner = () => {
//     setPage("CycleOwner")
//   }

  
//   // =========================================
//   // OPEN NOTIFICATION PAGE
//   // =========================================

//   const handleOpenNotifications = (returnPage) => {
//     setNotificationReturnPage(returnPage);
//     setPage("NotificationPage");
//   };

//   // =========================================
//   // NOTIFICATION BACK
//   // =========================================

//   const handleNotificationBack = () => {
//     setPage(notificationReturnPage);
//   };

//   // =========================================
//   // LANDING → LOGIN
//   // =========================================

//   const handleLandingFinish = () => {
//     setPage("Login");
//   };

//   const handleBackToChoice = () => {
//     setPage("ChoicePage");
//     setIsAdminChoicePage(true);
//   };

//   // =========================================
//   // LOGIN → SIGN UP
//   // =========================================

//   const handleCreateAccount = () => {
//     setPage("SignUp");
//   };

//   // =========================================
//   // SIGN UP → LOGIN
//   // =========================================

//   const handleBackToLogin = () => {
//     setPage("Login");
//   };

//   // =========================================
//   // LOGIN → CHOICE PAGE
//   // =========================================

//   const handleLoginSuccess = (role) => {
//     if (role === "admin") {
//       setIsAdminChoicePage(false);
//       setPage("AdminDashboard");
//     } else if (role === "student") {
//       setIsAdminChoicePage(false);
//       setPage("ChoicePage");
//     }
//   };

//   // const handleChoicetoRentPage = () => {
//   //   setPage("HomePageRental");
//   // }

//   // =========================================
//   // CHOICE PAGE → RENTAL HOME PAGE
//   // =========================================

//   const handleRentalChoice = () => {
//     setPage("HomePageRental");
//   };

//   const handleForgotPassword = () => {
//     setPage("ForgotPassword");
//   }

//   // =========================================
//   // CHOICE PAGE → CYCLE LISTING PAGE
//   // =========================================

//   const handleListingChoice = () => {
//     setPage("Listing");
//   };

//   const [ongoingRentsReturnPage, setOngoingRentsReturnPage] =
//     useState("ChoicePage");

//   const handleOnGoingRents = (returnPage = "ChoicePage") => {
//     setOngoingRentsReturnPage(returnPage);
//     setPage("OnGoingRents");
//   };

//   const handleOnGoingRentsBack = () => {
//     setPage(ongoingRentsReturnPage);
//   };

//     // =========================================
//   // OPEN PROFILE PAGE
//   // =========================================

//   const handleOpenProfile = (returnPage) => {
//     setProfileReturnPage(returnPage);
//     setPage("Profile");
//   };

//   // =========================================
//   // PROFILE BACK
//   // =========================================

//   const handleProfileBack = () => {
//     setPage(profileReturnPage);
//   };

//   const handleNotificationAction = (notification, actionType) => {
//   switch (actionType) {
//     case "RETURN_CYCLE":
//       setPage("ReturnPage");
//       break;

//     case "VIEW_RENTAL":
//       setPage("OnGoingRents");
//       break;

//     case "VIEW_REPORT":
//       setPage("ReportPage");
//       break;

//       case "VIEW_CYCLE":
//         if (notification.type === "CYCLE_VERIFICATION_ASSIGNED") {

//           if (!notification.cycle_id) {
//             console.error(
//               "Cycle ID is missing from notification:",
//               notification
//             );

//             alert("Cycle ID not found in this notification.");
//             return;
//           }

//           setSelectedCycle({
//             id: notification.cycle_id,
//           });

//           setPage("CycleVerification");

//         } else {

//           // Normal cycle notification
//           setPage("BookingPage");

//         }

//         break;

//     case "VIEW_EXTENSION":
//       // Add your extension page here later
//       console.log("Open extension request");
//       break;

//     case "VIEW_ACCOUNT":
//       // Add admin account page here later
//       console.log("Open account");
//       break;

//     case "RETRY_PAYMENT":
//       console.log("Retry payment");
//       break;

//     case "VIEW_DISPUTE":
//       console.log("Open payment dispute");
//       break;

//     case "VIEW_SECURITY":
//       console.log("Open security settings");
//       break;

//     default:
//       console.log("Unknown notification action:", actionType);
//   }
//   };

//   return (
//     <>
//       {/* =========================================
//           LANDING PAGE
//       ========================================= */}

//       {page === "Landing" && (
//         <Landing
//           onFinish={handleLandingFinish}
//         />
//       )}

//       {/* =========================================
//           LOGIN PAGE
//       ========================================= */}

//       {page === "Login" && (
//         <Login
//           onCreateAccount={handleCreateAccount}
//           onLoginSuccess={handleLoginSuccess}
//           onForgotPassword={handleForgotPassword}
//         />
//       )}

//       {page === "BookingPage" && (
//         <BookingPage
//         cycle = {selectedCycle}
//         onBack = {handleBookingBack}
//         onOwnerDetails={handleOpenOwnerDetails}
//         />
//       )}

//       {/* =========================================
//           SIGN UP PAGE
//       ========================================= */}

//       {page === "SignUp" && (
//         <SignUp
//           onBackToLogin={handleBackToLogin}
//           onTermsClick={() => setPage("TermsAndConditions")}
//         />
//       )}

//       {/* =========================================
//           CHOICE PAGE
//       ========================================= */}

//       {page === "ChoicePage" && (
//         <ChoicePage
//           onRentalChoice={handleRentalChoice}
//           onProfileChoice={() => handleOpenProfile("ChoicePage")}
//           onCycleOwner = {handleCycleOwner}
//           onActiveRentals={() => handleOnGoingRents("ChoicePage")}
//           isAdmin={isAdminChoicePage}
//           onBackToAdmin={() => setPage("AdminDashboard")}
//         />
//       )}

//       {/* =========================================
//           RENTAL HOME PAGE
//       ========================================= */}

//       {page === "HomePageRental" && (
//         <HomePageRental
//           onProfile={() => handleOpenProfile("HomePageRental")}
//           BackToChoice={handleBackToChoice}
//           onViewDetails={handleViewDetails}
//           onNotifications={() =>
//             handleOpenNotifications("HomePageRental")
//           }
//         />
//       )}

//       {/* =========================================
//           CYCLE LISTING PAGE
//       ========================================= */}

//       {page === "Listing" && (
//         <Listing 
//         onBack={handleCycleOwner}
//         />
//       )}

//       {/* =========================================
//           PROFILE PAGE
//       ========================================= */}

//       {page === "Profile" && (
//         <Profile
//           onBack={handleProfileBack}
//         />
//       )}

//       {page === "ForgotPassword" && (
//         <ForgotPassword
//           onBackToLogin={handleBackToLogin}
//         />
//       )}

//       {page === "CycleOwner" && (
//         <CycleOwner
//             onListCycle={handleListingChoice}
//             onBack={handleBackToChoice}
//             onNotifications={() =>
//               handleOpenNotifications("CycleOwner")
//             }
//         />
//       )}

//       {page === "OnGoingRents" && (
//         <OnGoingRents
//           onBack={handleOnGoingRentsBack}
//           onReportIssue={(rental) =>
//             handleReportIssue(rental, "renter")
//           }
//           onNotifications={() =>
//             handleOpenNotifications("onGoingRents")
//           }
//         />
//       )}

//       {page ==="NotificationPage" && (
//         <NotificationPage
//           onBack={handleNotificationBack}
//           onNotificationAction={handleNotificationAction}
//         />
//       )}

//       {page === "ReportPage" && (
//         <ReportPage
//           rental={reportRental}
//           reportedUserId={reportedUserId}
//           reporterRole={reporterRole}
//           onBack={handleOnGoingRentsBack}
//         />
//       )}

//       {page === "OTP" && (
//         <OTP/>
//       )}

//       {page === "ReturnPage" && (
//         <ReturnPage/>
//       )}

//       {page === "AdminDashboard"&& (
//         <AdminDashboard
//           onNotifications={() =>
//             handleOpenNotifications("AdminDashboard")
//           }
//           onAdminToStudent = {handleBackToChoice}
//         />
//       )}

//       {page === "OwnerDetails" && (
//         <OwnerDetails
//             owner={ownerDetails}
//             onBack={() => setPage("BookingPage")}
//         />
//       )}

//       {page === "CycleVerification" && (
//         <CycleVerification
//           cycleId={selectedCycle?.id}
//         />
//       )}

//       {page === "TermsAndConditions" &&(
//         <TermsAndConditions
//           onBack={() => setPage("SignUp")}
//         />
//       )}
//     </>
//   );
// }

// export default App;



import React, { useState } from "react";

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

  const [page, setPage] = useState("Landing");

  // =========================================================
  // CYCLE / BOOKING
  // =========================================================

  const [selectedCycle, setSelectedCycle] = useState(null);

  // =========================================================
  // PROFILE
  // =========================================================

  const [profileReturnPage, setProfileReturnPage] =
    useState("ChoicePage");

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
    if (role === "admin") {
      setIsAdminChoicePage(false);

      setPage("AdminDashboard");
    } else if (role === "student") {
      setIsAdminChoicePage(false);

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

  const handleNotificationAction = (
    notification,
    actionType
  ) => {
    switch (actionType) {
      // -----------------------------------------------------
      // RETURN CYCLE
      // -----------------------------------------------------

      case "RETURN_CYCLE":
        setPage("ReturnPage");
        break;

      // -----------------------------------------------------
      // VIEW RENTAL
      // -----------------------------------------------------

      case "VIEW_RENTAL":
        setPage("OnGoingRents");
        break;

      // -----------------------------------------------------
      // VIEW REPORT
      // -----------------------------------------------------

      case "VIEW_REPORT":
        setPage("ReportPage");
        break;

      // -----------------------------------------------------
      // VIEW CYCLE
      // -----------------------------------------------------

      case "VIEW_CYCLE":
        if (
          notification.type ===
          "CYCLE_VERIFICATION_ASSIGNED"
        ) {
          if (!notification.cycle_id) {
            console.error(
              "Cycle ID is missing from notification:",
              notification
            );

            alert(
              "Cycle ID not found in this notification."
            );

            return;
          }

          setSelectedCycle({
            id: notification.cycle_id,
          });

          setPage("CycleVerification");
        } else {
          setPage("BookingPage");
        }

        break;

      // -----------------------------------------------------
      // VIEW EXTENSION
      // -----------------------------------------------------

      case "VIEW_EXTENSION":
        console.log(
          "Open extension request"
        );
        break;

      // -----------------------------------------------------
      // VIEW ACCOUNT
      // -----------------------------------------------------

      case "VIEW_ACCOUNT":
        console.log(
          "Open account"
        );
        break;

      // -----------------------------------------------------
      // RETRY PAYMENT
      // -----------------------------------------------------

      case "RETRY_PAYMENT":
        console.log(
          "Retry payment"
        );
        break;

      // -----------------------------------------------------
      // VIEW DISPUTE
      // -----------------------------------------------------

      case "VIEW_DISPUTE":
        console.log(
          "Open payment dispute"
        );
        break;

      // -----------------------------------------------------
      // VIEW SECURITY
      // -----------------------------------------------------

      case "VIEW_SECURITY":
        console.log(
          "Open security settings"
        );
        break;

      // -----------------------------------------------------
      // DEFAULT
      // -----------------------------------------------------

      default:
        console.log(
          "Unknown notification action:",
          actionType
        );
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
        />
      )}

      {/* =====================================================
          PROFILE PAGE
      ===================================================== */}

      {page === "Profile" && (
        <Profile
          onBack={
            handleProfileBack
          }
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
          onBack={
            handleNotificationBack
          }
          onNotificationAction={
            handleNotificationAction
          }
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
        <OTP />
      )}

      {/* =====================================================
          RETURN PAGE
      ===================================================== */}

      {page === "ReturnPage" && (
        <ReturnPage />
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
            selectedCycle?.id
          }
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