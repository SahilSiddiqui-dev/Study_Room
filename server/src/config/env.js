const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

// Load .env file from server root or parent
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/studyroom'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_NAME: z.string().default('token'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\nEnvironment Configuration Validation Failed:');
  const issues = parsed.error.issues || [];
  issues.forEach((issue) => {
    console.error(` - [${issue.path.join('.') || 'ROOT'}]: ${issue.message}`);
  });
  console.error('\nPlease check your .env file against .env.example\n');
  process.exit(1);
}

module.exports = parsed.data;

