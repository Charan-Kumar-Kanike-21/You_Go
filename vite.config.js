import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({ 
      registerType: "autoUpdate",

      manifest: {
        name: "UgO - Campus Cycle Exchange",
        short_name: "UgO",
        description: "Campus cycle sharing platform",

        start_url: "/",
        scope: "/",

        display: "standalone",

        background_color: "#031f16",
        theme_color: "#39e879",

        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
})
  ]
});