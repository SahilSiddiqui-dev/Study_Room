import { z } from 'zod';

export const pomodoroSchema = z.object({
  focusMin: z.coerce.number().int().min(5, 'Minimum 5 minutes').max(120, 'Maximum 120 minutes').default(25),
  breakMin: z.coerce.number().int().min(1, 'Minimum 1 minute').max(30, 'Maximum 30 minutes').default(5),
});

export const createRoomSchema = z.object({
  name: z
    .string({ required_error: 'Room name is required' })
    .trim()
    .min(3, 'Room name must be at least 3 characters')
    .max(50, 'Room name cannot exceed 50 characters'),
  subject: z
    .string({ required_error: 'Subject is required' })
    .trim()
    .min(1, 'Subject is required')
    .max(50, 'Subject cannot exceed 50 characters'),
  isPrivate: z.boolean().default(false),
  pomodoro: pomodoroSchema,
});

export const joinRoomSchema = z.object({
  joinCode: z.string().trim().optional(),
});
