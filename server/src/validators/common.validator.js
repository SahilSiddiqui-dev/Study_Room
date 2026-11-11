const { z } = require('zod');

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format: must be a 24-character hexadecimal ObjectId');

const idParamSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

module.exports = {
  objectIdSchema,
  idParamSchema,
};

