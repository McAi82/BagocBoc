// src/components/features/UserRoleModal.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Search,
  X,
  Check,
  AlertCircle,
  Save,
  Loader2,
} from "lucide-react";
import Modal from "../ui/Modal";
import toast from "react-hot-toast";

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface UserRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  allRoles: Role[];
  onSave: (user: any, roleIds: number[]) => Promise<void>;
  mode: "change" | "add";
}

export default function UserRoleModal({
  isOpen,
  onClose,
  user,
  allRoles,
  onSave,
  mode,
}: UserRoleModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed selection when the modal opens
  useEffect(() => {
    if (!isOpen || !user) return;
    const existing = (user.roles || []).map((r: any) => r.id);
    setSelectedIds(existing);
    setSearch("");
    setError(null);
  }, [isOpen, user]);

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return allRoles;
    const q = search.toLowerCase();
    return allRoles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q),
    );
  }, [allRoles, search]);

  const toggleRole = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const added = useMemo(
    () =>
      selectedIds.filter(
        (id) => !(user?.roles || []).some((r: any) => r.id === id),
      ),
    [selectedIds, user],
  );

  const removed = useMemo(
    () =>
      (user?.roles || [])
        .filter((r: any) => !selectedIds.includes(r.id))
        .map((r: any) => r.id),
    [selectedIds, user],
  );

  const hasChanges = added.length > 0 || removed.length > 0;

  const handleSave = async () => {
    if (!user) return;
    if (!hasChanges) {
      toast.error("No changes to save");
      return;
    }
    if (selectedIds.length === 0) {
      setError("A user must have at least one role");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave(user, selectedIds);
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to update roles",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  const userName =
    user.resident?.first_name && user.resident?.last_name
      ? `${user.resident.first_name} ${user.resident.last_name}`
      : user.email;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "change" ? "Change User Roles" : "Add Roles to User"}
      size="lg"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 bg-theme-primary/5 border border-theme-primary/20 rounded-xl">
          <div className="p-2.5 rounded-lg bg-theme-primary/10">
            <Shield className="w-5 h-5 text-theme-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-theme-text">{userName}</p>
            <p className="text-xs text-theme-textSecondary">
              {user.email}
            </p>
            <p className="text-xs text-theme-textSecondary mt-1">
              Currently has{" "}
              <span className="font-medium text-theme-text">
                {(user.roles || []).length} role
                {(user.roles || []).length !== 1 ? "s" : ""}
              </span>
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
          <input
            type="text"
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text text-sm focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Roles list */}
        <div className="border border-theme rounded-lg max-h-80 overflow-y-auto divide-y divide-theme">
          {filteredRoles.length === 0 ? (
            <div className="px-4 py-10 text-center text-theme-textSecondary text-sm">
              No roles match "{search}"
            </div>
          ) : (
            filteredRoles.map((role) => {
              const isSelected = selectedIds.includes(role.id);
              const wasExisting = (user.roles || []).some(
                (r: any) => r.id === role.id,
              );
              const isNew = isSelected && !wasExisting;
              const isRemoving = !isSelected && wasExisting;

              return (
                <button
                  key={role.id}
                  onClick={() => toggleRole(role.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors flex items-center gap-3 ${
                    isSelected ? "bg-theme-primary/5" : ""
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? "bg-theme-primary border-theme-primary"
                        : "border-theme"
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-theme-text truncate">
                      {role.name}
                    </p>
                    {role.description && (
                      <p className="text-xs text-theme-textSecondary truncate">
                        {role.description}
                      </p>
                    )}
                  </div>
                  {isNew && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold">
                      ADD
                    </span>
                  )}
                  {isRemoving && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold">
                      REMOVE
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Change summary */}
        {hasChanges && (
          <div className="flex flex-wrap gap-3 text-xs">
            {added.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="font-semibold">+{added.length}</span>
                <span>to add</span>
              </div>
            )}
            {removed.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <span className="font-semibold">−{removed.length}</span>
                <span>to remove</span>
              </div>
            )}
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
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Roles
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}