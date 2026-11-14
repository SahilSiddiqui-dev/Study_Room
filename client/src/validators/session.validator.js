import { z } from 'zod';
import { REASON_CATEGORIES } from '../constants/serverEnums';

export const createSessionSchema = z.object({
  roomId: z.string().optional(),
  subject: z.string().trim().max(50, 'Subject cannot exceed 50 characters').optional(),
  goal: z.string().trim().max(200, 'Goal cannot exceed 200 characters').default(''),
  plannedMinutes: z.coerce
    .number({ required_error: 'Planned minutes is required' })
    .int()
    .min(5, 'Planned duration must be at least 5 minutes')
    .max(240, 'Planned duration cannot exceed 240 minutes'),
});

export const breakReasonSchema = z.object({
  category: z.enum(REASON_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid break category' }),
  }),
  note: z.string().trim().max(200, 'Note cannot exceed 200 characters').default(''),
});
