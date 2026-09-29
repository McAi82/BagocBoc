// resources/js/pages/settings/ProfileSettings.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Save,
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Briefcase,
  RefreshCw,
  Info,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import toast from "react-hot-toast";

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [isSaving, setIsSaving] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasResident = !!user?.resident;

  const [formData, setFormData] = useState({
    // Resident-specific (empty for Super Admin)
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    birth_date: "",
    gender: "",
    civil_status: "",
    address: "",
    occupation: "",
    education_attainment: "",

    // User-level (always present)
    email: "",
    phone_number: "",
  });

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ============================================================
     FETCH USER
     ============================================================ */

  const fetchUserData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await api.get("/web/user");

      let userData =
        response.data?.data || response.data?.user || response.data;
      if (userData?.data) userData = userData.data;
      if (userData?.user) userData = userData.user;

      const resident = userData?.resident || {};

      setFormData({
        first_name: resident?.first_name || "",
        middle_name: resident?.middle_name || "",
        last_name: resident?.last_name || "",
        suffix: resident?.suffix || "",
        birth_date: resident?.birth_date
          ? String(resident.birth_date).split("T")[0]
          : "",
        gender: resident?.gender || "",
        civil_status: resident?.civil_status || "",
        address:
          resident?.place_of_birth || resident?.address || "",
        occupation: resident?.occupation || "",
        education_attainment: resident?.education_attainment || "",
        email: userData?.email || "",
        phone_number: resident?.phone_number || userData?.phone_number || "",
      });

      if (userData) {
        updateUser(userData);
      }
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
      setIsError(true);
      toast.error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================================================
     INPUT HANDLING
     ============================================================ */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  /* ============================================================
     VALIDATION
     ============================================================ */

  const validateProfile = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Resident-specific validation only when applicable
    if (hasResident) {
      if (!formData.first_name.trim())
        newErrors.first_name = "First name is required";
      if (!formData.last_name.trim())
        newErrors.last_name = "Last name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};
    if (!passwordData.current_password)
      newErrors.current_password = "Current password is required";
    if (!passwordData.new_password)
      newErrors.new_password = "New password is required";
    else if (passwordData.new_password.length < 8)
      newErrors.new_password = "Password must be at least 8 characters";
    if (passwordData.new_password !== passwordData.new_password_confirmation) {
      newErrors.new_password_confirmation = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ============================================================
     SAVE PROFILE
     ============================================================ */

  const handleSaveProfile = async () => {
    if (!validateProfile()) {
      toast.error("Please fix the errors below");
      return;
    }

    setIsSaving(true);
    try {
      // Only send resident fields when the user actually has a resident
      const data: Record<string, any> = {
        email: formData.email,
      };

      if (formData.phone_number) {
        data.phone_number = formData.phone_number;
      }

      if (hasResident) {
        Object.assign(data, {
          first_name: formData.first_name,
          middle_name: formData.middle_name || undefined,
          last_name: formData.last_name,
          suffix: formData.suffix || undefined,
          place_of_birth: formData.address || undefined,
          birth_date: formData.birth_date || undefined,
          gender: formData.gender || undefined,
          civil_status: formData.civil_status || undefined,
          occupation: formData.occupation || undefined,
          education_attainment: formData.education_attainment || undefined,
        });
      }

      console.log("📤 Saving profile:", data);

      await api.put(`/web/users/${user?.id}`, data);

      // Update the local store — preserve the existing resident when present
      updateUser({
        ...user,
        email: formData.email,
        ...(hasResident
          ? {
            resident: {
              ...user?.resident,
              first_name: formData.first_name,
              middle_name: formData.middle_name,
              last_name: formData.last_name,
              suffix: formData.suffix,
              phone_number: formData.phone_number,
              birth_date: formData.birth_date,
              gender: formData.gender,
              civil_status: formData.civil_status,
              occupation: formData.occupation,
              education_attainment: formData.education_attainment,
              place_of_birth: formData.address,
            },
          }
          : {
            phone_number: formData.phone_number,
          }),
      });

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      await fetchUserData();
    } catch (error: any) {
      console.error("Update error:", error);
      const fieldErrors = error?.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === "object") {
        const mapped: Record<string, string> = {};
        Object.keys(fieldErrors).forEach((k) => {
          const v = fieldErrors[k];
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(mapped);
        const first = Object.keys(mapped)[0];
        toast.error(`${first}: ${mapped[first]}`);
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to update profile",
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  /* ============================================================
     CHANGE PASSWORD
     ============================================================ */

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      toast.error("Please fix the errors below");
      return;
    }

    setIsSaving(true);
    try {
      await api.put(`/web/users/${user?.id}`, {
        current_password: passwordData.current_password,
        password: passwordData.new_password,
        password_confirmation: passwordData.new_password_confirmation,
      });
      toast.success("Password changed successfully!");
      setPasswordData({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
      setErrors({});
    } catch (error: any) {
      console.error("Password change error:", error);
      const fieldErrors = error?.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === "object") {
        const mapped: Record<string, string> = {};
        Object.keys(fieldErrors).forEach((k) => {
          const v = fieldErrors[k];
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(mapped);
        const first = Object.keys(mapped)[0];
        toast.error(`${mapped[first]}`);
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to change password",
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  /* ============================================================
     HELPERS
     ============================================================ */

  const handleRefresh = () => {
    toast.loading("Refreshing...");
    fetchUserData().then(() => {
      toast.dismiss();
      toast.success("Refreshed!");
    });
  };

  const getDisplayName = () => {
    if (hasResident) {
      const n = `${formData.first_name} ${formData.last_name}`.trim();
      if (n) return n;
    }
    return user?.email?.split("@")[0] || "User";
  };

  const getInitials = () => {
    if (hasResident) {
      const f = formData.first_name?.[0] || "";
      const l = formData.last_name?.[0] || "";
      const initials = `${f}${l}`.toUpperCase();
      if (initials) return initials;
    }
    return (user?.email?.[0] || "U").toUpperCase();
  };

  /* ============================================================
     LOADING / ERROR STATES
     ============================================================ */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-theme-text">
            Failed to Load Profile
          </h3>
          <p className="text-sm text-theme-textSecondary mt-2">
            There was an error loading your profile data.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ============================================================
     MAIN RENDER
     ============================================================ */

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            Profile Settings
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Manage your account information and security
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
        >
          <RefreshCw className="w-4 h-4 text-theme-textSecondary" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-theme">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "profile"
            ? "border-theme-primary text-theme-primary"
            : "border-transparent text-theme-textSecondary hover:text-theme-text"
            }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          Profile Information
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "security"
            ? "border-theme-primary text-theme-primary"
            : "border-transparent text-theme-textSecondary hover:text-theme-text"
            }`}
        >
          <Lock className="w-4 h-4 inline mr-2" />
          Security
        </button>
      </div>

      {/* ============================================ */}
      {/* PROFILE TAB */}
      {/* ============================================ */}
      {activeTab === "profile" && (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-theme-primary to-theme-secondary px-6 py-8 text-white">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30">
                <span className="text-2xl font-bold text-white">
                  {getInitials()}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{getDisplayName()}</h2>
                <p className="text-blue-100">{formData.email || "No email"}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${user?.account_status === "active"
                      ? "bg-green-500/30 text-green-100"
                      : "bg-red-500/30 text-red-100"
                      }`}
                  >
                    {user?.account_status === "active" ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {user?.account_status || "Active"}
                  </span>
                  <span className="text-xs text-blue-200">
                    {user?.roles?.map((r: any) => r.name).join(", ") || "User"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h3 className="text-lg font-semibold text-theme-text">
                Personal Information
              </h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      fetchUserData();
                    }}
                    className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* No-resident notice */}
            {!hasResident && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium">
                    This account has no linked resident profile.
                  </p>
                  <p className="mt-0.5 text-blue-700 dark:text-blue-400">
                    You can still update your email and phone number. Resident
                    fields are hidden because they don't apply.
                  </p>
                </div>
              </div>
            )}

            {/* Resident fields — only if there's a resident */}
            {hasResident && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                        ? "border-theme"
                        : "border-theme bg-theme-background cursor-not-allowed"
                        } ${errors.first_name ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.first_name && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.first_name}
                    </p>
                  )}
                </div>

                {/* Middle Name */}
                <div>
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                      ? "border-theme"
                      : "border-theme bg-theme-background cursor-not-allowed"
                      }`}
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                      ? "border-theme"
                      : "border-theme bg-theme-background cursor-not-allowed"
                      } ${errors.last_name ? "border-red-500" : ""}`}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.last_name}
                    </p>
                  )}
                </div>

                {/* Suffix */}
                <div>
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                    Suffix
                  </label>
                  <input
                    type="text"
                    name="suffix"
                    value={formData.suffix}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Jr., Sr., III"
                    className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                      ? "border-theme"
                      : "border-theme bg-theme-background cursor-not-allowed"
                      }`}
                  />
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                    Birth Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                        ? "border-theme"
                        : "border-theme bg-theme-background cursor-not-allowed"
                        }`}
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                      ? "border-theme"
                      : "border-theme bg-theme-background cursor-not-allowed"
                      }`}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                {/* Civil Status */}
                <div>
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                    Civil Status
                  </label>
                  <select
                    name="civil_status"
                    value={formData.civil_status}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                      ? "border-theme"
                      : "border-theme bg-theme-background cursor-not-allowed"
                      }`}
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widow">Widow</option>
                    <option value="Legally Separated">Legally Separated</option>
                  </select>
                </div>

                {/* Occupation */}
                <div>
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                    Occupation
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                    <input
                      type="text"
                      name="occupation"
                      value={formData.occupation}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                        ? "border-theme"
                        : "border-theme bg-theme-background cursor-not-allowed"
                        }`}
                    />
                  </div>
                </div>

                {/* Education */}
                <div>
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                    Education Attainment
                  </label>
                  <input
                    type="text"
                    name="education_attainment"
                    value={formData.education_attainment}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                      ? "border-theme"
                      : "border-theme bg-theme-background cursor-not-allowed"
                      }`}
                  />
                </div>

                {/* Address / Place of Birth */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                    Place of Birth / Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-theme-textSecondary" />
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      disabled={!isEditing}
                      rows={2}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                        ? "border-theme"
                        : "border-theme bg-theme-background cursor-not-allowed"
                        }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Contact — always present */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                      ? "border-theme"
                      : "border-theme bg-theme-background cursor-not-allowed"
                      } ${errors.email ? "border-red-500" : ""}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                  <input
                    type="text"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="09XXXXXXXXX"
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditing
                      ? "border-theme"
                      : "border-theme bg-theme-background cursor-not-allowed"
                      }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECURITY TAB */}
      {/* ============================================ */}
      {activeTab === "security" && (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-theme">
            <h3 className="text-lg font-semibold text-theme-text flex items-center gap-2">
              <Shield className="w-5 h-5 text-theme-primary" />
              Change Password
            </h3>
            <p className="text-sm text-theme-textSecondary mt-1">
              Update your password to keep your account secure
            </p>
          </div>

          <div className="p-6 max-w-md">
            {/* Current Password */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-theme-text mb-1">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-12 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.current_password ? "border-red-500" : "border-theme"
                    }`}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.current_password && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.current_password}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-theme-text mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-12 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.new_password ? "border-red-500" : "border-theme"
                    }`}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.new_password && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.new_password}
                </p>
              )}
              <p className="text-xs text-theme-textSecondary mt-1">
                Password must be at least 8 characters long
              </p>
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-theme-text mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="new_password_confirmation"
                  value={passwordData.new_password_confirmation}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-12 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.new_password_confirmation
                    ? "border-red-500"
                    : "border-theme"
                    }`}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.new_password_confirmation && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.new_password_confirmation}
                </p>
              )}
            </div>

            <button
              onClick={handleChangePassword}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" /> Update Password
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}