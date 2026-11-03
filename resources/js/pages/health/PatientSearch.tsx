// pages/health/PatientSearch.tsx

import React, { useState } from "react";
import {
  Search,
  User,
  Eye,
  ChevronRight,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Baby,
  Droplets,
  Activity,
} from "lucide-react";
import { formatDate, getStatusColor } from "../../utils/format";
import Modal from "../../components/ui/Modal";
import PatientDetails from "./records/PatientDetails";

interface PatientSearchProps {
  records?: any[];
  onRefresh?: () => void;
}

const patientTypeConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  pregnant: {
    label: "Pregnant",
    icon: Heart,
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  child: {
    label: "Child",
    icon: Baby,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  lactating: {
    label: "Lactating",
    icon: Droplets,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
  senior: {
    label: "Senior",
    icon: User,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  ncd: {
    label: "NCD/Chronic",
    icon: Activity,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
};

export default function PatientSearch({
  records: propRecords,
  onRefresh,
}: PatientSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const records = propRecords || [];

  const filteredResults = searchQuery.trim()
    ? records.filter((r: any) => {
        const query = searchQuery.toLowerCase();
        const firstName = r.resident?.first_name?.toLowerCase() || "";
        const lastName = r.resident?.last_name?.toLowerCase() || "";
        const phone = r.resident?.phone_number?.toLowerCase() || "";
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        return (
          firstName.includes(query) ||
          lastName.includes(query) ||
          fullName.includes(query) ||
          phone.includes(query)
        );
      })
    : [];

  const handleViewRecord = (record: any) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const getTypeInfo = (type: string) => {
    return (
      patientTypeConfig[type] || {
        label: type,
        icon: User,
        color: "text-theme-textSecondary",
        bg: "bg-theme-background",
      }
    );
  };

  return (
    <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
      <div className="p-4 border-b border-theme">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
          />
        </div>
        {searchQuery && (
          <p className="text-xs text-theme-textSecondary mt-2">
            Found {filteredResults.length} result
            {filteredResults.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="p-4">
        {!searchQuery.trim() ? (
          <div className="text-center py-12 text-theme-textSecondary">
            <Search className="w-16 h-16 mx-auto text-theme-textSecondary/30 mb-4" />
            <p className="text-lg font-medium text-theme-text">
              Search for Patients
            </p>
            <p className="text-sm">
              Enter a name or phone number to find patient records
            </p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-12 text-theme-textSecondary">
            <User className="w-16 h-16 mx-auto text-theme-textSecondary/30 mb-4" />
            <p className="text-lg font-medium text-theme-text">
              No patients found
            </p>
            <p className="text-sm">No records match "{searchQuery}"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((record: any) => {
              const typeInfo = getTypeInfo(record.patient_type);
              const Icon = typeInfo.icon;
              const lastCheckup = record.checkups?.[0];

              return (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border border-theme rounded-lg hover:bg-theme-hover hover:border-theme-primary transition-all cursor-pointer"
                  onClick={() => handleViewRecord(record)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-theme-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-theme-text">
                          {record.resident?.first_name}{" "}
                          {record.resident?.last_name}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${typeInfo.bg} ${typeInfo.color}`}
                        >
                          <Icon className="w-3 h-3" /> {typeInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-theme-textSecondary mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />{" "}
                          {record.resident?.phone_number || "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{" "}
                          {record.resident?.birth_date
                            ? formatDate(record.resident.birth_date)
                            : "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${getStatusColor(record.status)}`}
                          />{" "}
                          {record.status}
                        </span>
                      </div>
                      {lastCheckup && (
                        <p className="text-xs text-theme-textSecondary mt-1">
                          Last checkup: {formatDate(lastCheckup.checkup_date)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewRecord(record);
                      }}
                      className="p-2 text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-theme-textSecondary" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRecord(null);
        }}
        title="Patient Record Details"
        size="xl"
      >
        {selectedRecord && (
          <PatientDetails
            record={selectedRecord}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedRecord(null);
            }}
            onRefresh={() => {
              if (onRefresh) onRefresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
