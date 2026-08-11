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

function App() {
  // =========================================
  // CURRENT PAGE
  // =========================================

  const [page, setPage] = useState("Landing");

  const [selectedCycle, setSelectedCycle] = useState(null);

  const [profileReturnPage, setProfileReturnPage] = useState("ChoicePage");

  const [notificationReturnPage, setNotificationReturnPage] = useState("ChoicePage");

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
      setPage("AdminDashboard");
    } else if (role === "student") {
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

  const handleOnGoingRents = () => {
    setPage("OnGoingRents");
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
          onActiveRentals = {handleOnGoingRents}
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
       onReportIssue={handleReportIssue}
       onNotifications={() =>
          handleOpenNotifications("onGoingRents")
        }
       />
      )}

      {page ==="NotificationPage" && (
        <NotificationPage
          onBack={handleNotificationBack}
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
        />
      )}

      {page === "OwnerDetails" && (
        <OwnerDetails
            owner={ownerDetails}
            onBack={() => setPage("BookingPage")}
        />
      )}

      {page === "CycleVerification" && (
        <CycleVerification/>
      )}
    </>
  );
}

export default App;