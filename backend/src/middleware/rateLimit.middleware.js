const rateLimit = require('express-rate-limit');

// Different rate limiters for different routes
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message || 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Specific rate limiters
const rateLimiters = {
  // Strict limiter for auth endpoints
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 requests per window
    'Too many authentication attempts, please try again after 15 minutes.'
  ),

  // General API limiter
  api: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per window
    'Too many API requests, please try again later.'
  ),

  // Document operations limiter
  documents: createRateLimiter(
    60 * 1000, // 1 minute
    50, // 50 requests per minute
    'Too many document operations, please slow down.'
  ),

  // Real-time collaboration limiter (per document)
  collaboration: createRateLimiter(
    60 * 1000, // 1 minute
    100, // 100 operations per minute per document
    'Too many collaboration operations, please slow down.'
  ),

  // Export limiter
  export: createRateLimiter(
    60 * 1000, // 1 minute
    10, // 10 exports per minute
    'Too many export requests, please try again later.'
  )
};

// Dynamic rate limiting based on user role
const dynamicRateLimit = (req, res, next) => {
  // You can customize limits based on user roles or other factors
  const user = req.user;
  
  if (user && user.role === 'premium') {
    // Higher limits for premium users
    req.rateLimit = {
      windowMs: 15 * 60 * 1000,
      max: 500
    };
  } else {
    // Standard limits for regular users
    req.rateLimit = {
      windowMs: 15 * 60 * 1000,
      max: 100
    };
  }
  
  next();
};

// Rate limit key generator (customize based on your needs)
const keyGenerator = (req) => {
  return req.user ? req.user.id : req.ip;
};

module.exports = {
  rateLimiters,
  dynamicRateLimit,
  keyGenerator
};