const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate, validationSchemas } = require('../middleware/validation.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const { rateLimiters } = require('../middleware/rateLimit.middleware');

const router = express.Router();

// Public routes
router.post(
  '/register',
  rateLimiters.auth,
  validate(validationSchemas.register),
  authController.register
);

router.post(
  '/login',
  rateLimiters.auth,
  validate(validationSchemas.login),
  authController.login
);

router.post(
  '/verify',
  rateLimiters.api,
  authController.verifyToken
);

// Protected routes
router.get(
  '/profile',
  authMiddleware,
  rateLimiters.api,
  authController.getProfile
);

// Admin routes (if needed)
router.get(
  '/admin/users',
  authMiddleware,
  // Add admin middleware here
  (req, res) => {
    res.json({ message: 'Admin route - to be implemented' });
  }
);

module.exports = router;