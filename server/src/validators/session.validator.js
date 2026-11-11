const { z } = require('zod');
const { objectIdSchema } = require('./common.validator');

const createSessionSchema = z
  .object({
    roomId: objectIdSchema.optional(),
    subject: z.string().trim().max(50).optional(),
    goal: z.string().trim().max(200, 'Goal cannot exceed 200 characters').default('').optional(),
    plannedMinutes: z
      .number({ required_error: 'Planned minutes is required' })
      .int()
      .min(5, 'Planned minutes must be at least 5')
      .max(240, 'Planned minutes cannot exceed 240'),
  })
  .strict()
  .refine(
    (data) => Boolean(data.roomId) || (typeof data.subject === 'string' && data.subject.trim().length > 0),
    {
      message: 'Either subject or a valid roomId must be provided',
      path: ['subject'],
    }
  );

const sessionQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  from: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  to: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

module.exports = {
  createSessionSchema,
  sessionQuerySchema,
};
