// src/components/features/ClearancePreviewModal.tsx

import React, { useEffect, useRef, useState } from "react";
import { X, Save, Loader2, CheckCircle } from "lucide-react";
import { BarangayClearance } from "../certificates";
import { buildCertificateFields } from "../../utils/certificateMapper";
import { api } from "../../api/apiClient";
import toast from "react-hot-toast";

interface ClearancePreviewModalProps {
    clearance: any;
    onClose: () => void;
    onSaved?: () => void;
}

/**
 * Clearances have no certification type and keep the resident directly on the
 * record, so we shape them like a certification and reuse the same
 * BarangayClearance template + field mapper that Certifications uses.
 */
const toCertificationShape = (c: any) => ({
    ...c,
    requester: { resident_id: c?.resident_id, resident: c?.resident },
    resident: c?.resident,
    // buildCertificateFields reads the fee from certification_type.fee
    certification_type: { name: "Barangay Clearance", fee: c?.amount ?? 0 },
    payment_reference: c?.payment_reference ?? c?.or_number ?? null,
});

export default function ClearancePreviewModal({
    clearance,
    onClose,
    onSaved,
}: ClearancePreviewModalProps) {
    const fields = buildCertificateFields(
        "BarangayClearance",
        toCertificationShape(clearance),
    );

    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(!!clearance?.document_path);

    useEffect(() => {
        const computeScale = () => {
            if (!wrapperRef.current) return;
            const maxWidth = wrapperRef.current.clientWidth - 48;
            setScale(Math.min(1, maxWidth / 800));
        };
        computeScale();
        window.addEventListener("resize", computeScale);
        return () => window.removeEventListener("resize", computeScale);
    }, []);

    const handleSaveToServer = async () => {
        setIsSaving(true);
        try {
            const node =
                wrapperRef.current?.querySelector<HTMLElement>(
                    "[data-certificate-root]",
                ) ??
                (wrapperRef.current?.firstElementChild as HTMLElement | null);
            if (!node) throw new Error("Clearance node not found");

            const [{ default: html2canvas }, jsPDFModule] = await Promise.all([
                import("html2canvas"),
                import("jspdf"),
            ]);
            const jsPDF =
                (jsPDFModule as any).jsPDF || (jsPDFModule as any).default;

            if (document.fonts && (document.fonts as any).ready) {
                await (document.fonts as any).ready;
            }

            // Remove the preview scale transform so capture is full size
            let scaledAncestor: HTMLElement | null = node.parentElement;
            let previousTransform = "";
            while (scaledAncestor) {
                const t = getComputedStyle(scaledAncestor).transform;
                if (t && t !== "none" && t.startsWith("matrix")) {
                    previousTransform = scaledAncestor.style.transform;
                    scaledAncestor.style.transform = "none";
                    break;
                }
                scaledAncestor = scaledAncestor.parentElement;
            }

            await new Promise((r) => requestAnimationFrame(() => r(null)));

            const canvas = await html2canvas(node, {
                scale: 3,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
            });

            if (scaledAncestor) {
                scaledAncestor.style.transform = previousTransform;
            }

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "pt",
                format: "letter",
                compress: true,
            });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const y = imgHeight < pageHeight ? (pageHeight - imgHeight) / 2 : 0;

            pdf.addImage(
                canvas.toDataURL("image/jpeg", 0.95),
                "JPEG",
                0,
                y,
                imgWidth,
                imgHeight,
            );

            const pdfBlob: Blob = pdf.output("blob");
            const documentName =
                clearance?.document_name ||
                `Barangay_Clearance_${clearance.reference_number}.pdf`;

            const formData = new FormData();
            formData.append("pdf", pdfBlob, documentName);
            formData.append("document_name", documentName);

            await api.post(
                `/web/clearance/${clearance.id}/upload-pdf`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                },
            );

            toast.success(
                "PDF saved. It is now available for the resident to download.",
            );
            setIsSaved(true);
            onSaved?.();
        } catch (err: any) {
            console.error("Save PDF error:", err);
            toast.error(
                err?.response?.data?.message || "Failed to save PDF to server",
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
            <div className="fixed top-4 right-4 z-[10000] flex items-center gap-2">
                <button
                    onClick={handleSaveToServer}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-colors border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                            <span className="text-sm font-medium text-slate-700">
                                Saving…
                            </span>
                        </>
                    ) : isSaved ? (
                        <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                                Saved to Server
                            </span>
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 text-slate-700" />
                            <span className="text-sm font-medium text-slate-700">
                                Save PDF to Server
                            </span>
                        </>
                    )}
                </button>

                <button
                    onClick={onClose}
                    className="p-3 bg-white rounded-full shadow-lg hover:bg-slate-100 transition-colors border border-slate-200"
                    aria-label="Close preview"
                >
                    <X className="w-5 h-5 text-slate-700" />
                </button>
            </div>

            <div ref={wrapperRef} className="min-h-screen w-full px-6 py-12">
                <div className="flex justify-center">
                    <div
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: "top center",
                            width: 800,
                            height: scale < 1 ? `${1050 * scale}px` : "auto",
                            WebkitFontSmoothing: "antialiased",
                            textRendering: "geometricPrecision",
                        }}
                    >
                        <BarangayClearance initialFields={fields} />
                    </div>
                </div>
            </div>
        </div>
    );
}
