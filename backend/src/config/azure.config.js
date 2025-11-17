const { BlobServiceClient } = require('@azure/storage-blob');
const redis = require('redis');

class AzureConfig {
  constructor() {
    this.blobServiceClient = null;
    this.redisClient = null;
  }

  // Initialize Azure Blob Storage
  async initializeBlobStorage() {
    try {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      
      if (!connectionString) {
        console.warn('Azure Storage connection string not found. Using local storage fallback.');
        return null;
      }

      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      
      // Create container if it doesn't exist
      const containerName = process.env.AZURE_STORAGE_CONTAINER || 'documents';
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      
      try {
        await containerClient.createIfNotExists({
          access: 'blob'
        });
        console.log('✅ Azure Blob Storage container ready');
      } catch (error) {
        console.warn('⚠️ Could not create Azure container:', error.message);
      }

      return this.blobServiceClient;
    } catch (error) {
      console.error('❌ Failed to initialize Azure Blob Storage:', error);
      return null;
    }
  }

  // Initialize Redis
  async initializeRedis() {
    try {
      const redisConfig = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          tls: process.env.REDIS_TLS === 'true',
        }
      };

      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

      this.redisClient = redis.createClient(redisConfig);

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      await this.redisClient.connect();
      return this.redisClient;
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      return null;
    }
  }

  // Get blob service client
  getBlobServiceClient() {
    return this.blobServiceClient;
  }

  // Get Redis client
  getRedisClient() {
    return this.redisClient;
  }

  // Graceful shutdown
  async shutdown() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('✅ Redis disconnected');
    }
  }
}

module.exports = new AzureConfig();