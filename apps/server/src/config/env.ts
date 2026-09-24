import path from 'path';
import dotenv from 'dotenv';

// Load .env from root or current folder
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

let jwtSecret = process.env.JWT_SECRET || 'null_default_secret_dev_key_replace_in_prod_89172389172';
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('null_default_secret') || process.env.JWT_SECRET.length < 32)) {
  console.warn('⚠️ [SECURITY WARNING] Insecure or missing JWT_SECRET in production! Please configure a strong, random 64-character JWT_SECRET in production environment variables.');
}

export const ENV = {
  NODE_ENV: nodeEnv,
  IS_PRODUCTION: isProduction,
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || '',
  DATABASE_DIR: process.env.DATABASE_DIR || path.resolve(process.cwd(), 'data', 'null_postgres'),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:1420,tauri://localhost,http://tauri.localhost,*')
    .split(',')
    .map((s) => s.trim()),
  UPLOAD_DIR: path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
  S3_ENDPOINT: process.env.S3_ENDPOINT || '',
  S3_REGION: process.env.S3_REGION || 'auto',
  S3_BUCKET: process.env.S3_BUCKET || '',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
  S3_PUBLIC_URL: process.env.S3_PUBLIC_URL || '',
};
