import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const configDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: [resolve(configDirectory, '../../../.env'), resolve(configDirectory, '../../.env')] });

const optionalTrimmed = z.string().trim().optional().transform((value) => value || undefined);
const optionalModelName = z.string().trim().optional().transform((value) => value || undefined)
  .refine((value) => !value || value.length <= 120, 'Must be 120 characters or fewer');

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: optionalTrimmed,
  GEMINI_API_KEY: optionalTrimmed,
  GEMINI_MODEL: optionalModelName,
  GEMINI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(180000).default(120000),
});

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid server configuration. Check the environment variables below:\n${details}`);
}

export const env = parsed.data;
