// pages/frontdesk/FrontDeskClaimSlipsPage.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  QrCode,
  Search,
  Printer,
  Eye,
  AlertCircle,
  Loader2,
  Inbox,
} from "lucide-react";
import { getStatusColor, formatDate } from "../../utils/format";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

export default function FrontDeskClaimSlipsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [claimSlips, setClaimSlips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // ✅ Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) {
      if (
        data.length > 0 &&
        (data[0]?.reference_number !== undefined ||
          data[0]?.document_type !== undefined)
      ) {
        return data;
      }
      return [];
    }
    if (data?.data && Array.isArray(data.data)) {
      if (
        data.data.length > 0 &&
        (data.data[0]?.reference_number !== undefined ||
          data.data[0]?.document_type !== undefined)
      ) {
        return data.data;
      }
      return [];
    }
    if (data?.claimSlips && Array.isArray(data.claimSlips))
      return data.claimSlips;

    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 3) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.reference_number !== undefined ||
            obj[0]?.document_type !== undefined)
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

  const fetchData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await api.get("/web/frontdesk/claim-slips");
      setClaimSlips(extractData(response.data));
    } catch (error) {
      console.error("❌ Error fetching claim slips:", error);
      setIsError(true);
      toast.error("Failed to load claim slips");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredClaimSlips = useMemo(() => {
    if (!searchQuery) return claimSlips;
    const query = searchQuery.toLowerCase();
    return claimSlips.filter((c: any) => {
      const firstName = c.resident?.first_name?.toLowerCase() || "";
      const lastName = c.resident?.last_name?.toLowerCase() || "";
      const ref = c.reference_number?.toLowerCase() || "";
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        ref.includes(query)
      );
    });
  }, [claimSlips, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClaimSlips.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(
    startIndex + itemsPerPage,
    filteredClaimSlips.length,
  );
  const paginatedClaimSlips = useMemo(
    () => filteredClaimSlips.slice(startIndex, endIndex),
    [filteredClaimSlips, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const handleClaim = async (id: number) => {
    setIsSubmitting(true);
    try {
      await api.post(`/web/frontdesk/claim-slips/${id}/claim`);
      toast.success("Document marked as claimed");
      fetchData();
    } catch (error) {
      toast.error("Failed to mark as claimed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = (claim: any) => {
    const printWindow = window.open("", "_blank", "width=600,height=400");
    if (!printWindow) {
      toast.error("Please allow popups");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Claim Slip - ${claim.reference_number}</title>
      <style>body{font-family:Arial;padding:40px;max-width:400px;margin:0 auto;color:#333;text-align:center}.header{border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:20px}.header h1{font-size:24px;margin:0;color:#1a56db}.details{text-align:left;margin:20px 0}.details table{width:100%}.details td{padding:8px 0}.label{color:#666;font-weight:bold}.amount{font-size:20px;font-weight:bold;color:#1a56db;padding:20px;border-top:2px dashed #ddd;border-bottom:2px dashed #ddd;margin:20px 0}.footer{font-size:12px;color:#999;margin-top:30px;padding-top:20px;border-top:1px solid #ddd}
      @media print{.no-print{display:none}}</style></head><body>
      <div class="header"><h1>Barangay Bagocboc</h1><p>Claim Slip</p><p><strong>${claim.reference_number}</strong></p></div>
      <div class="details"><table>
        <tr><td class="label">Resident</td><td>${claim.resident?.first_name || ""} ${claim.resident?.last_name || "N/A"}</td></tr>
        <tr><td class="label">Document Type</td><td>${claim.document_type || "N/A"}</td></tr>
        <tr><td class="label">Status</td><td>${claim.status || "pending"}</td></tr>
        <tr><td class="label">Issued Date</td><td>${claim.issued_at ? formatDate(claim.issued_at) : "N/A"}</td></tr>
      </table></div>
      <div class="footer"><p>Please present this slip to claim your document.</p><p>Barangay Bagocboc Management System</p></div>
      <div style="margin-top:20px;" class="no-print"><button onclick="window.print()" style="padding:10px 30px;background:#1a56db;color:white;border:none;border-radius:5px;cursor:pointer;">Print</button><button onclick="window.close()" style="padding:10px 30px;background:#6b7280;color:white;border:none;border-radius:5px;cursor:pointer;margin-left:10px;">Close</button></div>
      <script>setTimeout(() => window.print(), 500)</script></body></html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading claim slips...
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
            Failed to Load Claim Slips
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

  if (claimSlips.length === 0 && !isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Claim Slips</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Manage document claim slips
          </p>
        </div>

        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Inbox className="w-16 h-16 text-theme-textSecondary/30" />
            <h3 className="text-lg font-semibold text-theme-text">
              No Claim Slips Found
            </h3>
            <p className="text-sm text-theme-textSecondary max-w-md">
              No claim slips have been generated yet. Claim slips will appear
              here once documents are issued.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme-text">Claim Slips</h1>
        <p className="text-sm text-theme-textSecondary mt-1">
          Manage document claim slips
        </p>
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search claim slips..."
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

        {filteredClaimSlips.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {filteredClaimSlips.length}
              </span>
            </span>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        {paginatedClaimSlips.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <QrCode className="w-12 h-12 text-theme-textSecondary/30" />
              <p className="text-theme-text font-medium">
                No Claim Slips Found
              </p>
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
                      Reference
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Resident
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Document
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
                  {paginatedClaimSlips.map((claim: any) => (
                    <tr
                      key={claim.id || `claim-${Math.random()}`}
                      className="hover:bg-theme-hover transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-theme-text">
                        {claim.reference_number}
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {claim.resident?.first_name} {claim.resident?.last_name}
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {claim.document_type}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(claim.status)}`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-theme-textSecondary">
                        {claim.issued_at ? formatDate(claim.issued_at) : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePrint(claim)}
                            className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedClaim(claim);
                              setShowViewModal(true);
                            }}
                            className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {claim.status === "pending" && (
                            <button
                              onClick={() => handleClaim(claim.id)}
                              disabled={isSubmitting}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {isSubmitting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Claim"
                              )}
                            </button>
                          )}
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
              totalItems={filteredClaimSlips.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              showItemsPerPage={false}
            />
          </>
        )}
      </div>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedClaim(null);
        }}
        title="Claim Slip Details"
      >
        {selectedClaim && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Reference
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClaim.reference_number}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Status
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedClaim.status)}`}
                >
                  {selectedClaim.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Resident
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClaim.resident?.first_name}{" "}
                  {selectedClaim.resident?.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Document Type
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClaim.document_type}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Issued Date
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClaim.issued_at
                    ? formatDate(selectedClaim.issued_at)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Issued By
                </p>
                <p className="font-medium text-theme-text">
                  {selectedClaim.issued_by?.email || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedClaim(null);
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