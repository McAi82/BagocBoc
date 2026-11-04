// src/pages/programs/ProgramRequests.tsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
    ClipboardList,
    Plus,
    Search,
    Eye,
    X,
    Loader2,
    AlertCircle,
    Inbox,
    CheckCircle2,
    XCircle,
    Ban,
    Users,
    Calendar,
    MapPin,
    Send,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../api/apiClient";
import { useAuthStore } from "../../stores/authStore";
import Pagination from "../../components/ui/Pagination";

/* ============================================================
   CONSTANTS / TYPES
   ============================================================ */

const REQUESTER_ROLES = [
    "Barangay Nutrition Scholar",
    "Nurse Deployment Program",
    "Midwife",
];
const APPROVER_ROLES = [
    "Super Admin",
    "Barangay Captain",
    "Barangay Secretary",
];

const PROGRAM_TYPES = [
    { value: "nutrition", label: "Nutrition" },
    { value: "maternal", label: "Maternal" },
    { value: "drug", label: "Drug" },
    { value: "sexual_health", label: "Sexual Health" },
    { value: "other", label: "Other" },
];

const STATUS_STYLES: Record<string, string> = {
    pending:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    approved:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    cancelled: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
};

interface ProgramRequest {
    id: number;
    title: string;
    description: string | null;
    justification: string | null;
    program_type: string;
    program_type_label: string;
    start_date: string;
    end_date: string;
    target_beneficiaries: number | null;
    location: string | null;
    budget: number | null;
    status: "pending" | "approved" | "rejected" | "cancelled";
    review_remarks: string | null;
    reviewed_at: string | null;
    program_id: number | null;
    notified_count: number;
    notified_users?: { id: number; name: string }[];
    requested_by_user_id: number;
    requester_name: string | null;
    requester_role: string;
    reviewer_name: string | null;
    created_at: string;
}

interface Recipient {
    id: number;
    name: string;
    email: string;
    roles: string[];
}

const emptyForm = {
    title: "",
    program_type: "nutrition",
    description: "",
    justification: "",
    start_date: "",
    end_date: "",
    target_beneficiaries: "",
    budget: "",
    location: "",
};

const formatDate = (d?: string | null) =>
    d
        ? new Date(d).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "N/A";

const peso = (n?: number | null) =>
    n === null || n === undefined
        ? "N/A"
        : new Intl.NumberFormat("en-PH", {
              style: "currency",
              currency: "PHP",
          }).format(n);

const extractList = (payload: any): { rows: any[]; total: number } => {
    const d = payload?.data ?? payload;
    if (Array.isArray(d)) return { rows: d, total: d.length };
    if (Array.isArray(d?.data))
        return { rows: d.data, total: d.total ?? d.data.length };
    return { rows: [], total: 0 };
};

const inputCls =
    "w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none placeholder:text-theme-textSecondary";

/* ============================================================
   SMALL PIECES
   ============================================================ */

function Modal({
    title,
    onClose,
    children,
    wide = false,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    wide?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div
                className={`bg-theme-surface border border-theme rounded-xl w-full ${
                    wide ? "max-w-3xl" : "max-w-xl"
                } max-h-[90vh] flex flex-col`}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
                    <h2 className="text-lg font-semibold text-theme-text">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-theme-textSecondary hover:text-theme-text hover:bg-theme-hover rounded-lg"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

function Field({
    label,
    required,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="text-sm font-medium text-theme-text">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </span>
            <div className="mt-1">{children}</div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </label>
    );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                {label}
            </p>
            <p className="text-sm text-theme-text mt-0.5 whitespace-pre-line">
                {value || "N/A"}
            </p>
        </div>
    );
}

/* ============================================================
   MAIN
   ============================================================ */

export default function ProgramRequests() {
    const user = useAuthStore((s) => s.user);
    const userRoles: string[] = user?.roles?.map((r: any) => r.name) || [];
    const isApprover = userRoles.some((r) => APPROVER_ROLES.includes(r));
    const isRequester = userRoles.some((r) => REQUESTER_ROLES.includes(r));

    const [searchParams, setSearchParams] = useSearchParams();

    const [requests, setRequests] = useState<ProgramRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [searchQuery, setSearchQuery] = useState("");
    // approvers land on the queue that needs action; requesters see everything of theirs
    const [statusFilter, setStatusFilter] = useState(
        isApprover ? "pending" : "",
    );

    // modals
    const [showCreate, setShowCreate] = useState(false);
    const [selected, setSelected] = useState<ProgramRequest | null>(null);
    const [approving, setApproving] = useState<ProgramRequest | null>(null);
    const [rejecting, setRejecting] = useState<ProgramRequest | null>(null);

    // create form
    const [form, setForm] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    // approve
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [recipientsLoading, setRecipientsLoading] = useState(false);
    const [recipientSearch, setRecipientSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [approveRemarks, setApproveRemarks] = useState("");

    // reject
    const [rejectReason, setRejectReason] = useState("");

    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

    /* ---------- data ---------- */

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, itemsPerPage]);

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        setIsError(false);
        try {
            const params: Record<string, any> = {
                page: currentPage,
                per_page: itemsPerPage,
            };
            if (searchQuery) params.search = searchQuery;
            if (statusFilter) params.status = statusFilter;

            const res = await api.get("/web/program-requests", { params });
            const { rows, total } = extractList(res.data);
            setRequests(rows);
            setTotal(total);
        } catch (error: any) {
            console.error("Error fetching program requests:", error);
            setIsError(true);
            toast.error(
                error?.response?.data?.message || "Failed to load requests",
            );
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, searchQuery, statusFilter]);

    useEffect(() => {
        const t = setTimeout(fetchRequests, 300);
        return () => clearTimeout(t);
    }, [fetchRequests]);

    // open a request from a notification link (?id=123)
    useEffect(() => {
        const id = searchParams.get("id");
        if (!id) return;
        (async () => {
            try {
                const res = await api.get(`/web/program-requests/${id}`);
                setSelected(res.data?.data ?? res.data);
            } catch {
                toast.error("That request could not be opened");
            } finally {
                searchParams.delete("id");
                setSearchParams(searchParams, { replace: true });
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openDetails = async (r: ProgramRequest) => {
        setSelected(r);
        try {
            const res = await api.get(`/web/program-requests/${r.id}`);
            setSelected(res.data?.data ?? res.data);
        } catch {
            /* keep the list copy */
        }
    };

    /* ---------- create ---------- */

    const setField = (k: keyof typeof emptyForm, v: string) => {
        setForm((f) => ({ ...f, [k]: v }));
        if (formErrors[k]) setFormErrors((e) => ({ ...e, [k]: "" }));
    };

    const validateForm = () => {
        const e: Record<string, string> = {};
        if (!form.title.trim()) e.title = "Program title is required";
        if (!form.start_date) e.start_date = "Start date is required";
        if (!form.end_date) e.end_date = "End date is required";
        if (form.start_date && form.end_date && form.end_date < form.start_date)
            e.end_date = "End date must be on or after the start date";
        if (form.target_beneficiaries && Number(form.target_beneficiaries) < 1)
            e.target_beneficiaries = "Must be at least 1";
        if (form.budget && Number(form.budget) < 0)
            e.budget = "Cannot be negative";
        setFormErrors(e);
        return Object.keys(e).length === 0;
    };

    const submitRequest = async () => {
        if (!validateForm()) return;
        setIsSaving(true);
        try {
            await api.post("/web/program-requests", {
                title: form.title.trim(),
                program_type: form.program_type,
                description: form.description.trim() || null,
                justification: form.justification.trim() || null,
                start_date: form.start_date,
                end_date: form.end_date,
                target_beneficiaries: form.target_beneficiaries
                    ? Number(form.target_beneficiaries)
                    : null,
                budget: form.budget ? Number(form.budget) : null,
                location: form.location.trim() || null,
            });
            toast.success("Program request submitted for approval");
            setShowCreate(false);
            setForm(emptyForm);
            setStatusFilter("");
            fetchRequests();
        } catch (error: any) {
            const errs = error?.response?.data?.errors;
            if (errs) {
                const mapped: Record<string, string> = {};
                Object.keys(errs).forEach((k) => (mapped[k] = errs[k][0]));
                setFormErrors(mapped);
            }
            toast.error(
                error?.response?.data?.message || "Failed to submit request",
            );
        } finally {
            setIsSaving(false);
        }
    };

    const cancelRequest = async (r: ProgramRequest) => {
        if (!window.confirm(`Cancel the request "${r.title}"?`)) return;
        try {
            await api.post(`/web/program-requests/${r.id}/cancel`);
            toast.success("Request cancelled");
            setSelected(null);
            fetchRequests();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || "Failed to cancel request",
            );
        }
    };

    /* ---------- approve ---------- */

    const openApprove = async (r: ProgramRequest) => {
        setApproving(r);
        setSelectedIds(new Set());
        setApproveRemarks("");
        setRecipientSearch("");
        setRecipientsLoading(true);
        try {
            const res = await api.get("/web/program-requests/recipients");
            const list: Recipient[] = res.data?.data ?? res.data ?? [];
            setRecipients(Array.isArray(list) ? list : []);
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || "Failed to load users",
            );
            setRecipients([]);
        } finally {
            setRecipientsLoading(false);
        }
    };

    const filteredRecipients = useMemo(() => {
        const q = recipientSearch.trim().toLowerCase();
        if (!q) return recipients;
        return recipients.filter(
            (u) =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.roles.some((r) => r.toLowerCase().includes(q)),
        );
    }, [recipients, recipientSearch]);

    const roleOptions = useMemo(() => {
        const counts = new Map<string, number>();
        recipients.forEach((u) =>
            u.roles.forEach((r) => counts.set(r, (counts.get(r) || 0) + 1)),
        );
        return Array.from(counts.entries()).sort((a, b) =>
            a[0].localeCompare(b[0]),
        );
    }, [recipients]);

    const toggleUser = (id: number) =>
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const toggleRole = (role: string) => {
        const ids = recipients
            .filter((u) => u.roles.includes(role))
            .map((u) => u.id);
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const allOn = ids.every((id) => next.has(id));
            ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
            return next;
        });
    };

    const confirmApprove = async () => {
        if (!approving) return;
        if (selectedIds.size === 0) {
            toast.error("Choose at least one user to notify");
            return;
        }
        setIsSaving(true);
        try {
            await api.post(`/web/program-requests/${approving.id}/approve`, {
                recipient_user_ids: Array.from(selectedIds),
                remarks: approveRemarks.trim() || null,
            });
            toast.success(
                `Program created. ${selectedIds.size} user(s) will be notified.`,
            );
            setApproving(null);
            setSelected(null);
            fetchRequests();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || "Failed to approve request",
            );
        } finally {
            setIsSaving(false);
        }
    };

    /* ---------- reject ---------- */

    const confirmReject = async () => {
        if (!rejecting) return;
        if (!rejectReason.trim()) {
            toast.error("Please give a reason for rejecting");
            return;
        }
        setIsSaving(true);
        try {
            await api.post(`/web/program-requests/${rejecting.id}/reject`, {
                reason: rejectReason.trim(),
            });
            toast.success("Request rejected");
            setRejecting(null);
            setRejectReason("");
            setSelected(null);
            fetchRequests();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || "Failed to reject request",
            );
        } finally {
            setIsSaving(false);
        }
    };

    /* ============================================================
     RENDER
     ============================================================ */

    if (!isApprover && !isRequester) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-theme-text">
                        No access
                    </h3>
                    <p className="text-sm text-theme-textSecondary mt-1">
                        Program requests are available to BNS, NDP, Midwives and
                        approvers.
                    </p>
                </div>
            </div>
        );
    }

    const statusBadge = (s: string) => (
        <span
            className={`inline-block px-2.5 py-1 text-xs rounded-full capitalize ${
                STATUS_STYLES[s] || STATUS_STYLES.cancelled
            }`}
        >
            {s}
        </span>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-theme-text flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-theme-primary" />
                        Program Requests
                    </h1>
                    <p className="text-sm text-theme-textSecondary">
                        {isApprover
                            ? "Review requested programs, approve them and choose who gets notified"
                            : "Request a new program for approval by the Secretary or Captain"}
                    </p>
                </div>
                {isRequester && (
                    <button
                        onClick={() => {
                            setForm(emptyForm);
                            setFormErrors({});
                            setShowCreate(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Request a Program
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-theme-surface border border-theme rounded-xl p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                    <input
                        type="text"
                        placeholder="Search by title, description or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`${inputCls} pl-10`}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`${inputCls} sm:w-48`}
                >
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {/* List */}
            <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
                {isLoading && requests.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center h-48">
                        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                        <p className="text-theme-text font-medium">
                            Failed to load requests
                        </p>
                        <button
                            onClick={fetchRequests}
                            className="mt-3 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-theme-background border-b border-theme">
                                    <tr>
                                        {[
                                            "Program",
                                            "Requested By",
                                            "Schedule",
                                            "Beneficiaries / Budget",
                                            "Status",
                                            "Submitted",
                                            "",
                                        ].map((h, i) => (
                                            <th
                                                key={i}
                                                className={`px-4 py-3 text-xs font-medium text-theme-textSecondary uppercase tracking-wider ${
                                                    i === 6
                                                        ? "text-right"
                                                        : "text-left"
                                                }`}
                                            >
                                                {h || "Action"}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-theme">
                                    {requests.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-4 py-12 text-center"
                                            >
                                                <Inbox className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-3" />
                                                <p className="text-theme-text font-medium">
                                                    No program requests
                                                </p>
                                                <p className="text-sm text-theme-textSecondary">
                                                    {statusFilter ===
                                                        "pending" && isApprover
                                                        ? "Nothing is waiting for your approval"
                                                        : "Try changing the filters"}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        requests.map((r) => (
                                            <tr
                                                key={r.id}
                                                className="hover:bg-theme-hover transition-colors cursor-pointer"
                                                onClick={() => openDetails(r)}
                                            >
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-theme-text">
                                                        {r.title}
                                                    </p>
                                                    <p className="text-xs text-theme-textSecondary">
                                                        {r.program_type_label}
                                                        {r.location
                                                            ? ` · ${r.location}`
                                                            : ""}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm text-theme-text">
                                                        {r.requester_name ||
                                                            "Unknown"}
                                                    </p>
                                                    <p className="text-xs text-theme-textSecondary">
                                                        {r.requester_role}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-theme-text">
                                                    {formatDate(r.start_date)}
                                                    <span className="text-theme-textSecondary">
                                                        {" "}
                                                        to{" "}
                                                    </span>
                                                    {formatDate(r.end_date)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-theme-text">
                                                    {r.target_beneficiaries ??
                                                        "N/A"}
                                                    <span className="block text-xs text-theme-textSecondary">
                                                        {peso(r.budget)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {statusBadge(r.status)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-theme-textSecondary">
                                                    {formatDate(r.created_at)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openDetails(r);
                                                        }}
                                                        className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {requests.length > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={total}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={setItemsPerPage}
                            />
                        )}
                    </>
                )}
            </div>

            {/* ================= DETAILS ================= */}
            {selected && (
                <Modal
                    title="Program Request"
                    onClose={() => setSelected(null)}
                    wide
                >
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-semibold text-theme-text">
                                    {selected.title}
                                </h3>
                                <p className="text-sm text-theme-textSecondary">
                                    {selected.program_type_label} program ·
                                    requested by{" "}
                                    {selected.requester_name || "Unknown"} (
                                    {selected.requester_role})
                                </p>
                            </div>
                            {statusBadge(selected.status)}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Detail
                                label="Schedule"
                                value={
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {formatDate(
                                            selected.start_date,
                                        )} to {formatDate(selected.end_date)}
                                    </span>
                                }
                            />
                            <Detail
                                label="Location"
                                value={
                                    selected.location && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {selected.location}
                                        </span>
                                    )
                                }
                            />
                            <Detail
                                label="Target Beneficiaries"
                                value={selected.target_beneficiaries}
                            />
                            <Detail
                                label="Budget"
                                value={peso(selected.budget)}
                            />
                        </div>
                        <Detail
                            label="Description"
                            value={selected.description}
                        />
                        <Detail
                            label="Justification"
                            value={selected.justification}
                        />

                        {selected.status !== "pending" &&
                            selected.status !== "cancelled" && (
                                <div className="p-4 bg-theme-background border border-theme rounded-lg space-y-3">
                                    <Detail
                                        label={
                                            selected.status === "approved"
                                                ? "Approved by"
                                                : "Rejected by"
                                        }
                                        value={`${selected.reviewer_name || "Unknown"} · ${formatDate(
                                            selected.reviewed_at,
                                        )}`}
                                    />
                                    <Detail
                                        label={
                                            selected.status === "approved"
                                                ? "Remarks"
                                                : "Reason"
                                        }
                                        value={selected.review_remarks}
                                    />
                                    {selected.status === "approved" && (
                                        <div>
                                            <p className="text-xs font-medium text-theme-textSecondary uppercase tracking-wider flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5" />
                                                Notified (
                                                {selected.notified_count})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                {(
                                                    selected.notified_users ||
                                                    []
                                                ).map((u) => (
                                                    <span
                                                        key={u.id}
                                                        className="px-2 py-1 text-xs bg-theme-surface border border-theme rounded-full text-theme-text"
                                                    >
                                                        {u.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        {/* actions */}
                        {selected.status === "pending" && (
                            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-theme">
                                {selected.requested_by_user_id === user?.id && (
                                    <button
                                        onClick={() => cancelRequest(selected)}
                                        className="flex items-center gap-2 px-4 py-2 border border-theme text-theme-text rounded-lg hover:bg-theme-hover"
                                    >
                                        <Ban className="w-4 h-4" />
                                        Cancel Request
                                    </button>
                                )}
                                {isApprover && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setRejectReason("");
                                                setRejecting(selected);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                        <button
                                            onClick={() =>
                                                openApprove(selected)
                                            }
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Approve
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* ================= CREATE ================= */}
            {showCreate && (
                <Modal
                    title="Request a Program"
                    onClose={() => setShowCreate(false)}
                    wide
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <Field
                                    label="Program Title"
                                    required
                                    error={formErrors.title}
                                >
                                    <input
                                        className={inputCls}
                                        value={form.title}
                                        onChange={(e) =>
                                            setField("title", e.target.value)
                                        }
                                        placeholder="e.g. Operation Timbang Plus"
                                    />
                                </Field>
                            </div>
                            <Field
                                label="Program Type"
                                required
                                error={formErrors.program_type}
                            >
                                <select
                                    className={inputCls}
                                    value={form.program_type}
                                    onChange={(e) =>
                                        setField("program_type", e.target.value)
                                    }
                                >
                                    {PROGRAM_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Location" error={formErrors.location}>
                                <input
                                    className={inputCls}
                                    value={form.location}
                                    onChange={(e) =>
                                        setField("location", e.target.value)
                                    }
                                    placeholder="e.g. Barangay Health Center"
                                />
                            </Field>
                            <Field
                                label="Start Date"
                                required
                                error={formErrors.start_date}
                            >
                                <input
                                    type="date"
                                    className={inputCls}
                                    value={form.start_date}
                                    onChange={(e) =>
                                        setField("start_date", e.target.value)
                                    }
                                />
                            </Field>
                            <Field
                                label="End Date"
                                required
                                error={formErrors.end_date}
                            >
                                <input
                                    type="date"
                                    className={inputCls}
                                    value={form.end_date}
                                    min={form.start_date || undefined}
                                    onChange={(e) =>
                                        setField("end_date", e.target.value)
                                    }
                                />
                            </Field>
                            <Field
                                label="Target Beneficiaries"
                                error={formErrors.target_beneficiaries}
                            >
                                <input
                                    type="number"
                                    min={1}
                                    className={inputCls}
                                    value={form.target_beneficiaries}
                                    onChange={(e) =>
                                        setField(
                                            "target_beneficiaries",
                                            e.target.value,
                                        )
                                    }
                                />
                            </Field>
                            <Field
                                label="Budget (PHP)"
                                error={formErrors.budget}
                            >
                                <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className={inputCls}
                                    value={form.budget}
                                    onChange={(e) =>
                                        setField("budget", e.target.value)
                                    }
                                />
                            </Field>
                        </div>
                        <Field
                            label="Description"
                            error={formErrors.description}
                        >
                            <textarea
                                rows={3}
                                className={inputCls}
                                value={form.description}
                                onChange={(e) =>
                                    setField("description", e.target.value)
                                }
                                placeholder="What will the program do?"
                            />
                        </Field>
                        <Field
                            label="Justification"
                            error={formErrors.justification}
                        >
                            <textarea
                                rows={3}
                                className={inputCls}
                                value={form.justification}
                                onChange={(e) =>
                                    setField("justification", e.target.value)
                                }
                                placeholder="Why is this program needed?"
                            />
                        </Field>

                        <div className="flex justify-end gap-2 pt-2 border-t border-theme">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="px-4 py-2 border border-theme text-theme-text rounded-lg hover:bg-theme-hover"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitRequest}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                Submit Request
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ================= APPROVE + CHOOSE RECIPIENTS ================= */}
            {approving && (
                <Modal
                    title={`Approve: ${approving.title}`}
                    onClose={() => setApproving(null)}
                    wide
                >
                    <div className="space-y-4">
                        <p className="text-sm text-theme-textSecondary">
                            Approving creates the program. Choose who receives
                            the program notification.
                        </p>

                        {recipientsLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
                            </div>
                        ) : (
                            <>
                                {/* quick select by role */}
                                {roleOptions.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-theme-textSecondary uppercase tracking-wider mb-2">
                                            Quick select by role
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {roleOptions.map(
                                                ([role, count]) => {
                                                    const ids = recipients
                                                        .filter((u) =>
                                                            u.roles.includes(
                                                                role,
                                                            ),
                                                        )
                                                        .map((u) => u.id);
                                                    const allOn = ids.every(
                                                        (id) =>
                                                            selectedIds.has(id),
                                                    );
                                                    return (
                                                        <button
                                                            key={role}
                                                            onClick={() =>
                                                                toggleRole(role)
                                                            }
                                                            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                                                                allOn
                                                                    ? "bg-theme-primary text-white border-theme-primary"
                                                                    : "border-theme text-theme-text hover:bg-theme-hover"
                                                            }`}
                                                        >
                                                            {role} ({count})
                                                        </button>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* search + bulk */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                                        <input
                                            className={`${inputCls} pl-10`}
                                            placeholder="Search name, email or role..."
                                            value={recipientSearch}
                                            onChange={(e) =>
                                                setRecipientSearch(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <button
                                        onClick={() =>
                                            setSelectedIds(
                                                new Set([
                                                    ...selectedIds,
                                                    ...filteredRecipients.map(
                                                        (u) => u.id,
                                                    ),
                                                ]),
                                            )
                                        }
                                        className="px-3 py-2 text-sm border border-theme rounded-lg text-theme-text hover:bg-theme-hover"
                                    >
                                        Select shown
                                    </button>
                                    <button
                                        onClick={() =>
                                            setSelectedIds(new Set())
                                        }
                                        className="px-3 py-2 text-sm border border-theme rounded-lg text-theme-textSecondary hover:bg-theme-hover"
                                    >
                                        Clear
                                    </button>
                                </div>

                                {/* list */}
                                <div className="border border-theme rounded-lg max-h-72 overflow-y-auto divide-y divide-theme">
                                    {filteredRecipients.length === 0 ? (
                                        <p className="p-6 text-center text-sm text-theme-textSecondary">
                                            No users match your search
                                        </p>
                                    ) : (
                                        filteredRecipients.map((u) => (
                                            <label
                                                key={u.id}
                                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-theme-hover cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(
                                                        u.id,
                                                    )}
                                                    onChange={() =>
                                                        toggleUser(u.id)
                                                    }
                                                    className="w-4 h-4 accent-[var(--color-primary,#2563eb)]"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-theme-text truncate">
                                                        {u.name}
                                                    </p>
                                                    <p className="text-xs text-theme-textSecondary truncate">
                                                        {u.email}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap justify-end gap-1">
                                                    {u.roles.map((r) => (
                                                        <span
                                                            key={r}
                                                            className="px-2 py-0.5 text-[11px] bg-theme-background border border-theme rounded-full text-theme-textSecondary"
                                                        >
                                                            {r}
                                                        </span>
                                                    ))}
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>

                                <Field label="Remarks (optional)">
                                    <textarea
                                        rows={2}
                                        className={inputCls}
                                        value={approveRemarks}
                                        onChange={(e) =>
                                            setApproveRemarks(e.target.value)
                                        }
                                        placeholder="Shown to the requester"
                                    />
                                </Field>
                            </>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-theme">
                            <p className="text-sm text-theme-textSecondary">
                                <strong className="text-theme-text">
                                    {selectedIds.size}
                                </strong>{" "}
                                user(s) selected
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setApproving(null)}
                                    className="px-4 py-2 border border-theme text-theme-text rounded-lg hover:bg-theme-hover"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={confirmApprove}
                                    disabled={
                                        isSaving || selectedIds.size === 0
                                    }
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    Approve &amp; Notify
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ================= REJECT ================= */}
            {rejecting && (
                <Modal
                    title={`Reject: ${rejecting.title}`}
                    onClose={() => setRejecting(null)}
                >
                    <div className="space-y-4">
                        <Field label="Reason for rejecting" required>
                            <textarea
                                rows={4}
                                className={inputCls}
                                value={rejectReason}
                                onChange={(e) =>
                                    setRejectReason(e.target.value)
                                }
                                placeholder="The requester will see this reason"
                            />
                        </Field>
                        <div className="flex justify-end gap-2 pt-2 border-t border-theme">
                            <button
                                onClick={() => setRejecting(null)}
                                className="px-4 py-2 border border-theme text-theme-text rounded-lg hover:bg-theme-hover"
                            >
                                Back
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                                Reject Request
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
