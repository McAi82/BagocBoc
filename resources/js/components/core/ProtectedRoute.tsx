// components/core/ProtectedRoute.tsx

import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";

// ✅ Web accessible roles — accounts that can use the web app at all
const WEB_ACCESSIBLE_ROLES = [
  "Super Admin",
  "Barangay Captain",
  "Barangay Secretary",
  "Front Desk Clerk",
  "Barangay Treasurer",
  "Midwife",
  "Nurse Deployment Program",
  "Barangay Nutrition Scholar",
];

const SUPER_ADMIN = "Super Admin";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}: ProtectedRouteProps) {
  const location = useLocation();
  const { user, token, isAuthenticated, logout, login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!token || !isAuthenticated) {
        console.log("ProtectedRoute: No token or not authenticated");
        setIsLoading(false);
        return;
      }

      if (user) {
        setIsLoading(false);
        return;
      }

      try {
        console.log("ProtectedRoute: Fetching user...");
        const response = await api.get("/web/user");
        const userData =
          response.data?.data || response.data?.user || response.data;

        if (userData) {
          login(userData, token);
        } else {
          logout();
        }
      } catch (error) {
        console.error("ProtectedRoute: Error fetching user:", error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [token, isAuthenticated, user, login, logout]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-theme-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!token || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-theme-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading user data...
          </p>
        </div>
      </div>
    );
  }

  const userRoles = user.roles?.map((r) => r.name) || [];
  const isSuperAdmin = userRoles.includes(SUPER_ADMIN);

  // ✅ Check web access
  const hasWebAccess = userRoles.some((role) =>
    WEB_ACCESSIBLE_ROLES.includes(role),
  );

  if (!hasWebAccess) {
    logout();
    return <Navigate to="/login?error=web_access_denied" replace />;
  }

  // ============================================
  // ✅ SUPER ADMIN UNIVERSAL ACCESS
  // ============================================
  // If the user is a Super Admin, grant access to ANY route,
  // regardless of what `allowedRoles` contains.
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // ============================================
  // Regular role-based access
  // ============================================
  if (allowedRoles.length > 0) {
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      console.warn(
        `ProtectedRoute: Access denied for roles [${userRoles.join(", ")}] to route requiring [${allowedRoles.join(", ")}]`,
      );
      return <Navigate to="/barangay-bagocboc" replace />;
    }
  }

  return <>{children}</>;
}