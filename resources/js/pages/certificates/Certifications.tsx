// pages/certificates/Certifications.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  FileText,
  Printer,
  RefreshCw,
  PhilippinePeso,
  User,
  Send,
  FileCheck,
  Download,
  FileUp,
  ChevronRight,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Save,
  CreditCard,
  Smartphone,
  Info,
  Shield,
  FileSignature,
  Link as LinkIcon,
} from "lucide-react";
import { api } from "../../api/apiClient";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import CertificatePreviewModal from "../../components/features/CertificatePreviewModal";
import toast from "react-hot-toast";

const DEFAULT_TYPES = [
  { id: 1, name: "Certificate of Residency", fee: 50, is_active: true },
  { id: 2, name: "Barangay Clearance", fee: 50, is_active: true },
  { id: 3, name: "Certificate of Indigency", fee: 0, is_active: true },
  { id: 4, name: "Certificate of Good Moral", fee: 50, is_active: true },
  { id: 5, name: "Certificate of Employment", fee: 50, is_active: true },
  { id: 6, name: "Barangay ID", fee: 100, is_active: true },
];

type TabType = "request" | "manage" | "types";

const FLOW_STEPS = [
  {
    key: "request",
    label: "Request",
    icon: Send,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    key: "zl_clearance",
    label: "ZL Clearance",
    icon: Shield,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    key: "payment",
    label: "Payment",
    icon: CreditCard,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
  {
    key: "approve",
    label: "Approve",
    icon: CheckCircle,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    key: "document",
    label: "Document",
    icon: FileText,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
  },
  {
    key: "release",
    label: "Release",
    icon: Printer,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20",
  },
  {
    key: "receive",
    label: "Receive",
    icon: Download,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
];

export default function Certifications() {
  const [tab, setTab] = useState<TabType>("request");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zlFilter, setZlFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showZlModal, setShowZlModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDeleteTypeModal, setShowDeleteTypeModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  // ✅ Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewCert, setPreviewCert] = useState<any>(null);

  const [selectedType, setSelectedType] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isEditingType, setIsEditingType] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isReissuing, setIsReissuing] = useState<number | null>(null);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [zlForm, setZlForm] = useState({ status: "approved", notes: "" });
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "cash",
    payment_status: "paid",
    payment_reference: "",
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const [certifications, setCertifications] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>(DEFAULT_TYPES);
  const [residents, setResidents] = useState<any[]>([]);

  const [documentForm, setDocumentForm] = useState({
    document_name: "",
    document_content: "",
    file: null as File | null,
  });

  const [requestForm, setRequestForm] = useState({
    resident_id: "",
    certification_type_id: "",
    purpose: "",
    details: "",
    submission_channel: "physical",
    payment_method: "cash",
  });
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});

  const [typeForm, setTypeForm] = useState({
    name: "",
    description: "",
    fee: "",
    is_active: true,
  });
  const [typeErrors, setTypeErrors] = useState<Record<string, string>>({});

  // ✅ Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, zlFilter, channelFilter, itemsPerPage, tab]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) {
      if (data.length > 0 && data[0]?.reference_number !== undefined) return data;
      return [];
    }
    if (data?.data && Array.isArray(data.data)) {
      if (data.data.length > 0 && data.data[0]?.reference_number !== undefined)
        return data.data;
      return [];
    }
    if (data?.certifications && Array.isArray(data.certifications)) {
      return data.certifications;
    }
    if (data?.data?.data && Array.isArray(data.data.data)) {
      if (
        data.data.data.length > 0 &&
        data.data.data[0]?.reference_number !== undefined
      )
        return data.data.data;
      return [];
    }
    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 3) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.reference_number !== undefined ||
            obj[0]?.certification_type_id !== undefined ||
            obj[0]?.resident_id !== undefined)
        ) {
          return obj;
        }
        return [];
      }
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          if (
            [
              "message",
              "status",
              "success",
              "errors",
              "meta",
              "links",
              "config",
              "headers",
              "request",
            ].includes(key)
          )
            continue;
          const result = findArray(obj[key], depth + 1);
          if (result.length > 0) return result;
        }
      }
      return [];
    };
    const foundArray = findArray(data);
    return foundArray.length > 0 ? foundArray : [];
  };

  const fetchData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const certsRes = await api.get("/web/certifications");
      let certsData = extractData(certsRes.data);

      if (certsData.length === 0 && certsRes.data?.data) {
        if (Array.isArray(certsRes.data.data)) {
          certsData = certsRes.data.data;
        } else if (
          certsRes.data.data?.data &&
          Array.isArray(certsRes.data.data.data)
        ) {
          certsData = certsRes.data.data.data;
        }
      }

      setCertifications(certsData);

      try {
        const typesRes = await api.get("/web/certifications/types");
        const typesData = extractData(typesRes.data);
        setTypes(typesData.length > 0 ? typesData : DEFAULT_TYPES);
      } catch (e) {
        setTypes(DEFAULT_TYPES);
      }

      try {
        const residentsRes = await api.get("/web/residents");
        let residentsData = [];
        if (residentsRes.data?.data && Array.isArray(residentsRes.data.data)) {
          residentsData = residentsRes.data.data;
        } else if (
          residentsRes.data?.residents &&
          Array.isArray(residentsRes.data.residents)
        ) {
          residentsData = residentsRes.data.residents;
        } else if (Array.isArray(residentsRes.data)) {
          residentsData = residentsRes.data;
        } else {
          const findArray = (obj: any): any[] => {
            if (!obj) return [];
            if (Array.isArray(obj)) return obj;
            for (const key of Object.keys(obj)) {
              if (Array.isArray(obj[key])) return obj[key];
              if (typeof obj[key] === "object") {
                const result = findArray(obj[key]);
                if (result.length > 0) return result;
              }
            }
            return [];
          };
          residentsData = findArray(residentsRes.data);
        }
        setResidents(residentsData);
      } catch (e) {
        setResidents([]);
      }
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setIsError(true);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCerts = useMemo(() => {
    if (!Array.isArray(certifications) || certifications.length === 0) {
      return [];
    }

    let filtered = [...certifications];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c: any) => {
        const ref = c.reference_number?.toLowerCase() || "";
        const resident = c.resident || c.requester?.resident || null;
        const firstName = resident?.first_name?.toLowerCase() || "";
        const lastName = resident?.last_name?.toLowerCase() || "";
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

    if (zlFilter !== "all") {
      filtered = filtered.filter(
        (c: any) => c.zl_clearance_status === zlFilter,
      );
    }

    if (channelFilter !== "all") {
      filtered = filtered.filter(
        (c: any) => c.submission_channel === channelFilter,
      );
    }

    return filtered;
  }, [certifications, searchQuery, statusFilter, zlFilter, channelFilter]);

  // ✅ Pagination calculations
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCerts.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredCerts.length);
  const paginatedCerts = useMemo(
    () => filteredCerts.slice(startIndex, endIndex),
    [filteredCerts, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const stats = {
    total: certifications.length,
    pending: certifications.filter(
      (c: any) => c.status === "Pending" || c.status === "In Review",
    ).length,
    approved: certifications.filter((c: any) => c.status === "Approved").length,
    released: certifications.filter((c: any) => c.status === "Released").length,
    rejected: certifications.filter((c: any) => c.status === "Rejected").length,
    zlPending: certifications.filter(
      (c: any) => c.zl_clearance_status === "pending",
    ).length,
    zlApproved: certifications.filter(
      (c: any) => c.zl_clearance_status === "approved",
    ).length,
    zlRejected: certifications.filter(
      (c: any) => c.zl_clearance_status === "rejected",
    ).length,
    virtual: certifications.filter(
      (c: any) => c.submission_channel === "virtual",
    ).length,
    physical: certifications.filter(
      (c: any) => c.submission_channel === "physical",
    ).length,
  };

  const resetZlForm = () => setZlForm({ status: "approved", notes: "" });
  const resetPaymentForm = () =>
    setPaymentForm({
      payment_method: "cash",
      payment_status: "paid",
      payment_reference: "",
    });

  const handleZlClearance = async () => {
    if (!selectedCert) return;
    try {
      await api.post(`/web/certifications/${selectedCert.id}/zl-clearance`, {
        zl_clearance_status: zlForm.status,
        zl_clearance_notes: zlForm.notes,
      });
      toast.success(
        `ZL Clearance ${zlForm.status === "approved" ? "approved" : "rejected"} successfully!`,
      );
      setShowZlModal(false);
      setSelectedCert(null);
      resetZlForm();
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update ZL clearance",
      );
    }
  };

  const handlePaymentUpdate = async () => {
    if (!selectedCert) return;
    try {
      await api.post(`/web/certifications/${selectedCert.id}/payment`, {
        payment_method: paymentForm.payment_method,
        payment_status: paymentForm.payment_status,
        payment_reference: paymentForm.payment_reference,
      });
      toast.success("Payment updated successfully!");
      setShowPaymentModal(false);
      setSelectedCert(null);
      resetPaymentForm();
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update payment");
    }
  };

  const handleOnlinePayment = async () => {
    if (!selectedCert) return;
    setIsProcessingPayment(true);
    setPaymentResult(null);
    try {
      const response = await api.post(
        `/web/certifications/${selectedCert.id}/online-payment`,
      );
      setPaymentResult(response.data.data);

      if (response.data.success) {
        toast.success("Payment successful! Certificate approved.");
        setShowOnlinePaymentModal(false);
        setShowPaymentModal(false);
        fetchData();
      } else {
        toast.error("Payment failed. Please try again.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Payment processing failed");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const resetRequestForm = () => {
    setRequestForm({
      resident_id: "",
      certification_type_id: "",
      purpose: "",
      details: "",
      submission_channel: "physical",
      payment_method: "cash",
    });
    setRequestErrors({});
  };

  const validateRequestForm = () => {
    const errors: Record<string, string> = {};
    if (!requestForm.resident_id)
      errors.resident_id = "Please select a resident";
    if (!requestForm.certification_type_id)
      errors.certification_type_id = "Please select a certificate type";
    if (!requestForm.purpose?.trim())
      errors.purpose = "Please enter the purpose";
    setRequestErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRequestCertification = async () => {
    if (!validateRequestForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    try {
      await api.post("/web/certifications", {
        resident_id: parseInt(requestForm.resident_id),
        certification_type_id: parseInt(requestForm.certification_type_id),
        purpose: requestForm.purpose,
        details: requestForm.details,
        submission_channel: requestForm.submission_channel,
        payment_method: requestForm.payment_method,
      });
      toast.success("Certification requested successfully!");
      resetRequestForm();
      fetchData();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const newErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach((key) => {
          newErrors[key] = apiErrors[key][0];
        });
        setRequestErrors(newErrors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to request certification",
        );
      }
    }
  };

  const handleView = (cert: any) => {
    setSelectedCert(cert);
    setShowViewModal(true);
  };

  // ✅ Open certificate preview
  const handlePreview = (cert: any) => {
    setPreviewCert(cert);
    setShowPreviewModal(true);
  };

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/web/certifications/${id}/approve`);
      toast.success("Certification approved successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to approve certification");
    }
  };

  const handleGenerateDocument = async () => {
    if (!selectedCert) return;
    if (!documentForm.document_name?.trim()) {
      toast.error("Please enter a document name");
      return;
    }

    setIsGeneratingDocument(true);
    try {
      const formData = new FormData();
      formData.append("document_name", documentForm.document_name);
      if (documentForm.document_content) {
        formData.append("document_content", documentForm.document_content);
      }

      await api.post(
        `/web/certifications/${selectedCert.id}/generate-document`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      toast.success(
        "Document generated. Review the preview and save the PDF to make it downloadable.",
      );

      setShowDocumentModal(false);
      setDocumentForm({ document_name: "", document_content: "", file: null });
      fetchData();

      // Open the preview so the secretary can save the PDF
      setPreviewCert(selectedCert);
      setShowPreviewModal(true);
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
      await api.post(`/web/certifications/${id}/release`);
      toast.success(
        "Certification released. A one-time download link has been sent to the resident.",
      );
      fetchData();
    } catch (error) {
      toast.error("Failed to release certification");
    }
  };

  // ✅ Reissue — generates a fresh one-time download token
  const handleReissue = async (id: number) => {
    setIsReissuing(id);
    try {
      await api.post(`/web/certifications/${id}/reissue`);
      toast.success(
        "Certificate reissued. A new one-time download link has been sent to the resident.",
      );
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to reissue certificate",
      );
    } finally {
      setIsReissuing(null);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const response = await api.get(`/web/certifications/${id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `certificate-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Document downloaded successfully!");
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to download document",
      );
    }
  };

  const handleReject = async () => {
    if (!selectedCert) return;
    try {
      await api.post(`/web/certifications/${selectedCert.id}/reject`, {
        remarks: rejectReason,
      });
      toast.success("Certification rejected");
      setShowRejectModal(false);
      setSelectedCert(null);
      setRejectReason("");
      fetchData();
    } catch (error) {
      toast.error("Failed to reject certification");
    }
  };

  const openZlModal = (cert: any) => {
    setSelectedCert(cert);
    setZlForm({ status: "approved", notes: "" });
    setShowZlModal(true);
  };

  const openPaymentModal = (cert: any) => {
    setSelectedCert(cert);
    setPaymentForm({
      payment_method: cert.payment_method || "cash",
      payment_status: cert.payment_status || "pending",
      payment_reference: cert.payment_reference || "",
    });
    setShowPaymentModal(true);
  };

  const openOnlinePaymentModal = (cert: any) => {
    setSelectedCert(cert);
    setPaymentResult(null);
    setShowOnlinePaymentModal(true);
  };

  const openDocumentModal = (cert: any) => {
    setSelectedCert(cert);
    setDocumentForm({
      document_name: `${cert.certification_type?.name || "Certificate"}_${cert.reference_number}`,
      document_content: "",
      file: null,
    });
    setShowDocumentModal(true);
  };

  const resetTypeForm = () => {
    setTypeForm({ name: "", description: "", fee: "", is_active: true });
    setTypeErrors({});
    setIsEditingType(false);
    setSelectedType(null);
  };

  const validateTypeForm = () => {
    const errors: Record<string, string> = {};
    if (!typeForm.name?.trim()) errors.name = "Type name is required";
    if (typeForm.fee && isNaN(parseFloat(typeForm.fee)))
      errors.fee = "Fee must be a valid number";
    setTypeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveType = async () => {
    if (!validateTypeForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    try {
      const data = {
        name: typeForm.name.trim(),
        description: typeForm.description || null,
        fee: parseFloat(typeForm.fee) || 0,
        is_active: typeForm.is_active,
      };

      if (isEditingType && selectedType) {
        await api.put(`/web/certifications/types/${selectedType.id}`, data);
        toast.success("Certificate type updated successfully!");
      } else {
        await api.post("/web/certifications/types", data);
        toast.success("Certificate type created successfully!");
      }
      setShowTypeModal(false);
      resetTypeForm();
      fetchData();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const newErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach((key) => {
          newErrors[key] = apiErrors[key][0];
        });
        setTypeErrors(newErrors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to save certificate type",
        );
      }
    }
  };

  const handleEditType = (type: any) => {
    setSelectedType(type);
    setTypeForm({
      name: type.name || "",
      description: type.description || "",
      fee: type.fee?.toString() || "",
      is_active: type.is_active ?? true,
    });
    setIsEditingType(true);
    setTypeErrors({});
    setShowTypeModal(true);
  };

  const handleDeleteType = async () => {
    if (!selectedType) return;
    try {
      await api.delete(`/web/certifications/types/${selectedType.id}`);
      toast.success("Certificate type deleted successfully!");
      setShowDeleteTypeModal(false);
      setSelectedType(null);
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to delete certificate type",
      );
    }
  };

  const getFlowStep = (cert: any) => {
    if (cert.received_at) return 7;
    if (cert.released_at) return 6;
    if (cert.document_path) return 5;
    if (cert.approved_at) return 4;
    if (cert.payment_status === "paid") return 3;
    if (cert.zl_clearance_status === "approved") return 2;
    if (cert.status === "Rejected") return -1;
    return 1;
  };

  const getFlowStatus = (cert: any, step: number) => {
    const currentStep = getFlowStep(cert);
    if (cert.status === "Rejected") return "rejected";
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
    const s = status?.toLowerCase() || "";
    if (s === "pending" || s === "in review")
      return <Clock className="w-4 h-4 text-yellow-500" />;
    if (s === "approved")
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (s === "ready for release")
      return <FileText className="w-4 h-4 text-purple-500" />;
    if (s === "released") return <Printer className="w-4 h-4 text-blue-500" />;
    if (s === "rejected") return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-theme-textSecondary" />;
  };

  const getZlStatusBadge = (status: string) => {
    const colors = {
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      approved:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  /**
   * ✅ Download status badge.
   * Shows whether the certificate is still downloadable, has been downloaded,
   * or hasn't been released yet.
   */
  const getDownloadStatusBadge = (cert: any) => {
    if (cert.downloaded_at) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Download className="w-3 h-3" />
          Downloaded
        </span>
      );
    }
    if (cert.download_token && cert.status === "Released") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <LinkIcon className="w-3 h-3" />
          Link Active
        </span>
      );
    }
    if (cert.document_path) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <FileText className="w-3 h-3" />
          Not Released
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        <Clock className="w-3 h-3" />
        No PDF
      </span>
    );
  };

  const getActionButtons = (cert: any) => {
    const buttons = [];

    buttons.push(
      <button
        key="view"
        onClick={() => handleView(cert)}
        className="p-1.5 text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
        title="View Details"
      >
        <Eye className="w-4 h-4" />
      </button>,
    );

    // ✅ Preview button — always available
    buttons.push(
      <button
        key="preview"
        onClick={() => handlePreview(cert)}
        className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-1"
        title="Preview Certificate"
      >
        <FileSignature className="w-3 h-3" />
        Preview
      </button>,
    );

    if (
      cert.zl_clearance_status === "pending" &&
      cert.submission_channel === "virtual"
    ) {
      buttons.push(
        <button
          key="zl"
          onClick={() => openZlModal(cert)}
          className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors"
        >
          <Shield className="w-3 h-3 inline mr-1" /> ZL
        </button>,
      );
    }

    if (
      cert.certification_type?.fee > 0 &&
      cert.payment_status === "pending" &&
      cert.zl_clearance_status !== "pending"
    ) {
      buttons.push(
        <button
          key="payment"
          onClick={() => openPaymentModal(cert)}
          className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
        >
          <CreditCard className="w-3 h-3 inline mr-1" /> Pay
        </button>,
      );
      buttons.push(
        <button
          key="online-pay"
          onClick={() => openOnlinePaymentModal(cert)}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          <Smartphone className="w-3 h-3 inline mr-1" /> Pay Online
        </button>,
      );
    }

    if (cert.status === "Pending" || cert.status === "In Review") {
      if (
        cert.payment_status === "paid" ||
        cert.certification_type?.fee === 0
      ) {
        buttons.push(
          <button
            key="approve"
            onClick={() => handleApprove(cert.id)}
            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
          >
            Approve
          </button>,
        );
      }
      buttons.push(
        <button
          key="reject"
          onClick={() => {
            setSelectedCert(cert);
            setShowRejectModal(true);
          }}
          className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
        >
          Reject
        </button>,
      );
    }

    if (cert.status === "Approved") {
      buttons.push(
        <button
          key="document"
          onClick={() => openDocumentModal(cert)}
          className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
        >
          <FileText className="w-3 h-3 inline mr-1" /> Document
        </button>,
      );
    }

    if (cert.status === "Ready for Release") {
      buttons.push(
        <button
          key="release"
          onClick={() => handleRelease(cert.id)}
          className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors"
        >
          Release
        </button>,
      );
    }

    // ✅ Reissue — only when already downloaded and status is Released
    if (cert.downloaded_at && cert.status === "Released") {
      buttons.push(
        <button
          key="reissue"
          onClick={() => handleReissue(cert.id)}
          disabled={isReissuing === cert.id}
          className="px-3 py-1 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
          title="Generate a new one-time download link"
        >
          {isReissuing === cert.id ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" /> Reissuing...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" /> Reissue
            </>
          )}
        </button>,
      );
    }

    // ✅ Secretary can still preview the locally-generated download
    if (cert.status === "Released" && cert.download_token) {
      buttons.push(
        <button
          key="download"
          onClick={() => handleDownload(cert.id)}
          className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
        >
          <Download className="w-3 h-3 inline mr-1" /> Download
        </button>,
      );
    }

    return buttons;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Certifications</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            {tab === "request" && "Request a new certification for a resident"}
            {tab === "manage" &&
              `Manage certification workflow (${stats.pending} pending)`}
            {tab === "types" && "Manage certificate types and fees"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setTab("request");
              resetRequestForm();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "request"
              ? "bg-theme-primary text-white"
              : "bg-theme-surface border border-theme text-theme-textSecondary hover:bg-theme-hover"
              }`}
          >
            <Plus className="w-4 h-4 inline mr-2" /> Request
          </button>
          <button
            onClick={() => {
              setTab("manage");
              setSearchQuery("");
              setStatusFilter("all");
              setZlFilter("all");
              setChannelFilter("all");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "manage"
              ? "bg-theme-primary text-white"
              : "bg-theme-surface border border-theme text-theme-textSecondary hover:bg-theme-hover"
              }`}
          >
            <FileText className="w-4 h-4 inline mr-2" /> Manage
            <span className="ml-1 text-xs opacity-60">({stats.pending})</span>
          </button>
          <button
            onClick={() => {
              setTab("types");
              resetTypeForm();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "types"
              ? "bg-theme-primary text-white"
              : "bg-theme-surface border border-theme text-theme-textSecondary hover:bg-theme-hover"
              }`}
          >
            <FileCheck className="w-4 h-4 inline mr-2" /> Types
          </button>
        </div>
      </div>

      {/* Request Tab */}
      {tab === "request" && (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-theme-text mb-6">
            Request New Certification
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-theme-text mb-1">
              Resident <span className="text-red-500">*</span>
            </label>
            <select
              value={requestForm.resident_id}
              onChange={(e) =>
                setRequestForm({ ...requestForm, resident_id: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${requestErrors.resident_id ? "border-red-500" : "border-theme"
                }`}
            >
              <option value="">Select Resident</option>
              {residents.map((resident: any) => (
                <option key={resident.id} value={resident.id}>
                  {resident.first_name} {resident.middle_name || ""}{" "}
                  {resident.last_name}
                  {resident.suffix ? ` ${resident.suffix}` : ""}
                  {resident.phone_number ? ` (${resident.phone_number})` : ""}
                </option>
              ))}
            </select>
            {requestErrors.resident_id && (
              <p className="text-sm text-red-500 mt-1">
                {requestErrors.resident_id}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-theme-text mb-1">
              Certificate Type <span className="text-red-500">*</span>
            </label>
            <select
              value={requestForm.certification_type_id}
              onChange={(e) =>
                setRequestForm({
                  ...requestForm,
                  certification_type_id: e.target.value,
                })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${requestErrors.certification_type_id
                ? "border-red-500"
                : "border-theme"
                }`}
            >
              <option value="">Select Certificate Type</option>
              {types.map((type: any) => (
                <option key={type.id} value={type.id}>
                  {type.name} {type.fee > 0 ? `(₱${type.fee})` : "(Free)"}
                </option>
              ))}
            </select>
            {requestErrors.certification_type_id && (
              <p className="text-sm text-red-500 mt-1">
                {requestErrors.certification_type_id}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-theme-text mb-1">
              Submission Channel <span className="text-red-500">*</span>
            </label>
            <select
              value={requestForm.submission_channel}
              onChange={(e) =>
                setRequestForm({
                  ...requestForm,
                  submission_channel: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="physical">Physical Visit</option>
              <option value="virtual">Virtual</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-theme-text mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={requestForm.payment_method}
              onChange={(e) =>
                setRequestForm({
                  ...requestForm,
                  payment_method: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-theme-text mb-1">
              Purpose <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={requestForm.purpose}
              onChange={(e) =>
                setRequestForm({ ...requestForm, purpose: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${requestErrors.purpose ? "border-red-500" : "border-theme"
                }`}
              placeholder="e.g., Employment, Travel, School, Business"
            />
            {requestErrors.purpose && (
              <p className="text-sm text-red-500 mt-1">
                {requestErrors.purpose}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-theme-text mb-1">
              Details (Optional)
            </label>
            <textarea
              value={requestForm.details}
              onChange={(e) =>
                setRequestForm({ ...requestForm, details: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
              placeholder="Additional details or notes..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={resetRequestForm}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Clear
            </button>
            <button
              onClick={handleRequestCertification}
              className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <Send className="w-4 h-4" /> Request Certification
            </button>
          </div>
        </div>
      )}

      {/* Manage Tab */}
      {tab === "manage" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-theme-surface rounded-xl border border-theme p-3 text-center">
              <p className="text-xs text-theme-textSecondary">Total</p>
              <p className="text-xl font-bold text-theme-text">{stats.total}</p>
            </div>
            <div className="bg-theme-surface rounded-xl border border-theme p-3 text-center">
              <p className="text-xs text-theme-textSecondary">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="bg-theme-surface rounded-xl border border-theme p-3 text-center">
              <p className="text-xs text-theme-textSecondary">ZL Pending</p>
              <p className="text-xl font-bold text-amber-600">
                {stats.zlPending}
              </p>
            </div>
            <div className="bg-theme-surface rounded-xl border border-theme p-3 text-center">
              <p className="text-xs text-theme-textSecondary">Virtual</p>
              <p className="text-xl font-bold text-blue-600">{stats.virtual}</p>
            </div>
            <div className="bg-theme-surface rounded-xl border border-theme p-3 text-center">
              <p className="text-xs text-theme-textSecondary">Physical</p>
              <p className="text-xl font-bold text-green-600">
                {stats.physical}
              </p>
            </div>
            <div className="bg-theme-surface rounded-xl border border-theme p-3 text-center">
              <p className="text-xs text-theme-textSecondary">Approved</p>
              <p className="text-xl font-bold text-green-600">
                {stats.approved}
              </p>
            </div>
            <div className="bg-theme-surface rounded-xl border border-theme p-3 text-center">
              <p className="text-xs text-theme-textSecondary">Released</p>
              <p className="text-xl font-bold text-blue-600">
                {stats.released}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
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
                className="px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Review">In Review</option>
                <option value="Approved">Approved</option>
                <option value="Ready for Release">Ready for Release</option>
                <option value="Released">Released</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select
                value={zlFilter}
                onChange={(e) => setZlFilter(e.target.value)}
                className="px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              >
                <option value="all">All ZL Status</option>
                <option value="pending">ZL Pending</option>
                <option value="approved">ZL Approved</option>
                <option value="rejected">ZL Rejected</option>
              </select>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              >
                <option value="all">All Channels</option>
                <option value="physical">Physical</option>
                <option value="virtual">Virtual</option>
              </select>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              >
                {[10, 15, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {filteredCerts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
                <span>
                  Showing{" "}
                  <span className="font-semibold text-theme-text">
                    {startIndex + 1}–{endIndex}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-theme-text">
                    {filteredCerts.length}
                  </span>
                </span>
                <span className="text-xs">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </div>

          {/* Flow Indicator */}
          <div className="bg-theme-surface rounded-xl border border-theme p-3 shadow-sm overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              <span className="text-xs font-medium text-theme-textSecondary uppercase tracking-wider mr-2">
                Flow:
              </span>
              {FLOW_STEPS.map((step, index) => (
                <div key={step.key} className="flex items-center gap-1">
                  <div className={`p-1 rounded-full ${step.bg}`}>
                    <step.icon className={`w-3 h-3 ${step.color}`} />
                  </div>
                  <span className="text-xs text-theme-text whitespace-nowrap">
                    {step.label}
                  </span>
                  {index < FLOW_STEPS.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-theme-textSecondary" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
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
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      ZL Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Download
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Flow
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {paginatedCerts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-8 text-center text-theme-textSecondary"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Inbox className="w-8 h-8 text-theme-textSecondary/30" />
                          <p>No certifications found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCerts.map((cert: any) => {
                      const resident =
                        cert.resident || cert.requester?.resident || null;
                      const residentName = resident
                        ? `${resident.first_name} ${resident.last_name}`
                        : "Unknown";
                      const isVirtual = cert.submission_channel === "virtual";
                      const fee = cert.certification_type?.fee || 0;

                      return (
                        <tr
                          key={cert.id}
                          className="hover:bg-theme-hover transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-theme-text">
                            {cert.reference_number || "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-theme-textSecondary" />
                              <span className="text-theme-text">
                                {residentName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-theme-text">
                            {cert.certification_type?.name || "N/A"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-1 text-xs rounded-full ${isVirtual
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                }`}
                            >
                              {isVirtual ? "Virtual" : "Physical"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-1 text-xs rounded-full ${getZlStatusBadge(cert.zl_clearance_status)}`}
                            >
                              {cert.zl_clearance_status || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {fee > 0 ? (
                              <span
                                className={`inline-block px-2 py-1 text-xs rounded-full ${cert.payment_status === "paid"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  }`}
                              >
                                {cert.payment_status || "pending"}
                              </span>
                            ) : (
                              <span className="text-xs text-theme-textSecondary">
                                Free
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(cert.status || "Pending")}`}
                            >
                              {getStatusIcon(cert.status || "Pending")}
                              {cert.status || "Pending"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {getDownloadStatusBadge(cert)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {FLOW_STEPS.map((step, idx) => {
                                const status = getFlowStatus(cert, idx + 1);
                                const isRejected = cert.status === "Rejected";
                                return (
                                  <div
                                    key={step.key}
                                    className={`w-2 h-2 rounded-full ${isRejected
                                      ? "bg-red-400"
                                      : getFlowStepColor(status)
                                      }`}
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
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {getActionButtons(cert)}
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
            {filteredCerts.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredCerts.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                showItemsPerPage={false}
              />
            )}
          </div>
        </>
      )}

      {/* Types Tab */}
      {tab === "types" && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetTypeForm();
                setShowTypeModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Certificate Type
            </button>
          </div>
          <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Fee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {types.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-theme-textSecondary"
                      >
                        No certificate types found
                      </td>
                    </tr>
                  ) : (
                    types.map((type: any) => (
                      <tr
                        key={type.id}
                        className="hover:bg-theme-hover transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-theme-text">
                          {type.name}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {type.description || "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-theme-text">
                          {type.fee > 0 ? `₱${type.fee}` : "Free"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${type.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }`}
                          >
                            {type.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditType(type)}
                              className="p-1.5 text-theme-textSecondary hover:text-theme-text hover:bg-theme-hover rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedType(type);
                                setShowDeleteTypeModal(true);
                              }}
                              className="p-1.5 text-theme-textSecondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedCert(null);
        }}
        title="Certification Details"
        size="xl"
      >
        {selectedCert && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="bg-theme-background rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                {FLOW_STEPS.map((step, index) => {
                  const status = getFlowStatus(selectedCert, index + 1);
                  const isRejected = selectedCert.status === "Rejected";
                  const Icon = step.icon;
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center">
                        <div
                          className={`p-2 rounded-full ${isRejected
                            ? "bg-red-100 dark:bg-red-900/20"
                            : status === "completed"
                              ? "bg-green-100 dark:bg-green-900/20"
                              : status === "active"
                                ? "bg-blue-100 dark:bg-blue-900/20"
                                : "bg-gray-100 dark:bg-gray-800"
                            }`}
                        >
                          <Icon
                            className={`w-4 h-4 ${isRejected
                              ? "text-red-500"
                              : status === "completed"
                                ? "text-green-500"
                                : status === "active"
                                  ? "text-blue-500"
                                  : "text-gray-400 dark:text-gray-600"
                              }`}
                          />
                        </div>
                        <span className="text-[10px] text-theme-textSecondary mt-1 text-center">
                          {step.label}
                        </span>
                      </div>
                      {index < FLOW_STEPS.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 ${isRejected
                            ? "bg-red-200 dark:bg-red-800"
                            : status === "completed"
                              ? "bg-green-300 dark:bg-green-800"
                              : status === "active"
                                ? "bg-blue-300 dark:bg-blue-800"
                                : "bg-gray-200 dark:bg-gray-700"
                            }`}
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
                  {selectedCert.reference_number}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Status
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedCert.status)}`}
                >
                  {selectedCert.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Resident
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.resident?.first_name}{" "}
                  {selectedCert.resident?.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Type
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.certification_type?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Submission Channel
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.submission_channel === "virtual"
                    ? "Virtual"
                    : "Physical Visit"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  ZL Clearance
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${getZlStatusBadge(selectedCert.zl_clearance_status)}`}
                >
                  {selectedCert.zl_clearance_status || "Pending"}
                </span>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Payment
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.payment_method || "N/A"} -{" "}
                  {selectedCert.payment_status || "pending"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Fee
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.certification_type?.fee
                    ? formatCurrency(selectedCert.certification_type.fee)
                    : "Free"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-theme-textSecondary font-medium">
                  Purpose
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.purpose || "N/A"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-theme-textSecondary font-medium">
                  Details
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.details || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Requested
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.created_at
                    ? formatDate(selectedCert.created_at)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Approved
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.approved_at
                    ? formatDate(selectedCert.approved_at)
                    : "Not approved yet"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Released
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.released_at
                    ? formatDate(selectedCert.released_at)
                    : "Not released yet"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Downloaded
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.downloaded_at
                    ? formatDate(selectedCert.downloaded_at)
                    : "Not downloaded yet"}
                </p>
              </div>
              {selectedCert.zl_clearance_notes && (
                <div className="col-span-2">
                  <p className="text-xs text-theme-textSecondary font-medium">
                    ZL Notes
                  </p>
                  <p className="font-medium text-theme-text">
                    {selectedCert.zl_clearance_notes}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handlePreview(selectedCert);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-1"
              >
                <FileSignature className="w-4 h-4" /> Preview Certificate
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedCert(null);
                }}
                className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ZL Clearance Modal */}
      <Modal
        isOpen={showZlModal}
        onClose={() => {
          setShowZlModal(false);
          setSelectedCert(null);
          resetZlForm();
        }}
        title="Zone Leader Clearance"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <Shield className="w-4 h-4 inline mr-2" />
              Virtual request requires Zone Leader approval before proceeding.
            </p>
          </div>
          {selectedCert && (
            <div className="bg-theme-background rounded-lg p-4">
              <p className="font-medium text-theme-text">
                {selectedCert.resident?.first_name}{" "}
                {selectedCert.resident?.last_name}
              </p>
              <p className="text-sm text-theme-textSecondary">
                {selectedCert.certification_type?.name}
              </p>
              <p className="text-sm text-theme-textSecondary">
                Reference: {selectedCert.reference_number}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={zlForm.status}
              onChange={(e) => setZlForm({ ...zlForm, status: e.target.value })}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Notes
            </label>
            <textarea
              value={zlForm.notes}
              onChange={(e) => setZlForm({ ...zlForm, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
              placeholder="Add notes for the resident..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowZlModal(false);
                setSelectedCert(null);
                resetZlForm();
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleZlClearance}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Shield className="w-4 h-4 inline mr-2" /> Update ZL Clearance
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedCert(null);
          resetPaymentForm();
        }}
        title="Payment Details"
        size="lg"
      >
        <div className="space-y-4">
          {selectedCert && (
            <div className="bg-theme-background rounded-lg p-4">
              <p className="font-medium text-theme-text">
                {selectedCert.resident?.first_name}{" "}
                {selectedCert.resident?.last_name}
              </p>
              <p className="text-sm text-theme-textSecondary">
                {selectedCert.certification_type?.name}
              </p>
              <p className="text-sm font-medium text-theme-text">
                Amount:{" "}
                {formatCurrency(selectedCert.certification_type?.fee || 0)}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentForm.payment_method}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  payment_method: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="online">Online Payment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Payment Status <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentForm.payment_status}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  payment_status: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Payment Reference
            </label>
            <input
              type="text"
              value={paymentForm.payment_reference}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  payment_reference: e.target.value,
                })
              }
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              placeholder="OR number or reference"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setSelectedCert(null);
                resetPaymentForm();
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handlePaymentUpdate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CreditCard className="w-4 h-4 inline mr-2" /> Update Payment
            </button>
          </div>
        </div>
      </Modal>

      {/* Online Payment Modal */}
      <Modal
        isOpen={showOnlinePaymentModal}
        onClose={() => {
          setShowOnlinePaymentModal(false);
          setSelectedCert(null);
          setPaymentResult(null);
        }}
        title="Online Payment"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
            <Smartphone className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Sample Online Payment
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              This is a simulated payment for demonstration purposes.
            </p>
          </div>
          {selectedCert && (
            <div className="bg-theme-background rounded-lg p-4">
              <p className="font-medium text-theme-text">
                {selectedCert.resident?.first_name}{" "}
                {selectedCert.resident?.last_name}
              </p>
              <p className="text-sm text-theme-textSecondary">
                {selectedCert.certification_type?.name}
              </p>
              <p className="text-lg font-bold text-theme-text">
                Amount:{" "}
                {formatCurrency(selectedCert.certification_type?.fee || 0)}
              </p>
            </div>
          )}
          {paymentResult && (
            <div
              className={`p-4 rounded-lg ${paymentResult.success
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                }`}
            >
              <p
                className={`font-medium ${paymentResult.success
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
                  }`}
              >
                {paymentResult.success
                  ? "✅ Payment Successful!"
                  : "❌ Payment Failed"}
              </p>
              {paymentResult.success && (
                <p className="text-sm text-green-600 dark:text-green-300">
                  Reference: {paymentResult.reference}
                </p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowOnlinePaymentModal(false);
                setSelectedCert(null);
                setPaymentResult(null);
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            {!paymentResult && (
              <button
                onClick={handleOnlinePayment}
                disabled={isProcessingPayment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                ) : (
                  <Smartphone className="w-4 h-4 inline mr-2" />
                )}
                {isProcessingPayment ? "Processing..." : "Pay Now"}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedCert(null);
          setRejectReason("");
        }}
        title="Reject Certification"
      >
        <div className="space-y-4">
          <p className="text-theme-textSecondary">
            Are you sure you want to reject this certification request?
          </p>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Reason for Rejection
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
                setSelectedCert(null);
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

      {/* Document Generation Modal */}
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
                {selectedCert?.resident?.first_name}{" "}
                {selectedCert?.resident?.last_name}
              </strong>{" "}
              - {selectedCert?.certification_type?.name || "Certificate"}
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
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              placeholder="e.g., Certificate of Residency_John_Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Notes / Content (Optional)
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
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              placeholder="Add any notes or content that should be included in the document..."
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              After generating, the certificate preview will open so you can review
              and click <strong>Save PDF to Server</strong> to make it available for
              the resident to download.
            </p>
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

      {/* Type Modals */}
      <Modal
        isOpen={showTypeModal}
        onClose={() => {
          setShowTypeModal(false);
          resetTypeForm();
        }}
        title={isEditingType ? "Edit Certificate Type" : "Add Certificate Type"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Type Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={typeForm.name}
              onChange={(e) =>
                setTypeForm({ ...typeForm, name: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${typeErrors.name ? "border-red-500" : "border-theme"
                }`}
              placeholder="e.g., Certificate of Residency"
            />
            {typeErrors.name && (
              <p className="text-sm text-red-500 mt-1">{typeErrors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Description
            </label>
            <textarea
              value={typeForm.description}
              onChange={(e) =>
                setTypeForm({ ...typeForm, description: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              placeholder="Brief description of this certificate type..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Fee (₱)
            </label>
            <div className="relative">
              <PhilippinePeso className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={typeForm.fee}
                onChange={(e) =>
                  setTypeForm({ ...typeForm, fee: e.target.value })
                }
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${typeErrors.fee ? "border-red-500" : "border-theme"
                  }`}
                placeholder="0.00"
              />
            </div>
            {typeErrors.fee && (
              <p className="text-sm text-red-500 mt-1">{typeErrors.fee}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Status
            </label>
            <select
              value={typeForm.is_active ? "active" : "inactive"}
              onChange={(e) =>
                setTypeForm({
                  ...typeForm,
                  is_active: e.target.value === "active",
                })
              }
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setShowTypeModal(false);
                resetTypeForm();
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveType}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <Save className="w-4 h-4" />{" "}
              {isEditingType ? "Update Type" : "Add Type"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteTypeModal}
        onClose={() => {
          setShowDeleteTypeModal(false);
          setSelectedType(null);
        }}
        title="Delete Certificate Type"
      >
        <div className="space-y-4">
          <p className="text-theme-textSecondary">
            Are you sure you want to delete this certificate type? This action
            cannot be undone.
          </p>
          {selectedType && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="font-medium text-theme-text">{selectedType.name}</p>
              <p className="text-sm text-theme-textSecondary">
                {selectedType.fee > 0 ? `₱${selectedType.fee}` : "Free"}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowDeleteTypeModal(false);
                setSelectedType(null);
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteType}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* ✅ Certificate Preview Modal */}
      {showPreviewModal && previewCert && (
        <CertificatePreviewModal
          certification={previewCert}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewCert(null);
          }}
          onSaved={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}