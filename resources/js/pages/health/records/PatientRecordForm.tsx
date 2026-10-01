// src/pages/health/records/PatientRecordForm.tsx

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
    immunization_status: "",
    prenatal_logs: "",
    medical_history: "",
    current_medications: "",

    // Child
    birth_weight: "",
    birth_height: "",
    birth_head_circumference: "",
    gestational_age_at_birth: "",
    birth_type: "",
    birth_complications: "",
    immunization_history: "",
    chronic_conditions: "",
    current_weight: "",
    current_height: "",
    current_muac: "",

    // Lactating
    breastfeeding_status: "",
    infant_age: "",
    feeding_method: "",
    latching_assessment: "",
    nutritional_status: "",
    family_planning_method: "",
    maternal_health_status: "",
    infant_weight: "",
    infant_health_status: "",

    // Senior
    falls_risk_score: "",
    cognitive_assessment: "",
    memory_status: "",
    medication_list: "",
    activity_level: "",
    support_system: "",
    emergency_contact: "",

    // NCD
    ncd_classification: "",
    diagnosis_date: "",
    medications: "",
    complications: "",
    lifestyle_factors: "",
    treatment_history: "",
    current_status: "",
    lab_results_text: "", // free-text, converted to array before submit

    // Shared across types
    allergies: "",
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
     INPUT HANDLING
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
     VALIDATION
     ============================================================ */

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedResident) newErrors.resident = "Please select a resident";
    if (!formData.patient_type)
      newErrors.patient_type = "Please select a patient type";

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
      return;
    }

    setIsSubmitting(true);
    try {
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

      const toStringOrNull = (v: any) => {
        if (v === "" || v === null || v === undefined) return null;
        return String(v);
      };

      const payload: Record<string, any> = {
        resident_id: selectedResident.id,
        patient_type: formData.patient_type,
        vital_signs:
          Object.keys(cleanVitals).length > 0 ? cleanVitals : null,
      };

      if (formData.patient_type === "pregnant") {
        Object.assign(payload, {
          last_menstrual_period: toStringOrNull(
            formData.last_menstrual_period,
          ),
          expected_delivery_date: toStringOrNull(
            formData.expected_delivery_date,
          ),
          gestational_age: toNumOrNull(formData.gestational_age),
          gravida: toNumOrNull(formData.gravida),
          para: toNumOrNull(formData.para),
          obstetric_history: toStringOrNull(formData.obstetric_history),
          risk_level: formData.risk_level || "low",
          immunization_status: toStringOrNull(formData.immunization_status),
          prenatal_logs: toStringOrNull(formData.prenatal_logs),
          medical_history: toStringOrNull(formData.medical_history),
          current_medications: toStringOrNull(formData.current_medications),
          allergies: toStringOrNull(formData.allergies),
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
          birth_type: toStringOrNull(formData.birth_type),
          birth_complications: toStringOrNull(
            formData.birth_complications,
          ),
          immunization_history: toStringOrNull(
            formData.immunization_history,
          ),
          chronic_conditions: toStringOrNull(formData.chronic_conditions),
          current_weight: toNumOrNull(formData.current_weight),
          current_height: toNumOrNull(formData.current_height),
          current_muac: toNumOrNull(formData.current_muac),
          allergies: toStringOrNull(formData.allergies),
        });
      } else if (formData.patient_type === "lactating") {
        Object.assign(payload, {
          breastfeeding_status: toStringOrNull(
            formData.breastfeeding_status,
          ),
          infant_age: toNumOrNull(formData.infant_age),
          feeding_method: toStringOrNull(formData.feeding_method),
          latching_assessment: toStringOrNull(
            formData.latching_assessment,
          ),
          nutritional_status: toStringOrNull(formData.nutritional_status),
          family_planning_method: toStringOrNull(
            formData.family_planning_method,
          ),
          maternal_health_status: toStringOrNull(
            formData.maternal_health_status,
          ),
          infant_weight: toNumOrNull(formData.infant_weight),
          infant_health_status: toStringOrNull(
            formData.infant_health_status,
          ),
        });
      } else if (formData.patient_type === "senior") {
        Object.assign(payload, {
          falls_risk_score: toNumOrNull(formData.falls_risk_score),
          cognitive_assessment: toStringOrNull(
            formData.cognitive_assessment,
          ),
          memory_status: toStringOrNull(formData.memory_status),
          medication_list: toStringOrNull(formData.medication_list),
          activity_level: toStringOrNull(formData.activity_level),
          support_system: toStringOrNull(formData.support_system),
          emergency_contact: toStringOrNull(formData.emergency_contact),
          chronic_conditions: toStringOrNull(formData.chronic_conditions),
          allergies: toStringOrNull(formData.allergies),
        });
      } else if (formData.patient_type === "ncd") {
        // Convert free-text lab results into a simple key/value object
        const labResults: Record<string, string> = {};
        if (formData.lab_results_text.trim()) {
          formData.lab_results_text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .forEach((line) => {
              const [k, ...v] = line.split(":");
              if (k && v.length) labResults[k.trim()] = v.join(":").trim();
              else if (k) labResults[k.trim()] = "";
            });
        }

        Object.assign(payload, {
          ncd_classification: toStringOrNull(formData.ncd_classification),
          diagnosis_date: toStringOrNull(formData.diagnosis_date),
          lab_results:
            Object.keys(labResults).length > 0 ? labResults : null,
          medications: toStringOrNull(formData.medications),
          complications: toStringOrNull(formData.complications),
          lifestyle_factors: toStringOrNull(formData.lifestyle_factors),
          treatment_history: toStringOrNull(formData.treatment_history),
          current_status: formData.current_status || "monitoring",
          allergies: toStringOrNull(formData.allergies),
        });
      }

      const response = await healthApi.createPatient(payload);

      toast.success("Patient record created successfully!");

      const recordId = response.data?.data?.id;
      if (recordId) {
        navigate(`/barangay-bagocboc/health/records/${recordId}`);
      } else {
        navigate("/barangay-bagocboc/health");
      }

      onSuccess?.();
    } catch (error: any) {
      console.error("❌ Full error:", error?.response?.data);
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
      } else {
        toast.error(
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create patient record",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ============================================================
     HELPERS
     ============================================================ */

  const getFieldError = (key: string) => errors[key];

  /* ============================================================
     SHARED INPUTS
     ============================================================ */

  const TextInput = ({
    name,
    value,
    placeholder,
    type = "text",
    error,
    required,
  }: {
    name: string;
    value: string;
    placeholder?: string;
    type?: string;
    error?: string;
    required?: boolean;
  }) => (
    <>
      <input
        type={type}
        name={name}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 bg-theme-background border rounded-lg text-theme-text placeholder:text-theme-textSecondary/60 focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none transition-all ${error ? "border-red-500" : "border-theme"
          }`}
        data-required={required}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </>
  );

  const NumberInput = ({
    name,
    value,
    placeholder,
    step,
    min,
    max,
    suffix,
  }: {
    name: string;
    value: string;
    placeholder?: string;
    step?: string;
    min?: number;
    max?: number;
    suffix?: string;
  }) => (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        name={name}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        className="w-full pl-3 pr-14 py-2 bg-theme-background border border-theme rounded-lg text-theme-text placeholder:text-theme-textSecondary/60 focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none transition-all"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-theme-textSecondary pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );

  const TextArea = ({
    name,
    value,
    placeholder,
    rows = 2,
  }: {
    name: string;
    value: string;
    placeholder?: string;
    rows?: number;
  }) => (
    <textarea
      name={name}
      value={value}
      onChange={handleInputChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text placeholder:text-theme-textSecondary/60 focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none transition-all resize-none"
    />
  );

  const Label = ({
    children,
    required,
  }: {
    children: React.ReactNode;
    required?: boolean;
  }) => (
    <label className="block text-xs font-medium text-theme-textSecondary mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h4 className="font-semibold text-theme-text border-b border-theme pb-2 mb-3 mt-1">
      {children}
    </h4>
  );

  /* ============================================================
     RENDER TYPE-SPECIFIC FIELDS
     ============================================================ */

  const renderTypeSpecificFields = () => {
    switch (formData.patient_type) {
      case "pregnant":
        return (
          <div className="space-y-4">
            <SectionTitle>Pregnancy Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Last Menstrual Period</Label>
                <TextInput
                  type="date"
                  name="last_menstrual_period"
                  value={formData.last_menstrual_period}
                />
              </div>
              <div>
                <Label>Expected Delivery Date</Label>
                <TextInput
                  type="date"
                  name="expected_delivery_date"
                  value={formData.expected_delivery_date}
                  error={getFieldError("expected_delivery_date")}
                />
              </div>
              <div>
                <Label>Gestational Age (weeks)</Label>
                <NumberInput
                  name="gestational_age"
                  value={formData.gestational_age}
                  min={0}
                  max={45}
                  placeholder="e.g. 24"
                />
              </div>
              <div>
                <Label>Risk Level</Label>
                <select
                  name="risk_level"
                  value={formData.risk_level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <Label>Gravida</Label>
                <NumberInput
                  name="gravida"
                  value={formData.gravida}
                  min={0}
                  max={20}
                  placeholder="e.g. 2"
                />
              </div>
              <div>
                <Label>Para</Label>
                <NumberInput
                  name="para"
                  value={formData.para}
                  min={0}
                  max={20}
                  placeholder="e.g. 1"
                />
              </div>
              <div>
                <Label>Immunization Status</Label>
                <TextInput
                  name="immunization_status"
                  value={formData.immunization_status}
                  placeholder="e.g. Td 2 doses"
                />
              </div>
              <div>
                <Label>Allergies</Label>
                <TextInput
                  name="allergies"
                  value={formData.allergies}
                  placeholder="Any known allergies"
                />
              </div>
            </div>
            <div>
              <Label>Obstetric History</Label>
              <TextArea
                name="obstetric_history"
                value={formData.obstetric_history}
                placeholder="Previous pregnancies, complications, etc."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Medical History</Label>
                <TextArea
                  name="medical_history"
                  value={formData.medical_history}
                  placeholder="Chronic conditions, surgeries, etc."
                />
              </div>
              <div>
                <Label>Current Medications</Label>
                <TextArea
                  name="current_medications"
                  value={formData.current_medications}
                  placeholder="List of current medications"
                />
              </div>
            </div>
            <div>
              <Label>Prenatal Logs</Label>
              <TextArea
                name="prenatal_logs"
                value={formData.prenatal_logs}
                placeholder="Notes from prenatal visits"
                rows={3}
              />
            </div>
          </div>
        );

      case "child":
        return (
          <div className="space-y-4">
            <SectionTitle>Birth Information</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Birth Weight</Label>
                <NumberInput
                  name="birth_weight"
                  value={formData.birth_weight}
                  step="0.01"
                  min={0}
                  max={20}
                  placeholder="3.2"
                  suffix="kg"
                />
              </div>
              <div>
                <Label>Birth Height</Label>
                <NumberInput
                  name="birth_height"
                  value={formData.birth_height}
                  step="0.1"
                  min={0}
                  max={100}
                  placeholder="50.5"
                  suffix="cm"
                />
              </div>
              <div>
                <Label>Head Circumference</Label>
                <NumberInput
                  name="birth_head_circumference"
                  value={formData.birth_head_circumference}
                  step="0.1"
                  min={0}
                  max={60}
                  placeholder="34.5"
                  suffix="cm"
                />
              </div>
              <div>
                <Label>Gestational Age at Birth</Label>
                <NumberInput
                  name="gestational_age_at_birth"
                  value={formData.gestational_age_at_birth}
                  min={0}
                  max={45}
                  placeholder="38"
                  suffix="wks"
                />
              </div>
              <div>
                <Label>Birth Type</Label>
                <select
                  name="birth_type"
                  value={formData.birth_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none"
                >
                  <option value="">Select</option>
                  <option value="normal">Normal (Vaginal)</option>
                  <option value="cesarean">Cesarean</option>
                  <option value="assisted">Assisted</option>
                </select>
              </div>
              <div>
                <Label>Allergies</Label>
                <TextInput
                  name="allergies"
                  value={formData.allergies}
                  placeholder="Any known allergies"
                />
              </div>
            </div>

            <SectionTitle>Current Measurements</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Current Weight</Label>
                <NumberInput
                  name="current_weight"
                  value={formData.current_weight}
                  step="0.01"
                  min={0}
                  max={200}
                  placeholder="12.5"
                  suffix="kg"
                />
              </div>
              <div>
                <Label>Current Height</Label>
                <NumberInput
                  name="current_height"
                  value={formData.current_height}
                  step="0.1"
                  min={0}
                  max={250}
                  placeholder="95.5"
                  suffix="cm"
                />
              </div>
              <div>
                <Label>MUAC</Label>
                <NumberInput
                  name="current_muac"
                  value={formData.current_muac}
                  step="0.1"
                  min={0}
                  max={40}
                  placeholder="15.5"
                  suffix="cm"
                />
              </div>
            </div>

            <SectionTitle>Health Background</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Birth Complications</Label>
                <TextArea
                  name="birth_complications"
                  value={formData.birth_complications}
                  placeholder="Any complications at birth"
                />
              </div>
              <div>
                <Label>Chronic Conditions</Label>
                <TextArea
                  name="chronic_conditions"
                  value={formData.chronic_conditions}
                  placeholder="Asthma, heart conditions, etc."
                />
              </div>
            </div>
            <div>
              <Label>Immunization History</Label>
              <TextArea
                name="immunization_history"
                value={formData.immunization_history}
                placeholder="Vaccines received so far"
                rows={3}
              />
            </div>
          </div>
        );

      case "lactating":
        return (
          <div className="space-y-4">
            <SectionTitle>Breastfeeding Details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Breastfeeding Status</Label>
                <select
                  name="breastfeeding_status"
                  value={formData.breastfeeding_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none"
                >
                  <option value="">Select status</option>
                  <option value="exclusive">Exclusive</option>
                  <option value="mixed">Mixed</option>
                  <option value="weaned">Weaned</option>
                </select>
              </div>
              <div>
                <Label>Infant Age (months)</Label>
                <NumberInput
                  name="infant_age"
                  value={formData.infant_age}
                  min={0}
                  max={60}
                  placeholder="4"
                />
              </div>
              <div>
                <Label>Feeding Method</Label>
                <TextInput
                  name="feeding_method"
                  value={formData.feeding_method}
                  placeholder="e.g. Direct latch"
                />
              </div>
              <div>
                <Label>Nutritional Status</Label>
                <TextInput
                  name="nutritional_status"
                  value={formData.nutritional_status}
                  placeholder="e.g. Normal"
                />
              </div>
              <div>
                <Label>Family Planning Method</Label>
                <TextInput
                  name="family_planning_method"
                  value={formData.family_planning_method}
                  placeholder="e.g. Pills, IUD"
                />
              </div>
              <div>
                <Label>Infant Weight</Label>
                <NumberInput
                  name="infant_weight"
                  value={formData.infant_weight}
                  step="0.1"
                  min={0}
                  max={30}
                  placeholder="5.5"
                  suffix="kg"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Latching Assessment</Label>
                <TextArea
                  name="latching_assessment"
                  value={formData.latching_assessment}
                  placeholder="Notes on latching quality"
                />
              </div>
              <div>
                <Label>Maternal Health Status</Label>
                <TextArea
                  name="maternal_health_status"
                  value={formData.maternal_health_status}
                  placeholder="Mother's condition"
                />
              </div>
            </div>
            <div>
              <Label>Infant Health Status</Label>
              <TextArea
                name="infant_health_status"
                value={formData.infant_health_status}
                placeholder="Infant's condition"
                rows={3}
              />
            </div>
          </div>
        );

      case "senior":
        return (
          <div className="space-y-4">
            <SectionTitle>Assessment</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Falls Risk Score (0–10)</Label>
                <NumberInput
                  name="falls_risk_score"
                  value={formData.falls_risk_score}
                  min={0}
                  max={10}
                  placeholder="3"
                />
              </div>
              <div>
                <Label>Memory Status</Label>
                <select
                  name="memory_status"
                  value={formData.memory_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none"
                >
                  <option value="">Select status</option>
                  <option value="normal">Normal</option>
                  <option value="mild_impairment">Mild Impairment</option>
                  <option value="moderate_impairment">Moderate Impairment</option>
                  <option value="severe_impairment">Severe Impairment</option>
                </select>
              </div>
              <div>
                <Label>Activity Level</Label>
                <select
                  name="activity_level"
                  value={formData.activity_level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none"
                >
                  <option value="">Select level</option>
                  <option value="active">Active</option>
                  <option value="moderate">Moderate</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="bedridden">Bedridden</option>
                </select>
              </div>
              <div>
                <Label>Emergency Contact</Label>
                <TextInput
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  placeholder="Name & number"
                />
              </div>
              <div>
                <Label>Allergies</Label>
                <TextInput
                  name="allergies"
                  value={formData.allergies}
                  placeholder="Any known allergies"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cognitive Assessment</Label>
                <TextArea
                  name="cognitive_assessment"
                  value={formData.cognitive_assessment}
                  placeholder="Cognitive status notes"
                />
              </div>
              <div>
                <Label>Chronic Conditions</Label>
                <TextArea
                  name="chronic_conditions"
                  value={formData.chronic_conditions}
                  placeholder="Hypertension, diabetes, etc."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Medication List</Label>
                <TextArea
                  name="medication_list"
                  value={formData.medication_list}
                  placeholder="Current medications"
                  rows={3}
                />
              </div>
              <div>
                <Label>Support System</Label>
                <TextArea
                  name="support_system"
                  value={formData.support_system}
                  placeholder="Family, caregivers, etc."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case "ncd":
        return (
          <div className="space-y-4">
            <SectionTitle>Diagnosis</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>NCD Classification</Label>
                <TextInput
                  name="ncd_classification"
                  value={formData.ncd_classification}
                  placeholder="e.g. Hypertension, Diabetes"
                />
              </div>
              <div>
                <Label>Diagnosis Date</Label>
                <TextInput
                  type="date"
                  name="diagnosis_date"
                  value={formData.diagnosis_date}
                />
              </div>
              <div>
                <Label>Current Status</Label>
                <select
                  name="current_status"
                  value={formData.current_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none"
                >
                  <option value="">Select status</option>
                  <option value="stable">Stable</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <Label>Allergies</Label>
                <TextInput
                  name="allergies"
                  value={formData.allergies}
                  placeholder="Any known allergies"
                />
              </div>
            </div>

            <SectionTitle>Clinical Details</SectionTitle>
            <div>
              <Label>
                Lab Results (one per line, "name: value" format)
              </Label>
              <TextArea
                name="lab_results_text"
                value={formData.lab_results_text}
                placeholder={"FBS: 5.6\nCholesterol: 180\nCreatinine: 0.9"}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Medications</Label>
                <TextArea
                  name="medications"
                  value={formData.medications}
                  placeholder="Current medications"
                  rows={3}
                />
              </div>
              <div>
                <Label>Complications</Label>
                <TextArea
                  name="complications"
                  value={formData.complications}
                  placeholder="Any complications"
                  rows={3}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Lifestyle Factors</Label>
                <TextArea
                  name="lifestyle_factors"
                  value={formData.lifestyle_factors}
                  placeholder="Smoking, alcohol, exercise, diet"
                  rows={3}
                />
              </div>
              <div>
                <Label>Treatment History</Label>
                <TextArea
                  name="treatment_history"
                  value={formData.treatment_history}
                  placeholder="Past treatments, surgeries"
                  rows={3}
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
              const colorMap: Record<string, string> = {
                pink: "border-pink-300 dark:border-pink-700 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400",
                green:
                  "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
                purple:
                  "border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
                amber:
                  "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
                red: "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
              };
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
                      ? colorMap[type.color]
                      : "border-theme hover:border-theme-primary/50 text-theme-textSecondary hover:text-theme-text"
                    }`}
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
              <Label>Blood Pressure</Label>
              <TextInput
                name="vital_blood_pressure"
                value={formData.vital_signs.blood_pressure}
                placeholder="120/80"
              />
            </div>
            <div>
              <Label>Heart Rate</Label>
              <NumberInput
                name="vital_heart_rate"
                value={formData.vital_signs.heart_rate}
                min={0}
                max={300}
                placeholder="72"
                suffix="bpm"
              />
            </div>
            <div>
              <Label>Temperature</Label>
              <NumberInput
                name="vital_temperature"
                value={formData.vital_signs.temperature}
                step="0.1"
                min={30}
                max={45}
                placeholder="36.5"
                suffix="°C"
              />
            </div>
            <div>
              <Label>Respiratory Rate</Label>
              <NumberInput
                name="vital_respiratory_rate"
                value={formData.vital_signs.respiratory_rate}
                min={0}
                max={100}
                placeholder="16"
              />
            </div>
            <div>
              <Label>Weight</Label>
              <NumberInput
                name="vital_weight"
                value={formData.vital_signs.weight}
                step="0.1"
                min={0}
                max={500}
                placeholder="65.5"
                suffix="kg"
              />
            </div>
            <div>
              <Label>Height</Label>
              <NumberInput
                name="vital_height"
                value={formData.vital_signs.height}
                step="0.1"
                min={0}
                max={300}
                placeholder="165.5"
                suffix="cm"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Type-specific */}
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