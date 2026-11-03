// src/pages/reports/OverallReports.tsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Users,
    Home,
    PhilippinePeso,
    FileCheck,
    FileSignature,
    Calendar,
    Heart,
    ShieldCheck,
    AlertTriangle,
    RefreshCw,
    FileDown,
    FileSpreadsheet,
    Loader2,
    AlertCircle,
    Inbox,
    Filter,
    BarChart3,
    Info,
} from "lucide-react";
import { Pie, Column, Line } from "@ant-design/plots";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import { api } from "../../api/apiClient";
import { useThemeStore } from "../../stores/themeStore";

/* ============================================================
   TYPES
   ============================================================ */

type Dist = { label: string; value: number; count?: number }[];

interface Monthly {
    month: string;
    payments: number;
    tax: number;
    total: number;
}

interface OverallReport {
    meta: {
        generated_at: string;
        generated_by: string;
        filters: {
            date_from: string | null;
            date_to: string | null;
            zone_id: number | null;
            zone_name: string | null;
        };
        notes: string[];
        section_errors: string[];
    };
    summary: Record<string, number>;
    population: {
        residents: any;
        households: any;
        zones: {
            zone_id: number;
            zone_number: number;
            zone_name: string;
            households: number;
            residents: number;
        }[];
    };
    services: { certifications: any; clearances: any; frontdesk: any };
    finance: any;
    health: any;
    system: any;
}

interface ReportTable {
    section: string;
    title: string;
    columns: string[];
    rows: (string | number)[][];
}

type TabKey =
    | "overview"
    | "population"
    | "services"
    | "finance"
    | "health"
    | "system";

const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "population", label: "Population" },
    { key: "services", label: "Services" },
    { key: "finance", label: "Finance" },
    { key: "health", label: "Health" },
    { key: "system", label: "System" },
];

/* ============================================================
   HELPERS
   ============================================================ */

const humanize = (s: string) =>
    String(s ?? "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

const num = (n: any) => Number(n || 0).toLocaleString("en-PH");

const peso = (n: any) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(Number(n || 0));

// jsPDF's built-in fonts cannot render the ₱ glyph
const pesoPdf = (n: any) =>
    `PHP ${Number(n || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

// Zone names may already include the number (e.g. "Zone 1 - Poblacion")
const zoneLabel = (num: number | string | null | undefined, name: string) =>
    /^zone\b/i.test(name || "") || !num ? name : `Zone ${num} - ${name}`;

const toDateInput = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const pct = (value: number, total: number) =>
    total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0%";

const sumDist = (d?: Dist) => (d || []).reduce((s, x) => s + (x.value || 0), 0);

const humanDist = (d?: Dist): Dist =>
    (d || []).map((x) => ({ ...x, label: humanize(x.label) }));

/* ============================================================
   SMALL UI PIECES
   ============================================================ */

function StatCard({
    icon: Icon,
    label,
    value,
    hint,
    color = "text-theme-primary",
    bg = "bg-theme-primary/10",
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    hint?: string;
    color?: string;
    bg?: string;
}) {
    return (
        <div className="bg-theme-surface border border-theme rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                        {label}
                    </p>
                    <p className="text-2xl font-bold text-theme-text mt-1 truncate">
                        {value}
                    </p>
                    {hint && (
                        <p className="text-xs text-theme-textSecondary mt-1">
                            {hint}
                        </p>
                    )}
                </div>
                <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}
                >
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
            </div>
        </div>
    );
}

function Card({
    title,
    children,
    className = "",
}: {
    title: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`bg-theme-surface border border-theme rounded-xl p-5 ${className}`}
        >
            <h3 className="text-sm font-semibold text-theme-text mb-4">
                {title}
            </h3>
            {children}
        </div>
    );
}

function Empty({ label = "No data for this selection" }: { label?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-theme-textSecondary">
            <Inbox className="w-8 h-8 opacity-40 mb-2" />
            <p className="text-sm">{label}</p>
        </div>
    );
}

function DistTable({
    data,
    valueLabel = "Count",
    money = false,
}: {
    data: Dist;
    valueLabel?: string;
    money?: boolean;
}) {
    const total = sumDist(data);
    if (!data.length) return <Empty />;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-theme text-xs text-theme-textSecondary uppercase tracking-wider">
                        <th className="py-2 text-left font-medium">Category</th>
                        <th className="py-2 text-right font-medium">
                            {valueLabel}
                        </th>
                        <th className="py-2 text-right font-medium">Share</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                    {data.map((d) => (
                        <tr key={d.label}>
                            <td className="py-2 text-theme-text">{d.label}</td>
                            <td className="py-2 text-right text-theme-text font-medium">
                                {money ? peso(d.value) : num(d.value)}
                            </td>
                            <td className="py-2 text-right text-theme-textSecondary">
                                {pct(d.value, total)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function OverallReports() {
    const { mode } = useThemeStore();
    const chartTheme = mode === "dark" ? "dark" : "light";
    const axisLabelStyle = { fontSize: 11, fill: "#64748b" };

    const [report, setReport] = useState<OverallReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [tab, setTab] = useState<TabKey>("overview");

    const [zones, setZones] = useState<any[]>([]);
    const [draft, setDraft] = useState({
        date_from: "",
        date_to: "",
        zone_id: "",
    });
    const [applied, setApplied] = useState({
        date_from: "",
        date_to: "",
        zone_id: "",
    });

    /* ---------- data ---------- */

    const fetchReport = useCallback(async (filters: typeof applied) => {
        setIsLoading(true);
        setIsError(false);
        try {
            const params: Record<string, string> = {};
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;
            if (filters.zone_id) params.zone_id = filters.zone_id;

            const res = await api.get("/web/overall-reports", { params });
            setReport(res.data?.data ?? res.data);
        } catch (error: any) {
            console.error("Error fetching overall report:", error);
            setIsError(true);
            toast.error(
                error?.response?.data?.message ||
                    "Failed to load overall report",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReport(applied);
    }, [applied, fetchReport]);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get("/web/barangay-zones");
                const d = res.data?.data?.data ?? res.data?.data ?? res.data;
                setZones(Array.isArray(d) ? d : []);
            } catch {
                setZones([]);
            }
        })();
    }, []);

    const applyFilters = () => {
        if (
            draft.date_from &&
            draft.date_to &&
            draft.date_to < draft.date_from
        ) {
            toast.error("'To' date must be on or after 'From' date");
            return;
        }
        setApplied({ ...draft });
    };

    const resetFilters = () => {
        const empty = { date_from: "", date_to: "", zone_id: "" };
        setDraft(empty);
        setApplied(empty);
    };

    const setPreset = (preset: "month" | "quarter" | "year") => {
        const now = new Date();
        let from: Date;
        if (preset === "month")
            from = new Date(now.getFullYear(), now.getMonth(), 1);
        else if (preset === "quarter")
            from = new Date(
                now.getFullYear(),
                Math.floor(now.getMonth() / 3) * 3,
                1,
            );
        else from = new Date(now.getFullYear(), 0, 1);

        const next = {
            ...draft,
            date_from: toDateInput(from),
            date_to: toDateInput(now),
        };
        setDraft(next);
        setApplied(next);
    };

    /* ---------- tables (single source for on-screen export, PDF and CSV) ---------- */

    const tables = useMemo<ReportTable[]>(() => {
        if (!report) return [];
        const t: ReportTable[] = [];
        const s = report.summary || {};
        const res = report.population?.residents || {};
        const hh = report.population?.households || {};
        const cert = report.services?.certifications || {};
        const clr = report.services?.clearances || {};
        const fd = report.services?.frontdesk || {};
        const fin = report.finance || {};
        const health = report.health || {};
        const sys = report.system || {};

        const dist = (
            section: string,
            title: string,
            d?: Dist,
            valueLabel = "Count",
            money = false,
        ) => {
            if (!d || !d.length) return;
            const total = sumDist(d);
            t.push({
                section,
                title,
                columns: ["Category", valueLabel, "Share"],
                rows: humanDist(d).map((x) => [
                    x.label,
                    money ? pesoPdf(x.value) : x.value,
                    pct(x.value, total),
                ]),
            });
        };

        t.push({
            section: "Overview",
            title: "Key Figures",
            columns: ["Metric", "Value"],
            rows: [
                ["Living Residents", s.total_residents ?? 0],
                ["Total Households", s.total_households ?? 0],
                [
                    "Total Collections (Payments + Tax)",
                    pesoPdf(s.total_collections),
                ],
                ["Outstanding Penalties", pesoPdf(s.outstanding_penalties)],
                ["Certification Requests", s.certifications_in_period ?? 0],
                ["Clearance Requests", s.clearances_in_period ?? 0],
                ["Front Desk Requests", s.frontdesk_in_period ?? 0],
                ["Pending Certifications", s.pending_certifications ?? 0],
                ["Pending Clearances", s.pending_clearances ?? 0],
                ["Pending Front Desk Requests", s.pending_frontdesk ?? 0],
                ["Health Patients", s.health_patients ?? 0],
                ["Active User Accounts", s.active_users ?? 0],
            ],
        });

        // Population
        t.push({
            section: "Population",
            title: "Residents Summary",
            columns: ["Metric", "Value"],
            rows: [
                ["Living Residents", res.total ?? 0],
                ["Deceased", res.deceased ?? 0],
                ["Decedent (Deceased Property Owner)", res.decedent ?? 0],
                ["Senior Citizens (60+, living)", res.seniors ?? 0],
                ...(res.pwd !== null && res.pwd !== undefined
                    ? [
                          ["Persons with Disability", res.pwd] as (
                              | string
                              | number
                          )[],
                      ]
                    : []),
                ...(res.new_in_period !== null &&
                res.new_in_period !== undefined
                    ? [
                          ["Newly Registered (period)", res.new_in_period] as (
                              | string
                              | number
                          )[],
                      ]
                    : []),
                ["Total Households", hh.total ?? 0],
                ["Households with Geotag", hh.with_geotag ?? 0],
                ["Census Records", hh.census_records ?? 0],
            ],
        });
        dist("Population", "Residents by Vital Status", res.vital_status);
        dist("Population", "Living Residents by Gender", res.gender);
        dist("Population", "Living Residents by Age Group", res.age_groups);
        dist("Population", "Residents by Civil Status", res.civil_status);
        dist("Population", "Residents by Voter Status", res.voter_status);
        if (report.population?.zones?.length) {
            t.push({
                section: "Population",
                title: "Distribution by Zone",
                columns: ["Zone", "Households", "Residents"],
                rows: report.population.zones.map((z) => [
                    zoneLabel(z.zone_number, z.zone_name),
                    z.households,
                    z.residents,
                ]),
            });
        }

        // Services
        dist("Services", "Certifications by Status", cert.by_status);
        dist("Services", "Certifications by Type", cert.by_type);
        dist("Services", "Certifications by Channel", cert.by_channel);
        dist("Services", "Certification Payment Status", cert.payment_status);
        dist("Services", "Clearances by Status", clr.by_status);
        dist("Services", "Front Desk Requests by Status", fd.by_status);
        dist("Services", "Front Desk Requests by Service", fd.by_service);
        dist("Services", "Front Desk Requests by Priority", fd.by_priority);
        dist("Services", "Appointments by Status", fd.appointments);
        dist("Services", "Claim Slips by Status", fd.claim_slips);
        t.push({
            section: "Services",
            title: "Service Fees",
            columns: ["Metric", "Value"],
            rows: [
                ["Certification Fees Collected", pesoPdf(cert.fees_collected)],
                ["Clearance Fees (Released)", pesoPdf(clr.fees_released)],
                ["Residents Waiting in Queue", fd.queue_waiting ?? 0],
            ],
        });

        // Finance
        t.push({
            section: "Finance",
            title: "Collections Summary",
            columns: ["Metric", "Value"],
            rows: [
                ["Total Collections", pesoPdf(fin.total_collections)],
                ["Payments Collected", pesoPdf(fin.payments?.total)],
                ["Tax Collected", pesoPdf(fin.tax?.total)],
                ["Penalties Issued", pesoPdf(fin.penalties?.total_amount)],
                ["Penalties Paid", pesoPdf(fin.penalties?.paid_amount)],
                ["Penalties Pending", pesoPdf(fin.penalties?.pending_amount)],
                ["Penalties Waived", pesoPdf(fin.penalties?.waived_amount)],
            ],
        });
        dist(
            "Finance",
            "Payments by Type",
            fin.payments?.by_type,
            "Amount",
            true,
        );
        dist(
            "Finance",
            "Payments by Method",
            fin.payments?.by_method,
            "Amount",
            true,
        );
        dist("Finance", "Tax by Type", fin.tax?.by_type, "Amount", true);
        dist("Finance", "Penalties by Status", fin.penalties?.by_status);
        if (fin.monthly?.length) {
            t.push({
                section: "Finance",
                title: "Monthly Collections",
                columns: ["Month", "Payments", "Tax", "Total"],
                rows: (fin.monthly as Monthly[]).map((m) => [
                    m.month,
                    pesoPdf(m.payments),
                    pesoPdf(m.tax),
                    pesoPdf(m.total),
                ]),
            });
        }

        // Health
        dist("Health", "Patients by Type", health.patients?.by_type);
        dist("Health", "Patients by Status", health.patients?.by_status);
        dist("Health", "Pregnancy Risk Level", health.pregnancy_risk);
        dist("Health", "Child Nutritional Status", health.child_nutrition);
        dist("Health", "NCD Current Status", health.ncd_status);
        dist("Health", "NCD Classification", health.ncd_types);
        dist("Health", "Checkups by Type", health.checkups?.by_type);
        dist("Health", "Programs by Status", health.programs?.by_status);
        dist(
            "Health",
            "Program Participants by Status",
            health.programs?.participants,
        );
        dist("Health", "Nutrition Assessments", health.nutrition_assessments);

        // System
        t.push({
            section: "System",
            title: "User Accounts",
            columns: ["Metric", "Value"],
            rows: [
                ["Total Users", sys.users?.total ?? 0],
                ["Active", sys.users?.active ?? 0],
                ["Inactive", sys.users?.inactive ?? 0],
                ["Activity Log Entries (period)", sys.activity?.total ?? 0],
            ],
        });
        dist("System", "Users by Role", sys.users?.by_role);
        dist("System", "Announcements by Status", sys.announcements);
        dist("System", "Compliance Requirements by Status", sys.compliance);
        dist("System", "Top Recorded Activities", sys.activity?.by_action);

        return t;
    }, [report]);

    /* ---------- exports ---------- */

    const filterLabel = useMemo(() => {
        if (!report) return "";
        const f = report.meta.filters;
        const range =
            f.date_from || f.date_to
                ? `${f.date_from || "start"} to ${f.date_to || "today"}`
                : "All time";
        return `Period: ${range}  |  Zone: ${f.zone_name || "All zones"}`;
    }, [report]);

    const exportPdf = () => {
        if (!report) return;
        try {
            const doc = new jsPDF({ unit: "mm", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();

            doc.setFontSize(18);
            doc.setTextColor(26, 86, 219);
            doc.text("Barangay Bagocboc", pageWidth / 2, 18, {
                align: "center",
            });
            doc.setFontSize(14);
            doc.setTextColor(51, 51, 51);
            doc.text("Overall Report", pageWidth / 2, 27, { align: "center" });
            doc.setFontSize(9);
            doc.setTextColor(102, 102, 102);
            doc.text(filterLabel, pageWidth / 2, 34, { align: "center" });
            doc.text(
                `Generated ${new Date(report.meta.generated_at).toLocaleString("en-PH")} by ${report.meta.generated_by}`,
                pageWidth / 2,
                39,
                { align: "center" },
            );

            let y = 46;
            let currentSection = "";

            tables.forEach((tbl) => {
                const last = (doc as any).lastAutoTable?.finalY;
                if (last) y = last + 8;

                if (tbl.section !== currentSection) {
                    currentSection = tbl.section;
                    if (y > 255) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.setFontSize(13);
                    doc.setTextColor(26, 86, 219);
                    doc.text(tbl.section.toUpperCase(), 14, y);
                    y += 5;
                }

                autoTable(doc, {
                    startY: y,
                    head: [
                        [tbl.title, ...Array(tbl.columns.length - 1).fill("")],
                    ].concat([tbl.columns]),
                    body: tbl.rows.map((r) => r.map((c) => String(c))),
                    theme: "striped",
                    styles: { fontSize: 8.5, cellPadding: 2 },
                    headStyles: { fillColor: [26, 86, 219] },
                    margin: { left: 14, right: 14 },
                    didParseCell: (data) => {
                        // first head row = table title (merged look); second = column names
                        if (data.section === "head" && data.row.index === 0) {
                            data.cell.styles.fillColor = [51, 65, 85];
                            data.cell.styles.fontStyle = "bold";
                        } else if (data.section === "head") {
                            data.cell.styles.fillColor = [100, 116, 139];
                        }
                    },
                });
            });

            const pages = doc.getNumberOfPages();
            for (let i = 1; i <= pages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Page ${i} of ${pages}`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 8,
                    { align: "center" },
                );
            }

            doc.save(`overall-report-${toDateInput(new Date())}.pdf`);
            toast.success("PDF exported");
        } catch (e) {
            console.error(e);
            toast.error("Failed to export PDF");
        }
    };

    const exportCsv = () => {
        if (!report) return;
        const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const lines: string[] = [
            esc("Barangay Bagocboc - Overall Report"),
            esc(filterLabel),
            "",
        ];
        tables.forEach((tbl) => {
            lines.push(esc(`${tbl.section} - ${tbl.title}`));
            lines.push(tbl.columns.map(esc).join(","));
            tbl.rows.forEach((r) => lines.push(r.map(esc).join(",")));
            lines.push("");
        });

        const blob = new Blob(["\uFEFF" + lines.join("\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `overall-report-${toDateInput(new Date())}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported");
    };

    /* ---------- chart renderers ---------- */

    const renderPie = (data: Dist, height = 260) => {
        const d = humanDist(data).filter((x) => x.value > 0);
        if (!d.length) return <Empty />;
        const total = sumDist(d);
        return (
            <div style={{ height }}>
                <Pie
                    data={d}
                    angleField="value"
                    colorField="label"
                    radius={0.85}
                    innerRadius={0.55}
                    label={{
                        text: (datum: any) => pct(datum.value, total),
                        style: {
                            fontWeight: "bold",
                            fontSize: 11,
                            fill: "#fff",
                        },
                    }}
                    legend={{
                        color: {
                            title: false,
                            position: "bottom",
                            rowPadding: 6,
                        },
                    }}
                    theme={chartTheme}
                />
            </div>
        );
    };

    const renderColumn = (data: Dist, color = "#6366f1", height = 260) => {
        const d = humanDist(data);
        if (!d.length || sumDist(d) === 0) return <Empty />;
        return (
            <div style={{ height }}>
                <Column
                    data={d}
                    xField="label"
                    yField="value"
                    style={{ fill: color, radiusTopLeft: 4, radiusTopRight: 4 }}
                    axis={{
                        x: {
                            labelStyle: axisLabelStyle,
                            labelAutoRotate: true,
                        },
                        y: { labelStyle: axisLabelStyle },
                    }}
                    tooltip={{ items: [{ channel: "y", name: "Count" }] }}
                    theme={chartTheme}
                />
            </div>
        );
    };

    /* ============================================================
     RENDER STATES
     ============================================================ */

    if (isLoading && !report) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
                    <p className="text-sm text-theme-textSecondary">
                        Compiling overall report...
                    </p>
                </div>
            </div>
        );
    }

    if (isError && !report) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-theme-text">
                        Failed to Load Overall Report
                    </h3>
                    <button
                        onClick={() => fetchReport(applied)}
                        className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!report) return null;

    const s = report.summary || {};
    const res = report.population?.residents || {};
    const hh = report.population?.households || {};
    const zonesData = report.population?.zones || [];
    const cert = report.services?.certifications || {};
    const clr = report.services?.clearances || {};
    const fd = report.services?.frontdesk || {};
    const fin = report.finance || {};
    const health = report.health || {};
    const sys = report.system || {};
    const monthly: Monthly[] = fin.monthly || [];

    const monthlyLineData = monthly.flatMap((m) => [
        { month: m.month, type: "Payments", value: m.payments },
        { month: m.month, type: "Tax", value: m.tax },
    ]);

    const zoneColumnData = zonesData.flatMap((z) => [
        {
            zone: `Zone ${z.zone_number}`,
            type: "Households",
            value: z.households,
        },
        {
            zone: `Zone ${z.zone_number}`,
            type: "Residents",
            value: z.residents,
        },
    ]);

    /* ============================================================
     RENDER
     ============================================================ */

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-theme-text flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-theme-primary" />
                        Overall Reports
                    </h1>
                    <p className="text-sm text-theme-textSecondary">
                        {filterLabel} &middot; Generated{" "}
                        {new Date(report.meta.generated_at).toLocaleString(
                            "en-PH",
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => fetchReport(applied)}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-3 py-2 bg-theme-surface border border-theme text-theme-text rounded-lg hover:bg-theme-hover transition-colors disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                        />
                        Refresh
                    </button>
                    <button
                        onClick={exportCsv}
                        className="flex items-center gap-2 px-3 py-2 bg-theme-surface border border-theme text-theme-text rounded-lg hover:bg-theme-hover transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        CSV
                    </button>
                    <button
                        onClick={exportPdf}
                        className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
                    >
                        <FileDown className="w-4 h-4" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-theme-surface border border-theme rounded-xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                        <label className="block">
                            <span className="text-xs font-medium text-theme-textSecondary">
                                From
                            </span>
                            <input
                                type="date"
                                value={draft.date_from}
                                onChange={(e) =>
                                    setDraft({
                                        ...draft,
                                        date_from: e.target.value,
                                    })
                                }
                                className="mt-1 w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary outline-none"
                            />
                        </label>
                        <label className="block">
                            <span className="text-xs font-medium text-theme-textSecondary">
                                To
                            </span>
                            <input
                                type="date"
                                value={draft.date_to}
                                onChange={(e) =>
                                    setDraft({
                                        ...draft,
                                        date_to: e.target.value,
                                    })
                                }
                                className="mt-1 w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary outline-none"
                            />
                        </label>
                        <label className="block">
                            <span className="text-xs font-medium text-theme-textSecondary">
                                Zone
                            </span>
                            <select
                                value={draft.zone_id}
                                onChange={(e) =>
                                    setDraft({
                                        ...draft,
                                        zone_id: e.target.value,
                                    })
                                }
                                className="mt-1 w-full px-3 py-2 bg-theme-background border border-theme rounded-lg text-theme-text focus:ring-2 focus:ring-theme-primary outline-none"
                            >
                                <option value="">All zones</option>
                                {zones.map((z: any) => (
                                    <option key={z.id} value={z.id}>
                                        {zoneLabel(z.zone_number, z.name)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setPreset("month")}
                            className="px-3 py-2 text-xs border border-theme rounded-lg text-theme-textSecondary hover:bg-theme-hover"
                        >
                            This month
                        </button>
                        <button
                            onClick={() => setPreset("quarter")}
                            className="px-3 py-2 text-xs border border-theme rounded-lg text-theme-textSecondary hover:bg-theme-hover"
                        >
                            This quarter
                        </button>
                        <button
                            onClick={() => setPreset("year")}
                            className="px-3 py-2 text-xs border border-theme rounded-lg text-theme-textSecondary hover:bg-theme-hover"
                        >
                            This year
                        </button>
                        <button
                            onClick={applyFilters}
                            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90"
                        >
                            <Filter className="w-4 h-4" />
                            Apply
                        </button>
                        <button
                            onClick={resetFilters}
                            className="px-3 py-2 text-sm text-theme-textSecondary hover:text-theme-text"
                        >
                            Reset
                        </button>
                    </div>
                </div>
                <p className="mt-3 text-xs text-theme-textSecondary flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {report.meta.notes?.join(" ")}
                </p>
            </div>

            {report.meta.section_errors?.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                        Some sections could not be compiled:{" "}
                        <strong>{report.meta.section_errors.join(", ")}</strong>
                        . Check storage/logs/laravel.log for details.
                    </p>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-theme overflow-x-auto">
                <nav className="flex gap-1 min-w-max">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                tab === t.key
                                    ? "border-theme-primary text-theme-primary"
                                    : "border-transparent text-theme-textSecondary hover:text-theme-text"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* ================= OVERVIEW ================= */}
            {tab === "overview" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={Users}
                            label="Residents"
                            value={num(s.total_residents)}
                            hint="Living residents"
                        />
                        <StatCard
                            icon={Home}
                            label="Households"
                            value={num(s.total_households)}
                            color="text-emerald-500"
                            bg="bg-emerald-500/10"
                        />
                        <StatCard
                            icon={PhilippinePeso}
                            label="Total Collections"
                            value={peso(s.total_collections)}
                            hint="Payments + tax"
                            color="text-amber-500"
                            bg="bg-amber-500/10"
                        />
                        <StatCard
                            icon={AlertTriangle}
                            label="Outstanding Penalties"
                            value={peso(s.outstanding_penalties)}
                            color="text-red-500"
                            bg="bg-red-500/10"
                        />
                        <StatCard
                            icon={FileCheck}
                            label="Certification Requests"
                            value={num(s.certifications_in_period)}
                            hint={`${num(s.pending_certifications)} pending / in review`}
                            color="text-blue-500"
                            bg="bg-blue-500/10"
                        />
                        <StatCard
                            icon={FileSignature}
                            label="Clearance Requests"
                            value={num(s.clearances_in_period)}
                            hint={`${num(s.pending_clearances)} pending`}
                            color="text-violet-500"
                            bg="bg-violet-500/10"
                        />
                        <StatCard
                            icon={Calendar}
                            label="Front Desk Requests"
                            value={num(s.frontdesk_in_period)}
                            hint={`${num(s.pending_frontdesk)} pending / processing`}
                            color="text-cyan-500"
                            bg="bg-cyan-500/10"
                        />
                        <StatCard
                            icon={Heart}
                            label="Health Patients"
                            value={num(s.health_patients)}
                            hint={`${num(s.active_users)} active user accounts`}
                            color="text-pink-500"
                            bg="bg-pink-500/10"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Monthly Collections">
                            {monthlyLineData.length &&
                            monthly.some((m) => m.total > 0) ? (
                                <div style={{ height: 280 }}>
                                    <Line
                                        data={monthlyLineData}
                                        xField="month"
                                        yField="value"
                                        colorField="type"
                                        point={{
                                            shapeField: "circle",
                                            sizeField: 3,
                                        }}
                                        axis={{
                                            x: { labelStyle: axisLabelStyle },
                                            y: { labelStyle: axisLabelStyle },
                                        }}
                                        legend={{
                                            color: {
                                                title: false,
                                                position: "bottom",
                                            },
                                        }}
                                        theme={chartTheme}
                                    />
                                </div>
                            ) : (
                                <Empty label="No collections in this period" />
                            )}
                        </Card>
                        <Card title="Residents by Zone">
                            {zoneColumnData.length ? (
                                <div style={{ height: 280 }}>
                                    <Column
                                        data={zoneColumnData}
                                        xField="zone"
                                        yField="value"
                                        colorField="type"
                                        group
                                        axis={{
                                            x: { labelStyle: axisLabelStyle },
                                            y: { labelStyle: axisLabelStyle },
                                        }}
                                        legend={{
                                            color: {
                                                title: false,
                                                position: "bottom",
                                            },
                                        }}
                                        theme={chartTheme}
                                    />
                                </div>
                            ) : (
                                <Empty />
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {/* ================= POPULATION ================= */}
            {tab === "population" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <StatCard
                            icon={Users}
                            label="Living Residents"
                            value={num(res.total)}
                            hint={
                                res.new_in_period != null
                                    ? `${num(res.new_in_period)} new in period`
                                    : undefined
                            }
                        />
                        <StatCard
                            icon={Users}
                            label="Deceased"
                            value={num(res.deceased)}
                            hint="Resident records marked deceased"
                            color="text-gray-500"
                            bg="bg-gray-500/10"
                        />
                        <StatCard
                            icon={Home}
                            label="Decedent"
                            value={num(res.decedent)}
                            hint="Deceased property owners"
                            color="text-red-500"
                            bg="bg-red-500/10"
                        />
                        <StatCard
                            icon={Users}
                            label="Senior Citizens"
                            value={num(res.seniors)}
                            hint="Age 60+"
                            color="text-amber-500"
                            bg="bg-amber-500/10"
                        />
                        <StatCard
                            icon={ShieldCheck}
                            label="Persons w/ Disability"
                            value={res.pwd != null ? num(res.pwd) : "N/A"}
                            color="text-violet-500"
                            bg="bg-violet-500/10"
                        />
                        <StatCard
                            icon={Home}
                            label="Households"
                            value={num(hh.total)}
                            hint={`${num(hh.with_geotag)} geotagged · ${num(hh.census_records)} census records`}
                            color="text-emerald-500"
                            bg="bg-emerald-500/10"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Vital Status (all records)">
                            {renderPie(res.vital_status)}
                        </Card>
                        <Card title="Gender (living)">
                            {renderPie(res.gender)}
                        </Card>
                        <Card title="Age Groups (living)">
                            {renderColumn(res.age_groups, "#8b5cf6")}
                        </Card>
                        <Card title="Civil Status">
                            {renderPie(res.civil_status)}
                        </Card>
                        <Card title="Voter Status">
                            {renderPie(res.voter_status)}
                        </Card>
                    </div>

                    <Card title="Distribution by Zone">
                        {zonesData.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-theme text-xs text-theme-textSecondary uppercase tracking-wider">
                                            <th className="py-2 text-left font-medium">
                                                Zone
                                            </th>
                                            <th className="py-2 text-right font-medium">
                                                Households
                                            </th>
                                            <th className="py-2 text-right font-medium">
                                                Residents
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-theme">
                                        {zonesData.map((z) => (
                                            <tr key={z.zone_id}>
                                                <td className="py-2 text-theme-text">
                                                    {zoneLabel(
                                                        z.zone_number,
                                                        z.zone_name,
                                                    )}
                                                </td>
                                                <td className="py-2 text-right text-theme-text font-medium">
                                                    {num(z.households)}
                                                </td>
                                                <td className="py-2 text-right text-theme-text font-medium">
                                                    {num(z.residents)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <Empty />
                        )}
                    </Card>
                </div>
            )}

            {/* ================= SERVICES ================= */}
            {tab === "services" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={FileCheck}
                            label="Certifications"
                            value={num(cert.total)}
                            color="text-blue-500"
                            bg="bg-blue-500/10"
                        />
                        <StatCard
                            icon={PhilippinePeso}
                            label="Certificate Fees"
                            value={peso(cert.fees_collected)}
                            color="text-amber-500"
                            bg="bg-amber-500/10"
                        />
                        <StatCard
                            icon={FileSignature}
                            label="Clearances"
                            value={num(clr.total)}
                            hint={`${peso(clr.fees_released)} released`}
                            color="text-violet-500"
                            bg="bg-violet-500/10"
                        />
                        <StatCard
                            icon={Calendar}
                            label="Front Desk"
                            value={num(fd.requests_total)}
                            hint={`${num(fd.queue_waiting)} waiting in queue`}
                            color="text-cyan-500"
                            bg="bg-cyan-500/10"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Certifications by Status">
                            {renderPie(cert.by_status)}
                        </Card>
                        <Card title="Certifications by Type">
                            {renderColumn(cert.by_type, "#3b82f6")}
                        </Card>
                        <Card title="Clearances by Status">
                            {renderPie(clr.by_status)}
                        </Card>
                        <Card title="Front Desk Requests by Service">
                            {renderColumn(fd.by_service, "#06b6d4")}
                        </Card>
                        <Card title="Front Desk Status">
                            <DistTable data={humanDist(fd.by_status)} />
                        </Card>
                        <Card title="Appointments">
                            <DistTable data={humanDist(fd.appointments)} />
                        </Card>
                        <Card title="Submission Channel">
                            <DistTable data={humanDist(cert.by_channel)} />
                        </Card>
                        <Card title="Claim Slips">
                            <DistTable data={humanDist(fd.claim_slips)} />
                        </Card>
                    </div>
                </div>
            )}

            {/* ================= FINANCE ================= */}
            {tab === "finance" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={PhilippinePeso}
                            label="Total Collections"
                            value={peso(fin.total_collections)}
                            color="text-amber-500"
                            bg="bg-amber-500/10"
                        />
                        <StatCard
                            icon={PhilippinePeso}
                            label="Payments"
                            value={peso(fin.payments?.total)}
                            hint={`${num(fin.payments?.count)} transactions`}
                            color="text-emerald-500"
                            bg="bg-emerald-500/10"
                        />
                        <StatCard
                            icon={PhilippinePeso}
                            label="Tax"
                            value={peso(fin.tax?.total)}
                            hint={`${num(fin.tax?.count)} receipts`}
                            color="text-blue-500"
                            bg="bg-blue-500/10"
                        />
                        <StatCard
                            icon={AlertTriangle}
                            label="Penalties Pending"
                            value={peso(fin.penalties?.pending_amount)}
                            hint={`${peso(fin.penalties?.paid_amount)} paid · ${peso(fin.penalties?.waived_amount)} waived`}
                            color="text-red-500"
                            bg="bg-red-500/10"
                        />
                    </div>

                    <Card title="Monthly Collections">
                        {monthlyLineData.length &&
                        monthly.some((m) => m.total > 0) ? (
                            <div style={{ height: 300 }}>
                                <Line
                                    data={monthlyLineData}
                                    xField="month"
                                    yField="value"
                                    colorField="type"
                                    point={{
                                        shapeField: "circle",
                                        sizeField: 3,
                                    }}
                                    axis={{
                                        x: { labelStyle: axisLabelStyle },
                                        y: { labelStyle: axisLabelStyle },
                                    }}
                                    legend={{
                                        color: {
                                            title: false,
                                            position: "bottom",
                                        },
                                    }}
                                    theme={chartTheme}
                                />
                            </div>
                        ) : (
                            <Empty label="No collections in this period" />
                        )}
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Payments by Type">
                            <DistTable
                                data={humanDist(fin.payments?.by_type)}
                                valueLabel="Amount"
                                money
                            />
                        </Card>
                        <Card title="Payments by Method">
                            <DistTable
                                data={humanDist(fin.payments?.by_method)}
                                valueLabel="Amount"
                                money
                            />
                        </Card>
                        <Card title="Tax by Type">
                            <DistTable
                                data={humanDist(fin.tax?.by_type)}
                                valueLabel="Amount"
                                money
                            />
                        </Card>
                        <Card title="Penalties by Status">
                            {renderPie(fin.penalties?.by_status)}
                        </Card>
                    </div>
                </div>
            )}

            {/* ================= HEALTH ================= */}
            {tab === "health" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={Heart}
                            label="Patients"
                            value={num(health.patients?.total)}
                            hint={
                                health.patients?.new_in_period != null
                                    ? `${num(health.patients.new_in_period)} new in period`
                                    : undefined
                            }
                            color="text-pink-500"
                            bg="bg-pink-500/10"
                        />
                        <StatCard
                            icon={Heart}
                            label="Checkups"
                            value={num(health.checkups?.total)}
                            hint="In selected period"
                            color="text-emerald-500"
                            bg="bg-emerald-500/10"
                        />
                        <StatCard
                            icon={Heart}
                            label="Programs"
                            value={num(health.programs?.total)}
                            color="text-blue-500"
                            bg="bg-blue-500/10"
                        />
                        <StatCard
                            icon={Heart}
                            label="Assessments"
                            value={num(sumDist(health.nutrition_assessments))}
                            hint="Nutrition assessments"
                            color="text-amber-500"
                            bg="bg-amber-500/10"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Patients by Type">
                            {renderPie(health.patients?.by_type)}
                        </Card>
                        <Card title="Pregnancy Risk Level">
                            {renderColumn(health.pregnancy_risk, "#ec4899")}
                        </Card>
                        <Card title="Child Nutritional Status">
                            {renderPie(health.child_nutrition)}
                        </Card>
                        <Card title="NCD Current Status">
                            {renderPie(health.ncd_status)}
                        </Card>
                        <Card title="NCD Classification">
                            <DistTable data={humanDist(health.ncd_types)} />
                        </Card>
                        <Card title="Checkups by Type">
                            <DistTable
                                data={humanDist(health.checkups?.by_type)}
                            />
                        </Card>
                        <Card title="Programs by Status">
                            <DistTable
                                data={humanDist(health.programs?.by_status)}
                            />
                        </Card>
                        <Card title="Nutrition Assessments">
                            <DistTable
                                data={humanDist(health.nutrition_assessments)}
                            />
                        </Card>
                    </div>
                </div>
            )}

            {/* ================= SYSTEM ================= */}
            {tab === "system" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={Users}
                            label="Users"
                            value={num(sys.users?.total)}
                        />
                        <StatCard
                            icon={ShieldCheck}
                            label="Active"
                            value={num(sys.users?.active)}
                            color="text-emerald-500"
                            bg="bg-emerald-500/10"
                        />
                        <StatCard
                            icon={ShieldCheck}
                            label="Inactive"
                            value={num(sys.users?.inactive)}
                            color="text-red-500"
                            bg="bg-red-500/10"
                        />
                        <StatCard
                            icon={BarChart3}
                            label="Activity Entries"
                            value={num(sys.activity?.total)}
                            hint="In selected period"
                            color="text-violet-500"
                            bg="bg-violet-500/10"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Users by Role">
                            {renderColumn(sys.users?.by_role, "#6366f1")}
                        </Card>
                        <Card title="Top Recorded Activities">
                            <DistTable
                                data={humanDist(sys.activity?.by_action)}
                            />
                        </Card>
                        <Card title="Announcements">
                            <DistTable data={humanDist(sys.announcements)} />
                        </Card>
                        <Card title="Compliance Requirements">
                            <DistTable data={humanDist(sys.compliance)} />
                        </Card>
                    </div>
                </div>
            )}

            {isLoading && report && (
                <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-theme-surface border border-theme rounded-full shadow-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-theme-primary" />
                    <span className="text-sm text-theme-text">Updating...</span>
                </div>
            )}
        </div>
    );
}
