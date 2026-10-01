// src/pages/health/checkups/CheckupForm.tsx

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Heart,
  Baby,
  Droplet,
  User as UserIcon,
  Activity,
  Stethoscope,
  X,
  Calendar,
  ClipboardList,
  Thermometer,
  Ruler,
  Weight,
  Pill,
} from "lucide-react";
import { healthApi } from "../../../api/endpoints";
import toast from "react-hot-toast";

const PATIENT_TYPE_LABELS: Record<string, string> = {
  pregnant: "Pregnancy",
  child: "Child",
  lactating: "Lactating",
  senior: "Senior",
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

export default function CheckupForm() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<Record<string, any>>({
    checkup_date: today,

    // Shared
    assessment: "",
    recommendations: "",
    follow_up_date: "",
    notes: "",

    // Pregnancy
    maternal_vitals: {
      blood_pressure: "",
      heart_rate: "",
      temperature: "",
      weight: "",
    },
    fetal_assessment: "",
    fetal_heart_rate: "",
    fundal_height: "",
    interventions: "",
    micronutrients: "",
    iron_supplement: false,
    folic_acid: false,

    // Child
    weight: "",
    height: "",
    muac: "",
    head_circumference: "",
    vaccines_given_text: "",
    developmental_assessment: "",
    developmental_milestones_text: "",
    nutritional_status: "",
    nutritional_counseling: "",

    // Lactating
    feeding_method: "",
    latching_assessment: "",
    engorgement_status: "",
    infant_weight: "",
    infant_health_status: "",
    family_planning_counseling: "",
    family_planning_method: "",

    // Senior
    vitals: {
      blood_pressure: "",
      heart_rate: "",
      temperature: "",
    },
    blood_sugar: "",
    falls_reassessment: "",
    cognitive_check: "",
    medication_adherence: "",
    medications_refilled_text: "",

    // NCD
    vitals_ncd: {
      blood_pressure: "",
      heart_rate: "",
      temperature: "",
    },
    lab_results_text: "",
    medication_adherence_ncd: "",
    medications_refilled_ncd_text: "",
    lifestyle_counseling: "",
    dietary_counseling: "",
    exercise_recommendations: "",
    complication_monitoring: "",
  });

  useEffect(() => {
    if (patientId) fetchPatient();
  }, [patientId]);

  const fetchPatient = async () => {
    setIsLoading(true);
    try {
      const response = await healthApi.getPatientById(parseInt(patientId!));
      setPatient(response.data?.data || null);
    } catch (error) {
      console.error("Error fetching patient:", error);
      toast.error("Failed to load patient");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    // Nested fields use "group_key" convention
    if (name.startsWith("maternal_vitals_")) {
      const key = name.replace("maternal_vitals_", "");
      setFormData((prev) => ({
        ...prev,
        maternal_vitals: { ...prev.maternal_vitals, [key]: value },
      }));
    } else if (name.startsWith("vitals_ncd_")) {
      const key = name.replace("vitals_ncd_", "");
      setFormData((prev) => ({
        ...prev,
        vitals_ncd: { ...prev.vitals_ncd, [key]: value },
      }));
    } else if (name.startsWith("vitals_")) {
      const key = name.replace("vitals_", "");
      setFormData((prev) => ({
        ...prev,
        vitals: { ...prev.vitals, [key]: value },
      }));
    } else if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.checkup_date)
      newErrors.checkup_date = "Checkup date is required";
    if (!formData.assessment?.trim())
      newErrors.assessment = "Please enter your assessment";
    if (
      formData.follow_up_date &&
      formData.checkup_date &&
      new Date(formData.follow_up_date) < new Date(formData.checkup_date)
    ) {
      newErrors.follow_up_date =
        "Follow-up must be on or after the checkup date";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

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

      const endpoint = endpoints[patient.patient_type];
      if (!endpoint) {
        toast.error("Unknown patient type");
        return;
      }

      // Build type-specific payload
      const payload: Record<string, any> = {
        checkup_date: formData.checkup_date,
        assessment: formData.assessment,
        recommendations: formData.recommendations || null,
        follow_up_date: formData.follow_up_date || null,
        notes: formData.notes || null,
      };

      if (patient.patient_type === "pregnant") {
        Object.assign(payload, {
          maternal_vitals: compactObject(formData.maternal_vitals),
          fetal_assessment: formData.fetal_assessment || null,
          fetal_heart_rate: numOrNull(formData.fetal_heart_rate),
          fundal_height: numOrNull(formData.fundal_height),
          interventions: formData.interventions || null,
          micronutrients: formData.micronutrients || null,
          iron_supplement: !!formData.iron_supplement,
          folic_acid: !!formData.folic_acid,
        });
      } else if (patient.patient_type === "child") {
        Object.assign(payload, {
          weight: numOrNull(formData.weight),
          height: numOrNull(formData.height),
          muac: numOrNull(formData.muac),
          head_circumference: numOrNull(formData.head_circumference),
          vaccines_given: parseLines(formData.vaccines_given_text),
          developmental_assessment: formData.developmental_assessment || null,
          developmental_milestones: parseLines(
            formData.developmental_milestones_text,
          ),
          nutritional_status: formData.nutritional_status || null,
          nutritional_counseling: formData.nutritional_counseling || null,
        });
      } else if (patient.patient_type === "lactating") {
        Object.assign(payload, {
          feeding_method: formData.feeding_method || null,
          latching_assessment: formData.latching_assessment || null,
          engorgement_status: formData.engorgement_status || null,
          nutritional_counseling: formData.nutritional_counseling || null,
          infant_weight: numOrNull(formData.infant_weight),
          infant_health_status: formData.infant_health_status || null,
          family_planning_counseling:
            formData.family_planning_counseling || null,
          family_planning_method: formData.family_planning_method || null,
        });
      } else if (patient.patient_type === "senior") {
        Object.assign(payload, {
          vitals: compactObject(formData.vitals),
          blood_sugar: numOrNull(formData.blood_sugar),
          falls_reassessment: numOrNull(formData.falls_reassessment),
          cognitive_check: formData.cognitive_check || null,
          medication_adherence: formData.medication_adherence || null,
          medications_refilled: parseLines(formData.medications_refilled_text),
        });
      } else if (patient.patient_type === "ncd") {
        Object.assign(payload, {
          vitals: compactObject(formData.vitals_ncd),
          lab_results: parseKeyValue(formData.lab_results_text),
          medication_adherence:
            formData.medication_adherence_ncd || null,
          medications_refilled: parseLines(
            formData.medications_refilled_ncd_text,
          ),
          lifestyle_counseling: formData.lifestyle_counseling || null,
          dietary_counseling: formData.dietary_counseling || null,
          exercise_recommendations:
            formData.exercise_recommendations || null,
          complication_monitoring:
            formData.complication_monitoring || null,
        });
      }

      await endpoint(patient.id, payload);
      toast.success("Checkup recorded successfully!");
      navigate(`/barangay-bagocboc/health/records/${patientId}`);
    } catch (error: any) {
      console.error("❌ Validation errors:", error?.response?.data);
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
        toast.error(error?.response?.data?.message || "Failed to save checkup");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ============================================================
     HELPERS
     ============================================================ */

  const numOrNull = (v: any) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const compactObject = (obj: Record<string, any>) => {
    const cleaned = Object.fromEntries(
      Object.entries(obj).filter(
        ([_, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );
    return Object.keys(cleaned).length > 0 ? cleaned : null;
  };

  const parseLines = (text: string): string[] | null => {
    if (!text?.trim()) return null;
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.length > 0 ? lines : null;
  };

  const parseKeyValue = (text: string): Record<string, string> | null => {
    if (!text?.trim()) return null;
    const out: Record<string, string> = {};
    text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        const [k, ...v] = line.split(":");
        if (k && v.length) out[k.trim()] = v.join(":").trim();
        else if (k) out[k.trim()] = "";
      });
    return Object.keys(out).length > 0 ? out : null;
  };

  /* ============================================================
     SHARED INPUTS
     ============================================================ */

  const Field = ({
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
  }) => (
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

  const TextInput = ({
    name,
    value,
    placeholder,
    type = "text",
  }: {
    name: string;
    value: string;
    placeholder?: string;
    type?: string;
  }) => (
    <input
      type={type}
      name={name}
      value={value}
      onChange={handleInputChange}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 bg-theme-background border border-theme rounded-lg text-theme-text placeholder:text-theme-textSecondary/60 focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none transition-all"
    />
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
        className="w-full pl-3.5 pr-14 py-2.5 bg-theme-background border border-theme rounded-lg text-theme-text placeholder:text-theme-textSecondary/60 focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none transition-all"
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
      className="w-full px-3.5 py-2.5 bg-theme-background border border-theme rounded-lg text-theme-text placeholder:text-theme-textSecondary/60 focus:ring-2 focus:ring-theme-primary/30 focus:border-theme-primary outline-none transition-all resize-none"
    />
  );

  const Checkbox = ({
    name,
    label,
    checked,
  }: {
    name: string;
    label: string;
    checked: boolean;
  }) => (
    <label className="flex items-center gap-2 text-sm text-theme-text cursor-pointer">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={handleInputChange}
        className="w-4 h-4 rounded border-theme text-theme-primary focus:ring-theme-primary"
      />
      {label}
    </label>
  );

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

  /* ============================================================
     RENDER CHECKUP FORM BY TYPE
     ============================================================ */

  const renderForm = () => {
    if (!patient) return null;
    const type = patient.patient_type;

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
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
                name="checkup_date"
                value={formData.checkup_date}
              />
            </Field>
            <Field label="Follow-up Date" error={errors.follow_up_date}>
              <TextInput
                type="date"
                name="follow_up_date"
                value={formData.follow_up_date}
              />
            </Field>
          </div>
        </div>

        {/* ============ PREGNANT ============ */}
        {type === "pregnant" && (
          <>
            <div>
              <SectionHeader
                icon={Heart}
                title="Maternal Vitals"
                subtitle="Current measurements"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Blood Pressure">
                  <TextInput
                    name="maternal_vitals_blood_pressure"
                    value={formData.maternal_vitals.blood_pressure}
                    placeholder="120/80"
                  />
                </Field>
                <Field label="Heart Rate">
                  <NumberInput
                    name="maternal_vitals_heart_rate"
                    value={formData.maternal_vitals.heart_rate}
                    suffix="bpm"
                  />
                </Field>
                <Field label="Weight">
                  <NumberInput
                    name="maternal_vitals_weight"
                    value={formData.maternal_vitals.weight}
                    step="0.1"
                    suffix="kg"
                  />
                </Field>
                <Field label="Temperature">
                  <NumberInput
                    name="maternal_vitals_temperature"
                    value={formData.maternal_vitals.temperature}
                    step="0.1"
                    suffix="°C"
                  />
                </Field>
              </div>
            </div>

            <div>
              <SectionHeader
                icon={ClipboardList}
                title="Fetal Assessment"
                subtitle="Fetal health and measurements"
              />
              <div className="space-y-4">
                <Field label="Fetal Assessment Notes">
                  <TextArea
                    name="fetal_assessment"
                    value={formData.fetal_assessment}
                    placeholder="FHT, movement, position..."
                  />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Fetal Heart Rate">
                    <NumberInput
                      name="fetal_heart_rate"
                      value={formData.fetal_heart_rate}
                      suffix="bpm"
                    />
                  </Field>
                  <Field label="Fundal Height">
                    <NumberInput
                      name="fundal_height"
                      value={formData.fundal_height}
                      step="0.1"
                      suffix="cm"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div>
              <SectionHeader
                icon={Pill}
                title="Interventions & Micronutrients"
                subtitle="Supplements and services provided"
              />
              <div className="space-y-4">
                <Field label="Interventions">
                  <TextArea
                    name="interventions"
                    value={formData.interventions}
                    placeholder="Services provided during this visit"
                  />
                </Field>
                <Field label="Micronutrients">
                  <TextArea
                    name="micronutrients"
                    value={formData.micronutrients}
                    placeholder="Micronutrient supplements given"
                  />
                </Field>
                <div className="flex gap-6 flex-wrap">
                  <Checkbox
                    name="iron_supplement"
                    label="Iron supplement given"
                    checked={!!formData.iron_supplement}
                  />
                  <Checkbox
                    name="folic_acid"
                    label="Folic acid given"
                    checked={!!formData.folic_acid}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============ CHILD ============ */}
        {type === "child" && (
          <>
            <div>
              <SectionHeader
                icon={Weight}
                title="Growth Measurements"
                subtitle="Current measurements"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Weight" required>
                  <NumberInput
                    name="weight"
                    value={formData.weight}
                    step="0.01"
                    suffix="kg"
                  />
                </Field>
                <Field label="Height" required>
                  <NumberInput
                    name="height"
                    value={formData.height}
                    step="0.1"
                    suffix="cm"
                  />
                </Field>
                <Field label="MUAC">
                  <NumberInput
                    name="muac"
                    value={formData.muac}
                    step="0.1"
                    suffix="cm"
                  />
                </Field>
                <Field label="Head Circumference">
                  <NumberInput
                    name="head_circumference"
                    value={formData.head_circumference}
                    step="0.1"
                    suffix="cm"
                  />
                </Field>
              </div>
            </div>

            <div>
              <SectionHeader
                icon={Baby}
                title="Vaccination & Development"
                subtitle="Vaccines given and development notes"
              />
              <div className="space-y-4">
                <Field
                  label="Vaccines Given"
                  hint="One vaccine per line (e.g. BCG — 2026-10-01)"
                >
                  <TextArea
                    name="vaccines_given_text"
                    value={formData.vaccines_given_text}
                    rows={3}
                    placeholder={"BCG — 2026-10-01\nHepB — 2026-10-01"}
                  />
                </Field>
                <Field label="Developmental Assessment">
                  <TextArea
                    name="developmental_assessment"
                    value={formData.developmental_assessment}
                    placeholder="Overall developmental notes"
                  />
                </Field>
                <Field
                  label="Developmental Milestones"
                  hint="One milestone per line"
                >
                  <TextArea
                    name="developmental_milestones_text"
                    value={formData.developmental_milestones_text}
                    rows={3}
                    placeholder={"Can sit without support\nSays 'mama' and 'dada'"}
                  />
                </Field>
              </div>
            </div>

            <div>
              <SectionHeader
                icon={Pill}
                title="Nutrition"
                subtitle="Nutrition status and counseling"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nutritional Status">
                  <TextInput
                    name="nutritional_status"
                    value={formData.nutritional_status}
                    placeholder="Normal / Underweight / etc."
                  />
                </Field>
                <Field label="Nutritional Counseling">
                  <TextInput
                    name="nutritional_counseling"
                    value={formData.nutritional_counseling}
                    placeholder="Counseling notes"
                  />
                </Field>
              </div>
            </div>
          </>
        )}

        {/* ============ LACTATING ============ */}
        {type === "lactating" && (
          <>
            <div>
              <SectionHeader
                icon={Droplet}
                title="Feeding Assessment"
                subtitle="Lactation details"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Feeding Method">
                  <TextInput
                    name="feeding_method"
                    value={formData.feeding_method}
                    placeholder="e.g. Exclusive breastfeeding"
                  />
                </Field>
                <Field label="Latching Assessment">
                  <TextInput
                    name="latching_assessment"
                    value={formData.latching_assessment}
                    placeholder="e.g. Good latch"
                  />
                </Field>
                <Field label="Engorgement Status">
                  <TextInput
                    name="engorgement_status"
                    value={formData.engorgement_status}
                    placeholder="None / Mild / Severe"
                  />
                </Field>
                <Field label="Infant Weight">
                  <NumberInput
                    name="infant_weight"
                    value={formData.infant_weight}
                    step="0.1"
                    suffix="kg"
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Infant Health Status">
                  <TextArea
                    name="infant_health_status"
                    value={formData.infant_health_status}
                    placeholder="Infant's condition"
                  />
                </Field>
              </div>
            </div>

            <div>
              <SectionHeader
                icon={Pill}
                title="Counseling"
                subtitle="Nutrition and family planning"
              />
              <div className="space-y-4">
                <Field label="Nutritional Counseling">
                  <TextArea
                    name="nutritional_counseling"
                    value={formData.nutritional_counseling}
                    placeholder="Nutritional advice provided"
                  />
                </Field>
                <Field label="Family Planning Counseling">
                  <TextArea
                    name="family_planning_counseling"
                    value={formData.family_planning_counseling}
                    placeholder="Counseling notes"
                  />
                </Field>
                <Field label="Family Planning Method">
                  <TextInput
                    name="family_planning_method"
                    value={formData.family_planning_method}
                    placeholder="e.g. Pills, IUD"
                  />
                </Field>
              </div>
            </div>
          </>
        )}

        {/* ============ SENIOR ============ */}
        {type === "senior" && (
          <>
            <div>
              <SectionHeader
                icon={UserIcon}
                title="Vitals"
                subtitle="Current measurements"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Blood Pressure">
                  <TextInput
                    name="vitals_blood_pressure"
                    value={formData.vitals.blood_pressure}
                    placeholder="120/80"
                  />
                </Field>
                <Field label="Heart Rate">
                  <NumberInput
                    name="vitals_heart_rate"
                    value={formData.vitals.heart_rate}
                    suffix="bpm"
                  />
                </Field>
                <Field label="Temperature">
                  <NumberInput
                    name="vitals_temperature"
                    value={formData.vitals.temperature}
                    step="0.1"
                    suffix="°C"
                  />
                </Field>
              </div>
            </div>

            <div>
              <SectionHeader
                icon={Activity}
                title="Assessments"
                subtitle="Falls, cognitive, and adherence"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Blood Sugar">
                  <NumberInput
                    name="blood_sugar"
                    value={formData.blood_sugar}
                    step="0.1"
                    suffix="mmol/L"
                  />
                </Field>
                <Field label="Falls Reassessment (0–10)">
                  <NumberInput
                    name="falls_reassessment"
                    value={formData.falls_reassessment}
                    min={0}
                    max={10}
                  />
                </Field>
                <Field label="Cognitive Check">
                  <TextInput
                    name="cognitive_check"
                    value={formData.cognitive_check}
                    placeholder="e.g. Normal, mild impairment"
                  />
                </Field>
                <Field label="Medication Adherence">
                  <TextInput
                    name="medication_adherence"
                    value={formData.medication_adherence}
                    placeholder="e.g. Good, missed doses"
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field
                  label="Medications Refilled"
                  hint="One medication per line"
                >
                  <TextArea
                    name="medications_refilled_text"
                    value={formData.medications_refilled_text}
                    rows={3}
                    placeholder={"Amlodipine 5mg\nMetformin 500mg"}
                  />
                </Field>
              </div>
            </div>
          </>
        )}

        {/* ============ NCD ============ */}
        {type === "ncd" && (
          <>
            <div>
              <SectionHeader
                icon={Activity}
                title="Vitals"
                subtitle="Current measurements"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Blood Pressure">
                  <TextInput
                    name="vitals_ncd_blood_pressure"
                    value={formData.vitals_ncd.blood_pressure}
                    placeholder="120/80"
                  />
                </Field>
                <Field label="Heart Rate">
                  <NumberInput
                    name="vitals_ncd_heart_rate"
                    value={formData.vitals_ncd.heart_rate}
                    suffix="bpm"
                  />
                </Field>
                <Field label="Temperature">
                  <NumberInput
                    name="vitals_ncd_temperature"
                    value={formData.vitals_ncd.temperature}
                    step="0.1"
                    suffix="°C"
                  />
                </Field>
              </div>
            </div>

            <div>
              <SectionHeader
                icon={ClipboardList}
                title="Lab Results & Medications"
                subtitle="One item per line"
              />
              <div className="space-y-4">
                <Field
                  label="Lab Results"
                  hint={'Format: "Test name: value" (one per line)'}
                >
                  <TextArea
                    name="lab_results_text"
                    value={formData.lab_results_text}
                    rows={4}
                    placeholder={"FBS: 5.6\nCholesterol: 180\nCreatinine: 0.9"}
                  />
                </Field>
                <Field label="Medication Adherence">
                  <TextInput
                    name="medication_adherence_ncd"
                    value={formData.medication_adherence_ncd}
                    placeholder="e.g. Good, missed doses"
                  />
                </Field>
                <Field
                  label="Medications Refilled"
                  hint="One medication per line"
                >
                  <TextArea
                    name="medications_refilled_ncd_text"
                    value={formData.medications_refilled_ncd_text}
                    rows={3}
                    placeholder={"Losartan 50mg\nAtorvastatin 20mg"}
                  />
                </Field>
              </div>
            </div>

            <div>
              <SectionHeader
                icon={Pill}
                title="Counseling & Monitoring"
                subtitle="Lifestyle advice and follow-up"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Lifestyle Counseling">
                  <TextArea
                    name="lifestyle_counseling"
                    value={formData.lifestyle_counseling}
                    placeholder="Smoking, alcohol, sleep"
                  />
                </Field>
                <Field label="Dietary Counseling">
                  <TextArea
                    name="dietary_counseling"
                    value={formData.dietary_counseling}
                    placeholder="Diet advice"
                  />
                </Field>
                <Field label="Exercise Recommendations">
                  <TextArea
                    name="exercise_recommendations"
                    value={formData.exercise_recommendations}
                    placeholder="Physical activity advice"
                  />
                </Field>
                <Field label="Complication Monitoring">
                  <TextArea
                    name="complication_monitoring"
                    value={formData.complication_monitoring}
                    placeholder="Monitoring notes"
                  />
                </Field>
              </div>
            </div>
          </>
        )}

        {/* Shared Clinical Assessment */}
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
                name="assessment"
                value={formData.assessment}
                rows={3}
                placeholder="Describe what you observed during this visit..."
              />
            </Field>
            <Field
              label="Recommendations"
              hint="Advice, medications, or next steps"
            >
              <TextArea
                name="recommendations"
                value={formData.recommendations}
                rows={2}
                placeholder="E.g. Return in 4 weeks, continue supplements..."
              />
            </Field>
            <Field label="Notes">
              <TextArea
                name="notes"
                value={formData.notes}
                rows={2}
                placeholder="Additional notes..."
              />
            </Field>
          </div>
        </div>

        {/* Sticky Actions */}
        <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-theme-surface border-t border-theme flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(`/barangay-bagocboc/health/records/${patientId}`)
            }
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
     LOADING / ERROR
     ============================================================ */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
          <p className="text-sm text-theme-textSecondary">Loading patient...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-theme-textSecondary mb-4" />
        <h3 className="text-lg font-semibold text-theme-text">
          Patient not found
        </h3>
        <p className="text-theme-textSecondary">
          The requested patient does not exist.
        </p>
      </div>
    );
  }

  const resident = patient.resident || {};
  const TypeIcon = PATIENT_TYPE_ICONS[patient.patient_type] || UserIcon;
  const typeColor = PATIENT_TYPE_COLORS[patient.patient_type] || "green";

  const colorClassMap: Record<string, string> = {
    pink: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400",
    green:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    purple:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    amber:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() =>
            navigate(`/barangay-bagocboc/health/records/${patientId}`)
          }
          className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-theme-textSecondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-theme-text">New Checkup</h1>
          <p className="text-sm text-theme-textSecondary">
            Record a checkup for {resident.first_name} {resident.last_name}
          </p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="bg-theme-surface border border-theme rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center">
            <TypeIcon className={`w-6 h-6 ${colorClassMap[typeColor]}`} />
          </div>
          <div>
            <p className="font-semibold text-theme-text">
              {resident.first_name} {resident.last_name}
            </p>
            <p className="text-sm text-theme-textSecondary">
              {resident.gender} • {resident.age || "N/A"} yrs •{" "}
              {PATIENT_TYPE_LABELS[patient.patient_type]}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-theme">
          <div
            className={`p-2.5 rounded-xl ${colorClassMap[typeColor]}`}
          >
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-theme-text text-lg">
              New {PATIENT_TYPE_LABELS[patient.patient_type]} Checkup
            </h3>
            <p className="text-sm text-theme-textSecondary">
              Fill in the fields below. Fields marked with{" "}
              <span className="text-red-500">*</span> are required.
            </p>
          </div>
        </div>
        {renderForm()}
      </div>
    </div>
  );
}