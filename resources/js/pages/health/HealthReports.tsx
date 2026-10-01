// src/pages/health/HealthReports.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft, Printer, RefreshCw, Loader2, AlertCircle,
    Users, Heart, Baby, Droplet, User as UserIcon, Activity,
    Clock, TrendingUp, BarChart3, ShieldAlert, Calendar,
} from "lucide-react";
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
    CartesianGrid, Legend, BarChart, Bar,
} from "recharts";
import { api } from "../../api/apiClient";
import { useAuthStore } from "../../stores/authStore";
import ReportFilters, {
    ReportFilterValue, getPresetRange,
} from "../../components/features/ReportFilters";
import { printReport, esc } from "../../utils/printReport";
import toast from "react-hot-toast";

type Scope = "midwife" | "ndp";

export default function HealthReports() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Resolve scope from user's roles; allow manual switch for Super Admin
    const userRoles = user?.roles?.map((r) => r.name) || [];
    const isNdp = userRoles.includes("Nurse Deployment Program");
    const isMidwife = userRoles.includes("Midwife");
    const isSuperAdmin = userRoles.includes("Super Admin");

    const defaultScope: Scope = isNdp && !isMidwife ? "ndp" : "midwife";
    const [scope, setScope] = useState<Scope>(defaultScope);

    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    const [range, setRange] = useState<ReportFilterValue>({
        preset: "month",
        ...getPresetRange("month"),
    });

    const fetchData = async () => {
        setIsLoading(true);
        setIsError(false);
        try {
            const params: any = { scope, preset: range.preset };
            if (range.preset === "custom") {
                params.from = range.from;
                params.to = range.to;
            }
            const res = await api.get("/web/health/reports", { params });
            setData(res.data?.data || null);
        } catch (e) {
            console.error(e);
            setIsError(true);
            toast.error("Failed to load reports");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [scope, range.preset, range.from, range.to]);

    const periodLabel = useMemo(() => {
        if (range.preset === "all") return "All Time";
        if (range.from && range.to) return `${range.from} to ${range.to}`;
        return range.preset;
    }, [range]);

    const handlePrint = () => {
        if (!data) return;

        const rows: { field: string; value: string }[] = [];

        // Stats
        rows.push({ field: "— Overview —", value: "" });
        Object.entries(data.stats || {}).forEach(([k, v]) => {
            rows.push({
                field: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                value: String(v),
            });
        });

        // Midwife sections
        if (scope === "midwife") {
            rows.push({ field: "— Pregnant Patients —", value: "" });
            (data.pregnant || []).forEach((p: any) =>
                rows.push({
                    field: p.name,
                    value: `Age ${p.age ?? "—"} • ${p.risk_level || "low"} risk • EDD ${p.expected_delivery_date || "—"}`,
                }),
            );

            rows.push({ field: "— Lactating Mothers —", value: "" });
            (data.lactating || []).forEach((l: any) =>
                rows.push({
                    field: l.name,
                    value: `Age ${l.age ?? "—"} • ${l.breastfeeding_status || "—"} • Infant ${l.infant_age ?? "—"} mo`,
                }),
            );

            rows.push({ field: "— Infants (< 1 year) —", value: "" });
            (data.infants || []).forEach((i: any) =>
                rows.push({
                    field: i.name,
                    value: `${i.age_months ?? "—"} mo • ${i.current_nutritional_status || "—"}`,
                }),
            );
        } else {
            // NDP sections
            const cohorts = ["senior", "adult", "teen", "children"];
            cohorts.forEach((c) => {
                rows.push({ field: `— ${c.charAt(0).toUpperCase() + c.slice(1)} —`, value: "" });
                (data[c] || []).forEach((p: any) =>
                    rows.push({
                        field: p.name,
                        value: `Age ${p.age ?? "—"} • ${p.patient_type || "—"} • ${p.total_checkups || 0} checkups`,
                    }),
                );
            });
        }

        const ok = printReport({
            title: scope === "midwife" ? "Midwife Report" : "NDP Report",
            subtitle: scope === "midwife"
                ? "Maternal & Infant Health"
                : "General Population Health",
            periodLabel,
            columns: [
                { key: "field", label: "Category", width: "40%" },
                { key: "value", label: "Value" },
            ],
            rows,
            summary: Object.entries(data.stats || {})
                .slice(0, 4)
                .map(([k, v]) => ({
                    label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                    value: v as any,
                })),
            signatories: {
                left: {
                    name: scope === "midwife" ? "Attending Midwife" : "NDP Nurse",
                    title: scope === "midwife" ? "Midwife" : "Nurse Deployment Program",
                },
                right: { name: "Marcos P. Gonzales", title: "Punong Barangay" },
            },
        });

        if (!ok) toast.error("Please allow popups to print the report");
    };

    /* ============================================================
       RENDER
       ============================================================ */

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
                    <p className="text-sm text-theme-textSecondary">Loading reports...</p>
                </div>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-theme-text">
                        Failed to Load Reports
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
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/barangay-bagocboc/health")}
                        className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-theme-textSecondary" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-theme-text">
                            {scope === "midwife" ? "Midwife Reports" : "NDP Reports"}
                        </h1>
                        <p className="text-sm text-theme-textSecondary mt-1">
                            {scope === "midwife"
                                ? "Maternal & infant health analytics"
                                : "General population health analytics"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                    >
                        <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                    >
                        <Printer className="w-4 h-4 text-theme-textSecondary" /> Print
                    </button>
                </div>
            </div>

            {/* Scope toggle (only for Super Admin) */}
            {isSuperAdmin && (
                <div className="flex gap-2">
                    <button
                        onClick={() => setScope("midwife")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${scope === "midwife"
                                ? "bg-theme-primary text-white"
                                : "bg-theme-surface text-theme-textSecondary border border-theme hover:bg-theme-hover"
                            }`}
                    >
                        Midwife Report
                    </button>
                    <button
                        onClick={() => setScope("ndp")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${scope === "ndp"
                                ? "bg-theme-primary text-white"
                                : "bg-theme-surface text-theme-textSecondary border border-theme hover:bg-theme-hover"
                            }`}
                    >
                        NDP Report
                    </button>
                </div>
            )}

            {/* Filters */}
            <ReportFilters value={range} onChange={setRange} />

            {/* Content */}
            {scope === "midwife" ? (
                <MidwifeReport data={data} />
            ) : (
                <NdpReport data={data} />
            )}
        </div>
    );
}

/* ============================================================
   MIDWIFE REPORT VIEW
   ============================================================ */

function MidwifeReport({ data }: { data: any }) {
    return (
        <div className="space-y-6">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <Tile label="Pregnant" value={data.stats.pregnant} icon={Heart} color="pink" />
                <Tile label="Lactating" value={data.stats.lactating} icon={Droplet} color="purple" />
                <Tile label="Infants (<1 yr)" value={data.stats.infants} icon={Baby} color="green" />
                <Tile label="Today's Checkups" value={data.stats.today_checkups} icon={Calendar} color="blue" />
                <Tile label="Prenatal Checkups" value={data.stats.prenatal_checkups} icon={Activity} color="amber" />
                <Tile label="Postpartum Checkups" value={data.stats.postpartum_checkups} icon={Activity} color="red" />
            </div>

            {/* Pregnant table */}
            <ReportTable
                title="Pregnant Patients"
                subtitle={`${data.pregnant?.length || 0} record(s)`}
                icon={Heart}
                rows={data.pregnant || []}
                columns={[
                    { key: "name", label: "Name" },
                    { key: "age", label: "Age", align: "right" },
                    { key: "gestational_age", label: "Gest. Age", align: "right", suffix: " wks" },
                    { key: "gravida", label: "Gravida", align: "right" },
                    { key: "para", label: "Para", align: "right" },
                    { key: "expected_delivery_date", label: "EDD" },
                    { key: "risk_level", label: "Risk" },
                ]}
            />

            {/* Lactating table */}
            <ReportTable
                title="Lactating Mothers"
                subtitle={`${data.lactating?.length || 0} record(s)`}
                icon={Droplet}
                rows={data.lactating || []}
                columns={[
                    { key: "name", label: "Name" },
                    { key: "age", label: "Age", align: "right" },
                    { key: "breastfeeding_status", label: "Status" },
                    { key: "infant_age", label: "Infant Age", align: "right", suffix: " mo" },
                    { key: "feeding_method", label: "Feeding" },
                    { key: "infant_weight", label: "Infant Wt", align: "right", suffix: " kg" },
                ]}
            />

            {/* Infants table */}
            <ReportTable
                title="Infants (Under 1 Year)"
                subtitle={`${data.infants?.length || 0} record(s)`}
                icon={Baby}
                rows={data.infants || []}
                columns={[
                    { key: "name", label: "Name" },
                    { key: "gender", label: "Gender" },
                    { key: "age_months", label: "Age", align: "right", suffix: " mo" },
                    { key: "birth_weight", label: "Birth Wt", align: "right", suffix: " kg" },
                    { key: "current_weight", label: "Current Wt", align: "right", suffix: " kg" },
                    { key: "current_nutritional_status", label: "Nutrition" },
                ]}
            />

            {/* Monthly trend */}
            <div className="bg-theme-surface rounded-xl border border-theme shadow-sm">
                <SectionHeader
                    icon={TrendingUp}
                    title="Checkup Trend"
                    subtitle="Last 12 months — prenatal vs postpartum"
                />
                <div className="p-4 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.monthly_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="prenatal"
                                name="Prenatal"
                                stroke="#ec4899"
                                strokeWidth={2}
                            />
                            <Line
                                type="monotone"
                                dataKey="postpartum"
                                name="Postpartum"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Risk flags */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RiskList
                    title="High-Risk Pregnancies"
                    items={data.risk_flags?.high_risk_pregnancies || []}
                    color="pink"
                />
                <RiskList
                    title="Malnourished Infants"
                    items={data.risk_flags?.malnourished_infants || []}
                    color="red"
                />
            </div>
        </div>
    );
}

/* ============================================================
   NDP REPORT VIEW
   ============================================================ */

function NdpReport({ data }: { data: any }) {
    const cohorts = [
        { key: "senior", label: "Senior Citizens (60+)", icon: UserIcon, color: "amber" },
        { key: "adult", label: "Adults (19–59)", icon: Users, color: "blue" },
        { key: "teen", label: "Teens (13–18)", icon: Users, color: "purple" },
        { key: "children", label: "Children (1–12)", icon: Baby, color: "green" },
    ];

    const ageChartData = Object.entries(data.age_groups?.groups || {}).map(
        ([k, v]) => ({ age: k, total: v }),
    );

    return (
        <div className="space-y-6">
            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                <Tile label="Seniors" value={data.stats.senior} icon={UserIcon} color="amber" />
                <Tile label="Adults" value={data.stats.adult} icon={Users} color="blue" />
                <Tile label="Teens" value={data.stats.teen} icon={Users} color="purple" />
                <Tile label="Children" value={data.stats.children} icon={Baby} color="green" />
                <Tile label="Total Checkups" value={data.stats.total_checkups} icon={Activity} color="emerald" />
                <Tile label="Today's Checkups" value={data.stats.today_checkups} icon={Calendar} color="sky" />
                <Tile label="Pending Follow-ups" value={data.stats.pending_followups} icon={Clock} color="red" />
            </div>

            {/* Age distribution chart */}
            <div className="bg-theme-surface rounded-xl border border-theme shadow-sm">
                <SectionHeader
                    icon={BarChart3}
                    title="Age Distribution"
                    subtitle={`${data.age_groups?.total || 0} total patients`}
                />
                <div className="p-4 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ageChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="age" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Cohort tables */}
            {cohorts.map((c) => (
                <ReportTable
                    key={c.key}
                    title={c.label}
                    subtitle={`${data[c.key]?.length || 0} record(s)`}
                    icon={c.icon}
                    rows={data[c.key] || []}
                    columns={[
                        { key: "name", label: "Name" },
                        { key: "age", label: "Age", align: "right" },
                        { key: "gender", label: "Gender" },
                        { key: "patient_type", label: "Type" },
                        { key: "contact", label: "Contact" },
                        { key: "total_checkups", label: "Checkups", align: "right" },
                        { key: "last_checkup", label: "Last Visit" },
                    ]}
                />
            ))}

            {/* Monthly trend */}
            <div className="bg-theme-surface rounded-xl border border-theme shadow-sm">
                <SectionHeader
                    icon={TrendingUp}
                    title="Checkup Trend"
                    subtitle="Last 12 months"
                />
                <div className="p-4 h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.monthly_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="total"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Risk flags */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <RiskList
                    title="Seniors at High Falls Risk"
                    items={data.risk_flags?.falls_risk_seniors || []}
                    color="amber"
                />
                <RiskList
                    title="Critical NCD Cases"
                    items={data.risk_flags?.critical_ncd || []}
                    color="red"
                />
                <RiskList
                    title="Malnourished Children"
                    items={data.risk_flags?.malnourished_children || []}
                    color="purple"
                />
            </div>
        </div>
    );
}

/* ============================================================
   SHARED SUB-COMPONENTS
   ============================================================ */

function SectionHeader({
    icon: Icon,
    title,
    subtitle,
}: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
}) {
    return (
        <div className="px-6 py-4 border-b border-theme bg-theme-background/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-theme-primary/10">
                <Icon className="w-4 h-4 text-theme-primary" />
            </div>
            <div>
                <h2 className="font-semibold text-theme-text">{title}</h2>
                {subtitle && (
                    <p className="text-xs text-theme-textSecondary">{subtitle}</p>
                )}
            </div>
        </div>
    );
}

function Tile({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
}) {
    const map: Record<string, string> = {
        pink: "from-pink-500 to-pink-600",
        purple: "from-purple-500 to-purple-600",
        green: "from-emerald-500 to-emerald-600",
        blue: "from-blue-500 to-blue-600",
        amber: "from-amber-500 to-amber-600",
        red: "from-red-500 to-red-600",
        emerald: "from-teal-500 to-teal-600",
        sky: "from-sky-500 to-sky-600",
    };
    return (
        <div
            className={`bg-gradient-to-br ${map[color] || map.blue} rounded-xl p-4 text-white shadow-sm`}
        >
            <Icon className="w-5 h-5 text-white/80" />
            <p className="text-2xl font-bold mt-2">{value}</p>
            <p className="text-xs text-white/90 mt-0.5 font-medium">{label}</p>
        </div>
    );
}

interface ColumnDef {
    key: string;
    label: string;
    align?: "left" | "right" | "center";
    suffix?: string;
}

function ReportTable({
    title,
    subtitle,
    icon: Icon,
    rows,
    columns,
}: {
    title: string;
    subtitle?: string;
    icon: React.ElementType;
    rows: any[];
    columns: ColumnDef[];
}) {
    return (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
            <SectionHeader icon={Icon} title={title} subtitle={subtitle} />
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-theme-background border-b border-theme">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">
                                #
                            </th>
                            {columns.map((c) => (
                                <th
                                    key={c.key}
                                    className={`px-4 py-3 text-xs font-semibold text-theme-textSecondary uppercase tracking-wider text-${c.align || "left"}`}
                                >
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-theme">
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + 1}
                                    className="px-4 py-10 text-center text-theme-textSecondary text-sm"
                                >
                                    No records found
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, i) => (
                                <tr
                                    key={row.id || i}
                                    className="hover:bg-theme-hover transition-colors"
                                >
                                    <td className="px-4 py-3 text-xs font-mono text-theme-textSecondary">
                                        {i + 1}
                                    </td>
                                    {columns.map((c) => {
                                        const value = row[c.key];
                                        return (
                                            <td
                                                key={c.key}
                                                className={`px-4 py-3 text-sm text-theme-text text-${c.align || "left"}`}
                                            >
                                                {value !== null && value !== undefined && value !== ""
                                                    ? `${value}${c.suffix || ""}`
                                                    : "—"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RiskList({
    title,
    items,
    color,
}: {
    title: string;
    items: any[];
    color: string;
}) {
    const map: Record<string, string> = {
        pink: "border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-900/10",
        red: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10",
        amber: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10",
        purple: "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10",
    };
    return (
        <div className={`rounded-xl border ${map[color] || map.red} p-4`}>
            <h3 className="font-semibold text-theme-text mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    {title}
                </span>
                <span className="text-xs font-normal text-theme-textSecondary">
                    {items.length} case{items.length !== 1 ? "s" : ""}
                </span>
            </h3>
            {items.length === 0 ? (
                <p className="text-sm text-theme-textSecondary py-2">
                    No cases flagged — all clear ✅
                </p>
            ) : (
                <ul className="space-y-2 max-h-52 overflow-y-auto">
                    {items.map((item, i) => (
                        <li
                            key={i}
                            className="text-sm bg-theme-surface rounded-lg p-2.5 border border-theme"
                        >
                            <p className="font-medium text-theme-text truncate">
                                {item.name}
                            </p>
                            <p className="text-xs text-theme-textSecondary truncate">
                                {item.detail}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}