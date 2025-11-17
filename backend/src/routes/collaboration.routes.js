const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { rateLimiters } = require('../middleware/rateLimit.middleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get active collaborators for a document
router.get(
  '/documents/:id/collaborators',
  rateLimiters.api,
  async (req, res, next) => {
    try {
      const { id: documentId } = req.params;
      
      // This would typically query active WebSocket sessions
      // For now, return a mock response
      res.json({
        success: true,
        data: {
          documentId,
          collaborators: [
            {
              userId: req.user.id,
              username: req.user.username,
              isOnline: true,
              lastActive: new Date().toISOString()
            }
          ],
          total: 1
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get document activity feed
router.get(
  '/documents/:id/activity',
  rateLimiters.api,
  async (req, res, next) => {
    try {
      const { id: documentId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      // Mock activity data
      const activities = [
        {
          id: '1',
          type: 'edit',
          userId: req.user.id,
          username: req.user.username,
          timestamp: new Date().toISOString(),
          description: 'made edits to the document'
        },
        {
          id: '2', 
          type: 'comment',
          userId: 'other-user-id',
          username: 'otheruser',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          description: 'added a comment'
        }
      ];

      res.json({
        success: true,
        data: {
          documentId,
          activities,
          pagination: {
            page,
            limit,
            total: activities.length,
            totalPages: 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update user presence
router.post(
  '/documents/:id/presence',
  rateLimiters.collaboration,
  async (req, res, next) => {
    try {
      const { id: documentId } = req.params;
      const { position, selection } = req.body;

      // In a real implementation, this would broadcast to other collaborators
      // via WebSocket that this user is active

      res.json({
        success: true,
        data: {
          documentId,
          userId: req.user.id,
          username: req.user.username,
          position,
          selection,
          lastActive: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;