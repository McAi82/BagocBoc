// types/index.ts

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  status: "success" | "error";
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

// ============================================
// AUTH TYPES
// ============================================

export interface User {
  id: number;
  resident_id?: number;
  email: string;
  account_status: "active" | "inactive";
  is_first_login: boolean;
  last_login_at?: string;
  phone_verified_at?: string;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
  roles: Role[];
  resident?: Resident;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  message: string;
  user: User;
  roles: string[];
  token: string;
  token_type: string;
}

export interface RegisterRequest {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix_name?: string;
  phone_number: string;
  email: string;
  password: string;
  role_id: number;
}

export interface OtpRequest {
  user_id: number;
  otp: string;
  purpose: "is_first_login" | "password_reset";
}

export interface ResetPasswordRequest {
  user_id: number;
  password: string;
  password_confirmation: string;
}

// ============================================
// RESIDENT TYPES
// ============================================

export interface Resident {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  phone_number?: string;
  gender: "Male" | "Female";
  citizenship: string;
  birth_date: string;
  place_of_birth: string;
  civil_status: "Single" | "Married" | "Widow" | "Legally Separated";
  voter_status: "Registered Local" | "Registered_Outside" | "Not Registered";
  occupation?: string;
  monthly_income?: number;
  education_attainment: string;
  relationship_to_head?: string;
  PSC_with_disability?: boolean;
  created_at: string;
  updated_at: string;
  households?: Household[];
}

export interface CreateResidentRequest {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  phone_number?: string;
  gender: "Male" | "Female";
  citizenship: string;
  voter_status: "Registered Local" | "Registered_Outside" | "Not Registered";
  civil_status: "Single" | "Married" | "Widow" | "Legally Separated";
  birth_date: string;
  place_of_birth: string;
  occupation?: string;
  monthly_income?: number;
  education_attainment: string;
}

// ============================================
// HOUSEHOLD TYPES
// ============================================

export interface Household {
  id: number;
  address_id: number;
  household_tracking_number: string;
  household_number: string;
  created_at: string;
  updated_at: string;
  address?: HouseholdAddress;
  residents?: Resident[];
  census_records?: HouseholdCensusRecord[];
}

export interface HouseholdAddress {
  id: number;
  zone: number;
  street: string;
  subdivision?: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdCensusRecord {
  id: number;
  household_id: number;
  census_year: number;
  census_date: string;
  monthly_income?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateHouseholdRequest {
  zone: number;
  street: string;
  subdivision?: string;
  household_number: string;
  household_tracking_number: string;
}

// ============================================
// CERTIFICATION TYPES
// ============================================

export interface Certification {
  id: number;
  resident_id: number;
  certification_type_id: number;
  requested_by_user_id: number;
  processed_by_user_id?: number;
  reference_number: string;
  purpose?: string;
  details?: string;
  remarks?: string;
  status:
  | "Pending"
  | "In Review"
  | "Approved"
  | "Ready for Release"
  | "Released"
  | "Rejected"
  | "Cancelled";
  issued_at?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
  resident?: Resident;
  certification_type?: CertificationType;
}

export interface CertificationType {
  id: number;
  name: string;
  description?: string;
  fee: number;
  is_active: boolean;
}

export interface CreateCertificationRequest {
  resident_id: number;
  certification_type_id: number;
  purpose?: string;
  details?: string;
}

// ============================================
// CLEARANCE TYPES
// ============================================

export interface Clearance {
  id: number;
  resident_id: number;
  processed_by_user_id: number;
  reference_number: string;
  purpose?: string;
  amount: number;
  status: "pending" | "approved" | "released" | "rejected";
  issued_at?: string;
  valid_until?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  resident?: Resident;
  processedBy?: User;
}

export interface ClearanceConfiguration {
  id: number;
  default_fee: number;
  punong_barangay_name?: string;
  barangay_secretary_name?: string;
  header_text?: string;
  footer_text?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface Payment {
  id: number;
  resident_id: number;
  processed_by_user_id: number;
  or_number: string;
  amount: number;
  payment_type: string;
  payment_method: "Cash" | "GCash";
  description?: string;
  status: "pending" | "completed" | "failed";
  paid_at?: string;
  payable_id?: number;
  payable_type?: string;
  created_at: string;
  updated_at: string;
  resident?: Resident;
  processedBy?: User;
}

export interface TaxPayment {
  id: number;
  resident_id?: number;
  processed_by_user_id: number;
  receipt_number: string;
  taxpayer_name: string;
  tax_type: "Cedula" | "Real Property Tax" | "Business Tax";
  amount: number;
  payment_method: "Cash" | "GCash";
  status: "pending" | "paid";
  paid_at?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  resident?: Resident;
  processedBy?: User;
}

// ============================================
// FINANCIAL REPORT TYPES
// ============================================

export interface FinancialReport {
  id: number;
  created_by_user_id: number;
  approved_by_user_id?: number;
  title: string;
  report_type: "collection" | "budget" | "annual" | "certificate";
  period: string;
  total_amount: number;
  notes?: string;
  status: "draft" | "pending" | "approved" | "rejected";
  submitted_at?: string;
  approved_at?: string;
  rejection_reason?: string;
  report_data?: any;
  created_at: string;
  updated_at: string;
  createdBy?: User;
  approvedBy?: User;
}

// ============================================
// BUDGET TYPES
// ============================================

export interface Budget {
  id: number;
  year: number;
  category: string;
  allocated: number;
  utilized: number;
  remaining: number;
  description?: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

// ============================================
// PENALTY TYPES
// ============================================

export interface Penalty {
  id: number;
  resident_id: number;
  issued_by_user_id: number;
  reference_number: string;
  reason: string;
  description?: string;
  amount: number;
  status: "pending" | "paid" | "waived";
  issued_at?: string;
  paid_at?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  resident?: Resident;
  issuedBy?: User;
}

// ============================================
// ANNOUNCEMENT TYPES
// ============================================

export interface Announcement {
  id: number;
  created_by_user_id: number;
  title: string;
  message: string;
  target_group: string;
  priority: "low" | "medium" | "high";
  action_url?: string;
  image_url?: string;
  expires_at?: string;
  status: "Published" | "Draft" | "Archived";
  created_at: string;
  updated_at: string;
  createdBy?: User;
}

// ============================================
// FRONT DESK TYPES
// ============================================

export interface FrontDeskRequest {
  id: number;
  resident_id: number;
  service_type: string;
  purpose?: string;
  priority: "low" | "normal" | "high" | "urgent";
  reference_number: string;
  status: "pending" | "processing" | "completed" | "forwarded" | "cancelled";
  created_by_user_id: number;
  processed_by_user_id?: number;
  processed_at?: string;
  issued_at?: string;
  forwarded_to_office?: string;
  forwarded_notes?: string;
  forwarded_by_user_id?: number;
  forwarded_at?: string;
  cancelled_at?: string;
  cancelled_by_user_id?: number;
  created_at: string;
  updated_at: string;
  resident?: Resident;
  createdBy?: User;
  processedBy?: User;
}

export interface FrontDeskQueue {
  id: number;
  resident_id: number;
  request_id?: number;
  position: number;
  status: "waiting" | "serving" | "done";
  joined_at?: string;
  called_at?: string;
  created_at: string;
  updated_at: string;
  resident?: Resident;
  request?: FrontDeskRequest;
}

export interface FrontDeskAppointment {
  id: number;
  resident_id: number;
  request_id?: number;
  service_type: string;
  appointment_date: string;
  appointment_time?: string;
  notes?: string;
  reference_number: string;
  status: "scheduled" | "confirmed" | "cancelled" | "completed";
  created_by_user_id: number;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  resident?: Resident;
  request?: FrontDeskRequest;
  createdBy?: User;
}

export interface FrontDeskClaimSlip {
  id: number;
  request_id: number;
  resident_id: number;
  reference_number: string;
  document_type: string;
  status: "pending" | "claimed";
  issued_by_user_id: number;
  issued_at?: string;
  claimed_at?: string;
  claimed_by_user_id?: number;
  created_at: string;
  updated_at: string;
  resident?: Resident;
  request?: FrontDeskRequest;
  issuedBy?: User;
  claimedBy?: User;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface Notification {
  id: number;
  sender_user_id?: number;
  title: string;
  message: string;
  category: string;
  reference_type?: string;
  reference_id?: number;
  deep_link?: string;
  priority: "low" | "normal" | "high";
  created_at: string;
  updated_at: string;
  sender?: User;
  recipients?: User[];
}

export interface NotificationRecipient {
  id: number;
  notification_id: number;
  user_id: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  notification?: Notification;
  user?: User;
}

// ============================================
// BARANGAY TYPES
// ============================================

export interface BarangayInfo {
  id: number;
  name?: string;
  captain_name?: string;
  municipality?: string;
  province?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  seal_url?: string;
  barangay_secretary?: string;
  barangay_treasurer?: string;
  about_us?: string;
  mission?: string;
  vision?: string;
  created_at: string;
  updated_at: string;
}

export interface BarangayZone {
  id: number;
  zone_number: number;
  name: string;
  created_at: string;
  updated_at: string;
  household_addresses?: HouseholdAddress[];
}

// ============================================
// GEO TYPES
// ============================================

export interface HouseGeotag {
  id: number;
  household_id: number;
  latitude: number;
  longitude: number;
  captured_at?: string;
  created_at: string;
  updated_at: string;
  household?: Household;
}

// ============================================
// ACCOUNT ACTIVATION TYPES
// ============================================

export interface AccountActivation {
  id: number;
  resident_id: number;
  reference_number: string;
  id_type?: string;
  id_front_path?: string;
  id_back_path?: string;
  status: "pending" | "approved" | "rejected";
  remarks?: string;
  approved_at?: string;
  approved_by_user_id?: number;
  created_at: string;
  updated_at: string;
  resident?: Resident;
  approvedBy?: User;
}

// ============================================
// ACTIVITY LOG TYPES
// ============================================

export interface RecordActivityLog {
  id: number;
  encoded_by: number;
  record_id: number;
  record_type: string;
  action: string;
  data_status?: string;
  details?: string;
  created_at: string;
  updated_at: string;
  encoder?: User;
  record?: any;
}

// ============================================
// OTP TYPES
// ============================================

export interface Otp {
  id: number;
  user_id: number;
  phone_number: string;
  code_hash: string;
  purpose: "is_first_login" | "password_reset";
  expires_at: string;
  used_at?: string;
  attempts: number;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

// ============================================
// PROGRAM TYPES
// ============================================

export interface Program {
  id: number;
  programs: string;
  description?: string;
  start_date: string;
  end_date: string;
  program_type: "nutrition" | "drug" | "sexual_health" | "maternal" | "other";
  status: "planned" | "ongoing" | "completed" | "cancelled";
  budget?: number;
  target_beneficiaries?: number;
  location?: string;
  implementing_agency?: string;
  focal_person_id?: number;
  created_at: string;
  updated_at: string;
  focal_person?: User;
  participants?: ProgramParticipant[];
}

export interface ProgramParticipant {
  id: number;
  program_id: number;
  resident_id: number;
  enrolled_at?: string;
  status: "active" | "inactive" | "completed" | "dropped";
  notes?: string;
  created_at: string;
  updated_at: string;
  program?: Program;
  resident?: Resident;
  nutrition_assessments?: NutritionAssessment[];
}

export interface NutritionAssessment {
  id: number;
  participant_id: number;
  assessment_date: string;
  weight: number;
  height: number;
  bmi?: number;
  nutrition_status?: string;
  weight_for_age_status?: string;
  height_for_age_status?: string;
  weight_for_height_status?: string;
  remarks?: string;
  encoded_by: number;
  created_at: string;
  updated_at: string;
  participant?: ProgramParticipant;
  encoded_by_user?: User;
}

// ============================================
// MATERNAL TYPES
// ============================================

export interface MaternalProfile {
  id: number;
  resident_id: number;
  pregnancy_status: "pregnant" | "postpartum" | "terminated";
  expected_delivery_date?: string;
  last_checkup_date?: string;
  family_planning: boolean;
  remarks?: string;
  created_at: string;
  updated_at: string;
  resident?: Resident;
}

// ============================================
// OPT PLUS TYPES
// ============================================

export interface OptPlusAssessment {
  id: number;
  assessment_date: string;
  resident_id: number;
  weight_kg: number;
  height_cm: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
  resident?: Resident;
}

// ============================================
// ZONE CHECK-IN TYPES
// ============================================

export interface ZoneCheckIn {
  id: number;
  zone_leader_id: number;
  zone_id: number;
  latitude?: number;
  longitude?: number;
  notes?: string;
  status: "clear" | "needs_attention" | "urgent";
  checked_in_at?: string;
  findings?: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
  zone_leader?: User;
  zone?: BarangayZone;
}

// ============================================
// CERTIFICATION DOCUMENT TYPES
// ============================================

export interface CertificationDocument {
  id: number;
  certification_id: number;
  document_type_id: number;
  uploaded_by_user_id: number;
  verification_status: "Pending" | "Verified" | "Rejected";
  verified_by_user_id?: number;
  verified_at?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  certification?: Certification;
  uploaded_by?: User;
  verified_by?: User;
}

export interface CertificationPayment {
  id: number;
  certification_id: number;
  amount: number;
  payment_method: "Cash" | "GCash";
  reference_number?: string;
  official_receipt_number?: string;
  status: "Pending" | "Paid" | "Failed" | "Refunded";
  paid_at?: string;
  created_at: string;
  updated_at: string;
  certification?: Certification;
}

// ============================================
// FOOD PRODUCTION TYPES
// ============================================

export interface FoodProductionType {
  id: number;
  name: string;
}

export interface CensusFoodProduction {
  household_census_record_id: number;
  food_production_type_id: number;
}

// ============================================
// HOUSEHOLD ENVIRONMENT TYPES
// ============================================

export interface HouseholdEnvironment {
  id: number;
  household_census_id: number;
  toilet_type: string;
  water_source: string;
  garbage_disposal: string;
  tenure_status: "Owned" | "Rent Free Without Consent Informal Settler";
  couple_practices_family_planning: boolean;
  uses_iodized_salt: "Yes" | "No" | "Unknown";
  OSY_count: number;
  ISY_count: number;
  type_of_dwelling_unit: string;
  census_record?: HouseholdCensusRecord;
}

// ============================================
// CONSTANTS / ENUMS
// ============================================

export const ROLES = {
  SUPER_ADMIN: "Super Admin",
  BARANGAY_CAPTAIN: "Barangay Captain",
  BARANGAY_SECRETARY: "Barangay Secretary",
  BARANGAY_TREASURER: "Barangay Treasurer",
  FRONT_DESK_CLERK: "Front Desk Clerk",
  BARANGAY_HEALTH_WORKER: "Barangay Health Worker",
  NURSE_DEPLOYMENT_PROGRAM: "Nurse Deployment Program",
  BARANGAY_NUTRITION_SCHOLAR: "Barangay Nutrition Scholar",
  ZONE_LEADER: "Zone Leader",
  RESIDENT: "Resident",
} as const;

export const WEB_ACCESSIBLE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.BARANGAY_CAPTAIN,
  ROLES.BARANGAY_SECRETARY,
  ROLES.BARANGAY_TREASURER,
  ROLES.NURSE_DEPLOYMENT_PROGRAM,
  ROLES.FRONT_DESK_CLERK,
];

export const MOBILE_ACCESSIBLE_ROLES = [
  ROLES.BARANGAY_HEALTH_WORKER,
  ROLES.BARANGAY_NUTRITION_SCHOLAR,
  ROLES.ZONE_LEADER,
  ROLES.RESIDENT,
];

export const CERTIFICATION_STATUSES = {
  PENDING: "Pending",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  READY_FOR_RELEASE: "Ready for Release",
  RELEASED: "Released",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
} as const;

export const PAYMENT_STATUSES = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const CLEARANCE_STATUSES = {
  PENDING: "pending",
  APPROVED: "approved",
  RELEASED: "released",
  REJECTED: "rejected",
} as const;

export const FRONT_DESK_STATUSES = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FORWARDED: "forwarded",
  CANCELLED: "cancelled",
} as const;

export const PRIORITY_LEVELS = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export const TARGET_GROUPS = [
  "All",
  "Youth",
  "Senior Citizens",
  "Heads of Family",
  "Voters",
  "Pregnant Women",
  "Lactating Mothers",
] as const;

export const PAYMENT_METHODS = ["Cash", "GCash"] as const;

export const TAX_TYPES = [
  "Cedula",
  "Real Property Tax",
  "Business Tax",
] as const;

export const GENDER = ["Male", "Female"] as const;

export const CIVIL_STATUS = [
  "Single",
  "Married",
  "Widow",
  "Legally Separated",
] as const;

export const VOTER_STATUS = [
  "Registered Local",
  "Registered_Outside",
  "Not Registered",
] as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];
export type CertificationStatus =
  (typeof CERTIFICATION_STATUSES)[keyof typeof CERTIFICATION_STATUSES];
export type PaymentStatus =
  (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];
export type ClearanceStatus =
  (typeof CLEARANCE_STATUSES)[keyof typeof CLEARANCE_STATUSES];
export type FrontDeskStatus =
  (typeof FRONT_DESK_STATUSES)[keyof typeof FRONT_DESK_STATUSES];
export type PriorityLevel =
  (typeof PRIORITY_LEVELS)[keyof typeof PRIORITY_LEVELS];
export type TargetGroup = (typeof TARGET_GROUPS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type TaxType = (typeof TAX_TYPES)[number];
export type Gender = (typeof GENDER)[number];
export type CivilStatus = (typeof CIVIL_STATUS)[number];
export type VoterStatus = (typeof VOTER_STATUS)[number];
