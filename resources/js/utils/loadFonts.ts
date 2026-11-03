// utils/loadFonts.ts
// Injects the brand type pair (Fraunces + Plus Jakarta Sans) once.
// Safe to call from every page — it no-ops if already present.

export function loadBrandFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById("brand-fonts")) return;

  const link = document.createElement("link");
  link.id = "brand-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}

export const fontDisplay = { fontFamily: "'Fraunces', serif" };
export const fontBody = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
