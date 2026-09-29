// src/pages/health/checkups/CheckupForm.tsx

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  User,
  Calendar,
  Stethoscope,
  Loader2,
  AlertCircle,
  CheckCircle,
  Heart,
  Baby,
  Droplet,
  User as UserIcon,
  Activity,
} from "lucide-react";
import { healthApi } from "../../../api/endpoints";
import toast from "react-hot-toast";

export default function CheckupForm() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    checkup_date: new Date().toISOString().split("T")[0],
    assessment: "",
    recommendations: "",
    follow_up_date: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (patientId) fetchPatient();
  }, [patientId]);

  const fetchPatient = async () => {
    setIsLoading(true);
    try {
      const response = await healthApi.getPatientById(parseInt(patientId));
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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.checkup_date)
      newErrors.checkup_date = "Checkup date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the errors below");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        checkup_date: formData.checkup_date || new Date().toISOString(),
        follow_up_date: formData.follow_up_date || undefined,
      };

      const response = await healthApi.createCheckup(
        parseInt(patientId),
        payload,
      );
      toast.success("Checkup recorded successfully");

      if (response.data?.data?.id) {
        navigate(`/barangay-bagocboc/health/records/${patientId}`);
      } else {
        navigate("/barangay-bagocboc/health");
      }
    } catch (error: any) {
      console.error("Error saving checkup:", error);
      const errorData = error?.response?.data?.errors;
      if (errorData) {
        setErrors(errorData);
        toast.error("Please fix the errors below");
      } else {
        toast.error(error?.response?.data?.message || "Failed to save checkup");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPatientTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      pregnant: Heart,
      child: Baby,
      lactating: Droplet,
      senior: UserIcon,
      ncd: Activity,
    };
    return icons[type] || User;
  };

  const getPatientTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      pregnant: "text-pink-600 dark:text-pink-400",
      child: "text-green-600 dark:text-green-400",
      lactating: "text-purple-600 dark:text-purple-400",
      senior: "text-amber-600 dark:text-amber-400",
      ncd: "text-red-600 dark:text-red-400",
    };
    return colors[type] || "text-theme-text";
  };

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
  const Icon = getPatientTypeIcon(patient.patient_type);
  const colorClass = getPatientTypeColor(patient.patient_type);

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
            <Icon className={`w-6 h-6 ${colorClass}`} />
          </div>
          <div>
            <p className="font-semibold text-theme-text">
              {resident.first_name} {resident.last_name}
            </p>
            <p className="text-sm text-theme-textSecondary">
              {resident.gender} • {resident.age || "N/A"} yrs •{" "}
              {patient.patient_type}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Checkup Details */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
          <h3 className="font-semibold text-theme-text mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-theme-primary" />
            Checkup Details
          </h3>

          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Checkup Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="checkup_date"
                value={formData.checkup_date}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 bg-theme-background border rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none ${
                  errors.checkup_date ? "border-red-500" : "border-theme"
                }`}
              />
              {errors.checkup_date && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.checkup_date}
                </p>
              )}
            </div>

            {/* Assessment */}
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Assessment
              </label>
              <textarea
                name="assessment"
                value={formData.assessment}
                onChange={handleInputChange}
                rows={3}
                placeholder="Clinical assessment, findings, diagnosis..."
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Recommendations */}
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Recommendations
              </label>
              <textarea
                name="recommendations"
                value={formData.recommendations}
                onChange={handleInputChange}
                rows={2}
                placeholder="Treatment plan, medications, lifestyle changes..."
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Follow-up Date */}
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                name="follow_up_date"
                value={formData.follow_up_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-theme-textSecondary mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(`/barangay-bagocboc/health/records/${patientId}`)
            }
            className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
