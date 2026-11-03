import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import laravel from "laravel-vite-plugin";
import path from "node:path";
import { bunny } from "laravel-vite-plugin/fonts";

export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/css/app.css", "resources/js/main.tsx"],
            refresh: true,
            fonts: [
                bunny("Instrument Sans", { weights: [400, 500, 600] }),
            ],
        }),
        react(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./resources/js"),
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: "public/build",
        emptyOutDir: true,
    },
});