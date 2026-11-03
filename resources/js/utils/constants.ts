export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Barangay Bagocboc'
export const APP_ENV = import.meta.env.VITE_APP_ENV || 'development'

export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  BARANGAY_CAPTAIN: 'Barangay Captain',
  BARANGAY_SECRETARY: 'Barangay Secretary',
  BARANGAY_TREASURER: 'Barangay Treasurer',
  FRONT_DESK_CLERK: 'Front Desk Clerk',
  NURSE_DEPLOYMENT_PROGRAM: "Nurse Deployment Program", 
  BARANGAY_HEALTH_WORKER: 'Barangay Health Worker',
  BARANGAY_NUTRITION_SCHOLAR: 'Barangay Nutrition Scholar',
  ZONE_LEADER: 'Zone Leader',
  RESIDENT: 'Resident',
  MIDWIFE: 'Midwife',
} as const

export const WEB_ACCESSIBLE_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.BARANGAY_CAPTAIN,
  ROLES.BARANGAY_SECRETARY,
  ROLES.BARANGAY_TREASURER,
  ROLES.FRONT_DESK_CLERK,
  ROLES.MIDWIFE,
  ROLES.BARANGAY_NUTRITION_SCHOLAR,
  ROLES.NURSE_DEPLOYMENT_PROGRAM,
];

export const MOBILE_ACCESSIBLE_ROLES = [
  ROLES.BARANGAY_HEALTH_WORKER,
  ROLES.ZONE_LEADER,
  ROLES.RESIDENT,
]
export const CERTIFICATION_STATUSES = {
  PENDING: 'Pending',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  READY_FOR_RELEASE: 'Ready for Release',
  RELEASED: 'Released',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
} as const

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export const CLEARANCE_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  RELEASED: 'released',
  REJECTED: 'rejected',
} as const

export const FRONT_DESK_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FORWARDED: 'forwarded',
  CANCELLED: 'cancelled',
} as const

export const PRIORITY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const

export const TARGET_GROUPS = [
  'All',
  'Youth',
  'Senior Citizens',
  'Heads of Family',
  'Voters',
  'Pregnant Women',
  'Lactating Mothers',
] as const

export const PAYMENT_METHODS = ['Cash', 'GCash'] as const

export const TAX_TYPES = ['Cedula', 'Real Property Tax', 'Business Tax'] as const

export const GENDER = ['Male', 'Female'] as const

export const CIVIL_STATUS = ['Single', 'Married', 'Widow', 'Legally Separated'] as const

export const VOTER_STATUS = ['Registered Local', 'Registered_Outside', 'Not Registered'] as const