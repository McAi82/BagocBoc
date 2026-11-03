// pages/settings/AdminUserModal.tsx

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Loader2,
  User,
  Mail,
  Phone,
  Shield,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "../../api/apiClient";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";

interface AdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminUserModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    password_confirmation: "",
    role_ids: [] as number[],
    resident_id: "",
    create_resident: false,
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    phone_number: "",
    gender: "Male",
    birth_date: "",
    place_of_birth: "",
    civil_status: "Single",
    citizenship: "Filipino",
    education_attainment: "",
    voter_status: "Not Registered",
    occupation: "",
    monthly_income: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchData();
      resetForm();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, residentsRes] = await Promise.all([
        api.get("/web/roles"),
        api.get("/web/admin-users/available-residents"),
      ]);

      setRoles(rolesRes.data?.data || []);
      setResidents(residentsRes.data?.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleRoleToggle = (roleId: number) => {
    setFormData((prev) => {
      const current = prev.role_ids;
      const exists = current.includes(roleId);
      return {
        ...prev,
        role_ids: exists ? current.filter((id) => id !== roleId) : [...current, roleId],
      };
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = "Passwords do not match";
    }
    if (formData.role_ids.length === 0) {
      newErrors.role_ids = "Please select at least one role";
    }
    if (formData.create_resident) {
      if (!formData.first_name) newErrors.first_name = "First name is required";
      if (!formData.last_name) newErrors.last_name = "Last name is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      password_confirmation: "",
      role_ids: [],
      resident_id: "",
      create_resident: false,
      first_name: "",
      middle_name: "",
      last_name: "",
      suffix: "",
      phone_number: "",
      gender: "Male",
      birth_date: "",
      place_of_birth: "",
      civil_status: "Single",
      citizenship: "Filipino",
      education_attainment: "",
      voter_status: "Not Registered",
      occupation: "",
      monthly_income: "",
    });
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors below");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        role_ids: formData.role_ids,
        resident_id: formData.resident_id || null,
        create_resident: formData.create_resident,
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        suffix: formData.suffix,
        phone_number: formData.phone_number,
        gender: formData.gender,
        birth_date: formData.birth_date,
        place_of_birth: formData.place_of_birth,
        civil_status: formData.civil_status,
        citizenship: formData.citizenship,
        education_attainment: formData.education_attainment,
        voter_status: formData.voter_status,
        occupation: formData.occupation,
        monthly_income: formData.monthly_income,
      };

      await api.post("/web/admin-users", payload);
      toast.success("User account created successfully!");
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error("Create user error:", error);
      if (error?.response?.data?.errors) {
        setErrors(error.response.data.errors);
        toast.error("Please fix the errors below");
      } else {
        toast.error(error?.response?.data?.message || "Failed to create user");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Admin / Staff User"
      size="xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
        </div>
      ) : (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Account Details */}
          <div>
            <h3 className="text-sm font-semibold text-theme-text mb-3">Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                      errors.email ? "border-red-500" : "border-theme"
                    }`}
                    placeholder="user@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-12 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                      errors.password ? "border-red-500" : "border-theme"
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-theme-text mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                    errors.password_confirmation ? "border-red-500" : "border-theme"
                  }`}
                  placeholder="••••••••"
                />
                {errors.password_confirmation && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.password_confirmation}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Roles */}
          <div>
            <h3 className="text-sm font-semibold text-theme-text mb-3">
              Assign Roles <span className="text-red-500">*</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => {
                const isSelected = formData.role_ids.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleToggle(role.id)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-theme-primary text-white border-theme-primary"
                        : "bg-theme-surface text-theme-textSecondary border-theme hover:bg-theme-hover"
                    }`}
                  >
                    <Shield className="w-4 h-4 inline mr-2" />
                    {role.name}
                    {isSelected && <CheckCircle className="w-4 h-4 inline ml-2" />}
                  </button>
                );
              })}
            </div>
            {errors.role_ids && (
              <p className="text-sm text-red-500 mt-1">{errors.role_ids}</p>
            )}
          </div>

          {/* Link to Resident */}
          <div>
            <h3 className="text-sm font-semibold text-theme-text mb-3">
              Link to Resident <span className="text-theme-textSecondary text-xs font-normal">(Optional - Super Admin can be without resident)</span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="create_resident"
                  checked={formData.create_resident}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-theme text-theme-primary focus:ring-theme-primary"
                />
                <label className="text-sm text-theme-text">
                  Create new resident for this user
                </label>
              </div>

              {!formData.create_resident ? (
                <select
                  name="resident_id"
                  value={formData.resident_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                >
                  <option value="">Select existing resident (optional)</option>
                  <option value="">--- No Resident (Super Admin) ---</option>
                  {residents.map((resident) => (
                    <option key={resident.id} value={resident.id}>
                      {resident.first_name} {resident.last_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-theme-background rounded-lg border border-theme">
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                        errors.first_name ? "border-red-500" : "border-theme"
                      }`}
                      placeholder="First Name"
                    />
                    {errors.first_name && (
                      <p className="text-sm text-red-500 mt-1">{errors.first_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors ${
                        errors.last_name ? "border-red-500" : "border-theme"
                      }`}
                      placeholder="Last Name"
                    />
                    {errors.last_name && (
                      <p className="text-sm text-red-500 mt-1">{errors.last_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                      placeholder="Middle Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Suffix
                    </label>
                    <input
                      type="text"
                      name="suffix"
                      value={formData.suffix}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                      placeholder="Jr., Sr., III"
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
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                        placeholder="09XXXXXXXXX"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Place of Birth
                    </label>
                    <input
                      type="text"
                      name="place_of_birth"
                      value={formData.place_of_birth}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                      placeholder="City, Province"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Civil Status
                    </label>
                    <select
                      name="civil_status"
                      value={formData.civil_status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widow">Widow</option>
                      <option value="Legally Separated">Legally Separated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Citizenship
                    </label>
                    <input
                      type="text"
                      name="citizenship"
                      value={formData.citizenship}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                      placeholder="Filipino"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Education Attainment
                    </label>
                    <input
                      type="text"
                      name="education_attainment"
                      value={formData.education_attainment}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                      placeholder="College Graduate"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Voter Status
                    </label>
                    <select
                      name="voter_status"
                      value={formData.voter_status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                    >
                      <option value="Registered Local">Registered Local</option>
                      <option value="Registered_Outside">Registered Outside</option>
                      <option value="Not Registered">Not Registered</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Occupation
                    </label>
                    <input
                      type="text"
                      name="occupation"
                      value={formData.occupation}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                      placeholder="Job title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-text mb-1">
                      Monthly Income
                    </label>
                    <input
                      type="number"
                      name="monthly_income"
                      value={formData.monthly_income}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-theme">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Create Account
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}