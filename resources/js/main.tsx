// resources/js/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";

// CSS is loaded via @vite in resources/views/app.blade.php — do NOT import it here.

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error(
        "Root element #root not found. Make sure resources/views/app.blade.php contains <div id=\"root\"></div>.",
    );
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);