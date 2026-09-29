// components/features/AccountCenterModal.tsx

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ShieldCheck,
  Clock,
  Mail,
  Phone,
  Calendar,
  User,
  Save,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";
import toast from "react-hot-toast";

interface AccountCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}

export default function AccountCenterModal({
  isOpen,
  onClose,
  initialData,
}: AccountCenterModalProps) {
  if (!isOpen) return null;

  const { user, updateUser } = useAuthStore();

  // ✅ Super Admin has no `resident` — that's fine, we just use empty defaults
  const hasResident = !!user?.resident;
  const resident = user?.resident || {};

  const [formData, setFormData] = useState({
    // Resident-only fields (empty if no resident)
    first_name: resident?.first_name || "",
    middle_name: resident?.middle_name || "",
    last_name: resident?.last_name || "",
    suffix_name: resident?.suffix || "",

    // User fields (always present)
    email: user?.email || "",
    phone_number: resident?.phone_number || user?.phone_number || "",
  });

  const [isUpdating, setIsUpdating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      // ✅ Only send first_name/last_name/etc. if the user has a resident.
      //    For Super Admin, send only user-level fields (email, phone).
      const payload: Record<string, any> = {
        email: formData.email,
      };

      if (formData.phone_number) {
        payload.phone_number = formData.phone_number;
      }

      if (hasResident) {
        payload.first_name = formData.first_name;
        payload.middle_name = formData.middle_name || undefined;
        payload.last_name = formData.last_name;
        payload.suffix = formData.suffix_name || undefined;
      }

      console.log("📤 Updating user:", user?.id, payload);

      await api.put(`/web/users/${user?.id}`, payload);

      // ✅ Update the store — preserve existing resident if there was one,
      //    don't invent one if there wasn't.
      updateUser({
        ...user,
        email: formData.email,
        ...(hasResident
          ? {
            resident: {
              ...resident,
              first_name: formData.first_name,
              middle_name: formData.middle_name,
              last_name: formData.last_name,
              suffix: formData.suffix_name,
              phone_number: formData.phone_number,
            },
          }
          : {
            phone_number: formData.phone_number,
          }),
      });

      toast.success("Profile updated successfully!");
      onClose();
    } catch (error: any) {
      console.error("Update error:", error);
      const fieldErrors = error?.response?.data?.errors;
      if (fieldErrors) {
        const first = Object.keys(fieldErrors)[0];
        toast.error(`${first}: ${fieldErrors[first][0]}`);
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to update profile",
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = () => {
    if (hasResident) {
      const f = resident?.first_name?.[0] || "";
      const l = resident?.last_name?.[0] || "";
      return `${f}${l}`.toUpperCase() || "U";
    }
    // Super Admin: use email initial
    return (user?.email?.[0] || "U").toUpperCase();
  };

  const getDisplayName = () => {
    if (hasResident) {
      const n = `${resident?.first_name || ""} ${resident?.last_name || ""}`.trim();
      if (n) return n;
    }
    // Super Admin: use part of email before @
    return user?.email?.split("@")[0] || "User";
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              Account Center
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {/* Profile header */}
          <div className="bg-slate-50/50 px-6 py-6 border-b border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
              <span className="text-2xl font-bold text-blue-600">
                {getInitials()}
              </span>
            </div>
            <div className="flex-1 pt-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                {getDisplayName()}
              </h3>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-2">
                <span
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md uppercase tracking-wider ${user?.account_status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                    }`}
                >
                  {user?.account_status || "active"} Account
                </span>
                <span className="text-[12px] text-slate-500 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Last login:{" "}
                  {user?.last_login_at
                    ? new Date(user.last_login_at).toLocaleString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* No-resident notice */}
          {!hasResident && (
            <div className="mx-6 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">
                  This account has no linked resident profile.
                </p>
                <p className="text-blue-700 mt-0.5">
                  You can still update your email and phone number.
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3">
            {/* Left: Forms */}
            <div className="lg:col-span-2 p-6 sm:p-8 space-y-8 lg:border-r border-slate-200 bg-white">
              {/* Personal Info — only if there's a resident */}
              {hasResident && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-slate-600 mb-1">
                        First Name
                      </label>
                      <input
                        name="first_name"
                        type="text"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-slate-600 mb-1">
                        Middle Name
                      </label>
                      <input
                        name="middle_name"
                        type="text"
                        value={formData.middle_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-slate-600 mb-1">
                        Last Name
                      </label>
                      <input
                        name="last_name"
                        type="text"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-slate-600 mb-1">
                        Suffix
                      </label>
                      <input
                        name="suffix_name"
                        type="text"
                        value={formData.suffix_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contact — always present */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-slate-600 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        name="phone_number"
                        type="text"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Meta */}
            <div className="p-6 sm:p-8 bg-slate-50">
              <h4 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">
                Account Status
              </h4>
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Roles
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {user?.roles && user.roles.length > 0 ? (
                      user.roles.map((r: any) => (
                        <span
                          key={r.id}
                          className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-md"
                        >
                          {r.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No roles</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Date Created
                  </p>
                  <p className="text-[13px] text-slate-700 font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Security
                  </p>
                  <button className="w-full py-2 px-3 text-[12px] text-blue-600 hover:text-blue-700 bg-blue-100/50 hover:bg-blue-100 rounded-md font-semibold transition-colors">
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="flex items-center gap-2 px-6 py-2 text-[13px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}