console.log(
  "🚀🚀🚀 pwaInstall.js LOADED 🚀🚀🚀"
);
let deferredPrompt = null;

console.log("=================================");
console.log("PWA INSTALL MODULE LOADED");
console.log("=================================");

console.log(
  "beforeinstallprompt supported:",
  "onbeforeinstallprompt" in window
);


window.addEventListener(
  "beforeinstallprompt",
  (event) => {

    console.log(
      "🔥🔥🔥 beforeinstallprompt FIRED 🔥🔥🔥"
    );

    console.log(
      "Event received:",
      event
    );

    // Prevent Chrome from showing its own
    // automatic install UI.
    event.preventDefault();

    deferredPrompt = event;

    console.log(
      "✅ PWA install prompt saved"
    );

  }
);
// ======================================================
// GET CURRENT INSTALL PROMPT
// ======================================================

export const getInstallPrompt = () => {

    

  console.log(
    "getInstallPrompt() called"
  );

  console.log(
    "Current deferredPrompt:",
    deferredPrompt
  );

  return deferredPrompt;
};


// ======================================================
// INSTALL PWA
// ======================================================

export const installPWA = async () => {

  console.log(
    "installPWA() called"
  );

  // ------------------------------------------
  // Check whether prompt exists
  // ------------------------------------------

  if (!deferredPrompt) {

    console.warn(
      "❌ No deferred install prompt available."
    );

    return {
      available: false,
      outcome: null,
    };
  }


  try {

    console.log(
      "📱 Showing PWA install prompt..."
    );

    await deferredPrompt.prompt();


    // ------------------------------------------
    // Wait for user's decision
    // ------------------------------------------

    const { outcome } =
      await deferredPrompt.userChoice;


    console.log(
      "User install decision:",
      outcome
    );


    // Prompt can only be used once
    deferredPrompt = null;


    return {
      available: true,
      outcome,
    };

  } catch (error) {

    console.error(
      "❌ Error showing PWA install prompt:",
      error
    );

    deferredPrompt = null;

    return {
      available: false,
      outcome: null,
      error,
    };

  }

};