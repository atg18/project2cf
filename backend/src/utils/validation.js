const Joi = require('joi');
const constants = require('./constants');

// User validation schemas
const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  name: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Name is required',
    'string.max': 'Name must be less than 100 characters',
    'any.required': 'Name is required'
  })
});

const userLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

// Document validation schemas
const documentCreateSchema = Joi.object({
  title: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Title is required',
    'string.max': 'Title must be less than 255 characters',
    'any.required': 'Title is required'
  }),
  content: Joi.string().allow('').optional(),
  isPublic: Joi.boolean().optional()
});

const documentUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional().messages({
    'string.min': 'Title cannot be empty',
    'string.max': 'Title must be less than 255 characters'
  }),
  content: Joi.string().optional()
});

const documentShareSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  permission: Joi.string().valid('VIEW', 'EDIT').required().messages({
    'any.only': 'Permission must be either VIEW or EDIT',
    'any.required': 'Permission is required'
  })
});

// Comment validation schemas
const commentCreateSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required().messages({
    'string.min': 'Comment cannot be empty',
    'string.max': 'Comment must be less than 1000 characters',
    'any.required': 'Comment content is required'
  }),
  documentId: Joi.string().required().messages({
    'any.required': 'Document ID is required'
  }),
  lineNumber: Joi.number().integer().min(0).optional().messages({
    'number.min': 'Line number must be a positive number'
  }),
  parentCommentId: Joi.string().optional()
});

const commentUpdateSchema = Joi.object({
  content: Joi.string().min(1).max(1000).optional().messages({
    'string.min': 'Comment cannot be empty',
    'string.max': 'Comment must be less than 1000 characters'
  }),
  resolved: Joi.boolean().optional()
});

// Export validation schemas
const exportSchema = Joi.object({
  format: Joi.string().valid(...constants.SUPPORTED_EXPORT_FORMATS).required().messages({
    'any.only': `Format must be one of: ${constants.SUPPORTED_EXPORT_FORMATS.join(', ')}`,
    'any.required': 'Export format is required'
  })
});

// Pagination validation schema
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.min': 'Page must be at least 1'
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100'
  }),
  search: Joi.string().max(100).optional().messages({
    'string.max': 'Search query must be less than 100 characters'
  })
});

// Validation functions
const validateUserRegistration = (data) => {
  return userRegistrationSchema.validate(data, { abortEarly: false });
};

const validateUserLogin = (data) => {
  return userLoginSchema.validate(data, { abortEarly: false });
};

const validateDocumentCreate = (data) => {
  return documentCreateSchema.validate(data, { abortEarly: false });
};

const validateDocumentUpdate = (data) => {
  return documentUpdateSchema.validate(data, { abortEarly: false });
};

const validateDocumentShare = (data) => {
  return documentShareSchema.validate(data, { abortEarly: false });
};

const validateCommentCreate = (data) => {
  return commentCreateSchema.validate(data, { abortEarly: false });
};

const validateCommentUpdate = (data) => {
  return commentUpdateSchema.validate(data, { abortEarly: false });
};

const validateExport = (data) => {
  return exportSchema.validate(data, { abortEarly: false });
};

const validatePagination = (data) => {
  return paginationSchema.validate(data, { abortEarly: false });
};

// Utility function to format validation errors
const formatValidationErrors = (error) => {
  if (!error.details) {
    return [error.message];
  }

  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message
  }));
};

// Sanitization functions
const sanitizeUserInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  return input;
};

const sanitizeDocumentContent = (content) => {
  // Basic HTML sanitization for document content
  // In production, use a proper sanitization library like DOMPurify
  return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

module.exports = {
  // Validation functions
  validateUserRegistration,
  validateUserLogin,
  validateDocumentCreate,
  validateDocumentUpdate,
  validateDocumentShare,
  validateCommentCreate,
  validateCommentUpdate,
  validateExport,
  validatePagination,
  
  // Utility functions
  formatValidationErrors,
  sanitizeUserInput,
  sanitizeDocumentContent,
  
  // Schemas (for testing or advanced use)
  schemas: {
    userRegistration: userRegistrationSchema,
    userLogin: userLoginSchema,
    documentCreate: documentCreateSchema,
    documentUpdate: documentUpdateSchema,
    documentShare: documentShareSchema,
    commentCreate: commentCreateSchema,
    commentUpdate: commentUpdateSchema,
    export: exportSchema,
    pagination: paginationSchema
  }
};