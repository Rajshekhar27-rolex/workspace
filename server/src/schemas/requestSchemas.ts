import { z } from 'zod';

export const RequestStatusEnum = z.enum(['NEW', 'QUALIFIED', 'CLOSED']);
export type RequestStatus = z.infer<typeof RequestStatusEnum>;

export const CreateRequestSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters.')
    .max(100, 'Customer name must not exceed 100 characters.'),
  customerEmail: z
    .string()
    .trim()
    .email('Please provide a valid email address.'),
  customerPhone: z
    .string()
    .trim()
    .max(30, 'Phone number must not exceed 30 characters.')
    .optional()
    .nullable(),
  requestedService: z
    .string()
    .trim()
    .min(2, 'Requested service must be at least 2 characters.')
    .max(150, 'Requested service must not exceed 150 characters.'),
  details: z
    .string()
    .trim()
    .max(1000, 'Details must not exceed 1000 characters.')
    .optional()
    .nullable(),
  status: RequestStatusEnum.default('NEW'),
});

export type CreateRequestInput = z.infer<typeof CreateRequestSchema>;

export const UpdateRequestSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters.')
    .max(100, 'Customer name must not exceed 100 characters.')
    .optional(),
  customerEmail: z
    .string()
    .trim()
    .email('Please provide a valid email address.')
    .optional(),
  customerPhone: z
    .string()
    .trim()
    .max(30, 'Phone number must not exceed 30 characters.')
    .optional()
    .nullable(),
  requestedService: z
    .string()
    .trim()
    .min(2, 'Requested service must be at least 2 characters.')
    .max(150, 'Requested service must not exceed 150 characters.')
    .optional(),
  details: z
    .string()
    .trim()
    .max(1000, 'Details must not exceed 1000 characters.')
    .optional()
    .nullable(),
  status: RequestStatusEnum.optional(),
});

export type UpdateRequestInput = z.infer<typeof UpdateRequestSchema>;

export const ListRequestsQuerySchema = z.object({
  status: RequestStatusEnum.optional(),
});

export type ListRequestsQuery = z.infer<typeof ListRequestsQuerySchema>;

export const ConvertRequestSchema = z.object({
  scheduledDate: z
    .string({ required_error: 'scheduledDate is required.' })
    .trim()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'scheduledDate must be a valid date string (e.g. ISO-8601).',
    }),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes must not exceed 500 characters.')
    .optional()
    .nullable(),
});

export type ConvertRequestInput = z.infer<typeof ConvertRequestSchema>;
