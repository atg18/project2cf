const { PrismaClient } = require('@prisma/client');
const DocumentVersion = require('../models/DocumentVersion');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

class VersionService {
  async createDocumentVersion(documentId, content, userId, changes = '') {
    try {
      const version = await DocumentVersion.create(documentId, content, userId, changes);
      
      logger.info(`Version ${version.versionNumber} created for document ${documentId}`);
      
      return version;
    } catch (error) {
      logger.error('Error in createDocumentVersion:', error);
      throw error;
    }
  }

  async getDocumentVersions(documentId, userId, page = 1, limit = 10) {
    try {
      const result = await DocumentVersion.findByDocumentId(documentId, userId, page, limit);
      return result;
    } catch (error) {
      logger.error('Error in getDocumentVersions:', error);
      throw error;
    }
  }

  async getVersionById(versionId, userId) {
    try {
      const version = await DocumentVersion.findById(versionId, userId);
      return version;
    } catch (error) {
      logger.error('Error in getVersionById:', error);
      throw error;
    }
  }

  async restoreVersion(versionId, userId) {
    try {
      const result = await DocumentVersion.restoreVersion(versionId, userId);
      
      logger.info(`Document restored to version ${versionId} by user ${userId}`);
      
      return result;
    } catch (error) {
      logger.error('Error in restoreVersion:', error);
      throw error;
    }
  }

  async autoSaveVersion(documentId, content, userId) {
    try {
      // Get the current document to compare content
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Only create version if content has changed significantly
      if (this.hasSignificantChanges(document.content, content)) {
        const changes = this.calculateChanges(document.content, content);
        await this.createDocumentVersion(documentId, content, userId, changes);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error in autoSaveVersion:', error);
      throw error;
    }
  }

  hasSignificantChanges(oldContent, newContent) {
    // Simple change detection - in production, use more sophisticated diffing
    return oldContent !== newContent;
  }

  calculateChanges(oldContent, newContent) {
    // Simple change description - in production, use proper diff algorithms
    const oldLength = oldContent.length;
    const newLength = newContent.length;
    
    if (oldLength === newLength) {
      return 'Content modified';
    } else if (newLength > oldLength) {
      return `Added ${newLength - oldLength} characters`;
    } else {
      return `Removed ${oldLength - newLength} characters`;
    }
  }

  async cleanupOldVersions(documentId, keepCount = 10) {
    try {
      // Get versions beyond the keep count
      const versionsToDelete = await prisma.documentVersion.findMany({
        where: { documentId },
        orderBy: { versionNumber: 'desc' },
        skip: keepCount
      });

      if (versionsToDelete.length > 0) {
        await prisma.documentVersion.deleteMany({
          where: {
            id: {
              in: versionsToDelete.map(v => v.id)
            }
          }
        });

        logger.info(`Cleaned up ${versionsToDelete.length} old versions for document ${documentId}`);
      }

      return { deletedCount: versionsToDelete.length };
    } catch (error) {
      logger.error('Error in cleanupOldVersions:', error);
      throw error;
    }
  }
}

module.exports = new VersionService();