// src/components/features/ReportDetailModal.tsx

import React from "react";
import Modal from "../ui/Modal";

export interface DetailSection {
    title: string;
    icon?: React.ElementType;
    rows: {
        label: string;
        value: React.ReactNode;
        icon?: React.ElementType;
        span?: 1 | 2;
        /** ✅ preserve line breaks + monospace */
        preformatted?: boolean;
    }[];
}

interface ReportDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    badge?: { label: string; className: string };
    headerIcon?: React.ElementType;
    subtitle?: React.ReactNode;
    sections: DetailSection[];
    footerActions?: React.ReactNode;
}

export default function ReportDetailModal({
    isOpen,
    onClose,
    title,
    badge,
    headerIcon: HeaderIcon,
    subtitle,
    sections,
    footerActions,
}: ReportDetailModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
            <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
                {/* Header summary */}
                {(badge || subtitle || HeaderIcon) && (
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-theme">
                        <div className="flex items-center gap-3">
                            {HeaderIcon && (
                                <div className="p-2.5 rounded-xl bg-theme-primary/10">
                                    <HeaderIcon className="w-5 h-5 text-theme-primary" />
                                </div>
                            )}
                            {subtitle && (
                                <div className="text-sm text-theme-textSecondary">
                                    {subtitle}
                                </div>
                            )}
                        </div>
                        {badge && (
                            <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-medium ${badge.className}`}
                            >
                                {badge.label}
                            </span>
                        )}
                    </div>
                )}

                {/* Sections */}
                {sections.map((section, i) => {
                    const SectionIcon = section.icon;
                    return (
                        <div key={i}>
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-theme">
                                {SectionIcon && (
                                    <SectionIcon className="w-4 h-4 text-theme-primary" />
                                )}
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-theme-textSecondary">
                                    {section.title}
                                </h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {section.rows.map((row, j) => {
                                    const RowIcon = row.icon;
                                    return (
                                        <div
                                            key={j}
                                            className={`bg-theme-background rounded-lg p-3 ${row.span === 2 ? "sm:col-span-2" : ""
                                                }`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1">
                                                {RowIcon && (
                                                    <RowIcon className="w-3 h-3 text-theme-textSecondary" />
                                                )}
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-textSecondary">
                                                    {row.label}
                                                </p>
                                            </div>

                                            {row.preformatted ? (
                                                <pre className="text-xs text-theme-text font-mono whitespace-pre-wrap break-words leading-relaxed bg-theme-surface border border-theme rounded-md p-3 mt-1 max-h-96 overflow-y-auto">
                                                    {row.value}
                                                </pre>
                                            ) : (
                                                <div className="text-sm text-theme-text font-medium break-words">
                                                    {row.value}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-theme">
                    {footerActions}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}