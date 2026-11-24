// pages/archive/ArchivePage.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
    Archive,
    Search,
    RotateCcw,
    AlertCircle,
    Clock,
    Loader2,
} from "lucide-react";
import { formatDate } from "../../utils/format";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

type ArchiveType = "certification" | "clearance" | "front_desk";
type ArchiveReason = "rejected" | "cancelled" | "deleted";

interface ArchiveItem {
    type: ArchiveType;
    id: number;
    reference_number: string;
    resident_name: string;
    label: string | null;
    archive_reason: ArchiveReason;
    status_before_archive: string | null;
    remarks: string | null;
    archived_at: string;
    purge_at: string;
    days_left: number;
    archived_by: { id: number; name: string } | null;
    can_restore: boolean;
}

const TYPE_TABS: { value: "all" | ArchiveType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "certification", label: "Certificates" },
    { value: "clearance", label: "Clearances" },
    { value: "front_desk", label: "Front desk requests" },
];

const TYPE_LABEL: Record<ArchiveType, string> = {
    certification: "Certificate",
    clearance: "Clearance",
    front_desk: "Front desk",
};

const REASON_STYLE: Record<ArchiveReason, string> = {
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    cancelled:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    deleted: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
};

const REASON_LABEL: Record<ArchiveReason, string> = {
    rejected: "Rejected",
    cancelled: "Cancelled",
    deleted: "Deleted",
};

const timeLeftText = (days: number) =>
    days <= 0
        ? "Deleting soon"
        : days === 1
          ? "1 day left"
          : `${days} days left`;

const timeLeftStyle = (days: number) =>
    days <= 3
        ? "text-red-600 dark:text-red-400"
        : days <= 7
          ? "text-orange-600 dark:text-orange-400"
          : "text-theme-textSecondary";

export default function ArchivePage() {
    const [items, setItems] = useState<ArchiveItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const [typeTab, setTypeTab] = useState<"all" | ArchiveType>("all");
    const [reasonFilter, setReasonFilter] = useState<"all" | ArchiveReason>(
        "all",
    );
    const [mineOnly, setMineOnly] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const [restoreTarget, setRestoreTarget] = useState<ArchiveItem | null>(
        null,
    );
    const [isRestoring, setIsRestoring] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        setIsError(false);
        try {
            const res = await api.get("/web/archive", {
                params: { type: "all" },
            });
            const list = res.data?.data ?? res.data;
            setItems(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error("❌ Error fetching archive:", error);
            setIsError(true);
            toast.error("Failed to load archive");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [typeTab, reasonFilter, mineOnly, searchQuery, itemsPerPage]);

    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = { all: items.length };
        items.forEach((i) => {
            counts[i.type] = (counts[i.type] || 0) + 1;
        });
        return counts;
    }, [items]);

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return items.filter((i) => {
            if (typeTab !== "all" && i.type !== typeTab) return false;
            if (reasonFilter !== "all" && i.archive_reason !== reasonFilter)
                return false;
            if (mineOnly && !i.can_restore) return false;
            if (query) {
                return (
                    i.reference_number?.toLowerCase().includes(query) ||
                    i.resident_name?.toLowerCase().includes(query) ||
                    i.label?.toLowerCase().includes(query) ||
                    false
                );
            }
            return true;
        });
    }, [items, typeTab, reasonFilter, mineOnly, searchQuery]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredItems.length / itemsPerPage),
    );
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
    const paginatedItems = useMemo(
        () => filteredItems.slice(startIndex, endIndex),
        [filteredItems, startIndex, endIndex],
    );

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const handleRestore = async () => {
        if (!restoreTarget) return;
        setIsRestoring(true);
        try {
            await api.post(
                `/web/archive/${restoreTarget.type}/${restoreTarget.id}/restore`,
            );
            toast.success("Request restored");
            setRestoreTarget(null);
            fetchData();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || "Failed to restore request",
            );
        } finally {
            setIsRestoring(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <Spinner size="lg" />
                    <p className="text-sm text-theme-textSecondary font-medium">
                        Loading archive...
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
                        Failed to Load Archive
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
            <div>
                <h1 className="text-2xl font-bold text-theme-text">Archive</h1>
                <p className="text-sm text-theme-textSecondary mt-1">
                    Rejected, cancelled and deleted requests are kept for 15
                    days, then permanently deleted. Only the person who archived
                    a request can restore it.
                </p>
            </div>

            <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm space-y-4">
                <div className="flex flex-wrap gap-2">
                    {TYPE_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setTypeTab(tab.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                typeTab === tab.value
                                    ? "bg-theme-primary text-white"
                                    : "bg-theme-background text-theme-textSecondary hover:text-theme-text"
                            }`}
                        >
                            {tab.label}{" "}
                            <span className="opacity-70">
                                ({tabCounts[tab.value] || 0})
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                        <input
                            type="text"
                            placeholder="Search by reference, resident or request type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                        />
                    </div>
                    <select
                        value={reasonFilter}
                        onChange={(e) => setReasonFilter(e.target.value as any)}
                        className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                    >
                        <option value="all">All reasons</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="deleted">Deleted</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-theme-text whitespace-nowrap cursor-pointer">
                        <input
                            type="checkbox"
                            checked={mineOnly}
                            onChange={(e) => setMineOnly(e.target.checked)}
                            className="rounded border-theme"
                        />
                        Archived by me
                    </label>
                </div>
            </div>

            <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
                {paginatedItems.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <Archive className="w-12 h-12 text-theme-textSecondary/30" />
                            <p className="text-theme-text font-medium">
                                {items.length === 0
                                    ? "The archive is empty"
                                    : "No archived requests match your filters"}
                            </p>
                            <p className="text-sm text-theme-textSecondary">
                                {items.length === 0
                                    ? "Rejected, cancelled and deleted requests will appear here."
                                    : "Try a different search, reason or tab."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-theme-background border-b border-theme">
                                    <tr>
                                        {[
                                            "Reference",
                                            "Resident",
                                            "Request",
                                            "Reason",
                                            "Archived by",
                                            "Archived on",
                                            "Time left",
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-theme">
                                    {paginatedItems.map((item) => (
                                        <tr
                                            key={`${item.type}-${item.id}`}
                                            className="hover:bg-theme-hover transition-colors"
                                        >
                                            <td className="px-4 py-3 font-medium text-theme-text">
                                                {item.reference_number}
                                            </td>
                                            <td className="px-4 py-3 text-theme-textSecondary">
                                                {item.resident_name}
                                            </td>
                                            <td className="px-4 py-3 text-theme-textSecondary">
                                                <div className="text-theme-text">
                                                    {item.label ||
                                                        TYPE_LABEL[item.type]}
                                                </div>
                                                <div className="text-xs">
                                                    {TYPE_LABEL[item.type]}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-block px-2 py-1 text-xs rounded-full ${REASON_STYLE[item.archive_reason]}`}
                                                >
                                                    {
                                                        REASON_LABEL[
                                                            item.archive_reason
                                                        ]
                                                    }
                                                </span>
                                                {item.remarks && (
                                                    <div
                                                        className="text-xs text-theme-textSecondary mt-1 max-w-[220px] truncate"
                                                        title={item.remarks}
                                                    >
                                                        {item.remarks}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-theme-textSecondary">
                                                {item.archived_by?.name ||
                                                    "Unknown"}
                                            </td>
                                            <td className="px-4 py-3 text-theme-textSecondary">
                                                {formatDate(item.archived_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1 text-sm ${timeLeftStyle(item.days_left)}`}
                                                >
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {timeLeftText(
                                                        item.days_left,
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() =>
                                                        setRestoreTarget(item)
                                                    }
                                                    disabled={!item.can_restore}
                                                    title={
                                                        item.can_restore
                                                            ? "Restore this request"
                                                            : `Only ${item.archived_by?.name || "the person who archived it"} can restore this request`
                                                    }
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-theme-primary text-white rounded-lg text-xs font-medium hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    Restore
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredItems.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                            showItemsPerPage={false}
                        />
                    </>
                )}
            </div>

            <Modal
                isOpen={!!restoreTarget}
                onClose={() => !isRestoring && setRestoreTarget(null)}
                title="Restore request"
                size="md"
            >
                {restoreTarget && (
                    <div className="space-y-5">
                        <p className="text-sm text-theme-text">
                            Restore{" "}
                            <span className="font-semibold">
                                {restoreTarget.reference_number}
                            </span>{" "}
                            for {restoreTarget.resident_name}? It will go back
                            to{" "}
                            <span className="font-semibold">
                                {restoreTarget.status_before_archive ||
                                    "its previous status"}
                            </span>{" "}
                            and appear in the active list again.
                        </p>
                        {restoreTarget.type === "front_desk" &&
                            restoreTarget.archive_reason === "cancelled" && (
                                <p className="text-sm text-theme-textSecondary">
                                    The request will not be added back to the
                                    queue. Add it again from the Queue page if
                                    needed.
                                </p>
                            )}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setRestoreTarget(null)}
                                disabled={isRestoring}
                                className="px-4 py-2 border border-theme rounded-lg text-theme-text hover:bg-theme-hover transition-colors disabled:opacity-50"
                            >
                                Keep archived
                            </button>
                            <button
                                onClick={handleRestore}
                                disabled={isRestoring}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                            >
                                {isRestoring ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RotateCcw className="w-4 h-4" />
                                )}
                                Restore request
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
