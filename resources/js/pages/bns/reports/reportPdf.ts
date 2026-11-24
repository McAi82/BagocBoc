// src/pages/bns/reports/reportPdf.ts
// One place that draws a BNS report into a jsPDF document, so every page
// (consolidation, collected records, report viewer) prints the same detailed report.

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

export const SECTION_TITLES: Record<string, string> = {
    age_brackets: "By Age Bracket",
    sex: "By Sex",
    by_sex: "By Sex",
    by_zone: "By Zone",
};

export const sectionTitle = (data: ReportData, key: string) =>
    data.section_titles?.[key] || SECTION_TITLES[key] || key;

const BLUE: [number, number, number] = [26, 86, 219];
const DARK: [number, number, number] = [51, 51, 51];
const GRAY: [number, number, number] = [102, 102, 102];

function heading(doc: jsPDF, text: string, y: number, x = 20) {
    doc.setFontSize(14);
    doc.setTextColor(...BLUE);
    doc.text(text, x, y);
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
    const h = doc.internal.pageSize.getHeight();
    if (y + needed > h - 20) {
        doc.addPage();
        return 20;
    }
    return y;
}

function drawRows(doc: jsPDF, rows: ReportRow[], y: number): number {
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    rows.forEach((item) => {
        y = ensureSpace(doc, y, 8);
        doc.text(
            `${item.category}: ${item.count} (${Number(item.percentage).toFixed(1)}%)`,
            20,
            y,
        );
        y += 8;
    });
    return y;
}

function drawDetailsTable(doc: jsPDF, details: ReportDetails) {
    // Details go on their own landscape page(s) so wide tables fit.
    doc.addPage("a4", "landscape");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;
    const usable = pageW - margin * 2;

    let y = 18;
    heading(
        doc,
        `Details: ${details.title} (${details.rows.length})`,
        y,
        margin,
    );
    y += 8;

    // column widths proportional to the longest text (capped), "No." stays narrow
    const weights = details.columns.map((c, i) => {
        const longest = Math.max(
            c.length,
            ...details.rows.slice(0, 300).map((r) => String(r[i] ?? "").length),
        );
        return Math.min(Math.max(longest, 4), 28);
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((w) => (w / sum) * usable);

    const rowH = 6.5;

    const drawHeader = () => {
        doc.setFillColor(26, 86, 219);
        doc.rect(margin, y - 4.5, usable, rowH, "F");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        let x = margin;
        details.columns.forEach((c, i) => {
            doc.text(c, x + 1.5, y);
            x += widths[i];
        });
        y += rowH;
    };

    drawHeader();

    if (details.rows.length === 0) {
        doc.setTextColor(...GRAY);
        doc.text("No records for this period.", margin + 1.5, y);
        return;
    }

    details.rows.forEach((row, ri) => {
        if (y > pageH - 18) {
            doc.addPage("a4", "landscape");
            y = 18;
            drawHeader();
        }
        if (ri % 2 === 1) {
            doc.setFillColor(243, 244, 246);
            doc.rect(margin, y - 4.5, usable, rowH, "F");
        }
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        let x = margin;
        row.forEach((cell, i) => {
            const lines = doc.splitTextToSize(
                String(cell ?? "—"),
                widths[i] - 3,
            );
            const text =
                lines.length > 1 ? `${lines[0].slice(0, -1)}…` : lines[0];
            doc.text(text || "", x + 1.5, y);
            x += widths[i];
        });
        y += rowH;
    });
}

/**
 * Draws one full report. Call with first=true for the first report in a document,
 * false for the following ones (a new portrait page is started).
 */
export function drawReport(
    doc: jsPDF,
    label: string,
    data: ReportData,
    first = true,
) {
    if (!first) doc.addPage("a4", "portrait");
    const w = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setTextColor(...BLUE);
    doc.text("Barangay Bagocboc", w / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(...DARK);
    const periodText = data.period?.label ? ` - ${data.period.label}` : "";
    doc.text(`${label} Report${periodText}`, w / 2, 30, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    const generated = data.metadata?.generated_at
        ? new Date(data.metadata.generated_at)
        : new Date();
    doc.text(`Generated on: ${generated.toLocaleString()}`, w / 2, 38, {
        align: "center",
    });

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 45, w - 20, 45);

    let y = 55;
    heading(doc, "Summary", y);
    y += 10;
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(`Total Records: ${data.total ?? 0}`, 20, y);
    y += 8;
    if (data.date_range) {
        doc.text(
            `Period covered: ${data.date_range.from} to ${data.date_range.to}`,
            20,
            y,
        );
        y += 8;
    }
    if (data.metadata?.source) {
        doc.text(`Source: ${data.metadata.source}`, 20, y);
        y += 8;
    }
    y += 4;

    if (data.breakdown && data.breakdown.length > 0) {
        y = ensureSpace(doc, y, 20);
        heading(doc, "Breakdown", y);
        y += 10;
        y = drawRows(doc, data.breakdown, y);
    }

    Object.entries(data.sections || {}).forEach(([key, rows]) => {
        y = ensureSpace(doc, y + 5, 28);
        heading(doc, sectionTitle(data, key), y);
        y += 10;
        y = drawRows(doc, rows, y);
    });

    if (data.details) drawDetailsTable(doc, data.details);
}

/** Adds "Page x of y" and the system footer to every page. Call once, last. */
export function finalizePdf(doc: jsPDF) {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        const w = doc.internal.pageSize.getWidth();
        const h = doc.internal.pageSize.getHeight();
        doc.setFontSize(9);
        doc.setTextColor(153, 153, 153);
        doc.text("This is a system-generated report.", w / 2, h - 12, {
            align: "center",
        });
        doc.text(
            `Barangay Bagocboc Management System  •  Page ${i} of ${total}`,
            w / 2,
            h - 7,
            { align: "center" },
        );
    }
}
