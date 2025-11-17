const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

class CollaborationService {
  async getDocumentCollaborators(documentId, userId) {
    try {
      // Verify user has access to the document
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          OR: [
            { ownerId: userId },
            { access: { some: { userId } } },
            { isPublic: true }
          ]
        }
      });

      if (!document) {
        throw new Error('Document not found or access denied');
      }

      // Get all users with access to the document
      const collaborators = await prisma.documentAccess.findMany({
        where: { documentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Include the document owner
      const owner = await prisma.user.findUnique({
        where: { id: document.ownerId },
        select: {
          id: true,
          name: true,
          email: true
        }
      });

      const result = [
        {
          user: owner,
          permission: 'OWNER',
          grantedAt: document.createdAt
        },
        ...collaborators.map(collab => ({
          user: collab.user,
          permission: collab.permission,
          grantedAt: collab.grantedAt
        }))
      ];

      return result;
    } catch (error) {
      logger.error('Error in getDocumentCollaborators:', error);
      throw error;
    }
  }

  async removeCollaborator(documentId, ownerId, collaboratorId) {
    try {
      // Verify the requester is the document owner
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          ownerId: ownerId
        }
      });

      if (!document) {
        throw new Error('Document not found or you are not the owner');
      }

      // Prevent owner from removing themselves
      if (collaboratorId === ownerId) {
        throw new Error('Cannot remove document owner');
      }

      await prisma.documentAccess.deleteMany({
        where: {
          documentId,
          userId: collaboratorId
        }
      });

      logger.info(`Collaborator ${collaboratorId} removed from document ${documentId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error in removeCollaborator:', error);
      throw error;
    }
  }

  async updateCollaboratorPermission(documentId, ownerId, collaboratorId, permission) {
    try {
      // Verify the requester is the document owner
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          ownerId: ownerId
        }
      });

      if (!document) {
        throw new Error('Document not found or you are not the owner');
      }

      // Prevent modifying owner permissions
      if (collaboratorId === ownerId) {
        throw new Error('Cannot modify document owner permissions');
      }

      const updatedAccess = await prisma.documentAccess.updateMany({
        where: {
          documentId,
          userId: collaboratorId
        },
        data: { permission }
      });

      if (updatedAccess.count === 0) {
        throw new Error('Collaborator not found');
      }

      const documentAccess = await prisma.documentAccess.findFirst({
        where: {
          documentId,
          userId: collaboratorId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      logger.info(`Permission updated for collaborator ${collaboratorId} on document ${documentId}`);

      return documentAccess;
    } catch (error) {
      logger.error('Error in updateCollaboratorPermission:', error);
      throw error;
    }
  }

  async getActiveSessions(documentId, userId) {
    try {
      // Verify user has access to the document
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          OR: [
            { ownerId: userId },
            { access: { some: { userId } } },
            { isPublic: true }
          ]
        }
      });

      if (!document) {
        throw new Error('Document not found or access denied');
      }

      // In a real implementation, this would query your session store
      // For now, return mock data or integrate with your real-time service
      const activeSessions = [
        {
          userId: userId,
          userName: 'Current User',
          joinedAt: new Date(),
          lastActivity: new Date()
        }
      ];

      return activeSessions;
    } catch (error) {
      logger.error('Error in getActiveSessions:', error);
      throw error;
    }
  }

  async trackUserActivity(documentId, userId) {
    try {
      // This would typically update a real-time tracking system
      // For now, we'll just log the activity
      logger.info(`User ${userId} active on document ${documentId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error in trackUserActivity:', error);
      throw error;
    }
  }
}

module.exports = new CollaborationService();