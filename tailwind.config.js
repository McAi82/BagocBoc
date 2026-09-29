/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./resources/**/*.blade.php",
        "./resources/js/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                theme: {
                    background: "var(--theme-background)",
                    surface: "var(--theme-surface)",
                    primary: "var(--theme-primary)",
                    secondary: "var(--theme-secondary)",
                    accent: "var(--theme-accent)",
                    text: "var(--theme-text)",
                    textSecondary: "var(--theme-text-secondary)",
                    border: "var(--theme-border)",
                    hover: "var(--theme-hover)",
                    sidebar: "var(--theme-sidebar)",
                    header: "var(--theme-header)",
                },
            },
            fontFamily: {
                sans: [
                    "Instrument Sans",
                    "ui-sans-serif",
                    "system-ui",
                    "-apple-system",
                    "Segoe UI",
                    "Roboto",
                    "Helvetica Neue",
                    "Arial",
                    "sans-serif",
                ],
                serif: ["Fraunces", "Georgia", "serif"],
            },
            boxShadow: {
                theme: "0 1px 3px 0 var(--theme-shadow), 0 1px 2px -1px var(--theme-shadow)",
            },
            borderRadius: {
                theme: "0.5rem",
            },
            keyframes: {
                "fade-in": {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                "zoom-in-95": {
                    from: { opacity: "0", transform: "scale(0.95)" },
                    to: { opacity: "1", transform: "scale(1)" },
                },
                "slide-in-from-top-2": {
                    from: { transform: "translateY(-0.5rem)", opacity: "0" },
                    to: { transform: "translateY(0)", opacity: "1" },
                },
                "slide-in-from-right": {
                    from: { transform: "translateX(100%)" },
                    to: { transform: "translateX(0)" },
                },
                "slide-in-from-left": {
                    from: { transform: "translateX(-100%)" },
                    to: { transform: "translateX(0)" },
                },
            },
            animation: {
                "fade-in": "fade-in 0.2s ease-out",
                "zoom-in-95": "zoom-in-95 0.2s ease-out",
                "slide-in-from-top-2": "slide-in-from-top-2 0.2s ease-out",
                "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
                "slide-in-from-left": "slide-in-from-left 0.3s ease-out",
            },
        },
    },
    plugins: [],
};