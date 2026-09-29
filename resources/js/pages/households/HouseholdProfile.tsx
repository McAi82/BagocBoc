// pages/households/HouseholdProfile.tsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  MapPin,
  Users,
  User,
  Phone,
  Mail,
  Calendar,
  Edit,
  Printer,
  AlertCircle,
} from "lucide-react";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import { formatDate } from "../../utils/format";
import toast from "react-hot-toast";

export default function HouseholdProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [household, setHousehold] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchHousehold = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      console.log("🔍 [HouseholdProfile] Fetching household:", id);
      const response = await api.get(`/web/households/${id}`);
      console.log("📦 [HouseholdProfile] Response:", response.data);

      const data = response.data?.data || response.data;
      console.log("✅ [HouseholdProfile] Data:", data);
      console.log("👤 [HouseholdProfile] Residents:", data?.residents);

      setHousehold(data);
    } catch (error) {
      console.error("❌ Error fetching household:", error);
      setIsError(true);
      toast.error("Failed to load household");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchHousehold();
    }
  }, [id]);

  // ✅ FIXED: Get head of household with multiple fallback methods
  const getHeadOfHousehold = () => {
    if (!household) return null;

    const residents = household.residents || [];
    if (residents.length === 0) return null;

    const head = residents.find((r: any) => {
      if (r.pivot?.relationship_to_household === "Head") return true;
      if (r.relationship_to_head === "Head") return true;
      if (r.is_primary === true) return true;
      if (r.pivot?.is_primary === true) return true;
      if (r.relationship === "Head") return true;
      return false;
    });

    if (!head && residents.length > 0) {
      return residents[0];
    }

    return head;
  };

  const getHeadName = () => {
    const head = getHeadOfHousehold();
    if (head) {
      const firstName = head.first_name || "";
      const lastName = head.last_name || "";
      return `${firstName} ${lastName}`.trim() || "Unknown";
    }
    return "N/A";
  };

  const getHeadRelationship = () => {
    const head = getHeadOfHousehold();
    if (head) {
      return (
        head.pivot?.relationship_to_household ||
        head.relationship_to_head ||
        head.relationship ||
        "Head"
      );
    }
    return "Head";
  };

  const getMemberCount = () => {
    return household?.residents?.length || 0;
  };

  const getAddress = () => {
    const addr = household?.address || {};
    const parts = [];
    if (addr.street) parts.push(addr.street);
    if (addr.subdivision) parts.push(addr.subdivision);
    if (addr.zone_name) parts.push(`Zone ${addr.zone_name}`);
    else if (addr.zone) parts.push(`Zone ${addr.zone}`);
    return parts.join(", ") || "No address";
  };

  const getZone = () => {
    const addr = household?.address || {};
    if (addr.zone_name) return addr.zone_name;
    if (addr.zone) return `Zone ${addr.zone}`;
    return "N/A";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading household...
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
            Failed to Load Household
          </h3>
          <button
            onClick={fetchHousehold}
            className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="text-center py-12">
        <p className="text-theme-textSecondary">Household not found</p>
        <button
          onClick={() => navigate("/barangay-bagocboc/populations/households")}
          className="mt-4 text-theme-primary hover:text-theme-secondary"
        >
          Go back
        </button>
      </div>
    );
  }

  const residents = household.residents || [];
  const headName = getHeadName();
  const memberCount = getMemberCount();
  const address = getAddress();
  const zone = getZone();

  // ✅ Count males and females
  const maleCount = residents.filter((r: any) => r.gender === "Male").length;
  const femaleCount = residents.filter(
    (r: any) => r.gender === "Female",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/barangay-bagocboc/populations/households")}
          className="flex items-center gap-2 text-theme-textSecondary hover:text-theme-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Households
        </button>
      </div>

      {/* Household Info */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-theme-primary/10 flex items-center justify-center">
            <Home className="w-8 h-8 text-theme-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-theme-text">
              {household.household_number}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <span className="text-sm text-theme-textSecondary">
                {household.household_tracking_number}
              </span>
              <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {household.status || "Active"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Address & Info */}
        <div className="lg:col-span-2 bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
          <h2 className="text-lg font-semibold text-theme-text mb-4">
            Household Details
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem
                label="Household Number"
                value={household.household_number}
                icon={Home}
              />
              <InfoItem
                label="Tracking Number"
                value={household.household_tracking_number}
                icon={MapPin}
              />
              <InfoItem label="Zone" value={zone} icon={MapPin} />
              <InfoItem
                label="Street"
                value={household.address?.street || "N/A"}
                icon={MapPin}
              />
              <InfoItem
                label="Subdivision"
                value={household.address?.subdivision || "N/A"}
                icon={MapPin}
              />
              <InfoItem
                label="Registered"
                value={
                  household.created_at
                    ? formatDate(household.created_at)
                    : "N/A"
                }
                icon={Calendar}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
            <h2 className="text-lg font-semibold text-theme-text mb-4">
              Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-theme">
                <span className="text-sm text-theme-textSecondary">
                  Total Members
                </span>
                <span className="text-sm font-medium text-theme-text">
                  {memberCount}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-theme">
                <span className="text-sm text-theme-textSecondary">
                  Head of Household
                </span>
                <span className="text-sm font-medium text-theme-text">
                  {headName}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-theme">
                <span className="text-sm text-theme-textSecondary">Male</span>
                <span className="text-sm font-medium text-theme-text">
                  {maleCount}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-theme">
                <span className="text-sm text-theme-textSecondary">Female</span>
                <span className="text-sm font-medium text-theme-text">
                  {femaleCount}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-theme-textSecondary">Address</span>
                <span className="text-sm font-medium text-theme-text text-right max-w-[150px] truncate">
                  {address}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-theme flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme-text">
            Family Members
          </h2>
          <span className="text-sm text-theme-textSecondary">
            {memberCount} members
          </span>
        </div>
        {residents.length === 0 ? (
          <div className="px-6 py-8 text-center text-theme-textSecondary">
            No members registered
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-background border-b border-theme">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                    Relationship
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                    Gender
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                    Birth Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-theme-textSecondary uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {residents.map((resident: any) => {
                  const relationship =
                    resident.pivot?.relationship_to_household ||
                    resident.relationship_to_head ||
                    resident.relationship ||
                    "Member";

                  const isPrimary =
                    resident.pivot?.is_primary ||
                    resident.is_primary ||
                    relationship === "Head";

                  return (
                    <tr
                      key={resident.id}
                      className={`hover:bg-theme-hover transition-colors ${
                        isPrimary ? "bg-theme-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-theme-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-theme-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-theme-text">
                              {resident.first_name} {resident.middle_name || ""}{" "}
                              {resident.last_name}
                              {resident.suffix ? ` ${resident.suffix}` : ""}
                            </p>
                            {isPrimary && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-theme-primary/10 rounded text-theme-primary font-medium">
                                Head
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-textSecondary">
                        {relationship}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-textSecondary">
                        {resident.gender || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-textSecondary">
                        {resident.birth_date
                          ? formatDate(resident.birth_date)
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-theme-textSecondary">
                        {resident.phone_number || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {resident.pivot?.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-theme-textSecondary flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-theme-textSecondary font-medium">{label}</p>
        <p className="text-sm text-theme-text">{value}</p>
      </div>
    </div>
  );
}