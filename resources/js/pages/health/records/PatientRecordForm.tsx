// src/pages/health/PatientRecordForm.tsx

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  User,
  Heart,
  Baby,
  Droplet,
  User as UserIcon,
  Activity,
  Loader2,
  AlertCircle,
  Search,
  CheckCircle,
} from "lucide-react";
import { healthApi } from "../../../api/endpoints";
import toast from "react-hot-toast";

interface PatientRecordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PATIENT_TYPES = [
  { value: "pregnant", label: "Pregnant", icon: Heart, color: "pink" },
  { value: "child", label: "Child", icon: Baby, color: "green" },
  { value: "lactating", label: "Lactating", icon: Droplet, color: "purple" },
  { value: "senior", label: "Senior Citizen", icon: UserIcon, color: "amber" },
  { value: "ncd", label: "NCD / Chronic", icon: Activity, color: "red" },
];

export default function PatientRecordForm({
  onSuccess,
  onCancel,
}: PatientRecordFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedResident = location.state?.resident;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResident, setSelectedResident] = useState<any>(
    preSelectedResident || null,
  );
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [formData, setFormData] = useState({
    patient_type: "",
    vital_signs: {
      blood_pressure: "",
      heart_rate: "",
      temperature: "",
      respiratory_rate: "",
      weight: "",
      height: "",
    },
    // Pregnancy
    last_menstrual_period: "",
    expected_delivery_date: "",
    gestational_age: "",
    gravida: "",
    para: "",
    obstetric_history: "",
    risk_level: "low",
    // Child
    birth_weight: "",
    birth_height: "",
    birth_head_circumference: "",
    gestational_age_at_birth: "",
    // Lactating
    breastfeeding_status: "",
    infant_age: "",
    // Senior
    falls_risk_score: "",
    cognitive_assessment: "",
    // NCD
    ncd_classification: "",
    diagnosis_date: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (preSelectedResident) {
      setSelectedResident(preSelectedResident);
    }
  }, [preSelectedResident]);

  /* ============================================================
     RESIDENT SEARCH
     ============================================================ */

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await healthApi.searchResident(query);
      const results = response.data?.data?.results || [];
      const available = results.filter((r: any) => !r.has_record);
      setSearchResults(available);
      setShowSearchResults(available.length > 0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResident = (result: any) => {
    setSelectedResident(result.resident);
    setShowSearchResults(false);
    setSearchQuery("");
    setErrors((prev) => ({ ...prev, resident: "" }));
  };

  /* ============================================================
     FORM INPUT HANDLING
     ============================================================ */

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("vital_")) {
      const key = name.replace("vital_", "");
      setFormData((prev) => ({
        ...prev,
        vital_signs: { ...prev.vital_signs, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear the error for the field being edited
    const errorKey = name.startsWith("vital_")
      ? `vital_signs.${name.replace("vital_", "")}`
      : name;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  /* ============================================================
     CLIENT-SIDE VALIDATION
     ============================================================ */

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedResident) {
      newErrors.resident = "Please select a resident";
    }
    if (!formData.patient_type) {
      newErrors.patient_type = "Please select a patient type";
    }

    // Pregnancy-specific
    if (formData.patient_type === "pregnant") {
      if (
        formData.last_menstrual_period &&
        formData.expected_delivery_date &&
        new Date(formData.expected_delivery_date) <
        new Date(formData.last_menstrual_period)
      ) {
        newErrors.expected_delivery_date =
          "Delivery date must be after LMP";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ============================================================
     SUBMIT
     ============================================================ */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the errors below");
      // Scroll to the first error
      const firstError = document.querySelector(
        "[data-error='true']",
      ) as HTMLElement | null;
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      // ✅ Clean the payload:
      //   - filter out empty vital signs
      //   - coerce empty strings to null
      //   - coerce numeric fields to numbers
      const cleanVitals = Object.fromEntries(
        Object.entries(formData.vital_signs).filter(
          ([_, v]) => v !== "" && v !== null && v !== undefined,
        ),
      );

      const toNumOrNull = (v: any) => {
        if (v === "" || v === null || v === undefined) return null;
        const n = Number(v);
        return isNaN(n) ? null : n;
      };

      const payload: Record<string, any> = {
        resident_id: selectedResident.id,
        patient_type: formData.patient_type,
        vital_signs:
          Object.keys(cleanVitals).length > 0 ? cleanVitals : null,
      };

      // Type-specific fields
      if (formData.patient_type === "pregnant") {
        Object.assign(payload, {
          last_menstrual_period: formData.last_menstrual_period || null,
          expected_delivery_date: formData.expected_delivery_date || null,
          gestational_age: toNumOrNull(formData.gestational_age),
          gravida: toNumOrNull(formData.gravida),
          para: toNumOrNull(formData.para),
          obstetric_history: formData.obstetric_history || null,
          risk_level: formData.risk_level || "low",
        });
      } else if (formData.patient_type === "child") {
        Object.assign(payload, {
          birth_weight: toNumOrNull(formData.birth_weight),
          birth_height: toNumOrNull(formData.birth_height),
          birth_head_circumference: toNumOrNull(
            formData.birth_head_circumference,
          ),
          gestational_age_at_birth: toNumOrNull(
            formData.gestational_age_at_birth,
          ),
        });
      } else if (formData.patient_type === "lactating") {
        Object.assign(payload, {
          breastfeeding_status: formData.breastfeeding_status || null,
          infant_age: toNumOrNull(formData.infant_age),
        });
      } else if (formData.patient_type === "senior") {
        Object.assign(payload, {
          falls_risk_score: toNumOrNull(formData.falls_risk_score),
          cognitive_assessment: formData.cognitive_assessment || null,
        });
      } else if (formData.patient_type === "ncd") {
        Object.assign(payload, {
          ncd_classification: formData.ncd_classification || null,
          diagnosis_date: formData.diagnosis_date || null,
        });
      }

      console.log("📤 Submitting patient record:", payload);

      const response = await healthApi.createPatient(payload);

      console.log("✅ Patient record created:", response.data);

      toast.success("Patient record created successfully!");

      const recordId = response.data?.data?.id;
      if (recordId) {
        navigate(`/barangay-bagocboc/health/records/${recordId}`);
      } else {
        navigate("/barangay-bagocboc/health");
      }

      if (onSuccess) onSuccess();
    } catch (error: any) {
      // ✅ Log full validation errors from the backend
      console.error("❌ Full error response:", error?.response?.data);
      console.error("❌ Validation errors:", error?.response?.data?.errors);
      console.error("❌ Status:", error?.response?.status);

      const apiErrors = error?.response?.data?.errors;
      if (apiErrors && typeof apiErrors === "object") {
        const fieldErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach((key) => {
          const val = apiErrors[key];
          fieldErrors[key] = Array.isArray(val) ? val[0] : String(val);
        });
        setErrors(fieldErrors);

        const firstKey = Object.keys(fieldErrors)[0];
        toast.error(`${firstKey}: ${fieldErrors[firstKey]}`);

        // Scroll to the first errored field
        setTimeout(() => {
          const el = document.querySelector(
            `[name="${firstKey}"], [name="vital_${firstKey.replace("vital_signs.", "")}"]`,
          ) as HTMLElement | null;
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.focus();
        }, 100);
      } else {
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create patient record";
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ============================================================
     HELPERS
     ============================================================ */

  const getPatientTypeIcon = (type: string) => {
    const found = PATIENT_TYPES.find((p) => p.value === type);
    return found?.icon || User;
  };

  const getFieldError = (key: string) => errors[key];

  /* ============================================================
     TYPE-SPECIFIC FIELDS
     ============================================================ */

  const renderTypeSpecificFields = () => {
    switch (formData.patient_type) {
      case "pregnant":
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-theme-text border-b border-theme pb-2">
              Pregnancy Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Last Menstrual Period
                </label>
                <input
                  type="date"
                  name="last_menstrual_period"
                  value={formData.last_menstrual_period}
                  onChange={handleInputChange}
                  max={new Date().toISOString().split("T")[0]}
                  className={`w-full px-3 py-2 bg-theme-background border rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none ${getFieldError("last_menstrual_period")
                    ? "border-red-500"
                    : "border-theme"
                    }`}
                />
                {getFieldError("last_menstrual_period") && (
                  <p className="text-xs text-red-500 mt-1">
                    {getFieldError("last_menstrual_period")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  name="expected_delivery_date"
                  value={formData.expected_delivery_date}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-theme-background border rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none ${getFieldError("expected_delivery_date")
                    ? "border-red-500"
                    : "border-theme"
                    }`}
                />
                {getFieldError("expected_delivery_date") && (
                  <p className="text-xs text-red-500 mt-1">
                    {getFieldError("expected_delivery_date")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Gestational Age (weeks)
                </label>
                <input
                  type="number"
                  name="gestational_age"
                  value={formData.gestational_age}
                  onChange={handleInputChange}
                  min={0}
                  max={45}
                  placeholder="e.g. 24"
                  className={`w-full px-3 py-2 bg-theme-background border rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none ${getFieldError("gestational_age")
                    ? "border-red-500"
                    : "border-theme"
                    }`}
                />
                {getFieldError("gestational_age") && (
                  <p className="text-xs text-red-500 mt-1">
                    {getFieldError("gestational_age")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Risk Level
                </label>
                <select
                  name="risk_level"
                  value={formData.risk_level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Gravida (pregnancies)
                </label>
                <input
                  type="number"
                  name="gravida"
                  value={formData.gravida}
                  onChange={handleInputChange}
                  min={0}
                  max={20}
                  placeholder="e.g. 2"
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Para (births)
                </label>
                <input
                  type="number"
                  name="para"
                  value={formData.para}
                  onChange={handleInputChange}
                  min={0}
                  max={20}
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Obstetric History
              </label>
              <textarea
                name="obstetric_history"
                value={formData.obstetric_history}
                onChange={handleInputChange}
                rows={2}
                placeholder="Previous pregnancies, complications, etc."
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none resize-none"
              />
            </div>
          </div>
        );

      case "child":
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-theme-text border-b border-theme pb-2">
              Child Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Birth Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="birth_weight"
                  value={formData.birth_weight}
                  onChange={handleInputChange}
                  min={0}
                  max={20}
                  placeholder="e.g. 3.2"
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Birth Height (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="birth_height"
                  value={formData.birth_height}
                  onChange={handleInputChange}
                  min={0}
                  max={100}
                  placeholder="e.g. 50.5"
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Head Circumference (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="birth_head_circumference"
                  value={formData.birth_head_circumference}
                  onChange={handleInputChange}
                  min={0}
                  max={60}
                  placeholder="e.g. 34.5"
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Gestational Age at Birth (weeks)
                </label>
                <input
                  type="number"
                  name="gestational_age_at_birth"
                  value={formData.gestational_age_at_birth}
                  onChange={handleInputChange}
                  min={0}
                  max={45}
                  placeholder="e.g. 38"
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        );

      case "lactating":
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-theme-text border-b border-theme pb-2">
              Lactating Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Breastfeeding Status
                </label>
                <select
                  name="breastfeeding_status"
                  value={formData.breastfeeding_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                >
                  <option value="">Select status</option>
                  <option value="exclusive">Exclusive Breastfeeding</option>
                  <option value="mixed">Mixed Feeding</option>
                  <option value="weaned">Weaned</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Infant Age (months)
                </label>
                <input
                  type="number"
                  name="infant_age"
                  value={formData.infant_age}
                  onChange={handleInputChange}
                  min={0}
                  max={60}
                  placeholder="e.g. 4"
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        );

      case "senior":
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-theme-text border-b border-theme pb-2">
              Senior Citizen Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Falls Risk Score (0–10)
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  name="falls_risk_score"
                  value={formData.falls_risk_score}
                  onChange={handleInputChange}
                  placeholder="e.g. 3"
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Cognitive Assessment
              </label>
              <textarea
                name="cognitive_assessment"
                value={formData.cognitive_assessment}
                onChange={handleInputChange}
                rows={2}
                placeholder="Cognitive status, memory concerns, etc."
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none resize-none"
              />
            </div>
          </div>
        );

      case "ncd":
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-theme-text border-b border-theme pb-2">
              NCD / Chronic Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  NCD Classification
                </label>
                <input
                  type="text"
                  name="ncd_classification"
                  value={formData.ncd_classification}
                  onChange={handleInputChange}
                  placeholder="e.g. Hypertension, Diabetes"
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                  Diagnosis Date
                </label>
                <input
                  type="date"
                  name="diagnosis_date"
                  value={formData.diagnosis_date}
                  onChange={handleInputChange}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/barangay-bagocboc/health")}
          className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-theme-textSecondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            New Patient Record
          </h1>
          <p className="text-sm text-theme-textSecondary">
            Register a new patient in the health system
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Resident */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="font-semibold text-theme-text mb-4">
            Step 1: Select Resident
          </h3>

          {selectedResident ? (
            <div className="flex items-center justify-between p-4 bg-theme-background rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-theme-primary" />
                </div>
                <div>
                  <p className="font-semibold text-theme-text">
                    {selectedResident.first_name} {selectedResident.last_name}
                  </p>
                  <p className="text-sm text-theme-textSecondary">
                    {selectedResident.gender} •{" "}
                    {selectedResident.age || "N/A"} yrs
                    {selectedResident.phone_number &&
                      ` • ${selectedResident.phone_number}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResident(null)}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search residents by name or phone..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={`w-full px-4 py-3 bg-theme-background border rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none ${getFieldError("resident")
                    ? "border-red-500"
                    : "border-theme"
                    }`}
                  data-error={!!getFieldError("resident")}
                />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-5 h-5 animate-spin text-theme-textSecondary" />
                  </div>
                )}
              </div>

              {getFieldError("resident") && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {getFieldError("resident")}
                </p>
              )}

              {showSearchResults && (
                <div className="border border-theme rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.resident.id}
                      type="button"
                      onClick={() => handleSelectResident(result)}
                      className="w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors border-b border-theme last:border-0 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-theme-text">
                          {result.resident.first_name}{" "}
                          {result.resident.last_name}
                        </p>
                        <p className="text-sm text-theme-textSecondary">
                          {result.resident.gender} •{" "}
                          {result.resident.age || "N/A"} yrs
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                        Available
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 &&
                !isSearching &&
                searchResults.length === 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        No matching residents found.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/barangay-bagocboc/residents/new")
                        }
                        className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        Register a new resident first
                      </button>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Step 2: Patient Type */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="font-semibold text-theme-text mb-4">
            Step 2: Select Patient Type
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {PATIENT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.patient_type === type.value;
              const colors = {
                pink: "border-pink-300 dark:border-pink-700 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400",
                green:
                  "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
                purple:
                  "border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
                amber:
                  "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
                red: "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
              };
              const colorClass =
                colors[type.color as keyof typeof colors] || "";

              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      patient_type: type.value,
                    }))
                  }
                  className={`p-4 border-2 rounded-xl text-center transition-all ${isSelected
                    ? `${colorClass} border-2`
                    : "border-theme hover:border-theme-primary/50 text-theme-textSecondary hover:text-theme-text"
                    }`}
                  data-error={!!getFieldError("patient_type")}
                >
                  <Icon
                    className={`w-6 h-6 mx-auto mb-2 ${isSelected ? "" : "text-theme-textSecondary"
                      }`}
                  />
                  <p className="text-sm font-medium">{type.label}</p>
                </button>
              );
            })}
          </div>
          {getFieldError("patient_type") && (
            <p className="text-sm text-red-500 mt-2">
              {getFieldError("patient_type")}
            </p>
          )}
        </div>

        {/* Step 3: Vital Signs */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="font-semibold text-theme-text mb-4">
            Step 3: Vital Signs
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Blood Pressure
              </label>
              <input
                type="text"
                name="vital_blood_pressure"
                value={formData.vital_signs.blood_pressure}
                onChange={handleInputChange}
                placeholder="e.g. 120/80"
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Heart Rate (bpm)
              </label>
              <input
                type="number"
                name="vital_heart_rate"
                value={formData.vital_signs.heart_rate}
                onChange={handleInputChange}
                min={0}
                max={300}
                placeholder="e.g. 72"
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                name="vital_temperature"
                value={formData.vital_signs.temperature}
                onChange={handleInputChange}
                min={30}
                max={45}
                placeholder="e.g. 36.5"
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Respiratory Rate
              </label>
              <input
                type="number"
                name="vital_respiratory_rate"
                value={formData.vital_signs.respiratory_rate}
                onChange={handleInputChange}
                min={0}
                max={100}
                placeholder="e.g. 16"
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                name="vital_weight"
                value={formData.vital_signs.weight}
                onChange={handleInputChange}
                min={0}
                max={500}
                placeholder="e.g. 65.5"
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                step="0.1"
                name="vital_height"
                value={formData.vital_signs.height}
                onChange={handleInputChange}
                min={0}
                max={300}
                placeholder="e.g. 165.5"
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Type-specific fields */}
        {formData.patient_type && (
          <div className="bg-theme-surface border border-theme rounded-xl p-6">
            {renderTypeSpecificFields()}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/barangay-bagocboc/health")}
            className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting || !selectedResident || !formData.patient_type
            }
            className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Patient Record
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}