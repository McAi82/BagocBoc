// src/pages/bns/reports/reportPdf.ts
// One place that draws a BNS report into a jsPDF document, so every page
// (consolidation, collected records, report viewer) prints the same formal report.

import type jsPDF from "jspdf";

export interface ReportRow {
    category: string;
    count: number;
    percentage: number;
}

export interface ReportDetails {
    title: string;
    columns: string[];
    rows: (string | number | null)[][];
}

export interface ReportData {
    total?: number;
    breakdown?: ReportRow[];
    sections?: Record<string, ReportRow[]>;
    section_titles?: Record<string, string>;
    details?: ReportDetails;
    period?: { label: string } | null;
    date_range?: { from: string; to: string } | null;
    metadata?: { generated_at: string; source: string };
}

export interface DrawOptions {
    /** Printed under the "Prepared by" line, e.g. the logged-in BNS name */
    preparedBy?: string;
    /** Printed under the "Noted by" line, e.g. the Barangay Captain */
    notedBy?: string;
}

export const SECTION_TITLES: Record<string, string> = {
    age_brackets: "By Age Bracket",
    sex: "By Sex",
    by_sex: "By Sex",
    by_zone: "By Zone",
};

export const sectionTitle = (data: ReportData, key: string) =>
    data.section_titles?.[key] || SECTION_TITLES[key] || key;

type RGB = [number, number, number];
const NAVY: RGB = [23, 54, 112];
const BLUE: RGB = [26, 86, 219];
const DARK: RGB = [33, 37, 41];
const GRAY: RGB = [108, 117, 125];
const LIGHT: RGB = [243, 245, 249];
const LINE: RGB = [206, 212, 218];

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const longDate = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return isNaN(d.getTime())
        ? iso
        : d.toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
          });
};

const isLandscape = (doc: jsPDF) =>
    doc.internal.pageSize.getWidth() > doc.internal.pageSize.getHeight();

const newPage = (doc: jsPDF, landscape = isLandscape(doc)) =>
    doc.addPage("a4", landscape ? "landscape" : "portrait");

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

function sectionHeading(doc: jsPDF, no: string, text: string, y: number) {
    const m = 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(`${no}.  ${text.toUpperCase()}`, m, y);
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.5);
    doc.line(m, y + 1.8, doc.internal.pageSize.getWidth() - m, y + 1.8);
    doc.setFont("helvetica", "normal");
    return y + 8;
}

interface Col {
    header: string;
    width: number;
    align?: "left" | "center" | "right";
}

function drawTable(
    doc: jsPDF,
    startY: number,
    x: number,
    cols: Col[],
    rows: (string | number | null)[][],
    opts: {
        rowH?: number;
        fontSize?: number;
        totalRow?: (string | number)[];
        repeatTop?: number;
        onNewPage?: () => number; // returns the y to continue from
        barCol?: number; // index of a % column to draw a small bar in
    } = {},
): number {
    const rowH = opts.rowH ?? 7;
    const fs = opts.fontSize ?? 9;
    const totalW = cols.reduce((a, c) => a + c.width, 0);
    const pageH = () => doc.internal.pageSize.getHeight();
    let y = startY;

    const cellX = (c: Col, cx: number) =>
        c.align === "right"
            ? cx + c.width - 2
            : c.align === "center"
              ? cx + c.width / 2
              : cx + 2;

    const drawHeader = () => {
        doc.setFillColor(...NAVY);
        doc.rect(x, y - 5, totalW, rowH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fs);
        doc.setTextColor(255, 255, 255);
        let cx = x;
        cols.forEach((c) => {
            doc.text(c.header, cellX(c, cx), y - 0.3, {
                align: c.align || "left",
            });
            cx += c.width;
        });
        doc.setFont("helvetica", "normal");
        y += rowH;
    };

    const ensure = (needed: number) => {
        if (y + needed > pageH() - 22) {
            if (opts.onNewPage) {
                y = opts.onNewPage();
            } else {
                newPage(doc);
                y = 24;
            }
            drawHeader();
        }
    };

    drawHeader();

    rows.forEach((row, ri) => {
        ensure(rowH);
        if (ri % 2 === 1) {
            doc.setFillColor(...LIGHT);
            doc.rect(x, y - 5, totalW, rowH, "F");
        }
        doc.setFontSize(fs);
        doc.setTextColor(...DARK);
        let cx = x;
        row.forEach((cell, i) => {
            const c = cols[i];
            const lines = doc.splitTextToSize(String(cell ?? "—"), c.width - 4);
            const text =
                lines.length > 1 ? `${lines[0].slice(0, -1)}…` : lines[0];
            if (opts.barCol === i && typeof cell === "number") {
                // percentage: print value on the right, bar on the left
                doc.text(`${cell.toFixed(1)}%`, cx + c.width - 2, y - 0.3, {
                    align: "right",
                });
                const barMax = c.width - 20;
                doc.setFillColor(...LINE);
                doc.rect(cx + 2, y - 3.2, barMax, 2.6, "F");
                doc.setFillColor(...BLUE);
                doc.rect(
                    cx + 2,
                    y - 3.2,
                    Math.max(0, (barMax * cell) / 100),
                    2.6,
                    "F",
                );
            } else {
                doc.text(text || "", cellX(c, cx), y - 0.3, {
                    align: c.align || "left",
                });
            }
            cx += c.width;
        });
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.1);
        doc.line(x, y + rowH - 5, x + totalW, y + rowH - 5);
        y += rowH;
    });

    if (opts.totalRow) {
        ensure(rowH);
        doc.setFillColor(226, 232, 240);
        doc.rect(x, y - 5, totalW, rowH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fs);
        doc.setTextColor(...DARK);
        let cx = x;
        opts.totalRow.forEach((cell, i) => {
            const c = cols[i];
            doc.text(String(cell), cellX(c, cx), y - 0.3, {
                align: c.align || "left",
            });
            cx += c.width;
        });
        doc.setFont("helvetica", "normal");
        y += rowH;
    }

    return y + 2;
}

function breakdownTable(
    doc: jsPDF,
    y: number,
    rows: ReportRow[],
    firstHeader: string,
): number {
    const m = 18;
    const w = doc.internal.pageSize.getWidth() - m * 2;
    const cols: Col[] = [
        { header: firstHeader, width: w * 0.46 },
        { header: "No.", width: w * 0.14, align: "center" },
        { header: "Percentage", width: w * 0.4 },
    ];
    const total = rows.reduce((a, r) => a + Number(r.count || 0), 0);
    const body = rows.map((r) => [r.category, r.count, Number(r.percentage)]);
    return drawTable(doc, y, m, cols, body, {
        barCol: 2,
        totalRow: ["Total", total, ""],
        onNewPage: () => {
            newPage(doc, false);
            return 24;
        },
    });
}

/* ------------------------------------------------------------------ */
/* Page furniture                                                      */
/* ------------------------------------------------------------------ */

function letterhead(doc: jsPDF) {
    const w = doc.internal.pageSize.getWidth();
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text("Republic of the Philippines", w / 2, 15, { align: "center" });
    doc.text("Province of Misamis Oriental", w / 2, 20, { align: "center" });
    doc.text("Municipality of Opol", w / 2, 25, { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(17);
    doc.setTextColor(...NAVY);
    doc.text("BARANGAY BAGOCBOC", w / 2, 33, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY);
    doc.text("Barangay Nutrition Scholar (BNS) Office", w / 2, 38.5, {
        align: "center",
    });

    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.9);
    doc.line(18, 42, w - 18, 42);
    doc.setLineWidth(0.25);
    doc.line(18, 43.6, w - 18, 43.6);
}

function runningHeader(doc: jsPDF, text: string) {
    const w = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text("BARANGAY BAGOCBOC", 12, 11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(text, w - 12, 11, { align: "right" });
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.4);
    doc.line(12, 13.5, w - 12, 13.5);
}

function statCards(
    doc: jsPDF,
    y: number,
    cards: { label: string; value: string }[],
) {
    const m = 18;
    const total = doc.internal.pageSize.getWidth() - m * 2;
    const gap = 4;
    const n = cards.length;
    const cw = (total - gap * (n - 1)) / n;
    const h = 20;
    cards.forEach((c, i) => {
        const cx = m + i * (cw + gap);
        doc.setFillColor(...LIGHT);
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.3);
        doc.roundedRect(cx, y, cw, h, 1.5, 1.5, "FD");
        doc.setFillColor(...BLUE);
        doc.rect(cx, y, 1.6, h, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...NAVY);
        doc.text(c.value, cx + 5, y + 9.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...GRAY);
        const label = doc.splitTextToSize(c.label, cw - 8)[0];
        doc.text(label, cx + 5, y + 15.5);
    });
    return y + h + 8;
}

function metaBox(doc: jsPDF, y: number, rows: [string, string][]) {
    const m = 18;
    const w = doc.internal.pageSize.getWidth() - m * 2;
    const rowH = 6.2;
    const h = rows.length * rowH + 4;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.rect(m, y, w, h);
    rows.forEach(([k, v], i) => {
        const ry = y + 6 + i * rowH;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY);
        doc.text(k, m + 4, ry);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...DARK);
        const val = doc.splitTextToSize(v, w - 48)[0];
        doc.text(val, m + 44, ry);
    });
    return y + h + 8;
}

function signatures(doc: jsPDF, y: number, opts: DrawOptions) {
    const w = doc.internal.pageSize.getWidth();
    const m = 18;
    const colW = (w - m * 2 - 20) / 2;
    const blocks = [
        {
            role: "Prepared by:",
            name: opts.preparedBy || "",
            title: "Barangay Nutrition Scholar",
        },
        {
            role: "Noted by:",
            name: opts.notedBy || "",
            title: "Barangay Captain",
        },
    ];
    blocks.forEach((b, i) => {
        const bx = m + i * (colW + 20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY);
        doc.text(b.role, bx, y);
        doc.setDrawColor(...DARK);
        doc.setLineWidth(0.3);
        doc.line(bx, y + 16, bx + colW, y + 16);
        if (b.name) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(...DARK);
            doc.text(b.name.toUpperCase(), bx + colW / 2, y + 14, {
                align: "center",
            });
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY);
        doc.text(b.title, bx + colW / 2, y + 21, { align: "center" });
    });
    return y + 28;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Draws one full report. Call with first=true for the first report in a document,
 * false for the following ones (a new portrait page is started).
 */
export function drawReport(
    doc: jsPDF,
    label: string,
    data: ReportData,
    first = true,
    options: DrawOptions = {},
) {
    if (!first) newPage(doc, false);
    const w = doc.internal.pageSize.getWidth();
    const m = 18;
    const periodLabel = data.period?.label || "";
    const total = data.total ?? 0;

    letterhead(doc);

    // Title block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...DARK);
    doc.text(`${label.toUpperCase()} REPORT`, w / 2, 56, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...GRAY);
    const covered = data.date_range
        ? `${longDate(data.date_range.from)}  to  ${longDate(data.date_range.to)}`
        : "";
    doc.text(periodLabel ? `${periodLabel}` : "", w / 2, 62.5, {
        align: "center",
    });
    if (covered) {
        doc.setFontSize(9.5);
        doc.text(covered, w / 2, 68, { align: "center" });
    }

    let y = 78;

    // I. Report information
    y = sectionHeading(doc, ROMAN[0], "Report Information", y);
    const generated = data.metadata?.generated_at
        ? new Date(data.metadata.generated_at)
        : new Date();
    y = metaBox(doc, y, [
        ["Report", `${label} Demographic Report`],
        ["Reporting period", periodLabel || "—"],
        ["Data source", data.metadata?.source || "Barangay records"],
        ["Date generated", generated.toLocaleString("en-PH")],
    ]);

    // II. Highlights
    let sec = 1;
    y = sectionHeading(doc, ROMAN[sec++], "Summary of Findings", y);
    const cards = [{ label: "Total records counted", value: String(total) }];
    [...(data.breakdown || [])]
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .forEach((r) =>
            cards.push({
                label: r.category,
                value: `${r.count}  (${Number(r.percentage).toFixed(1)}%)`,
            }),
        );
    y = statCards(doc, y, cards);

    // III. Breakdown + sections
    const need = (rows: number) => 14 + (rows + 2) * 7;
    const toPage = () => {
        newPage(doc, false);
        return 28;
    };

    if (data.breakdown && data.breakdown.length > 0) {
        if (
            y + need(data.breakdown.length) >
            doc.internal.pageSize.getHeight() - 22
        )
            y = toPage();
        y = sectionHeading(doc, ROMAN[sec++], "Breakdown", y);
        y = breakdownTable(doc, y, data.breakdown, "Category");
        y += 4;
    }

    Object.entries(data.sections || {}).forEach(([key, rows]) => {
        if (!rows || rows.length === 0) return;
        if (
            y + need(Math.min(rows.length, 6)) >
            doc.internal.pageSize.getHeight() - 22
        )
            y = toPage();
        y = sectionHeading(
            doc,
            ROMAN[sec++] || String(sec),
            sectionTitle(data, key),
            y,
        );
        y = breakdownTable(
            doc,
            y,
            rows,
            sectionTitle(data, key).replace(/^By\s+/i, ""),
        );
        y += 4;
    });

    // Signatures (end of summary pages)
    if (y + 36 > doc.internal.pageSize.getHeight() - 22) y = toPage();
    signatures(doc, y + 6, options);

    // Annex: itemised list on landscape pages
    if (data.details) {
        const d = data.details;
        newPage(doc, true);
        const lw = doc.internal.pageSize.getWidth();
        const header = () =>
            runningHeader(
                doc,
                `${label} Report${periodLabel ? " - " + periodLabel : ""}`,
            );
        header();

        let ty = 24;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...NAVY);
        doc.text(`ANNEX: ${d.title.toUpperCase()}`, 12, ty);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...GRAY);
        doc.text(`${d.rows.length} record(s)`, lw - 12, ty, { align: "right" });
        ty += 8;

        const usable = lw - 24;
        const weights = d.columns.map((c, i) => {
            const longest = Math.max(
                c.length,
                ...d.rows.slice(0, 300).map((r) => String(r[i] ?? "").length),
            );
            return Math.min(Math.max(longest, 4), 28);
        });
        const sum = weights.reduce((a, b) => a + b, 0);
        const cols: Col[] = d.columns.map((c, i) => {
            const numeric = d.rows.every(
                (r) => typeof r[i] === "number" || r[i] === "—" || r[i] == null,
            );
            return {
                header: c,
                width: (weights[i] / sum) * usable,
                align: numeric ? "center" : "left",
            };
        });

        if (d.rows.length === 0) {
            doc.setFontSize(10);
            doc.setTextColor(...GRAY);
            doc.text("No records for this period.", 12, ty + 4);
        } else {
            drawTable(doc, ty, 12, cols, d.rows, {
                rowH: 6.4,
                fontSize: 8,
                onNewPage: () => {
                    newPage(doc, true);
                    header();
                    return 24;
                },
            });
        }
    }
}

/** Adds the footer, "Page x of y" and a confidentiality note to every page. Call once, last. */
export function finalizePdf(doc: jsPDF) {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        const w = doc.internal.pageSize.getWidth();
        const h = doc.internal.pageSize.getHeight();
        const m = w > h ? 12 : 18;
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.3);
        doc.line(m, h - 14, w - m, h - 14);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...GRAY);
        doc.text(
            "Barangay Bagocboc Management System  |  System-generated report  |  Confidential",
            m,
            h - 9,
        );
        doc.text(`Page ${i} of ${total}`, w - m, h - 9, { align: "right" });
    }
}
