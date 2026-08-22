// ============================================================
// UGO PWA INSTALL HELPER
// ============================================================

const INSTALL_STORAGE_KEY =
  "ugo_app_installed";

let deferredPrompt = null;


// ============================================================
// CHECK STANDALONE MODE
// ============================================================

export const isStandalonePWA = () => {
  const standaloneMode =
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

  const fullscreenMode =
    window.matchMedia(
      "(display-mode: fullscreen)"
    ).matches;

  const minimalUiMode =
    window.matchMedia(
      "(display-mode: minimal-ui)"
    ).matches;

  const iosStandalone =
    window.navigator.standalone === true;

  return (
    standaloneMode ||
    fullscreenMode ||
    minimalUiMode ||
    iosStandalone
  );
};


// ============================================================
// CHECK LOCAL INSTALL STATE
// ============================================================

export const hasSavedInstallState = () => {
  try {
    return (
      localStorage.getItem(
        INSTALL_STORAGE_KEY
      ) === "true"
    );
  } catch (error) {
    console.warn(
      "Unable to read PWA install state:",
      error
    );

    return false;
  }
};


// ============================================================
// SAVE INSTALL STATE
// ============================================================

export const saveInstallState = () => {
  try {
    localStorage.setItem(
      INSTALL_STORAGE_KEY,
      "true"
    );

    console.log(
      "✅ UGO installation state saved."
    );
  } catch (error) {
    console.warn(
      "Unable to save PWA install state:",
      error
    );
  }
};


// ============================================================
// CLEAR INSTALL STATE
// ============================================================

export const clearInstallState = () => {
  try {
    localStorage.removeItem(
      INSTALL_STORAGE_KEY
    );

    console.log(
      "UGO installation state cleared."
    );
  } catch (error) {
    console.warn(
      "Unable to clear PWA install state:",
      error
    );
  }
};


// ============================================================
// CHECK INSTALLED RELATED APPS
//
// This gives Chrome another way to report an
// installed related application/PWA when supported.
// ============================================================

export const checkInstalledRelatedApps =
  async () => {
    try {
      if (
        typeof navigator
          .getInstalledRelatedApps !==
        "function"
      ) {
        return false;
      }

      const apps =
        await navigator.getInstalledRelatedApps();

      console.log(
        "Installed related apps:",
        apps
      );

      return (
        Array.isArray(apps) &&
        apps.length > 0
      );

    } catch (error) {
      console.warn(
        "Unable to check installed related apps:",
        error
      );

      return false;
    }
  };


// ============================================================
// COMPLETE INSTALL CHECK
// ============================================================

export const checkPWAInstalled =
  async () => {

    // 1. Already running as installed PWA
    if (isStandalonePWA()) {
      saveInstallState();
      return true;
    }

    // 2. Previously installed from this browser
    if (hasSavedInstallState()) {
      return true;
    }

    // 3. Browser-supported installed app detection
    const relatedAppInstalled =
      await checkInstalledRelatedApps();

    if (relatedAppInstalled) {
      saveInstallState();
      return true;
    }

    return false;
  };


// ============================================================
// BEFORE INSTALL PROMPT
// ============================================================

window.addEventListener(
  "beforeinstallprompt",
  (event) => {

    console.log(
      "🔥 UGO beforeinstallprompt captured."
    );

    event.preventDefault();

    deferredPrompt = event;

    window.dispatchEvent(
      new CustomEvent(
        "ugo-install-available"
      )
    );
  }
);


// ============================================================
// APP INSTALLED EVENT
// ============================================================

window.addEventListener(
  "appinstalled",
  () => {

    console.log(
      "🎉 UGO PWA installed."
    );

    deferredPrompt = null;

    saveInstallState();

    window.dispatchEvent(
      new CustomEvent(
        "ugo-app-installed"
      )
    );
  }
);


// ============================================================
// GET INSTALL PROMPT
// ============================================================

export const getInstallPrompt = () => {
  return deferredPrompt;
};


// ============================================================
// CHECK WHETHER INSTALL PROMPT IS AVAILABLE
// ============================================================

export const isInstallPromptAvailable =
  () => {
    return !!deferredPrompt;
  };


// ============================================================
// INSTALL PWA
// ============================================================

export const installPWA = async () => {

  if (!deferredPrompt) {

    console.log(
      "⚠️ No PWA install prompt is available."
    );

    return {
      outcome: "unavailable",
      installed: false,
    };
  }

  try {

    const promptEvent =
      deferredPrompt;

    // Prevent the same prompt from
    // being used multiple times.
    deferredPrompt = null;

    await promptEvent.prompt();

    const choiceResult =
      await promptEvent.userChoice;

    console.log(
      "UGO PWA user choice:",
      choiceResult
    );

    if (
      choiceResult?.outcome ===
      "accepted"
    ) {

      saveInstallState();

      return {
        ...choiceResult,
        installed: true,
      };
    }

    return {
      ...choiceResult,
      installed: false,
    };

  } catch (error) {

    console.error(
      "UGO PWA installation error:",
      error
    );

    return {
      outcome: "error",
      installed: false,
      error,
    };
  }
};


// ============================================================
// DEBUG HELPER
// ============================================================

export const getPWAStatus = () => {

  return {
    standalone:
      isStandalonePWA(),

    saved:
      hasSavedInstallState(),

    promptAvailable:
      !!deferredPrompt,

    browser:
      window.matchMedia(
        "(display-mode: browser)"
      ).matches,
  };
};


// ============================================================
// OPTIONAL GLOBAL DEBUG
// ============================================================

console.log(
  "UGO PWA helper loaded."
);