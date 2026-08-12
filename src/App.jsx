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
import NotificationBell from "./NotificationBell";
import TermsAndConditions from "./TermsAndConditions";

function App() {
  // =========================================
  // CURRENT PAGE
  // =========================================

  const [page, setPage] = useState("Landing");

  const [selectedCycle, setSelectedCycle] = useState(null);

  const [profileReturnPage, setProfileReturnPage] = useState("ChoicePage");

  const [notificationReturnPage, setNotificationReturnPage] = useState("ChoicePage");

  const [isAdminChoicePage, setIsAdminChoicePage] = useState(false);

  const [ownerDetails, setOwnerDetails] = useState(null);

  const handleReportIssue = (rental) => {
    setSelectedCycle(rental);
    setPage("ReportPage");
  };

  const handleViewDetails = (cycle) => {
    setSelectedCycle(cycle);
    setPage("BookingPage");
  };

  const handleBookingBack = () => {
  setSelectedCycle(null);
  setPage("HomePageRental");
  };

  const handleOpenOwnerDetails = async () => {
  if (!selectedCycle?.owner_id) {
    console.error("Owner ID not found for this cycle");
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      full_name,
      phone,
      avatar_url
    `)
    .eq("id", selectedCycle.owner_id)
    .single();

  if (error) {
    console.error("Error fetching owner:", error);
    setOwnerDetails(null);
  } else {
    setOwnerDetails(data);
  }

  setPage("OwnerDetails");
  };

  const handleCycleOwner = () => {
    setPage("CycleOwner")
  }

  
  // =========================================
  // OPEN NOTIFICATION PAGE
  // =========================================

  const handleOpenNotifications = (returnPage) => {
    setNotificationReturnPage(returnPage);
    setPage("NotificationPage");
  };

  // =========================================
  // NOTIFICATION BACK
  // =========================================

  const handleNotificationBack = () => {
    setPage(notificationReturnPage);
  };

  // =========================================
  // LANDING → LOGIN
  // =========================================

  const handleLandingFinish = () => {
    setPage("Login");
  };

  const handleBackToChoice = () => {
    setPage("ChoicePage");
    setIsAdminChoicePage(true);
  };

  // =========================================
  // LOGIN → SIGN UP
  // =========================================

  const handleCreateAccount = () => {
    setPage("SignUp");
  };

  // =========================================
  // SIGN UP → LOGIN
  // =========================================

  const handleBackToLogin = () => {
    setPage("Login");
  };

  // =========================================
  // LOGIN → CHOICE PAGE
  // =========================================

  const handleLoginSuccess = (role) => {
    if (role === "admin") {
      setIsAdminChoicePage(false);
      setPage("AdminDashboard");
    } else if (role === "student") {
      setIsAdminChoicePage(false);
      setPage("ChoicePage");
    }
  };

  // const handleChoicetoRentPage = () => {
  //   setPage("HomePageRental");
  // }

  // =========================================
  // CHOICE PAGE → RENTAL HOME PAGE
  // =========================================

  const handleRentalChoice = () => {
    setPage("HomePageRental");
  };

  const handleForgotPassword = () => {
    setPage("ForgotPassword");
  }

  // =========================================
  // CHOICE PAGE → CYCLE LISTING PAGE
  // =========================================

  const handleListingChoice = () => {
    setPage("Listing");
  };

  const [ongoingRentsReturnPage, setOngoingRentsReturnPage] =
    useState("ChoicePage");

  const handleOnGoingRents = (returnPage = "ChoicePage") => {
    setOngoingRentsReturnPage(returnPage);
    setPage("OnGoingRents");
  };

  const handleOnGoingRentsBack = () => {
    setPage(ongoingRentsReturnPage);
  };

    // =========================================
  // OPEN PROFILE PAGE
  // =========================================

  const handleOpenProfile = (returnPage) => {
    setProfileReturnPage(returnPage);
    setPage("Profile");
  };

  // =========================================
  // PROFILE BACK
  // =========================================

  const handleProfileBack = () => {
    setPage(profileReturnPage);
  };

  const handleNotificationAction = (notification, actionType) => {
  switch (actionType) {
    case "RETURN_CYCLE":
      setPage("ReturnPage");
      break;

    case "VIEW_RENTAL":
      setPage("OnGoingRents");
      break;

    case "VIEW_REPORT":
      setPage("ReportPage");
      break;

      case "VIEW_CYCLE":
        if (notification.type === "CYCLE_VERIFICATION_ASSIGNED") {

          if (!notification.cycle_id) {
            console.error(
              "Cycle ID is missing from notification:",
              notification
            );

            alert("Cycle ID not found in this notification.");
            return;
          }

          setSelectedCycle({
            id: notification.cycle_id,
          });

          setPage("CycleVerification");

        } else {

          // Normal cycle notification
          setPage("BookingPage");

        }

        break;

    case "VIEW_EXTENSION":
      // Add your extension page here later
      console.log("Open extension request");
      break;

    case "VIEW_ACCOUNT":
      // Add admin account page here later
      console.log("Open account");
      break;

    case "RETRY_PAYMENT":
      console.log("Retry payment");
      break;

    case "VIEW_DISPUTE":
      console.log("Open payment dispute");
      break;

    case "VIEW_SECURITY":
      console.log("Open security settings");
      break;

    default:
      console.log("Unknown notification action:", actionType);
  }
  };

  return (
    <>
      {/* =========================================
          LANDING PAGE
      ========================================= */}

      {page === "Landing" && (
        <Landing
          onFinish={handleLandingFinish}
        />
      )}

      {/* =========================================
          LOGIN PAGE
      ========================================= */}

      {page === "Login" && (
        <Login
          onCreateAccount={handleCreateAccount}
          onLoginSuccess={handleLoginSuccess}
          onForgotPassword={handleForgotPassword}
        />
      )}

      {page === "BookingPage" && (
        <BookingPage
        cycle = {selectedCycle}
        onBack = {handleBookingBack}
        onOwnerDetails={handleOpenOwnerDetails}
        />
      )}

      {/* =========================================
          SIGN UP PAGE
      ========================================= */}

      {page === "SignUp" && (
        <SignUp
          onBackToLogin={handleBackToLogin}
          onTermsClick={() => setPage("TermsAndConditions")}
        />
      )}

      {/* =========================================
          CHOICE PAGE
      ========================================= */}

      {page === "ChoicePage" && (
        <ChoicePage
          onRentalChoice={handleRentalChoice}
          onProfileChoice={() => handleOpenProfile("ChoicePage")}
          onCycleOwner = {handleCycleOwner}
          onActiveRentals={() => handleOnGoingRents("ChoicePage")}
          isAdmin={isAdminChoicePage}
          onBackToAdmin={() => setPage("AdminDashboard")}
        />
      )}

      {/* =========================================
          RENTAL HOME PAGE
      ========================================= */}

      {page === "HomePageRental" && (
        <HomePageRental
          onProfile={() => handleOpenProfile("HomePageRental")}
          BackToChoice={handleBackToChoice}
          onViewDetails={handleViewDetails}
          onNotifications={() =>
            handleOpenNotifications("HomePageRental")
          }
        />
      )}

      {/* =========================================
          CYCLE LISTING PAGE
      ========================================= */}

      {page === "Listing" && (
        <Listing 
        onBack={handleCycleOwner}
        />
      )}

      {/* =========================================
          PROFILE PAGE
      ========================================= */}

      {page === "Profile" && (
        <Profile
          onBack={handleProfileBack}
        />
      )}

      {page === "ForgotPassword" && (
        <ForgotPassword
          onBackToLogin={handleBackToLogin}
        />
      )}

      {page === "CycleOwner" && (
        <CycleOwner
            onListCycle={handleListingChoice}
            onBack={handleBackToChoice}
            onNotifications={() =>
              handleOpenNotifications("CycleOwner")
            }
        />
      )}

      {page === "OnGoingRents" && (
       <OnGoingRents
       onBack={handleOnGoingRentsBack}
       onReportIssue={handleReportIssue}
       onNotifications={() =>
          handleOpenNotifications("onGoingRents")
        }
       />
      )}

      {page ==="NotificationPage" && (
        <NotificationPage
          onBack={handleNotificationBack}
          onNotificationAction={handleNotificationAction}
        />
      )}

      {page === "ReportPage" && (
      <ReportPage
        rental={selectedCycle} 
        onBack={() => setPage("OnGoingRents")}
      />
      )}

      {page === "OTP" && (
        <OTP/>
      )}

      {page === "ReturnPage" && (
        <ReturnPage/>
      )}

      {page === "AdminDashboard"&& (
        <AdminDashboard
          onNotifications={() =>
            handleOpenNotifications("AdminDashboard")
          }
          onAdminToStudent = {handleBackToChoice}
        />
      )}

      {page === "OwnerDetails" && (
        <OwnerDetails
            owner={ownerDetails}
            onBack={() => setPage("BookingPage")}
        />
      )}

      {page === "CycleVerification" && (
        <CycleVerification
          cycleId={selectedCycle?.id}
        />
      )}

      {page === "TermsAndConditions" &&(
        <TermsAndConditions
          onBack={() => setPage("SignUp")}
        />
      )}
    </>
  );
}

export default App;