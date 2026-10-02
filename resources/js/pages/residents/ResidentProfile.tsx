// pages/residents/ResidentProfile.tsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { printReport, statusBadge, esc } from "../../utils/printReport";
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
  Home,
  FileText,
  FileCheck,
  CreditCard,
  Receipt,
  Activity,
  Stethoscope,
  GraduationCap,
  Wallet,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Hash,
} from "lucide-react";
import { api } from "../../api/apiClient";
import Spinner from "../../components/ui/Spinner";
import { formatDate, formatCurrency, getStatusColor } from "../../utils/format";
import toast from "react-hot-toast";

/* ============================================================
   TYPES
   ============================================================ */

type Tab =
  | "overview"
  | "household"
  | "health"
  | "documents"
  | "financial"
  | "account";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "household", label: "Household", icon: Home },
  { id: "health", label: "Health", icon: Stethoscope },
  { id: "documents", label: "Documents", icon: FileCheck },
  { id: "financial", label: "Financial", icon: Wallet },
  { id: "account", label: "Account", icon: Shield },
];

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function ResidentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resident, setResident] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [tab, setTab] = useState<Tab>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) fetchResident();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ============================================================
   PRINT — generate a full resident profile report
   ============================================================ */
  const handlePrint = () => {
    if (!resident) {
      toast.error("No resident data to print");
      return;
    }

    const household = resident.current_household || null;
    const stats = resident.stats || {};

    const patientRecords =
      resident.patient_records || resident.patientRecords || [];
    const maternalProfile =
      resident.maternal_profile || resident.maternalProfile || null;
    const optAssessments =
      resident.opt_plus_assessments || resident.optPlusAssessments || [];

    const certifications = resident.certifications || [];
    const clearances = resident.clearances || [];
    const penalties = resident.penalties || [];
    const payments = resident.payments || [];
    const taxPayments =
      resident.tax_payments || resident.taxPayments || [];

    /* ------------------------------------------------------------
       Build a single "Field / Value" table with section rows
       ------------------------------------------------------------ */
    type Row = { field: string; value: string };
    const rows: Row[] = [];

    const spacer = (label: string) =>
      rows.push({ field: `— ${label} —`, value: "" });

    /* ---------- 1. Personal information ---------- */
    spacer("Personal Information");
    rows.push({ field: "Full Name", value: esc(resident.full_name || `${resident.first_name} ${resident.last_name}`) });
    rows.push({ field: "Resident ID", value: `#${resident.id}` });
    rows.push({ field: "Gender", value: esc(resident.gender) });
    rows.push({ field: "Age", value: resident.age != null ? `${resident.age} yrs` : "—" });
    rows.push({
      field: "Birth Date",
      value: resident.birth_date
        ? esc(new Date(resident.birth_date).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }))
        : "—",
    });
    rows.push({ field: "Place of Birth", value: esc(resident.place_of_birth) });
    rows.push({ field: "Citizenship", value: esc(resident.citizenship || "Filipino") });
    rows.push({ field: "Civil Status", value: esc(resident.civil_status) });
    rows.push({ field: "Voter Status", value: esc(resident.voter_status) });
    rows.push({ field: "Education", value: esc(resident.education_attainment) });
    rows.push({ field: "Occupation", value: esc(resident.occupation) });
    rows.push({
      field: "Monthly Income",
      value: resident.monthly_income
        ? `₱${Number(resident.monthly_income).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
        : "—",
    });
    rows.push({ field: "Phone", value: esc(resident.phone_number) });
    rows.push({ field: "Email", value: esc(resident.email) });
    rows.push({ field: "Account Status", value: esc(resident.status || "active") });

    /* ---------- 2. Household ---------- */
    spacer("Household");
    if (household) {
      rows.push({ field: "Household #", value: esc(household.household_number) });
      rows.push({ field: "Tracking #", value: esc(household.household_tracking_number) });
      rows.push({ field: "Zone", value: esc(household.zone) });
      rows.push({ field: "Street", value: esc(household.street) });
      rows.push({ field: "Role in Household", value: esc(household.role || "Member") });
      rows.push({ field: "Head of Household", value: household.is_primary ? "Yes" : "No" });
      rows.push({ field: "Members", value: String(household.member_count || 0) });

      if (Array.isArray(household.members) && household.members.length > 0) {
        rows.push({ field: "Household Members", value: "" });
        household.members.forEach((m: any) => {
          const role = m.is_primary ? " (Head)" : "";
          rows.push({
            field: m.full_name + role,
            value: `${esc(m.relationship || "Member")} • ${esc(m.gender)} • ${m.age ?? "—"} yrs`,
          });
        });
      }
    } else {
      rows.push({ field: "Household", value: "Not assigned" });
    }

    /* ---------- 3. Health ---------- */
    spacer("Health Records");
    rows.push({ field: "Patient Records", value: String(patientRecords.length) });

    patientRecords.forEach((pr: any) => {
      rows.push({
        field: `Patient Record #${pr.id}`,
        value: `Type: ${esc(pr.patient_type)} • Status: ${esc(pr.status)} • Checkups: ${pr.checkups?.length || 0}`,
      });
    });

    if (maternalProfile) {
      rows.push({
        field: "Maternal Profile",
        value: `Status: ${esc(maternalProfile.pregnancy_status)} • EDD: ${maternalProfile.expected_delivery_date ? esc(new Date(maternalProfile.expected_delivery_date).toLocaleDateString("en-PH")) : "—"}`,
      });
    }

    if (optAssessments.length > 0) {
      rows.push({ field: "OPT+ Assessments", value: String(optAssessments.length) });
      optAssessments.slice(0, 10).forEach((a: any) => {
        rows.push({
          field: `OPT+ ${a.assessment_date ? new Date(a.assessment_date).toLocaleDateString("en-PH") : "—"}`,
          value: `Weight: ${a.weight_kg ?? "—"} kg • Height: ${a.height_cm ?? "—"} cm`,
        });
      });
    }

    /* ---------- 4. Documents ---------- */
    spacer("Certifications & Clearances");
    rows.push({ field: "Certifications", value: String(certifications.length) });
    certifications.forEach((c: any) => {
      rows.push({
        field: c.reference_number || `Cert #${c.id}`,
        value: `${esc(c.certification_type?.name || c.certificationType?.name || "—")} • ${esc(c.status)} • ${c.created_at ? esc(new Date(c.created_at).toLocaleDateString("en-PH")) : "—"}`,
      });
    });

    rows.push({ field: "Clearances", value: String(clearances.length) });
    clearances.forEach((c: any) => {
      rows.push({
        field: c.reference_number || `Clearance #${c.id}`,
        value: `${esc(c.purpose || "—")} • ₱${Number(c.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })} • ${esc(c.status)}`,
      });
    });

    /* ---------- 5. Financial ---------- */
    spacer("Financial Summary");
    rows.push({
      field: "Pending Penalties",
      value: String(stats.penalties_pending ?? penalties.filter((p: any) => p.status === "pending").length),
    });
    rows.push({
      field: "Payments Total",
      value: `₱${Number(stats.payments_total ?? payments.reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
    });
    rows.push({
      field: "Tax Payments Total",
      value: `₱${Number(stats.tax_total ?? taxPayments.reduce((s: number, t: any) => s + (parseFloat(t.amount) || 0), 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
    });

    if (penalties.length > 0) {
      rows.push({ field: "Penalty Details", value: "" });
      penalties.forEach((p: any) => {
        rows.push({
          field: p.reference_number || `Penalty #${p.id}`,
          value: `${esc(p.reason || "—")} • ₱${Number(p.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })} • ${esc(p.status)}`,
        });
      });
    }

    if (payments.length > 0) {
      rows.push({ field: "Payment Details", value: "" });
      payments.forEach((p: any) => {
        rows.push({
          field: p.or_number || `Payment #${p.id}`,
          value: `${esc(p.payment_type || "—")} • ₱${Number(p.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })} • ${esc(p.payment_method || "—")} • ${esc(p.status)}`,
        });
      });
    }

    if (taxPayments.length > 0) {
      rows.push({ field: "Tax Payment Details", value: "" });
      taxPayments.forEach((t: any) => {
        rows.push({
          field: t.receipt_number || `Tax #${t.id}`,
          value: `${esc(t.tax_type || "—")} • ₱${Number(t.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })} • ${esc(t.payment_method || "—")}`,
        });
      });
    }

    /* ---------- 6. Account ---------- */
    if (resident.user) {
      spacer("Linked Account");
      rows.push({ field: "Email", value: esc(resident.user.email) });
      rows.push({ field: "Status", value: esc(resident.user.account_status) });
      rows.push({
        field: "Roles",
        value: esc((resident.user.roles || []).map((r: any) => r.name).join(", ") || "—"),
      });
      rows.push({
        field: "Last Login",
        value: resident.user.last_login_at
          ? esc(new Date(resident.user.last_login_at).toLocaleString("en-PH"))
          : "Never",
      });
    }

    /* ------------------------------------------------------------
       Hand off to the shared print utility
       ------------------------------------------------------------ */
    const ok = printReport({
      title: "Resident Profile",
      subtitle: `${resident.full_name || `${resident.first_name} ${resident.last_name}`} • Resident ID #${resident.id}`,
      periodLabel: `As of ${new Date().toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      columns: [
        { key: "field", label: "Field", width: "35%" },
        { key: "value", label: "Value" },
      ],
      rows,
      summary: [
        { label: "Certificates", value: certifications.length },
        { label: "Clearances", value: clearances.length },
        { label: "Penalties", value: penalties.length, color: "#dc2626" },
        {
          label: "Payments",
          value: `₱${Number(stats.payments_total ?? payments.reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
          color: "#059669",
        },
      ],
      signatories: {
        left: {
          name: "Concordio A. Esber",
          title: "Barangay Secretary",
        },
        right: {
          name: "Marcos P. Gonzales",
          title: "Punong Barangay",
        },
      },
    });

    if (!ok) {
      toast.error("Please allow popups to print the resident profile");
    }
  };

  const fetchResident = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage("");
    try {
      const res = await api.get(`/web/residents/${id}`);
      const data = res.data?.data || res.data;
      setResident(data);

      setFormData({
        first_name: data.first_name || "",
        middle_name: data.middle_name || "",
        last_name: data.last_name || "",
        suffix: data.suffix || "",
        phone_number: data.phone_number || "",
        email: data.email || "",
        gender: data.gender || "Male",
        citizenship: data.citizenship || "Filipino",
        birth_date: data.birth_date
          ? String(data.birth_date).split("T")[0]
          : "",
        place_of_birth: data.place_of_birth || "",
        civil_status: data.civil_status || "Single",
        voter_status: data.voter_status || "Not Registered",
        occupation: data.occupation || "",
        monthly_income: data.monthly_income || "",
        education_attainment: data.education_attainment || "",
      });
    } catch (error: any) {
      console.error("Error fetching resident:", error);
      setIsError(true);
      setErrorMessage(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load resident",
      );
      toast.error("Failed to load resident");
    } finally {
      setIsLoading(false);
    }
  };

  /* ============================================================
     FORM HANDLERS
     ============================================================ */

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
        email: resident.email || "",
        gender: resident.gender || "Male",
        citizenship: resident.citizenship || "Filipino",
        birth_date: resident.birth_date
          ? String(resident.birth_date).split("T")[0]
          : "",
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

  /* ============================================================
     LOADING / ERROR STATES
     ============================================================ */

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
        <div className="text-center max-w-lg px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-theme-text">
            Failed to Load Resident
          </h3>
          {errorMessage && (
            <p className="text-sm text-theme-textSecondary mt-2 break-words">
              {errorMessage}
            </p>
          )}
          <div className="flex gap-2 justify-center mt-4">
            <button
              onClick={() =>
                navigate("/barangay-bagocboc/populations/residents")
              }
              className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
            >
              Back to Residents
            </button>
            <button
              onClick={fetchResident}
              className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
            >
              Try Again
            </button>
          </div>
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

  /* ============================================================
     DERIVED DATA
     ============================================================ */

  const household = resident.current_household || null;
  const stats = resident.stats || {};

  const patientRecords =
    resident.patient_records || resident.patientRecords || [];
  const maternalProfile =
    resident.maternal_profile || resident.maternalProfile || null;
  const optAssessments =
    resident.opt_plus_assessments || resident.optPlusAssessments || [];

  const certifications = resident.certifications || [];
  const clearances = resident.clearances || [];
  const penalties = resident.penalties || [];
  const payments = resident.payments || [];
  const taxPayments = resident.tax_payments || resident.taxPayments || [];

  /* ============================================================
     MAIN RENDER
     ============================================================ */

  return (
    <div className="space-y-6">
      {/* ============ HEADER ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => navigate("/barangay-bagocboc/populations/residents")}
          className="flex items-center gap-2 text-theme-textSecondary hover:text-theme-text transition-colors self-start"
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
              {/* AFTER — wired up */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
              >
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

      {/* ============ HERO CARD ============ */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-theme-primary/10 flex items-center justify-center shrink-0">
            <User className="w-12 h-12 text-theme-primary" />
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <EditNameFields
                formData={formData}
                setFormData={setFormData}
                errors={errors}
              />
            ) : (
              <>
                <h1 className="text-2xl font-bold text-theme-text">
                  {resident.first_name} {resident.middle_name || ""}{" "}
                  {resident.last_name}
                  {resident.suffix ? ` ${resident.suffix}` : ""}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-theme-textSecondary">
                  <span>
                    {resident.gender} • {resident.age ?? "—"} yrs
                  </span>
                  <span>• {resident.civil_status}</span>
                  {household?.zone && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {household.zone}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${getStatusColor(
                      resident.status || "active",
                    )}`}
                  >
                    <CheckCircle className="w-3 h-3" />{" "}
                    {resident.status || "Active"}
                  </span>
                </div>
                <p className="text-xs text-theme-textSecondary mt-1">
                  Resident ID:{" "}
                  <span className="font-mono">#{resident.id}</span>
                  {resident.created_at &&
                    ` • Registered ${formatDate(resident.created_at)}`}
                </p>
              </>
            )}

            {isEditing && (
              <>
                {errors.first_name && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.first_name}
                  </p>
                )}
                {errors.last_name && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.last_name}
                  </p>
                )}
              </>
            )}
          </div>

          {/* KPI chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            <KPITile
              label="Certificates"
              value={stats.certifications ?? certifications.length}
              color="purple"
            />
            <KPITile
              label="Clearances"
              value={stats.clearances ?? clearances.length}
              color="blue"
            />
            <KPITile
              label="Penalties"
              value={
                stats.penalties_pending ??
                penalties.filter((p: any) => p.status === "pending").length
              }
              color="red"
            />
            <KPITile
              label="Checkups"
              value={
                stats.checkups ??
                patientRecords.reduce(
                  (sum: number, pr: any) => sum + (pr.checkups?.length || 0),
                  0,
                )
              }
              color="green"
            />
          </div>
        </div>
      </div>

      {/* ============ TABS ============ */}
      <div className="flex gap-2 border-b border-theme overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${isActive
                ? "border-theme-primary text-theme-primary"
                : "border-transparent text-theme-textSecondary hover:text-theme-text"
                }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ============ TAB CONTENT ============ */}
      {tab === "overview" && (
        <OverviewTab
          resident={resident}
          isEditing={isEditing}
          formData={formData}
          setFormData={setFormData}
          handleInputChange={handleInputChange}
          errors={errors}
        />
      )}

      {tab === "household" && <HouseholdTab household={household} />}

      {tab === "health" && (
        <HealthTab
          records={patientRecords}
          maternal={maternalProfile}
          opt={optAssessments}
        />
      )}

      {tab === "documents" && (
        <DocumentsTab
          certifications={certifications}
          clearances={clearances}
        />
      )}

      {tab === "financial" && (
        <FinancialTab
          penalties={penalties}
          payments={payments}
          taxes={taxPayments}
          stats={stats}
        />
      )}

      {tab === "account" && <AccountTab resident={resident} />}
    </div>
  );
}

/* ============================================================
   OVERVIEW TAB
   ============================================================ */

function OverviewTab({
  resident,
  isEditing,
  formData,
  setFormData,
  handleInputChange,
  errors,
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Personal Info */}
      <div className="lg:col-span-2 bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
        <h2 className="text-lg font-semibold text-theme-text mb-4">
          Personal Information
        </h2>

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EditPersonalFields
              formData={formData}
              setFormData={setFormData}
              errors={errors}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoItem
              label="Birth Date"
              value={
                resident.birth_date ? formatDate(resident.birth_date) : "N/A"
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
              icon={GraduationCap}
            />
            <InfoItem
              label="Occupation"
              value={resident.occupation || "N/A"}
              icon={Briefcase}
            />
            <InfoItem
              label="Monthly Income"
              value={
                resident.monthly_income
                  ? formatCurrency(resident.monthly_income)
                  : "N/A"
              }
              icon={Wallet}
            />
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
        <h2 className="text-lg font-semibold text-theme-text mb-4">
          Contact
        </h2>

        {isEditing ? (
          <div className="space-y-4">
            <FormField label="Phone Number">
              <input
                type="text"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                placeholder="09XXXXXXXXX"
                className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </FormField>
            <FormField label="Email">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="resident@example.com"
                className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </FormField>
          </div>
        ) : (
          <div className="space-y-1">
            <InfoItem
              label="Phone"
              value={resident.phone_number || "N/A"}
              icon={Phone}
            />
            <InfoItem
              label="Email"
              value={resident.email || "N/A"}
              icon={Mail}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   HOUSEHOLD TAB
   ============================================================ */

function HouseholdTab({ household }: { household: any }) {
  if (!household) {
    return (
      <div className="bg-theme-surface rounded-xl border border-theme p-12 text-center">
        <Home className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-3" />
        <p className="text-theme-text font-medium">No household linked</p>
        <p className="text-sm text-theme-textSecondary">
          This resident is not yet assigned to a household.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Household summary */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
        <h2 className="text-lg font-semibold text-theme-text mb-4">
          Household
        </h2>
        <div className="space-y-1">
          <InfoItem
            label="Household #"
            value={household.household_number}
            icon={Hash}
          />
          <InfoItem
            label="Tracking #"
            value={household.household_tracking_number}
            icon={Hash}
          />
          <InfoItem
            label="Zone"
            value={household.zone || "N/A"}
            icon={MapPin}
          />
          <InfoItem
            label="Street"
            value={household.street || "N/A"}
            icon={MapPin}
          />
          <InfoItem
            label="Members"
            value={household.member_count}
            icon={Users}
          />
          <InfoItem
            label="Role"
            value={household.role || "Member"}
            icon={UserCheck}
          />
        </div>
        {household.is_primary && (
          <span className="inline-block mt-3 px-2 py-0.5 text-xs bg-theme-primary/10 text-theme-primary rounded-full">
            Head of Household
          </span>
        )}
      </div>

      {/* Members */}
      <div className="lg:col-span-2 bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-theme">
          <h2 className="font-semibold text-theme-text">
            Household Members
          </h2>
          <p className="text-xs text-theme-textSecondary">
            {household.member_count} member
            {household.member_count !== 1 ? "s" : ""}
          </p>
        </div>

        {!household.members || household.members.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-theme-textSecondary">
            No members in this household
          </div>
        ) : (
          <div className="divide-y divide-theme">
            {household.members.map((m: any) => (
              <div
                key={m.id}
                className="px-6 py-3 flex items-center justify-between hover:bg-theme-hover transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-theme-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-theme-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-theme-text truncate">
                      {m.full_name}
                      {m.is_primary && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-theme-primary/10 rounded text-theme-primary font-medium">
                          Head
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-theme-textSecondary">
                      {m.relationship || "Member"} • {m.gender} •{" "}
                      {m.age ?? "—"} yrs
                    </p>
                  </div>
                </div>
                <a
                  href={`/barangay-bagocboc/residents/${m.id}`}
                  className="text-xs text-theme-primary hover:underline shrink-0 ml-3"
                >
                  View →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   HEALTH TAB
   ============================================================ */

function HealthTab({
  records,
  maternal,
  opt,
}: {
  records: any[];
  maternal: any;
  opt: any[];
}) {
  return (
    <div className="space-y-6">
      {/* Patient Records */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-theme flex items-center gap-3">
          <Stethoscope className="w-5 h-5 text-theme-primary" />
          <div>
            <h2 className="font-semibold text-theme-text">
              Patient Records
            </h2>
            <p className="text-xs text-theme-textSecondary">
              {records.length} health record
              {records.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {records.length === 0 ? (
          <EmptyBlock
            icon={Stethoscope}
            label="No patient records registered"
          />
        ) : (
          <div className="divide-y divide-theme">
            {records.map((r: any) => (
              <div key={r.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-theme-primary">
                    {r.patient_type}
                  </span>
                  <span className="text-xs text-theme-textSecondary">
                    {r.checkups?.length || 0} checkup
                    {(r.checkups?.length || 0) !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MiniField label="Status" value={r.status} />
                  <MiniField
                    label="Registered"
                    value={formatDate(r.created_at)}
                  />
                  <MiniField label="Patient ID" value={`#${r.id}`} />
                  <MiniField label="Type" value={r.patient_type} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Maternal Profile */}
      {maternal && (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
          <h2 className="text-lg font-semibold text-theme-text mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Maternal Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoItem
              label="Pregnancy Status"
              value={maternal.pregnancy_status}
              icon={Heart}
            />
            <InfoItem
              label="Expected Delivery"
              value={
                maternal.expected_delivery_date
                  ? formatDate(maternal.expected_delivery_date)
                  : "—"
              }
              icon={Calendar}
            />
            <InfoItem
              label="Last Checkup"
              value={
                maternal.last_checkup_date
                  ? formatDate(maternal.last_checkup_date)
                  : "—"
              }
              icon={Calendar}
            />
            <InfoItem
              label="Family Planning"
              value={maternal.family_planning ? "Yes" : "No"}
              icon={CheckCircle}
            />
            {maternal.remarks && (
              <div className="sm:col-span-2">
                <InfoItem label="Remarks" value={maternal.remarks} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* OPT+ Assessments */}
      {opt && opt.length > 0 && (
        <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-theme flex items-center gap-3">
            <Activity className="w-5 h-5 text-theme-primary" />
            <div>
              <h2 className="font-semibold text-theme-text">
                OPT+ Assessments
              </h2>
              <p className="text-xs text-theme-textSecondary">
                {opt.length} record{opt.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-background border-b border-theme">
                <tr>
                  <Th>Date</Th>
                  <Th align="right">Weight (kg)</Th>
                  <Th align="right">Height (cm)</Th>
                  <Th>Remarks</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {opt.map((a: any) => (
                  <tr key={a.id} className="hover:bg-theme-hover">
                    <Td>{formatDate(a.assessment_date)}</Td>
                    <Td align="right">{a.weight_kg}</Td>
                    <Td align="right">{a.height_cm}</Td>
                    <Td>
                      <span className="text-theme-textSecondary">
                        {a.remarks || "—"}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   DOCUMENTS TAB
   ============================================================ */

function DocumentsTab({
  certifications,
  clearances,
}: {
  certifications: any[];
  clearances: any[];
}) {
  return (
    <div className="space-y-6">
      {/* Certifications */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-theme flex items-center gap-3">
          <FileText className="w-5 h-5 text-theme-primary" />
          <div>
            <h2 className="font-semibold text-theme-text">
              Certifications
            </h2>
            <p className="text-xs text-theme-textSecondary">
              {certifications.length} request
              {certifications.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {certifications.length === 0 ? (
          <EmptyBlock
            icon={FileText}
            label="No certifications requested"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-background border-b border-theme">
                <tr>
                  <Th>Reference</Th>
                  <Th>Type</Th>
                  <Th>Purpose</Th>
                  <Th align="center">Status</Th>
                  <Th>Requested</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {certifications.map((c: any) => (
                  <tr key={c.id} className="hover:bg-theme-hover">
                    <Td>
                      <span className="font-mono text-xs">
                        {c.reference_number}
                      </span>
                    </Td>
                    <Td>
                      {c.certification_type?.name ||
                        c.certificationType?.name ||
                        "—"}
                    </Td>
                    <Td>
                      <span className="text-theme-textSecondary truncate block max-w-[220px]">
                        {c.purpose || "—"}
                      </span>
                    </Td>
                    <Td align="center">
                      <StatusBadge status={c.status} />
                    </Td>
                    <Td>
                      <span className="text-theme-textSecondary text-sm">
                        {c.created_at ? formatDate(c.created_at) : "—"}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clearances */}
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-theme flex items-center gap-3">
          <FileCheck className="w-5 h-5 text-theme-primary" />
          <div>
            <h2 className="font-semibold text-theme-text">Clearances</h2>
            <p className="text-xs text-theme-textSecondary">
              {clearances.length} record
              {clearances.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {clearances.length === 0 ? (
          <EmptyBlock icon={FileCheck} label="No clearances issued" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-background border-b border-theme">
                <tr>
                  <Th>Reference</Th>
                  <Th>Purpose</Th>
                  <Th align="right">Amount</Th>
                  <Th align="center">Status</Th>
                  <Th>Issued</Th>
                  <Th>Valid Until</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {clearances.map((c: any) => (
                  <tr key={c.id} className="hover:bg-theme-hover">
                    <Td>
                      <span className="font-mono text-xs">
                        {c.reference_number}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-theme-textSecondary truncate block max-w-[220px]">
                        {c.purpose || "—"}
                      </span>
                    </Td>
                    <Td align="right">
                      {formatCurrency(parseFloat(c.amount) || 0)}
                    </Td>
                    <Td align="center">
                      <StatusBadge status={c.status} />
                    </Td>
                    <Td>
                      <span className="text-theme-textSecondary text-sm">
                        {c.issued_at ? formatDate(c.issued_at) : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-theme-textSecondary text-sm">
                        {c.valid_until ? formatDate(c.valid_until) : "—"}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   FINANCIAL TAB
   ============================================================ */

function FinancialTab({
  penalties,
  payments,
  taxes,
  stats,
}: {
  penalties: any[];
  payments: any[];
  taxes: any[];
  stats: any;
}) {
  const paymentsTotal =
    stats.payments_total ??
    payments.reduce(
      (sum: number, p: any) => sum + (parseFloat(p.amount) || 0),
      0,
    );
  const taxesTotal =
    stats.tax_total ??
    taxes.reduce(
      (sum: number, t: any) => sum + (parseFloat(t.amount) || 0),
      0,
    );
  const pendingPenalties =
    stats.penalties_pending ??
    penalties.filter((p: any) => p.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPITile
          label="Pending Penalties"
          value={pendingPenalties}
          color="red"
        />
        <KPITile
          label="Payments"
          value={formatCurrency(paymentsTotal)}
          color="green"
        />
        <KPITile
          label="Taxes"
          value={formatCurrency(taxesTotal)}
          color="blue"
        />
        <KPITile
          label="Certificates"
          value={stats.certifications ?? 0}
          color="purple"
        />
      </div>

      {/* Penalties */}
      <SectionTable
        title="Penalties"
        icon={AlertTriangle}
        rows={penalties}
        empty="No penalties on record"
        columns={[
          {
            key: "reference_number",
            label: "Reference",
            render: (r: any) => (
              <span className="font-mono text-xs">
                {r.reference_number}
              </span>
            ),
          },
          {
            key: "reason",
            label: "Reason",
            render: (r: any) => (
              <span className="text-theme-textSecondary">
                {r.reason || "—"}
              </span>
            ),
          },
          {
            key: "amount",
            label: "Amount",
            align: "right",
            render: (r: any) => formatCurrency(parseFloat(r.amount) || 0),
          },
          {
            key: "status",
            label: "Status",
            align: "center",
            render: (r: any) => <StatusBadge status={r.status} />,
          },
          {
            key: "issued_at",
            label: "Issued",
            render: (r: any) =>
              r.issued_at ? formatDate(r.issued_at) : "—",
          },
        ]}
      />

      {/* Payments */}
      <SectionTable
        title="Payments"
        icon={CreditCard}
        rows={payments}
        empty="No payments recorded"
        columns={[
          {
            key: "or_number",
            label: "OR #",
            render: (r: any) => (
              <span className="font-mono text-xs">{r.or_number}</span>
            ),
          },
          { key: "payment_type", label: "Type" },
          {
            key: "amount",
            label: "Amount",
            align: "right",
            render: (r: any) => formatCurrency(parseFloat(r.amount) || 0),
          },
          { key: "payment_method", label: "Method" },
          {
            key: "status",
            label: "Status",
            align: "center",
            render: (r: any) => <StatusBadge status={r.status} />,
          },
          {
            key: "paid_at",
            label: "Date",
            render: (r: any) =>
              r.paid_at ? formatDate(r.paid_at) : "—",
          },
        ]}
      />

      {/* Taxes */}
      <SectionTable
        title="Tax Payments"
        icon={Receipt}
        rows={taxes}
        empty="No tax payments recorded"
        columns={[
          {
            key: "receipt_number",
            label: "Receipt #",
            render: (r: any) => (
              <span className="font-mono text-xs">
                {r.receipt_number}
              </span>
            ),
          },
          { key: "tax_type", label: "Type" },
          {
            key: "amount",
            label: "Amount",
            align: "right",
            render: (r: any) => formatCurrency(parseFloat(r.amount) || 0),
          },
          { key: "payment_method", label: "Method" },
          {
            key: "paid_at",
            label: "Date",
            render: (r: any) =>
              r.paid_at ? formatDate(r.paid_at) : "—",
          },
        ]}
      />
    </div>
  );
}

/* ============================================================
   ACCOUNT TAB
   ============================================================ */

function AccountTab({ resident }: { resident: any }) {
  const u = resident.user;

  if (!u) {
    return (
      <div className="bg-theme-surface rounded-xl border border-theme p-12 text-center">
        <Shield className="w-12 h-12 mx-auto text-theme-textSecondary/30 mb-3" />
        <p className="text-theme-text font-medium">No linked account</p>
        <p className="text-sm text-theme-textSecondary">
          This resident hasn't registered for a mobile account yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
      <h2 className="text-lg font-semibold text-theme-text mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-theme-primary" />
        Account Information
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <InfoItem label="Email" value={u.email} icon={Mail} />
        <InfoItem
          label="Account Status"
          value={u.account_status}
          icon={u.account_status === "active" ? CheckCircle : XCircle}
        />
        <InfoItem
          label="Last Login"
          value={u.last_login_at ? formatDate(u.last_login_at) : "Never"}
          icon={Clock}
        />
        <InfoItem
          label="Email Verified"
          value={u.email_verified_at ? "Yes" : "No"}
          icon={u.email_verified_at ? CheckCircle : XCircle}
        />
        <InfoItem
          label="Phone Verified"
          value={u.phone_verified_at ? "Yes" : "No"}
          icon={u.phone_verified_at ? CheckCircle : XCircle}
        />
        <InfoItem
          label="First Login"
          value={u.is_first_login ? "Yes" : "No"}
          icon={UserCheck}
        />
        <div className="sm:col-span-2">
          <InfoItem
            label="Roles"
            value={
              (u.roles || []).map((r: any) => r.name).join(", ") || "—"
            }
            icon={Shield}
          />
        </div>
        {u.created_at && (
          <InfoItem
            label="Account Created"
            value={formatDate(u.created_at)}
            icon={Calendar}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================
   REUSABLE SUB-COMPONENTS
   ============================================================ */

function KPITile({
  label,
  value,
  color,
}: {
  label: string;
  value: any;
  color: string;
}) {
  const colors: Record<string, string> = {
    purple:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
    green:
      "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  };
  return (
    <div className={`rounded-xl p-3 ${colors[color] || colors.blue}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">
        {label}
      </p>
      <p className="text-xl font-bold mt-1 truncate">{value}</p>
    </div>
  );
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: any;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-theme last:border-0">
      {Icon && (
        <Icon className="w-5 h-5 text-theme-textSecondary flex-shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <p className="text-xs text-theme-textSecondary font-medium">
          {label}
        </p>
        <p className="text-sm text-theme-text break-words">
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-theme-textSecondary font-semibold">
        {label}
      </p>
      <p className="text-sm text-theme-text font-medium mt-0.5 truncate">
        {value ?? "—"}
      </p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-theme-textSecondary mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const colors: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    "in review":
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    approved:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    released:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    ready_for_release:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    "ready for release":
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    rejected:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    cancelled:
      "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    completed:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    active:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    inactive:
      "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    waived:
      "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs rounded-full capitalize ${colors[s] || colors.cancelled
        }`}
    >
      {status || "—"}
    </span>
  );
}

function SectionTable({
  title,
  icon: Icon,
  rows,
  columns,
  empty,
}: {
  title: string;
  icon?: React.ElementType;
  rows: any[];
  columns: {
    key: string;
    label: string;
    align?: "left" | "right" | "center";
    render?: (row: any) => React.ReactNode;
  }[];
  empty: string;
}) {
  return (
    <div className="bg-theme-surface rounded-xl border border-theme shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-theme flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-theme-primary" />}
        <div>
          <h2 className="font-semibold text-theme-text">{title}</h2>
          <p className="text-xs text-theme-textSecondary">
            {rows.length} record{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyBlock icon={Clock} label={empty} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-background border-b border-theme">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-4 py-2 text-xs font-medium text-theme-textSecondary uppercase tracking-wider text-${c.align || "left"
                      }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-theme-hover">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-2 text-sm text-theme-text text-${c.align || "left"
                        }`}
                    >
                      {c.render ? c.render(r) : r[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyBlock({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="px-6 py-10 text-center text-sm text-theme-textSecondary">
      <Icon className="w-8 h-8 mx-auto opacity-30 mb-2" />
      {label}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={`px-4 py-2 text-xs font-medium text-theme-textSecondary uppercase tracking-wider text-${align}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <td className={`px-4 py-2 text-sm text-theme-text text-${align}`}>
      {children}
    </td>
  );
}

/* ============================================================
   EDIT FIELDS
   ============================================================ */

function EditNameFields({
  formData,
  setFormData,
  errors,
}: {
  formData: any;
  setFormData: any;
  errors: Record<string, string>;
}) {
  const set = (key: string, value: any) =>
    setFormData((prev: any) => ({ ...prev, [key]: value }));

  const baseInput =
    "px-3 py-2 border rounded-lg bg-theme-surface text-theme-text outline-none focus:ring-2 focus:ring-theme-primary";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
      <input
        type="text"
        value={formData.first_name}
        onChange={(e) => set("first_name", e.target.value)}
        placeholder="First Name"
        className={`${baseInput} ${errors.first_name ? "border-red-500" : "border-theme"
          }`}
      />
      <input
        type="text"
        value={formData.middle_name}
        onChange={(e) => set("middle_name", e.target.value)}
        placeholder="Middle Name"
        className={`${baseInput} border-theme`}
      />
      <input
        type="text"
        value={formData.last_name}
        onChange={(e) => set("last_name", e.target.value)}
        placeholder="Last Name"
        className={`${baseInput} ${errors.last_name ? "border-red-500" : "border-theme"
          }`}
      />
      <input
        type="text"
        value={formData.suffix}
        onChange={(e) => set("suffix", e.target.value)}
        placeholder="Suffix"
        className={`${baseInput} border-theme`}
      />
    </div>
  );
}

function EditPersonalFields({
  formData,
  setFormData,
  errors,
}: {
  formData: any;
  setFormData: any;
  errors: Record<string, string>;
}) {
  const set = (key: string, value: any) =>
    setFormData((prev: any) => ({ ...prev, [key]: value }));

  const inputCls = (err?: string) =>
    `w-full px-3 py-2 border rounded-lg bg-theme-surface text-theme-text outline-none focus:ring-2 focus:ring-theme-primary ${err ? "border-red-500" : "border-theme"
    }`;

  return (
    <>
      <FormField label="Birth Date *">
        <input
          type="date"
          name="birth_date"
          value={formData.birth_date}
          onChange={(e) => set("birth_date", e.target.value)}
          className={inputCls(errors.birth_date)}
        />
        {errors.birth_date && (
          <p className="text-xs text-red-500 mt-1">{errors.birth_date}</p>
        )}
      </FormField>

      <FormField label="Gender *">
        <select
          name="gender"
          value={formData.gender}
          onChange={(e) => set("gender", e.target.value)}
          className={inputCls(errors.gender)}
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        {errors.gender && (
          <p className="text-xs text-red-500 mt-1">{errors.gender}</p>
        )}
      </FormField>

      <FormField label="Place of Birth *">
        <input
          type="text"
          name="place_of_birth"
          value={formData.place_of_birth}
          onChange={(e) => set("place_of_birth", e.target.value)}
          className={inputCls(errors.place_of_birth)}
        />
        {errors.place_of_birth && (
          <p className="text-xs text-red-500 mt-1">
            {errors.place_of_birth}
          </p>
        )}
      </FormField>

      <FormField label="Citizenship *">
        <input
          type="text"
          name="citizenship"
          value={formData.citizenship}
          onChange={(e) => set("citizenship", e.target.value)}
          className={inputCls(errors.citizenship)}
        />
        {errors.citizenship && (
          <p className="text-xs text-red-500 mt-1">
            {errors.citizenship}
          </p>
        )}
      </FormField>

      <FormField label="Civil Status *">
        <select
          name="civil_status"
          value={formData.civil_status}
          onChange={(e) => set("civil_status", e.target.value)}
          className={inputCls(errors.civil_status)}
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
      </FormField>

      <FormField label="Voter Status">
        <select
          name="voter_status"
          value={formData.voter_status}
          onChange={(e) => set("voter_status", e.target.value)}
          className={inputCls()}
        >
          <option value="Registered Local">Registered Local</option>
          <option value="Registered_Outside">Registered Outside</option>
          <option value="Not Registered">Not Registered</option>
        </select>
      </FormField>

      <FormField label="Education Attainment *">
        <input
          type="text"
          name="education_attainment"
          value={formData.education_attainment}
          onChange={(e) => set("education_attainment", e.target.value)}
          className={inputCls(errors.education_attainment)}
        />
        {errors.education_attainment && (
          <p className="text-xs text-red-500 mt-1">
            {errors.education_attainment}
          </p>
        )}
      </FormField>

      <FormField label="Occupation">
        <input
          type="text"
          name="occupation"
          value={formData.occupation}
          onChange={(e) => set("occupation", e.target.value)}
          className={inputCls()}
        />
      </FormField>

      <FormField label="Monthly Income">
        <input
          type="number"
          name="monthly_income"
          value={formData.monthly_income}
          onChange={(e) => set("monthly_income", e.target.value)}
          className={inputCls()}
          placeholder="0.00"
        />
      </FormField>
    </>
  );
}