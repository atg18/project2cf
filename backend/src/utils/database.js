const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
    
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection test passed');
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Database disconnection error:', error);
    process.exit(1);
  }
};

// Health check function
const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

// Database transaction helper
const transaction = async (callback) => {
  return await prisma.$transaction(callback);
};

// Query performance monitoring
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  logger.debug(`Query ${params.model}.${params.action} took ${after - before}ms`);
  
  return result;
});

// Error handling middleware for Prisma
const handlePrismaError = (error) => {
  logger.error('Prisma error:', error);

  if (error.code === 'P2002') {
    // Unique constraint violation
    return {
      message: 'A record with this data already exists',
      field: error.meta?.target?.[0] || 'unknown'
    };
  }

  if (error.code === 'P2025') {
    // Record not found
    return {
      message: 'Record not found',
      details: error.meta?.cause
    };
  }

  if (error.code === 'P2003') {
    // Foreign key constraint violation
    return {
      message: 'Related record not found',
      field: error.meta?.field_name
    };
  }

  if (error.code === 'P2014') {
    // Invalid relation
    return {
      message: 'Invalid relationship between records'
    };
  }

  // Generic error
  return {
    message: 'Database operation failed',
    details: error.message
  };
};

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  transaction,
  handlePrismaError
};