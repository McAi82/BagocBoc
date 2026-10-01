// pages/frontdesk/FrontDeskTaxPage.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Receipt,
  Search,
  Plus,
  Eye,
  Printer,
  Loader2,
  DollarSign,
  AlertCircle,
  Save,
  Inbox,
  User as UserIcon,
  Hash,
  Calendar as CalendarIcon,
  Tag,
  FileText,
} from "lucide-react";
import { formatDate, formatCurrency } from "../../utils/format";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import ReportDetailModal from "../../components/features/ReportDetailModal";
import toast from "react-hot-toast";

export default function FrontDeskTaxPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTax, setSelectedTax] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [taxForm, setTaxForm] = useState({
    taxpayer_name: "",
    amount: "",
    tax_type: "Cedula",
    payment_method: "Cash",
    resident_id: "",
    remarks: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) {
      if (
        data.length > 0 &&
        (data[0]?.receipt_number !== undefined ||
          data[0]?.taxpayer_name !== undefined)
      ) {
        return data;
      }
      return [];
    }
    if (data?.data && Array.isArray(data.data)) {
      if (
        data.data.length > 0 &&
        (data.data[0]?.receipt_number !== undefined ||
          data.data[0]?.taxpayer_name !== undefined)
      ) {
        return data.data;
      }
      return [];
    }
    if (data?.taxPayments && Array.isArray(data.taxPayments))
      return data.taxPayments;

    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 3) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.receipt_number !== undefined ||
            obj[0]?.taxpayer_name !== undefined)
        ) {
          return obj;
        }
        return [];
      }
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          if (
            ["message", "status", "success", "errors", "meta", "links"].includes(
              key,
            )
          )
            continue;
          const result = findArray(obj[key], depth + 1);
          if (result.length > 0) return result;
        }
      }
      return [];
    };
    return findArray(data);
  };

  const fetchTaxes = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await api.get("/web/tax-payments");
      const data = extractData(response.data);
      setTaxes(
        data.map((t: any) => ({ ...t, amount: parseFloat(t.amount) || 0 })),
      );
    } catch (error) {
      console.error("❌ Error fetching tax payments:", error);
      setIsError(true);
      toast.error("Failed to load tax records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const filteredTaxes = useMemo(() => {
    if (!searchQuery) return taxes;
    const query = searchQuery.toLowerCase();
    return taxes.filter((t: any) => {
      const name = t.taxpayer_name?.toLowerCase() || "";
      const receipt = t.receipt_number?.toLowerCase() || "";
      return name.includes(query) || receipt.includes(query);
    });
  }, [taxes, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTaxes.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredTaxes.length);
  const paginatedTaxes = useMemo(
    () => filteredTaxes.slice(startIndex, endIndex),
    [filteredTaxes, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const resetTaxForm = () => {
    setTaxForm({
      taxpayer_name: "",
      amount: "",
      tax_type: "Cedula",
      payment_method: "Cash",
      resident_id: "",
      remarks: "",
    });
    setFormErrors({});
  };

  const validateTaxForm = () => {
    const errors: Record<string, string> = {};
    if (!taxForm.taxpayer_name.trim())
      errors.taxpayer_name = "Taxpayer name is required";
    if (!taxForm.amount || parseFloat(taxForm.amount) <= 0)
      errors.amount = "Please enter a valid amount";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTax = async () => {
    if (!validateTaxForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/web/frontdesk/tax", {
        taxpayer_name: taxForm.taxpayer_name,
        amount: parseFloat(taxForm.amount),
        tax_type: taxForm.tax_type,
        payment_method: taxForm.payment_method,
        resident_id: taxForm.resident_id || undefined,
        remarks: taxForm.remarks || undefined,
      });
      toast.success("Tax payment recorded successfully!");
      setShowTaxModal(false);
      resetTaxForm();
      fetchTaxes();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to record tax payment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ============================================================
     ✅ RENEWED PRINT — professional tax receipt
     ============================================================ */
  const handlePrintReceipt = (tax: any) => {
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

    // Number to words for the "Amount in words" line
    const amountInWords = numberToWords(amount);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tax Receipt — ${tax.receipt_number || "N/A"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @page { size: A4 portrait; margin: 14mm 12mm; }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #1a1a1a;
      background: #fff;
      font-size: 11.5px;
      line-height: 1.5;
      padding: 24px;
    }

    /* ---------- LETTERHEAD ---------- */
    .letterhead {
      display: flex;
      align-items: center;
      gap: 20px;
      padding-bottom: 14px;
      border-bottom: 3px double #1a1a1a;
      margin-bottom: 4px;
    }

    .seal {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      border: 2px solid #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      letter-spacing: 1px;
      color: #555;
      flex-shrink: 0;
      text-transform: uppercase;
      background: #fafafa;
    }

    .letterhead-text { flex: 1; text-align: center; line-height: 1.35; }
    .letterhead-text .republic {
      font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
      color: #444; margin-bottom: 4px;
    }
    .letterhead-text .province { font-size: 12px; color: #444; }
    .letterhead-text .municipality { font-size: 12px; color: #444; margin-bottom: 4px; }
    .letterhead-text .barangay {
      font-size: 22px; font-weight: bold; letter-spacing: 1.5px;
      color: #0f172a; margin: 4px 0;
    }
    .letterhead-text .office {
      font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #555;
    }

    .rule-thick {
      border-top: 2px solid #1a1a1a;
      margin-top: 2px;
      margin-bottom: 22px;
    }

    /* ---------- TITLE ---------- */
    .title-block { text-align: center; margin-bottom: 26px; }
    .title-block h1 {
      font-size: 22px; letter-spacing: 5px; text-transform: uppercase;
      color: #0f172a; margin-bottom: 6px; font-weight: bold;
    }
    .title-block .subtitle {
      font-size: 12px; font-style: italic; color: #666;
      letter-spacing: 1px; text-transform: uppercase;
    }

    /* ---------- RECEIPT NUMBER BAND ---------- */
    .receipt-band {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: #f8f9fb;
      border: 1px solid #d1d5db;
      border-left: 4px solid #6d28d9;
      margin-bottom: 24px;
    }
    .receipt-band .lbl {
      font-size: 10px; text-transform: uppercase;
      letter-spacing: 1.5px; color: #666; font-weight: bold;
    }
    .receipt-band .val {
      font-size: 18px; font-weight: bold; color: #6d28d9;
      font-family: 'Courier New', monospace; margin-top: 2px;
    }

    /* ---------- RECEIPT BODY ---------- */
    .receipt-body {
      border: 1px solid #e5e7eb;
      padding: 26px 30px;
      margin-bottom: 20px;
    }

    .receipt-body .lead {
      font-size: 13px;
      margin-bottom: 18px;
      text-align: justify;
    }

    .row {
      display: flex;
      align-items: flex-end;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .row .label {
      flex: 0 0 auto;
      padding-right: 8px;
      color: #555;
    }
    .row .dots {
      flex: 1;
      border-bottom: 1px dotted #888;
      margin: 0 6px;
      transform: translateY(-4px);
    }
    .row .value {
      flex: 0 0 auto;
      font-weight: bold;
      color: #0f172a;
      font-family: 'Courier New', monospace;
      padding-left: 8px;
      min-width: 60px;
      text-align: right;
    }

    /* Amount panel */
    .amount-panel {
      margin-top: 26px;
      border: 2px solid #6d28d9;
      background: #f5f3ff;
      padding: 18px 22px;
      text-align: center;
    }
    .amount-panel .lbl {
      font-size: 10px; text-transform: uppercase;
      letter-spacing: 2px; color: #6d28d9; font-weight: bold;
    }
    .amount-panel .amt {
      font-size: 30px; font-weight: bold; color: #6d28d9;
      font-family: 'Georgia', serif; margin-top: 4px;
    }
    .amount-panel .words {
      margin-top: 8px;
      font-size: 11px;
      font-style: italic;
      color: #4b5563;
      letter-spacing: 0.3px;
    }

    /* Payment status badge */
    .status-wrap {
      display: flex;
      justify-content: center;
      margin-top: 18px;
    }
    .status {
      display: inline-block;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 10.5px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }

    /* ---------- SIGNATURES ---------- */
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 55px;
      gap: 40px;
      page-break-inside: avoid;
    }
    .sig-block { flex: 1; max-width: 260px; text-align: center; }
    .sig-line {
      border-top: 1px solid #333;
      margin-bottom: 6px;
      height: 36px;
    }
    .sig-name { font-size: 12px; font-weight: bold; color: #0f172a; }
    .sig-title {
      font-size: 10.5px; color: #666; text-transform: uppercase;
      letter-spacing: 0.8px; margin-top: 2px;
    }

    /* ---------- FOOTER ---------- */
    .footer {
      margin-top: 40px;
      padding-top: 14px;
      border-top: 1px dashed #ccc;
      font-size: 9.5px;
      color: #888;
      text-align: center;
      line-height: 1.6;
      page-break-inside: avoid;
    }
    .footer strong { color: #555; }
    .footer .strip {
      margin-top: 8px;
      display: inline-block;
      padding: 4px 12px;
      border: 1px dashed #bbb;
      font-size: 10px;
      color: #666;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>

  <!-- LETTERHEAD -->
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

  <!-- TITLE -->
  <div class="title-block">
    <h1>Official Tax Receipt</h1>
    <div class="subtitle">Acknowledgement of Payment</div>
  </div>

  <!-- RECEIPT NUMBER BAND -->
  <div class="receipt-band">
    <div>
      <div class="lbl">Receipt Number</div>
      <div class="val">${tax.receipt_number || "N/A"}</div>
    </div>
    <div style="text-align:right">
      <div class="lbl">Date Issued</div>
      <div class="val" style="font-size:13px; color:#0f172a;">${formattedDate} • ${formattedTime}</div>
    </div>
  </div>

  <!-- RECEIPT BODY -->
  <div class="receipt-body">

    <p class="lead">
      Received from <strong>${tax.taxpayer_name || "N/A"}</strong>
      the sum of <strong>₱${amountFormatted}</strong>
      (${amountInWords}) in payment of
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
      <div class="value" style="font-family:'Georgia',serif;font-weight:normal">${tax.remarks}</div>
    </div>`
        : ""
      }

    <div class="amount-panel">
      <div class="lbl">Total Amount Paid</div>
      <div class="amt">₱ ${amountFormatted}</div>
      <div class="words">${amountInWords}</div>
    </div>

    <div class="status-wrap">
      <span class="status">${tax.status || "Paid"}</span>
    </div>
  </div>

  <!-- SIGNATURES -->
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

  <!-- FOOTER -->
  <div class="footer">
    <strong>Barangay Bagocboc</strong> • Opol, Misamis Oriental<br/>
    <span class="strip">Thank you for your payment</span><br/>
    <em>This is a system-generated tax receipt. Please keep this for your records.</em>
  </div>

  <script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=900,height=800");
    if (!w) {
      toast.error("Please allow popups");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  /* ============================================================
     Number → words helper (for "Amount in words" line)
     ============================================================ */
  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero Pesos Only";
    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
      "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
      "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty",
      "Seventy", "Eighty", "Ninety",
    ];
    const chunk = (n: number): string => {
      if (n === 0) return "";
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
      return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + chunk(n % 100) : "");
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading tax records...
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
            Failed to Load Tax Records
          </h3>
          <button
            onClick={fetchTaxes}
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
          <h1 className="text-2xl font-bold text-theme-text">Tax Records</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Manage tax payments
          </p>
        </div>
        <button
          onClick={() => {
            resetTaxForm();
            setShowTaxModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Record Tax Payment
        </button>
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search tax records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
            />
          </div>
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
        </div>

        {filteredTaxes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {filteredTaxes.length}
              </span>
            </span>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        {paginatedTaxes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <Receipt className="w-12 h-12 text-theme-textSecondary/30" />
              <p className="text-theme-text font-medium">No Tax Records Found</p>
              <p className="text-sm text-theme-textSecondary">
                Try adjusting your search.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Receipt #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Taxpayer
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
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {paginatedTaxes.map((tax: any) => (
                    <tr
                      key={tax.id || `tax-${Math.random()}`}
                      className="hover:bg-theme-hover transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-theme-text">
                        {tax.receipt_number}
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {tax.taxpayer_name}
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {tax.tax_type}
                      </td>
                      <td className="px-4 py-3 font-medium text-theme-text">
                        {formatCurrency(tax.amount)}
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {tax.payment_method}
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {tax.paid_at
                          ? formatDate(tax.paid_at)
                          : formatDate(tax.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePrintReceipt(tax)}
                            className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                            title="Print Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTax(tax);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
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

            {filteredTaxes.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredTaxes.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                showItemsPerPage={false}
              />
            )}
          </>
        )}
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={showTaxModal}
        onClose={() => {
          setShowTaxModal(false);
          resetTaxForm();
        }}
        title="Record Tax Payment"
      >
        <TaxForm
          taxForm={taxForm}
          setTaxForm={setTaxForm}
          formErrors={formErrors}
          isSubmitting={isSubmitting}
          onSubmit={handleCreateTax}
          onCancel={() => {
            setShowTaxModal(false);
            resetTaxForm();
          }}
        />
      </Modal>

      {/* VIEW DETAILS MODAL (uses shared component) */}
      <ReportDetailModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedTax(null);
        }}
        title="Tax Payment Details"
        badge={
          selectedTax
            ? {
              label: selectedTax.status || "paid",
              className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            }
            : undefined
        }
        headerIcon={Receipt}
        subtitle={
          selectedTax && (
            <div>
              <p className="font-semibold text-theme-text text-base">
                {selectedTax.receipt_number}
              </p>
              <p className="text-xs">{selectedTax.taxpayer_name}</p>
            </div>
          )
        }
        sections={
          selectedTax
            ? [
              {
                title: "Payment Information",
                icon: FileText,
                rows: [
                  {
                    label: "Receipt Number",
                    value: selectedTax.receipt_number,
                    icon: Hash,
                    span: 2,
                  },
                  {
                    label: "Tax Type",
                    value: selectedTax.tax_type,
                    icon: Tag,
                  },
                  {
                    label: "Payment Method",
                    value: selectedTax.payment_method,
                    icon: DollarSign,
                  },
                  {
                    label: "Amount Paid",
                    value: formatCurrency(selectedTax.amount),
                    icon: DollarSign,
                  },
                  {
                    label: "Status",
                    value: selectedTax.status || "Paid",
                    icon: Receipt,
                  },
                  {
                    label: "Date Paid",
                    value: selectedTax.paid_at
                      ? formatDate(selectedTax.paid_at)
                      : formatDate(selectedTax.created_at),
                    icon: CalendarIcon,
                    span: 2,
                  },
                  {
                    label: "Remarks",
                    value: selectedTax.remarks || "No remarks",
                    span: 2,
                  },
                ],
              },
              {
                title: "Taxpayer",
                icon: UserIcon,
                rows: [
                  {
                    label: "Taxpayer Name",
                    value: selectedTax.taxpayer_name,
                    icon: UserIcon,
                    span: 2,
                  },
                ],
              },
            ]
            : []
        }
        footerActions={
          <button
            onClick={() => {
              if (selectedTax) handlePrintReceipt(selectedTax);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        }
      />
    </div>
  );
}

function TaxForm({
  taxForm,
  setTaxForm,
  formErrors,
  isSubmitting,
  onSubmit,
  onCancel,
}: any) {
  return (
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
          className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${formErrors.taxpayer_name ? "border-red-500" : "border-theme"
            }`}
          placeholder="Enter taxpayer name"
        />
        {formErrors.taxpayer_name && (
          <p className="text-sm text-red-500 mt-1">
            {formErrors.taxpayer_name}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-theme-text mb-1">
          Tax Type
        </label>
        <select
          value={taxForm.tax_type}
          onChange={(e) => setTaxForm({ ...taxForm, tax_type: e.target.value })}
          className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
        >
          <option value="Cedula">Cedula</option>
          <option value="Real Property Tax">Real Property Tax</option>
          <option value="Business Tax">Business Tax</option>
        </select>
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
            onChange={(e) => setTaxForm({ ...taxForm, amount: e.target.value })}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${formErrors.amount ? "border-red-500" : "border-theme"
              }`}
            placeholder="0.00"
          />
        </div>
        {formErrors.amount && (
          <p className="text-sm text-red-500 mt-1">{formErrors.amount}</p>
        )}
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
      <div>
        <label className="block text-sm font-medium text-theme-text mb-1">
          Remarks
        </label>
        <textarea
          value={taxForm.remarks}
          onChange={(e) => setTaxForm({ ...taxForm, remarks: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
          placeholder="Additional notes..."
        />
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Recording...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Record Tax
            </>
          )}
        </button>
      </div>
    </div>
  );
}