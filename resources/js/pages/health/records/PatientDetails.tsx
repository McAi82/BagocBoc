// src/pages/health/records/PatientDetails.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Calendar,
  Heart,
  Activity,
  FileText,
  Clock,
  Phone,
  Home,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Baby,
  Droplet,
  User as UserIcon,
  Stethoscope,
  X,
  Info,
  Save,
  XCircle,
  Thermometer,
  Ruler,
  Weight,
  Pill,
  ClipboardList,
} from "lucide-react";
import { api } from "../../../api/apiClient";
import { healthApi } from "../../../api/endpoints";
import toast from "react-hot-toast";

/* ============================================================
   META
   ============================================================ */

const PATIENT_TYPE_LABELS: Record<string, string> = {
  pregnant: "Pregnant",
  child: "Child",
  lactating: "Lactating",
  senior: "Senior Citizen",
  ncd: "NCD / Chronic",
};

const PATIENT_TYPE_ICONS: Record<string, any> = {
  pregnant: Heart,
  child: Baby,
  lactating: Droplet,
  senior: UserIcon,
  ncd: Activity,
};

const PATIENT_TYPE_COLORS: Record<string, string> = {
  pregnant: "pink",
  child: "green",
  lactating: "purple",
  senior: "amber",
  ncd: "red",
};

const BP_PRESETS = ["90/60", "100/70", "110/70", "120/80", "130/85", "140/90"];

/* ============================================================
   SMALL UI
   ============================================================ */

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-theme last:border-0">
      <div className="flex items-center gap-2 text-sm text-theme-textSecondary">
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-theme-text text-right break-words max-w-[60%]">
        {value ?? "—"}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
      <div className="px-6 py-3 border-b border-theme bg-theme-background flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-theme-primary" />}
          <h3 className="font-semibold text-theme-text text-sm uppercase tracking-wide">
            {title}
          </h3>
        </div>
        {actions}
      </div>
      <div className="px-6 py-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-theme-text mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-theme-textSecondary mt-1">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function PatientDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [record, setRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckupForm, setShowCheckupForm] = useState(false);
  const [checkupData, setCheckupData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBpPresets, setShowBpPresets] = useState(false);

  /* ============================================================
     FETCH RECORD — smart single-fetch
     ============================================================ */
  useEffect(() => {
    if (id) fetchRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRecord = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      let foundRecord: any = null;

      // ── Step 1: fetch the base patient record
      try {
        const baseResponse = await api.get(`/web/health/patients/${id}`);
        const base = baseResponse?.data?.data;

        if (base) {
          const type = base.patient_type;

          // ── Step 2: fetch only the matching type-specific details
          const detailEndpoints: Record<
            string,
            (id: number) => Promise<any>
          > = {
            pregnant: healthApi.getPregnancyDetails,
            child: healthApi.getChildDetails,
            lactating: healthApi.getLactatingDetails,
            senior: healthApi.getSeniorDetails,
            ncd: healthApi.getOtherDetails,
          };

          const detailEndpoint = detailEndpoints[type];

          if (detailEndpoint) {
            try {
              const detailResponse = await detailEndpoint(parseInt(id, 10));
              foundRecord = detailResponse?.data?.data || base;
            } catch (err) {
              console.warn(
                `Detail endpoint for "${type}" failed; using base record`,
                err,
              );
              foundRecord = base;
            }
          } else {
            foundRecord = base;
          }
        }
      } catch (err) {
        console.warn(
          "Base /web/health/patients/{id} endpoint unavailable, falling back",
          err,
        );
      }

      // ── Fallback: try each type-specific endpoint until one succeeds
      if (!foundRecord) {
        const categories = [
          { endpoint: healthApi.getPregnancyDetails },
          { endpoint: healthApi.getChildDetails },
          { endpoint: healthApi.getLactatingDetails },
          { endpoint: healthApi.getSeniorDetails },
          { endpoint: healthApi.getOtherDetails },
        ];

        for (const category of categories) {
          try {
            const response = await category.endpoint(parseInt(id, 10));
            if (response?.data?.data) {
              foundRecord = response.data.data;
              break;
            }
          } catch {
            continue;
          }
        }
      }

      if (foundRecord) {
        setRecord(foundRecord);
      } else {
        toast.error("Patient record not found");
        navigate("/barangay-bagocboc/health/records");
      }
    } catch (error) {
      console.error("Error fetching record:", error);
      toast.error("Failed to load patient record");
    } finally {
      setIsLoading(false);
    }
  };

  /* ============================================================
     FORM STATE HELPERS
     ============================================================ */

  const setField = (key: string, value: any) => {
    setCheckupData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const setVital = (key: string, value: any) => {
    setCheckupData((prev) => ({
      ...prev,
      maternal_vitals: { ...(prev.maternal_vitals || {}), [key]: value },
    }));
  };

  const getVital = (key: string) => checkupData.maternal_vitals?.[key] || "";

  const handleBpChange = (value: string) => {
    let cleaned = value.replace(/[^\d/]/g, "");
    if (/^\d{3}$/.test(cleaned)) cleaned = `${cleaned}/`;
    setVital("blood_pressure", cleaned);
  };

  /* ============================================================
     FORM VALIDATION
     ============================================================ */

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!checkupData.checkup_date) {
      newErrors.checkup_date = "Checkup date is required";
    }
    if (!checkupData.assessment || !checkupData.assessment.trim()) {
      newErrors.assessment = "Please enter your assessment";
    }
    if (
      checkupData.follow_up_date &&
      checkupData.checkup_date &&
      new Date(checkupData.follow_up_date) <
      new Date(checkupData.checkup_date)
    ) {
      newErrors.follow_up_date =
        "Follow-up must be on or after the checkup date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ============================================================
     SUBMIT CHECKUP
     ============================================================ */

  const handleCheckupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    if (!validate()) {
      toast.error("Please fix the errors below");
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoints: Record<string, any> = {
        pregnant: healthApi.storePregnancyCheckup,
        child: healthApi.storeChildCheckup,
        lactating: healthApi.storeLactatingCheckup,
        senior: healthApi.storeSeniorCheckup,
        ncd: healthApi.storeOtherCheckup,
      };

      const endpoint = endpoints[record.patient_type];
      if (!endpoint) {
        toast.error("Unknown patient type");
        return;
      }

      const payload: Record<string, any> = {
        checkup_date: new Date().toISOString().split("T")[0],
        assessment: "",
        ...checkupData,
        follow_up_date: checkupData.follow_up_date || null,
      };

      console.log("📤 Submitting checkup payload:", payload);

      await endpoint(record.id, payload);
      toast.success("Checkup recorded successfully!");
      setShowCheckupForm(false);
      setCheckupData({});
      setErrors({});
      await fetchRecord();
    } catch (error: any) {
      const apiErrors = error?.response?.data?.errors;
      console.error("❌ Validation errors:", apiErrors);
      console.error("❌ Full response:", error?.response?.data);

      if (apiErrors && typeof apiErrors === "object") {
        const fieldErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach((key) => {
          const val = apiErrors[key];
          fieldErrors[key] = Array.isArray(val) ? val[0] : String(val);
        });
        setErrors(fieldErrors);
        const firstKey = Object.keys(fieldErrors)[0];
        toast.error(`${firstKey}: ${fieldErrors[firstKey]}`);
      } else {
        toast.error(error?.response?.data?.message || "Failed to save checkup");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    if (Object.keys(checkupData).length > 0) {
      if (!window.confirm("Discard this checkup? All data will be lost.")) {
        return;
      }
    }
    setShowCheckupForm(false);
    setCheckupData({});
    setErrors({});
  };

  /* ============================================================
     COLORS
     ============================================================ */

  const getColorClasses = (color: string) => {
    const colors: Record<
      string,
      { bg: string; light: string; text: string; border: string }
    > = {
      pink: {
        bg: "bg-pink-500",
        light: "bg-pink-50 dark:bg-pink-900/20",
        text: "text-pink-600 dark:text-pink-400",
        border: "border-pink-200 dark:border-pink-800",
      },
      green: {
        bg: "bg-green-500",
        light: "bg-green-50 dark:bg-green-900/20",
        text: "text-green-600 dark:text-green-400",
        border: "border-green-200 dark:border-green-800",
      },
      purple: {
        bg: "bg-purple-500",
        light: "bg-purple-50 dark:bg-purple-900/20",
        text: "text-purple-600 dark:text-purple-400",
        border: "border-purple-200 dark:border-purple-800",
      },
      amber: {
        bg: "bg-amber-500",
        light: "bg-amber-50 dark:bg-amber-900/20",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-800",
      },
      red: {
        bg: "bg-red-500",
        light: "bg-red-50 dark:bg-red-900/20",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-200 dark:border-red-800",
      },
    };
    return colors[color] || colors.green;
  };

  /* ============================================================
     RENDER CHECKUP FORM
     ============================================================ */

  const renderCheckupForm = () => {
    if (!record) return null;

    const today = new Date().toISOString().split("T")[0];

    const SectionHeader = ({
      icon: Icon,
      title,
      subtitle,
    }: {
      icon: any;
      title: string;
      subtitle?: string;
    }) => (
      <div className="flex items-start gap-3 pb-4 mb-4 border-b border-theme">
        <div className="p-2 rounded-lg bg-theme-primary/10">
          <Icon className="w-4 h-4 text-theme-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-theme-text text-sm">{title}</h4>
          {subtitle && (
            <p className="text-xs text-theme-textSecondary mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    );

    const TextInput = ({
      invalid,
      ...rest
    }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) => (
      <input
        {...rest}
        className={`w-full px-3.5 py-2.5 bg-theme-background border rounded-lg text-theme-text placeholder:text-theme-textSecondary/60 focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none transition-all ${invalid ? "border-red-500" : "border-theme"
          }`}
      />
    );

    const NumberInput = ({
      invalid,
      suffix,
      ...rest
    }: React.InputHTMLAttributes<HTMLInputElement> & {
      invalid?: boolean;
      suffix?: string;
    }) => (
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          {...rest}
          className={`w-full pl-3.5 pr-14 py-2.5 bg-theme-background border rounded-lg text-theme-text placeholder:text-theme-textSecondary/60 focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none transition-all ${invalid ? "border-red-500" : "border-theme"
            }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-theme-textSecondary pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    );

    const TextArea = ({
      invalid,
      ...rest
    }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
      invalid?: boolean;
    }) => (
      <textarea
        {...rest}
        className={`w-full px-3.5 py-2.5 bg-theme-background border rounded-lg text-theme-text placeholder:text-theme-textSecondary/60 focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none transition-all resize-none ${invalid ? "border-red-500" : "border-theme"
          }`}
      />
    );

    return (
      <form onSubmit={handleCheckupSubmit} className="space-y-6">
        {/* Checkup Info */}
        <div>
          <SectionHeader
            icon={Calendar}
            title="Checkup Information"
            subtitle="When this checkup was performed"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Checkup Date" required error={errors.checkup_date}>
              <TextInput
                type="date"
                value={checkupData.checkup_date || today}
                max={today}
                onChange={(e) => setField("checkup_date", e.target.value)}
                invalid={!!errors.checkup_date}
              />
            </Field>
            <Field
              label="Follow-up Date"
              hint="Leave blank if no follow-up needed"
              error={errors.follow_up_date}
            >
              <TextInput
                type="date"
                min={checkupData.checkup_date || today}
                value={checkupData.follow_up_date || ""}
                onChange={(e) => setField("follow_up_date", e.target.value)}
                invalid={!!errors.follow_up_date}
              />
            </Field>
          </div>
        </div>

        {/* Vitals (pregnant) */}
        {record.patient_type === "pregnant" && (
          <div>
            <SectionHeader
              icon={Heart}
              title="Maternal Vitals"
              subtitle="Current measurements for this visit"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Blood Pressure"
                hint="Format: systolic/diastolic (e.g. 120/80)"
              >
                <div className="relative">
                  <TextInput
                    placeholder="120/80"
                    value={getVital("blood_pressure")}
                    onChange={(e) => handleBpChange(e.target.value)}
                    onFocus={() => setShowBpPresets(true)}
                    onBlur={() =>
                      setTimeout(() => setShowBpPresets(false), 150)
                    }
                  />
                  {showBpPresets && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-theme-surface border border-theme rounded-lg shadow-lg z-20 p-2">
                      <p className="text-[10px] uppercase tracking-wide text-theme-textSecondary px-2 pb-1">
                        Quick fill
                      </p>
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {BP_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setVital("blood_pressure", preset);
                              setShowBpPresets(false);
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-theme-background hover:bg-theme-primary/10 hover:text-theme-primary rounded transition-colors text-theme-text"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Heart Rate" hint="Normal: 60–100 bpm">
                <NumberInput
                  placeholder="72"
                  min={0}
                  max={250}
                  step={1}
                  suffix="bpm"
                  value={getVital("heart_rate")}
                  onChange={(e) => setVital("heart_rate", e.target.value)}
                />
              </Field>
              <Field label="Weight" hint="Current maternal weight">
                <NumberInput
                  placeholder="65.5"
                  min={0}
                  max={500}
                  step={0.1}
                  suffix="kg"
                  value={getVital("weight")}
                  onChange={(e) => setVital("weight", e.target.value)}
                />
              </Field>
              <Field label="Temperature" hint="Normal: 36.1–37.2 °C">
                <NumberInput
                  placeholder="36.5"
                  min={30}
                  max={45}
                  step={0.1}
                  suffix="°C"
                  value={getVital("temperature")}
                  onChange={(e) => setVital("temperature", e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Vitals (child) */}
        {record.patient_type === "child" && (
          <div>
            <SectionHeader
              icon={Baby}
              title="Growth Measurements"
              subtitle="Weight, height, and MUAC"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Weight">
                <NumberInput
                  placeholder="12.5"
                  min={0}
                  max={200}
                  step={0.01}
                  suffix="kg"
                  value={checkupData.weight || ""}
                  onChange={(e) => setField("weight", e.target.value)}
                />
              </Field>
              <Field label="Height">
                <NumberInput
                  placeholder="95.5"
                  min={0}
                  max={250}
                  step={0.1}
                  suffix="cm"
                  value={checkupData.height || ""}
                  onChange={(e) => setField("height", e.target.value)}
                />
              </Field>
              <Field label="MUAC" hint="Mid-upper arm circumference">
                <NumberInput
                  placeholder="15.5"
                  min={0}
                  max={40}
                  step={0.1}
                  suffix="cm"
                  value={checkupData.muac || ""}
                  onChange={(e) => setField("muac", e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Clinical Assessment */}
        <div>
          <SectionHeader
            icon={Stethoscope}
            title="Clinical Assessment"
            subtitle="Your findings and clinical notes"
          />
          <div className="space-y-4">
            <Field
              label="Assessment"
              required
              error={errors.assessment}
              hint="Summary of your clinical findings"
            >
              <TextArea
                rows={3}
                maxLength={500}
                placeholder="Describe what you observed during this visit..."
                value={checkupData.assessment || ""}
                onChange={(e) => setField("assessment", e.target.value)}
                invalid={!!errors.assessment}
              />
            </Field>

            {record.patient_type === "pregnant" && (
              <>
                <Field
                  label="Fetal Assessment"
                  hint="Fetal heart tones, movement, position"
                >
                  <TextArea
                    rows={2}
                    maxLength={300}
                    placeholder="E.g. FHT 140 bpm regular, active movement..."
                    value={checkupData.fetal_assessment || ""}
                    onChange={(e) =>
                      setField("fetal_assessment", e.target.value)
                    }
                  />
                </Field>
                <Field
                  label="Interventions & Micronutrients"
                  hint="Supplements, medications, or services provided"
                >
                  <TextArea
                    rows={2}
                    maxLength={300}
                    placeholder="E.g. Iron + Folic acid 1 tab daily..."
                    value={checkupData.interventions || ""}
                    onChange={(e) => setField("interventions", e.target.value)}
                  />
                </Field>
              </>
            )}

            {record.patient_type === "child" && (
              <Field
                label="Vaccines Given"
                hint="List vaccines administered during this visit"
              >
                <TextArea
                  rows={2}
                  maxLength={300}
                  placeholder="E.g. BCG, HepB, OPV 1st dose..."
                  value={checkupData.vaccines_given || ""}
                  onChange={(e) => setField("vaccines_given", e.target.value)}
                />
              </Field>
            )}

            <Field
              label="Recommendations"
              hint="Advice, medications, or next steps"
            >
              <TextArea
                rows={2}
                maxLength={300}
                placeholder="E.g. Return in 4 weeks, continue supplements..."
                value={checkupData.recommendations || ""}
                onChange={(e) => setField("recommendations", e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-theme-surface border-t border-theme flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3">
          <button
            type="button"
            onClick={handleCancelForm}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text font-medium disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 font-medium shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Checkup
              </>
            )}
          </button>
        </div>
      </form>
    );
  };

  /* ============================================================
     LOADING / ERROR STATES
     ============================================================ */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
          <p className="text-sm text-theme-textSecondary">
            Loading patient record...
          </p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-theme-textSecondary mb-4" />
        <h3 className="text-lg font-semibold text-theme-text">
          Patient not found
        </h3>
        <p className="text-theme-textSecondary">
          The requested patient record does not exist.
        </p>
        <button
          onClick={() => navigate("/barangay-bagocboc/health/records")}
          className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
        >
          Back to Records
        </button>
      </div>
    );
  }

  const resident = record.resident || {};
  const color = getColorClasses(
    PATIENT_TYPE_COLORS[record.patient_type] || "green",
  );
  const TypeIcon = PATIENT_TYPE_ICONS[record.patient_type] || User;

  /* ============================================================
     MAIN RENDER
     ============================================================ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-theme-textSecondary" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-theme-text">
                {resident.first_name} {resident.last_name}
              </h1>
              <span
                className={`text-xs px-2 py-1 rounded-full ${color.light} ${color.text}`}
              >
                {PATIENT_TYPE_LABELS[record.patient_type] ||
                  record.patient_type}
              </span>
            </div>
            <p className="text-sm text-theme-textSecondary">
              Patient ID: #{record.id} • {resident.gender} •{" "}
              {resident.age || "N/A"} years old
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (showCheckupForm) {
                handleCancelForm();
              } else {
                const today = new Date().toISOString().split("T")[0];
                setCheckupData({ checkup_date: today });
                setErrors({});
                setShowCheckupForm(true);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${showCheckupForm
              ? "border border-theme text-theme-text hover:bg-theme-hover"
              : "bg-theme-primary text-white hover:opacity-90"
              }`}
          >
            {showCheckupForm ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                New Checkup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Checkup Form */}
      {showCheckupForm && (
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-theme">
            <div className={`p-2.5 rounded-xl ${color.light}`}>
              <Stethoscope className={`w-5 h-5 ${color.text}`} />
            </div>
            <div>
              <h3 className="font-semibold text-theme-text text-lg">
                New {PATIENT_TYPE_LABELS[record.patient_type]} Checkup
              </h3>
              <p className="text-sm text-theme-textSecondary">
                Fill in the fields below. Fields marked with{" "}
                <span className="text-red-500">*</span> are required.
              </p>
            </div>
          </div>
          {renderCheckupForm()}
        </div>
      )}

      {/* Patient Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SectionCard title="Personal Information" icon={User}>
          <InfoRow
            label="Full Name"
            value={`${resident.first_name || ""} ${resident.middle_name || ""
              } ${resident.last_name || ""}`.trim()}
          />
          <InfoRow
            label="Age"
            value={resident.age ? `${resident.age} years` : "—"}
          />
          <InfoRow label="Gender" value={resident.gender || "—"} />
          <InfoRow
            label="Phone"
            value={resident.phone_number || "—"}
            icon={Phone}
          />
          <InfoRow
            label="Birth Date"
            value={
              resident.birth_date
                ? new Date(resident.birth_date).toLocaleDateString()
                : "—"
            }
            icon={Calendar}
          />
          <InfoRow
            label="Address"
            value={resident.place_of_birth || "—"}
            icon={Home}
          />
        </SectionCard>

        <SectionCard title="Patient Details" icon={FileText}>
          <InfoRow
            label="Type"
            value={
              PATIENT_TYPE_LABELS[record.patient_type] || record.patient_type
            }
          />
          <InfoRow
            label="Status"
            value={
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {record.status || "active"}
              </span>
            }
          />
          <InfoRow
            label="Registered"
            value={
              record.created_at
                ? new Date(record.created_at).toLocaleDateString()
                : "—"
            }
            icon={Clock}
          />
          <InfoRow
            label="Total Checkups"
            value={record.checkups?.length || 0}
            icon={ClipboardList}
          />
        </SectionCard>

        <SectionCard title="Latest Vitals" icon={Activity}>
          {record.vital_signs && Object.keys(record.vital_signs).length > 0 ? (
            <>
              {record.vital_signs.blood_pressure && (
                <InfoRow
                  label="Blood Pressure"
                  value={record.vital_signs.blood_pressure}
                />
              )}
              {record.vital_signs.heart_rate && (
                <InfoRow
                  label="Heart Rate"
                  value={`${record.vital_signs.heart_rate} bpm`}
                />
              )}
              {record.vital_signs.temperature && (
                <InfoRow
                  label="Temperature"
                  value={`${record.vital_signs.temperature} °C`}
                  icon={Thermometer}
                />
              )}
              {record.vital_signs.weight && (
                <InfoRow
                  label="Weight"
                  value={`${record.vital_signs.weight} kg`}
                  icon={Weight}
                />
              )}
              {record.vital_signs.height && (
                <InfoRow
                  label="Height"
                  value={`${record.vital_signs.height} cm`}
                  icon={Ruler}
                />
              )}
              {record.vital_signs.respiratory_rate && (
                <InfoRow
                  label="Respiratory Rate"
                  value={record.vital_signs.respiratory_rate}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-theme-textSecondary py-4">
              No vital signs recorded
            </p>
          )}
        </SectionCard>
      </div>

      {/* Type-specific details */}
      {record.patient_type === "pregnant" && record.pregnancy_record && (
        <SectionCard title="Pregnancy Details" icon={Heart}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <InfoRow
              label="Last Menstrual Period"
              value={
                record.pregnancy_record.last_menstrual_period
                  ? new Date(
                    record.pregnancy_record.last_menstrual_period,
                  ).toLocaleDateString()
                  : "—"
              }
            />
            <InfoRow
              label="Expected Delivery"
              value={
                record.pregnancy_record.expected_delivery_date
                  ? new Date(
                    record.pregnancy_record.expected_delivery_date,
                  ).toLocaleDateString()
                  : "—"
              }
            />
            <InfoRow
              label="Gestational Age"
              value={
                record.pregnancy_record.gestational_age
                  ? `${record.pregnancy_record.gestational_age} weeks`
                  : "—"
              }
            />
            <InfoRow
              label="Risk Level"
              value={record.pregnancy_record.risk_level || "—"}
            />
            <InfoRow
              label="Gravida"
              value={record.pregnancy_record.gravida ?? "—"}
            />
            <InfoRow label="Para" value={record.pregnancy_record.para ?? "—"} />
          </div>
        </SectionCard>
      )}

      {record.patient_type === "child" && record.child_record && (
        <SectionCard title="Child Details" icon={Baby}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <InfoRow
              label="Birth Weight"
              value={
                record.child_record.birth_weight
                  ? `${record.child_record.birth_weight} kg`
                  : "—"
              }
            />
            <InfoRow
              label="Birth Height"
              value={
                record.child_record.birth_height
                  ? `${record.child_record.birth_height} cm`
                  : "—"
              }
            />
            <InfoRow
              label="Head Circumference"
              value={
                record.child_record.birth_head_circumference
                  ? `${record.child_record.birth_head_circumference} cm`
                  : "—"
              }
            />
            <InfoRow
              label="Nutritional Status"
              value={record.child_record.current_nutritional_status || "—"}
            />
          </div>
        </SectionCard>
      )}

      {record.patient_type === "lactating" && record.lactating_record && (
        <SectionCard title="Lactating Details" icon={Droplet}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <InfoRow
              label="Breastfeeding Status"
              value={record.lactating_record.breastfeeding_status || "—"}
            />
            <InfoRow
              label="Infant Age"
              value={
                record.lactating_record.infant_age
                  ? `${record.lactating_record.infant_age} months`
                  : "—"
              }
            />
          </div>
        </SectionCard>
      )}

      {record.patient_type === "senior" && record.senior_record && (
        <SectionCard title="Senior Details" icon={UserIcon}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <InfoRow
              label="Falls Risk Score"
              value={record.senior_record.falls_risk_score ?? "—"}
            />
            <InfoRow
              label="Cognitive Assessment"
              value={record.senior_record.cognitive_assessment || "—"}
            />
            <InfoRow
              label="Memory Status"
              value={record.senior_record.memory_status || "—"}
            />
            <InfoRow
              label="Chronic Conditions"
              value={record.senior_record.chronic_conditions || "—"}
            />
            <InfoRow
              label="Medications"
              value={record.senior_record.medication_list || "—"}
              icon={Pill}
            />
            <InfoRow
              label="Allergies"
              value={record.senior_record.allergies || "—"}
            />
            <InfoRow
              label="Activity Level"
              value={record.senior_record.activity_level || "—"}
            />
            <InfoRow
              label="Support System"
              value={record.senior_record.support_system || "—"}
            />
            <InfoRow
              label="Emergency Contact"
              value={record.senior_record.emergency_contact || "—"}
              icon={Phone}
            />
          </div>
        </SectionCard>
      )}

      {record.patient_type === "ncd" && record.ncd_record && (
        <SectionCard title="NCD Details" icon={Activity}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <InfoRow
              label="NCD Classification"
              value={record.ncd_record.ncd_classification || "—"}
            />
            <InfoRow
              label="Current Status"
              value={record.ncd_record.current_status || "—"}
            />
            <InfoRow
              label="Diagnosis Date"
              value={
                record.ncd_record.diagnosis_date
                  ? new Date(
                    record.ncd_record.diagnosis_date,
                  ).toLocaleDateString()
                  : "—"
              }
            />
          </div>
        </SectionCard>
      )}

      {/* Checkup History */}
      <SectionCard
        title="Checkup History"
        icon={ClipboardList}
        actions={
          <span className="text-xs text-theme-textSecondary">
            {record.checkups?.length || 0} total
          </span>
        }
      >
        {record.checkups && record.checkups.length > 0 ? (
          <div className="space-y-4 py-3">
            {record.checkups.map((checkup: any) => (
              <div
                key={checkup.id}
                className="border border-theme rounded-lg p-4 hover:bg-theme-hover/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-4 h-4 text-theme-textSecondary" />
                    <span className="font-medium text-theme-text">
                      {new Date(checkup.checkup_date).toLocaleDateString()}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                      {checkup.status || "Completed"}
                    </span>
                  </div>
                  <span className="text-sm text-theme-textSecondary">
                    by {checkup.performed_by?.email || "Unknown"}
                  </span>
                </div>
                {checkup.assessment && (
                  <p className="text-sm text-theme-text mb-1">
                    <span className="font-medium">Assessment: </span>
                    {checkup.assessment}
                  </p>
                )}
                {checkup.recommendations && (
                  <p className="text-sm text-theme-textSecondary">
                    <span className="font-medium">Recommendations: </span>
                    {checkup.recommendations}
                  </p>
                )}
                {checkup.follow_up_date && (
                  <p className="text-xs text-theme-textSecondary mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Follow-up:{" "}
                    {new Date(checkup.follow_up_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-theme-textSecondary py-6 text-center">
            No checkups recorded yet.
          </p>
        )}
      </SectionCard>
    </div>
  );
}