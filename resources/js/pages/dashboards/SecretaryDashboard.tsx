// pages/dashboards/SecretaryDashboard.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  FileText,
  CreditCard,
  Receipt,
  Search,
  Plus,
  Eye,
  Edit,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  Calendar,
  FileCheck,
  Loader2,
  ChevronDown,
  Download,
  X,
  FileBadge,
  FileSignature,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

export default function SecretaryDashboard() {
  const [activeTab, setActiveTab] = useState("residents");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [residents, setResidents] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [clearances, setClearances] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);

  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // ✅ Certificate View Modal state
  const [showCertViewModal, setShowCertViewModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<any>(null);

  // ✅ Resident Edit Modal state
  const [showEditResidentModal, setShowEditResidentModal] = useState(false);
  const [editingResident, setEditingResident] = useState<any>(null);
  const [residentForm, setResidentForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    phone_number: "",
    gender: "Male",
    citizenship: "Filipino",
    birth_date: "",
    place_of_birth: "",
    civil_status: "Single",
    voter_status: "Not Registered",
    occupation: "",
    monthly_income: "",
    education_attainment: "",
  });
  const [residentFormErrors, setResidentFormErrors] = useState<
    Record<string, string>
  >({});

  const [certForm, setCertForm] = useState({
    resident_id: "",
    certification_type_id: "",
    purpose: "",
    details: "",
  });
  const [certErrors, setCertErrors] = useState<Record<string, string>>({});
  const [taxForm, setTaxForm] = useState({
    taxpayer_name: "",
    amount: "",
    tax_type: "Cedula",
    payment_method: "Cash",
  });
  const [taxErrors, setTaxErrors] = useState<Record<string, string>>({});
  const [paymentForm, setPaymentForm] = useState({
    resident_id: "",
    amount: "",
    payment_type: "",
    payment_method: "Cash",
  });
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>(
    {},
  );
  const [types, setTypes] = useState<any[]>([]);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // ✅ Reset to page 1 when tab, search, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, itemsPerPage]);

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

  // ============================================
  // PRINT HANDLERS
  // ============================================
  const handlePrintPayment = (payment: any) => {
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

  const handlePrintTax = (tax: any) => {
    const paidDate = tax.paid_at || tax.created_at;
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
          border-left: 4px solid #6d28d9;
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
          color: #6d28d9;
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
          background: #f5f3ff;
          border: 2px solid #6d28d9;
          padding: 20px 24px;
          margin: 26px 0;
          text-align: center;
        }
        #print-portal .amount-section .label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #6d28d9;
          margin-bottom: 6px;
        }
        #print-portal .amount-section .amount {
          font-size: 30px;
          font-weight: bold;
          color: #6d28d9;
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

        <div class="title">Tax Receipt</div>
        <div class="subtitle">Official Tax Payment Acknowledgement</div>

        <div class="or-box">
          <div>
            <div class="label">Receipt Number</div>
            <div class="value">${tax.receipt_number || "N/A"}</div>
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
            <td class="field">Taxpayer Name</td>
            <td class="val">${tax.taxpayer_name || "N/A"}</td>
          </tr>
          <tr>
            <td class="field">Tax Type</td>
            <td class="val">${tax.tax_type || "N/A"}</td>
          </tr>
          <tr>
            <td class="field">Payment Method</td>
            <td class="val">${tax.payment_method || "Cash"}</td>
          </tr>
          <tr>
            <td class="field">Status</td>
            <td class="val">
              <span class="status-badge">${tax.status || "Paid"}</span>
            </td>
          </tr>
          ${tax.remarks
        ? `<tr>
                  <td class="field">Remarks</td>
                  <td class="val">${tax.remarks}</td>
                </tr>`
        : ""
      }
        </table>

        <div class="amount-section">
          <div class="label">Total Amount Paid</div>
          <div class="amount">₱ ${parseFloat(tax.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div class="signatures">
          <div class="sig-block">
            <div class="line"></div>
            <div class="name">Barangay Treasurer</div>
            <div class="role">Authorized Personnel</div>
          </div>
          <div class="sig-block">
            <div class="line"></div>
            <div class="name">${tax.taxpayer_name || "Taxpayer"}</div>
            <div class="role">Payor / Received By</div>
          </div>
        </div>

        <div class="footer-note">
          This is a system-generated tax receipt from the Barangay Bagocboc Management System.<br/>
          Thank you for your payment. Please keep this receipt for your records.
        </div>
      </div>
    `;

    printHTML(html);
  };

  // ============================================
  // RESIDENT EDIT HANDLERS
  // ============================================
  const handleOpenEditResident = (resident: any) => {
    setEditingResident(resident);
    setResidentForm({
      first_name: resident.first_name || "",
      middle_name: resident.middle_name || "",
      last_name: resident.last_name || "",
      suffix: resident.suffix || "",
      phone_number: resident.phone_number || "",
      gender: resident.gender || "Male",
      citizenship: resident.citizenship || "Filipino",
      birth_date: resident.birth_date?.split("T")[0] || "",
      place_of_birth: resident.place_of_birth || "",
      civil_status: resident.civil_status || "Single",
      voter_status: resident.voter_status || "Not Registered",
      occupation: resident.occupation || "",
      monthly_income: resident.monthly_income?.toString() || "",
      education_attainment: resident.education_attainment || "",
    });
    setResidentFormErrors({});
    setShowEditResidentModal(true);
  };

  const handleUpdateResident = async () => {
    if (!editingResident) return;

    const errors: Record<string, string> = {};
    if (!residentForm.first_name.trim())
      errors.first_name = "First name is required";
    if (!residentForm.last_name.trim())
      errors.last_name = "Last name is required";
    if (!residentForm.birth_date)
      errors.birth_date = "Birth date is required";
    if (!residentForm.place_of_birth.trim())
      errors.place_of_birth = "Place of birth is required";
    if (!residentForm.citizenship.trim())
      errors.citizenship = "Citizenship is required";
    if (!residentForm.education_attainment.trim())
      errors.education_attainment = "Education attainment is required";

    setResidentFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the errors below");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/web/residents/${editingResident.id}`, {
        first_name: residentForm.first_name,
        middle_name: residentForm.middle_name || null,
        last_name: residentForm.last_name,
        suffix: residentForm.suffix || null,
        phone_number: residentForm.phone_number || null,
        gender: residentForm.gender,
        citizenship: residentForm.citizenship,
        birth_date: residentForm.birth_date,
        place_of_birth: residentForm.place_of_birth,
        civil_status: residentForm.civil_status,
        voter_status: residentForm.voter_status,
        occupation: residentForm.occupation || null,
        monthly_income: residentForm.monthly_income
          ? parseFloat(residentForm.monthly_income)
          : null,
        education_attainment: residentForm.education_attainment,
      });

      toast.success("Resident updated successfully!");
      setShowEditResidentModal(false);
      setEditingResident(null);
      fetchAllData();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const newErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach((key) => {
          newErrors[key] = apiErrors[key][0];
        });
        setResidentFormErrors(newErrors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to update resident",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // DATA FETCHING
  // ============================================
  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.residents && Array.isArray(data.residents)) return data.residents;
    if (data?.certifications && Array.isArray(data.certifications))
      return data.certifications;
    if (data?.clearances && Array.isArray(data.clearances))
      return data.clearances;
    if (data?.payments && Array.isArray(data.payments)) return data.payments;
    if (data?.taxPayments && Array.isArray(data.taxPayments))
      return data.taxPayments;
    if (data?.types && Array.isArray(data.types)) return data.types;
    const findArray = (obj: any): any[] => {
      if (!obj) return [];
      if (Array.isArray(obj)) return obj;
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          const result = findArray(obj[key]);
          if (result.length > 0) return result;
        }
      }
      return [];
    };
    return findArray(data);
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [
        residentsRes,
        certsRes,
        clearancesRes,
        paymentsRes,
        taxesRes,
        typesRes,
      ] = await Promise.all([
        api.get("/web/residents"),
        api.get("/web/certifications"),
        api.get("/web/clearance"),
        api.get("/web/payments"),
        api.get("/web/tax-payments"),
        api.get("/web/certifications/types"),
      ]);

      setResidents(extractData(residentsRes.data));
      setCertifications(extractData(certsRes.data));
      setClearances(extractData(clearancesRes.data));
      setPayments(
        extractData(paymentsRes.data).map((p: any) => ({
          ...p,
          amount: parseFloat(p.amount) || 0,
        })),
      );
      setTaxes(
        extractData(taxesRes.data).map((t: any) => ({
          ...t,
          amount: parseFloat(t.amount) || 0,
        })),
      );
      setTypes(extractData(typesRes.data));
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsError(true);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ============================================
  // FILTERS
  // ============================================
  const filteredResidents = residents.filter((r: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const firstName = r.first_name?.toLowerCase() || "";
    const lastName = r.last_name?.toLowerCase() || "";
    const phone = r.phone_number?.toLowerCase() || "";
    return (
      firstName.includes(query) ||
      lastName.includes(query) ||
      phone.includes(query)
    );
  });

  const filteredCertifications = certifications.filter((c: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const ref = c.reference_number?.toLowerCase() || "";
    const firstName = c.resident?.first_name?.toLowerCase() || "";
    const lastName = c.resident?.last_name?.toLowerCase() || "";
    return (
      ref.includes(query) ||
      firstName.includes(query) ||
      lastName.includes(query)
    );
  });

  const filteredPayments = payments.filter((p: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const or = p.or_number?.toLowerCase() || "";
    const firstName = p.resident?.first_name?.toLowerCase() || "";
    const lastName = p.resident?.last_name?.toLowerCase() || "";
    return (
      or.includes(query) ||
      firstName.includes(query) ||
      lastName.includes(query)
    );
  });

  const filteredTax = taxes.filter((t: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = t.taxpayer_name?.toLowerCase() || "";
    const receipt = t.receipt_number?.toLowerCase() || "";
    return name.includes(query) || receipt.includes(query);
  });

  // ============================================
  // PAGINATION
  // ============================================
  const paginate = (list: any[]) => {
    const totalPages = Math.max(1, Math.ceil(list.length / itemsPerPage));
    const page = Math.min(currentPage, totalPages);
    const start = (page - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, list.length);
    return {
      page,
      totalPages,
      start,
      end,
      slice: list.slice(start, end),
      total: list.length,
    };
  };

  const residentsPage = paginate(filteredResidents);
  const certsPage = paginate(filteredCertifications);
  const paymentsPage = paginate(filteredPayments);
  const taxPage = paginate(filteredTax);

  const stats = {
    totalResidents: residents.length,
    pendingCertificates: certifications.filter(
      (c: any) => c.status === "Pending" || c.status === "In Review",
    ).length,
    totalPayments: payments.reduce(
      (sum: number, p: any) => sum + (p.amount || 0),
      0,
    ),
    totalTax: taxes.reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
  };

  const handleRefresh = () => {
    toast.loading("Refreshing data...");
    fetchAllData();
    setTimeout(() => {
      toast.dismiss();
      toast.success("Data refreshed!");
    }, 500);
  };

  // ============================================
  // ISSUE / RECORD HANDLERS
  // ============================================
  const handleIssueCertificate = async () => {
    const errors: Record<string, string> = {};
    if (!certForm.resident_id) errors.resident_id = "Please select a resident";
    if (!certForm.certification_type_id)
      errors.certification_type_id = "Please select a certificate type";
    setCertErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await api.post("/web/certifications", {
        resident_id: parseInt(certForm.resident_id),
        certification_type_id: parseInt(certForm.certification_type_id),
        purpose: certForm.purpose,
        details: certForm.details,
      });
      toast.success("Certificate requested successfully!");
      setShowCertificateModal(false);
      setCertForm({
        resident_id: "",
        certification_type_id: "",
        purpose: "",
        details: "",
      });
      fetchAllData();
    } catch (error) {
      toast.error("Failed to issue certificate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordTax = async () => {
    const errors: Record<string, string> = {};
    if (!taxForm.taxpayer_name)
      errors.taxpayer_name = "Taxpayer name is required";
    if (!taxForm.amount || parseFloat(taxForm.amount) <= 0)
      errors.amount = "Please enter a valid amount";
    setTaxErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await api.post("/web/frontdesk/tax", {
        taxpayer_name: taxForm.taxpayer_name,
        amount: parseFloat(taxForm.amount),
        tax_type: taxForm.tax_type,
        payment_method: taxForm.payment_method,
      });
      toast.success("Tax payment recorded successfully!");
      setShowTaxModal(false);
      setTaxForm({
        taxpayer_name: "",
        amount: "",
        tax_type: "Cedula",
        payment_method: "Cash",
      });
      fetchAllData();
    } catch (error) {
      toast.error("Failed to record tax payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
      case "in review":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "approved":
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-theme-textSecondary" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading dashboard...
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
            Failed to Load Dashboard
          </h3>
          <button
            onClick={fetchAllData}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            Secretary Dashboard
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Manage resident records, issue certificates, process payments, and
            record taxes
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
        >
          <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-textSecondary">
                Total Residents
              </p>
              <p className="text-2xl font-bold text-theme-text">
                {stats.totalResidents}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-textSecondary">
                Pending Certificates
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {stats.pendingCertificates}
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-textSecondary">
                Total Payments
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalPayments)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-textSecondary">
                Tax Collected
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.totalTax)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Receipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          {
            id: "residents",
            label: "Residents",
            icon: Users,
            count: residents.length,
          },
          {
            id: "certificates",
            label: "Certificates",
            icon: FileText,
            count: stats.pendingCertificates,
          },
          { id: "payments", label: "Payments", icon: CreditCard },
          { id: "tax", label: "Tax Records", icon: Receipt },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? "bg-theme-primary text-white" : "bg-theme-surface text-theme-textSecondary hover:bg-theme-hover border border-theme"}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-theme-background text-theme-textSecondary"}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        <div className="p-4 border-b border-theme flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
            />
          </div>
          <div className="flex gap-2">
            {activeTab === "certificates" && (
              <button
                onClick={() => setShowCertificateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <FileText className="w-4 h-4" /> Issue Certificate
              </button>
            )}
            {activeTab === "tax" && (
              <button
                onClick={() => setShowTaxModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-theme-accent text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <Receipt className="w-4 h-4" /> Record Tax
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {/* Residents Tab */}
          {activeTab === "residents" && (
            <>
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Registered
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {residentsPage.slice.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-theme-textSecondary"
                      >
                        No residents found
                      </td>
                    </tr>
                  ) : (
                    residentsPage.slice.map((resident: any) => (
                      <tr
                        key={resident.id}
                        className="hover:bg-theme-hover transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-theme-text">
                          {resident.first_name} {resident.last_name}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {resident.place_of_birth || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor("active")}`}
                          >
                            Active
                          </span>
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {resident.created_at
                            ? formatDate(resident.created_at)
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleOpenEditResident(resident)}
                            className="text-theme-primary hover:text-theme-secondary font-medium text-sm inline-flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" /> Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filteredResidents.length > 0 && (
                <Pagination
                  currentPage={residentsPage.page}
                  totalPages={residentsPage.totalPages}
                  totalItems={residentsPage.total}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              )}
            </>
          )}

          {/* Certificates Tab */}
          {activeTab === "certificates" && (
            <>
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Ref No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Resident
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {certsPage.slice.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-theme-textSecondary"
                      >
                        No certificates found
                      </td>
                    </tr>
                  ) : (
                    certsPage.slice.map((cert: any) => (
                      <tr
                        key={cert.id}
                        className="hover:bg-theme-hover transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-theme-text">
                          {cert.reference_number}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {cert.resident?.first_name} {cert.resident?.last_name}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {cert.certification_type?.name || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${getStatusColor(cert.status)}`}
                          >
                            {getStatusIcon(cert.status)}
                            {cert.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {cert.created_at
                            ? formatDate(cert.created_at)
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedCert(cert);
                              setShowCertViewModal(true);
                            }}
                            className="text-theme-primary hover:text-theme-secondary text-sm font-medium inline-flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filteredCertifications.length > 0 && (
                <Pagination
                  currentPage={certsPage.page}
                  totalPages={certsPage.totalPages}
                  totalItems={certsPage.total}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              )}
            </>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <>
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      OR No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Resident
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {paymentsPage.slice.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-theme-textSecondary"
                      >
                        No payments found
                      </td>
                    </tr>
                  ) : (
                    paymentsPage.slice.map((payment: any) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-theme-hover transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-theme-text">
                          {payment.or_number}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {payment.resident?.first_name}{" "}
                          {payment.resident?.last_name}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {payment.payment_type}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {payment.payment_method}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {payment.created_at
                            ? formatDate(payment.created_at)
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handlePrintPayment(payment)}
                            className="text-theme-primary hover:text-theme-secondary text-sm font-medium inline-flex items-center gap-1"
                          >
                            <Printer className="w-4 h-4" /> Print
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filteredPayments.length > 0 && (
                <Pagination
                  currentPage={paymentsPage.page}
                  totalPages={paymentsPage.totalPages}
                  totalItems={paymentsPage.total}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              )}
            </>
          )}

          {/* Tax Tab */}
          {activeTab === "tax" && (
            <>
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Taxpayer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {taxPage.slice.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-theme-textSecondary"
                      >
                        No tax records found
                      </td>
                    </tr>
                  ) : (
                    taxPage.slice.map((tax: any) => (
                      <tr
                        key={tax.id}
                        className="hover:bg-theme-hover transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-theme-text">
                          {tax.taxpayer_name}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {formatCurrency(tax.amount)}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {tax.tax_type}
                        </td>
                        <td className="px-4 py-3 text-theme-textSecondary">
                          {tax.created_at ? formatDate(tax.created_at) : "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(tax.status)}`}
                          >
                            {tax.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handlePrintTax(tax)}
                            className="text-theme-accent hover:text-theme-secondary text-sm font-medium inline-flex items-center gap-1"
                          >
                            <Printer className="w-4 h-4" /> Print
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filteredTax.length > 0 && (
                <Pagination
                  currentPage={taxPage.page}
                  totalPages={taxPage.totalPages}
                  totalItems={taxPage.total}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* CERTIFICATE VIEW MODAL */}
      {/* ============================================ */}
      <Modal
        isOpen={showCertViewModal}
        onClose={() => {
          setShowCertViewModal(false);
          setSelectedCert(null);
        }}
        title="Certificate Details"
        size="lg"
      >
        {selectedCert && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-theme">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-theme-primary/10">
                  <FileText className="w-6 h-6 text-theme-primary" />
                </div>
                <div>
                  <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider">
                    Reference Number
                  </p>
                  <p className="font-bold text-theme-text text-lg">
                    {selectedCert.reference_number || "N/A"}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-medium ${getStatusColor(selectedCert.status)}`}
              >
                {getStatusIcon(selectedCert.status)}
                {selectedCert.status || "Pending"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-theme-background rounded-lg p-3">
                <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider mb-1">
                  Resident
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.resident?.first_name}{" "}
                  {selectedCert.resident?.middle_name || ""}{" "}
                  {selectedCert.resident?.last_name}
                  {selectedCert.resident?.suffix
                    ? ` ${selectedCert.resident.suffix}`
                    : ""}
                </p>
              </div>

              <div className="bg-theme-background rounded-lg p-3">
                <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider mb-1">
                  Certificate Type
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.certification_type?.name || "N/A"}
                </p>
              </div>

              <div className="bg-theme-background rounded-lg p-3">
                <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider mb-1">
                  Purpose
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.purpose || "N/A"}
                </p>
              </div>

              <div className="bg-theme-background rounded-lg p-3">
                <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider mb-1">
                  Fee
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.certification_type?.fee
                    ? formatCurrency(selectedCert.certification_type.fee)
                    : "Free"}
                </p>
              </div>

              <div className="bg-theme-background rounded-lg p-3">
                <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider mb-1">
                  Requested
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.created_at
                    ? formatDate(selectedCert.created_at)
                    : "N/A"}
                </p>
              </div>

              <div className="bg-theme-background rounded-lg p-3">
                <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider mb-1">
                  Requested By
                </p>
                <p className="font-medium text-theme-text">
                  {selectedCert.requested_by?.email ||
                    selectedCert.requestedBy?.email ||
                    "N/A"}
                </p>
              </div>

              {selectedCert.approved_at && (
                <div className="bg-theme-background rounded-lg p-3">
                  <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider mb-1">
                    Approved
                  </p>
                  <p className="font-medium text-theme-text">
                    {formatDate(selectedCert.approved_at)}
                  </p>
                </div>
              )}

              {selectedCert.released_at && (
                <div className="bg-theme-background rounded-lg p-3">
                  <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider mb-1">
                    Released
                  </p>
                  <p className="font-medium text-theme-text">
                    {formatDate(selectedCert.released_at)}
                  </p>
                </div>
              )}

              {selectedCert.received_at && (
                <div className="bg-theme-background rounded-lg p-3">
                  <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider mb-1">
                    Received
                  </p>
                  <p className="font-medium text-theme-text">
                    {formatDate(selectedCert.received_at)}
                  </p>
                </div>
              )}

              {selectedCert.expiry_date && (
                <div className="bg-theme-background rounded-lg p-3">
                  <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider mb-1">
                    Expiry Date
                  </p>
                  <p className="font-medium text-theme-text">
                    {formatDate(selectedCert.expiry_date)}
                  </p>
                </div>
              )}
            </div>

            {selectedCert.details && (
              <div className="bg-theme-background rounded-lg p-3">
                <p className="text-xs text-theme-textSecondary font-medium uppercase tracking-wider mb-1">
                  Details
                </p>
                <p className="text-sm text-theme-text whitespace-pre-wrap">
                  {selectedCert.details}
                </p>
              </div>
            )}

            {selectedCert.remarks && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wider mb-1">
                  Remarks
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
                  {selectedCert.remarks}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
              <button
                onClick={() => {
                  setShowCertViewModal(false);
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

      {/* ============================================ */}
      {/* RESIDENT EDIT MODAL */}
      {/* ============================================ */}
      <Modal
        isOpen={showEditResidentModal}
        onClose={() => {
          setShowEditResidentModal(false);
          setEditingResident(null);
        }}
        title={`Edit Resident${editingResident ? ` - ${editingResident.first_name} ${editingResident.last_name}` : ""}`}
        size="xl"
      >
        {editingResident && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={residentForm.first_name}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      first_name: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${residentFormErrors.first_name
                    ? "border-red-500"
                    : "border-theme"
                    }`}
                />
                {residentFormErrors.first_name && (
                  <p className="text-sm text-red-500 mt-1">
                    {residentFormErrors.first_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={residentForm.middle_name}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      middle_name: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={residentForm.last_name}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      last_name: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${residentFormErrors.last_name
                    ? "border-red-500"
                    : "border-theme"
                    }`}
                />
                {residentFormErrors.last_name && (
                  <p className="text-sm text-red-500 mt-1">
                    {residentFormErrors.last_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Suffix
                </label>
                <input
                  type="text"
                  value={residentForm.suffix}
                  onChange={(e) =>
                    setResidentForm({ ...residentForm, suffix: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  placeholder="Jr., Sr., III"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={residentForm.phone_number}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      phone_number: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  placeholder="09XXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Gender
                </label>
                <select
                  value={residentForm.gender}
                  onChange={(e) =>
                    setResidentForm({ ...residentForm, gender: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Birth Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={residentForm.birth_date}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      birth_date: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${residentFormErrors.birth_date
                    ? "border-red-500"
                    : "border-theme"
                    }`}
                />
                {residentFormErrors.birth_date && (
                  <p className="text-sm text-red-500 mt-1">
                    {residentFormErrors.birth_date}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Civil Status
                </label>
                <select
                  value={residentForm.civil_status}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      civil_status: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widow">Widow</option>
                  <option value="Legally Separated">Legally Separated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Citizenship <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={residentForm.citizenship}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      citizenship: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${residentFormErrors.citizenship
                    ? "border-red-500"
                    : "border-theme"
                    }`}
                />
                {residentFormErrors.citizenship && (
                  <p className="text-sm text-red-500 mt-1">
                    {residentFormErrors.citizenship}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Voter Status
                </label>
                <select
                  value={residentForm.voter_status}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      voter_status: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                >
                  <option value="Registered Local">Registered Local</option>
                  <option value="Registered_Outside">
                    Registered Outside
                  </option>
                  <option value="Not Registered">Not Registered</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Place of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={residentForm.place_of_birth}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      place_of_birth: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${residentFormErrors.place_of_birth
                    ? "border-red-500"
                    : "border-theme"
                    }`}
                />
                {residentFormErrors.place_of_birth && (
                  <p className="text-sm text-red-500 mt-1">
                    {residentFormErrors.place_of_birth}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Occupation
                </label>
                <input
                  type="text"
                  value={residentForm.occupation}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      occupation: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Monthly Income
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={residentForm.monthly_income}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      monthly_income: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Education Attainment <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={residentForm.education_attainment}
                  onChange={(e) =>
                    setResidentForm({
                      ...residentForm,
                      education_attainment: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${residentFormErrors.education_attainment
                    ? "border-red-500"
                    : "border-theme"
                    }`}
                />
                {residentFormErrors.education_attainment && (
                  <p className="text-sm text-red-500 mt-1">
                    {residentFormErrors.education_attainment}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
              <button
                onClick={() => {
                  setShowEditResidentModal(false);
                  setEditingResident(null);
                }}
                className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateResident}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Certificate Issue Modal */}
      <Modal
        isOpen={showCertificateModal}
        onClose={() => {
          setShowCertificateModal(false);
          setCertForm({
            resident_id: "",
            certification_type_id: "",
            purpose: "",
            details: "",
          });
        }}
        title="Issue Certificate"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Resident <span className="text-red-500">*</span>
            </label>
            <select
              value={certForm.resident_id}
              onChange={(e) =>
                setCertForm({ ...certForm, resident_id: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${certErrors.resident_id ? "border-red-500" : "border-theme"}`}
            >
              <option value="">Select Resident</option>
              {residents.map((resident: any) => (
                <option key={resident.id} value={resident.id}>
                  {resident.first_name} {resident.last_name}
                </option>
              ))}
            </select>
            {certErrors.resident_id && (
              <p className="text-sm text-red-500 mt-1">
                {certErrors.resident_id}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Certificate Type <span className="text-red-500">*</span>
            </label>
            <select
              value={certForm.certification_type_id}
              onChange={(e) =>
                setCertForm({
                  ...certForm,
                  certification_type_id: e.target.value,
                })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${certErrors.certification_type_id ? "border-red-500" : "border-theme"}`}
            >
              <option value="">Select Type</option>
              {types.map((type: any) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {certErrors.certification_type_id && (
              <p className="text-sm text-red-500 mt-1">
                {certErrors.certification_type_id}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Purpose
            </label>
            <input
              type="text"
              value={certForm.purpose}
              onChange={(e) =>
                setCertForm({ ...certForm, purpose: e.target.value })
              }
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              placeholder="Purpose"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Details
            </label>
            <textarea
              value={certForm.details}
              onChange={(e) =>
                setCertForm({ ...certForm, details: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              placeholder="Details"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowCertificateModal(false);
                setCertForm({
                  resident_id: "",
                  certification_type_id: "",
                  purpose: "",
                  details: "",
                });
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleIssueCertificate}
              disabled={isSubmitting}
              className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Issuing...
                </>
              ) : (
                "Issue Certificate"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Tax Modal */}
      <Modal
        isOpen={showTaxModal}
        onClose={() => {
          setShowTaxModal(false);
          setTaxForm({
            taxpayer_name: "",
            amount: "",
            tax_type: "Cedula",
            payment_method: "Cash",
          });
        }}
        title="Record Tax Payment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Taxpayer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={taxForm.taxpayer_name}
              onChange={(e) =>
                setTaxForm({ ...taxForm, taxpayer_name: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${taxErrors.taxpayer_name ? "border-red-500" : "border-theme"}`}
              placeholder="Taxpayer name"
            />
            {taxErrors.taxpayer_name && (
              <p className="text-sm text-red-500 mt-1">
                {taxErrors.taxpayer_name}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={taxForm.amount}
                onChange={(e) =>
                  setTaxForm({ ...taxForm, amount: e.target.value })
                }
                className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${taxErrors.amount ? "border-red-500" : "border-theme"}`}
                placeholder="0.00"
              />
            </div>
            {taxErrors.amount && (
              <p className="text-sm text-red-500 mt-1">{taxErrors.amount}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Tax Type
            </label>
            <select
              value={taxForm.tax_type}
              onChange={(e) =>
                setTaxForm({ ...taxForm, tax_type: e.target.value })
              }
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="Cedula">Cedula</option>
              <option value="Real Property Tax">Real Property Tax</option>
              <option value="Business Tax">Business Tax</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Payment Method
            </label>
            <select
              value={taxForm.payment_method}
              onChange={(e) =>
                setTaxForm({ ...taxForm, payment_method: e.target.value })
              }
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowTaxModal(false);
                setTaxForm({
                  taxpayer_name: "",
                  amount: "",
                  tax_type: "Cedula",
                  payment_method: "Cash",
                });
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleRecordTax}
              disabled={isSubmitting}
              className="px-4 py-2 bg-theme-accent text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Recording...
                </>
              ) : (
                "Record Tax"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}