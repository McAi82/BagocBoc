// components/core/Sidebar.tsx

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { useNetworkStore } from "../../stores/networkStore";
import { api } from "../../api/apiClient";
import toast from "react-hot-toast";

// ============================================
// TYPES
// ============================================

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

// ============================================
// ROLE CONSTANTS
// ============================================

const SUPER_ADMIN = "Super Admin";
const CAPTAIN = "Barangay Captain";
const SECRETARY = "Barangay Secretary";
const TREASURER = "Barangay Treasurer";
const FRONT_DESK = "Front Desk Clerk";
const MIDWIFE = "Midwife";
const NDP = "Nurse Deployment Program";
const BNS = "Barangay Nutrition Scholar";
const ZONE_LEADER = "Zone Leader";

// ============================================
// MAIN COMPONENT
// ============================================

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { mode } = useThemeStore();
  const networkStatus = useNetworkStore((state) => state.status);

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ============================================
  // STABLE DERIVED VALUES
  // ============================================

  const userRoles = useMemo(
    () => user?.roles?.map((r) => r.name) || [],
    [user?.roles],
  );

  const isSuperAdmin = useMemo(
    () => userRoles.includes(SUPER_ADMIN),
    [userRoles],
  );

  // ============================================
  // HELPERS
  // ============================================

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
    if (isSuperAdmin) return "Super Admin";
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
  // NAVIGATION CONFIG — STRICT SCOPE
  // ============================================

  const navConfig = useMemo(() => {
    const items: (NavItem | NavGroup)[] = [];

    // ---------- Resolve scope ----------
    const scope: string = isSuperAdmin
      ? "superadmin"
      : userRoles.includes(CAPTAIN)
        ? "captain"
        : userRoles.includes(SECRETARY)
          ? "secretary"
          : userRoles.includes(TREASURER)
            ? "treasurer"
            : userRoles.includes(FRONT_DESK)
              ? "frontdesk"
              : userRoles.includes(MIDWIFE)
                ? "midwife"
                : userRoles.includes(NDP)
                  ? "ndp"
                  : userRoles.includes(BNS)
                    ? "bns"
                    : userRoles.includes(ZONE_LEADER)
                      ? "zoneleader"
                      : "unknown";

    if (import.meta.env.DEV) {
      console.log("Sidebar scope:", scope, "| roles:", userRoles);
    }

    // ============================================================
    // 🛡️ SUPER ADMIN — Everything
    // ============================================================
    if (scope === "superadmin") {
      items.push({
        name: "Overview",
        icon: LayoutDashboard,
        children: [
          {
            name: "System Dashboard",
            path: "/barangay-bagocboc/superadmin",
            icon: Shield,
          },
          {
            name: "Captain Dashboard",
            path: "/barangay-bagocboc/captain",
            icon: LayoutDashboard,
          },
          {
            name: "Secretary Dashboard",
            path: "/barangay-bagocboc/secretary",
            icon: LayoutDashboard,
          },
          {
            name: "Treasurer Dashboard",
            path: "/barangay-bagocboc/treasurer",
            icon: LayoutDashboard,
          },
        ],
      });

      items.push({
        name: "Population",
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
          {
            name: "Confirmations",
            path: "/barangay-bagocboc/resident-confirmations",
            icon: UserCheck,
          },
          {
            name: "GIS Map",
            path: "/barangay-bagocboc/map",
            icon: MapPin,
          },
        ],
      });

      items.push({
        name: "Services",
        icon: FileCheck,
        children: [
          {
            name: "Front Desk",
            path: "/barangay-bagocboc/frontdesk",
            icon: Calendar,
          },
          {
            name: "Certifications",
            path: "/barangay-bagocboc/certifications",
            icon: FileCheck,
          },
          {
            name: "Barangay Clearance",
            path: "/barangay-bagocboc/clearance",
            icon: FileSignature,
          },
        ],
      });

      items.push({
        name: "Health",
        icon: Heart,
        children: [
          {
            name: "Health Dashboard",
            path: "/barangay-bagocboc/health",
            icon: LayoutDashboard,
          },
          {
            name: "All Patient Records",
            path: "/barangay-bagocboc/health/records",
            icon: FileText,
          },
          {
            name: "Checkup History",
            path: "/barangay-bagocboc/health/checkups",
            icon: Stethoscope,
          },
          {
            name: "Health Reports",
            path: "/barangay-bagocboc/health/reports",
            icon: BarChart3,
          },
          {
            name: "BNS Dashboard",
            path: "/barangay-bagocboc/bns",
            icon: BarChart3,
          },
          {
            name: "BNS Records",
            path: "/barangay-bagocboc/bns/reports",
            icon: ClipboardList,
          },
          {
            name: "BNS GIS Map",
            path: "/barangay-bagocboc/bns/gis",
            icon: Map,
          },
        ],
      });

      items.push({
        name: "Finance",
        icon: Wallet,
        children: [
          {
            name: "Payments",
            path: "/barangay-bagocboc/payments",
            icon: CreditCard,
          },
          {
            name: "SCD Reports",
            path: "/barangay-bagocboc/financial-reports",
            icon: PhilippinePeso,
          },
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

      items.push({
        name: "Communication",
        icon: Megaphone,
        children: [
          {
            name: "Announcements",
            path: "/barangay-bagocboc/announcements",
            icon: Megaphone,
          },
        ],
      });

      items.push({
        name: "System",
        icon: Settings,
        children: [
          {
            name: "System Settings",
            path: "/barangay-bagocboc/settings/system",
            icon: Settings2,
          },
          {
            name: "Profile Settings",
            path: "/barangay-bagocboc/settings/profile",
            icon: User,
          },
        ],
      });

      return items;
    }

    // ============================================================
    // 🎯 BARANGAY CAPTAIN
    // ============================================================
    if (scope === "captain") {
      items.push({
        name: "Overview",
        icon: LayoutDashboard,
        children: [
          {
            name: "Captain Dashboard",
            path: "/barangay-bagocboc/captain",
            icon: LayoutDashboard,
          },
          {
            name: "Map View",
            path: "/barangay-bagocboc/map",
            icon: MapPin,
          },
        ],
      });

      items.push({
        name: "Population",
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

      items.push({
        name: "Finance",
        icon: Wallet,
        children: [
          {
            name: "SCD Reports",
            path: "/barangay-bagocboc/financial-reports",
            icon: PhilippinePeso,
          },
        ],
      });

      items.push({
        name: "Communication",
        icon: Megaphone,
        children: [
          {
            name: "Announcements",
            path: "/barangay-bagocboc/announcements",
            icon: Megaphone,
          },
        ],
      });

      items.push({
        name: "System",
        icon: Settings,
        children: [
          {
            name: "Profile Settings",
            path: "/barangay-bagocboc/settings/profile",
            icon: User,
          },
        ],
      });

      return items;
    }

    // ============================================================
    // 🎯 BARANGAY SECRETARY
    // ============================================================
    if (scope === "secretary") {
      items.push({
        name: "Overview",
        icon: LayoutDashboard,
        children: [
          {
            name: "Secretary Dashboard",
            path: "/barangay-bagocboc/secretary",
            icon: LayoutDashboard,
          },
        ],
      });

      items.push({
        name: "Population",
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
          {
            name: "Confirmations",
            path: "/barangay-bagocboc/resident-confirmations",
            icon: UserCheck,
          },
        ],
      });

      items.push({
        name: "Services",
        icon: FileCheck,
        children: [
          {
            name: "Certifications",
            path: "/barangay-bagocboc/certifications",
            icon: FileCheck,
          },
          {
            name: "Barangay Clearance",
            path: "/barangay-bagocboc/clearance",
            icon: FileSignature,
          },
        ],
      });

      items.push({
        name: "Reports",
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

      items.push({
        name: "Finance",
        icon: Wallet,
        children: [
          {
            name: "Payments",
            path: "/barangay-bagocboc/payments",
            icon: CreditCard,
          },
          {
            name: "SCD Reports",
            path: "/barangay-bagocboc/financial-reports",
            icon: PhilippinePeso,
          },
        ],
      });

      items.push({
        name: "Communication",
        icon: Megaphone,
        children: [
          {
            name: "Announcements",
            path: "/barangay-bagocboc/announcements",
            icon: Megaphone,
          },
        ],
      });

      items.push({
        name: "System",
        icon: Settings,
        children: [
          {
            name: "Profile Settings",
            path: "/barangay-bagocboc/settings/profile",
            icon: User,
          },
        ],
      });

      return items;
    }

    // ============================================================
    // 🎯 BARANGAY TREASURER
    // ============================================================
    if (scope === "treasurer") {
      items.push({
        name: "Overview",
        icon: LayoutDashboard,
        children: [
          {
            name: "Treasurer Dashboard",
            path: "/barangay-bagocboc/treasurer",
            icon: LayoutDashboard,
          },
        ],
      });

      items.push({
        name: "Finance",
        icon: Wallet,
        children: [
          {
            name: "Payments",
            path: "/barangay-bagocboc/payments",
            icon: CreditCard,
          },
          {
            name: "SCD Reports",
            path: "/barangay-bagocboc/financial-reports",
            icon: PhilippinePeso,
          },
        ],
      });

      items.push({
        name: "Communication",
        icon: Megaphone,
        children: [
          {
            name: "Announcements",
            path: "/barangay-bagocboc/announcements",
            icon: Megaphone,
          },
        ],
      });

      items.push({
        name: "System",
        icon: Settings,
        children: [
          {
            name: "Profile Settings",
            path: "/barangay-bagocboc/settings/profile",
            icon: User,
          },
        ],
      });

      return items;
    }

    // ============================================================
    // 🎯 FRONT DESK CLERK
    // ============================================================
    if (scope === "frontdesk") {
      items.push({
        name: "Overview",
        icon: LayoutDashboard,
        children: [
          {
            name: "Front Desk Dashboard",
            path: "/barangay-bagocboc/frontdesk",
            icon: LayoutDashboard,
          },
        ],
      });

      items.push({
        name: "Operations",
        icon: Calendar,
        children: [
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
          {
            name: "Confirmations",
            path: "/barangay-bagocboc/resident-confirmations",
            icon: UserCheck,
          },
        ],
      });

      items.push({
        name: "Communication",
        icon: Megaphone,
        children: [
          {
            name: "Announcements",
            path: "/barangay-bagocboc/announcements",
            icon: Megaphone,
          },
        ],
      });

      items.push({
        name: "System",
        icon: Settings,
        children: [
          {
            name: "Profile Settings",
            path: "/barangay-bagocboc/settings/profile",
            icon: User,
          },
        ],
      });

      return items;
    }

    // ============================================================
    // 🎯 MIDWIFE / NDP
    // ============================================================
    if (scope === "midwife" || scope === "ndp") {
      items.push({
        name: "Overview",
        icon: LayoutDashboard,
        children: [
          {
            name: scope === "ndp" ? "NDP Dashboard" : "Midwife Dashboard",
            path: "/barangay-bagocboc/health",
            icon: LayoutDashboard,
          },
        ],
      });

      items.push({
        name: "Health Records",
        icon: Heart,
        children: [
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
        ],
      });

      items.push({
        name: "Checkups",
        icon: Stethoscope,
        children: [
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

      items.push({
        name: "Reports",
        icon: BarChart3,
        children: [
          {
            name: "Health Reports",
            path: "/barangay-bagocboc/health/reports",
            icon: BarChart3,
          },
        ],
      });

      items.push({
        name: "Communication",
        icon: Megaphone,
        children: [
          {
            name: "Announcements",
            path: "/barangay-bagocboc/announcements",
            icon: Megaphone,
          },
        ],
      });

      items.push({
        name: "System",
        icon: Settings,
        children: [
          {
            name: "Profile Settings",
            path: "/barangay-bagocboc/settings/profile",
            icon: User,
          },
        ],
      });

      return items;
    }

    // ============================================================
    // 🎯 BARANGAY NUTRITION SCHOLAR
    // ============================================================
    if (scope === "bns") {
      items.push({
        name: "Overview",
        icon: LayoutDashboard,
        children: [
          {
            name: "BNS Dashboard",
            path: "/barangay-bagocboc/bns",
            icon: LayoutDashboard,
          },
        ],
      });

      items.push({
        name: "Nutrition",
        icon: BarChart3,
        children: [
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

      items.push({
        name: "Communication",
        icon: Megaphone,
        children: [
          {
            name: "Announcements",
            path: "/barangay-bagocboc/announcements",
            icon: Megaphone,
          },
        ],
      });

      items.push({
        name: "System",
        icon: Settings,
        children: [
          {
            name: "Profile Settings",
            path: "/barangay-bagocboc/settings/profile",
            icon: User,
          },
        ],
      });

      return items;
    }

    // ============================================================
    // 🎯 UNKNOWN ROLE — fallback
    // ============================================================
    items.push({
      name: "System",
      icon: Settings,
      children: [
        {
          name: "Profile Settings",
          path: "/barangay-bagocboc/settings/profile",
          icon: User,
        },
      ],
    });

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, userRoles.join("|")]);

  // ============================================
  // AUTO-EXPAND ACTIVE GROUP (safe — no loops)
  // ============================================
  useEffect(() => {
    const currentPath = location.pathname;
    const activeGroups: string[] = [];

    navConfig.forEach((item) => {
      if ("children" in item) {
        const hasActiveChild = item.children.some((child) =>
          currentPath.startsWith(child.path),
        );
        if (hasActiveChild) activeGroups.push(item.name);
      }
    });

    if (activeGroups.length === 0) return;

    setExpandedGroups((prev) => {
      const needsUpdate = activeGroups.some((g) => !prev.includes(g));
      if (!needsUpdate) return prev; // ← breaks the loop
      return Array.from(new Set([...prev, ...activeGroups]));
    });
  }, [location.pathname, navConfig]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderNavItem = (item: NavItem, depth = 0) => {
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
        {isExpanded && <span className="truncate">{item.name}</span>}
      </NavLink>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const isExpandedGroup = expandedGroups.includes(group.name);
    const hasActiveChild = group.children.some((child) =>
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
            {group.children.map((child) => renderNavItem(child, 1))}
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
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}

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

        {/* Super Admin badge */}
        {isSuperAdmin && isExpanded && (
          <div className="mx-3 mt-3 px-3 py-2 bg-gradient-to-r from-purple-500/10 to-purple-600/5 border border-purple-300/40 dark:border-purple-700/40 rounded-lg flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                Super Admin
              </p>
              <p className="text-[10px] text-theme-textSecondary truncate">
                Full system access
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={`${isSuperAdmin ? "h-[calc(100vh-11rem)]" : "h-[calc(100vh-8rem)]"
            } overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar`}
        >
          {navConfig.map((item) => {
            if ("children" in item) {
              return renderNavGroup(item as NavGroup);
            }
            return renderNavItem(item as NavItem);
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-theme bg-theme-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative flex-shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${isSuperAdmin
                    ? "bg-purple-500/20 text-purple-600 dark:text-purple-400"
                    : "bg-theme-primary/20 text-theme-primary"
                    }`}
                >
                  <span className="text-sm font-bold">{getInitials()}</span>
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