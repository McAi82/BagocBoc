// pages/dashboards/DashboardIndex.tsx

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export default function DashboardIndex() {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const roles = user.roles?.map((r) => r.name) || [];
  console.log("DashboardIndex: User roles:", roles);

  // ✅ Super Admin
  if (roles.includes("Super Admin")) {
    return <Navigate to="/barangay-bagocboc/superadmin" replace />;
  }

  // ✅ Barangay Captain - Redirect to Captain Dashboard
  if (roles.includes("Barangay Captain")) {
    return <Navigate to="/barangay-bagocboc/captain" replace />;
  }

  // ✅ Barangay Secretary
  if (roles.includes("Barangay Secretary")) {
    return <Navigate to="/barangay-bagocboc/secretary" replace />;
  }

  // ✅ Barangay Treasurer
  if (roles.includes("Barangay Treasurer")) {
    return <Navigate to="/barangay-bagocboc/treasurer" replace />;
  }

  // ✅ Front Desk Clerk
  if (roles.includes("Front Desk Clerk")) {
    return <Navigate to="/barangay-bagocboc/frontdesk" replace />;
  }

  // ✅ Midwife - Redirect to Health Dashboard
  if (roles.includes("Midwife") || roles.includes("Nurse Deployment Program")) {
    return <Navigate to="/barangay-bagocboc/health" replace />;
  }

  // ✅ BNS
  if (roles.includes("Barangay Nutrition Scholar")) {
    return <Navigate to="/barangay-bagocboc/bns" replace />;
  }

  // ✅ Default dashboard for other roles
  return <Navigate to="/barangay-bagocboc" replace />;
}
