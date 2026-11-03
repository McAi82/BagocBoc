// src/contexts/NotificationContext.tsx
import React, { createContext, useContext } from "react";
import { useNotifications } from "../hooks/useNotifications";

type NotificationContextValue = ReturnType<typeof useNotifications>;

const NotificationContext = createContext<NotificationContextValue | null>(
    null,
);

interface NotificationProviderProps {
    children: React.ReactNode;
    /** Poll interval in ms. Default: 20000 (20 s) */
    interval?: number;
}

export function NotificationProvider({
    children,
    interval = 20000,
}: NotificationProviderProps) {
    const value = useNotifications({
        interval,
        showToasts: true,
        onlyHighPriorityToasts: false,
    });

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotificationContext() {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        throw new Error(
            "useNotificationContext must be used within a NotificationProvider",
        );
    }
    return ctx;
}