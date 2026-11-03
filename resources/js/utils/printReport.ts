// src/utils/printReport.ts

export interface PrintColumn {
    key: string;
    label: string;
    align?: "left" | "right" | "center";
    width?: string;
    render?: (row: any, index: number) => string;
}

export interface PrintSummaryItem {
    label: string;
    value: string | number;
    color?: string;
}

export interface PrintOptions {
    title: string;
    subtitle?: string;
    periodLabel: string;
    columns: PrintColumn[];
    rows: any[];
    summary?: PrintSummaryItem[];
    signatories?: {
        left?: { name: string; title: string };
        right?: { name: string; title: string };
    };
}

export function printReport(options: PrintOptions): boolean {
    const {
        title,
        subtitle,
        periodLabel,
        columns,
        rows,
        summary = [],
        signatories,
    } = options;

    const headerCells = columns
        .map(
            (c) =>
                `<th style="text-align:${c.align || "left"};${c.width ? `width:${c.width};` : ""
                }">${c.label}</th>`,
        )
        .join("");

    const bodyRows = rows
        .map((row, i) => {
            const cells = columns
                .map((c) => {
                    const value =
                        typeof c.render === "function"
                            ? c.render(row, i)
                            : (row[c.key] ?? "—");

                    return `<td style="text-align:${c.align || "left"}">${value}</td>`;
                })
                .join("");
            return `<tr>${cells}</tr>`;
        })
        .join("");

    const summaryHtml =
        summary.length > 0
            ? `
    <div class="summary">
      ${summary
                .map(
                    (s) => `
        <div class="summary-item">
          <div class="summary-label">${s.label}</div>
          <div class="summary-value" ${s.color ? `style="color:${s.color}"` : ""
                        }>${s.value}</div>
        </div>`,
                )
                .join("")}
    </div>`
            : "";

    const signatoriesHtml = signatories
        ? `
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${signatories.left?.name || ""}</div>
        <div class="sig-title">${signatories.left?.title || ""}</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-name">${signatories.right?.name || ""}</div>
        <div class="sig-title">${signatories.right?.title || ""}</div>
      </div>
    </div>`
        : "";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @page { size: A4 portrait; margin: 14mm 12mm; }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #1a1a1a;
      background: #fff;
      font-size: 11.5px;
      line-height: 1.4;
      padding: 24px;
    }

    /* ---------- LETTERHEAD ---------- */
    .letterhead {
      display: flex;
      align-items: center;
      gap: 20px;
      padding-bottom: 16px;
      border-bottom: 3px double #1a1a1a;
      margin-bottom: 6px;
    }

    .seal {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      border: 2px solid #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      letter-spacing: 1px;
      color: #555;
      flex-shrink: 0;
      text-transform: uppercase;
      font-family: 'Georgia', serif;
      background: #fafafa;
    }

    .letterhead-text {
      flex: 1;
      text-align: center;
      line-height: 1.35;
    }

    .letterhead-text .republic {
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #444;
      margin-bottom: 4px;
    }

    .letterhead-text .province {
      font-size: 12px;
      color: #444;
    }

    .letterhead-text .municipality {
      font-size: 12px;
      color: #444;
      margin-bottom: 4px;
    }

    .letterhead-text .barangay {
      font-size: 22px;
      font-weight: bold;
      letter-spacing: 1.5px;
      color: #0f172a;
      margin: 4px 0;
    }

    .letterhead-text .office {
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #555;
    }

    .rule-thick {
      border-top: 2px solid #1a1a1a;
      margin-top: 2px;
      margin-bottom: 22px;
    }

    /* ---------- TITLE ---------- */
    .title-block {
      text-align: center;
      margin-bottom: 22px;
    }

    .title-block h1 {
      font-size: 18px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 4px;
      font-weight: bold;
    }

    .title-block .subtitle {
      font-size: 12px;
      font-style: italic;
      color: #666;
    }

    .title-block .period {
      font-size: 11px;
      color: #444;
      margin-top: 4px;
    }

    /* ---------- SUMMARY ---------- */
    .summary {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px 22px;
      padding: 12px 18px;
      background: #f7f9fb;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #1a1a1a;
      margin-bottom: 20px;
    }

    .summary-item { text-align: center; }

    .summary-label {
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #666;
      margin-bottom: 3px;
    }

    .summary-value {
      font-size: 16px;
      font-weight: bold;
      color: #0f172a;
    }

    /* ---------- TABLE ---------- */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    thead {
      display: table-header-group;
    }

    th {
      background: #1a1a1a;
      color: #ffffff;
      text-transform: uppercase;
      font-size: 9.5px;
      letter-spacing: 0.8px;
      padding: 9px 8px;
      border-bottom: 2px solid #000;
      font-weight: bold;
    }

    td {
      padding: 8px;
      border-bottom: 1px solid #e5e5e5;
      vertical-align: top;
      word-break: break-word;
    }

    tbody tr:nth-child(even) td {
      background: #fafafa;
    }

    tbody tr:last-child td {
      border-bottom: 1px solid #999;
    }

    /* Section header row inside the table */
    .section-row td {
      background: #eef2f7 !important;
      color: #1a1a1a;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 10.5px;
      letter-spacing: 1px;
      padding: 8px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
    }

    .row-num {
      font-family: 'Courier New', monospace;
      color: #666;
      font-size: 10px;
    }

    /* ---------- STATUS BADGES ---------- */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 9.5px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border: 1px solid transparent;
    }

    .badge-pending   { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
    .badge-approved  { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
    .badge-released  { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
    .badge-rejected  { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
    .badge-cancelled { background: #e5e7eb; color: #374151; border-color: #d1d5db; }
    .badge-active    { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
    .badge-inactive  { background: #f3f4f6; color: #4b5563; border-color: #d1d5db; }

    /* ---------- SIGNATURES ---------- */
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      gap: 40px;
      page-break-inside: avoid;
    }

    .sig-block {
      flex: 1;
      max-width: 260px;
      text-align: center;
    }

    .sig-line {
      border-top: 1px solid #333;
      margin-bottom: 6px;
      height: 36px;
    }

    .sig-name {
      font-size: 12px;
      font-weight: bold;
      color: #0f172a;
    }

    .sig-title {
      font-size: 10.5px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 2px;
    }

    /* ---------- FOOTER ---------- */
    .footer {
      margin-top: 40px;
      padding-top: 14px;
      border-top: 1px dashed #ccc;
      font-size: 9.5px;
      color: #888;
      text-align: center;
      line-height: 1.6;
      page-break-inside: avoid;
    }

    .footer strong { color: #555; }

    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- LETTERHEAD -->
  <div class="letterhead">
    <div class="seal">BARANGAY<br/>SEAL</div>
    <div class="letterhead-text">
      <div class="republic">Republic of the Philippines</div>
      <div class="province">Province of Misamis Oriental</div>
      <div class="municipality">Municipality of Opol</div>
      <div class="barangay">BARANGAY BAGOCBOC</div>
      <div class="office">Office of the Punong Barangay</div>
    </div>
    <div class="seal">DILG<br/>SEAL</div>
  </div>
  <div class="rule-thick"></div>

  <!-- TITLE -->
  <div class="title-block">
    <h1>${title}</h1>
    ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}
    <div class="period">Period Covered: <strong>${periodLabel}</strong></div>
  </div>

  <!-- SUMMARY -->
  ${summaryHtml}

  <!-- TABLE -->
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows ||
        `<tr><td colspan="${columns.length}" style="text-align:center;padding:24px;color:#888;">No records found</td></tr>`
        }</tbody>
  </table>

  <!-- SIGNATURES -->
  ${signatoriesHtml}

  <!-- FOOTER -->
  <div class="footer">
    <strong>Barangay Bagocboc</strong> • Opol, Misamis Oriental<br/>
    Generated on ${new Date().toLocaleString("en-PH", {
            dateStyle: "long",
            timeStyle: "short",
        })} • Total Records: ${rows.length}<br/>
    <em>This is a system-generated document from the Barangay Bagocboc Management System.</em>
  </div>

  <script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`;

    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) return false;

    w.document.open();
    w.document.write(html);
    w.document.close();
    return true;
}

export function statusBadge(status: string): string {
    const s = (status || "").toLowerCase();
    if (s === "pending" || s === "in review")
        return `<span class="badge badge-pending">${status}</span>`;
    if (s === "approved" || s === "ready for release")
        return `<span class="badge badge-approved">${status}</span>`;
    if (s === "released")
        return `<span class="badge badge-released">${status}</span>`;
    if (s === "rejected")
        return `<span class="badge badge-rejected">${status}</span>`;
    if (s === "cancelled")
        return `<span class="badge badge-cancelled">${status}</span>`;
    if (s === "active") return `<span class="badge badge-active">${status}</span>`;
    if (s === "inactive")
        return `<span class="badge badge-inactive">${status}</span>`;
    return `<span class="badge">${status}</span>`;
}

export function esc(v: any): string {
    if (v === null || v === undefined) return "—";
    return String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}