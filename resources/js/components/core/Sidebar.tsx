// components/core/Sidebar.tsx

import React, { useState, useMemo, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Home,
  FileText,
  FileCheck,
  CreditCard,
  Calendar,
  User,
  Settings,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Megaphone,
  Receipt,
  PhilippinePeso,
  FileSignature,
  ClipboardList,
  QrCode,
  UserPlus,
  Activity,
  PieChart,
  BarChart3,
  Heart,
  Clock,
  Baby,
  Droplet,
  User as UserIcon,
  Stethoscope,
  Search,
  UserCheck,
  Map,
  Settings2,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { useNetworkStore } from "../../stores/networkStore";
import { api } from "../../api/apiClient";
import toast from "react-hot-toast";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles?: string[];
  children?: NavItem[];
}

interface NavGroup {
  name: string;
  icon: React.ElementType;
  roles?: string[];
  children: NavItem[];
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { mode } = useThemeStore();
  const networkStatus = useNetworkStore((state) => state.status);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "main",
    "health",
  ]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userRoles = user?.roles?.map((r) => r.name) || [];
  console.log("Sidebar: User roles", userRoles);

  const hasRole = (roles: string[] = []) => {
    if (roles.length === 0) return true;
    return roles.some((role) => userRoles.includes(role));
  };

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name],
    );
  };

  const getStatusColor = () => {
    if (networkStatus === "Connected") return "bg-green-500";
    if (networkStatus === "Connecting") return "bg-yellow-500";
    return "bg-gray-400";
  };

  const getInitials = () => {
    const firstName = user?.resident?.first_name || user?.first_name || "";
    const lastName = user?.resident?.last_name || user?.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const getFullName = () => {
    const firstName = user?.resident?.first_name || user?.first_name || "";
    const lastName = user?.resident?.last_name || user?.last_name || "";
    return `${firstName} ${lastName}`.trim() || "User";
  };

  const getRoleName = () => {
    return userRoles[0] || "User";
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.post("/web/logout");
      logout();
      navigate("/login", { replace: true });
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const isExpanded = isOpen || isHovered;

  // ============================================
  // NAVIGATION CONFIGURATION
  // ============================================

  const navConfig = useMemo(() => {
    const items: (NavItem | NavGroup)[] = [];

    // ============================================
    // 1. DASHBOARD - All web users except Midwife (they have their own)
    // ============================================
    if (
      hasRole([
        "Barangay Secretary",
        "Barangay Treasurer",
      ]) &&
      !hasRole(["Midwife", "Nurse Deployment Program"])
    ) {
      items.push({
        name: `${getRoleName().split(" ")[1]} Dashboard`,
        path: "/barangay-bagocboc",
        icon: LayoutDashboard,
      });
    }

    // ============================================
    // 2. CAPTAIN DASHBOARD - Barangay Captain only
    // ============================================
    if (hasRole(["Barangay Captain"])) {
      items.push({
        name: `${getRoleName().split(" ")[1]} Dashboard`,
        path: "/barangay-bagocboc/captain",
        icon: LayoutDashboard,
      });
    }

    // ============================================
    // 3. SUPER ADMIN - System Overview
    // ============================================
    if (hasRole(["Super Admin"])) {
      items.push({
        name: "System Overview",
        path: "/barangay-bagocboc/superadmin",
        icon: Shield,
      });
    }

    // ============================================
    // 4. MAP VIEW - Captain & Super Admin only
    // ============================================
    if (hasRole(["Barangay Captain", "Super Admin"])) {
      items.push({
        name: "Map View",
        path: "/barangay-bagocboc/map",
        icon: MapPin,
      });
    }

    // ============================================
    // 5. POPULATIONS - Captain, Secretary
    // ============================================
    if (hasRole(["Barangay Captain", "Barangay Secretary", "Super Admin"])) {
      items.push({
        name: "Populations",
        icon: Users,
        children: [
          {
            name: "Residents",
            path: "/barangay-bagocboc/populations/residents",
            icon: Users,
          },
          {
            name: "Households",
            path: "/barangay-bagocboc/populations/households",
            icon: Home,
          },
        ],
      });
    }

    // ============================================
    // 6. CERTIFICATIONS - Secretary only
    // ============================================
    if (hasRole(["Barangay Secretary"])) {
      items.push({
        name: "Certifications",
        path: "/barangay-bagocboc/certifications",
        icon: FileCheck,
      });

      items.push({
        name: "Barangay Clearance",
        path: "/barangay-bagocboc/clearance",
        icon: FileSignature,
      });
    }

    // ============================================
    // 7. FRONT DESK - Front Desk Clerk only
    // ============================================
    if (hasRole(["Front Desk Clerk"])) {
      items.push({
        name: "Front Desk",
        icon: Calendar,
        children: [
          {
            name: "Dashboard",
            path: "/barangay-bagocboc/frontdesk",
            icon: LayoutDashboard,
          },
          {
            name: "Queue",
            path: "/barangay-bagocboc/frontdesk/queue",
            icon: Clock,
          },
          {
            name: "Requests",
            path: "/barangay-bagocboc/frontdesk/requests",
            icon: FileText,
          },
          {
            name: "Appointments",
            path: "/barangay-bagocboc/frontdesk/appointments",
            icon: Calendar,
          },
          {
            name: "Residents",
            path: "/barangay-bagocboc/frontdesk/residents",
            icon: Users,
          },
          {
            name: "Claim Slips",
            path: "/barangay-bagocboc/frontdesk/claims",
            icon: QrCode,
          },
          {
            name: "Tax Records",
            path: "/barangay-bagocboc/frontdesk/tax",
            icon: Receipt,
          },
        ],
      });
    }

    // ============================================
    // 8. BNS DASHBOARD - Barangay Nutrition Scholar
    // ============================================
    if (hasRole(["Barangay Nutrition Scholar", "Super Admin"])) {
      items.push({
        name: "BNS",
        icon: BarChart3,
        children: [
          {
            name: "Dashboard",
            path: "/barangay-bagocboc/bns",
            icon: LayoutDashboard,
          },
          {
            name: "BHW Records",
            path: "/barangay-bagocboc/bns/reports",
            icon: ClipboardList,
          },
          {
            name: "GIS Map",
            path: "/barangay-bagocboc/bns/gis",
            icon: Map,
          },
        ],
      });
    }

    // ============================================
    // 9. HEALTH - Midwife, BNS, Super Admin
    // ============================================
    if (hasRole(["Midwife", "Nurse Deployment Program", "Super Admin"])) {
      items.push({
        name: "Health",
        icon: Heart,
        children: [
          {
            name: hasRole(["Nurse Deployment Program"]) && !hasRole(["Midwife"])
              ? "NDP Dashboard"
              : "Midwife Dashboard",
            path: "/barangay-bagocboc/health",
            icon: LayoutDashboard,
          },
          {
            name: "All Records",
            path: "/barangay-bagocboc/health/records",
            icon: FileText,
          },
          {
            name: "Pregnant",
            path: "/barangay-bagocboc/health/records/pregnant",
            icon: Heart,
          },
          {
            name: "Children",
            path: "/barangay-bagocboc/health/records/children",
            icon: Baby,
          },
          {
            name: "Lactating",
            path: "/barangay-bagocboc/health/records/lactating",
            icon: Droplet,
          },
          {
            name: "Senior Citizens",
            path: "/barangay-bagocboc/health/records/senior",
            icon: UserIcon,
          },
          {
            name: "NCD / Chronic",
            path: "/barangay-bagocboc/health/records/other",
            icon: Activity,
          },
          {
            name: "Checkup History",
            path: "/barangay-bagocboc/health/checkups",
            icon: Stethoscope,
          },
          {
            name: "New Patient",
            path: "/barangay-bagocboc/health/patients/new",
            icon: UserPlus,
          },
          {
            name: "Search Patients",
            path: "/barangay-bagocboc/health/patients/search",
            icon: Search,
          },
        ],
      });
    }

    // ============================================
    // 10. FINANCIAL - Secretary & Treasurer
    // ============================================
    if (hasRole(["Barangay Secretary", "Barangay Treasurer"])) {
      items.push({
        name: "Payments",
        path: "/barangay-bagocboc/payments",
        icon: CreditCard,
      });
    }

    // ============================================
    // 11. SECRETARY REPORTS - Secretary only
    // ============================================
    if (hasRole(["Barangay Secretary"])) {
      items.push({
        name: "Secretary Reports",
        icon: PieChart,
        children: [
          {
            name: "Resident Registry",
            path: "/barangay-bagocboc/secretary/registry",
            icon: Users,
          },
          {
            name: "Clearance Log",
            path: "/barangay-bagocboc/secretary/clearance-log",
            icon: FileText,
          },
          {
            name: "Certificate Reports",
            path: "/barangay-bagocboc/secretary/certificate-reports",
            icon: BarChart3,
          },
        ],
      });
    }

    // ============================================
    // 12. FINANCIAL REPORTS - Treasurer, Captain, Secretary, Super Admin
    // ============================================
    if (
      hasRole([
        "Barangay Treasurer",
        "Super Admin",
        "Barangay Captain",
        "Barangay Secretary",
      ])
    ) {
      items.push({
        name: "SCD Reports",
        path: "/barangay-bagocboc/financial-reports",
        icon: PhilippinePeso,
      });
    }

    // ============================================
    // 13. ANNOUNCEMENTS - Captain & Secretary
    // ============================================
    if (hasRole(["Barangay Captain", "Barangay Secretary"])) {
      items.push({
        name: "Announcements",
        path: "/barangay-bagocboc/announcements",
        icon: Megaphone,
      });
    }

    // ============================================
    // 14. RESIDENT CONFIRMATIONS - Secretary, Front Desk, Zone Leader
    // ============================================
    if (
      hasRole([
        "Barangay Secretary",
        "Front Desk Clerk",
        "Zone Leader",
        "Super Admin",
      ])
    ) {
      items.push({
        name: "Confirmations",
        path: "/barangay-bagocboc/resident-confirmations",
        icon: UserCheck,
      });
    }

    // ============================================
    // 15. SETTINGS - Super Admin & Captain
    // ============================================
    if (hasRole(["Super Admin", "Barangay Captain"])) {
      const settingsChildren = [];

      // Profile Settings - everyone
      settingsChildren.push({
        name: "Profile Settings",
        path: "/barangay-bagocboc/settings/profile",
        icon: User,
      });

      // ✅ System Settings - Super Admin only (unified)
      if (hasRole(["Super Admin"])) {
        settingsChildren.push({
          name: "System Settings",
          path: "/barangay-bagocboc/settings/system",
          icon: Settings2,
        });
      }

      // Main Settings
      items.push({
        name: "Settings",
        icon: Settings,
        children: settingsChildren,
      });
    }

    return items;
  }, [userRoles]);

  // ============================================
  // AUTO-EXPAND GROUPS BASED ON CURRENT PATH
  // ============================================
  useEffect(() => {
    const currentPath = location.pathname;
    navConfig.forEach((item) => {
      if ("children" in item) {
        const hasActiveChild = item.children.some((child) =>
          currentPath.startsWith(child.path),
        );
        if (hasActiveChild && !expandedGroups.includes(item.name)) {
          setExpandedGroups((prev) => [...prev, item.name]);
        }
      }
    });
  }, [location.pathname, navConfig]);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderNavItem = (item: NavItem, depth = 0) => {
    if (item.roles && !hasRole(item.roles)) return null;

    const isActive = location.pathname === item.path;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive: navActive }) =>
          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${navActive || isActive
            ? "bg-theme-primary/10 text-theme-primary"
            : "text-theme-textSecondary hover:bg-theme-hover hover:text-theme-text"
          } ${depth > 0 ? "ml-6" : ""}`
        }
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {isExpanded && <span>{item.name}</span>}
      </NavLink>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    if (group.roles && !hasRole(group.roles)) return null;

    const isExpandedGroup = expandedGroups.includes(group.name);
    const visibleChildren = group.children.filter(
      (child) => !child.roles || hasRole(child.roles),
    );

    if (visibleChildren.length === 0) return null;

    const hasActiveChild = visibleChildren.some((child) =>
      location.pathname.startsWith(child.path),
    );

    return (
      <div key={group.name} className="space-y-1">
        <button
          onClick={() => toggleGroup(group.name)}
          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasActiveChild
            ? "bg-theme-primary/10 text-theme-primary"
            : "text-theme-textSecondary hover:bg-theme-hover hover:text-theme-text"
            }`}
        >
          <div className="flex items-center gap-3">
            <group.icon className="w-5 h-5 flex-shrink-0" />
            {isExpanded && <span>{group.name}</span>}
          </div>
          {isExpanded && (
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpandedGroup ? "rotate-180" : ""
                }`}
            />
          )}
        </button>
        {isExpandedGroup && isExpanded && (
          <div className="space-y-1">
            {visibleChildren.map((child) => renderNavItem(child, 1))}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen bg-theme-sidebar border-r border-theme transition-all duration-300 ${isExpanded ? "w-64" : "w-20"
          } lg:relative lg:z-0`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-theme">
          <div className="flex items-center gap-3 overflow-hidden">
            {isExpanded && (
              <span className="text-lg font-bold text-theme-text whitespace-nowrap">
                Barangay Bagocboc
              </span>
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded-lg hover:bg-theme-hover transition-colors flex-shrink-0 hidden lg:block"
          >
            {isExpanded ? (
              <ChevronLeft className="w-5 h-5 text-theme-textSecondary" />
            ) : (
              <ChevronRight className="w-5 h-5 text-theme-textSecondary" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="h-[calc(100vh-8rem)] overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {navConfig.map((item, index) => {
            if ("children" in item) {
              return renderNavGroup(item as NavGroup);
            }
            return renderNavItem(item as NavItem);
          })}
        </nav>

        {/* Footer - User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-theme bg-theme-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-theme-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-theme-primary">
                    {getInitials()}
                  </span>
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-theme-surface ${getStatusColor()}`}
                />
              </div>
              {isExpanded && (
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-theme-text truncate">
                    {getFullName()}
                  </p>
                  <p className="text-xs text-theme-textSecondary truncate">
                    {getRoleName()}
                  </p>
                </div>
              )}
            </div>
            {isExpanded && (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-theme-textSecondary hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-theme-surface rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200 border border-theme">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-theme-text">Logout</h3>
              <p className="text-sm text-theme-textSecondary mt-2">
                Are you sure you want to logout?
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
