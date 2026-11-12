// resources/js/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// CSS is loaded via @vite in resources/views/app.blade.php — do NOT import it here.

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error(
        'Root element #root not found. Make sure resources/views/app.blade.php contains <div id="root"></div>.',
    );
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

// Register the PWA service worker (production builds only)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js", { scope: "/" })
            .catch((err) => console.error("SW registration failed:", err));
    });
}
