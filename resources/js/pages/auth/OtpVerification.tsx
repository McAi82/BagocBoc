// pages/auth/OtpVerification.tsx

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Loader2, Mail, Clock, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";
import toast from "react-hot-toast";
import logo from "../../assets/barangay-logo.png";

export default function OtpVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState<string>("is_first_login");
  const [devOtp, setDevOtp] = useState<string>("");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Get data from location state or session storage
    const state = location.state || {};
    const storedUserId = state.userId || sessionStorage.getItem("otp_user_id");
    const storedPurpose = state.purpose || sessionStorage.getItem("otp_purpose") || "is_first_login";
    const storedEmail = state.email || sessionStorage.getItem("otp_email") || "";
    const storedDevOtp = state.devOtp || sessionStorage.getItem("dev_otp") || "";

    console.log("📧 OTP Page - userId:", storedUserId, "purpose:", storedPurpose, "email:", storedEmail);

    if (storedUserId) {
      setUserId(parseInt(storedUserId));
      setPurpose(storedPurpose);
      setEmail(storedEmail);
      setDevOtp(storedDevOtp);
      
      // If dev OTP is available, auto-fill for testing
      if (storedDevOtp && storedDevOtp.length === 6) {
        console.log("🔑 Auto-filling dev OTP:", storedDevOtp);
        const digits = storedDevOtp.split("");
        const newOtp = [...otp];
        digits.forEach((digit, index) => {
          if (index < 6) newOtp[index] = digit;
        });
        setOtp(newOtp);
      }
    } else {
      toast.error("Session expired. Please login again.");
      navigate("/login");
    }
  }, [location]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split("");
    while (newOtp.length < 6) newOtp.push("");
    setOtp(newOtp);
    setError("");

    const nextIndex = Math.min(pastedData.length, 5);
    inputsRef.current[nextIndex]?.focus();
  };

  const handleSubmit = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    if (!userId) {
      setError("Session expired. Please login again.");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔑 Verifying OTP for user:", userId, "purpose:", purpose);
      
      const response = await api.post("/web/verify-otp", {
        user_id: userId,
        otp: code,
        purpose: purpose,
      });

      console.log("📦 OTP verification response:", response.data);

      const data = response.data;

      // ✅ Check if this is for password reset
      if (data.status === "success" && data.data?.user_id && purpose === "password_reset") {
        sessionStorage.setItem("reset_user_id", String(data.data.user_id));
        sessionStorage.removeItem("otp_user_id");
        sessionStorage.removeItem("otp_purpose");
        sessionStorage.removeItem("otp_email");
        sessionStorage.removeItem("dev_otp");
        navigate("/create-password");
        toast.success("OTP verified! Please set a new password.");
        return;
      }

      // ✅ Normal login flow - check for token
      const responseData = data.data || data;
      const token = responseData.token || data.token;
      const user = responseData.user || data.user;

      if (token && user) {
        console.log("✅ Login successful, storing user and token");
        login(user, token);
        sessionStorage.removeItem("otp_user_id");
        sessionStorage.removeItem("otp_purpose");
        sessionStorage.removeItem("otp_email");
        sessionStorage.removeItem("dev_otp");
        navigate("/barangay-bagocboc", { replace: true });
        toast.success("Login successful!");
      } else {
        // Check if there's a message from the server
        const message = data.message || responseData.message || "OTP verification failed";
        toast.error(message);
        setError(message);
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      const message = error?.response?.data?.message || "Invalid OTP. Please try again.";
      toast.error(message);
      setError(message);
      
      // If OTP is invalid, clear the input for retry
      if (message.includes("Invalid OTP")) {
        setOtp(["", "", "", "", "", ""]);
        inputsRef.current[0]?.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0) return;
    if (!userId) {
      toast.error("User ID not found. Please login again.");
      return;
    }

    setIsResending(true);
    try {
      const response = await api.post("/web/check-email", {
        email: email,
        purpose: purpose,
      });

      console.log("📦 Resend OTP response:", response.data);

      if (response.data?.data?.dev_otp) {
        const newDevOtp = response.data.data.dev_otp;
        console.log("📧 New Dev OTP:", newDevOtp);
        sessionStorage.setItem("dev_otp", String(newDevOtp));
        setDevOtp(String(newDevOtp));
        
        // Auto-fill for testing
        if (newDevOtp && newDevOtp.length === 6) {
          const digits = newDevOtp.split("");
          const newOtp = [...otp];
          digits.forEach((digit, index) => {
            if (index < 6) newOtp[index] = digit;
          });
          setOtp(newOtp);
        }
      }
      
      setTimeLeft(300);
      setOtp(["", "", "", "", "", ""]);
      setError("");
      toast.success("New OTP sent to your email!");
      inputsRef.current[0]?.focus();
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      toast.error(error?.response?.data?.message || "Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#F7F5EC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-[#1E3A2A]/10 border border-[#E7E2D3] p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4">
            <img
              src={logo}
              alt="Barangay Bagocboc Seal"
              className="w-20 h-20 object-contain mx-auto"
            />
          </div>
          <h2 className="text-2xl font-semibold text-[#1B2A20] tracking-tight">
            OTP Verification
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Enter the 6-digit code sent to your email
          </p>
          {email && (
            <p className="text-xs text-[#2C6E8E] mt-2 flex items-center justify-center gap-1">
              <Mail className="w-3 h-3" />
              {email}
            </p>
          )}
          <div className="mt-2">
            <span className="text-xs px-2 py-1 bg-[#E8F0E9] text-[#245234] rounded-full">
              {purpose === 'password_reset' ? 'Password Reset' : 'Login Verification'}
            </span>
          </div>
          {devOtp && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                🔑 Dev OTP: <span className="font-mono font-bold">{devOtp}</span>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* OTP Inputs */}
          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-xl font-bold border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E0A72E] focus:border-transparent transition"
                disabled={isLoading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Timer & Resend */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
              <Clock className="w-4 h-4" />
              <span>
                {timeLeft > 0 ? (
                  <>
                    Code expires in{" "}
                    <span className="text-[#245234] font-bold">
                      {formatTime(timeLeft)}
                    </span>
                  </>
                ) : (
                  <span className="text-[#C1683A] font-bold">Code expired</span>
                )}
              </span>
            </div>

            <button
              onClick={handleResend}
              disabled={timeLeft > 0 || isResending}
              className={`text-sm font-medium transition-colors ${
                timeLeft > 0 || isResending
                  ? "text-stone-300 cursor-not-allowed"
                  : "text-[#2C6E8E] hover:text-[#245234]"
              }`}
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 inline animate-spin mr-1" />
                  Sending...
                </>
              ) : (
                "Didn't receive the code? Resend"
              )}
            </button>
          </div>

          {/* Verify Button */}
          <button
            onClick={handleSubmit}
            disabled={otp.join("").length < 6 || isLoading}
            className="w-full py-3 bg-[#245234] text-white font-semibold rounded-xl hover:bg-[#1B3F27] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Proceed"
            )}
          </button>

          {/* Back to Login */}
          <div className="text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              ← Back to Login
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-center gap-2 text-xs text-stone-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure Verification</span>
        </div>
      </div>
    </div>
  );
}