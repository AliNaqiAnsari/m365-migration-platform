export default () => ({
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3001',

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/m365_migration',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Microsoft Azure AD (for OAuth)
  azure: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    tenantId: process.env.AZURE_TENANT_ID || 'common',
    redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/microsoft/callback',
  },

  // Google OAuth (for Google SSO login)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback',
  },

  // Google Workspace API (Coming Soon)
  googleWorkspace: {
    enabled: false, // Coming Soon
    clientId: process.env.GOOGLE_WORKSPACE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_WORKSPACE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_WORKSPACE_REDIRECT_URI,
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },

  // AWS (LocalStack for development)
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566', // LocalStack
    s3Bucket: process.env.AWS_S3_BUCKET || 'm365-migration-storage',
  },

  // Email (SendGrid or SMTP)
  email: {
    from: process.env.EMAIL_FROM || 'noreply@m365migration.com',
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    // SMTP fallback
    smtpHost: process.env.SMTP_HOST || 'localhost',
    smtpPort: parseInt(process.env.SMTP_PORT || '1025', 10),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key!',
  },

  // Feature flags
  features: {
    googleWorkspaceMigration: false, // Coming Soon
    powerAutomateExport: false,
    powerAppsExport: false,
    advancedAnalytics: false,
  },
});
