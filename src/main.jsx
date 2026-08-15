// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'

// // ======================================================
// // PWA DEBUGGING
// // ======================================================

// console.log("========== PWA DEBUG START ==========");

// console.log("Current URL:", window.location.href);
// console.log("Protocol:", window.location.protocol);
// console.log("Service Worker supported:",
//   "serviceWorker" in navigator
// );

// // ------------------------------------------------------
// // Check manifest
// // ------------------------------------------------------

// const manifestLink = document.querySelector(
//   'link[rel="manifest"]'
// );

// if (manifestLink) {
//   console.log(
//     "Manifest link found:",
//     manifestLink.href
//   );
// } else {
//   console.error(
//     "❌ Manifest link NOT FOUND"
//   );
// }

// // ------------------------------------------------------
// // Fetch manifest
// // ------------------------------------------------------

// if (manifestLink) {
//   fetch(manifestLink.href)
//     .then(async (response) => {

//       console.log(
//         "Manifest HTTP status:",
//         response.status
//       );

//       if (!response.ok) {
//         throw new Error(
//           `Manifest returned ${response.status}`
//         );
//       }

//       const manifest = await response.json();

//       console.log(
//         "========== MANIFEST =========="
//       );

//       console.log(
//         "Manifest:",
//         manifest
//       );

//       console.log(
//         "name:",
//         manifest.name
//       );

//       console.log(
//         "short_name:",
//         manifest.short_name
//       );

//       console.log(
//         "start_url:",
//         manifest.start_url
//       );

//       console.log(
//         "display:",
//         manifest.display
//       );

//       console.log(
//         "theme_color:",
//         manifest.theme_color
//       );

//       console.log(
//         "background_color:",
//         manifest.background_color
//       );

//       console.log(
//         "icons:",
//         manifest.icons
//       );

//       // --------------------------------------------------
//       // Check icons
//       // --------------------------------------------------

//       if (!manifest.icons || manifest.icons.length === 0) {

//         console.error(
//           "❌ No icons found in manifest"
//         );

//       } else {

//         manifest.icons.forEach((icon, index) => {

//           console.log(
//             `Checking icon ${index + 1}:`,
//             icon
//           );

//           fetch(icon.src)
//             .then((response) => {

//               console.log(
//                 `Icon ${icon.src} status:`,
//                 response.status
//               );

//               console.log(
//                 `Icon ${icon.src} content-type:`,
//                 response.headers.get("content-type")
//               );

//             })
//             .catch((error) => {

//               console.error(
//                 `❌ Cannot load icon ${icon.src}`,
//                 error
//               );

//             });

//         });

//       }

//     })
//     .catch((error) => {

//       console.error(
//         "❌ MANIFEST ERROR:",
//         error
//       );

//     });
// }

// // ------------------------------------------------------
// // Service worker
// // ------------------------------------------------------

// if ("serviceWorker" in navigator) {

//   navigator.serviceWorker
//     .getRegistrations()
//     .then((registrations) => {

//       console.log(
//         "Service Worker registrations:",
//         registrations
//       );

//       if (registrations.length === 0) {

//         console.error(
//           "❌ No Service Worker registered"
//         );

//       } else {

//         registrations.forEach((registration) => {

//           console.log(
//             "✅ Service Worker:",
//             registration
//           );

//         });

//       }

//     });

// }

// // ------------------------------------------------------
// // beforeinstallprompt
// // ------------------------------------------------------

// window.addEventListener(
//   "beforeinstallprompt",
//   (event) => {

//     console.log(
//       "✅ beforeinstallprompt FIRED",
//       event
//     );

//     window.__pwaInstallPrompt = event;

//   }
// );

// // ------------------------------------------------------
// // appinstalled
// // ------------------------------------------------------

// window.addEventListener(
//   "appinstalled",
//   () => {

//     console.log(
//       "✅ UGO WAS INSTALLED"
//     );

//   }
// );

// console.log("========== PWA DEBUG END ==========");

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )




// ========================================
// BEFORE INSTALL PROMPT
// ========================================

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

console.log("=================================");
console.log("UGO APPLICATION STARTING");
console.log("=================================");


// ======================================================
// SERVICE WORKER
// ======================================================

if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    async () => {

      try {

        console.log(
          "Registering UGO Service Worker..."
        );

        const registration =
          await navigator.serviceWorker.register(
            "/sw.js"
          );

        console.log(
          "✅ Service Worker registered:",
          registration
        );

        console.log(
          "Scope:",
          registration.scope
        );

      } catch (error) {

        console.error(
          "❌ Service Worker registration failed:",
          error
        );

      }

    }
  );

} else {

  console.error(
    "❌ Service Worker API not supported."
  );

}


// ======================================================
// RENDER APP
// ======================================================

createRoot(
  document.getElementById("root")
).render(

  <StrictMode>
    <App />
  </StrictMode>

);