import { z } from 'zod';

export const addressBodySchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  phoneNumber: z.string().trim().min(1, 'Phone number is required').max(50),
  region: z.string().trim().optional(),
  province: z.string().trim().optional(),
  city: z.string().trim().optional(),
  barangay: z.string().trim().optional(),
  postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
  streetName: z.string().trim().max(200).optional(),
  building: z.string().trim().max(200).optional(),
  houseNo: z.string().trim().max(50).optional(),
  label: z.enum(['home', 'work', 'other'], { required_error: 'Please select a label' })
});