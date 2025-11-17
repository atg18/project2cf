const appConfig = {
  // Application
  app: {
    name: process.env.APP_NAME || 'Collab Text Editor',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8000,
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
    }
  },

  // Database
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
    }
  },

  // Azure
  azure: {
    storage: {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
      container: process.env.AZURE_STORAGE_CONTAINER || 'documents',
    },
    redis: {
      url: process.env.AZURE_REDIS_URL,
      password: process.env.AZURE_REDIS_PASSWORD,
    }
  },

  // Features
  features: {
    maxDocumentSize: parseInt(process.env.MAX_DOCUMENT_SIZE) || 10 * 1024 * 1024, // 10MB
    versionInterval: parseInt(process.env.VERSION_INTERVAL) || 30 * 60 * 1000, // 30 minutes
    allowRegistration: process.env.ALLOW_REGISTRATION !== 'false',
    enableExport: process.env.ENABLE_EXPORT !== 'false',
  }
};

// Validate required configuration
const validateConfig = () => {
  const required = [
    'JWT_SECRET',
    'DATABASE_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production') {
    const productionRequired = [
      'AZURE_STORAGE_CONNECTION_STRING'
    ];
    
    const productionMissing = productionRequired.filter(key => !process.env[key]);
    if (productionMissing.length > 0) {
      console.warn(`Warning: Missing production environment variables: ${productionMissing.join(', ')}`);
    }
  }
};

module.exports = {
  appConfig,
  validateConfig
};