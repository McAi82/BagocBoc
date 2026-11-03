// components/ui/ConfirmationModal.tsx

import React from "react";
import { AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Modal from "./Modal";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info" | "success";
  isConfirming?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
  isConfirming = false,
}: ConfirmationModalProps) {
  const getIcon = () => {
    switch (type) {
      case "danger":
        return <XCircle className="w-12 h-12 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-12 h-12 text-amber-500" />;
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      default:
        return <AlertCircle className="w-12 h-12 text-blue-500" />;
    }
  };

  const getButtonColors = () => {
    switch (type) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500";
      case "success":
        return "bg-green-600 hover:bg-green-700 focus:ring-green-500";
      default:
        return "bg-theme-primary hover:opacity-90 focus:ring-theme-primary";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 flex items-center justify-center">
          {getIcon()}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-theme-text mb-2">{title}</h3>

        {/* Message */}
        <p className="text-sm text-theme-textSecondary mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${getButtonColors()}`}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
