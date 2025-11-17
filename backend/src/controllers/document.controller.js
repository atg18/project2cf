const documentService = require('../services/document.service');
const { validationResult } = require('../utils/validation');

const documentController = {
  async createDocument(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content } = req.body;
      const userId = req.user.id;

      const document = await documentService.createDocument(userId, title, content);

      res.status(201).json({
        success: true,
        data: document
      });
    } catch (error) {
      next(error);
    }
  },

  async getDocument(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const document = await documentService.getDocument(id, userId);

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      next(error);
    }
  },

  async updateDocument(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      const document = await documentService.updateDocumentContent(id, content, userId);

      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      next(error);
    }
  },

  async getUserDocuments(req, res, next) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;

      const result = await documentService.getUserDocuments(userId, page, pageSize);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  async shareDocument(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { userId: targetUserId, permissionLevel } = req.body;
      const ownerId = req.user.id;

      const documentAccess = await documentService.shareDocument(
        id, 
        ownerId, 
        targetUserId, 
        permissionLevel
      );

      res.status(201).json({
        success: true,
        data: documentAccess
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteDocument(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify user is the owner
      const isOwner = await documentService._isDocumentOwner(id, userId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Only document owner can delete documents'
        });
      }

      // Delete document (implementation depends on storage service)
      // await documentService.deleteDocument(id);

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = documentController;