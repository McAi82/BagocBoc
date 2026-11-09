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
  Megaphone,
  Home,
  Shield,
  Heart,
  ChevronDown,
  ChevronUp,
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
const APPROVER_ROLES = ["Super Admin", "Barangay Captain", "Barangay Secretary"];

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

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

/** Ready-made audiences shown as cards on the approval screen. */
const AUDIENCE_PRESETS: {
  key: string;
  title: string;
  hint: string;
  icon: React.ElementType;
  roles: string[];
}[] = [
  {
    key: "residents",
    title: "All Residents",
    hint: "Every resident with an account",
    icon: Home,
    roles: ["Resident"],
  },
  {
    key: "officials",
    title: "Officials & Staff",
    hint: "Captain, Secretary, Treasurer, Front Desk, Super Admin",
    icon: Shield,
    roles: [
      "Super Admin",
      "Barangay Captain",
      "Barangay Secretary",
      "Barangay Treasurer",
      "Front Desk Clerk",
    ],
  },
  {
    key: "health",
    title: "Health Team",
    hint: "Midwives, NDP, BNS and BHWs",
    icon: Heart,
    roles: [
      "Midwife",
      "Nurse Deployment Program",
      "Barangay Nutrition Scholar",
      "Barangay Health Worker",
    ],
  },
  {
    key: "zoneleaders",
    title: "Zone Leaders",
    hint: "All zone leaders",
    icon: MapPin,
    roles: ["Zone Leader"],
  },
];

interface ProgramRequest {
  id: number;
  title: string;
  description: string | null;
  justification: string | null;
  program_type: string;
  program_type_label: string;
  start_date: string;
  end_date: string;
  location: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  review_remarks: string | null;
  reviewed_at: string | null;
  program_id: number | null;
  notified_count: number;
  notified_users?: { id: number; name: string }[];
  notified_more?: number;
  requested_by_user_id: number;
  requester_name: string | null;
  requester_role: string;
  reviewer_name: string | null;
  created_at: string;
}

interface AudienceUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  zone_id: number | null;
  zone_name: string | null;
}

interface Zone {
  id: number;
  zone_number: number;
  name: string;
}

const emptyForm = {
  title: "",
  program_type: "nutrition",
  description: "",
  justification: "",
  start_date: "",
  end_date: "",
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
  footer,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className={`bg-theme-surface border border-theme rounded-xl w-full ${
          wide ? "max-w-3xl" : "max-w-xl"
        } max-h-[92vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
          <h2 className="text-lg font-semibold text-theme-text pr-4 truncate">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-textSecondary hover:text-theme-text hover:bg-theme-hover rounded-lg flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-theme bg-theme-surface rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-theme-text">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && !error && (
        <p className="mt-1 text-xs text-theme-textSecondary">{hint}</p>
      )}
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
      <div className="text-sm text-theme-text mt-0.5 whitespace-pre-line">
        {value || "N/A"}
      </div>
    </div>
  );
}

function SectionTitle({
  step,
  title,
  hint,
}: {
  step: number;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-3 text-left">
      <span className="w-6 h-6 rounded-full bg-theme-primary text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
        {step}
      </span>
      <div>
        <p className="text-sm font-semibold text-theme-text">{title}</p>
        {hint && <p className="text-xs text-theme-textSecondary">{hint}</p>}
      </div>
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
  // approvers land on the queue that needs action
  const [statusFilter, setStatusFilter] = useState(isApprover ? "pending" : "");

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<ProgramRequest | null>(null);
  const [approving, setApproving] = useState<ProgramRequest | null>(null);
  const [rejecting, setRejecting] = useState<ProgramRequest | null>(null);

  // create form
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // approve / audience
  const [audienceUsers, setAudienceUsers] = useState<AudienceUser[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [everyone, setEveryone] = useState(false);
  const [presetKeys, setPresetKeys] = useState<Set<string>>(new Set());
  const [zoneIds, setZoneIds] = useState<Set<number>>(new Set());
  const [pickedIds, setPickedIds] = useState<Set<number>>(new Set());
  const [showPeople, setShowPeople] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [approveRemarks, setApproveRemarks] = useState("");

  // reject
  const [rejectReason, setRejectReason] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  /* ---------- list ---------- */

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
      toast.error(error?.response?.data?.message || "Failed to load requests");
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
      toast.error(error?.response?.data?.message || "Failed to submit request");
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
      toast.error(error?.response?.data?.message || "Failed to cancel request");
    }
  };

  /* ---------- approve: audience ---------- */

  const openApprove = async (r: ProgramRequest) => {
    setApproving(r);
    setEveryone(false);
    setPresetKeys(new Set());
    setZoneIds(new Set());
    setPickedIds(new Set());
    setShowPeople(false);
    setPeopleSearch("");
    setApproveRemarks("");
    setAudienceLoading(true);
    try {
      const res = await api.get("/web/program-requests/recipients");
      const data = res.data?.data ?? res.data ?? {};
      setAudienceUsers(Array.isArray(data.users) ? data.users : []);
      setZones(Array.isArray(data.zones) ? data.zones : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load users");
      setAudienceUsers([]);
      setZones([]);
    } finally {
      setAudienceLoading(false);
    }
  };

  const selectedPresetRoles = useMemo(() => {
    const roles = new Set<string>();
    AUDIENCE_PRESETS.filter((p) => presetKeys.has(p.key)).forEach((p) =>
      p.roles.forEach((r) => roles.add(r)),
    );
    return Array.from(roles);
  }, [presetKeys]);

  /** Everyone who will be notified (same rules the server applies). */
  const audienceIds = useMemo(() => {
    const ids = new Set<number>();
    audienceUsers.forEach((u) => {
      if (
        everyone ||
        u.roles.some((r) => selectedPresetRoles.includes(r)) ||
        (u.zone_id !== null && zoneIds.has(u.zone_id))
      ) {
        ids.add(u.id);
      }
    });
    pickedIds.forEach((id) => ids.add(id));
    return ids;
  }, [audienceUsers, everyone, selectedPresetRoles, zoneIds, pickedIds]);

  const presetCount = (roles: string[]) =>
    audienceUsers.filter((u) => u.roles.some((r) => roles.includes(r))).length;

  const zoneCount = (id: number) =>
    audienceUsers.filter((u) => u.zone_id === id).length;

  const togglePreset = (key: string) =>
    setPresetKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleZone = (id: number) =>
    setZoneIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const togglePerson = (id: number) =>
    setPickedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const clearAudience = () => {
    setEveryone(false);
    setPresetKeys(new Set());
    setZoneIds(new Set());
    setPickedIds(new Set());
  };

  const filteredPeople = useMemo(() => {
    const q = peopleSearch.trim().toLowerCase();
    if (!q) return audienceUsers;
    return audienceUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.zone_name || "").toLowerCase().includes(q) ||
        u.roles.some((r) => r.toLowerCase().includes(q)),
    );
  }, [audienceUsers, peopleSearch]);

  const confirmApprove = async () => {
    if (!approving) return;
    if (audienceIds.size === 0) {
      toast.error("Choose who should be notified");
      return;
    }
    setIsSaving(true);
    try {
      await api.post(`/web/program-requests/${approving.id}/approve`, {
        audience: {
          everyone,
          roles: everyone ? [] : selectedPresetRoles,
          zone_ids: everyone ? [] : Array.from(zoneIds),
          user_ids: Array.from(pickedIds),
        },
        remarks: approveRemarks.trim() || null,
      });
      toast.success("Program created and notifications sent");
      setApproving(null);
      setSelected(null);
      fetchRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to approve request");
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
      toast.error(error?.response?.data?.message || "Failed to reject request");
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
          <h3 className="text-lg font-semibold text-theme-text">No access</h3>
          <p className="text-sm text-theme-textSecondary mt-1">
            Program requests are available to BNS, NDP, Midwives and approvers.
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

      {/* Status tabs + search */}
      <div className="bg-theme-surface border border-theme rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={`px-3.5 py-1.5 text-sm rounded-full border transition-colors ${
                statusFilter === t.value
                  ? "bg-theme-primary text-white border-theme-primary"
                  : "border-theme text-theme-textSecondary hover:text-theme-text hover:bg-theme-hover"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
          <input
            type="text"
            placeholder="Search by title, description or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${inputCls} pl-10`}
          />
        </div>
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
            <p className="text-theme-text font-medium">Failed to load requests</p>
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
                      "Location",
                      "Status",
                      "Submitted",
                      "Action",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-medium text-theme-textSecondary uppercase tracking-wider ${
                          i === 6 ? "text-right" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Inbox className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-3" />
                        <p className="text-theme-text font-medium">
                          No program requests
                        </p>
                        <p className="text-sm text-theme-textSecondary">
                          {statusFilter === "pending" && isApprover
                            ? "Nothing is waiting for your approval"
                            : isRequester
                              ? "Use “Request a Program” to submit your first one"
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
                          <p className="font-medium text-theme-text">{r.title}</p>
                          <p className="text-xs text-theme-textSecondary">
                            {r.program_type_label}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-theme-text">
                            {r.requester_name || "Unknown"}
                          </p>
                          <p className="text-xs text-theme-textSecondary">
                            {r.requester_role}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-theme-text">
                          {formatDate(r.start_date)}
                          <span className="text-theme-textSecondary"> to </span>
                          {formatDate(r.end_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-theme-textSecondary">
                          {r.location || "N/A"}
                        </td>
                        <td className="px-4 py-3">{statusBadge(r.status)}</td>
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
          footer={
            selected.status === "pending" ? (
              <div className="flex flex-wrap justify-end gap-2">
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
                      onClick={() => openApprove(selected)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                  </>
                )}
              </div>
            ) : undefined
          }
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-theme-text">
                  {selected.title}
                </h3>
                <p className="text-sm text-theme-textSecondary">
                  {selected.program_type_label} program · requested by{" "}
                  {selected.requester_name || "Unknown"} ({selected.requester_role})
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
                    {formatDate(selected.start_date)} to{" "}
                    {formatDate(selected.end_date)}
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
            </div>
            <Detail label="Description" value={selected.description} />
            <Detail label="Justification" value={selected.justification} />

            {selected.status !== "pending" && selected.status !== "cancelled" && (
              <div className="p-4 bg-theme-background border border-theme rounded-lg space-y-3">
                <Detail
                  label={
                    selected.status === "approved" ? "Approved by" : "Rejected by"
                  }
                  value={`${selected.reviewer_name || "Unknown"} · ${formatDate(
                    selected.reviewed_at,
                  )}`}
                />
                <Detail
                  label={selected.status === "approved" ? "Remarks" : "Reason"}
                  value={selected.review_remarks}
                />
                {selected.status === "approved" && (
                  <div>
                    <p className="text-xs font-medium text-theme-textSecondary uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Notified ({selected.notified_count})
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {(selected.notified_users || []).map((u) => (
                        <span
                          key={u.id}
                          className="px-2 py-1 text-xs bg-theme-surface border border-theme rounded-full text-theme-text"
                        >
                          {u.name}
                        </span>
                      ))}
                      {!!selected.notified_more && (
                        <span className="px-2 py-1 text-xs text-theme-textSecondary">
                          and {selected.notified_more} more
                        </span>
                      )}
                    </div>
                  </div>
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
          footer={
            <div className="flex justify-end gap-2">
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
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-theme-textSecondary">
              Your request goes to the Barangay Secretary, Barangay Captain and
              Super Admin. You will be notified when it is approved or rejected.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Program Title" required error={formErrors.title}>
                  <input
                    className={inputCls}
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    placeholder="e.g. Operation Timbang Plus"
                  />
                </Field>
              </div>
              <Field label="Program Type" required error={formErrors.program_type}>
                <select
                  className={inputCls}
                  value={form.program_type}
                  onChange={(e) => setField("program_type", e.target.value)}
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
                  onChange={(e) => setField("location", e.target.value)}
                  placeholder="e.g. Barangay Health Center"
                />
              </Field>
              <Field label="Start Date" required error={formErrors.start_date}>
                <input
                  type="date"
                  className={inputCls}
                  value={form.start_date}
                  onChange={(e) => setField("start_date", e.target.value)}
                />
              </Field>
              <Field label="End Date" required error={formErrors.end_date}>
                <input
                  type="date"
                  className={inputCls}
                  value={form.end_date}
                  min={form.start_date || undefined}
                  onChange={(e) => setField("end_date", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Description" error={formErrors.description}>
              <textarea
                rows={3}
                className={inputCls}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="What will the program do?"
              />
            </Field>
            <Field label="Justification" error={formErrors.justification}>
              <textarea
                rows={3}
                className={inputCls}
                value={form.justification}
                onChange={(e) => setField("justification", e.target.value)}
                placeholder="Why is this program needed?"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* ================= APPROVE + CHOOSE AUDIENCE ================= */}
      {approving && (
        <Modal
          title={`Approve: ${approving.title}`}
          onClose={() => setApproving(null)}
          wide
          footer={
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-theme-textSecondary">
                  <strong className="text-lg text-theme-text">
                    {audienceIds.size}
                  </strong>{" "}
                  {audienceIds.size === 1 ? "person" : "people"} will be notified
                </p>
                {audienceIds.size > 0 && (
                  <button
                    onClick={clearAudience}
                    className="text-xs text-theme-textSecondary hover:text-theme-text underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setApproving(null)}
                  className="px-4 py-2 border border-theme text-theme-text rounded-lg hover:bg-theme-hover"
                >
                  Back
                </button>
                <button
                  onClick={confirmApprove}
                  disabled={isSaving || audienceIds.size === 0}
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
          }
        >
          {audienceLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-theme-textSecondary">
                Approving creates the program in the Programs list. Then choose
                who receives the notification — pick as many groups as you like.
              </p>

              {/* 1. Everyone + groups */}
              <div>
                <SectionTitle
                  step={1}
                  title="Choose a group"
                  hint="Tap to select. You can combine groups."
                />

                <button
                  onClick={() => setEveryone((v) => !v)}
                  className={`w-full flex items-center gap-3 p-4 mb-3 rounded-xl border-2 text-left transition-colors ${
                    everyone
                      ? "border-theme-primary bg-theme-primary/10"
                      : "border-theme hover:bg-theme-hover"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-theme-primary/10 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-theme-text">
                      Everyone
                    </p>
                    <p className="text-xs text-theme-textSecondary">
                      All active accounts: residents, officials, staff and health
                      workers
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-theme-background border border-theme text-theme-textSecondary">
                    {audienceUsers.length}
                  </span>
                  {everyone && (
                    <CheckCircle2 className="w-5 h-5 text-theme-primary flex-shrink-0" />
                  )}
                </button>

                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${
                    everyone ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {AUDIENCE_PRESETS.map((p) => {
                    const on = presetKeys.has(p.key) || everyone;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.key}
                        onClick={() => togglePreset(p.key)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                          on
                            ? "border-theme-primary bg-theme-primary/10"
                            : "border-theme hover:bg-theme-hover"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-theme-background border border-theme flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-theme-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-theme-text">
                            {p.title}
                          </p>
                          <p className="text-xs text-theme-textSecondary truncate">
                            {p.hint}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-theme-background border border-theme text-theme-textSecondary">
                          {presetCount(p.roles)}
                        </span>
                        {on && (
                          <CheckCircle2 className="w-4 h-4 text-theme-primary flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {everyone && (
                  <p className="mt-2 text-xs text-theme-textSecondary">
                    “Everyone” already includes every group and zone below.
                  </p>
                )}
              </div>

              {/* 2. By zone */}
              {zones.length > 0 && (
                <div className={everyone ? "opacity-50 pointer-events-none" : ""}>
                  <SectionTitle
                    step={2}
                    title="Residents by zone"
                    hint="Notify the accounts of residents who live in these zones."
                  />
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button
                      onClick={() => setZoneIds(new Set(zones.map((z) => z.id)))}
                      className="text-xs text-theme-primary hover:underline"
                    >
                      Select all zones
                    </button>
                    <span className="text-xs text-theme-textSecondary">·</span>
                    <button
                      onClick={() => setZoneIds(new Set())}
                      className="text-xs text-theme-textSecondary hover:underline"
                    >
                      Clear zones
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {zones.map((z) => {
                      const on = zoneIds.has(z.id) || everyone;
                      return (
                        <button
                          key={z.id}
                          onClick={() => toggleZone(z.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            on
                              ? "bg-theme-primary text-white border-theme-primary"
                              : "border-theme text-theme-text hover:bg-theme-hover"
                          }`}
                        >
                          {z.name}
                          <span
                            className={`text-xs ${
                              on ? "text-white/80" : "text-theme-textSecondary"
                            }`}
                          >
                            {zoneCount(z.id)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Specific people */}
              <div>
                <button
                  onClick={() => setShowPeople((v) => !v)}
                  className="w-full flex items-start justify-between"
                >
                  <SectionTitle
                    step={3}
                    title="Add specific people (optional)"
                    hint={
                      pickedIds.size > 0
                        ? `${pickedIds.size} picked`
                        : "Search and tick individual users."
                    }
                  />
                  {showPeople ? (
                    <ChevronUp className="w-4 h-4 text-theme-textSecondary mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-theme-textSecondary mt-1" />
                  )}
                </button>

                {showPeople && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                      <input
                        className={`${inputCls} pl-10`}
                        placeholder="Search name, email, role or zone..."
                        value={peopleSearch}
                        onChange={(e) => setPeopleSearch(e.target.value)}
                      />
                    </div>
                    <div className="border border-theme rounded-lg max-h-64 overflow-y-auto divide-y divide-theme">
                      {filteredPeople.length === 0 ? (
                        <p className="p-6 text-center text-sm text-theme-textSecondary">
                          No users match your search
                        </p>
                      ) : (
                        filteredPeople.map((u) => {
                          const covered =
                            audienceIds.has(u.id) && !pickedIds.has(u.id);
                          return (
                            <label
                              key={u.id}
                              className="flex items-center gap-3 px-3 py-2.5 hover:bg-theme-hover cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={pickedIds.has(u.id) || covered}
                                disabled={covered}
                                onChange={() => togglePerson(u.id)}
                                className="w-4 h-4"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-theme-text truncate">
                                  {u.name}
                                </p>
                                <p className="text-xs text-theme-textSecondary truncate">
                                  {u.email}
                                  {u.zone_name ? ` · ${u.zone_name}` : ""}
                                </p>
                              </div>
                              {covered ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary">
                                  Already included
                                </span>
                              ) : (
                                <div className="hidden sm:flex flex-wrap justify-end gap-1">
                                  {u.roles.slice(0, 2).map((r) => (
                                    <span
                                      key={r}
                                      className="px-2 py-0.5 text-[11px] bg-theme-background border border-theme rounded-full text-theme-textSecondary"
                                    >
                                      {r}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* remarks */}
              <Field
                label="Remarks (optional)"
                hint="The requester will see this note."
              >
                <textarea
                  rows={2}
                  className={inputCls}
                  value={approveRemarks}
                  onChange={(e) => setApproveRemarks(e.target.value)}
                />
              </Field>
            </div>
          )}
        </Modal>
      )}

      {/* ================= REJECT ================= */}
      {rejecting && (
        <Modal
          title={`Reject: ${rejecting.title}`}
          onClose={() => setRejecting(null)}
          footer={
            <div className="flex justify-end gap-2">
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
          }
        >
          <Field label="Reason for rejecting" required>
            <textarea
              rows={4}
              className={inputCls}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="The requester will see this reason"
            />
          </Field>
        </Modal>
      )}
    </div>
  );
}