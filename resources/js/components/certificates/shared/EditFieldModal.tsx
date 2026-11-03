// src/components/certificates/shared/EditFieldModal.tsx

import React, { useEffect, useState } from "react";

export interface EditFieldConfig {
  key: string;
  label: string;
  scope: "fields" | "org" | "member";
  memberIndex?: number;
  memberKey?: "name" | "committee";
  multiline?: boolean;
}

interface EditFieldModalProps {
  isOpen: boolean;
  config: EditFieldConfig | null;
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

export default function EditFieldModal({
  isOpen,
  config,
  initialValue,
  onSave,
  onClose,
}: EditFieldModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !config) return null;

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Edit {config.label}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update the field value and save to see the change in the
              certificate.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Value
          </label>
          {config.multiline ? (
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b7d3a]/40 focus:border-[#5b7d3a] transition-all resize-none"
              placeholder={`Enter ${config.label.toLowerCase()}`}
            />
          ) : (
            <input
              autoFocus
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#5b7d3a]/40 focus:border-[#5b7d3a] transition-all"
              placeholder={`Enter ${config.label.toLowerCase()}`}
            />
          )}
          <p className="text-[11px] text-slate-400 mt-2">
            Press <strong>Enter</strong> to save · <strong>Esc</strong> to
            cancel
          </p>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ background: "#5b7d3a" }}
          >
            Save Change
          </button>
        </div>
      </div>
    </div>
  );
}