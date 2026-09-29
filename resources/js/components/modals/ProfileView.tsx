// components/features/ProfileView.tsx

import React, { useState } from "react";
import {
  User,
  Activity,
  LogOut,
  X,
  Shield,
  Clock,
  CheckCircle,
} from "lucide-react";
import AccountCenterModal from "../profile/AccountCenterModal";
import RecentActivityModal from "./RecentActivityModal";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface ProfileViewProps {
  onClose: () => void;
  networkStatus?: "Connected" | "Connecting" | "Disconnected";
  expanded?: boolean;
  userName?: string;
  userRole?: string;
}

export default function ProfileView({
  onClose,
  networkStatus = "Connected",
  expanded = true,
  userName = "User",
  userRole = "User",
}: ProfileViewProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Connected":
        return {
          bg: "bg-emerald-500/10",
          text: "text-emerald-400",
          dot: "bg-emerald-500",
          label: "Connected",
        };
      case "Connecting":
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          dot: "bg-amber-500",
          label: "Connecting",
        };
      default:
        return {
          bg: "bg-slate-700/50",
          text: "text-slate-400",
          dot: "bg-slate-500",
          label: "Disconnected",
        };
    }
  };

  const statusConfig = getStatusConfig(networkStatus);

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
    return user?.roles?.[0]?.name || userRole;
  };

  // ✅ Direct logout without mutation hook
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.post("/web/logout");
      logout();
      navigate("/login", { replace: true });
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API fails, logout locally
      logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
      onClose();
    }
  };

  return (
    <>
      <div className="w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.3)] overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Status</span>
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusConfig.bg} ${statusConfig.text} border border-slate-700/30`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}
                />
                {statusConfig.label}
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {expanded && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-600">
                  <span className="text-white font-bold text-lg">
                    {getInitials()}
                  </span>
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${statusConfig.dot}`}
                />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-100">
                  {getFullName()}
                </p>
                <p className="text-xs text-sky-400 font-medium">
                  {getRoleName()}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="py-1">
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="w-full flex items-center px-4 py-2.5 text-sm font-medium transition-colors group text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <User className="w-4 h-4 mr-3 text-slate-400 group-hover:text-white transition-colors" />
            Account Center
          </button>

          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="w-full flex items-center px-4 py-2.5 text-sm font-medium transition-colors group text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Activity className="w-4 h-4 mr-3 text-slate-400 group-hover:text-white transition-colors" />
            Recent Activity
          </button>

          {expanded && (
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center px-4 py-2.5 text-sm font-medium transition-colors group text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 mt-1 border-t border-slate-800 pt-3"
            >
              <LogOut className="w-4 h-4 mr-3 text-rose-400 group-hover:text-rose-300 transition-colors" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          )}
        </div>
      </div>

      <AccountCenterModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        initialData={user}
      />

      <RecentActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
      />
    </>
  );
}
