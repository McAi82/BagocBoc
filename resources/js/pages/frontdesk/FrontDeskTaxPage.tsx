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
} from "lucide-react";
import { formatDate, formatCurrency } from "../../utils/format";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
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

  // ✅ Pagination state
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

  const handlePrintReceipt = (tax: any) => {
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
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTax(tax);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
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

            {/* ✅ Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTaxes.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              showItemsPerPage={false}
            />
          </>
        )}
      </div>

      {/* Create Tax Modal */}
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

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedTax(null);
        }}
        title="Tax Payment Details"
      >
        {selectedTax && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Receipt #
                </p>
                <p className="font-medium text-theme-text">
                  {selectedTax.receipt_number}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Taxpayer
                </p>
                <p className="font-medium text-theme-text">
                  {selectedTax.taxpayer_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Tax Type
                </p>
                <p className="font-medium text-theme-text">
                  {selectedTax.tax_type}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Amount
                </p>
                <p className="font-medium text-theme-text">
                  {formatCurrency(selectedTax.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Payment Method
                </p>
                <p className="font-medium text-theme-text">
                  {selectedTax.payment_method}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Date
                </p>
                <p className="font-medium text-theme-text">
                  {selectedTax.paid_at
                    ? formatDate(selectedTax.paid_at)
                    : formatDate(selectedTax.created_at)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-theme-textSecondary font-medium">
                  Remarks
                </p>
                <p className="font-medium text-theme-text">
                  {selectedTax.remarks || "No remarks"}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedTax(null);
                }}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
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