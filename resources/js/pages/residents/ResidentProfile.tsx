// pages/residents/ResidentProfile.tsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Users,
  Heart,
  Shield,
  ArrowLeft,
  Edit,
  Printer,
  Save,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import { formatDate, formatCurrency } from "../../utils/format";
import toast from "react-hot-toast";

export default function ResidentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resident, setResident] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchResident = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await api.get(`/web/residents/${id}`);
      const data = response.data?.data || response.data;
      setResident(data);
      setFormData({
        first_name: data.first_name || "",
        middle_name: data.middle_name || "",
        last_name: data.last_name || "",
        suffix: data.suffix || "",
        phone_number: data.phone_number || "",
        gender: data.gender || "Male",
        citizenship: data.citizenship || "Filipino",
        birth_date: data.birth_date || "",
        place_of_birth: data.place_of_birth || "",
        civil_status: data.civil_status || "Single",
        voter_status: data.voter_status || "Not Registered",
        occupation: data.occupation || "",
        monthly_income: data.monthly_income || "",
        education_attainment: data.education_attainment || "",
      });
    } catch (error) {
      console.error("Error fetching resident:", error);
      setIsError(true);
      toast.error("Failed to load resident");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchResident();
  }, [id]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.first_name?.trim())
      newErrors.first_name = "First name is required";
    if (!formData.last_name?.trim())
      newErrors.last_name = "Last name is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.birth_date) newErrors.birth_date = "Birth date is required";
    if (!formData.place_of_birth?.trim())
      newErrors.place_of_birth = "Place of birth is required";
    if (!formData.citizenship?.trim())
      newErrors.citizenship = "Citizenship is required";
    if (!formData.civil_status)
      newErrors.civil_status = "Civil status is required";
    if (!formData.education_attainment?.trim())
      newErrors.education_attainment = "Education attainment is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix all errors before saving");
      return;
    }
    setIsSaving(true);
    try {
      const updateData = {
        ...formData,
        monthly_income: formData.monthly_income
          ? parseFloat(formData.monthly_income)
          : null,
      };
      await api.put(`/web/residents/${id}`, updateData);
      toast.success("Resident updated successfully!");
      setIsEditing(false);
      fetchResident();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        Object.keys(apiErrors).forEach((key) => {
          setErrors((prev) => ({ ...prev, [key]: apiErrors[key][0] }));
        });
        toast.error("Please fix the errors below");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to update resident",
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (resident) {
      setFormData({
        first_name: resident.first_name || "",
        middle_name: resident.middle_name || "",
        last_name: resident.last_name || "",
        suffix: resident.suffix || "",
        phone_number: resident.phone_number || "",
        gender: resident.gender || "Male",
        citizenship: resident.citizenship || "Filipino",
        birth_date: resident.birth_date || "",
        place_of_birth: resident.place_of_birth || "",
        civil_status: resident.civil_status || "Single",
        voter_status: resident.voter_status || "Not Registered",
        occupation: resident.occupation || "",
        monthly_income: resident.monthly_income || "",
        education_attainment: resident.education_attainment || "",
      });
    }
    setErrors({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-theme-textSecondary font-medium">
            Loading resident...
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
            Failed to Load Resident
          </h3>
          <button
            onClick={fetchResident}
            className="mt-4 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="text-center py-12">
        <p className="text-theme-textSecondary">Resident not found</p>
        <button
          onClick={() => navigate("/barangay-bagocboc/populations/residents")}
          className="mt-4 text-theme-primary hover:text-theme-secondary"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/barangay-bagocboc/populations/residents")}
          className="flex items-center gap-2 text-theme-textSecondary hover:text-theme-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Residents
        </button>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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
            </>
          ) : (
            <>
              <button className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <Edit className="w-4 h-4" /> Edit Profile
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-theme-primary/10 flex items-center justify-center">
            <User className="w-12 h-12 text-theme-primary" />
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="First Name"
                  className={`px-3 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.first_name ? "border-red-500" : "border-theme"
                    }`}
                />
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleInputChange}
                  placeholder="Middle Name"
                  className="px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                />
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Last Name"
                  className={`px-3 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.last_name ? "border-red-500" : "border-theme"
                    }`}
                />
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-theme-text">
                  {resident.first_name} {resident.middle_name || ""}{" "}
                  {resident.last_name}
                  {resident.suffix && ` ${resident.suffix}`}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <span className="text-sm text-theme-textSecondary">
                    {resident.gender} • {resident.civil_status}
                  </span>
                  <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Active
                  </span>
                </div>
              </div>
            )}
            {errors.first_name && (
              <p className="text-sm text-red-500 mt-1">{errors.first_name}</p>
            )}
            {errors.last_name && (
              <p className="text-sm text-red-500 mt-1">{errors.last_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
          <h2 className="text-lg font-semibold text-theme-text mb-4">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-xs text-theme-textSecondary font-medium mb-1">
                    Birth Date *
                  </label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.birth_date ? "border-red-500" : "border-theme"
                      }`}
                  />
                  {errors.birth_date && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.birth_date}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-theme-textSecondary font-medium mb-1">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.gender ? "border-red-500" : "border-theme"
                      }`}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {errors.gender && (
                    <p className="text-xs text-red-500 mt-1">{errors.gender}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-theme-textSecondary font-medium mb-1">
                    Place of Birth *
                  </label>
                  <input
                    type="text"
                    name="place_of_birth"
                    value={formData.place_of_birth}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.place_of_birth ? "border-red-500" : "border-theme"
                      }`}
                  />
                  {errors.place_of_birth && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.place_of_birth}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-theme-textSecondary font-medium mb-1">
                    Citizenship *
                  </label>
                  <input
                    type="text"
                    name="citizenship"
                    value={formData.citizenship}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.citizenship ? "border-red-500" : "border-theme"
                      }`}
                  />
                  {errors.citizenship && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.citizenship}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-theme-textSecondary font-medium mb-1">
                    Civil Status *
                  </label>
                  <select
                    name="civil_status"
                    value={formData.civil_status}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.civil_status ? "border-red-500" : "border-theme"
                      }`}
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widow">Widow</option>
                    <option value="Legally Separated">Legally Separated</option>
                  </select>
                  {errors.civil_status && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.civil_status}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-theme-textSecondary font-medium mb-1">
                    Voter Status
                  </label>
                  <select
                    name="voter_status"
                    value={formData.voter_status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  >
                    <option value="Registered Local">Registered Local</option>
                    <option value="Registered_Outside">
                      Registered Outside
                    </option>
                    <option value="Not Registered">Not Registered</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-theme-textSecondary font-medium mb-1">
                    Education Attainment *
                  </label>
                  <input
                    type="text"
                    name="education_attainment"
                    value={formData.education_attainment}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${errors.education_attainment
                        ? "border-red-500"
                        : "border-theme"
                      }`}
                  />
                  {errors.education_attainment && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.education_attainment}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <InfoItem
                  label="Birth Date"
                  value={
                    resident.birth_date
                      ? formatDate(resident.birth_date)
                      : "N/A"
                  }
                  icon={Calendar}
                />
                <InfoItem
                  label="Place of Birth"
                  value={resident.place_of_birth || "N/A"}
                  icon={MapPin}
                />
                <InfoItem
                  label="Citizenship"
                  value={resident.citizenship || "Filipino"}
                  icon={Users}
                />
                <InfoItem
                  label="Voter Status"
                  value={resident.voter_status || "Not Registered"}
                  icon={Shield}
                />
                <InfoItem
                  label="Civil Status"
                  value={resident.civil_status || "N/A"}
                  icon={Heart}
                />
                <InfoItem
                  label="Education"
                  value={resident.education_attainment || "N/A"}
                  icon={Mail}
                />
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
            <h2 className="text-lg font-semibold text-theme-text mb-4">
              Contact
            </h2>
            {isEditing ? (
              <div>
                <label className="block text-xs text-theme-textSecondary font-medium mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                  placeholder="09XXXXXXXXX"
                />
              </div>
            ) : (
              <InfoItem
                label="Phone"
                value={resident.phone_number || "N/A"}
                icon={Phone}
              />
            )}
          </div>

          <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
            <h2 className="text-lg font-semibold text-theme-text mb-4">
              Occupation
            </h2>
            {isEditing ? (
              <>
                <div className="mb-3">
                  <label className="block text-xs text-theme-textSecondary font-medium mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <label className="block text-xs text-theme-textSecondary font-medium mb-1">
                    Monthly Income
                  </label>
                  <input
                    type="number"
                    name="monthly_income"
                    value={formData.monthly_income}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="0.00"
                  />
                </div>
              </>
            ) : (
              <>
                <InfoItem
                  label="Occupation"
                  value={resident.occupation || "N/A"}
                  icon={Briefcase}
                />
                <div className="mt-3 pt-3 border-t border-theme">
                  <InfoItem
                    label="Monthly Income"
                    value={
                      resident.monthly_income
                        ? formatCurrency(resident.monthly_income)
                        : "N/A"
                    }
                    icon={Heart}
                  />
                </div>
              </>
            )}
          </div>

          <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
            <h2 className="text-lg font-semibold text-theme-text mb-4">
              Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-theme">
                <span className="text-sm text-theme-textSecondary">Age</span>
                <span className="text-sm font-medium text-theme-text">
                  {resident.birth_date
                    ? new Date().getFullYear() -
                    new Date(resident.birth_date).getFullYear()
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-theme">
                <span className="text-sm text-theme-textSecondary">Gender</span>
                <span className="text-sm font-medium text-theme-text">
                  {resident.gender}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-theme">
                <span className="text-sm text-theme-textSecondary">
                  Civil Status
                </span>
                <span className="text-sm font-medium text-theme-text">
                  {resident.civil_status}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-theme-textSecondary">
                  Registered
                </span>
                <span className="text-sm font-medium text-theme-text">
                  {resident.created_at
                    ? formatDate(resident.created_at)
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
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
