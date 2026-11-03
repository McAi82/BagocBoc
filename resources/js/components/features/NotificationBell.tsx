// src/components/features/NotificationBell.tsx
import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNotificationContext } from "../../contexts/NotificationContext";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBell() {
  const { unreadCount, refresh } = useNotificationContext();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) refresh(); // fetch fresh data when opening
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-theme-hover transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-theme-textSecondary hover:text-theme-primary transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-theme-surface">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 z-50">
          <NotificationPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}