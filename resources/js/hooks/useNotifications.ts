// src/hooks/useNotifications.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { notificationApi } from "../api/endpoints";
import { useAuthStore } from "../stores/authStore";
import toast from "react-hot-toast";

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  category: string;
  deep_link?: string | null;
  priority: "low" | "normal" | "high";
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

interface PollResponse {
  notifications: AppNotification[];
  unread_count: number;
  latest_id: number;
  has_new: boolean;
}

interface UseNotificationsOptions {
  /** Poll interval in ms (default 20000 = 20 s) */
  interval?: number;
  /** Show a toast when a new notification arrives (default true) */
  showToasts?: boolean;
  /** Only show toasts for high-priority notifications (default false) */
  onlyHighPriorityToasts?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    interval = 20000,
    showToasts = true,
    onlyHighPriorityToasts = false,
  } = options;

  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Highest notification ID we've already seen (used as `since_id`)
  const lastSeenIdRef = useRef<number>(0);

  // Track which notification IDs we've already toasted to avoid duplicates
  const toastedIdsRef = useRef<Set<number>>(new Set());

  // ============================================
  // CORE FETCH
  // ============================================
  const fetchNotifications = useCallback(
    async (silent = false) => {
      if (!token || !isAuthenticated) return;

      if (!silent) setIsPolling(true);

      try {
        const response = await notificationApi.poll(
          lastSeenIdRef.current,
          20,
        );
        const payload: PollResponse =
          response?.data?.data || response?.data || {};

        const incoming: AppNotification[] = payload.notifications || [];
        const newUnread = payload.unread_count ?? 0;

        // ------------------------------------------------------------
        // Filter out notifications we've already seen so we don't
        // duplicate them in state or show duplicate toasts.
        // ------------------------------------------------------------
        const trulyNew = incoming.filter(
          (n) => !toastedIdsRef.current.has(n.id),
        );

        if (incoming.length > 0) {
          // Prepend new notifications, dedupe by id
          setNotifications((prev) => {
            const combined = [...incoming, ...prev];
            const seen = new Set<number>();
            return combined.filter((n) => {
              if (seen.has(n.id)) return false;
              seen.add(n.id);
              return true;
            });
          });

          // Remember the highest ID we've now seen
          const maxId = incoming.reduce(
            (m, n) => (n.id > m ? n.id : m),
            lastSeenIdRef.current,
          );
          lastSeenIdRef.current = maxId;
        }

        setUnreadCount(newUnread);

        // ------------------------------------------------------------
        // Toasts — only for genuinely new (never-toasted) notifications,
        // and only when the tab is visible (so background tabs stay quiet).
        // ------------------------------------------------------------
        if (
          showToasts &&
          trulyNew.length > 0 &&
          typeof document !== "undefined" &&
          document.visibilityState === "visible"
        ) {
          trulyNew.forEach((n) => {
            if (onlyHighPriorityToasts && n.priority !== "high") return;

            // Mark as toasted immediately (even if we decide not to toast)
            toastedIdsRef.current.add(n.id);

            const emoji =
              n.priority === "high"
                ? "🚨"
                : n.category === "certificate"
                  ? "📄"
                  : n.category === "clearance"
                    ? "🧾"
                    : n.category === "payment"
                      ? "💰"
                      : n.category === "health"
                        ? "🏥"
                        : n.category === "announcement"
                          ? "📢"
                          : "🔔";

            toast(`${emoji} ${n.title}`, {
              duration: 6000,
              position: "top-right",
            });
          });
        } else {
          // Still mark them as toasted so we don't toast on a later poll
          trulyNew.forEach((n) => toastedIdsRef.current.add(n.id));
        }
      } catch (err) {
        // Silent failures — don't spam the console on network blips
        if (import.meta.env.DEV) {
          console.warn("Notification poll failed:", err);
        }
      } finally {
        setIsPolling(false);
        setIsInitializing(false);
      }
    },
    [token, isAuthenticated, showToasts, onlyHighPriorityToasts],
  );

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    if (!token || !isAuthenticated) {
      // Reset everything when logged out
      setNotifications([]);
      setUnreadCount(0);
      lastSeenIdRef.current = 0;
      toastedIdsRef.current.clear();
      setIsInitializing(false);
      return;
    }

    // First fetch: get the full recent history (no `since_id`)
    lastSeenIdRef.current = 0;
    toastedIdsRef.current.clear();
    fetchNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated]);

  // ============================================
  // POLLING LOOP
  // ============================================
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(async () => {
        // Pause polling when tab is hidden (saves bandwidth)
        if (
          typeof document !== "undefined" &&
          document.visibilityState === "hidden"
        ) {
          schedule();
          return;
        }

        await fetchNotifications(true);
        schedule();
      }, interval);
    };

    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [token, isAuthenticated, interval, fetchNotifications]);

  // ============================================
  // RESUME POLLING IMMEDIATELY WHEN TAB IS FOCUSED
  // ============================================
  useEffect(() => {
    const onVisible = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        token &&
        isAuthenticated
      ) {
        fetchNotifications(true);
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [token, isAuthenticated, fetchNotifications]);

  // ============================================
  // ACTIONS
  // ============================================
  const markAsRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
      ),
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await notificationApi.markRead(id);
    } catch (err) {
      // Revert on failure by re-fetching
      fetchNotifications(true);
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      })),
    );
    setUnreadCount(0);

    try {
      await notificationApi.markAllRead();
    } catch (err) {
      fetchNotifications(true);
    }
  }, [fetchNotifications]);

  const remove = useCallback(async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => {
      const wasUnread = !notifications.find((n) => n.id === id)?.is_read;
      return wasUnread ? Math.max(0, c - 1) : c;
    });

    try {
      await notificationApi.delete(id);
    } catch (err) {
      fetchNotifications(true);
    }
  }, [notifications, fetchNotifications]);

  const refresh = useCallback(
    () => fetchNotifications(false),
    [fetchNotifications],
  );

  return {
    notifications,
    unreadCount,
    isLoading: isInitializing,
    isPolling,
    markAsRead,
    markAllAsRead,
    remove,
    refresh,
  };
}