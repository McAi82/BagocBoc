// src/components/certificates/shared/certificateTheme.ts

import type { CSSProperties } from "react";

export const GREEN = "#5b7d3a";
export const GREEN_DARK = "#3f5a28";
export const INK = "#111111";

export interface SBMember {
  name: string;
  committee: string;
}

export interface Organization {
  republic: string;
  province: string;
  municipality: string;
  barangay: string;
  officeTitle: string;
  councilName: string;
  punongBarangay: string;
  punongBarangayTitle: string;
  sbMembers: SBMember[];
  barangaySecretary: string;
  barangayTreasurer: string;
  barangayClerk: string;
  vision: string;
  mission1: string;
  mission2: string;
  mission3: string;
  address: string;
  buildingAddress: string;
  email: string;
  facebook: string;
  contactNumber: string;
}

export const DEFAULT_ORG: Organization = {
  republic: "Republic of the Philippines",
  province: "Province of Misamis Oriental",
  municipality: "Municipality of Opol",
  barangay: "Barangay Bagocboc",
  officeTitle: "OFFICE OF THE PUNONG BARANGAY",
  councilName: "BAGOCBOC BARANGAY COUNCIL",
  punongBarangay: "Hon. Marcos P. Gonzales",
  punongBarangayTitle: "Punong Barangay",
  sbMembers: [
    {
      name: "Hon. Pedro S. Santos",
      committee: "Committee on Peace & Order, Disaster Risk Reduction",
    },
    {
      name: "Hon. Ana R. Reyes",
      committee: "Committee on Appropriation & Finance, Ways & Means",
    },
    {
      name: "Hon. Carlos D. Dela Cruz",
      committee: "Committee on Infrastructure & Public Works",
    },
    {
      name: "Hon. Rosa M. Fernandez",
      committee: "Committee on Health, Social Services & Nutrition",
    },
    {
      name: "Hon. Ricardo B. Aquino",
      committee:
        "Committee on Agriculture, Fisheries & Environmental Protection",
    },
    {
      name: "Hon. Luz V. Mendoza",
      committee: "Committee on Women, Family & Children",
    },
    {
      name: "Hon. Eduardo C. Bautista",
      committee: "Committee on Education, Youth & Sports Development",
    },
    {
      name: "Hon. Miguel T. Castillo",
      committee: "SK Chairman [Committee on Youth Affairs & Sports]",
    },
  ],
  barangaySecretary: "Concordio A. Esber",
  barangayTreasurer: "Juan D. Dela Cruz",
  barangayClerk: "Myra T. Agripo",
  vision:
    "Barangay Bagocboc envisions a peaceful, progressive, and self-reliant community where every resident lives with dignity, enjoys equal access to quality basic services, and actively participates in transparent and accountable governance toward sustainable development.",
  mission1:
    "To deliver efficient and responsive basic services to all residents with integrity, transparency, and accountability.",
  mission2:
    "To promote inclusive growth by empowering families, youth, senior citizens, and marginalized sectors through accessible education, health, and livelihood programs.",
  mission3:
    "To foster unity, peace, and environmental sustainability through active community participation and good governance.",
  address: "Barangay Bagocboc, Opol, Misamis Oriental",
  buildingAddress: "Barangay Hall, Poblacion, Bagocboc, Opol",
  email: "bagocboc.opol@example.com",
  facebook: "Barangay Bagocboc Official",
  contactNumber: "+63 912 345 6789",
};

export const styles: Record<string, CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    padding: 24,
    background: "#e9ece4",
    minHeight: "100vh",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    color: INK, // ✅ explicit ink
  },
  toolbar: {
    display: "flex",
    gap: 12,
    width: "100%",
    maxWidth: 800,
    justifyContent: "flex-end",
    alignItems: "center",
    color: INK,
  },
  btn: {
    padding: "10px 18px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    color: "#333",
  },
  btnActive: {
    background: "#fef3c7",
    borderColor: "#f59e0b",
    color: "#333",
  },
  btnPrimary: {
    background: GREEN,
    color: "#fff",
    borderColor: GREEN_DARK,
    fontWeight: 600,
  },
  certificate: {
    display: "flex",
    width: 800,
    minHeight: 1050,
    background: "#fff",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    position: "relative",
    overflow: "hidden",
    color: INK, // ✅ forces ink inside certificate regardless of parent
  },
  sidebar: {
    width: 210,
    background: `linear-gradient(180deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`,
    color: "#fff",
    padding: "16px 12px",
    fontSize: 11,
    lineHeight: 1.35,
    boxSizing: "border-box",
  },
  sidebarHeaderWrap: {
    borderBottom: "1px solid rgba(255,255,255,0.5)",
    paddingBottom: 6,
    marginBottom: 8,
    color: "#fff",
  },
  sidebarHeader: {
    fontWeight: 700,
    fontSize: 12,
    textAlign: "center",
    textDecoration: "underline",
    color: "#fff",
  },
  sidebarPunong: {
    fontWeight: 700,
    fontSize: 11,
    textAlign: "center",
    color: "#fff",
  },
  sidebarPunongTitle: {
    textAlign: "center",
    fontSize: 10,
    marginBottom: 8,
    color: "#fff",
  },
  sidebarSectionLabel: {
    fontWeight: 700,
    fontSize: 10,
    textDecoration: "underline",
    marginTop: 6,
    marginBottom: 4,
    color: "#fff",
  },
  sbName: {
    fontWeight: 700,
    fontSize: 10,
    color: "#fff",
  },
  sbCommittee: {
    fontSize: 9,
    marginBottom: 4,
    opacity: 0.95,
    color: "#fff",
  },
  sidebarDivider: {
    borderTop: "1px solid rgba(255,255,255,0.5)",
    margin: "10px 0",
  },
  sidebarSectionTitle: {
    fontWeight: 700,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
    color: "#fff",
  },
  sidebarBody: {
    fontSize: 9,
    fontStyle: "italic",
    textAlign: "center",
    color: "#fff",
  },
  main: {
    flex: 1,
    padding: "28px 32px",
    position: "relative",
    boxSizing: "border-box",
    zIndex: 1,
    background: "#fff",
    color: INK, // ✅ ink for the body
  },
  mainHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    color: INK,
  },
  sealPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    border: `2px solid ${GREEN}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    color: GREEN,
    flexShrink: 0,
  },
  headerText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 1.35,
    flex: 1,
    color: INK,
  },
  officeTitle: {
    textAlign: "center",
    fontWeight: 700,
    fontSize: 15,
    marginTop: 14,
    letterSpacing: 0.5,
    color: INK,
  },
  rule: {
    borderTop: "3px solid #1a1a1a",
    marginTop: 8,
    marginBottom: 20,
  },
  certTitle: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: 1,
    margin: "0 0 22px",
    color: INK,
  },
  toWhom: {
    fontWeight: 700,
    fontSize: 14,
    marginBottom: 14,
    color: INK,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 1.8,
    textAlign: "justify",
    marginBottom: 16,
    color: INK,
  },
  inlineEditable: {
    padding: "0 2px",
    color: "inherit",
  },
  signatureBlock: {
    marginTop: 60,
    textAlign: "right",
    paddingRight: 8,
    color: INK,
  },
  signatureName: {
    fontWeight: 700,
    fontSize: 14,
    color: INK,
  },
  signatureTitle: {
    fontSize: 13,
    color: INK,
  },
  watermark: {
    position: "absolute",
    bottom: 90,
    right: 40,
    fontSize: 90,
    opacity: 0.08,
    pointerEvents: "none",
    zIndex: 0,
    userSelect: "none",
    color: INK,
  },
  footer: {
    marginTop: 60,
    fontSize: 11,
    lineHeight: 1.5,
    textAlign: "left",
    color: INK,
    position: "relative",
    zIndex: 1,
  },
  link: {
    color: "#1a56db",
    textDecoration: "underline",
  },
};

export const EXPORT_OVERRIDES = `
  [data-exporting="true"] * {
    transition: none !important;
    animation: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }

  [data-exporting="true"] [data-sidebar="true"] {
    background: #4a6b30 !important;
    color: #ffffff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  [data-exporting="true"] [data-sidebar="true"] * {
    color: #ffffff !important;
  }

  [data-exporting="true"] p,
  [data-exporting="true"] h1,
  [data-exporting="true"] div,
  [data-exporting="true"] span,
  [data-exporting="true"] strong {
    color: #111111 !important;
  }

  [data-exporting="true"] {
    background: #ffffff !important;
    color: #111111 !important;
  }

  [data-exporting="true"] .clickable-field {
    background: transparent !important;
  }
`;