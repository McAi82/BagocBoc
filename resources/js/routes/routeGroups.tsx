// routes/routeGroups.tsx

import React from "react";
import Certifications from "../pages/certificates/Certifications";
import Clearance from "../pages/clearance/Clearance";
import Residents from "../pages/residents/Residents";
import Households from "../pages/households/Households";

export const populationsItems = [
  { name: "Residents", path: "/barangay-bagocboc/populations/residents" },
  { name: "Households", path: "/barangay-bagocboc/populations/households" },
];

export const PopulationsResidents = () => <Residents />;
export const PopulationsHouseholds = () => <Households />;

// ✅ Single unified pages
export const CertificationsPage = () => <Certifications />;
export const ClearancePage = () => <Clearance />;
