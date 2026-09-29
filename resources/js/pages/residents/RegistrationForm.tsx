// pages/residents/RegistrationForm.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Heart,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api } from "../../api/apiClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";

const residentFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  suffix: z.string().optional(),
  phone_number: z.string().optional(),
  gender: z.enum(["Male", "Female"], { required_error: "Gender is required" }),
  citizenship: z.string().min(1, "Citizenship is required"),
  voter_status: z.enum(
    ["Registered Local", "Registered_Outside", "Not Registered"],
    { required_error: "Voter status is required" },
  ),
  civil_status: z.enum(["Single", "Married", "Widow", "Legally Separated"], {
    required_error: "Civil status is required",
  }),
  birth_date: z.string().min(1, "Birth date is required"),
  place_of_birth: z.string().min(1, "Place of birth is required"),
  occupation: z.string().optional(),
  monthly_income: z.number().min(0).optional(),
  education_attainment: z.string().min(1, "Education attainment is required"),
});

type ResidentFormData = z.infer<typeof residentFormSchema>;

export default function RegistrationForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<ResidentFormData>({
    resolver: zodResolver(residentFormSchema),
    defaultValues: {
      citizenship: "Filipino",
      voter_status: "Not Registered",
      civil_status: "Single",
      first_name: "",
      last_name: "",
      gender: "Male",
      place_of_birth: "",
      birth_date: "",
      education_attainment: "",
    },
  });

  const onSubmit = async (data: ResidentFormData) => {
    setIsSubmitting(true);
    try {
      await api.post("/web/residents", data);
      toast.success("Resident registered successfully!");
      navigate("/barangay-bagocboc/residents");
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        Object.keys(apiErrors).forEach((key) => {
          setError(key as any, { message: apiErrors[key][0] });
        });
        toast.error("Please fix the errors below");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to register resident",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      const currentFields = ["first_name", "last_name", "gender", "birth_date"];
      const hasErrors = currentFields.some(
        (field) => errors[field as keyof ResidentFormData],
      );
      if (hasErrors) {
        toast.error("Please fix errors before proceeding");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));
  const watchAll = watch();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-theme-surface rounded-xl border border-theme shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-theme-text">
              Register Resident
            </h1>
            <p className="text-sm text-theme-textSecondary mt-1">
              Fill in the details below to register a new resident
            </p>
          </div>
          <button
            onClick={() => navigate("/barangay-bagocboc/populations/residents")}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Residents
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
          {["Personal Info", "Address & Contact", "Review"].map(
            (label, index) => (
              <React.Fragment key={index}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      step > index + 1
                        ? "bg-green-500 text-white"
                        : step === index + 1
                          ? "bg-theme-primary text-white"
                          : "bg-theme-background text-theme-textSecondary"
                    }`}
                  >
                    {step > index + 1 ? "✓" : index + 1}
                  </div>
                  <span className="text-xs text-theme-textSecondary mt-1">
                    {label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > index + 1 ? "bg-green-500" : "bg-theme-border"
                    }`}
                  />
                )}
              </React.Fragment>
            ),
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="First Name"
                  required
                  error={errors.first_name?.message}
                >
                  <input
                    {...register("first_name")}
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="John"
                  />
                </FormField>
                <FormField
                  label="Middle Name"
                  error={errors.middle_name?.message}
                >
                  <input
                    {...register("middle_name")}
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="Doe"
                  />
                </FormField>
                <FormField
                  label="Last Name"
                  required
                  error={errors.last_name?.message}
                >
                  <input
                    {...register("last_name")}
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="Smith"
                  />
                </FormField>
                <FormField label="Suffix" error={errors.suffix?.message}>
                  <input
                    {...register("suffix")}
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="Jr., Sr., III"
                  />
                </FormField>
                <FormField
                  label="Gender"
                  required
                  error={errors.gender?.message}
                >
                  <select
                    {...register("gender")}
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </FormField>
                <FormField
                  label="Birth Date"
                  required
                  error={errors.birth_date?.message}
                >
                  <input
                    {...register("birth_date")}
                    type="date"
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  />
                </FormField>
                <FormField
                  label="Civil Status"
                  required
                  error={errors.civil_status?.message}
                >
                  <select
                    {...register("civil_status")}
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widow">Widow</option>
                    <option value="Legally Separated">Legally Separated</option>
                  </select>
                </FormField>
                <FormField
                  label="Citizenship"
                  required
                  error={errors.citizenship?.message}
                >
                  <input
                    {...register("citizenship")}
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="Filipino"
                  />
                </FormField>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Address & Contact */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Place of Birth"
                  required
                  error={errors.place_of_birth?.message}
                >
                  <input
                    {...register("place_of_birth")}
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="City, Province"
                  />
                </FormField>
                <FormField
                  label="Phone Number"
                  error={errors.phone_number?.message}
                >
                  <input
                    {...register("phone_number")}
                    type="tel"
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="09XXXXXXXXX"
                  />
                </FormField>
                <FormField
                  label="Voter Status"
                  required
                  error={errors.voter_status?.message}
                >
                  <select
                    {...register("voter_status")}
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors"
                  >
                    <option value="Registered Local">Registered Local</option>
                    <option value="Registered_Outside">
                      Registered Outside
                    </option>
                    <option value="Not Registered">Not Registered</option>
                  </select>
                </FormField>
                <FormField
                  label="Education Attainment"
                  required
                  error={errors.education_attainment?.message}
                >
                  <input
                    {...register("education_attainment")}
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="College Graduate"
                  />
                </FormField>
                <FormField
                  label="Occupation"
                  error={errors.occupation?.message}
                >
                  <input
                    {...register("occupation")}
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="Job title"
                  />
                </FormField>
                <FormField
                  label="Monthly Income"
                  error={errors.monthly_income?.message}
                >
                  <input
                    {...register("monthly_income", { valueAsNumber: true })}
                    type="number"
                    className="w-full px-4 py-2 border border-theme rounded-lg bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-colors placeholder:text-theme-textSecondary"
                    placeholder="0.00"
                  />
                </FormField>
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 px-6 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-2 bg-theme-primary text-white rounded-lg hover:opacity-90 transition-colors"
                >
                  Review <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-theme-primary/10 border border-theme-primary/20 rounded-lg p-4">
                <p className="text-sm text-theme-primary">
                  Please review all information before submitting. Make sure all
                  details are correct.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReviewItem
                  label="First Name"
                  value={watchAll.first_name || "N/A"}
                />
                <ReviewItem
                  label="Middle Name"
                  value={watchAll.middle_name || "N/A"}
                />
                <ReviewItem
                  label="Last Name"
                  value={watchAll.last_name || "N/A"}
                />
                <ReviewItem label="Suffix" value={watchAll.suffix || "N/A"} />
                <ReviewItem label="Gender" value={watchAll.gender || "N/A"} />
                <ReviewItem
                  label="Birth Date"
                  value={watchAll.birth_date || "N/A"}
                />
                <ReviewItem
                  label="Civil Status"
                  value={watchAll.civil_status || "N/A"}
                />
                <ReviewItem
                  label="Citizenship"
                  value={watchAll.citizenship || "N/A"}
                />
                <ReviewItem
                  label="Place of Birth"
                  value={watchAll.place_of_birth || "N/A"}
                />
                <ReviewItem
                  label="Phone Number"
                  value={watchAll.phone_number || "N/A"}
                />
                <ReviewItem
                  label="Voter Status"
                  value={watchAll.voter_status || "N/A"}
                />
                <ReviewItem
                  label="Education"
                  value={watchAll.education_attainment || "N/A"}
                />
                <ReviewItem
                  label="Occupation"
                  value={watchAll.occupation || "N/A"}
                />
                <ReviewItem
                  label="Monthly Income"
                  value={
                    watchAll.monthly_income
                      ? `₱${watchAll.monthly_income}`
                      : "N/A"
                  }
                />
              </div>
              <div className="flex justify-between pt-4 border-t border-theme">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 px-6 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />{" "}
                      Registering...
                    </>
                  ) : (
                    "Register Resident"
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-theme-text mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-theme-background rounded-lg p-3">
      <p className="text-xs text-theme-textSecondary font-medium">{label}</p>
      <p className="text-sm text-theme-text font-medium">{value || "N/A"}</p>
    </div>
  );
}
