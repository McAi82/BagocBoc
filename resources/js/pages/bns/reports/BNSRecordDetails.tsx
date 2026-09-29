// resources/js/pages/bns/reports/BNSRecordDetails.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    FileText,
    User,
    Home,
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    Loader2,
    AlertCircle,
    Printer,
    Download,
    Users,
    Activity,
    Droplet,
    Baby,
    Heart,
    User as UserIcon,
    MapPin,
    Phone,
    Briefcase,
    GraduationCap,
    Ruler,
    Weight,
    Thermometer,
    Stethoscope,
    Pill,
    CalendarClock,
    ClipboardList,
    Info,
    TrendingUp,
    Save,
    FileEdit,
    Trash2,
    PlusCircle,
} from "lucide-react";
import { api } from "../../../api/apiClient";
import { formatDate } from "../../../utils/format";
import toast from "react-hot-toast";

/* ============================================================
   ACTION META — describes what the activity was
   ============================================================ */

const ACTION_META: Record<
    string,
    { label: string; icon: any; color: string; bg: string }
> = {
    "Created Residents": {
        label: "New Resident Registration",
        icon: PlusCircle,
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-100 dark:bg-green-900/30",
    },
    "Updated Residents": {
        label: "Resident Updated",
        icon: FileEdit,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    "Deleted Residents": {
        label: "Resident Deleted",
        icon: Trash2,
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-100 dark:bg-red-900/30",
    },
    "Created Household": {
        label: "New Household",
        icon: Home,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    "Updated Household": {
        label: "Household Updated",
        icon: FileEdit,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-100 dark:bg-amber-900/30",
    },
};

const getActionMeta = (action?: string) => {
    if (!action)
        return {
            label: "Record",
            icon: FileText,
            color: "text-theme-primary",
            bg: "bg-theme-primary/10",
        };
    return (
        ACTION_META[action] || {
            label: action,
            icon: FileText,
            color: "text-theme-primary",
            bg: "bg-theme-primary/10",
        }
    );
};

/* ============================================================
   HELPERS
   ============================================================ */

const getStatusMeta = (status: string) => {
    switch (status?.toLowerCase()) {
        case "approved":
            return {
                label: "Approved",
                icon: CheckCircle,
                class:
                    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
            };
        case "saved":
            return {
                label: "Saved",
                icon: Save,
                class:
                    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
            };
        case "pending":
            return {
                label: "Pending",
                icon: Clock,
                class:
                    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
            };
        case "rejected":
            return {
                label: "Rejected",
                icon: XCircle,
                class:
                    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
            };
        case "submitted":
            return {
                label: "Submitted",
                icon: CheckCircle,
                class:
                    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
            };
        default:
            return {
                label: status || "Unknown",
                icon: Info,
                class:
                    "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600",
            };
    }
};

const safe = (v: any, fallback = "—") => {
    if (v === null || v === undefined || v === "") return fallback;
    return String(v);
};

/* ============================================================
   SMALL UI
   ============================================================ */

function InfoRow({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: React.ReactNode;
    icon?: React.ElementType;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 border-b border-theme last:border-0">
            <div className="flex items-center gap-2 text-sm text-theme-textSecondary">
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                <span>{label}</span>
            </div>
            <div className="text-sm font-medium text-theme-text text-right break-words max-w-[60%]">
                {value}
            </div>
        </div>
    );
}

function SectionCard({
    title,
    icon: Icon,
    children,
}: {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-theme-surface border border-theme rounded-xl overflow-hidden">
            <div className="px-6 py-3 border-b border-theme bg-theme-background flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4 text-theme-primary" />}
                <h3 className="font-semibold text-theme-text text-sm uppercase tracking-wide">
                    {title}
                </h3>
            </div>
            <div className="px-6 py-2">{children}</div>
        </div>
    );
}

/* ============================================================
   RESIDENT PANEL — renders the embedded Resident payload
   ============================================================ */

function ResidentPanel({ resident }: { resident: any }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Personal Information" icon={User}>
                <InfoRow
                    label="Full Name"
                    value={
                        resident.full_name ||
                        `${safe(resident.first_name, "")} ${safe(resident.middle_name, "")} ${safe(resident.last_name, "")} ${safe(resident.suffix, "")}`
                            .replace(/\s+/g, " ")
                            .trim() ||
                        "—"
                    }
                />
                <InfoRow label="Age" value={safe(resident.age)} />
                <InfoRow label="Gender" value={safe(resident.gender)} />
                <InfoRow
                    label="Birth Date"
                    value={
                        resident.birth_date ? formatDate(resident.birth_date) : "—"
                    }
                    icon={Calendar}
                />
                <InfoRow
                    label="Place of Birth"
                    value={safe(resident.place_of_birth)}
                    icon={MapPin}
                />
                <InfoRow
                    label="Civil Status"
                    value={safe(resident.civil_status)}
                    icon={Heart}
                />
                <InfoRow
                    label="Citizenship"
                    value={safe(resident.citizenship)}
                />
                <InfoRow
                    label="Voter Status"
                    value={safe(resident.voter_status)}
                />
            </SectionCard>

            <SectionCard title="Contact & Background" icon={Phone}>
                <InfoRow
                    label="Phone Number"
                    value={safe(resident.phone_number)}
                    icon={Phone}
                />
                <InfoRow
                    label="Occupation"
                    value={safe(resident.occupation)}
                    icon={Briefcase}
                />
                <InfoRow
                    label="Monthly Income"
                    value={
                        resident.monthly_income
                            ? `₱${Number(resident.monthly_income).toLocaleString()}`
                            : "—"
                    }
                />
                <InfoRow
                    label="Education"
                    value={safe(resident.education_attainment)}
                    icon={GraduationCap}
                />
                <InfoRow
                    label="Status"
                    value={
                        <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${resident.status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                }`}
                        >
                            {safe(resident.status, "active")}
                        </span>
                    }
                />
                <InfoRow
                    label="Registered"
                    value={
                        resident.created_at ? formatDate(resident.created_at) : "—"
                    }
                    icon={Calendar}
                />
                <InfoRow
                    label="Last Updated"
                    value={
                        resident.updated_at ? formatDate(resident.updated_at) : "—"
                    }
                    icon={Calendar}
                />
            </SectionCard>
        </div>
    );
}

/* ============================================================
   GENERIC PANEL — for any payload shape we don't recognize
   ============================================================ */

function GenericPayloadPanel({ payload }: { payload: any }) {
    const entries = Object.entries(payload).filter(
        ([, v]) => v !== null && v !== undefined && v !== "",
    );

    return (
        <SectionCard title="Record Details" icon={ClipboardList}>
            {entries.map(([key, value]) => {
                const label = key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                let display: React.ReactNode = "—";
                if (typeof value === "boolean") display = value ? "Yes" : "No";
                else if (value && typeof value === "object")
                    display = JSON.stringify(value);
                else display = String(value);
                return <InfoRow key={key} label={label} value={display} />;
            })}
        </SectionCard>
    );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function BNSRecordDetails() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [record, setRecord] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        if (id) fetchRecord();
    }, [id]);

    const fetchRecord = async () => {
        setIsLoading(true);
        setIsError(false);
        try {
            const response = await api.get(`/web/bns/records/${id}`);
            const data = response.data?.data || response.data;
            setRecord(data);
        } catch (error) {
            console.error("Error fetching BNS record:", error);
            setIsError(true);
            toast.error("Failed to load record");
        } finally {
            setIsLoading(false);
        }
    };

    const actionMeta = useMemo(
        () => getActionMeta(record?.action),
        [record?.action],
    );
    const statusMeta = useMemo(
        () => getStatusMeta(record?.status),
        [record?.status],
    );
    const ActionIcon = actionMeta.icon;

    /* ---------- LOADING ---------- */
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
                    <p className="text-sm text-theme-textSecondary">Loading record...</p>
                </div>
            </div>
        );
    }

    /* ---------- ERROR ---------- */
    if (isError || !record) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-theme-text">
                    Failed to load record
                </h3>
                <button
                    onClick={() => navigate("/barangay-bagocboc/bns/reports")}
                    className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
                >
                    Back to Records
                </button>
            </div>
        );
    }

    /* ---------- PAYLOAD DETECTION ---------- */
    // The API returns an activity log wrapper:
    //   { id, type, action, details, status, submitted_by, submitted_at, data }
    // The real entity is inside `data`.
    const payload = record.data || record.payload || record;

    // Figure out what kind of entity the payload is
    const payloadType: "resident" | "household" | "unknown" = (() => {
        if (!payload) return "unknown";
        if (payload.first_name && payload.last_name) return "resident";
        if (payload.household_number || payload.household_tracking_number)
            return "household";
        return "unknown";
    })();

    return (
        <div className="space-y-6 pb-10">
            {/* ============================================ */}
            {/* HEADER */}
            {/* ============================================ */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/barangay-bagocboc/bns/reports")}
                        className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-theme-textSecondary" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${actionMeta.bg}`}>
                            <ActionIcon className={`w-6 h-6 ${actionMeta.color}`} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-theme-text">
                                {actionMeta.label}
                            </h1>
                            <p className="text-sm text-theme-textSecondary">
                                Record ID #{record.id}
                                {record.details && ` • ${record.details}`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 no-print">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors text-sm"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            {/* ============================================ */}
            {/* STATUS BANNER */}
            {/* ============================================ */}
            <div className="bg-theme-surface border border-theme rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${statusMeta.class}`}
                        >
                            <statusMeta.icon className="w-4 h-4" />
                            {statusMeta.label}
                        </span>
                        {record.submitted_at && (
                            <span className="text-sm text-theme-textSecondary">
                                {formatDate(record.submitted_at)}
                            </span>
                        )}
                        {record.submitted_by && (
                            <span className="text-sm text-theme-textSecondary">
                                • by {record.submitted_by}
                            </span>
                        )}
                    </div>
                </div>

                {record.details && (
                    <p className="mt-3 text-sm text-theme-text border-t border-theme pt-3">
                        {record.details}
                    </p>
                )}
            </div>

            {/* ============================================ */}
            {/* ACTIVITY LOG SUMMARY */}
            {/* ============================================ */}
            <SectionCard title="Activity Information" icon={ClipboardList}>
                <InfoRow
                    label="Activity Type"
                    value={safe(record.action, "—")}
                />
                <InfoRow
                    label="Category"
                    value={safe(record.type, "—")}
                />
                <InfoRow
                    label="Details"
                    value={safe(record.details, "—")}
                />
                <InfoRow
                    label="Submitted By"
                    value={safe(record.submitted_by, "—")}
                />
                <InfoRow
                    label="Submitted At"
                    value={
                        record.submitted_at ? formatDate(record.submitted_at) : "—"
                    }
                    icon={Calendar}
                />
                <InfoRow
                    label="Status"
                    value={safe(record.status, "—")}
                />
            </SectionCard>

            {/* ============================================ */}
            {/* PAYLOAD — the actual entity */}
            {/* ============================================ */}
            {payloadType === "resident" && <ResidentPanel resident={payload} />}
            {payloadType === "household" && <GenericPayloadPanel payload={payload} />}
            {payloadType === "unknown" && <GenericPayloadPanel payload={payload} />}

            {/* ============================================ */}
            {/* TIMELINE */}
            {/* ============================================ */}
            <SectionCard title="Timeline" icon={TrendingUp}>
                <div className="py-3 space-y-4">
                    {payload.created_at && (
                        <TimelineItem
                            label="Record Created"
                            date={payload.created_at}
                            color="bg-theme-primary"
                        />
                    )}
                    {record.submitted_at && (
                        <TimelineItem
                            label={`Activity Logged: ${record.action || "—"}`}
                            date={record.submitted_at}
                            color="bg-blue-500"
                        />
                    )}
                    {payload.updated_at &&
                        payload.updated_at !== payload.created_at && (
                            <TimelineItem
                                label="Last Updated"
                                date={payload.updated_at}
                                color="bg-amber-500"
                            />
                        )}
                </div>
            </SectionCard>

        </div>
    );
}

/* ============================================================
   TIMELINE ITEM
   ============================================================ */

function TimelineItem({
    label,
    date,
    color,
}: {
    label: string;
    date: string;
    color: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1.5">
                <span className={`w-3 h-3 rounded-full ${color}`} />
                <span className="w-px flex-1 bg-theme-border my-1" />
            </div>
            <div className="pb-2">
                <p className="text-sm font-medium text-theme-text">{label}</p>
                <p className="text-xs text-theme-textSecondary">
                    {formatDate(date)}
                </p>
            </div>
        </div>
    );
}