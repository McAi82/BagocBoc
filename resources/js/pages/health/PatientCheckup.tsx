// pages/health/PatientCheckup.tsx

import React, { useState } from "react";
import {
  Heart,
  Search,
  Eye,
  Plus,
  Calendar,
  User,
  Loader2,
  Clock,
  CheckCircle,
} from "lucide-react";
import { api } from "../../api/apiClient";
import { formatDate, getStatusColor } from "../../utils/format";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";

interface PatientCheckupProps {
  records: any[];
  onRefresh: () => void;
}

export default function PatientCheckup({
  records,
  onRefresh,
}: PatientCheckupProps) {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showCheckupModal, setShowCheckupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPatients = records.filter((r: any) => {
    if (!r || !r.resident) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const firstName = r.resident?.first_name?.toLowerCase() || "";
    const lastName = r.resident?.last_name?.toLowerCase() || "";
    return firstName.includes(query) || lastName.includes(query);
  });

  const getPatientTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      pregnant: "Pregnant",
      child: "Child",
      lactating: "Lactating",
      senior: "Senior",
      ncd: "NCD/Chronic",
    };
    return labels[type] || type || "Unknown";
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      pregnant:
        "text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30",
      child: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
      lactating:
        "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
      senior:
        "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
      ncd: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
    };
    return colors[type] || "text-theme-textSecondary bg-theme-background";
  };

  const handleCreateCheckup = async (data: any) => {
    if (!selectedPatient) return;
    setIsSubmitting(true);
    try {
      await api.post(`/web/health/patients/${selectedPatient.id}/checkups`, {
        patient_record_id: selectedPatient.id,
        checkup_type: selectedPatient.patient_type,
        ...data,
      });
      toast.success("Checkup recorded successfully!");
      setShowCheckupModal(false);
      setSelectedPatient(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to record checkup");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
      <div className="p-4 border-b border-theme">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
          <input
            type="text"
            placeholder="Search patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
          />
        </div>
      </div>

      <div className="p-4">
        {filteredPatients.length === 0 ? (
          <div className="text-center py-8 text-theme-textSecondary">
            <User className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-3" />
            <p>No patients found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient: any) => {
              if (!patient || !patient.resident) return null;

              return (
                <div
                  key={patient.id || `patient-${Math.random()}`}
                  className="border border-theme rounded-lg p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-theme-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-theme-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-theme-text">
                          {patient.resident?.first_name || "Unknown"}{" "}
                          {patient.resident?.last_name || ""}
                        </p>
                        <p className="text-sm text-theme-textSecondary">
                          {patient.resident?.phone_number || "N/A"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getTypeColor(patient.patient_type)}`}
                    >
                      {getPatientTypeLabel(patient.patient_type)}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-theme-textSecondary">
                      <span className="font-medium">Status:</span>{" "}
                      <span
                        className={`ml-2 ${getStatusColor(patient.status)}`}
                      >
                        {patient.status || "active"}
                      </span>
                    </p>
                    {patient.checkups?.[0] && (
                      <p className="text-theme-textSecondary">
                        <span className="font-medium">Last Checkup:</span>{" "}
                        <span className="ml-2">
                          {formatDate(patient.checkups[0].checkup_date)}
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPatient(patient);
                      setShowCheckupModal(true);
                    }}
                    className="mt-3 w-full py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4 inline mr-1" /> New Checkup
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkup Modal */}
      <Modal
        isOpen={showCheckupModal}
        onClose={() => {
          setShowCheckupModal(false);
          setSelectedPatient(null);
        }}
        title={`New Checkup - ${selectedPatient?.resident?.first_name || ""} ${selectedPatient?.resident?.last_name || ""}`}
        size="lg"
      >
        {selectedPatient && (
          <CheckupForm
            patientRecordId={selectedPatient.id}
            patientType={selectedPatient.patient_type}
            patientName={`${selectedPatient.resident?.first_name || ""} ${selectedPatient.resident?.last_name || ""}`}
            onSubmit={handleCreateCheckup}
            onCancel={() => {
              setShowCheckupModal(false);
              setSelectedPatient(null);
            }}
            isSubmitting={isSubmitting}
          />
        )}
      </Modal>
    </div>
  );
}

// ============================================
// Checkup Form Component
// ============================================

interface CheckupFormProps {
  patientRecordId: number;
  patientType: string;
  patientName: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function CheckupForm({
  patientRecordId,
  patientType,
  patientName,
  onSubmit,
  onCancel,
  isSubmitting,
}: CheckupFormProps) {
  const [formData, setFormData] = useState({
    checkup_date: new Date().toISOString().split("T")[0],
    assessment: "",
    diagnosis: "",
    treatment: "",
    recommendations: "",
    follow_up_date: "",
    notes: "",
  });

  const handleSubmit = () => {
    if (!formData.assessment) {
      toast.error("Please enter an assessment");
      return;
    }
    onSubmit(formData);
  };

  const getTypeDisplay = (type: string) => {
    if (!type) return "Unknown";
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="bg-theme-background p-3 rounded-lg">
        <p className="text-sm text-theme-text">
          <span className="font-medium">Patient:</span>{" "}
          {patientName || "Unknown"}
        </p>
        <p className="text-sm text-theme-text">
          <span className="font-medium">Type:</span>{" "}
          {getTypeDisplay(patientType)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-theme-text mb-1">
            Checkup Date
          </label>
          <input
            type="date"
            value={formData.checkup_date}
            onChange={(e) =>
              setFormData({ ...formData, checkup_date: e.target.value })
            }
            className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-theme-text mb-1">
            Follow-up Date
          </label>
          <input
            type="date"
            value={formData.follow_up_date}
            onChange={(e) =>
              setFormData({ ...formData, follow_up_date: e.target.value })
            }
            className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text mb-1">
          Assessment <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.assessment}
          onChange={(e) =>
            setFormData({ ...formData, assessment: e.target.value })
          }
          rows={2}
          className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          placeholder="Assessment findings..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text mb-1">
          Diagnosis
        </label>
        <textarea
          value={formData.diagnosis}
          onChange={(e) =>
            setFormData({ ...formData, diagnosis: e.target.value })
          }
          rows={2}
          className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          placeholder="Diagnosis..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text mb-1">
          Treatment
        </label>
        <textarea
          value={formData.treatment}
          onChange={(e) =>
            setFormData({ ...formData, treatment: e.target.value })
          }
          rows={2}
          className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          placeholder="Treatment provided..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text mb-1">
          Recommendations
        </label>
        <textarea
          value={formData.recommendations}
          onChange={(e) =>
            setFormData({ ...formData, recommendations: e.target.value })
          }
          rows={2}
          className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          placeholder="Recommendations..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-theme-text mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          placeholder="Additional notes..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-theme">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </>
          ) : (
            "Save Checkup"
          )}
        </button>
      </div>
    </div>
  );
}
