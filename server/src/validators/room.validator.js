const { z } = require('zod');

const pomodoroSchema = z
  .object({
    focusMin: z.number().int().min(5).max(120).default(25),
    breakMin: z.number().int().min(1).max(30).default(5),
  })
  .strict();

const createRoomSchema = z
  .object({
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
    isPrivate: z.boolean().default(false).optional(),
    pomodoro: pomodoroSchema.optional(),
  })
  .strict();

const updateRoomSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Room name must be at least 3 characters')
      .max(50, 'Room name cannot exceed 50 characters')
      .optional(),
    subject: z
      .string()
      .trim()
      .min(1, 'Subject cannot be empty')
      .max(50, 'Subject cannot exceed 50 characters')
      .optional(),
    pomodoro: pomodoroSchema.optional(),
  })
  .strict();

const joinRoomSchema = z
  .object({
    joinCode: z.string().trim().optional(),
  })
  .strict();

const roomQuerySchema = z
  .object({
    subject: z.string().trim().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  });

module.exports = {
  createRoomSchema,
  updateRoomSchema,
  joinRoomSchema,
  roomQuerySchema,
};
