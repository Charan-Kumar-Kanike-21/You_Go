import React, { useState } from "react";

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

function App() {
  // =========================================
  // CURRENT PAGE
  // =========================================

  const [page, setPage] = useState("OTP");

  const [selectedCycle, setSelectedCycle] = useState(null);

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

  const handleCycleOwner = () => {
    setPage("CycleOwner")
  }

  // =========================================
  // LANDING → LOGIN
  // =========================================

  const handleLandingFinish = () => {
    setPage("Login");
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

  const handleLoginSuccess = () => {
    setPage("ChoicePage");
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
  // PROFILE → RENTAL HOME PAGE
  // =========================================

  const handleProfileBack = () => {
    setPage("HomePageRental");
  };

  // =========================================
  // RENTAL HOME PAGE → PROFILE
  // =========================================

  const handleHomePagetoProfile = () => {
    setPage("Profile");
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
          // onListingChoice={handleListingChoice}
          onProfileChoice={handleHomePagetoProfile}
          onCycleOwner = {handleCycleOwner}
          onActiveRentals = {handleOnGoingRents}
        />
      )}

      {/* =========================================
          RENTAL HOME PAGE
      ========================================= */}

      {page === "HomePageRental" && (
        <HomePageRental
          onProfile={handleHomePagetoProfile}
          BackToChoice={handleLoginSuccess}
          onViewDetails={handleViewDetails}
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
            onBack={handleLoginSuccess}
        />
      )}

      {page === "OnGoingRents" && (
       <OnGoingRents
       onReportIssue={handleReportIssue}
       />
      )}

      {page ==="NotificationPage" && (
        <NotificationPage/>
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
        <AdminDashboard/>
      )}
    </>
  );
}

export default App;