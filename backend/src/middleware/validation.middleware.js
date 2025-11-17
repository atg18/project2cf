const Joi = require('joi');

// Validation schemas
const validationSchemas = {
  // Auth validation
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
    username: Joi.string().alphanum().min(3).max(30).required().messages({
      'string.alphanum': 'Username can only contain letters and numbers',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  // Document validation
  createDocument: Joi.object({
    title: Joi.string().trim().min(1).max(500).required().messages({
      'string.min': 'Document title is required',
      'string.max': 'Document title cannot exceed 500 characters',
      'any.required': 'Document title is required'
    }),
    content: Joi.string().max(10 * 1024 * 1024).optional().messages({
      'string.max': 'Document content is too large'
    })
  }),

  updateDocument: Joi.object({
    content: Joi.string().max(10 * 1024 * 1024).required().messages({
      'any.required': 'Document content is required',
      'string.max': 'Document content is too large'
    })
  }),

  shareDocument: Joi.object({
    userId: Joi.string().uuid().required().messages({
      'string.guid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required'
    }),
    permissionLevel: Joi.string().valid('READ', 'COMMENT', 'EDIT').required().messages({
      'any.only': 'Permission level must be one of: READ, COMMENT, EDIT',
      'any.required': 'Permission level is required'
    })
  }),

  // Export validation
  exportDocument: Joi.object({
    format: Joi.string().valid('docx', 'pdf', 'txt').default('docx').messages({
      'any.only': 'Format must be one of: docx, pdf, txt'
    })
  })
};

// Validation middleware generator
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Custom validation functions
const customValidators = {
  // Validate document ID format
  isValidDocumentId: (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },

  // Validate user ID format
  isValidUserId: (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },

  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate document content size
  isValidDocumentSize: (content) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return Buffer.from(content).length <= maxSize;
  }
};

// Validation result formatter
const validationResult = (req) => {
  return {
    isEmpty: () => true, // Since we're using Joi, this is handled in the middleware
    array: () => []
  };
};

module.exports = {
  validate,
  validationSchemas,
  customValidators,
  validationResult
};