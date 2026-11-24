// src/pages/bns/reports/PeriodPicker.tsx

import React from "react";

export type PeriodType = "monthly" | "quarterly" | "yearly";

export interface PeriodValue {
    period: PeriodType;
    year: number;
    month: number; // 1-12 (monthly)
    quarter: number; // 1-4 (quarterly)
}

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

export const defaultPeriod = (): PeriodValue => {
    const now = new Date();
    return {
        period: "monthly",
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        quarter: Math.floor(now.getMonth() / 3) + 1,
    };
};

/** Query / body params understood by the BNS report endpoints */
export const periodParams = (v: PeriodValue) => ({
    period: v.period,
    year: v.year,
    ...(v.period === "monthly" ? { month: v.month } : {}),
    ...(v.period === "quarterly" ? { quarter: v.quarter } : {}),
});

export const periodLabel = (v: PeriodValue): string =>
    v.period === "monthly"
        ? `${MONTHS[v.month - 1]} ${v.year}`
        : v.period === "quarterly"
          ? `Q${v.quarter} ${v.year}`
          : `${v.year}`;

const TABS: { value: PeriodType; label: string }[] = [
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
];

const selectClass =
    "px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary outline-none";

interface Props {
    value: PeriodValue;
    onChange: (v: PeriodValue) => void;
    disabled?: boolean;
}

export default function PeriodPicker({ value, onChange, disabled }: Props) {
    const thisYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => thisYear - i);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-theme overflow-hidden">
                {TABS.map((t) => (
                    <button
                        key={t.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange({ ...value, period: t.value })}
                        className={`px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
                            value.period === t.value
                                ? "bg-blue-500 text-white"
                                : "bg-theme-surface text-theme-text hover:bg-theme-hover"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {value.period === "monthly" && (
                <select
                    value={value.month}
                    disabled={disabled}
                    onChange={(e) =>
                        onChange({ ...value, month: Number(e.target.value) })
                    }
                    className={selectClass}
                >
                    {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>
                            {m}
                        </option>
                    ))}
                </select>
            )}

            {value.period === "quarterly" && (
                <select
                    value={value.quarter}
                    disabled={disabled}
                    onChange={(e) =>
                        onChange({ ...value, quarter: Number(e.target.value) })
                    }
                    className={selectClass}
                >
                    <option value={1}>Q1 (Jan–Mar)</option>
                    <option value={2}>Q2 (Apr–Jun)</option>
                    <option value={3}>Q3 (Jul–Sep)</option>
                    <option value={4}>Q4 (Oct–Dec)</option>
                </select>
            )}

            <select
                value={value.year}
                disabled={disabled}
                onChange={(e) =>
                    onChange({ ...value, year: Number(e.target.value) })
                }
                className={selectClass}
            >
                {years.map((y) => (
                    <option key={y} value={y}>
                        {y}
                    </option>
                ))}
            </select>
        </div>
    );
}
