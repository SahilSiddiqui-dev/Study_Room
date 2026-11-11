const { z } = require('zod');
const { EVENT_TYPES, REASON_CATEGORIES } = require('../utils/constants');

const createEventSchema = z
  .object({
    type: z.enum(EVENT_TYPES, {
      errorMap: () => ({ message: `Event type must be one of: ${EVENT_TYPES.join(', ')}` }),
    }),
    durationSec: z.number().min(0, 'Duration cannot be negative').default(0).optional(),
    planned: z.boolean().optional(),
    startedAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

const createBreakReasonSchema = z
  .object({
    category: z.enum(REASON_CATEGORIES, {
      errorMap: () => ({ message: `Category must be one of: ${REASON_CATEGORIES.join(', ')}` }),
    }),
    note: z.string().trim().max(200, 'Note cannot exceed 200 characters').default('').optional(),
  })
  .strict();

module.exports = {
  createEventSchema,
  createBreakReasonSchema,
};

