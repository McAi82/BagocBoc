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
  PhilippinePeso,
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

  /* ============================================================
    PRINT HELPER — isolated iframe (no page chrome, no theme bleed)
    ============================================================ */
  const printHTML = (html: string) => {
    const existing = document.getElementById("print-iframe");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      toast.error("Unable to prepare print document");
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const doPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print failed:", err);
        toast.error("Print failed. Please try again.");
      } finally {
        setTimeout(() => {
          const el = document.getElementById("print-iframe");
          if (el) el.remove();
        }, 1000);
      }
    };

    if (iframe.contentWindow) {
      iframe.contentWindow.onload = () => setTimeout(doPrint, 300);
    }
    setTimeout(doPrint, 500);
  };

  /* ============================================================
   NUMBER → WORDS (for "Amount in Words" line on receipts)
   ============================================================ */
  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero Pesos Only";
    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
      "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
      "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty",
      "Sixty", "Seventy", "Eighty", "Ninety",
    ];
    const chunk = (n: number): string => {
      if (n === 0) return "";
      if (n < 20) return ones[n];
      if (n < 100)
        return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + chunk(n % 100) : "")
      );
    };

    let n = Math.floor(num);
    const cents = Math.round((num - n) * 100);
    let words = "";

    const scales = [
      { value: 1_000_000_000, name: "Billion" },
      { value: 1_000_000, name: "Million" },
      { value: 1_000, name: "Thousand" },
    ];

    for (const s of scales) {
      if (n >= s.value) {
        const count = Math.floor(n / s.value);
        words += chunk(count) + " " + s.name + " ";
        n %= s.value;
      }
    }
    words += chunk(n);
    words = words.trim() || "Zero";

    let result = `${words} Pesos`;
    if (cents > 0) result += ` and ${chunk(cents)} Centavos`;
    return result + " Only";
  };

  /* ============================================================
   FORMAL OFFICIAL PAYMENT RECEIPT
   ============================================================ */
  const handlePrintPayment = (payment: any) => {
    const residentName = payment.resident
      ? `${payment.resident.first_name || ""} ${payment.resident.last_name || ""
        }`.trim()
      : "N/A";

    const paidDate = payment.paid_at || payment.created_at;
    const d = paidDate ? new Date(paidDate) : new Date();

    const formattedDate = d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = d.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const amount = parseFloat(payment.amount) || 0;
    const amountFormatted = amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const amountInWords = numberToWords(amount);
    const statusClass = (payment.status || "completed").toLowerCase();

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Official Receipt — ${payment.or_number || "N/A"}</title>
<style>
  @page { size: A4 portrait; margin: 15mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #ffffff;
    color: #111111;
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11.5px;
    line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { width: 100%; max-width: 720px; margin: 0 auto; padding: 8px 0; }

  .letterhead {
    display: flex; align-items: center; gap: 20px;
    padding-bottom: 14px; border-bottom: 3px double #1a1a1a;
  }
  .seal {
    width: 72px; height: 72px; border-radius: 50%;
    border: 1.5px solid #333;
    display: flex; align-items: center; justify-content: center;
    font-size: 8.5px; letter-spacing: 1px; color: #666;
    flex-shrink: 0; text-transform: uppercase; text-align: center; line-height: 1.2;
  }
  .letterhead-text { flex: 1; text-align: center; line-height: 1.35; }
  .letterhead-text .republic { font-size: 10.5px; letter-spacing: 2px; text-transform: uppercase; color: #444; }
  .letterhead-text .province,
  .letterhead-text .municipality { font-size: 11.5px; color: #444; }
  .letterhead-text .barangay {
    font-size: 22px; font-weight: bold; letter-spacing: 1.5px;
    color: #0f172a; margin: 4px 0;
  }
  .letterhead-text .office { font-size: 10.5px; letter-spacing: 1.2px; text-transform: uppercase; color: #555; }
  .rule-thick { border-top: 2px solid #1a1a1a; margin-top: 2px; margin-bottom: 22px; }

  .title-block { text-align: center; margin-bottom: 24px; }
  .title-block h1 {
    font-size: 22px; letter-spacing: 6px;
    text-transform: uppercase; color: #0f172a; font-weight: bold;
  }
  .title-block .subtitle {
    font-size: 11px; font-style: italic; color: #666;
    letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px;
  }

  .or-band {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 20px;
    background: #f5f7fb;
    border: 1px solid #d8dde6;
    border-left: 4px solid #1e3a8a;
    margin-bottom: 24px;
  }
  .or-band .lbl {
    font-size: 9.5px; text-transform: uppercase;
    letter-spacing: 1.5px; color: #555; font-weight: bold;
  }
  .or-band .val {
    font-size: 17px; font-weight: bold; color: #1e3a8a;
    font-family: 'Courier New', monospace; margin-top: 2px;
  }
  .or-band .date-val {
    font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px;
  }

  .body-block {
    border: 1px solid #e5e7eb;
    padding: 26px 30px;
    margin-bottom: 22px;
  }
  .lead {
    font-size: 12.5px; text-align: justify;
    margin-bottom: 20px; line-height: 1.7;
  }

  .row {
    display: flex; align-items: flex-end;
    margin-bottom: 14px; font-size: 12.5px;
  }
  .row .label { flex: 0 0 auto; padding-right: 6px; color: #555; }
  .row .dots {
    flex: 1; border-bottom: 1px dotted #999;
    margin: 0 6px; transform: translateY(-4px); min-width: 40px;
  }
  .row .value {
    flex: 0 0 auto; font-weight: bold; color: #0f172a;
    font-family: 'Courier New', monospace;
    padding-left: 6px; text-align: right;
    max-width: 300px; word-break: break-word;
  }
  .row .value.plain { font-family: 'Georgia', serif; font-weight: normal; }

  .amount-panel {
    margin-top: 26px;
    border: 2px solid #1e3a8a;
    background: #eef3ff;
    padding: 20px 22px;
    text-align: center;
  }
  .amount-panel .lbl {
    font-size: 9.5px; text-transform: uppercase;
    letter-spacing: 2.5px; color: #1e3a8a; font-weight: bold;
  }
  .amount-panel .amt {
    font-size: 30px; font-weight: bold; color: #1e3a8a;
    font-family: 'Georgia', serif; margin-top: 6px; letter-spacing: 1px;
  }
  .amount-panel .words {
    margin-top: 8px; font-size: 10.5px; font-style: italic;
    color: #4b5563; letter-spacing: 0.3px;
  }

  .status-wrap { display: flex; justify-content: center; margin-top: 18px; }
  .status-badge {
    display: inline-block; padding: 4px 18px;
    border-radius: 20px; font-size: 10px; font-weight: bold;
    text-transform: uppercase; letter-spacing: 1px;
    border: 1px solid transparent;
  }
  .status-badge.completed { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
  .status-badge.pending   { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
  .status-badge.failed    { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }

  .signatures {
    display: flex; justify-content: space-between;
    gap: 50px; margin-top: 60px; page-break-inside: avoid;
  }
  .sig-block { flex: 1; max-width: 260px; text-align: center; }
  .sig-line { border-top: 1px solid #333; margin-bottom: 6px; height: 40px; }
  .sig-name { font-size: 12px; font-weight: bold; color: #0f172a; }
  .sig-title {
    font-size: 10px; color: #666; text-transform: uppercase;
    letter-spacing: 1px; margin-top: 2px;
  }

  .footer {
    margin-top: 44px; padding-top: 14px;
    border-top: 1px dashed #bbb;
    font-size: 9.5px; color: #888;
    text-align: center; line-height: 1.6;
    page-break-inside: avoid;
  }
  .footer strong { color: #555; }
  .footer .strip {
    display: inline-block; margin-top: 6px;
    padding: 3px 12px; border: 1px dashed #bbb;
    font-size: 9.5px; color: #666;
    letter-spacing: 1.2px; text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="sheet">

    <div class="letterhead">
      <div class="seal">BARANGAY<br/>SEAL</div>
      <div class="letterhead-text">
        <div class="republic">Republic of the Philippines</div>
        <div class="province">Province of Misamis Oriental</div>
        <div class="municipality">Municipality of Opol</div>
        <div class="barangay">BARANGAY BAGOCBOC</div>
        <div class="office">Office of the Barangay Treasurer</div>
      </div>
      <div class="seal">DILG<br/>SEAL</div>
    </div>
    <div class="rule-thick"></div>

    <div class="title-block">
      <h1>Official Receipt</h1>
      <div class="subtitle">Acknowledgement of Payment</div>
    </div>

    <div class="or-band">
      <div>
        <div class="lbl">OR Number</div>
        <div class="val">${payment.or_number || "N/A"}</div>
      </div>
      <div style="text-align:right">
        <div class="lbl">Date Issued</div>
        <div class="date-val">${formattedDate} &bull; ${formattedTime}</div>
      </div>
    </div>

    <div class="body-block">
      <p class="lead">
        Received from <strong>${residentName}</strong>
        the sum of <strong>&#8369;${amountFormatted}</strong>
        (<em>${amountInWords}</em>) in payment of
        <strong>${payment.payment_type || "N/A"}</strong>.
      </p>

      <div class="row">
        <div class="label">Received From</div>
        <div class="dots"></div>
        <div class="value">${residentName}</div>
      </div>
      <div class="row">
        <div class="label">Payment Type</div>
        <div class="dots"></div>
        <div class="value">${payment.payment_type || "N/A"}</div>
      </div>
      <div class="row">
        <div class="label">Payment Method</div>
        <div class="dots"></div>
        <div class="value">${payment.payment_method || "Cash"}</div>
      </div>
      ${payment.description
        ? `
      <div class="row">
        <div class="label">Description</div>
        <div class="dots"></div>
        <div class="value plain">${payment.description}</div>
      </div>`
        : ""
      }

      <div class="amount-panel">
        <div class="lbl">Total Amount Paid</div>
        <div class="amt">&#8369; ${amountFormatted}</div>
        <div class="words">${amountInWords}</div>
      </div>

      <div class="status-wrap">
        <span class="status-badge ${statusClass}">${payment.status || "Completed"}</span>
      </div>
    </div>

    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">Juan D. Dela Cruz</div>
        <div class="sig-title">Barangay Treasurer</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${residentName}</div>
        <div class="sig-title">Payor / Received By</div>
      </div>
    </div>

    <div class="footer">
      <strong>Barangay Bagocboc</strong> &bull; Opol, Misamis Oriental<br/>
      <span class="strip">Thank you for your payment</span><br/>
      <em>This is a system-generated official receipt. Please keep this for your records.</em>
    </div>
  </div>
</body>
</html>`;

    printHTML(html);
  };

  /* ============================================================
   FORMAL TAX RECEIPT
   ============================================================ */
  const handlePrintTax = (tax: any) => {
    const paidDate = tax.paid_at || tax.created_at;
    const d = paidDate ? new Date(paidDate) : new Date();

    const formattedDate = d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = d.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const amount = parseFloat(tax.amount) || 0;
    const amountFormatted = amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const amountInWords = numberToWords(amount);
    const statusClass = (tax.status || "paid").toLowerCase();

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Tax Receipt — ${tax.receipt_number || "N/A"}</title>
<style>
  @page { size: A4 portrait; margin: 15mm 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #ffffff;
    color: #111111;
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11.5px;
    line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { width: 100%; max-width: 720px; margin: 0 auto; padding: 8px 0; }

  .letterhead {
    display: flex; align-items: center; gap: 20px;
    padding-bottom: 14px; border-bottom: 3px double #1a1a1a;
  }
  .seal {
    width: 72px; height: 72px; border-radius: 50%;
    border: 1.5px solid #333;
    display: flex; align-items: center; justify-content: center;
    font-size: 8.5px; letter-spacing: 1px; color: #666;
    flex-shrink: 0; text-transform: uppercase; text-align: center; line-height: 1.2;
  }
  .letterhead-text { flex: 1; text-align: center; line-height: 1.35; }
  .letterhead-text .republic { font-size: 10.5px; letter-spacing: 2px; text-transform: uppercase; color: #444; }
  .letterhead-text .province,
  .letterhead-text .municipality { font-size: 11.5px; color: #444; }
  .letterhead-text .barangay {
    font-size: 22px; font-weight: bold; letter-spacing: 1.5px;
    color: #0f172a; margin: 4px 0;
  }
  .letterhead-text .office { font-size: 10.5px; letter-spacing: 1.2px; text-transform: uppercase; color: #555; }
  .rule-thick { border-top: 2px solid #1a1a1a; margin-top: 2px; margin-bottom: 22px; }

  .title-block { text-align: center; margin-bottom: 24px; }
  .title-block h1 {
    font-size: 22px; letter-spacing: 6px;
    text-transform: uppercase; color: #0f172a; font-weight: bold;
  }
  .title-block .subtitle {
    font-size: 11px; font-style: italic; color: #666;
    letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px;
  }

  .or-band {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 20px;
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    border-left: 4px solid #6d28d9;
    margin-bottom: 24px;
  }
  .or-band .lbl {
    font-size: 9.5px; text-transform: uppercase;
    letter-spacing: 1.5px; color: #555; font-weight: bold;
  }
  .or-band .val {
    font-size: 17px; font-weight: bold; color: #6d28d9;
    font-family: 'Courier New', monospace; margin-top: 2px;
  }
  .or-band .date-val {
    font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px;
  }

  .body-block {
    border: 1px solid #e5e7eb;
    padding: 26px 30px;
    margin-bottom: 22px;
  }
  .lead {
    font-size: 12.5px; text-align: justify;
    margin-bottom: 20px; line-height: 1.7;
  }

  .row {
    display: flex; align-items: flex-end;
    margin-bottom: 14px; font-size: 12.5px;
  }
  .row .label { flex: 0 0 auto; padding-right: 6px; color: #555; }
  .row .dots {
    flex: 1; border-bottom: 1px dotted #999;
    margin: 0 6px; transform: translateY(-4px); min-width: 40px;
  }
  .row .value {
    flex: 0 0 auto; font-weight: bold; color: #0f172a;
    font-family: 'Courier New', monospace;
    padding-left: 6px; text-align: right;
    max-width: 300px; word-break: break-word;
  }
  .row .value.plain { font-family: 'Georgia', serif; font-weight: normal; }

  .amount-panel {
    margin-top: 26px;
    border: 2px solid #6d28d9;
    background: #f5f3ff;
    padding: 20px 22px;
    text-align: center;
  }
  .amount-panel .lbl {
    font-size: 9.5px; text-transform: uppercase;
    letter-spacing: 2.5px; color: #6d28d9; font-weight: bold;
  }
  .amount-panel .amt {
    font-size: 30px; font-weight: bold; color: #6d28d9;
    font-family: 'Georgia', serif; margin-top: 6px; letter-spacing: 1px;
  }
  .amount-panel .words {
    margin-top: 8px; font-size: 10.5px; font-style: italic;
    color: #4b5563; letter-spacing: 0.3px;
  }

  .status-wrap { display: flex; justify-content: center; margin-top: 18px; }
  .status-badge {
    display: inline-block; padding: 4px 18px;
    border-radius: 20px; font-size: 10px; font-weight: bold;
    text-transform: uppercase; letter-spacing: 1px;
    border: 1px solid transparent;
  }
  .status-badge.paid    { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
  .status-badge.pending { background: #fef3c7; color: #92400e; border-color: #fcd34d; }

  .signatures {
    display: flex; justify-content: space-between;
    gap: 50px; margin-top: 60px; page-break-inside: avoid;
  }
  .sig-block { flex: 1; max-width: 260px; text-align: center; }
  .sig-line { border-top: 1px solid #333; margin-bottom: 6px; height: 40px; }
  .sig-name { font-size: 12px; font-weight: bold; color: #0f172a; }
  .sig-title {
    font-size: 10px; color: #666; text-transform: uppercase;
    letter-spacing: 1px; margin-top: 2px;
  }

  .footer {
    margin-top: 44px; padding-top: 14px;
    border-top: 1px dashed #bbb;
    font-size: 9.5px; color: #888;
    text-align: center; line-height: 1.6;
    page-break-inside: avoid;
  }
  .footer strong { color: #555; }
  .footer .strip {
    display: inline-block; margin-top: 6px;
    padding: 3px 12px; border: 1px dashed #bbb;
    font-size: 9.5px; color: #666;
    letter-spacing: 1.2px; text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="sheet">

    <div class="letterhead">
      <div class="seal">BARANGAY<br/>SEAL</div>
      <div class="letterhead-text">
        <div class="republic">Republic of the Philippines</div>
        <div class="province">Province of Misamis Oriental</div>
        <div class="municipality">Municipality of Opol</div>
        <div class="barangay">BARANGAY BAGOCBOC</div>
        <div class="office">Office of the Barangay Treasurer</div>
      </div>
      <div class="seal">DILG<br/>SEAL</div>
    </div>
    <div class="rule-thick"></div>

    <div class="title-block">
      <h1>Tax Receipt</h1>
      <div class="subtitle">Official Tax Payment Acknowledgement</div>
    </div>

    <div class="or-band">
      <div>
        <div class="lbl">Receipt Number</div>
        <div class="val">${tax.receipt_number || "N/A"}</div>
      </div>
      <div style="text-align:right">
        <div class="lbl">Date Issued</div>
        <div class="date-val">${formattedDate} &bull; ${formattedTime}</div>
      </div>
    </div>

    <div class="body-block">
      <p class="lead">
        Received from <strong>${tax.taxpayer_name || "N/A"}</strong>
        the sum of <strong>&#8369;${amountFormatted}</strong>
        (<em>${amountInWords}</em>) in payment of
        <strong>${tax.tax_type || "N/A"}</strong>.
      </p>

      <div class="row">
        <div class="label">Taxpayer Name</div>
        <div class="dots"></div>
        <div class="value">${tax.taxpayer_name || "N/A"}</div>
      </div>
      <div class="row">
        <div class="label">Tax Type</div>
        <div class="dots"></div>
        <div class="value">${tax.tax_type || "N/A"}</div>
      </div>
      <div class="row">
        <div class="label">Payment Method</div>
        <div class="dots"></div>
        <div class="value">${tax.payment_method || "Cash"}</div>
      </div>
      ${tax.remarks
        ? `
      <div class="row">
        <div class="label">Remarks</div>
        <div class="dots"></div>
        <div class="value plain">${tax.remarks}</div>
      </div>`
        : ""
      }

      <div class="amount-panel">
        <div class="lbl">Total Amount Paid</div>
        <div class="amt">&#8369; ${amountFormatted}</div>
        <div class="words">${amountInWords}</div>
      </div>

      <div class="status-wrap">
        <span class="status-badge ${statusClass}">${tax.status || "Paid"}</span>
      </div>
    </div>

    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">Juan D. Dela Cruz</div>
        <div class="sig-title">Barangay Treasurer</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${tax.taxpayer_name || "Taxpayer"}</div>
        <div class="sig-title">Payor / Received By</div>
      </div>
    </div>

    <div class="footer">
      <strong>Barangay Bagocboc</strong> &bull; Opol, Misamis Oriental<br/>
      <span class="strip">Thank you for your payment</span><br/>
      <em>This is a system-generated tax receipt. Please keep this for your records.</em>
    </div>
  </div>
</body>
</html>`;

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
              <PhilippinePeso className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
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