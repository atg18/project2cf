// Permission levels
const PERMISSION_LEVELS = {
  READ: 'READ',
  COMMENT: 'COMMENT', 
  EDIT: 'EDIT',
  OWNER: 'OWNER'
};

// Permission hierarchy (higher number = more permissions)
const PERMISSION_HIERARCHY = {
  [PERMISSION_LEVELS.READ]: 1,
  [PERMISSION_LEVELS.COMMENT]: 2,
  [PERMISSION_LEVELS.EDIT]: 3,
  [PERMISSION_LEVELS.OWNER]: 4
};

// Document constants
const DOCUMENT_CONSTANTS = {
  MAX_TITLE_LENGTH: 500,
  MAX_CONTENT_SIZE: 10 * 1024 * 1024, // 10MB
  VERSION_INTERVAL: 30 * 60 * 1000, // 30 minutes
  AUTO_SAVE_INTERVAL: 10 * 1000, // 10 seconds
  MAX_VERSIONS: 100
};

// Export formats
const EXPORT_FORMATS = {
  DOCX: 'docx',
  PDF: 'pdf',
  TXT: 'txt'
};

// WebSocket events
const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  
  // Document events
  JOIN_DOCUMENT: 'join-document',
  LEAVE_DOCUMENT: 'leave-document',
  DOCUMENT_STATE: 'document-state',
  
  // Collaboration events
  OPERATION: 'operation',
  REMOTE_OPERATION: 'remote-operation',
  CURSOR_MOVE: 'cursor-move',
  REMOTE_CURSOR: 'remote-cursor',
  SELECTION_CHANGE: 'selection-change',
  REMOTE_SELECTION: 'remote-selection',
  
  // User presence events
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  USER_ACTIVITY: 'user-activity',
  
  // Error events
  ERROR: 'error',
  AUTHENTICATED: 'authenticated'
};

// Operation types for OT
const OPERATION_TYPES = {
  INSERT: 'insert',
  DELETE: 'delete',
  RETAIN: 'retain'
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error messages
const ERROR_MESSAGES = {
  // Auth errors
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_EXISTS: 'User with this email or username already exists',
  INVALID_TOKEN: 'Invalid or expired token',
  ACCESS_DENIED: 'Access denied',
  
  // Document errors
  DOCUMENT_NOT_FOUND: 'Document not found',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  DOCUMENT_TOO_LARGE: 'Document content is too large',
  INVALID_DOCUMENT_ID: 'Invalid document ID',
  
  // Validation errors
  VALIDATION_FAILED: 'Validation failed',
  INVALID_EMAIL: 'Please provide a valid email address',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  
  // System errors
  INTERNAL_ERROR: 'An internal server error occurred',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded'
};

// Success messages
const SUCCESS_MESSAGES = {
  // Auth success
  REGISTER_SUCCESS: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  
  // Document success
  DOCUMENT_CREATED: 'Document created successfully',
  DOCUMENT_UPDATED: 'Document updated successfully',
  DOCUMENT_DELETED: 'Document deleted successfully',
  DOCUMENT_SHARED: 'Document shared successfully',
  
  // General success
  OPERATION_SUCCESS: 'Operation completed successfully'
};

// Environment
const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
};

module.exports = {
  PERMISSION_LEVELS,
  PERMISSION_HIERARCHY,
  DOCUMENT_CONSTANTS,
  EXPORT_FORMATS,
  SOCKET_EVENTS,
  OPERATION_TYPES,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ENVIRONMENT
};