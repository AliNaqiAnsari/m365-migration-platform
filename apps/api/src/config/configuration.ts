export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? '',
    tls: process.env.REDIS_TLS ?? 'false',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'CHANGE-THIS-IN-PRODUCTION',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  },

  azure: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    tenantId: process.env.AZURE_TENANT_ID ?? 'common',
    redirectUri: process.env.AZURE_REDIRECT_URI,
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY ?? 'CHANGE-THIS-32-CHAR-KEY-IN-PROD!',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      free: process.env.STRIPE_PRICE_FREE,
      starter: process.env.STRIPE_PRICE_STARTER,
      professional: process.env.STRIPE_PRICE_PROFESSIONAL,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
      addon_onedrive: process.env.STRIPE_PRICE_ADDON_ONEDRIVE,
      addon_sharepoint: process.env.STRIPE_PRICE_ADDON_SHAREPOINT,
      addon_teams: process.env.STRIPE_PRICE_ADDON_TEAMS,
      addon_groups: process.env.STRIPE_PRICE_ADDON_GROUPS,
      addon_planner: process.env.STRIPE_PRICE_ADDON_PLANNER,
      addon_entra_id: process.env.STRIPE_PRICE_ADDON_ENTRA_ID,
    },
  },
});
