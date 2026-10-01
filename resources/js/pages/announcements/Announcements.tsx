// pages/announcements/Announcements.tsx

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  Inbox,
  Users,
  User,
  CheckCircle,
  ChevronDown,
  Info,
  Bell,
  BellRing,
  Target,
  Sparkles,
  FileText,
  Image,
  Link as LinkIcon,
  Send,
  Lock,
} from "lucide-react";
import { api } from "../../api/apiClient";
import { useAuthStore } from "../../stores/authStore";
import { formatDate, getStatusColor } from "../../utils/format";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

/* ============================================================
   ROLE CONSTANTS
   ============================================================ */
const MANAGE_ROLES = ["Super Admin", "Barangay Captain"];

const TARGET_GROUPS = [
  {
    value: "All",
    label: "All Residents",
    description: "Everyone in the barangay",
    icon: Users,
    color: "blue",
  },
  {
    value: "Youth",
    label: "Youth",
    description: "Ages 15-30",
    icon: User,
    color: "purple",
  },
  {
    value: "Senior Citizens",
    label: "Senior Citizens",
    description: "Ages 60 and above",
    icon: User,
    color: "amber",
  },
  {
    value: "Heads of Family",
    label: "Heads of Family",
    description: "Household heads",
    icon: Users,
    color: "green",
  },
  {
    value: "Voters",
    label: "Voters",
    description: "Registered voters",
    icon: CheckCircle,
    color: "teal",
  },
  {
    value: "Pregnant Women",
    label: "Pregnant Women",
    description: "Expecting mothers",
    icon: User,
    color: "pink",
  },
  {
    value: "Lactating Mothers",
    label: "Lactating Mothers",
    description: "Breastfeeding mothers",
    icon: User,
    color: "rose",
  },
];

const PRIORITIES = [
  {
    value: "low",
    label: "Low",
    description: "General information",
    color: "green",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Important notice",
    color: "yellow",
  },
  {
    value: "high",
    label: "High",
    description: "Urgent announcement",
    color: "red",
  },
];

const STATUSES = [
  {
    value: "Published",
    label: "Published",
    description: "Visible to residents immediately",
    color: "green",
  },
  {
    value: "Draft",
    label: "Draft",
    description: "Save as draft, publish later",
    color: "gray",
  },
  {
    value: "Archived",
    label: "Archived",
    description: "Hidden from residents",
    color: "slate",
  },
];

export default function Announcements() {
  /* ============================================================
     ROLE CHECK
     ============================================================ */
  const user = useAuthStore((s) => s.user);
  const userRoles = user?.roles?.map((r: any) => r.name) || [];
  const canManage = userRoles.some((role) => MANAGE_ROLES.includes(role));

  /* ============================================================
     STATE
     ============================================================ */
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const targetDropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    target_group: "All",
    priority: "medium",
    status: "Published",
    expires_at: "",
    action_url: "",
    image_url: "",
  });

  /* ============================================================
     EFFECTS
     ============================================================ */

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter, itemsPerPage]);

  // Close target dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        targetDropdownRef.current &&
        !targetDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTargetDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ============================================================
     HELPERS
     ============================================================ */
  const extractData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.announcements && Array.isArray(data.announcements))
      return data.announcements;
    if (data?.data?.data && Array.isArray(data.data.data))
      return data.data.data;
    if (data?.data?.announcements && Array.isArray(data.data.announcements))
      return data.data.announcements;

    const findArray = (obj: any): any[] => {
      if (!obj) return [];
      if (Array.isArray(obj)) return obj;
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          if (
            ["message", "status", "success", "errors", "meta", "links"].includes(
              key,
            )
          )
            continue;
          const result = findArray(obj[key]);
          if (result.length > 0) return result;
        }
      }
      return [];
    };
    return findArray(data);
  };

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await api.get("/web/announcements");
      const data = extractData(response.data);
      setAnnouncements(data);
    } catch (error) {
      console.error("❌ [Announcements] Error:", error);
      setIsError(true);
      toast.error("Failed to load announcements");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  /* ============================================================
     FILTERED ANNOUNCEMENTS
     ============================================================ */
  const filteredAnnouncements = useMemo(() => {
    if (!Array.isArray(announcements) || announcements.length === 0) return [];
    let filtered = [...announcements];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a: any) => {
        const title = a.title?.toLowerCase() || "";
        const message = a.message?.toLowerCase() || "";
        const targetGroup = a.target_group?.toLowerCase() || "";
        return (
          title.includes(query) ||
          message.includes(query) ||
          targetGroup.includes(query)
        );
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((a: any) => a.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((a: any) => a.priority === priorityFilter);
    }

    return filtered;
  }, [announcements, searchQuery, statusFilter, priorityFilter]);

  /* ============================================================
     PAGINATION
     ============================================================ */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAnnouncements.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(
    startIndex + itemsPerPage,
    filteredAnnouncements.length,
  );
  const paginatedAnnouncements = useMemo(
    () => filteredAnnouncements.slice(startIndex, endIndex),
    [filteredAnnouncements, startIndex, endIndex],
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  /* ============================================================
     FORM HANDLERS
     ============================================================ */
  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      target_group: "All",
      priority: "medium",
      status: "Published",
      expires_at: "",
      action_url: "",
      image_url: "",
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title?.trim()) errors.title = "Title is required";
    if (!formData.message?.trim()) errors.message = "Message is required";
    if (!formData.target_group)
      errors.target_group = "Target group is required";
    if (!formData.priority) errors.priority = "Priority is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!canManage) {
      toast.error("You don't have permission to create announcements");
      return;
    }
    if (!validateForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        target_group: formData.target_group,
        priority: formData.priority,
        status: formData.status,
        expires_at: formData.expires_at || null,
        action_url: formData.action_url || null,
        image_url: formData.image_url || null,
      };
      await api.post("/web/announcements", payload);
      toast.success("Announcement created successfully!");
      setShowCreateModal(false);
      resetForm();
      fetchAnnouncements();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const newErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach((key) => {
          newErrors[key] = apiErrors[key][0];
        });
        setFormErrors(newErrors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to create announcement",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!canManage) {
      toast.error("You don't have permission to update announcements");
      return;
    }
    if (!selectedAnnouncement) return;
    if (!validateForm()) {
      toast.error("Please fix the errors below");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        target_group: formData.target_group,
        priority: formData.priority,
        status: formData.status,
        expires_at: formData.expires_at || null,
        action_url: formData.action_url || null,
        image_url: formData.image_url || null,
      };
      await api.put(`/web/announcements/${selectedAnnouncement.id}`, payload);
      toast.success("Announcement updated successfully!");
      setShowEditModal(false);
      resetForm();
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const newErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach((key) => {
          newErrors[key] = apiErrors[key][0];
        });
        setFormErrors(newErrors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to update announcement",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage) {
      toast.error("You don't have permission to delete announcements");
      return;
    }
    if (!selectedAnnouncement) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/web/announcements/${selectedAnnouncement.id}`);
      toast.success("Announcement deleted successfully");
      setShowDeleteModal(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (error) {
      toast.error("Failed to delete announcement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (announcement: any) => {
    if (!canManage) return;
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title || "",
      message: announcement.message || "",
      target_group: announcement.target_group || "All",
      priority: announcement.priority || "medium",
      status: announcement.status || "Published",
      expires_at: announcement.expires_at?.split("T")[0] || "",
      action_url: announcement.action_url || "",
      image_url: announcement.image_url || "",
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleView = (announcement: any) => {
    setSelectedAnnouncement(announcement);
    setShowViewModal(true);
  };

  /* ============================================================
     STYLE HELPERS
     ============================================================ */
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      medium:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    };
    return (
      colors[priority] ||
      "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
    );
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <BellRing className="w-3 h-3" />;
      case "medium":
        return <Bell className="w-3 h-3" />;
      default:
        return <Bell className="w-3 h-3" />;
    }
  };

  const getTargetGroupInfo = (value: string) => {
    return TARGET_GROUPS.find((t) => t.value === value) || TARGET_GROUPS[0];
  };

  const getTargetColor = (value: string) => {
    const colors: Record<string, string> = {
      All: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      Youth:
        "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      "Senior Citizens":
        "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      "Heads of Family":
        "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
      Voters:
        "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800",
      "Pregnant Women":
        "bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800",
      "Lactating Mothers":
        "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    };
    return colors[value] || colors["All"];
  };

  /* ============================================================
     RENDER — LOADING / ERROR
     ============================================================ */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading announcements...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-theme-text">
            Failed to Load Announcements
          </h3>
          <button
            onClick={fetchAnnouncements}
            className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDER — MAIN
     ============================================================ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">Announcements</h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            {canManage
              ? "Create and manage announcements for all residents"
              : "Stay updated with barangay announcements"}
          </p>
        </div>

        {/* ✅ Only managers can create */}
        {canManage ? (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Announcement
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-theme-background border border-theme rounded-lg text-theme-textSecondary text-sm">
            <Lock className="w-4 h-4" />
            View-only access
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Total</p>
          <p className="text-2xl font-bold text-theme-text">
            {announcements.length}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Published</p>
          <p className="text-2xl font-bold text-green-600">
            {announcements.filter((a: any) => a.status === "Published").length}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">Drafts</p>
          <p className="text-2xl font-bold text-gray-600">
            {announcements.filter((a: any) => a.status === "Draft").length}
          </p>
        </div>
        <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
          <p className="text-sm text-theme-textSecondary">High Priority</p>
          <p className="text-2xl font-bold text-red-600">
            {announcements.filter((a: any) => a.priority === "high").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-theme-surface rounded-xl border border-theme p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            <option value="all">All Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>

        {filteredAnnouncements.length > 0 && (
          <div className="mt-3 pt-3 border-t border-theme flex items-center justify-between text-sm text-theme-textSecondary flex-wrap gap-2">
            <span>
              Showing{" "}
              <span className="font-semibold text-theme-text">
                {startIndex + 1}–{endIndex}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-theme-text">
                {filteredAnnouncements.length}
              </span>
            </span>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Announcements Grid */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Inbox className="w-16 h-16 text-theme-textSecondary/30" />
            <h3 className="text-lg font-semibold text-theme-text">
              No Announcements Found
            </h3>
            <p className="text-sm text-theme-textSecondary max-w-md">
              {canManage
                ? "No announcements have been created yet."
                : "There are no announcements to display right now."}
            </p>
            {canManage && (
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="mt-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-2" /> Create Your First
                Announcement
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            {paginatedAnnouncements.map((announcement: any) => {
              const targetInfo = getTargetGroupInfo(announcement.target_group);
              const TargetIcon = targetInfo.icon;

              return (
                <div
                  key={announcement.id}
                  className="bg-theme-surface rounded-xl border border-theme shadow-sm hover:shadow-md transition-all p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${getPriorityColor(
                            announcement.priority,
                          )}`}
                        >
                          {getPriorityIcon(announcement.priority)}
                          {announcement.priority}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full ${getStatusColor(
                            announcement.status,
                          )}`}
                        >
                          {announcement.status}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${getTargetColor(
                            announcement.target_group,
                          )}`}
                        >
                          <TargetIcon className="w-3 h-3" />
                          {announcement.target_group}
                        </span>
                      </div>
                      <h3 className="font-semibold text-theme-text text-lg truncate">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-theme-textSecondary mt-2 line-clamp-2">
                        {announcement.message}
                      </p>
                    </div>

                    {/* ✅ Action buttons — always allow View; Edit/Delete only for managers */}
                    <div className="flex gap-1 ml-4">
                      <button
                        onClick={() => handleView(announcement)}
                        className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {canManage && (
                        <>
                          <button
                            onClick={() => handleEdit(announcement)}
                            className="p-1.5 text-theme-textSecondary hover:text-theme-primary hover:bg-theme-primary/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 text-theme-textSecondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-theme-textSecondary">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {announcement.created_at
                        ? formatDate(announcement.created_at)
                        : "N/A"}
                    </span>
                    {announcement.expires_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires: {formatDate(announcement.expires_at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredAnnouncements.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* CREATE MODAL — managers only                                */}
      {/* ============================================================ */}
      {canManage && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          title="Create Announcement"
          size="lg"
        >
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-400">
                This announcement will be delivered to{" "}
                <strong>all users</strong> via in-app notifications. The target
                group is used for filtering and record-keeping.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${formErrors.title ? "border-red-500" : "border-theme"
                  }`}
                placeholder="e.g., Barangay Assembly Meeting"
              />
              {formErrors.title && (
                <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={4}
                className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${formErrors.message ? "border-red-500" : "border-theme"
                  }`}
                placeholder="Write your announcement message here..."
              />
              {formErrors.message && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.message}
                </p>
              )}
              <p className="text-xs text-theme-textSecondary mt-1">
                {formData.message.length} characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Target Audience <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={targetDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                  className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors flex items-center justify-between ${formErrors.target_group ? "border-red-500" : "border-theme"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {(() => {
                      const info = getTargetGroupInfo(formData.target_group);
                      const Icon = info.icon;
                      return (
                        <>
                          <div
                            className={`p-1.5 rounded-lg ${getTargetColor(
                              formData.target_group,
                            )}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-medium">{info.label}</span>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-theme-textSecondary transition-transform ${showTargetDropdown ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {showTargetDropdown && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-theme-surface border border-theme rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    {TARGET_GROUPS.map((group) => {
                      const Icon = group.icon;
                      const isSelected = formData.target_group === group.value;
                      return (
                        <button
                          key={group.value}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              target_group: group.value,
                            });
                            setShowTargetDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors border-b border-theme last:border-0 flex items-center gap-3 ${isSelected ? "bg-theme-primary/10" : ""
                            }`}
                        >
                          <div
                            className={`p-2 rounded-lg border ${getTargetColor(
                              group.value,
                            )}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-theme-text">
                              {group.label}
                            </p>
                            <p className="text-xs text-theme-textSecondary">
                              {group.description}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-theme-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {formErrors.target_group && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.target_group}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Priority <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((priority) => {
                  const isSelected = formData.priority === priority.value;
                  const colorClasses: Record<string, string> = {
                    low: isSelected
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-theme-surface text-theme-textSecondary border-theme hover:bg-green-50 dark:hover:bg-green-900/20",
                    medium: isSelected
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-theme-surface text-theme-textSecondary border-theme hover:bg-yellow-50 dark:hover:bg-yellow-900/20",
                    high: isSelected
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-theme-surface text-theme-textSecondary border-theme hover:bg-red-50 dark:hover:bg-red-900/20",
                  };
                  return (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, priority: priority.value })
                      }
                      className={`px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${colorClasses[priority.value]}`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {priority.value === "high" && (
                          <BellRing className="w-3.5 h-3.5" />
                        )}
                        {priority.value === "medium" && (
                          <Bell className="w-3.5 h-3.5" />
                        )}
                        {priority.value === "low" && (
                          <Bell className="w-3.5 h-3.5" />
                        )}
                        {priority.label}
                      </div>
                      <p className="text-xs mt-0.5 opacity-80">
                        {priority.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STATUSES.map((status) => {
                  const isSelected = formData.status === status.value;
                  return (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, status: status.value })
                      }
                      className={`px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${isSelected
                        ? "bg-theme-primary text-white border-theme-primary"
                        : "bg-theme-surface text-theme-textSecondary border-theme hover:bg-theme-hover"
                        }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {status.value === "Published" && (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        {status.value === "Draft" && (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        {status.value === "Archived" && (
                          <Inbox className="w-3.5 h-3.5" />
                        )}
                        {status.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Expiry Date{" "}
                <span className="text-theme-textSecondary text-xs font-normal">
                  (Optional)
                </span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) =>
                    setFormData({ ...formData, expires_at: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Action URL{" "}
                <span className="text-theme-textSecondary text-xs font-normal">
                  (Optional)
                </span>
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type="url"
                  value={formData.action_url}
                  onChange={(e) =>
                    setFormData({ ...formData, action_url: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  placeholder="https://example.com/register"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Image URL{" "}
                <span className="text-theme-textSecondary text-xs font-normal">
                  (Optional)
                </span>
              </label>
              <div className="relative">
                <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {(formData.title || formData.message) && (
              <div className="p-4 bg-theme-background border border-theme rounded-lg">
                <p className="text-xs font-medium text-theme-textSecondary mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Preview
                </p>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${getPriorityColor(
                      formData.priority,
                    )}`}
                  >
                    {getPriorityIcon(formData.priority)}
                    {formData.priority}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${getTargetColor(
                      formData.target_group,
                    )}`}
                  >
                    <Target className="w-3 h-3" />
                    {formData.target_group}
                  </span>
                </div>
                <p className="font-semibold text-theme-text">
                  {formData.title || "Untitled"}
                </p>
                <p className="text-sm text-theme-textSecondary mt-1 line-clamp-2">
                  {formData.message || "No message"}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-theme">
            <button
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="px-4 py-2.5 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Publish Announcement
                </>
              )}
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* EDIT MODAL — managers only                                  */}
      {/* ============================================================ */}
      {canManage && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            resetForm();
            setSelectedAnnouncement(null);
          }}
          title="Edit Announcement"
          size="lg"
        >
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${formErrors.title ? "border-red-500" : "border-theme"
                  }`}
              />
              {formErrors.title && (
                <p className="text-sm text-red-500 mt-1">{formErrors.title}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={4}
                className={`w-full px-4 py-2.5 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${formErrors.message ? "border-red-500" : "border-theme"
                  }`}
              />
              {formErrors.message && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Target Audience <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={targetDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                  className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {(() => {
                      const info = getTargetGroupInfo(formData.target_group);
                      const Icon = info.icon;
                      return (
                        <>
                          <div
                            className={`p-1.5 rounded-lg ${getTargetColor(
                              formData.target_group,
                            )}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-medium">{info.label}</span>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-theme-textSecondary transition-transform ${showTargetDropdown ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {showTargetDropdown && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-theme-surface border border-theme rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    {TARGET_GROUPS.map((group) => {
                      const Icon = group.icon;
                      const isSelected = formData.target_group === group.value;
                      return (
                        <button
                          key={group.value}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              target_group: group.value,
                            });
                            setShowTargetDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors border-b border-theme last:border-0 flex items-center gap-3 ${isSelected ? "bg-theme-primary/10" : ""
                            }`}
                        >
                          <div
                            className={`p-2 rounded-lg border ${getTargetColor(
                              group.value,
                            )}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-theme-text">
                              {group.label}
                            </p>
                            <p className="text-xs text-theme-textSecondary">
                              {group.description}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-theme-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Priority <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((priority) => {
                  const isSelected = formData.priority === priority.value;
                  const colorClasses: Record<string, string> = {
                    low: isSelected
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-theme-surface text-theme-textSecondary border-theme",
                    medium: isSelected
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-theme-surface text-theme-textSecondary border-theme",
                    high: isSelected
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-theme-surface text-theme-textSecondary border-theme",
                  };
                  return (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, priority: priority.value })
                      }
                      className={`px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${colorClasses[priority.value]}`}
                    >
                      {priority.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STATUSES.map((status) => {
                  const isSelected = formData.status === status.value;
                  return (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, status: status.value })
                      }
                      className={`px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${isSelected
                        ? "bg-theme-primary text-white border-theme-primary"
                        : "bg-theme-surface text-theme-textSecondary border-theme hover:bg-theme-hover"
                        }`}
                    >
                      {status.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1.5">
                Expiry Date
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) =>
                  setFormData({ ...formData, expires_at: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-theme">
            <button
              onClick={() => {
                setShowEditModal(false);
                resetForm();
                setSelectedAnnouncement(null);
              }}
              className="px-4 py-2.5 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* VIEW MODAL — all users                                       */}
      {/* ============================================================ */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedAnnouncement(null);
        }}
        title="Announcement Details"
        size="lg"
      >
        {selectedAnnouncement && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${getPriorityColor(
                  selectedAnnouncement.priority,
                )}`}
              >
                {getPriorityIcon(selectedAnnouncement.priority)}
                {selectedAnnouncement.priority}
              </span>
              <span
                className={`inline-block px-2 py-0.5 text-xs rounded-full ${getStatusColor(
                  selectedAnnouncement.status,
                )}`}
              >
                {selectedAnnouncement.status}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${getTargetColor(
                  selectedAnnouncement.target_group,
                )}`}
              >
                <Target className="w-3 h-3" />
                {selectedAnnouncement.target_group}
              </span>
            </div>
            <h3 className="text-xl font-bold text-theme-text">
              {selectedAnnouncement.title}
            </h3>
            <p className="text-theme-textSecondary whitespace-pre-wrap">
              {selectedAnnouncement.message}
            </p>
            <div className="pt-4 border-t border-theme grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-theme-textSecondary">Created</p>
                <p className="font-medium text-theme-text">
                  {selectedAnnouncement.created_at
                    ? formatDate(selectedAnnouncement.created_at)
                    : "N/A"}
                </p>
              </div>
              {selectedAnnouncement.expires_at && (
                <div>
                  <p className="text-theme-textSecondary">Expires</p>
                  <p className="font-medium text-theme-text">
                    {formatDate(selectedAnnouncement.expires_at)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-theme">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedAnnouncement(null);
                }}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================ */}
      {/* DELETE MODAL — managers only                                 */}
      {/* ============================================================ */}
      {canManage && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedAnnouncement(null);
          }}
          title="Delete Announcement"
        >
          <div className="space-y-4">
            <p className="text-theme-textSecondary">
              Are you sure you want to delete this announcement? This action
              cannot be undone.
            </p>
            {selectedAnnouncement && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-medium text-theme-text">
                  {selectedAnnouncement.title}
                </p>
                <p className="text-sm text-theme-textSecondary line-clamp-2">
                  {selectedAnnouncement.message}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAnnouncement(null);
                }}
                className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}