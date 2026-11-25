const dotenv = require('dotenv');
const Joi = require('joi');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),

  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(3306),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Shinobi VMS
  SHINOBI_URL: Joi.string().uri().required(),
  SHINOBI_API_KEY: Joi.string().required(),
  SHINOBI_GROUP_KEY: Joi.string().required(),
  SHINOBI_SUPER_API_KEY: Joi.string().required(),

  // Stripe
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),

  // Razorpay
  RAZORPAY_KEY_ID: Joi.string().required(),
  RAZORPAY_KEY_SECRET: Joi.string().required(),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().required(),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),

  // Email (SMTP)
  EMAIL_HOST: Joi.string().optional(),
  EMAIL_PORT: Joi.number().default(587),
  EMAIL_SECURE: Joi.boolean().default(false),
  EMAIL_USER: Joi.string().optional(),
  EMAIL_PASS: Joi.string().optional(),
  EMAIL_FROM: Joi.string().default('noreply@smart-cam.local'),

  // Redis (optional — thumbnail + recording-list cache; graceful fallback if absent)
  REDIS_URL: Joi.string().optional().default('redis://localhost:6379'),

  // MediaMTX (optional — live streaming; falls back to FFmpeg if absent/unreachable)
  MEDIAMTX_API_URL:    Joi.string().uri().optional().default('http://localhost:9997'),
  MEDIAMTX_WEBRTC_URL: Joi.string().uri().optional().default('http://localhost:8889'),
  MEDIAMTX_HLS_URL:    Joi.string().uri().optional().default('http://localhost:8888'),

  // S3 Object Storage (10PB)
  S3_ENDPOINT: Joi.string().uri().optional(),
  S3_REGION: Joi.string().default('ap-south-1'),
  S3_ACCESS_KEY: Joi.string().optional(),
  S3_SECRET_KEY: Joi.string().optional(),
  S3_BUCKET: Joi.string().optional(),
}).unknown(true);

const { error, value: envVars } = envSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: false,
});

if (error) {
  const missing = error.details.map((d) => d.message).join('\n  - ');
  console.error(`\n❌ Environment validation failed:\n  - ${missing}\n`);
  console.error('Create a .env file based on .env.example\n');
  process.exit(1);
}

const config = Object.freeze({
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  db: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  shinobi: {
    url: envVars.SHINOBI_URL,
    publicUrl: envVars.SHINOBI_PUBLIC_URL || null,
    apiKey: envVars.SHINOBI_API_KEY,
    groupKey: envVars.SHINOBI_GROUP_KEY,
    superApiKey: envVars.SHINOBI_SUPER_API_KEY,
  },
  stripe: {
    secretKey: envVars.STRIPE_SECRET_KEY,
    webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
  },
  razorpay: {
    keyId: envVars.RAZORPAY_KEY_ID,
    keySecret: envVars.RAZORPAY_KEY_SECRET,
    webhookSecret: envVars.RAZORPAY_WEBHOOK_SECRET,
  },
  cors: {
    origins: envVars.CORS_ORIGINS.split(',').map((s) => s.trim()),
  },
  frontendUrl: envVars.FRONTEND_URL,
  email: {
    host: envVars.EMAIL_HOST || null,
    port: envVars.EMAIL_PORT,
    secure: envVars.EMAIL_SECURE,
    user: envVars.EMAIL_USER || null,
    pass: envVars.EMAIL_PASS || null,
    from: envVars.EMAIL_FROM,
  },
  s3: {
    endpoint: envVars.S3_ENDPOINT || 'https://s3.10pb.com',
    region: envVars.S3_REGION || 'ap-south-1',
    accessKey: envVars.S3_ACCESS_KEY,
    secretKey: envVars.S3_SECRET_KEY,
    bucket: envVars.S3_BUCKET || 'bms-001161',
  },
});

module.exports = config;
