// pages/settings/Settings.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building,
  Users,
  Shield,
  Bell,
  Database,
  Settings2,
  ChevronRight,
  UserCog,
  User,
  Lock,
  FileText,
  CreditCard,
  Home,
  MapPin,
  Palette,
  LayoutDashboard,
} from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";
import ThemeSwitcher from "../../components/features/ThemeSwitcher";
import Modal from "../../components/ui/Modal";

// ✅ Updated settings items - now includes System Settings
const settingsItems = [
  {
    id: 1,
    title: "Profile Settings",
    description: "Manage your personal information and account security",
    icon: User,
    route: "/barangay-bagocboc/settings/profile",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/30",
  },
  {
    id: 2,
    title: "System Settings",
    description: "Manage barangay info, users, personnel, and roles",
    icon: Settings2,
    route: "/barangay-bagocboc/settings/system",
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-900/30",
  },
  {
    id: 3,
    title: "Theme Settings",
    description: "Customize your interface appearance",
    icon: Palette,
    route: "#theme",
    color: "text-rose-600",
    bg: "bg-rose-50 dark:bg-rose-900/30",
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const [showThemeModal, setShowThemeModal] = useState(false);

  const handleItemClick = (item: any) => {
    if (item.id === 3) {
      setShowThemeModal(true);
    } else {
      navigate(item.route);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme-text">Settings</h1>
        <p className="text-sm text-theme-textSecondary mt-1">
          Manage system settings and controls
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="bg-theme-surface rounded-xl border border-theme p-6 shadow-sm hover:shadow-md hover:border-theme-primary transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${item.bg}`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-theme-text">{item.title}</h3>
                <p className="text-sm text-theme-textSecondary mt-1">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-theme-textSecondary group-hover:text-theme-primary transition-colors flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {/* Theme Settings Modal */}
      <Modal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        title="Theme Settings"
        size="lg"
      >
        <ThemeSwitcher onClose={() => setShowThemeModal(false)} />
      </Modal>
    </div>
  );
}
