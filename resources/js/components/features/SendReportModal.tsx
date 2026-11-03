// components/features/SendReportModal.tsx

import React, { useMemo, useState } from "react";
import {
  Send,
  Loader2,
  AlertCircle,
  FileText,
  Calendar,
  Hash,
  CheckCircle,
} from "lucide-react";
import Modal from "../ui/Modal";

export interface SendReportPayload {
  report_type: string;
  title: string;
  content: string;
  period: string;
  metadata: Record<string, any>;
}

interface SendReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: SendReportPayload | null;
  onSend: (payload: SendReportPayload) => Promise<void>;
  /** Optional label to describe what's being sent (e.g. "Certificate Report") */
  reportLabel?: string;
}

export default function SendReportModal({
  isOpen,
  onClose,
  payload,
  onSend,
  reportLabel = "Report",
}: SendReportModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const referenceNumber = useMemo(() => {
    if (!isOpen) return "";
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `RPT-${y}${m}${d}-${hh}${mm}${ss}`;
  }, [isOpen]);

  const handleSend = async () => {
    if (!payload) return;
    setIsSending(true);
    setError(null);
    try {
      const enrichedPayload: SendReportPayload = {
        ...payload,
        metadata: {
          ...payload.metadata,
          reference_number: referenceNumber,
          sent_at: new Date().toISOString(),
        },
      };
      await onSend(enrichedPayload);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to send report. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (isSending) return;
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen || !payload) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Send ${reportLabel} to Captain`} size="lg">
      {success ? (
        <div className="py-10 text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-theme-text">
            Report Sent Successfully
          </h3>
          <p className="text-sm text-theme-textSecondary max-w-sm mx-auto">
            The {reportLabel.toLowerCase()} has been submitted to the Barangay
            Captain for review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview header */}
          <div className="bg-theme-primary/5 border border-theme-primary/20 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-theme-primary/10">
              <FileText className="w-5 h-5 text-theme-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-theme-text">
                {payload.title}
              </p>
              <p className="text-xs text-theme-textSecondary mt-0.5">
                {reportLabel} will be submitted to the Barangay Captain
              </p>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-theme-background rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Hash className="w-3 h-3 text-theme-textSecondary" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-textSecondary">
                  Reference #
                </p>
              </div>
              <p className="text-sm font-mono font-medium text-theme-text">
                {referenceNumber}
              </p>
            </div>
            <div className="bg-theme-background rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 text-theme-textSecondary" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-textSecondary">
                  Period
                </p>
              </div>
              <p className="text-sm font-medium text-theme-text truncate">
                {payload.period}
              </p>
            </div>
          </div>

          {/* Content preview */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-textSecondary mb-2">
              Report Content
            </p>
            <div className="bg-theme-background rounded-lg p-3 max-h-48 overflow-y-auto">
              <pre className="text-xs text-theme-text whitespace-pre-wrap font-mono">
                {payload.content}
              </pre>
            </div>
          </div>

          {/* Metadata preview (only if there's something worth showing) */}
          {Object.keys(payload.metadata || {}).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-theme-textSecondary mb-2">
                Attached Metadata
              </p>
              <div className="bg-theme-background rounded-lg p-3 max-h-32 overflow-y-auto">
                <pre className="text-[10px] text-theme-textSecondary whitespace-pre-wrap font-mono">
                  {JSON.stringify(payload.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <button
              onClick={handleClose}
              disabled={isSending}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending}
              className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Confirm & Send
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}