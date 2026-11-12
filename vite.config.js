import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import laravel from "laravel-vite-plugin";
import path from "node:path";
import { bunny } from "laravel-vite-plugin/fonts";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/css/app.css", "resources/js/main.tsx"],
            refresh: true,
            fonts: [bunny("Instrument Sans", { weights: [400, 500, 600] })],
        }),
        react(),
        VitePWA({
            injectRegister: false, // we register manually in main.tsx
            registerType: "autoUpdate",
            manifestFilename: "manifest.webmanifest",
            includeAssets: [],
            manifest: {
                name: "Barangay Bagocboc Management System",
                short_name: "Bagocboc",
                description: "Barangay Bagocboc, Opol, Misamis Oriental",
                start_url: "/",
                scope: "/",
                display: "standalone",
                orientation: "portrait",
                background_color: "#ffffff",
                theme_color: "#facc15",
                icons: [
                    {
                        src: "/icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "/icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "/icons/icon-maskable-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
            workbox: {
                inlineWorkboxRuntime: true, // makes sw.js self-contained so it can be served from /sw.js
                navigateFallback: null, // HTML comes from Laravel, not Vite
                globPatterns: ["**/*.{js,css,woff2,png,svg}"],
                runtimeCaching: [
                    {
                        // Never cache API responses (resident data is sensitive)
                        urlPattern: ({ url }) =>
                            url.pathname.startsWith("/api"),
                        handler: "NetworkOnly",
                    },
                    {
                        // Pages: always try the network first
                        urlPattern: ({ request }) =>
                            request.mode === "navigate",
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "pages",
                            networkTimeoutSeconds: 5,
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./resources/js"),
        },
    },
    server: {
        watch: {
            ignored: ["**/storage/framework/views/**"],
        },
        proxy: {
            "/api": {
                target: "http://localhost:8000",
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: "public/build",
        emptyOutDir: true,
    },
});
