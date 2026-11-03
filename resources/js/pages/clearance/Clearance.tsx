// pages/clearance/Clearance.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  FileText,
  RefreshCw,
  Settings,
  PhilippinePeso,
  Loader2,
  User,
  Save,
  Edit,
  X,
  Download,
  FileUp,
  ChevronRight,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

type TabType = "requests" | "configuration";

const FLOW_STEPS = [
  { key: "request", label: "Request", icon: FileText, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
  { key: "approve", label: "Approve", icon: CheckCircle, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
  { key: "document", label: "Document", icon: FileText, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
  { key: "release", label: "Release", icon: Printer, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "receive", label: "Receive", icon: Download, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
];

export default function Clearance() {
  const [tab, setTab] = useState<TabType>("requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClearance, setSelectedClearance] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState<any>({});
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [clearances, setClearances] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);

  const [documentForm, setDocumentForm] = useState({
    document_name: "",
    document_content: "",
    file: null as File | null,
  });

  const [issueForm, setIssueForm] = useState({
    resident_id: "",
    purpose: "",
    amount: "",
  });
  const [issueErrors, setIssueErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, itemsPerPage, tab]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.data && data.data.data && Array.isArray(data.data.data))
      return data.data.data;
    if (data.clearances && Array.isArray(data.clearances))
      return data.clearances;
    if (data.residents && Array.isArray(data.residents)) return data.residents;
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.success && data.data && Array.isArray(data.data)) return data.data;

    const findArray = (obj: any, path: string = ""): any[] => {
      if (!obj) return [];
      if (Array.isArray(obj)) return obj;
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          const result = findArray(obj[key], `${path}.${key}`);
          if (result.length > 0) return result;
        }
      }
      return [];
    };
    return findArray(data);
  };

  const fetchData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const clearancesRes = await api.get("/web/clearance");
      setClearances(extractData(clearancesRes.data));

      try {
        const residentsRes = await api.get("/web/residents");
        setResidents(extractData(residentsRes.data));
      } catch (e) {
        setResidents([]);
      }

      try {
        const configRes = await api.get("/web/clearance/configuration");
        const configData = configRes.data?.data || configRes.data;
        setConfig(configData);
      } catch (e) {
        setConfig(null);
      }
    } catch (error) {
      console.error("❌ [Clearance] Error fetching data:", error);
      setIsError(true);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ Filtered clearances
  const filteredClearances = useMemo(() => {
    if (!Array.isArray(clearances) || clearances.length === 0) return [];
    let filtered = [...clearances];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c: any) => {
        const ref = c.reference_number?.toLowerCase() || "";
        const firstName = c.resident?.first_name?.toLowerCase() || "";
        const lastName = c.resident?.last_name?.toLowerCase() || "";
        return (
          ref.includes(query) ||
          firstName.includes(query) ||
          lastName.includes(query)
        );
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c: any) => c.status === statusFilter);
    }

    return filtered;
  }, [clearances, searchQuery, statusFilter]);

  // ✅ Pagination calculations
  const totalPages = Math.max(
    1,
    Math.ceil(filteredClearances.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(
    startIndex + itemsPerPage,
    filteredClearances.length,
  );
  const paginatedClearances = useMemo(
    () => filteredClearances.slice(startIndex, endIndex),
    [filteredClearances, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const pendingCount = clearances.filter(
    (c: any) => c.status === "pending",
  ).length;

  // ============================================
  // ISSUE HANDLERS
  // ============================================

  const resetIssueForm = () => {
    setIssueForm({ resident_id: "", purpose: "", amount: "" });
    setIssueErrors({});
  };

  const validateIssueForm = () => {
    const errors: Record<string, string> = {};
    if (!issueForm.resident_id) errors.resident_id = "Please select a resident";
    if (!issueForm.purpose?.trim()) errors.purpose = "Please enter the purpose";
    setIssueErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleIssue = async () => {
    if (!validateIssueForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    setIsSubmitting(true);
    try {
      const amount = parseFloat(issueForm.amount) || config?.default_fee || 50;
      await api.post("/web/clearance", {
        resident_id: parseInt(issueForm.resident_id),
        purpose: issueForm.purpose,
        amount: amount,
      });
      toast.success("Clearance requested successfully!");
      setShowIssueModal(false);
      resetIssueForm();
      fetchData();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const newErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach((key) => {
          newErrors[key] = apiErrors[key][0];
        });
        setIssueErrors(newErrors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to issue clearance",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // CLEARANCE MANAGEMENT HANDLERS
  // ============================================

  const handleView = (clearance: any) => {
    setSelectedClearance(clearance);
    setShowViewModal(true);
  };

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/web/clearance/${id}/approve`);
      toast.success("Clearance approved successfully");
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to approve clearance",
      );
    }
  };

  const handleGenerateDocument = async () => {
    if (!selectedClearance) return;
    if (!documentForm.document_name?.trim()) {
      toast.error("Please enter a document name");
      return;
    }
    setIsGeneratingDocument(true);
    try {
      const formData = new FormData();
      formData.append("document_name", documentForm.document_name);
      if (documentForm.file) formData.append("file", documentForm.file);
      if (documentForm.document_content)
        formData.append("document_content", documentForm.document_content);

      await api.post(
        `/web/clearance/${selectedClearance.id}/generate-document`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      toast.success("Document generated successfully!");
      setShowDocumentModal(false);
      setDocumentForm({ document_name: "", document_content: "", file: null });
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to generate document",
      );
    } finally {
      setIsGeneratingDocument(false);
    }
  };

  const handleRelease = async (id: number) => {
    try {
      await api.post(`/web/clearance/${id}/release`);
      toast.success("Clearance released successfully");
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to release clearance",
      );
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const response = await api.get(`/web/clearance/${id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `clearance-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Clearance downloaded successfully!");
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to download clearance",
      );
    }
  };

  const handleReject = async () => {
    if (!selectedClearance) return;
    try {
      await api.post(`/web/clearance/${selectedClearance.id}/reject`, {
        remarks: rejectReason,
      });
      toast.success("Clearance rejected");
      setShowRejectModal(false);
      setSelectedClearance(null);
      setRejectReason("");
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to reject clearance",
      );
    }
  };

  const openDocumentModal = (clearance: any) => {
    setSelectedClearance(clearance);
    setDocumentForm({
      document_name: `Barangay_Clearance_${clearance.reference_number}`,
      document_content: "",
      file: null,
    });
    setShowDocumentModal(true);
  };

  const handleSaveConfig = async () => {
    try {
      await api.put("/web/clearance/configuration", configForm);
      toast.success("Configuration updated successfully!");
      setIsEditingConfig(false);
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update configuration",
      );
    }
  };

  const handleRefresh = () => {
    toast.loading("Refreshing clearances...");
    fetchData();
    setTimeout(() => {
      toast.dismiss();
      toast.success("Clearances refreshed!");
    }, 500);
  };

  const getFlowStep = (clearance: any) => {
    if (clearance.received_at) return 5;
    if (clearance.released_at) return 4;
    if (clearance.document_path) return 3;
    if (clearance.approved_at) return 2;
    if (clearance.status === "rejected") return -1;
    return 1;
  };

  const getFlowStatus = (clearance: any, step: number) => {
    const currentStep = getFlowStep(clearance);
    if (clearance.status === "rejected") return "rejected";
    if (step < currentStep) return "completed";
    if (step === currentStep) return "active";
    return "pending";
  };

  const getFlowStepColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "active":
        return "bg-blue-500 animate-pulse";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-300 dark:bg-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "ready_for_release":
        return <FileText className="w-4 h-4 text-purple-500" />;
      case "released":
        return <Printer className="w-4 h-4 text-blue-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-theme-textSecondary" />;
    }
  };

  const getActionButtons = (clearance: any) => {
    const buttons = [];

    buttons.push(
      <button
        key="view"
        onClick={() => handleView(clearance)}
        className="p-1.5 text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
        title="View Details"
      >
        <Eye className="w-4 h-4" />
      </button>,
    );

    if (clearance.status === "pending") {
      buttons.push(
        <button
          key="approve"
          onClick={() => handleApprove(clearance.id)}
          className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
        >
          Approve
        </button>,
        <button
          key="reject"
          onClick={() => {
            setSelectedClearance(clearance);
            setShowRejectModal(true);
          }}
          className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
        >
          Reject
        </button>,
      );
    }

    if (clearance.status === "approved") {
      buttons.push(
        <button
          key="document"
          onClick={() => openDocumentModal(clearance)}
          className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
        >
          <FileText className="w-3 h-3 inline mr-1" />
          Document
        </button>,
      );
    }

    if (clearance.status === "ready_for_release") {
      buttons.push(
        <button
          key="release"
          onClick={() => handleRelease(clearance.id)}
          className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
        >
          Release
        </button>,
      );
    }

    if (clearance.status === "released") {
      buttons.push(
        <button
          key="download"
          onClick={() => handleDownload(clearance.id)}
          className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
        >
          <Download className="w-3 h-3 inline mr-1" />
          Download
        </button>,
      );
    }

    return buttons;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading clearances...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-theme-text">
            Failed to Load Data
          </h3>
          <p className="text-sm text-theme-textSecondary mt-2">
            There was an error loading the data.
          </p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (clearances.length === 0 && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-theme-text">
              Barangay Clearance
            </h1>
            <p className="text-sm text-theme-textSecondary mt-1">
              Manage clearance workflow
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
            </button>
            <button
              onClick={() => {
                resetIssueForm();
                setShowIssueModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Issue Clearance
            </button>
          </div>
        </div>

        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Inbox className="w-16 h-16 text-theme-textSecondary/30" />
            <h3 className="text-lg font-semibold text-theme-text">
              No Clearances Found
            </h3>
            <p className="text-sm text-theme-textSecondary max-w-md">
              No clearance records found. Click the "Issue Clearance" button to
              create your first clearance.
            </p>
            <button
              onClick={() => {
                resetIssueForm();
                setShowIssueModal(true);
              }}
              className="mt-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" /> Issue Your First
              Clearance
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            Barangay Clearance
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            {tab === "requests"
              ? `Manage clearance workflow (${pendingCount} pending)`
              : "Configure clearance settings"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
          </button>
          <button
            onClick={() => setTab("requests")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "requests"
                ? "bg-theme-primary text-white"
                : "bg-theme-surface border border-theme text-theme-textSecondary hover:bg-theme-hover"
              }`}
          >
            <FileText className="w-4 h-4 inline mr-2" /> Requests
            <span className="ml-1 text-xs opacity-60">({pendingCount})</span>
          </button>
          <button
            onClick={() => setTab("configuration")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "configuration"
                ? "bg-theme-primary text-white"
                : "bg-theme-surface border border-theme text-theme-textSecondary hover:bg-theme-hover"
              }`}
          >
            <Settings className="w-4 h-4 inline mr-2" /> Configuration
          </button>
        </div>
      </div>

      {/* REQUESTS TAB */}
      {tab === "requests" && (
        <>
          <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type="text"
                  placeholder="Search by reference or resident..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="ready_for_release">Ready for Release</option>
                <option value="released">Released</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              >
                {[10, 15, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  resetIssueForm();
                  setShowIssueModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <Plus className="w-4 h-4" /> Issue Clearance
              </button>
            </div>

            {filteredClearances.length > 0 && (
              <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-theme-text">
                    {startIndex + 1}–{endIndex}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-theme-text">
                    {filteredClearances.length}
                  </span>
                </span>
                <span className="text-xs">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </div>

          <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                Flow:
              </span>
              {FLOW_STEPS.map((step, index) => (
                <div key={step.key} className="flex items-center gap-2">
                  <div className={`p-1 rounded-full ${step.bg}`}>
                    <step.icon className={`w-3 h-3 ${step.color}`} />
                  </div>
                  <span className="text-xs text-theme-text">{step.label}</span>
                  {index < FLOW_STEPS.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-theme-textSecondary" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Resident
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Purpose
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Flow
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {paginatedClearances.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-theme-textSecondary"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Inbox className="w-8 h-8 text-theme-textSecondary/30" />
                          <p>No clearances found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedClearances.map((clearance: any) => {
                      const currentStep = getFlowStep(clearance);
                      return (
                        <tr
                          key={clearance.id || Math.random()}
                          className="hover:bg-theme-hover transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-theme-text">
                            {clearance.reference_number || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-theme-text">
                            {clearance.resident?.first_name}{" "}
                            {clearance.resident?.last_name}
                          </td>
                          <td className="px-4 py-3 text-theme-text">
                            <span className="truncate block max-w-[150px]">
                              {clearance.purpose || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-theme-text">
                            {formatCurrency(clearance.amount || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(clearance.status)}`}
                            >
                              {getStatusIcon(clearance.status)}
                              {clearance.status === "ready_for_release"
                                ? "Ready for Release"
                                : clearance.status || "pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {FLOW_STEPS.map((step, idx) => {
                                const status = getFlowStatus(
                                  clearance,
                                  idx + 1,
                                );
                                const isRejected =
                                  clearance.status === "rejected";
                                return (
                                  <div
                                    key={step.key}
                                    className={`w-2.5 h-2.5 rounded-full ${isRejected ? "bg-red-400" : getFlowStepColor(status)}`}
                                    title={
                                      isRejected
                                        ? "Rejected"
                                        : `${step.label}: ${status}`
                                    }
                                  />
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-theme-textSecondary">
                            {clearance.created_at
                              ? formatDate(clearance.created_at)
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {getActionButtons(clearance)}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ✅ Pagination */}
            {filteredClearances.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredClearances.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                showItemsPerPage={false}
              />
            )}
          </div>
        </>
      )}

      {/* CONFIGURATION TAB */}
      {tab === "configuration" && (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-theme-text">
                Clearance Configuration
              </h2>
              <p className="text-sm text-theme-textSecondary">
                Manage clearance settings and defaults
              </p>
            </div>
            <button
              onClick={() => {
                setIsEditingConfig(!isEditingConfig);
                if (!isEditingConfig && config) {
                  setConfigForm({
                    default_fee: config.default_fee || 50,
                    punong_barangay_name: config.punong_barangay_name || "",
                    barangay_secretary_name:
                      config.barangay_secretary_name || "",
                    header_text: config.header_text || "",
                    footer_text: config.footer_text || "",
                  });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              {isEditingConfig ? (
                <>
                  <X className="w-4 h-4" /> Cancel
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" /> Edit Configuration
                </>
              )}
            </button>
          </div>

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Default Fee (₱)
              </label>
              <div className="relative">
                <PhilippinePeso className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={configForm.default_fee ?? config?.default_fee ?? 50}
                  onChange={(e) =>
                    setConfigForm({
                      ...configForm,
                      default_fee: parseFloat(e.target.value) || 0,
                    })
                  }
                  disabled={!isEditingConfig}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditingConfig
                      ? "border-theme"
                      : "border-theme bg-theme-background cursor-not-allowed"
                    }`}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Punong Barangay
              </label>
              <input
                type="text"
                value={
                  configForm.punong_barangay_name ??
                  config?.punong_barangay_name ??
                  ""
                }
                onChange={(e) =>
                  setConfigForm({
                    ...configForm,
                    punong_barangay_name: e.target.value,
                  })
                }
                disabled={!isEditingConfig}
                className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditingConfig
                    ? "border-theme"
                    : "border-theme bg-theme-background cursor-not-allowed"
                  }`}
                placeholder="Enter Punong Barangay name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Barangay Secretary
              </label>
              <input
                type="text"
                value={
                  configForm.barangay_secretary_name ??
                  config?.barangay_secretary_name ??
                  ""
                }
                onChange={(e) =>
                  setConfigForm({
                    ...configForm,
                    barangay_secretary_name: e.target.value,
                  })
                }
                disabled={!isEditingConfig}
                className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${isEditingConfig
                    ? "border-theme"
                    : "border-theme bg-theme-background cursor-not-allowed"
                  }`}
                placeholder="Enter Barangay Secretary name"
              />
            </div>
            {isEditingConfig && (
              <div className="pt-4 border-t border-theme flex gap-3">
                <button
                  onClick={handleSaveConfig}
                  className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditingConfig(false);
                    setConfigForm({});
                  }}
                  className="px-6 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedClearance(null);
        }}
        title="Clearance Details"
        size="xl"
      >
        {selectedClearance && (
          <div className="space-y-4">
            <div className="bg-theme-background rounded-lg p-4">
              <div className="flex items-center justify-between">
                {FLOW_STEPS.map((step, index) => {
                  const status = getFlowStatus(selectedClearance, index + 1);
                  const isRejected = selectedClearance.status === "rejected";
                  const Icon = step.icon;
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center">
                        <div
                          className={`p-2 rounded-full ${isRejected ? "bg-red-100 dark:bg-red-900/20" : status === "completed" ? "bg-green-100 dark:bg-green-900/20" : status === "active" ? "bg-blue-100 dark:bg-blue-900/20" : "bg-gray-100 dark:bg-gray-800"}`}
                        >
                          <Icon
                            className={`w-4 h-4 ${isRejected ? "text-red-500" : status === "completed" ? "text-green-500" : status === "active" ? "text-blue-500" : "text-gray-400 dark:text-gray-600"}`}
                          />
                        </div>
                        <span className="text-[10px] text-theme-textSecondary mt-1">
                          {step.label}
                        </span>
                      </div>
                      {index < FLOW_STEPS.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 ${isRejected ? "bg-red-200 dark:bg-red-800" : status === "completed" ? "bg-green-300 dark:bg-green-800" : status === "active" ? "bg-blue-300 dark:bg-blue-800" : "bg-gray-200 dark:bg-gray-700"}`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Reference
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.reference_number}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Status
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedClearance.status)}`}
                >
                  {selectedClearance.status === "ready_for_release"
                    ? "Ready for Release"
                    : selectedClearance.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Resident
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.resident?.first_name}{" "}
                  {selectedClearance.resident?.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Amount
                </p>
                <p className="font-medium text-theme-text">
                  {formatCurrency(selectedClearance.amount || 0)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-theme-textSecondary font-medium">
                  Purpose
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.purpose || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Requested
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.created_at
                    ? formatDate(selectedClearance.created_at)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Approved
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.approved_at
                    ? formatDate(selectedClearance.approved_at)
                    : "Not approved yet"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Released
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.released_at
                    ? formatDate(selectedClearance.released_at)
                    : "Not released yet"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Received
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClearance.received_at
                    ? formatDate(selectedClearance.received_at)
                    : "Not received yet"}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedClearance(null);
                }}
                className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ISSUE MODAL */}
      <Modal
        isOpen={showIssueModal}
        onClose={() => {
          setShowIssueModal(false);
          resetIssueForm();
        }}
        title="Issue Clearance"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Resident <span className="text-red-500">*</span>
            </label>
            <select
              value={issueForm.resident_id}
              onChange={(e) =>
                setIssueForm({ ...issueForm, resident_id: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${issueErrors.resident_id ? "border-red-500" : "border-theme"
                }`}
            >
              <option value="">
                {residents.length === 0
                  ? "Loading residents..."
                  : "Select Resident"}
              </option>
              {residents.map((resident: any) => (
                <option key={resident.id} value={resident.id}>
                  {resident.first_name || "Unknown"} {resident.last_name || ""}
                  {resident.middle_name ? ` ${resident.middle_name}` : ""}
                  {resident.suffix ? ` ${resident.suffix}` : ""}
                  {resident.phone_number ? ` (${resident.phone_number})` : ""}
                </option>
              ))}
            </select>
            {issueErrors.resident_id && (
              <p className="text-sm text-red-500 mt-1">
                {issueErrors.resident_id}
              </p>
            )}
            {residents.length === 0 && !isLoading && (
              <p className="text-xs text-amber-600 mt-1">
                No residents loaded. Please refresh.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Purpose <span className="text-red-500">*</span>
            </label>
            <textarea
              value={issueForm.purpose}
              onChange={(e) =>
                setIssueForm({ ...issueForm, purpose: e.target.value })
              }
              rows={2}
              className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${issueErrors.purpose ? "border-red-500" : "border-theme"
                }`}
              placeholder="e.g., Employment, Travel, School, Business..."
            />
            {issueErrors.purpose && (
              <p className="text-sm text-red-500 mt-1">{issueErrors.purpose}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Amount (₱)
            </label>
            <div className="relative">
              <PhilippinePeso className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={issueForm.amount}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, amount: e.target.value })
                }
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${issueErrors.amount ? "border-red-500" : "border-theme"
                  }`}
                placeholder={`Default: ${config?.default_fee || 50}`}
              />
            </div>
            {issueErrors.amount && (
              <p className="text-sm text-red-500 mt-1">{issueErrors.amount}</p>
            )}
            <p className="text-xs text-theme-textSecondary mt-1">
              Leave empty to use default fee (₱{config?.default_fee || 50})
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowIssueModal(false);
                resetIssueForm();
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleIssue}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Issuing...
                </>
              ) : (
                "Issue Clearance"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* DOCUMENT GENERATION MODAL */}
      <Modal
        isOpen={showDocumentModal}
        onClose={() => {
          setShowDocumentModal(false);
          setDocumentForm({
            document_name: "",
            document_content: "",
            file: null,
          });
        }}
        title="Generate Document"
      >
        <div className="space-y-4">
          <div className="bg-theme-primary/10 border border-theme-primary/20 rounded-lg p-3">
            <p className="text-sm text-theme-text">
              <strong>
                {selectedClearance?.resident?.first_name}{" "}
                {selectedClearance?.resident?.last_name}
              </strong>{" "}
              - Barangay Clearance
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={documentForm.document_name}
              onChange={(e) =>
                setDocumentForm({
                  ...documentForm,
                  document_name: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
              placeholder="e.g., Barangay_Clearance_John_Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Upload File (PDF, DOC, DOCX)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setDocumentForm({ ...documentForm, file: e.target.files[0] });
                }
              }}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-theme-primary file:text-white file:cursor-pointer hover:file:opacity-90"
            />
            <p className="text-xs text-theme-textSecondary mt-1">
              Max size: 5MB
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Or Enter Content (Text)
            </label>
            <textarea
              value={documentForm.document_content}
              onChange={(e) =>
                setDocumentForm({
                  ...documentForm,
                  document_content: e.target.value,
                })
              }
              rows={4}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
              placeholder="Enter document content or upload a file above..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowDocumentModal(false);
                setDocumentForm({
                  document_name: "",
                  document_content: "",
                  file: null,
                });
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateDocument}
              disabled={isGeneratingDocument}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isGeneratingDocument ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4" /> Generate Document
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedClearance(null);
          setRejectReason("");
        }}
        title="Reject Clearance"
      >
        <div className="space-y-4">
          <p className="text-sm text-theme-textSecondary">
            Are you sure you want to reject this clearance request?
          </p>
          {selectedClearance && (
            <div className="p-3 bg-theme-background rounded-lg">
              <p className="font-medium text-theme-text">
                {selectedClearance.resident?.first_name}{" "}
                {selectedClearance.resident?.last_name}
              </p>
              <p className="text-sm text-theme-textSecondary">
                Ref: {selectedClearance.reference_number}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Reason (Optional)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
              placeholder="Enter reason for rejection..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowRejectModal(false);
                setSelectedClearance(null);
                setRejectReason("");
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}