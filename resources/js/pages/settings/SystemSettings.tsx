// pages/settings/SystemSettings.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  Building,
  Users,
  UserCog,
  Shield,
  Search,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Phone,
  Eye,
  EyeOff,
  UserPlus,
  Lock,
} from "lucide-react";
import { api } from "../../api/apiClient";
import { useAuthStore } from "../../stores/authStore";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import toast from "react-hot-toast";

type SettingsTab = "barangay" | "users" | "personnel" | "roles";

export default function SystemSettings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("barangay");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [barangayInfo, setBarangayInfo] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // ✅ Pagination for USERS
  const [usersPage, setUsersPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);

  // ✅ Pagination for PERSONNEL
  const [personnelPage, setPersonnelPage] = useState(1);
  const [personnelPerPage, setPersonnelPerPage] = useState(12);

  // ✅ Pagination for ROLES
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesPerPage, setRolesPerPage] = useState(12);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [barangayForm, setBarangayForm] = useState({
    name: "",
    captain_name: "",
    municipality: "",
    province: "",
    phone: "",
    email: "",
    address: "",
    barangay_secretary: "",
    barangay_treasurer: "",
    about_us: "",
    mission: "",
    vision: "",
  });

  const [userForm, setUserForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    email: "",
    phone_number: "",
    role_ids: [] as number[],
    password: "",
    password_confirmation: "",
  });

  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Reset page on filter change
  useEffect(() => {
    setUsersPage(1);
  }, [searchQuery, statusFilter, roleFilter, usersPerPage]);
  useEffect(() => {
    setPersonnelPage(1);
  }, [searchQuery, personnelPerPage]);
  useEffect(() => {
    setRolesPage(1);
  }, [rolesPerPage]);

  const extractArray = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.data?.data && Array.isArray(data.data.data))
      return data.data.data;
    if (data?.users && Array.isArray(data.users)) return data.users;
    if (data?.personnel && Array.isArray(data.personnel)) return data.personnel;
    if (data?.roles && Array.isArray(data.roles)) return data.roles;

    const findArray = (obj: any, depth = 0): any[] => {
      if (!obj || depth > 3) return [];
      if (Array.isArray(obj)) {
        if (
          obj.length > 0 &&
          (obj[0]?.id !== undefined ||
            obj[0]?.email !== undefined ||
            obj[0]?.name !== undefined)
        ) {
          return obj;
        }
        return [];
      }
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          if (
            ["message", "status", "success", "errors", "meta", "links"].includes(
              key,
            )
          )
            continue;
          const result = findArray(obj[key], depth + 1);
          if (result.length > 0) return result;
        }
      }
      return [];
    };
    return findArray(data);
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [barangayRes, usersRes, personnelRes, rolesRes] = await Promise.all([
        api.get("/web/barangay-info"),
        api.get("/web/users"),
        api.get("/web/personnel"),
        api.get("/web/roles"),
      ]);

      const barangayData = barangayRes.data?.data || barangayRes.data;
      setBarangayInfo(barangayData);
      setBarangayForm({
        name: barangayData?.name || "",
        captain_name: barangayData?.captain_name || "",
        municipality: barangayData?.municipality || "",
        province: barangayData?.province || "",
        phone: barangayData?.phone || "",
        email: barangayData?.email || "",
        address: barangayData?.address || "",
        barangay_secretary: barangayData?.barangay_secretary || "",
        barangay_treasurer: barangayData?.barangay_treasurer || "",
        about_us: barangayData?.about_us || "",
        mission: barangayData?.mission || "",
        vision: barangayData?.vision || "",
      });

      setUsers(extractArray(usersRes.data));
      setPersonnel(extractArray(personnelRes.data));
      setRoles(extractArray(rolesRes.data));
    } catch (error) {
      console.error("❌ Error fetching settings:", error);
      toast.error("Failed to load settings data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ✅ Filtered users
  const filteredUsers = useMemo(() => {
    let filtered = [...users];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((u: any) => {
        const firstName =
          u?.resident?.first_name?.toLowerCase() ||
          u?.first_name?.toLowerCase() ||
          "";
        const lastName =
          u?.resident?.last_name?.toLowerCase() ||
          u?.last_name?.toLowerCase() ||
          "";
        const email = u?.email?.toLowerCase() || "";
        return (
          firstName.includes(query) ||
          lastName.includes(query) ||
          email.includes(query)
        );
      });
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((u: any) => u?.account_status === statusFilter);
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter((u: any) => {
        if (!u?.roles || !Array.isArray(u.roles)) return false;
        return u.roles.some(
          (r: any) => r?.name === roleFilter || r?.id === parseInt(roleFilter),
        );
      });
    }
    return filtered;
  }, [users, searchQuery, statusFilter, roleFilter]);

  const allRoleNames = useMemo(() => {
    const roleSet = new Set<string>();
    users.forEach((u: any) => {
      if (u?.roles && Array.isArray(u.roles)) {
        u.roles.forEach((r: any) => {
          if (r?.name) roleSet.add(r.name);
        });
      }
    });
    return Array.from(roleSet);
  }, [users]);

  // ✅ Users pagination
  const usersTotalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / usersPerPage),
  );
  const usersStart = (usersPage - 1) * usersPerPage;
  const usersEnd = Math.min(usersStart + usersPerPage, filteredUsers.length);
  const paginatedUsers = useMemo(
    () => filteredUsers.slice(usersStart, usersEnd),
    [filteredUsers, usersStart, usersEnd],
  );

  // ✅ Personnel pagination
  const filteredPersonnel = useMemo(() => {
    if (!searchQuery) return personnel;
    const query = searchQuery.toLowerCase();
    return personnel.filter((p: any) => {
      const firstName = p?.resident?.first_name?.toLowerCase() || "";
      const lastName = p?.resident?.last_name?.toLowerCase() || "";
      const email = p?.email?.toLowerCase() || "";
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        email.includes(query)
      );
    });
  }, [personnel, searchQuery]);

  const personnelTotalPages = Math.max(
    1,
    Math.ceil(filteredPersonnel.length / personnelPerPage),
  );
  const personnelStart = (personnelPage - 1) * personnelPerPage;
  const personnelEnd = Math.min(
    personnelStart + personnelPerPage,
    filteredPersonnel.length,
  );
  const paginatedPersonnel = useMemo(
    () => filteredPersonnel.slice(personnelStart, personnelEnd),
    [filteredPersonnel, personnelStart, personnelEnd],
  );

  // ✅ Roles pagination
  const rolesTotalPages = Math.max(1, Math.ceil(roles.length / rolesPerPage));
  const rolesStart = (rolesPage - 1) * rolesPerPage;
  const rolesEnd = Math.min(rolesStart + rolesPerPage, roles.length);
  const paginatedRoles = useMemo(
    () => roles.slice(rolesStart, rolesEnd),
    [roles, rolesStart, rolesEnd],
  );

  useEffect(() => {
    if (usersPage > usersTotalPages) setUsersPage(usersTotalPages);
  }, [usersTotalPages, usersPage]);
  useEffect(() => {
    if (personnelPage > personnelTotalPages)
      setPersonnelPage(personnelTotalPages);
  }, [personnelTotalPages, personnelPage]);
  useEffect(() => {
    if (rolesPage > rolesTotalPages) setRolesPage(rolesTotalPages);
  }, [rolesTotalPages, rolesPage]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleBarangaySave = async () => {
    setIsSaving(true);
    try {
      await api.put("/web/barangay-info", barangayForm);
      toast.success("Barangay information updated successfully!");
      fetchAllData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update barangay info",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async () => {
    const errors: Record<string, string> = {};
    if (!userForm.first_name) errors.first_name = "First name is required";
    if (!userForm.last_name) errors.last_name = "Last name is required";
    if (!userForm.email) errors.email = "Email is required";
    if (!userForm.password) errors.password = "Password is required";
    if (userForm.password !== userForm.password_confirmation) {
      errors.password_confirmation = "Passwords do not match";
    }
    if (userForm.role_ids.length === 0)
      errors.role_ids = "Please select at least one role";

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the errors below");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/web/admin-users", {
        ...userForm,
        role_ids: userForm.role_ids,
        create_resident: true,
        password: userForm.password,
        password_confirmation: userForm.password_confirmation,
      });
      toast.success("User created successfully!");
      setShowUserModal(false);
      resetUserForm();
      fetchAllData();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(error?.response?.data?.message || "Failed to create user");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      const newStatus =
        user.account_status === "active" ? "inactive" : "active";
      await api.put(`/web/users/${user.id}`, { account_status: newStatus });
      toast.success(
        `User ${newStatus === "active" ? "activated" : "deactivated"}`,
      );
      fetchAllData();
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/web/users/${selectedItem.id}`);
      toast.success("User deleted successfully");
      setShowDeleteModal(false);
      setSelectedItem(null);
      fetchAllData();
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRole = async () => {
    if (!roleForm.name.trim()) {
      toast.error("Role name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/web/roles", roleForm);
      toast.success("Role created successfully!");
      setShowRoleModal(false);
      setRoleForm({ name: "", description: "" });
      fetchAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedItem) return;
    if (selectedItem.users_count > 0) {
      toast.error("Cannot delete role with existing users");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.delete(`/web/roles/${selectedItem.id}`);
      toast.success("Role deleted successfully");
      setShowDeleteModal(false);
      setSelectedItem(null);
      fetchAllData();
    } catch (error) {
      toast.error("Failed to delete role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetUserForm = () => {
    setUserForm({
      first_name: "",
      middle_name: "",
      last_name: "",
      suffix: "",
      email: "",
      phone_number: "",
      role_ids: [],
      password: "",
      password_confirmation: "",
    });
    setFormErrors({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading system settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">
            System Settings
          </h1>
          <p className="text-sm text-theme-textSecondary mt-1">
            Manage barangay information, users, personnel, and roles
          </p>
        </div>
        <button
          onClick={fetchAllData}
          className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
        >
          <RefreshCw className="w-4 h-4 text-theme-textSecondary" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-theme overflow-x-auto">
        {[
          { id: "barangay", label: "Barangay Info", icon: Building },
          { id: "users", label: "Users", icon: Users },
          { id: "personnel", label: "Personnel", icon: UserCog },
          { id: "roles", label: "Roles", icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as SettingsTab);
                setSearchQuery("");
                setStatusFilter("all");
                setRoleFilter("all");
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? "border-theme-primary text-theme-primary"
                  : "border-transparent text-theme-textSecondary hover:text-theme-text"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "users" && (
                <span className="text-xs px-2 py-0.5 bg-theme-background rounded-full">
                  {users.length}
                </span>
              )}
              {tab.id === "personnel" && (
                <span className="text-xs px-2 py-0.5 bg-theme-background rounded-full">
                  {personnel.length}
                </span>
              )}
              {tab.id === "roles" && (
                <span className="text-xs px-2 py-0.5 bg-theme-background rounded-full">
                  {roles.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB: BARANGAY INFO */}
      {activeTab === "barangay" && (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Barangay Name
              </label>
              <input
                type="text"
                value={barangayForm.name}
                onChange={(e) =>
                  setBarangayForm({ ...barangayForm, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                placeholder="Barangay Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Punong Barangay
              </label>
              <input
                type="text"
                value={barangayForm.captain_name}
                onChange={(e) =>
                  setBarangayForm({
                    ...barangayForm,
                    captain_name: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                placeholder="Captain Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Municipality
              </label>
              <input
                type="text"
                value={barangayForm.municipality}
                onChange={(e) =>
                  setBarangayForm({
                    ...barangayForm,
                    municipality: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                placeholder="Municipality"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Province
              </label>
              <input
                type="text"
                value={barangayForm.province}
                onChange={(e) =>
                  setBarangayForm({ ...barangayForm, province: e.target.value })
                }
                className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                placeholder="Province"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type="text"
                  value={barangayForm.phone}
                  onChange={(e) =>
                    setBarangayForm({ ...barangayForm, phone: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  placeholder="+63 912 345 6789"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type="email"
                  value={barangayForm.email}
                  onChange={(e) =>
                    setBarangayForm({ ...barangayForm, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  placeholder="barangay@example.com"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-theme-text mb-1">
                Complete Address
              </label>
              <textarea
                value={barangayForm.address}
                onChange={(e) =>
                  setBarangayForm({ ...barangayForm, address: e.target.value })
                }
                rows={2}
                className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                placeholder="Complete barangay address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Barangay Secretary
              </label>
              <input
                type="text"
                value={barangayForm.barangay_secretary}
                onChange={(e) =>
                  setBarangayForm({
                    ...barangayForm,
                    barangay_secretary: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Barangay Treasurer
              </label>
              <input
                type="text"
                value={barangayForm.barangay_treasurer}
                onChange={(e) =>
                  setBarangayForm({
                    ...barangayForm,
                    barangay_treasurer: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-theme-text mb-1">
                About Us
              </label>
              <textarea
                value={barangayForm.about_us}
                onChange={(e) =>
                  setBarangayForm({ ...barangayForm, about_us: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Mission
              </label>
              <textarea
                value={barangayForm.mission}
                onChange={(e) =>
                  setBarangayForm({ ...barangayForm, mission: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Vision
              </label>
              <textarea
                value={barangayForm.vision}
                onChange={(e) =>
                  setBarangayForm({ ...barangayForm, vision: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-theme flex justify-end">
            <button
              onClick={handleBarangaySave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB: USERS */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-1 gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              >
                <option value="all">All Roles</option>
                {allRoleNames.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <select
                value={usersPerPage}
                onChange={(e) => setUsersPerPage(Number(e.target.value))}
                className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                resetUserForm();
                setShowUserModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Create User
            </button>
          </div>

          <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-theme-background border-b border-theme">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-theme-textSecondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-theme-textSecondary"
                      >
                        No users found
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u: any) => (
                      <tr
                        key={u.id}
                        className="hover:bg-theme-hover transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary font-bold text-sm">
                              {u?.resident?.first_name?.[0] ||
                                u?.first_name?.[0] ||
                                "U"}
                              {u?.resident?.last_name?.[0] ||
                                u?.last_name?.[0] ||
                                ""}
                            </div>
                            <div>
                              <p className="font-medium text-theme-text">
                                {u?.resident?.first_name ||
                                  u?.first_name ||
                                  "Unknown"}{" "}
                                {u?.resident?.last_name || u?.last_name || ""}
                              </p>
                              <p className="text-xs text-theme-textSecondary">
                                {u?.resident?.phone_number || "No phone"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-theme-text">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-theme-textSecondary" />
                            {u?.email || "No Email"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {u?.roles && u.roles.length > 0 ? (
                              u.roles.map((r: any) => (
                                <span
                                  key={r.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-theme-primary/10 text-theme-primary"
                                >
                                  <Shield className="w-3 h-3" /> {r.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-theme-textSecondary">
                                No roles
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                              u?.account_status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {u?.account_status === "active" ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {u?.account_status || "inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                u?.account_status === "active"
                                  ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                              }`}
                            >
                              {u?.account_status === "active"
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItem(u);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 text-theme-textSecondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ✅ Users Pagination */}
            {filteredUsers.length > 0 && (
              <Pagination
                currentPage={usersPage}
                totalPages={usersTotalPages}
                totalItems={filteredUsers.length}
                itemsPerPage={usersPerPage}
                onPageChange={setUsersPage}
                onItemsPerPageChange={setUsersPerPage}
                showItemsPerPage={false}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB: PERSONNEL */}
      {activeTab === "personnel" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
              <input
                type="text"
                placeholder="Search personnel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              />
            </div>
            <select
              value={personnelPerPage}
              onChange={(e) => setPersonnelPerPage(Number(e.target.value))}
              className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              {[12, 24, 48, 96].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-sm text-theme-textSecondary">
              <Users className="w-4 h-4" />
              {personnel.length} personnel
            </div>
          </div>

          <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {paginatedPersonnel.length === 0 ? (
                <div className="col-span-full text-center py-12 text-theme-textSecondary">
                  No personnel found
                </div>
              ) : (
                paginatedPersonnel.map((p: any) => {
                  const resident = p?.resident || {};
                  const userRoles = p?.roles || [];
                  return (
                    <div
                      key={p.id}
                      className="bg-theme-surface border border-theme rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center">
                          <User className="w-6 h-6 text-theme-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-theme-text truncate">
                            {resident?.first_name || "Unknown"}{" "}
                            {resident?.last_name || ""}
                          </p>
                          <p className="text-sm text-theme-textSecondary truncate">
                            {p?.email}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {userRoles.map((r: any) => (
                              <span
                                key={r.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-theme-primary/10 text-theme-primary"
                              >
                                <Shield className="w-3 h-3" /> {r.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ✅ Personnel Pagination */}
            {filteredPersonnel.length > 0 && (
              <Pagination
                currentPage={personnelPage}
                totalPages={personnelTotalPages}
                totalItems={filteredPersonnel.length}
                itemsPerPage={personnelPerPage}
                onPageChange={setPersonnelPage}
                onItemsPerPageChange={setPersonnelPerPage}
                showItemsPerPage={false}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB: ROLES */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-3 flex-wrap">
            <select
              value={rolesPerPage}
              onChange={(e) => setRolesPerPage(Number(e.target.value))}
              className="px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            >
              {[12, 24, 48, 96].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setRoleForm({ name: "", description: "" });
                setShowRoleModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Role
            </button>
          </div>

          <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {paginatedRoles.length === 0 ? (
                <div className="col-span-full text-center py-12 text-theme-textSecondary">
                  No roles found
                </div>
              ) : (
                paginatedRoles.map((role: any) => (
                  <div
                    key={role.id}
                    className="bg-theme-surface border border-theme rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-theme-primary/10">
                          <Shield className="w-5 h-5 text-theme-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-theme-text">
                            {role.name}
                          </p>
                          {role.description && (
                            <p className="text-sm text-theme-textSecondary">
                              {role.description}
                            </p>
                          )}
                          <p className="text-xs text-theme-textSecondary mt-1">
                            {role.users_count || 0} user
                            {role.users_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedItem(role);
                          setShowDeleteModal(true);
                        }}
                        className="p-1.5 text-theme-textSecondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        disabled={role.users_count > 0}
                        title={
                          role.users_count > 0
                            ? "Cannot delete role with users"
                            : "Delete role"
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ✅ Roles Pagination */}
            {roles.length > 0 && (
              <Pagination
                currentPage={rolesPage}
                totalPages={rolesTotalPages}
                totalItems={roles.length}
                itemsPerPage={rolesPerPage}
                onPageChange={setRolesPage}
                onItemsPerPageChange={setRolesPerPage}
                showItemsPerPage={false}
              />
            )}
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          resetUserForm();
        }}
        title="Create User"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userForm.first_name}
                onChange={(e) =>
                  setUserForm({ ...userForm, first_name: e.target.value })
                }
                className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                  formErrors.first_name ? "border-red-500" : "border-theme"
                }`}
              />
              {formErrors.first_name && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.first_name}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userForm.last_name}
                onChange={(e) =>
                  setUserForm({ ...userForm, last_name: e.target.value })
                }
                className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                  formErrors.last_name ? "border-red-500" : "border-theme"
                }`}
              />
              {formErrors.last_name && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.last_name}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-theme-text mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
                className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                  formErrors.email ? "border-red-500" : "border-theme"
                }`}
              />
              {formErrors.email && (
                <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={userForm.phone_number}
                onChange={(e) =>
                  setUserForm({ ...userForm, phone_number: e.target.value })
                }
                className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                    formErrors.password ? "border-red-500" : "border-theme"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.password}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-theme-text mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={userForm.password_confirmation}
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    password_confirmation: e.target.value,
                  })
                }
                className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                  formErrors.password_confirmation
                    ? "border-red-500"
                    : "border-theme"
                }`}
              />
              {formErrors.password_confirmation && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.password_confirmation}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-theme-text mb-1">
                Roles <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role: any) => {
                  const isSelected = userForm.role_ids.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        setUserForm((prev) => ({
                          ...prev,
                          role_ids: isSelected
                            ? prev.role_ids.filter((id) => id !== role.id)
                            : [...prev.role_ids, role.id],
                        }));
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        isSelected
                          ? "bg-theme-primary text-white border-theme-primary"
                          : "bg-theme-surface text-theme-textSecondary border-theme hover:bg-theme-hover"
                      }`}
                    >
                      {role.name}
                    </button>
                  );
                })}
              </div>
              {formErrors.role_ids && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors.role_ids}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <button
              onClick={() => {
                setShowUserModal(false);
                resetUserForm();
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateUser}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create User
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* CREATE ROLE MODAL */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setRoleForm({ name: "", description: "" });
        }}
        title="Create Role"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={roleForm.name}
              onChange={(e) =>
                setRoleForm({ ...roleForm, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
              placeholder="e.g., Barangay Captain"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Description
            </label>
            <textarea
              value={roleForm.description}
              onChange={(e) =>
                setRoleForm({ ...roleForm, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <button
              onClick={() => {
                setShowRoleModal(false);
                setRoleForm({ name: "", description: "" });
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateRole}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Role"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
        title="Delete Confirmation"
      >
        <div className="space-y-4">
          <p className="text-theme-textSecondary">
            Are you sure you want to delete this{" "}
            {activeTab === "roles" ? "role" : "user"}? This action cannot be
            undone.
          </p>
          {selectedItem && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="font-medium text-theme-text">
                {selectedItem.name ||
                  selectedItem.email ||
                  selectedItem.first_name}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedItem(null);
              }}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={
                activeTab === "roles" ? handleDeleteRole : handleDeleteUser
              }
              disabled={isSubmitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}