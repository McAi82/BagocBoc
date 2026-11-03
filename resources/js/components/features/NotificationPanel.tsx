// src/components/features/NotificationPanel.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  X,
  AlertCircle,
  MessageSquare,
  Loader2,
  Trash2,
} from "lucide-react";
import { useNotificationContext } from "../../contexts/NotificationContext";
import { formatTimeAgo } from "../../utils/format";

interface NotificationPanelProps {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    isPolling,
    markAsRead,
    markAllAsRead,
    remove,
  } = useNotificationContext();

  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.is_read);
    return notifications;
  }, [notifications, filter]);

  const handleClick = async (n: any) => {
    if (!n.is_read) await markAsRead(n.id);
    if (n.deep_link) {
      navigate(n.deep_link);
      onClose();
    }
  };

  const getIcon = (category: string) => {
    switch (category) {
      case "alert":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "certificate":
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case "clearance":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "payment":
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case "health":
        return <MessageSquare className="w-4 h-4 text-pink-500" />;
      case "announcement":
        return <MessageSquare className="w-4 h-4 text-amber-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-theme-primary" />;
    }
  };

  return (
    <div className="bg-theme-surface rounded-xl border border-theme shadow-xl overflow-hidden w-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-theme flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-theme-primary" />
          <h3 className="font-semibold text-theme-text">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
              {unreadCount} new
            </span>
          )}
          {isPolling && (
            <Loader2 className="w-3 h-3 text-theme-textSecondary animate-spin" />
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-theme-textSecondary hover:text-theme-text hover:bg-theme-hover transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="px-4 py-2 border-b border-theme bg-theme-background flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              filter === "all"
                ? "bg-theme-primary text-white"
                : "text-theme-textSecondary hover:bg-theme-hover"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              filter === "unread"
                ? "bg-theme-primary text-white"
                : "text-theme-textSecondary hover:bg-theme-hover"
            }`}
          >
            Unread
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 px-2 py-1 text-xs text-theme-primary hover:text-theme-secondary font-medium"
          >
            <CheckCheck className="w-3 h-3" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-theme-textSecondary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-theme-textSecondary">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`group px-4 py-3 border-b border-theme last:border-0 hover:bg-theme-hover transition-colors cursor-pointer ${
                !n.is_read ? "bg-theme-primary/5" : ""
              }`}
              onClick={() => handleClick(n)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">{getIcon(n.category)}</div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      !n.is_read ? "font-semibold" : "font-medium"
                    } text-theme-text truncate`}
                  >
                    {n.title}
                  </p>
                  <p className="text-xs text-theme-textSecondary line-clamp-2 mt-0.5">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-theme-textSecondary mt-1">
                    {formatTimeAgo(n.created_at)}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-theme-primary flex-shrink-0 mt-1.5" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(n.id);
                  }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 text-theme-textSecondary hover:text-red-600 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}