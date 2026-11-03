// pages/dashboards/FrontDeskDashboard.tsx

import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  FileText,
  Calendar,
  QrCode,
  Receipt,
  LayoutDashboard,
  Clock,
  RefreshCw,
} from "lucide-react";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import toast from "react-hot-toast";

const tabs = [
  {
    id: "queue",
    label: "Queue",
    icon: Clock,
    path: "/barangay-bagocboc/frontdesk/queue",
  },
  {
    id: "requests",
    label: "Requests",
    icon: FileText,
    path: "/barangay-bagocboc/frontdesk/requests",
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: Calendar,
    path: "/barangay-bagocboc/frontdesk/appointments",
  },
  {
    id: "residents",
    label: "Residents",
    icon: Users,
    path: "/barangay-bagocboc/frontdesk/residents",
  },
  {
    id: "claims",
    label: "Claim Slips",
    icon: QrCode,
    path: "/barangay-bagocboc/frontdesk/claims",
  },
  {
    id: "tax",
    label: "Tax Records",
    icon: Receipt,
    path: "/barangay-bagocboc/frontdesk/tax",
  },
];

export default function FrontDeskDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [counts, setCounts] = useState({
    queue: 0,
    pendingRequests: 0,
    todayAppointments: 0,
    pendingClaims: 0,
    taxCount: 0,
  });

  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    if (data?.queue && Array.isArray(data.queue)) return data.queue;
    if (data?.requests && Array.isArray(data.requests)) return data.requests;
    if (data?.appointments && Array.isArray(data.appointments))
      return data.appointments;
    if (data?.claimSlips && Array.isArray(data.claimSlips))
      return data.claimSlips;
    if (data?.tax && Array.isArray(data.tax)) return data.tax;
    const findArray = (obj: any): any[] => {
      if (!obj) return [];
      if (Array.isArray(obj)) return obj;
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          const result = findArray(obj[key]);
          if (result.length > 0) return result;
        }
      }
      return [];
    };
    return findArray(data);
  };

  const fetchCounts = async () => {
    setIsLoading(true);
    try {
      const [queueRes, requestsRes, appointmentsRes, claimSlipsRes, taxRes] =
        await Promise.all([
          api.get("/web/frontdesk/queue"),
          api.get("/web/frontdesk/requests"),
          api.get("/web/frontdesk/appointments"),
          api.get("/web/frontdesk/claim-slips"),
          api.get("/web/tax-payments"),
        ]);

      const queue = extractData(queueRes.data);
      const requests = extractData(requestsRes.data);
      const appointments = extractData(appointmentsRes.data);
      const claimSlips = extractData(claimSlipsRes.data);
      const tax = extractData(taxRes.data);

      const today = new Date().toISOString().split("T")[0];

      setCounts({
        queue: queue.filter((q: any) => q.status === "waiting").length || 0,
        pendingRequests:
          requests.filter((r: any) => r.status === "pending").length || 0,
        todayAppointments:
          appointments.filter((a: any) => a.appointment_date === today)
            .length || 0,
        pendingClaims:
          claimSlips.filter((c: any) => c.status === "pending").length || 0,
        taxCount: tax.length || 0,
      });
    } catch (error) {
      console.error("Error fetching counts:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  const getActiveTab = () => {
    const path = location.pathname;
    const tab = tabs.find((t) => path.includes(t.id));
    return tab?.id || "queue";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Front Desk</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Manage resident requests, appointments, document issuance, and tax
            payments
          </p>
        </div>
        <button
          onClick={fetchCounts}
          className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
        >
          <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-textSecondary">
                Queue
              </p>
              <p className="text-2xl font-bold text-blue-600">{counts.queue}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-textSecondary">
                Pending Requests
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {counts.pendingRequests}
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-textSecondary">
                Today's Appointments
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {counts.todayAppointments}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-textSecondary">
                Pending Claims
              </p>
              <p className="text-2xl font-bold text-green-600">
                {counts.pendingClaims}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <QrCode className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-theme-textSecondary">
                Tax Records
              </p>
              <p className="text-2xl font-bold text-rose-600">
                {counts.taxCount}
              </p>
            </div>
            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <Receipt className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 flex-wrap border-b border-theme">
        {tabs.map((tab) => {
          const isActive = getActiveTab() === tab.id;
          const count = counts[tab.id as keyof typeof counts] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${isActive ? "bg-theme-primary text-white" : "bg-theme-surface text-theme-textSecondary hover:bg-theme-hover border border-theme"}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
              {count > 0 && (
                <span
                  className={`ml-1 px-2 py-0.5 text-xs rounded-full ${isActive ? "bg-white/20 text-white" : "bg-theme-background text-theme-textSecondary"}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
}
