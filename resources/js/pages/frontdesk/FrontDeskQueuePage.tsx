// pages/frontdesk/FrontDeskQueuePage.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  Bell,
  Loader2,
  Eye,
  AlertCircle,
  User,
} from "lucide-react";
import { getStatusColor, formatDate, formatTimeAgo } from "../../utils/format";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

export default function FrontDeskQueuePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) {
      if (
        data.length > 0 &&
        (data[0]?.position !== undefined || data[0]?.status !== undefined)
      ) {
        return data;
      }
      return [];
    }
    if (data?.data && Array.isArray(data.data)) {
      if (
        data.data.length > 0 &&
        (data.data[0]?.position !== undefined ||
          data.data[0]?.status !== undefined)
      ) {
        return data.data;
      }
      return [];
    }
    if (data?.queue && Array.isArray(data.queue)) return data.queue;

    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 3) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.position !== undefined || obj[0]?.status !== undefined)
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

  const fetchQueue = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await api.get("/web/frontdesk/queue");
      setQueue(extractData(response.data));
    } catch (error) {
      console.error("Error fetching queue:", error);
      setIsError(true);
      toast.error("Failed to load queue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredQueue = useMemo(() => {
    if (!searchQuery) return queue;
    const query = searchQuery.toLowerCase();
    return queue.filter((item: any) => {
      const firstName = item.resident?.first_name?.toLowerCase() || "";
      const lastName = item.resident?.last_name?.toLowerCase() || "";
      return firstName.includes(query) || lastName.includes(query);
    });
  }, [queue, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredQueue.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredQueue.length);
  const paginatedQueue = useMemo(
    () => filteredQueue.slice(startIndex, endIndex),
    [filteredQueue, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const handleProcessRequest = async (id: number) => {
    setIsProcessing(true);
    try {
      await api.post(`/web/frontdesk/requests/${id}/process`);
      toast.success("Request is being processed");
      fetchQueue();
    } catch (error) {
      toast.error("Failed to process request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCallNext = async () => {
    setIsProcessing(true);
    try {
      await api.post("/web/frontdesk/queue/call-next");
      toast.success("Next in line called!");
      fetchQueue();
    } catch (error) {
      toast.error("Failed to call next");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading queue...
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
            Failed to Load Queue
          </h3>
          <button
            onClick={fetchQueue}
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
            Queue Management
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Manage resident queue and serve visitors
          </p>
        </div>
        <button
          onClick={handleCallNext}
          disabled={isProcessing}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          Call Next
        </button>
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search queue..."
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

        {filteredQueue.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {filteredQueue.length}
              </span>
            </span>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-background border-b border-theme">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Resident
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Service
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {paginatedQueue.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-theme-textSecondary"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-12 h-12 text-theme-textSecondary/30" />
                      <p>No entries in queue</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedQueue.map((item: any) => (
                  <tr
                    key={item.id}
                    className="hover:bg-theme-hover transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-theme-text">
                      #{item.position}
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-theme-textSecondary" />
                        {item.resident?.first_name} {item.resident?.last_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary">
                      {item.service_type ||
                        item.request?.service_type ||
                        "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-theme-textSecondary text-sm">
                      {item.joined_at ? formatTimeAgo(item.joined_at) : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowViewModal(true);
                          }}
                          className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.status === "waiting" && (
                          <button
                            onClick={() =>
                              handleProcessRequest(item.request_id)
                            }
                            disabled={isProcessing}
                            className="px-3 py-1 bg-theme-primary text-white rounded-lg text-xs font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Serve"
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination */}
        {filteredQueue.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredQueue.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            showItemsPerPage={false}
          />
        )}
      </div>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedItem(null);
        }}
        title="Queue Details"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Position
                </p>
                <p className="font-bold text-theme-text">
                  #{selectedItem.position}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Status
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(selectedItem.status)}`}
                >
                  {selectedItem.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Resident
                </p>
                <p className="font-medium text-theme-text">
                  {selectedItem.resident?.first_name}{" "}
                  {selectedItem.resident?.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Service
                </p>
                <p className="font-medium text-theme-text">
                  {selectedItem.request?.service_type || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Joined
                </p>
                <p className="font-medium text-theme-text">
                  {selectedItem.joined_at
                    ? formatDate(selectedItem.joined_at)
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-theme-textSecondary font-medium">
                  Phone
                </p>
                <p className="font-medium text-theme-text">
                  {selectedItem.resident?.phone_number || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedItem(null);
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