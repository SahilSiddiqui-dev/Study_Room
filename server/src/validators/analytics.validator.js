const { z } = require('zod');

const rangeQuerySchema = z.object({
  range: z.enum(['7d', '30d']).default('7d').optional(),
});

const createInterventionSchema = z
  .object({
    ruleId: z
      .string({ required_error: 'ruleId is required' })
      .trim()
      .min(1, 'ruleId cannot be empty'),
    suggestedAction: z
      .string({ required_error: 'suggestedAction is required' })
      .trim()
      .min(1, 'suggestedAction cannot be empty'),
  })
  .strict();

module.exports = {
  rangeQuerySchema,
  createInterventionSchema,
};

