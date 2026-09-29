// src/components/features/CertificatePreviewModal.tsx

import React, { useEffect, useRef, useState } from "react";
import { X, Save, Loader2, CheckCircle } from "lucide-react";
import {
  BarangayClearance,
  CertificateOfIndigency,
  CertificateOfGoodMoral,
  CertificateOfEmployment,
  CertificateOfResidency,
} from "../certificates";
import {
  resolveCertificateKind,
  buildCertificateFields,
} from "../../utils/certificateMapper";
import { uploadCertificationPdf } from "../../api/certificationApi";
import toast from "react-hot-toast";

interface CertificatePreviewModalProps {
  certification: any;
  onClose: () => void;
  onSaved?: () => void;
}

export default function CertificatePreviewModal({
  certification,
  onClose,
  onSaved,
}: CertificatePreviewModalProps) {
  const kind = resolveCertificateKind(
    certification?.certification_type?.name,
  );
  const fields = buildCertificateFields(kind, certification);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(!!certification?.document_path);

  // Auto-scale the certificate to fit the viewport
  useEffect(() => {
    const computeScale = () => {
      if (!wrapperRef.current) return;
      const availableWidth = wrapperRef.current.clientWidth;
      const maxWidth = availableWidth - 48;
      setScale(Math.min(1, maxWidth / 800));
    };
    computeScale();
    window.addEventListener("resize", computeScale);
    return () => window.removeEventListener("resize", computeScale);
  }, []);

  const renderCertificate = () => {
    const props = { initialFields: fields };
    switch (kind) {
      case "BarangayClearance":
        return <BarangayClearance {...props} />;
      case "CertificateOfIndigency":
        return <CertificateOfIndigency {...props} />;
      case "CertificateOfGoodMoral":
        return <CertificateOfGoodMoral {...props} />;
      case "CertificateOfEmployment":
        return <CertificateOfEmployment {...props} />;
      case "CertificateOfResidency":
        return <CertificateOfResidency {...props} />;
      default:
        return (
          <div className="p-8 text-center text-slate-500">
            No template available for this certificate type.
          </div>
        );
    }
  };

  const handleSaveToServer = async () => {
    setIsSaving(true);
    try {
      // Find the certificate DOM node
      const node =
        wrapperRef.current?.querySelector<HTMLElement>(
          "[data-certificate-root]",
        ) ??
        (wrapperRef.current?.firstElementChild as HTMLElement | null);

      if (!node) throw new Error("Certificate node not found");

      // Load html2canvas + jsPDF on demand
      const [{ default: html2canvas }, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const jsPDF = (jsPDFModule as any).jsPDF || (jsPDFModule as any).default;

      // Wait for all fonts
      if (document.fonts && (document.fonts as any).ready) {
        await (document.fonts as any).ready;
      }

      // Strip scale transform from any ancestor so capture is at full size
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

      if (scaledAncestor && previousTransform !== null) {
        scaledAncestor.style.transform = previousTransform;
      }

      // Build the PDF
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

      // ✅ Generate a Blob instead of base64 — no encoding issues
      const pdfBlob: Blob = pdf.output("blob");

      const documentName = certification?.certification_type?.name
        ? `${certification.certification_type.name}_${certification.reference_number}.pdf`
        : `certificate_${certification.reference_number}.pdf`;

      await uploadCertificationPdf(certification.id, pdfBlob, documentName);

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
            {renderCertificate()}
          </div>
        </div>
      </div>
    </div>
  );
}