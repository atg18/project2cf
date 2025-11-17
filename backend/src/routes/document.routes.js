const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const validationMiddleware = require('../middleware/validation.middleware');
const authMiddleware = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Document CRUD routes
router.post(
  '/',
  validationMiddleware.documentValidation,
  documentController.createDocument
);

router.get(
  '/',
  validationMiddleware.paginationValidation,
  documentController.getUserDocuments
);

router.get(
  '/:id',
  validationMiddleware.documentIdValidation,
  documentController.getDocument
);

router.put(
  '/:id',
  validationMiddleware.documentIdValidation,
  validationMiddleware.documentValidation,
  documentController.updateDocument
);

router.delete(
  '/:id',
  validationMiddleware.documentIdValidation,
  documentController.deleteDocument
);

// Document sharing and collaboration
router.post(
  '/:id/share',
  validationMiddleware.documentIdValidation,
  validationMiddleware.shareDocumentValidation,
  documentController.shareDocument
);

router.get(
  '/:id/versions',
  validationMiddleware.documentIdValidation,
  documentController.getDocumentVersions
);

module.exports = router;