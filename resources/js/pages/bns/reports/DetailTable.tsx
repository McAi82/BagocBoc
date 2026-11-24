// src/pages/bns/reports/DetailTable.tsx
// On-screen list of the people / households counted in a report.

import React, { useState, useMemo } from "react";
import type { ReportDetails } from "./reportPdf";

export default function DetailTable({
    details,
}: {
    details?: ReportDetails | null;
}) {
    const [query, setQuery] = useState("");

    const rows = useMemo(() => {
        if (!details) return [];
        const q = query.trim().toLowerCase();
        if (!q) return details.rows;
        return details.rows.filter((r) =>
            r.some((c) =>
                String(c ?? "")
                    .toLowerCase()
                    .includes(q),
            ),
        );
    }, [details, query]);

    if (!details) return null;

    return (
        <div className="bg-theme-surface border border-theme rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h3 className="font-semibold text-theme-text">
                    {details.title}{" "}
                    <span className="text-sm font-normal text-theme-textSecondary">
                        ({rows.length}
                        {rows.length !== details.rows.length
                            ? ` of ${details.rows.length}`
                            : ""}
                        )
                    </span>
                </h3>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search this list..."
                    className="px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary outline-none placeholder:text-theme-textSecondary"
                />
            </div>

            {details.rows.length === 0 ? (
                <p className="text-sm text-theme-textSecondary">
                    No records for this period.
                </p>
            ) : (
                <div className="overflow-auto max-h-[28rem] border border-theme rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-theme-background sticky top-0">
                            <tr>
                                {details.columns.map((c) => (
                                    <th
                                        key={c}
                                        className="px-3 py-2 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider whitespace-nowrap"
                                    >
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme">
                            {rows.map((r, i) => (
                                <tr key={i} className="hover:bg-theme-hover">
                                    {r.map((cell, j) => (
                                        <td
                                            key={j}
                                            className="px-3 py-2 text-theme-text whitespace-nowrap"
                                        >
                                            {cell ?? "—"}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
