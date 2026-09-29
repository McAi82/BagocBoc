// pages/financial/Payments.tsx

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  Eye,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  AlertCircle,
  Inbox,
  User,
  Phone,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  UserCheck,
  Users,
  Filter,
} from "lucide-react";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";

const ITEMS_PER_PAGE = 10;

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  // ✅ Payment form state
  const [paymentForm, setPaymentForm] = useState({
    resident_id: "",
    amount: "",
    payment_type: "",
    payment_method: "Cash",
    description: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ✅ Resident search state
  const [residentSearch, setResidentSearch] = useState("");
  const [showResidentDropdown, setShowResidentDropdown] = useState(false);
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Filtered residents based on search
  const filteredResidents = useMemo(() => {
    if (!residentSearch.trim()) return residents;
    const query = residentSearch.toLowerCase();
    return residents.filter((r: any) => {
      const firstName = r.first_name?.toLowerCase() || "";
      const lastName = r.last_name?.toLowerCase() || "";
      const middleName = r.middle_name?.toLowerCase() || "";
      const phone = r.phone_number?.toLowerCase() || "";
      const fullName = `${firstName} ${middleName} ${lastName}`.toLowerCase();
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        fullName.includes(query) ||
        phone.includes(query)
      );
    });
  }, [residents, residentSearch]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.data?.data && Array.isArray(data.data.data))
      return data.data.data;
    if (data?.residents && Array.isArray(data.residents)) return data.residents;
    if (data?.payments && Array.isArray(data.payments)) return data.payments;

    if (data?.status === "success" && data?.data) {
      if (Array.isArray(data.data)) return data.data;
      if (data.data?.data && Array.isArray(data.data.data))
        return data.data.data;
    }

    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 4) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.id !== undefined ||
            obj[0]?.first_name !== undefined ||
            obj[0]?.last_name !== undefined ||
            obj[0]?.or_number !== undefined ||
            obj[0]?.amount !== undefined)
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
      console.log("🔍 [Payments] Fetching payments...");

      let paymentsData: any[] = [];
      try {
        const paymentsRes = await api.get("/web/payments");
        paymentsData = extractData(paymentsRes.data);
        console.log(`✅ [Payments] Extracted ${paymentsData.length} payments`);
      } catch (error) {
        console.error("❌ Error fetching payments:", error);
        paymentsData = [];
      }

      let residentsData: any[] = [];
      try {
        const residentsRes = await api.get("/web/residents");
        residentsData = extractData(residentsRes.data);
        console.log(
          `✅ [Payments] Extracted ${residentsData.length} residents`,
        );
      } catch (error) {
        console.error("❌ Error fetching residents:", error);
        residentsData = [];
      }

      const mappedPayments = paymentsData.map((p: any) => ({
        ...p,
        amount: parseFloat(p.amount) || 0,
      }));

      setPayments(mappedPayments);
      setResidents(residentsData);
    } catch (error) {
      console.error("❌ [Payments] Error fetching data:", error);
      setIsError(true);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ Click outside dropdown to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowResidentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Handle resident selection
  const handleSelectResident = (resident: any) => {
    setSelectedResident(resident);
    setPaymentForm({ ...paymentForm, resident_id: resident.id.toString() });
    setResidentSearch(`${resident.first_name} ${resident.last_name}`);
    setShowResidentDropdown(false);
  };

  // ✅ Clear selected resident
  const handleClearResident = () => {
    setSelectedResident(null);
    setPaymentForm({ ...paymentForm, resident_id: "" });
    setResidentSearch("");
  };

  // ============================================
  // FILTERED PAYMENTS
  // ============================================
  const filteredPayments = useMemo(() => {
    if (!Array.isArray(payments) || payments.length === 0) return [];
    let filtered = [...payments];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p: any) =>
          p.or_number?.toLowerCase().includes(query) ||
          p.resident?.first_name?.toLowerCase().includes(query) ||
          p.resident?.last_name?.toLowerCase().includes(query),
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((p: any) => p.payment_type === typeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((p: any) => p.status === statusFilter);
    }

    // Sort by newest first
    filtered.sort((a, b) => {
      const dateA = new Date(a.paid_at || a.created_at).getTime();
      const dateB = new Date(b.paid_at || b.created_at).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [payments, searchQuery, typeFilter, statusFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredPayments.length);

  const paginatedPayments = useMemo(() => {
    return filteredPayments.slice(startIndex, endIndex);
  }, [filteredPayments, startIndex, endIndex]);

  // ✅ Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter, itemsPerPage]);

  // ✅ Clamp current page if it exceeds total pages after filtering
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // ✅ Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust window to always show ~3 pages
      if (currentPage <= 3) {
        start = 2;
        end = Math.min(4, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
        end = totalPages - 1;
      }

      if (start > 2) pages.push("...");

      for (let i = start; i <= end; i++) pages.push(i);

      if (end < totalPages - 1) pages.push("...");

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Optional: scroll to top of table
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ============================================
  // STATS (based on filtered payments, not paginated)
  // ============================================
  const totalAmount = filteredPayments.reduce(
    (sum: number, p: any) => sum + (p.amount || 0),
    0,
  );

  // ============================================
  // HANDLERS
  // ============================================

  // ============================================
  // IN-PAGE PRINT HELPER
  // ============================================
  const printHTML = (html: string) => {
    const existing = document.getElementById("print-portal");
    if (existing) existing.remove();

    const portal = document.createElement("div");
    portal.id = "print-portal";
    portal.innerHTML = html;
    document.body.appendChild(portal);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();

        const cleanup = () => {
          const el = document.getElementById("print-portal");
          if (el) el.remove();
          window.removeEventListener("afterprint", cleanup);
        };
        window.addEventListener("afterprint", cleanup);
      });
    });
  };

  const handlePrintReceipt = (payment: any) => {
    const residentName = payment.resident
      ? `${payment.resident.first_name || ""} ${payment.resident.last_name || ""}`.trim()
      : "N/A";

    const paidDate = payment.paid_at || payment.created_at;
    const formattedDate = paidDate
      ? new Date(paidDate).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "N/A";
    const formattedTime = paidDate
      ? new Date(paidDate).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
      })
      : "";

    const html = `
    <style>
      #print-portal * { box-sizing: border-box; margin: 0; padding: 0; }
      #print-portal {
        font-family: 'Georgia', 'Times New Roman', serif;
        color: #1a1a1a;
        background: #ffffff;
      }
      #print-portal .receipt {
        max-width: 720px;
        margin: 0 auto;
        background: #ffffff;
        padding: 40px 50px;
      }
      #print-portal .header {
        text-align: center;
        border-bottom: 3px double #1a1a1a;
        padding-bottom: 18px;
        margin-bottom: 26px;
      }
      #print-portal .header .republic {
        font-size: 11px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #555;
        margin-bottom: 6px;
      }
      #print-portal .header .barangay {
        font-size: 26px;
        font-weight: bold;
        letter-spacing: 1px;
        color: #0f172a;
        margin-bottom: 4px;
      }
      #print-portal .header .location {
        font-size: 12px;
        color: #666;
        font-style: italic;
      }
      #print-portal .title {
        text-align: center;
        font-size: 20px;
        font-weight: bold;
        letter-spacing: 4px;
        text-transform: uppercase;
        margin: 22px 0 8px;
        color: #0f172a;
      }
      #print-portal .subtitle {
        text-align: center;
        font-size: 12px;
        color: #666;
        margin-bottom: 26px;
        letter-spacing: 2px;
      }
      #print-portal .or-box {
        background: #f8f9fb;
        border: 1px solid #d1d5db;
        border-left: 4px solid #1e3a8a;
        padding: 14px 20px;
        margin-bottom: 26px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #print-portal .or-box .label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #666;
        font-weight: bold;
      }
      #print-portal .or-box .value {
        font-size: 18px;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        color: #1e3a8a;
      }
      #print-portal .details {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 26px;
      }
      #print-portal .details tr td {
        padding: 11px 0;
        border-bottom: 1px solid #eee;
        font-size: 14px;
        vertical-align: top;
      }
      #print-portal .details tr:last-child td { border-bottom: none; }
      #print-portal .details .field {
        color: #666;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        width: 40%;
      }
      #print-portal .details .val {
        color: #0f172a;
        font-weight: 600;
        text-align: right;
      }
      #print-portal .amount-section {
        background: #f0f4ff;
        border: 2px solid #1e3a8a;
        padding: 20px 24px;
        margin: 26px 0;
        text-align: center;
      }
      #print-portal .amount-section .label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #1e3a8a;
        margin-bottom: 6px;
      }
      #print-portal .amount-section .amount {
        font-size: 30px;
        font-weight: bold;
        color: #1e3a8a;
        font-family: 'Georgia', serif;
      }
      #print-portal .status-badge {
        display: inline-block;
        padding: 4px 14px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
        background: #d1fae5;
        color: #065f46;
      }
      #print-portal .signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 50px;
        gap: 40px;
      }
      #print-portal .sig-block {
        flex: 1;
        text-align: center;
      }
      #print-portal .sig-block .line {
        border-top: 1px solid #333;
        margin-bottom: 6px;
        height: 40px;
      }
      #print-portal .sig-block .name {
        font-size: 13px;
        font-weight: bold;
        color: #0f172a;
      }
      #print-portal .sig-block .role {
        font-size: 11px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      #print-portal .footer-note {
        margin-top: 34px;
        padding-top: 18px;
        border-top: 1px dashed #ccc;
        font-size: 10px;
        color: #888;
        text-align: center;
        line-height: 1.6;
      }
    </style>

    <div class="receipt">
      <div class="header">
        <div class="republic">Republic of the Philippines</div>
        <div class="barangay">BARANGAY BAGOCBOC</div>
        <div class="location">Opol, Misamis Oriental</div>
      </div>

      <div class="title">Official Receipt</div>
      <div class="subtitle">Payment Acknowledgement</div>

      <div class="or-box">
        <div>
          <div class="label">OR Number</div>
          <div class="value">${payment.or_number || "N/A"}</div>
        </div>
        <div style="text-align:right">
          <div class="label">Date Issued</div>
          <div style="font-size:13px;font-weight:600;color:#0f172a;margin-top:4px">
            ${formattedDate}${formattedTime ? ` • ${formattedTime}` : ""}
          </div>
        </div>
      </div>

      <table class="details">
        <tr>
          <td class="field">Received From</td>
          <td class="val">${residentName}</td>
        </tr>
        <tr>
          <td class="field">Payment Type</td>
          <td class="val">${payment.payment_type || "N/A"}</td>
        </tr>
        <tr>
          <td class="field">Payment Method</td>
          <td class="val">${payment.payment_method || "Cash"}</td>
        </tr>
        <tr>
          <td class="field">Status</td>
          <td class="val">
            <span class="status-badge">${payment.status || "Completed"}</span>
          </td>
        </tr>
        ${payment.description
        ? `<tr>
                <td class="field">Description</td>
                <td class="val">${payment.description}</td>
              </tr>`
        : ""
      }
      </table>

      <div class="amount-section">
        <div class="label">Total Amount Paid</div>
        <div class="amount">₱ ${parseFloat(payment.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>

      <div class="signatures">
        <div class="sig-block">
          <div class="line"></div>
          <div class="name">Barangay Treasurer</div>
          <div class="role">Authorized Personnel</div>
        </div>
        <div class="sig-block">
          <div class="line"></div>
          <div class="name">${residentName}</div>
          <div class="role">Payor / Received By</div>
        </div>
      </div>

      <div class="footer-note">
        This is a system-generated official receipt from the Barangay Bagocboc Management System.<br/>
        Thank you for your payment. Please keep this receipt for your records.
      </div>
    </div>
  `;

    printHTML(html);
  };

  const handleRecordPayment = async () => {
    const errors: Record<string, string> = {};
    if (!paymentForm.resident_id)
      errors.resident_id = "Please select a resident";
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0)
      errors.amount = "Please enter a valid amount";
    if (!paymentForm.payment_type)
      errors.payment_type = "Please select a payment type";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the errors below");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/web/payments", {
        resident_id: parseInt(paymentForm.resident_id),
        amount: parseFloat(paymentForm.amount),
        payment_type: paymentForm.payment_type,
        payment_method: paymentForm.payment_method,
        description: paymentForm.description,
      });
      toast.success("Payment recorded successfully!");
      setShowRecordModal(false);
      setPaymentForm({
        resident_id: "",
        amount: "",
        payment_type: "",
        payment_method: "Cash",
        description: "",
      });
      setSelectedResident(null);
      setResidentSearch("");
      fetchData();
    } catch (error: any) {
      console.error("Record payment error:", error);
      toast.error(error?.response?.data?.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading payments...
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
            Failed to Load Payments
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
          <h1 className="text-2xl font-bold text-theme-text">Payments</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Manage all payment transactions
          </p>
        </div>
        <button
          onClick={() => {
            setPaymentForm({
              resident_id: "",
              amount: "",
              payment_type: "",
              payment_method: "Cash",
              description: "",
            });
            setSelectedResident(null);
            setResidentSearch("");
            setFormErrors({});
            setShowRecordModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Total Payments</p>
          <p className="text-2xl font-bold text-theme-text">
            {filteredPayments.length}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Total Amount</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Completed</p>
          <p className="text-2xl font-bold text-blue-600">
            {
              filteredPayments.filter((p: any) => p.status === "completed")
                .length
            }
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search by OR number or resident..."
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
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            <option value="all">All Types</option>
            <option value="Barangay Clearance">Barangay Clearance</option>
            <option value="Certificate of Residency">
              Certificate of Residency
            </option>
            <option value="Business Clearance">Business Clearance</option>
            <option value="Certificate of Indigency">
              Certificate of Indigency
            </option>
          </select>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <CreditCard className="w-12 h-12 text-theme-textSecondary/30" />
              <p className="text-theme-text font-medium">No Payments Found</p>
              <p className="text-sm text-theme-textSecondary">
                Try adjusting your search or filters.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Table Info Bar */}
            <div className="px-4 py-3 border-b border-theme flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-theme-textSecondary">
                Showing{" "}
                <span className="font-semibold text-theme-text">
                  {startIndex + 1}–{endIndex}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-theme-text">
                  {filteredPayments.length}
                </span>{" "}
                payments
              </p>
              <p className="text-xs text-theme-textSecondary">
                Page {currentPage} of {totalPages}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      OR Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Resident
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Status
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
                  {paginatedPayments.map((payment: any) => (
                    <tr
                      key={payment.id || `payment-${Math.random()}`}
                      className="hover:bg-theme-hover transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-theme-text font-mono text-sm">
                        {payment.or_number || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {payment.resident?.first_name || "Unknown"}{" "}
                        {payment.resident?.last_name || ""}
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {payment.payment_type || "N/A"}
                      </td>
                      <td className="px-4 py-3 font-medium text-theme-text">
                        {formatCurrency(parseFloat(payment.amount) || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-theme-background rounded-full text-xs text-theme-textSecondary">
                          <CreditCard className="w-3 h-3" />
                          {payment.payment_method || "Cash"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(payment.status || "pending")}`}
                        >
                          {payment.status === "completed" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {payment.status || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-textSecondary">
                        {payment.created_at
                          ? formatDate(payment.created_at)
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePrintReceipt(payment)}
                            className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                            title="Print Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-theme-textSecondary hover:text-theme-text hover:bg-theme-hover rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ============================================ */}
            {/* PAGINATION CONTROLS */}
            {/* ============================================ */}
            {totalPages > 1 && (
              <div className="px-4 py-4 border-t border-theme flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Left: Item count info */}
                <p className="text-sm text-theme-textSecondary order-2 sm:order-1">
                  Showing{" "}
                  <span className="font-semibold text-theme-text">
                    {startIndex + 1}–{endIndex}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-theme-text">
                    {filteredPayments.length}
                  </span>
                </p>

                {/* Right: Page controls */}
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  {/* First Page */}
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                    title="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  {/* Previous */}
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1 mx-1">
                    {getPageNumbers().map((page, index) => {
                      if (page === "...") {
                        return (
                          <span
                            key={`ellipsis-${index}`}
                            className="px-2 text-theme-textSecondary text-sm"
                          >
                            …
                          </span>
                        );
                      }
                      const pageNum = page as number;
                      const isActive = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${isActive
                            ? "bg-theme-primary text-white shadow-sm"
                            : "border border-theme text-theme-text hover:bg-theme-hover"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next */}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-theme hover:bg-theme-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-theme-textSecondary"
                    title="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ============================================ */}
      {/* RECORD PAYMENT MODAL */}
      {/* ============================================ */}
      <Modal
        isOpen={showRecordModal}
        onClose={() => {
          setShowRecordModal(false);
          setPaymentForm({
            resident_id: "",
            amount: "",
            payment_type: "",
            payment_method: "Cash",
            description: "",
          });
          setSelectedResident(null);
          setResidentSearch("");
          setFormErrors({});
        }}
        title="Record Payment"
        size="lg"
      >
        <div className="space-y-6">
          {/* Resident Selection - Searchable Dropdown */}
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Resident <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type="text"
                  placeholder={
                    selectedResident
                      ? `${selectedResident.first_name} ${selectedResident.last_name}`
                      : "Search resident by name or phone..."
                  }
                  value={residentSearch}
                  onChange={(e) => {
                    setResidentSearch(e.target.value);
                    setShowResidentDropdown(true);
                    if (e.target.value === "") {
                      setSelectedResident(null);
                      setPaymentForm({ ...paymentForm, resident_id: "" });
                    }
                  }}
                  onFocus={() => {
                    if (!selectedResident) {
                      setShowResidentDropdown(true);
                    }
                  }}
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${formErrors.resident_id ? "border-red-500" : "border-theme"
                    }`}
                />
                {selectedResident && (
                  <button
                    onClick={handleClearResident}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {!selectedResident && (
                  <ChevronDown
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary transition-transform ${showResidentDropdown ? "rotate-180" : ""
                      }`}
                  />
                )}
              </div>

              {/* Selected Resident Display */}
              {selectedResident && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-theme-text">
                        {selectedResident.first_name}{" "}
                        {selectedResident.last_name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-theme-textSecondary">
                        {selectedResident.phone_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {selectedResident.phone_number}
                          </span>
                        )}
                        {selectedResident.gender && (
                          <span>{selectedResident.gender}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleClearResident}
                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Dropdown Results */}
              {showResidentDropdown && !selectedResident && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-theme-surface border border-theme rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {residents.length === 0 ? (
                    <div className="px-4 py-6 text-center text-theme-textSecondary">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No residents found</p>
                      <p className="text-xs">Please add residents first</p>
                    </div>
                  ) : filteredResidents.length === 0 ? (
                    <div className="px-4 py-6 text-center text-theme-textSecondary">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No matching residents</p>
                      <p className="text-xs">Try a different search term</p>
                    </div>
                  ) : (
                    filteredResidents.map((resident: any) => (
                      <button
                        key={resident.id}
                        onClick={() => handleSelectResident(resident)}
                        className="w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors border-b border-theme last:border-0 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-theme-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-theme-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-theme-text group-hover:text-theme-primary transition-colors">
                              {resident.first_name} {resident.last_name}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-theme-textSecondary">
                              {resident.phone_number && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {resident.phone_number}
                                </span>
                              )}
                              {resident.gender && (
                                <span>{resident.gender}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs px-2 py-1 bg-theme-background rounded-full text-theme-textSecondary opacity-0 group-hover:opacity-100 transition-opacity">
                          Select
                        </div>
                      </button>
                    ))
                  )}

                  {filteredResidents.length > 0 && (
                    <div className="px-4 py-2 bg-theme-background border-t border-theme text-xs text-theme-textSecondary flex items-center justify-between">
                      <span>
                        {filteredResidents.length} resident
                        {filteredResidents.length !== 1 ? "s" : ""} found
                      </span>
                      <span className="text-theme-primary">
                        Total: {residents.length}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {formErrors.resident_id && (
              <p className="text-sm text-red-500 mt-1">
                {formErrors.resident_id}
              </p>
            )}
            <p className="text-xs text-theme-textSecondary mt-1">
              <span className="font-medium">💡 Tip:</span> Type resident name or
              phone number to search
            </p>
          </div>

          {/* Payment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Payment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentForm.payment_type}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    payment_type: e.target.value,
                  })
                }
                className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${formErrors.payment_type ? "border-red-500" : "border-theme"
                  }`}
              >
                <option value="">Select Type</option>
                <option value="Barangay Clearance">Barangay Clearance</option>
                <option value="Certificate of Residency">
                  Certificate of Residency
                </option>
                <option value="Business Clearance">Business Clearance</option>
                <option value="Barangay Tax">Barangay Tax</option>
                <option value="Real Property Tax">Real Property Tax</option>
                <option value="Cedula">Cedula</option>
              </select>
              {formErrors.payment_type && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.payment_type}
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Amount (₱) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${formErrors.amount ? "border-red-500" : "border-theme"
                    }`}
                  placeholder="0.00"
                />
              </div>
              {formErrors.amount && (
                <p className="text-sm text-red-500 mt-1">{formErrors.amount}</p>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {["Cash", "GCash"].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() =>
                    setPaymentForm({ ...paymentForm, payment_method: method })
                  }
                  className={`px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${paymentForm.payment_method === method
                    ? "bg-theme-primary text-white border-theme-primary"
                    : "bg-theme-surface text-theme-textSecondary border-theme hover:bg-theme-hover"
                    }`}
                >
                  <CreditCard
                    className={`w-4 h-4 inline mr-2 ${paymentForm.payment_method === method
                      ? "text-white"
                      : "text-theme-textSecondary"
                      }`}
                  />
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Description
            </label>
            <textarea
              value={paymentForm.description}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, description: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
              placeholder="Additional notes or description..."
            />
          </div>

          {/* Summary */}
          {selectedResident &&
            paymentForm.amount &&
            parseFloat(paymentForm.amount) > 0 && (
              <div className="bg-theme-background rounded-lg p-4 border border-theme">
                <p className="text-sm font-medium text-theme-text mb-2">
                  Payment Summary
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-theme-textSecondary">Resident</p>
                    <p className="font-medium text-theme-text">
                      {selectedResident.first_name} {selectedResident.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-theme-textSecondary">Amount</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(parseFloat(paymentForm.amount) || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-theme-textSecondary">Payment Type</p>
                    <p className="font-medium text-theme-text">
                      {paymentForm.payment_type || "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-theme-textSecondary">Payment Method</p>
                    <p className="font-medium text-theme-text">
                      {paymentForm.payment_method}
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <button
              onClick={() => {
                setShowRecordModal(false);
                setPaymentForm({
                  resident_id: "",
                  amount: "",
                  payment_type: "",
                  payment_method: "Cash",
                  description: "",
                });
                setSelectedResident(null);
                setResidentSearch("");
                setFormErrors({});
              }}
              className="px-4 py-2.5 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleRecordPayment}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Recording...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Record Payment
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedPayment(null);
        }}
        title="Payment Details"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  OR Number
                </p>
                <p className="font-medium text-theme-text">
                  {selectedPayment.or_number || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Status
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedPayment.status || "pending")}`}
                >
                  {selectedPayment.status || "pending"}
                </span>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Resident
                </p>
                <p className="font-medium text-theme-text">
                  {selectedPayment.resident?.first_name || "Unknown"}{" "}
                  {selectedPayment.resident?.last_name || ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Amount
                </p>
                <p className="font-medium text-theme-text">
                  {formatCurrency(parseFloat(selectedPayment.amount) || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Payment Type
                </p>
                <p className="font-medium text-theme-text">
                  {selectedPayment.payment_type || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Payment Method
                </p>
                <p className="font-medium text-theme-text">
                  {selectedPayment.payment_method || "N/A"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-theme-textSecondary font-medium">
                  Description
                </p>
                <p className="font-medium text-theme-text">
                  {selectedPayment.description || "No description"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Date Paid
                </p>
                <p className="font-medium text-theme-text">
                  {selectedPayment.paid_at
                    ? formatDate(selectedPayment.paid_at)
                    : "Not paid yet"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Processed By
                </p>
                <p className="font-medium text-theme-text">
                  {selectedPayment.processed_by?.email || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handlePrintReceipt(selectedPayment)}
                className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedPayment(null);
                }}
                className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
