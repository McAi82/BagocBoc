import { z } from 'zod'

export const emailSchema = z.string().email('Invalid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const phoneSchema = z
  .string()
  .regex(/^09\d{9}$/, 'Invalid phone number format. Must be 09XXXXXXXXX')

export const residentSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  middle_name: z.string().optional(),
  suffix: z.string().optional(),
  phone_number: phoneSchema.optional(),
  gender: z.enum(['Male', 'Female']),
  citizenship: z.string().min(1, 'Citizenship is required'),
  voter_status: z.enum(['Registered Local', 'Registered_Outside', 'Not Registered']),
  civil_status: z.enum(['Single', 'Married', 'Widow', 'Legally Separated']),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  place_of_birth: z.string().min(1, 'Place of birth is required'),
  occupation: z.string().optional(),
  monthly_income: z.number().min(0).optional(),
  education_attainment: z.string().min(1, 'Education attainment is required'),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    middle_name: z.string().optional(),
    suffix_name: z.string().optional(),
    phone_number: phoneSchema,
    email: emailSchema,
    password: passwordSchema,
    password_confirmation: z.string(),
    role_id: z.number().min(1, 'Role is required'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ['password_confirmation'],
  })