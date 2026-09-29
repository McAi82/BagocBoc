// pages/auth/Login.tsx

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ChevronDown,
  Loader2,
  LogIn,
  MapPin,
  Check,
  AlertCircle,
  ShieldCheck,
  Monitor,
  X,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { api } from "../../api/apiClient";
import toast from "react-hot-toast";
import logo from "../../assets/barangay-logo.png";

// Web accessible accounts only
const DEMO_ACCOUNTS = [
  {
    email: "superadmin@gmail.com",
    password: "password",
    role: "Super Admin",
    description: "Full system access",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    email: "captain@gmail.com",
    password: "password",
    role: "Barangay Captain",
    description: "Barangay Captain access",
    color: "text-[#2C6E8E]",
    bg: "bg-[#EAF3F7]",
  },
  {
    email: "secretary@gmail.com",
    password: "password",
    role: "Barangay Secretary",
    description: "Records & documents",
    color: "text-[#245234]",
    bg: "bg-[#E8F0E9]",
  },
  {
    email: "frontdesk@gmail.com",
    password: "password",
    role: "Front Desk Clerk",
    description: "Front desk services",
    color: "text-[#B9841D]",
    bg: "bg-[#FBEFD4]",
  },
  {
    email: "treasurer@gmail.com",
    password: "password",
    role: "Barangay Treasurer",
    description: "Financial management",
    color: "text-[#B1552E]",
    bg: "bg-[#F5E5DA]",
  },
  {
    email: "bns@gmail.com",
    password: "password",
    role: "Barangay Nutrition Scholar",
    description: "Nutrition and health records",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    email: "midwife@gmail.com",
    password: "password",
    role: "Midwife",
    description: "Health records management",
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    email: "ndp@gmail.com",
    password: "password",
    role: "Nurse Deployment Program",
    description: "Health records management",
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
];

/* ------------------------------------------------------------------ */
/* Rolling-hills backdrop (echoes the farmland in the barangay seal)   */
/* Each layer is a repeating wave. Its period divides 600 so that      */
/* translating the 200%-wide SVG by -50% loops with no visible seam.   */
/* ------------------------------------------------------------------ */
const wave = (period: number, amp: number, base: number) => {
  const half = period / 2;
  let d = `M0 ${base} Q ${period / 4} ${base - amp} ${half} ${base}`;
  for (let x = period; x <= 1200; x += half) d += ` T ${x} ${base}`;
  return `${d} V220 H0 Z`;
};

const HILL_LAYERS = [
  { d: wave(600, 70, 110), fill: "rgba(74,128,90,0.30)", seconds: 90 },
  { d: wave(300, -46, 138), fill: "rgba(36,82,52,0.55)", seconds: 62 },
  { d: wave(600, 52, 168), fill: "rgba(14,30,21,0.85)", seconds: 42 },
];

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap');

.bl-root { font-family: 'Figtree', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; color-scheme: light; }
.bl-serif { font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif; }

/* Keep inputs light even when the browser is in dark mode or autofills */
.bl-input:-webkit-autofill,
.bl-input:-webkit-autofill:hover,
.bl-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #ffffff inset;
  -webkit-text-fill-color: #1B2A20;
  caret-color: #1B2A20;
  transition: background-color 9999s ease-out 0s;
}

@keyframes bl-rise   { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes bl-card   { from { opacity: 0; transform: translateY(26px) scale(.985); } to { opacity: 1; transform: none; } }
@keyframes bl-seal   { from { opacity: 0; transform: scale(.82); } to { opacity: 1; transform: none; } }
@keyframes bl-halo   { 0% { opacity: .55; transform: scale(1); } 100% { opacity: 0; transform: scale(1.75); } }
@keyframes bl-drift  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes bl-sun    { 0%,100% { opacity: .22; transform: translateX(-50%) scale(1); } 50% { opacity: .34; transform: translateX(-50%) scale(1.08); } }
@keyframes bl-pop    { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes bl-modal  { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes bl-fade   { from { opacity: 0; } to { opacity: 1; } }
@keyframes bl-shake  { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(2px); } }
@keyframes bl-draw   { to { stroke-dashoffset: 0; } }
@keyframes bl-ping   { 0% { transform: scale(.6); opacity: .5; } 100% { transform: scale(1.5); opacity: 0; } }

/* Entrances use "backwards" fill so they never fight hover transforms afterwards */
.bl-in     { animation: bl-rise .65s cubic-bezier(.22,1,.36,1) backwards; }
.bl-card   { animation: bl-card .85s cubic-bezier(.22,1,.36,1) backwards; }
.bl-seal   { animation: bl-seal 1s cubic-bezier(.22,1,.36,1) .3s backwards; }
.bl-halo   { animation: bl-halo 4.5s cubic-bezier(.2,.6,.3,1) infinite; }
.bl-drift  { animation: bl-drift linear infinite; }
.bl-sun    { animation: bl-sun 9s ease-in-out infinite; }
.bl-pop    { animation: bl-pop .2s cubic-bezier(.22,1,.36,1); transform-origin: top; }
.bl-item   { animation: bl-rise .35s cubic-bezier(.22,1,.36,1) backwards; }
.bl-modal  { animation: bl-modal .28s cubic-bezier(.22,1,.36,1); }
.bl-fade   { animation: bl-fade .2s ease-out; }
.bl-shake  { animation: bl-shake .45s ease-in-out; }
.bl-check path { stroke-dasharray: 26; stroke-dashoffset: 26; animation: bl-draw .5s .2s ease-out forwards; }
.bl-ping   { animation: bl-ping 1.6s ease-out .5s 2; }

/* Sign-in button: light sweep on hover */
.bl-btn { position: relative; overflow: hidden; }
.bl-btn::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,.22) 50%, transparent 70%);
  transform: translateX(-120%);
}
.bl-btn:hover:not(:disabled)::after { transform: translateX(120%); transition: transform .8s ease; }

@media (prefers-reduced-motion: reduce) {
  .bl-root *, .bl-root *::before, .bl-root *::after {
    animation-duration: .01ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
  .bl-drift, .bl-sun, .bl-halo, .bl-ping { animation: none !important; }
}
`;

const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

const inputBase =
  "bl-input w-full h-12 pl-11 rounded-xl border bg-white text-[15px] text-[#1B2A20] placeholder:text-stone-400 outline-none transition-[border-color,box-shadow] duration-200 hover:border-stone-400 focus:ring-4";
const inputOk =
  "border-stone-300 focus:border-[#245234] focus:ring-[#245234]/[0.15]";
const inputBad =
  "border-red-400 focus:border-red-500 focus:ring-red-500/[0.15]";
const iconBase =
  "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-stone-400 transition-colors duration-200 group-focus-within:text-[#245234]";

export default function Login() {
  const navigate = useNavigate();
  const { token, isAuthenticated, login } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{
    general?: string;
    email?: string;
    password?: string;
  }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load saved email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail) {
      setForm((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDemoDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape closes the modal first, then the dropdown
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showForgotPassword) {
        setShowForgotPassword(false);
        setForgotSuccess(false);
        setForgotEmail("");
      } else {
        setShowDemoDropdown(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showForgotPassword]);

  // Redirect if already authenticated
  useEffect(() => {
    if (token && isAuthenticated) {
      navigate("/barangay-bagocboc", { replace: true });
    }
  }, [token, isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "", general: "" }));
  };

  const handleDemoSelect = (account: {
    email: string;
    password: string;
    role: string;
  }) => {
    setForm({ email: account.email, password: account.password });
    setShowDemoDropdown(false);
    setErrors({});
    toast.success(`Selected ${account.role} account`);
  };

  const openForgotPassword = () => {
    setForgotEmail(form.email);
    setShowForgotPassword(true);
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotSuccess(false);
    setForgotEmail("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors: typeof errors = {};
    if (!form.email.trim()) fieldErrors.email = "Enter your email address.";
    if (!form.password) fieldErrors.password = "Enter your password.";
    if (fieldErrors.email || fieldErrors.password) {
      setErrors(fieldErrors);
      document.getElementById(fieldErrors.email ? "email" : "password")?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/web/login", {
        email: form.email,
        password: form.password,
      });

      const data = response.data;

      // Save email if Remember Me is checked
      if (rememberMe) {
        localStorage.setItem("remembered_email", form.email);
      } else {
        localStorage.removeItem("remembered_email");
      }

      // Check if OTP is required
      if (data.status === "otp_required" || data.data?.requires_otp) {
        const responseData = data.data || data;
        const userId = responseData.user_id;
        const purpose = responseData.purpose || "is_first_login";
        const email = responseData.email || form.email;
        const devOtp = responseData.dev_otp;

        if (userId) {
          sessionStorage.setItem("otp_user_id", String(userId));
          sessionStorage.setItem("otp_purpose", purpose);
          sessionStorage.setItem("otp_email", email);
          if (devOtp) {
            sessionStorage.setItem("dev_otp", String(devOtp));
          }
          navigate("/otp", {
            state: { purpose, email, userId, devOtp },
          });
          toast.success("OTP sent to your email address!");
        } else {
          toast.error("Unable to verify OTP status. Please try again.");
        }
        return;
      }

      // Normal login flow
      const userData = data.data || data;
      const token = userData.token || data.token;
      const user = userData.user || data.user;

      if (token && user) {
        login(user, token);
        navigate("/barangay-bagocboc", { replace: true });
        toast.success("Login successful!");
      } else {
        if (data.message) {
          // react-hot-toast has no toast.info(), so use the base toast()
          toast(data.message);
        } else {
          toast.error("Login failed. Please try again.");
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Login failed. Please check your credentials.";
      toast.error(message);
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setIsForgotLoading(true);
    setForgotSuccess(false);

    try {
      const response = await api.post("/web/check-email", {
        email: forgotEmail,
        purpose: "password_reset",
      });

      if (response.data?.data?.user_id) {
        const userId = response.data.data.user_id;
        const devOtp = response.data.data.dev_otp;

        sessionStorage.setItem("otp_user_id", String(userId));
        sessionStorage.setItem("otp_purpose", "password_reset");
        sessionStorage.setItem("otp_email", forgotEmail);
        if (devOtp) {
          sessionStorage.setItem("dev_otp", String(devOtp));
        }

        setForgotSuccess(true);
        toast.success("OTP sent to your email address!");

        // Navigate to OTP page shortly after
        setTimeout(() => {
          navigate("/otp", {
            state: {
              purpose: "password_reset",
              email: forgotEmail,
              userId,
              devOtp,
            },
          });
        }, 1500);
      } else {
        toast.error(response.data?.message || "Email not found");
      }
    } catch (error: any) {
      console.error("Forgot password error:", error);
      const message =
        error?.response?.data?.message ||
        "Failed to send OTP. Please try again.";
      toast.error(message);
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="bl-root relative min-h-screen bg-[#F7F5EC] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <style>{STYLES}</style>

      {/* Soft page atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 12% 0%, rgba(36,82,52,0.10), transparent 70%), radial-gradient(50% 45% at 100% 100%, rgba(224,167,46,0.16), transparent 70%)",
        }}
      />

      <div className="bl-card relative w-full max-w-[1040px] bg-white rounded-[28px] border border-[#E7E2D3] grid grid-cols-1 lg:grid-cols-2 overflow-hidden shadow-[0_34px_80px_-32px_rgba(18,36,26,0.45),0_2px_8px_rgba(18,36,26,0.06)]">
        {/* ---------------- Left: branding ---------------- */}
        <div
          className="hidden lg:flex flex-col items-center relative overflow-hidden text-white min-h-[640px]"
          style={{
            background: "linear-gradient(165deg, #2A5236 0%, #17311F 55%, #0F2017 100%)",
          }}
        >
          {/* Furrow lines, like the fields on the seal */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 18px)",
            }}
          />
          {/* Rising sun glow */}
          <div
            aria-hidden
            className="bl-sun absolute -top-20 left-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none"
            style={{ background: "#E0A72E" }}
          />

          {/* Rolling hills */}
          <div
            aria-hidden
            className="absolute bottom-0 left-0 right-0 h-56 overflow-hidden pointer-events-none"
          >
            {HILL_LAYERS.map((layer, i) => (
              <svg
                key={i}
                className="bl-drift absolute bottom-0 left-0 h-full"
                style={{ width: "200%", animationDuration: `${layer.seconds}s` }}
                viewBox="0 0 1200 220"
                preserveAspectRatio="none"
              >
                <path d={layer.d} fill={layer.fill} />
              </svg>
            ))}
          </div>

          {/* Seal + name */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-12 pt-12 pb-4 text-center">
            <div className="relative w-40 h-40 mb-8">
              <span
                aria-hidden
                className="bl-halo absolute inset-0 rounded-full border border-[#E0A72E]/60"
              />
              <span
                aria-hidden
                className="bl-halo absolute inset-0 rounded-full border border-[#E0A72E]/60"
                style={{ animationDelay: "2.25s" }}
              />
              <div className="bl-seal relative w-full h-full rounded-full bg-white ring-[6px] ring-white/15 shadow-2xl shadow-black/40 overflow-hidden">
                <img
                  src={logo}
                  alt="Barangay Bagocboc Seal"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h1
              className="bl-serif bl-in text-[40px] leading-[1.1] font-semibold tracking-tight"
              style={delay(450)}
            >
              Barangay Bagocboc
            </h1>
            <p
              className="bl-in mt-2 text-lg text-[#E9B94A] font-medium tracking-wide"
              style={delay(560)}
            >
              Management System
            </p>
            <div
              className="bl-in mt-8 flex items-center gap-2 text-white/70 text-sm"
              style={delay(670)}
            >
              <MapPin className="w-4 h-4" />
              <span>Opol, Misamis Oriental</span>
            </div>
          </div>

          <div
            className="bl-in relative z-10 pb-7 text-center text-white/55 text-xs"
            style={delay(800)}
          >
            <p className="mt-1">© 2026 Barangay Bagocboc</p>
          </div>
        </div>

        {/* ---------------- Right: form ---------------- */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14 lg:py-12">
          <div className="w-full max-w-[400px] mx-auto">
            {/* Heading */}
            <div className="bl-in mb-7" style={delay(200)}>
              <div className="lg:hidden flex justify-center mb-5">
                <img
                  src={logo}
                  alt="Barangay Bagocboc Seal"
                  className="w-20 h-20 rounded-full object-cover shadow-lg shadow-[#1E3A2A]/20 ring-4 ring-[#F7F5EC]"
                />
              </div>
              <h2 className="bl-serif text-[32px] leading-tight font-semibold text-[#1B2A20] tracking-tight">
                Welcome back
              </h2>
              <p className="mt-1.5 text-[15px] text-stone-500">
                Sign in to your account to continue.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#EAF3F7] px-2.5 py-1 text-xs font-medium text-[#2C6E8E]">
                <Monitor className="w-3.5 h-3.5" />
                Web access only
              </span>
            </div>

            {/* Demo accounts */}
            <div
              className="bl-in relative"
              style={delay(300)}
              ref={dropdownRef}
            >
              <button
                type="button"
                onClick={() => setShowDemoDropdown((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={showDemoDropdown}
                className={`group w-full h-12 px-3.5 flex items-center justify-between rounded-xl border bg-[#FAF9F3] transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#245234]/[0.15] ${showDemoDropdown
                    ? "border-[#245234]/50 bg-white"
                    : "border-stone-300 hover:border-[#245234]/40 hover:bg-white"
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-[#E8F0E9] text-[#245234]">
                    <User className="w-4 h-4" />
                  </span>
                  <span className="text-[15px] font-medium text-stone-700">
                    Demo accounts
                  </span>
                  <span className="text-xs text-[#B9841D] bg-[#FBEFD4] px-2 py-0.5 rounded-full font-medium">
                    Quick login
                  </span>
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-stone-400 transition-transform duration-300 ${showDemoDropdown ? "rotate-180 text-[#245234]" : ""
                    }`}
                />
              </button>

              {showDemoDropdown && (
                <div
                  role="menu"
                  className="bl-pop absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-stone-200 rounded-2xl shadow-[0_24px_48px_-16px_rgba(18,36,26,0.30)] overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-[#F7F5EC] border-b border-stone-200">
                    <p className="text-xs text-stone-500 font-medium">
                      Pick a role to fill in the sign-in form
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {DEMO_ACCOUNTS.map((account, index) => {
                      const selected = form.email === account.email;
                      return (
                        <button
                          key={account.email}
                          type="button"
                          role="menuitem"
                          onClick={() => handleDemoSelect(account)}
                          className="bl-item w-full px-4 py-2.5 text-left hover:bg-[#F7F5EC] focus-visible:bg-[#F7F5EC] focus-visible:outline-none transition-colors border-b border-stone-100 last:border-0 group flex items-center justify-between gap-3"
                          style={delay(index * 30)}
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <span
                              className={`grid place-items-center w-9 h-9 rounded-full shrink-0 ${account.bg}`}
                            >
                              <User className={`w-4 h-4 ${account.color}`} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-stone-800 group-hover:text-[#245234] transition-colors truncate">
                                {account.role}
                              </span>
                              <span className="block text-xs text-stone-500 truncate">
                                {account.description}
                              </span>
                            </span>
                          </span>
                          {selected && (
                            <Check className="w-4 h-4 text-[#245234] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-4 py-2 bg-[#F7F5EC] text-xs text-stone-500 text-center border-t border-stone-200 flex items-center justify-center gap-2">
                    <Lock className="w-3 h-3 text-stone-400" />
                    <span>
                      Default password:{" "}
                      <span className="font-mono font-semibold text-stone-700">
                        password
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div
              className="bl-in flex items-center gap-3 my-6 text-xs text-stone-400"
              style={delay(360)}
            >
              <span className="h-px flex-1 bg-stone-200" />
              <span>or sign in with email</span>
              <span className="h-px flex-1 bg-stone-200" />
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Email */}
              <div className="bl-in" style={delay(420)}>
                <label
                  htmlFor="email"
                  className="block text-[13px] font-semibold text-stone-700 mb-1.5"
                >
                  Email address
                </label>
                <div className="group relative">
                  <Mail className={iconBase} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={`${inputBase} pr-4 ${errors.email ? inputBad : inputOk
                      }`}
                  />
                </div>
                {errors.email && (
                  <p
                    id="email-error"
                    className="bl-fade mt-1.5 flex items-center gap-1.5 text-[13px] text-red-600"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="bl-in" style={delay(490)}>
                <label
                  htmlFor="password"
                  className="block text-[13px] font-semibold text-stone-700 mb-1.5"
                >
                  Password
                </label>
                <div className="group relative">
                  <Lock className={iconBase} />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    onKeyDown={(e) =>
                      setCapsLock(e.getModifierState("CapsLock"))
                    }
                    onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLock(false)}
                    placeholder="Enter your password"
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    className={`${inputBase} pr-12 ${errors.password ? inputBad : inputOk
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-lg text-stone-400 hover:text-[#245234] hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245234] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="password-error"
                    className="bl-fade mt-1.5 flex items-center gap-1.5 text-[13px] text-red-600"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.password}
                  </p>
                )}
                {capsLock && (
                  <p className="bl-fade mt-1.5 flex items-center gap-1.5 text-[13px] text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Caps Lock is on.
                  </p>
                )}
              </div>

              {/* Remember me & Forgot password */}
              <div
                className="bl-in flex items-center justify-between"
                style={delay(550)}
              >
                <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 accent-[#245234] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245234] focus-visible:ring-offset-2"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-sm text-[#2C6E8E] hover:text-[#245234] font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* General error */}
              {errors.general && (
                <div
                  key={errors.general}
                  role="alert"
                  className="bl-shake flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{errors.general}</p>
                </div>
              )}

              {/* Submit */}
              <div className="bl-in" style={delay(610)}>
                <button
                  type="submit"
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="bl-btn group w-full h-12 rounded-xl font-semibold text-white flex items-center justify-center gap-2 bg-gradient-to-b from-[#2B603E] to-[#1F4A30] shadow-[0_10px_20px_-10px_rgba(36,82,52,0.7)] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-px hover:shadow-[0_14px_24px_-10px_rgba(36,82,52,0.75)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#245234]/[0.3] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                      Sign in
                    </>
                  )}
                </button>
              </div>
            </form>

            <p
              className="bl-in mt-8 flex items-center justify-center gap-2 text-xs text-stone-400"
              style={delay(680)}
            >
              <ShieldCheck className="w-4 h-4 text-[#245234]/60" />
              For authorized barangay personnel only.
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- Forgot password modal ---------------- */}
      {showForgotPassword && (
        <div
          className="bl-fade fixed inset-0 z-[9999] flex items-center justify-center bg-[#0B1710]/60 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isForgotLoading)
              closeForgotPassword();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-title"
            className="bl-modal relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-7"
          >
            <button
              type="button"
              onClick={closeForgotPassword}
              aria-label="Close"
              className="absolute right-4 top-4 grid place-items-center w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#245234] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {forgotSuccess ? (
              <div className="text-center py-4">
                <div className="relative w-16 h-16 mx-auto mb-5">
                  <span
                    aria-hidden
                    className="bl-ping absolute inset-0 rounded-full bg-green-500/30"
                  />
                  <div className="relative w-16 h-16 rounded-full bg-green-100 text-green-600 grid place-items-center">
                    <svg
                      viewBox="0 0 24 24"
                      className="bl-check w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </div>
                </div>
                <h3
                  id="forgot-title"
                  className="bl-serif text-2xl font-semibold text-[#1B2A20]"
                >
                  OTP sent
                </h3>
                <p className="text-sm text-stone-500 mt-1.5">
                  Check your email for the code. Taking you to verification…
                </p>
                <button
                  type="button"
                  onClick={closeForgotPassword}
                  className="mt-5 text-sm text-[#2C6E8E] hover:text-[#245234] font-medium underline-offset-4 hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[#E8F0E9] grid place-items-center">
                    <Mail className="w-7 h-7 text-[#245234]" />
                  </div>
                  <h3
                    id="forgot-title"
                    className="bl-serif text-2xl font-semibold text-[#1B2A20]"
                  >
                    Reset your password
                  </h3>
                  <p className="text-sm text-stone-500 mt-1.5">
                    Enter your email address and we'll send you a one-time code
                    to reset your password.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword}>
                  <div className="mb-5">
                    <label
                      htmlFor="forgot-email"
                      className="block text-[13px] font-semibold text-stone-700 mb-1.5"
                    >
                      Email address
                    </label>
                    <div className="group relative">
                      <Mail className={iconBase} />
                      <input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`${inputBase} pr-4 ${inputOk}`}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeForgotPassword}
                      className="flex-1 h-12 border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors text-stone-600 font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-300/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="bl-btn flex-1 h-12 bg-gradient-to-b from-[#2B603E] to-[#1F4A30] text-white rounded-xl transition-[transform,box-shadow] duration-200 hover:-translate-y-px disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#245234]/[0.3]"
                    >
                      {isForgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        "Send OTP"
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}