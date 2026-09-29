// pages/auth/CreateNewPassword.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, CheckCircle } from "lucide-react";
import { api } from "../../api/apiClient";
import toast from "react-hot-toast";
import logo from "../../assets/barangay-logo.png";

const STRENGTH_META = [
  { label: "Weak", color: "#C1683A" },
  { label: "Weak", color: "#C1683A" },
  { label: "Fair", color: "#E0A72E" },
  { label: "Good", color: "#2C6E8E" },
  { label: "Strong", color: "#245234" },
];

export default function CreateNewPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const userId = sessionStorage.getItem("reset_user_id") || sessionStorage.getItem("otp_user_id");

  const getPasswordStrength = (pass: string): number => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthMeta = STRENGTH_META[Math.min(strength, 4)];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!userId) {
      setError("Session expired. Please request OTP again.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/web/reset-password", {
        user_id: parseInt(userId),
        password: password,
        password_confirmation: confirmPassword,
      });
      
      setIsSuccess(true);
      toast.success("Password updated successfully!");
      
      // Clear session storage
      sessionStorage.removeItem("reset_user_id");
      sessionStorage.removeItem("otp_user_id");
      sessionStorage.removeItem("otp_purpose");
      sessionStorage.removeItem("otp_email");
      sessionStorage.removeItem("dev_otp");
      
      // Navigate to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      
    } catch (error: any) {
      setError(error?.response?.data?.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F7F5EC] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-[#1E3A2A]/10 border border-[#E7E2D3] p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-[#1B2A20]">Password Updated!</h2>
          <p className="text-sm text-stone-500 mt-2">
            Your password has been successfully updated.
          </p>
          <p className="text-sm text-stone-400 mt-1">
            Redirecting to login...
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-6 px-6 py-2 bg-[#245234] text-white rounded-lg hover:bg-[#1B3F27] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5EC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-[#1E3A2A]/10 border border-[#E7E2D3] p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-stone-500 hover:text-[#245234] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4">
            <img
              src={logo}
              alt="Barangay Bagocboc Seal"
              className="w-20 h-20 object-contain mx-auto"
            />
          </div>
          <h2 className="text-2xl font-semibold text-[#1B2A20] tracking-tight">
            Create New Password
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Enter a strong password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="w-full pl-10 pr-12 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#245234] focus:border-transparent outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Password Strength */}
            {password && (
              <div className="mt-3">
                <div className="flex gap-1 h-1.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className="flex-1 rounded-full transition-all"
                      style={{
                        backgroundColor:
                          strength >= level ? strengthMeta.color : "#E7E4DA",
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Strength:{" "}
                  <span
                    className="font-medium"
                    style={{ color: strengthMeta.color }}
                  >
                    {strengthMeta.label}
                  </span>
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                className="w-full pl-10 pr-12 py-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#245234] focus:border-transparent outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#245234] text-white font-semibold rounded-xl hover:bg-[#1B3F27] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-stone-100 flex items-center justify-center gap-2 text-xs text-stone-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Encrypted Connection</span>
        </div>
      </div>
    </div>
  );
}