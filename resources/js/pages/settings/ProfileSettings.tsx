// resources/js/pages/settings/ProfileSettings.tsx

import React, { useState, useEffect, useRef } from "react";
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
  Camera,
  Upload,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import toast from "react-hot-toast";

// ============================================
// CONSTANTS
// ============================================

const MAX_PHOTO_SIZE = 4 * 1024 * 1024; // 4 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [isSaving, setIsSaving] = useState(false);

  // ✅ Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ Change-password flow state
  const [securityStep, setSecurityStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const [otpRequestedAt, setOtpRequestedAt] = useState<Date | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const hasResident = !!user?.resident;

  const [formData, setFormData] = useState({
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
     RESEND COOLDOWN TICKER
     ============================================================ */
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

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
        address: resident?.place_of_birth || resident?.address || "",
        occupation: resident?.occupation || "",
        education_attainment: resident?.education_attainment || "",
        email: userData?.email || "",
        phone_number: resident?.phone_number || userData?.phone_number || "",
      });

      setPhotoPreview(userData?.profile_photo_url || null);
      setPhotoFile(null);
      setRemovePhoto(false);

      if (userData) updateUser(userData);
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
     PHOTO PICKER
     ============================================================ */
  const handlePhotoClick = () => fileInputRef.current?.click();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, or WEBP images are allowed");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error("Image must be smaller than 4 MB");
      return;
    }

    setPhotoFile(file);
    setRemovePhoto(false);

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) return;
    setIsUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("profile_photo", photoFile);
      form.append("_method", "PUT");

      const res = await api.post(`/web/users/${user?.id}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res.data?.data;
      if (updated) {
        updateUser({ ...user, ...updated });
        setPhotoPreview(updated.profile_photo_url || null);
        setPhotoFile(null);
      }
      toast.success("Profile photo updated!");
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast.error(err?.response?.data?.message || "Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  /* ============================================================
     FORM HANDLERS
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
      const data: Record<string, any> = { email: formData.email };
      if (formData.phone_number) data.phone_number = formData.phone_number;

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

      if (removePhoto) data.remove_photo = true;

      await api.put(`/web/users/${user?.id}`, data);

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
          : { phone_number: formData.phone_number }),
        ...(removePhoto ? { profile_photo_url: null } : {}),
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
     CHANGE PASSWORD — STEP 1: Request OTP
     ============================================================ */
  const handleRequestOtp = async () => {
    if (!validatePassword()) {
      toast.error("Please fix the errors below");
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post("/web/auth/change-password/request-otp", {
        current_password: passwordData.current_password,
      });

      const data = res.data?.data || {};
      if (data.dev_otp) setDevOtp(String(data.dev_otp));

      setSecurityStep("otp");
      setOtpCode("");
      setOtpRequestedAt(new Date());
      setResendCooldown(60);
      toast.success("OTP sent to your email address.");
    } catch (err: any) {
      console.error("Request OTP error:", err);
      const fieldErrors = err?.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === "object") {
        const mapped: Record<string, string> = {};
        Object.keys(fieldErrors).forEach((k) => {
          const v = fieldErrors[k];
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(mapped);
        toast.error(mapped.current_password || "Please fix the errors below");
      } else {
        toast.error(
          err?.response?.data?.message ||
          "Failed to send OTP. Please try again.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  /* ============================================================
     CHANGE PASSWORD — STEP 2: Confirm OTP + change
     ============================================================ */
  const handleConfirmChange = async () => {
    if (otpCode.length !== 6) {
      toast.error("Enter the 6-digit OTP.");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/web/auth/change-password", {
        current_password: passwordData.current_password,
        password: passwordData.new_password,
        password_confirmation: passwordData.new_password_confirmation,
        otp: otpCode,
      });

      toast.success("Password changed. Please log in again.");

      setPasswordData({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
      setOtpCode("");
      setSecurityStep("form");
      setDevOtp(null);
      setErrors({});

      // Backend invalidated all tokens → force logout
      setTimeout(() => {
        logout();
        navigate("/login", { replace: true });
      }, 900);
    } catch (err: any) {
      console.error("Change password error:", err);
      const fieldErrors = err?.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === "object") {
        const mapped: Record<string, string> = {};
        Object.keys(fieldErrors).forEach((k) => {
          const v = fieldErrors[k];
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(mapped);
        toast.error(Object.values(mapped)[0] || "Please fix the errors below");
      } else {
        toast.error(
          err?.response?.data?.message || "Failed to change password.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelOtp = () => {
    setSecurityStep("form");
    setOtpCode("");
    setDevOtp(null);
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
     LOADING / ERROR
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
          {/* Header band with avatar */}
          <div className="bg-gradient-to-r from-theme-primary to-theme-secondary px-6 py-8 text-white">
            <div className="flex items-center gap-6 flex-wrap">
              {/* Avatar with hover overlay */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30 overflow-hidden">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {getInitials()}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePhotoClick}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  title="Change photo"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1 min-w-0">
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

                {/* Photo actions */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handlePhotoClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-lg text-xs font-medium transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Choose Photo
                  </button>

                  {photoPreview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/50 backdrop-blur-sm rounded-lg text-xs font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}

                  {photoFile && (
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={isUploadingPhoto}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-theme-primary hover:bg-blue-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Save Photo
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-blue-200 mt-2">
                  JPG, PNG or WEBP · Max 4 MB
                </p>
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

            {!hasResident && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium">
                    This account has no linked resident profile.
                  </p>
                  <p className="mt-0.5 text-blue-700 dark:text-blue-400">
                    You can still update your email, phone number, and profile
                    photo.
                  </p>
                </div>
              </div>
            )}

            {hasResident && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          {/* Header + step indicator */}
          <div className="px-6 py-4 border-b border-theme flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-theme-text flex items-center gap-2">
                <Shield className="w-5 h-5 text-theme-primary" />
                Change Password
              </h3>
              <p className="text-sm text-theme-textSecondary mt-1">
                {securityStep === "form"
                  ? "Verify your current password, then we'll email you a one-time code."
                  : "Enter the 6-digit code we sent to your email address."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${securityStep === "form"
                    ? "bg-theme-primary text-white"
                    : "bg-green-500 text-white"
                  }`}
              >
                {securityStep === "form" ? "1" : "✓"}
              </span>
              <span className="w-6 h-0.5 bg-theme-border" />
              <span
                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${securityStep === "otp"
                    ? "bg-theme-primary text-white"
                    : "bg-theme-background text-theme-textSecondary"
                  }`}
              >
                2
              </span>
            </div>
          </div>

          {/* STEP 1 — Form */}
          {securityStep === "form" && (
            <div className="p-6 max-w-md">
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
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowCurrentPassword(!showCurrentPassword)
                    }
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
                    autoComplete="new-password"
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
                    autoComplete="new-password"
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
                onClick={handleRequestOtp}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" /> Send Verification Code
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2 — OTP */}
          {securityStep === "otp" && (
            <div className="p-6 max-w-md">
              <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium">
                    We sent a 6-digit code to your email.
                  </p>
                  <p className="mt-0.5 text-blue-700 dark:text-blue-400">
                    {otpRequestedAt
                      ? `Sent at ${otpRequestedAt.toLocaleTimeString()}. The code expires in 5 minutes.`
                      : "The code expires in 5 minutes."}
                  </p>
                </div>
              </div>

              {/* {devOtp && (
                <div className="mb-5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    🔑 <strong>Dev OTP:</strong>{" "}
                    <span className="font-mono font-bold">{devOtp}</span>
                  </p>
                </div>
              )} */}

              <div className="mb-4">
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Verification Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && otpCode.length === 6) {
                        handleConfirmChange();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-theme rounded-lg bg-theme-surface text-theme-text text-center text-2xl font-bold tracking-[0.5em] focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                    placeholder="••••••"
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>
                <p className="text-xs text-theme-textSecondary mt-2">
                  Didn't get it?{" "}
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isSaving || resendCooldown > 0}
                    className={`font-medium underline-offset-4 hover:underline ${resendCooldown > 0 || isSaving
                        ? "text-theme-textSecondary cursor-not-allowed"
                        : "text-theme-primary"
                      }`}
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend code"}
                  </button>
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCancelOtp}
                  disabled={isSaving}
                  className="px-5 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmChange}
                  disabled={isSaving || otpCode.length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" /> Confirm Change
                    </>
                  )}
                </button>
              </div>

              <p className="mt-4 text-xs text-theme-textSecondary">
                After changing your password, all active sessions will be signed
                out. You'll need to log in again.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}