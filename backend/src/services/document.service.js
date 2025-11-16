const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const storageService = require('./storage.service');
const versionService = require('./version.service');

const prisma = new PrismaClient();

class DocumentService {
  constructor() {
    this.MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
    this.VERSION_INTERVAL = 30 * 60 * 1000; // 30 minutes
  }

  async createDocument(ownerId, title, content = '') {
    // Validate input
    if (!title || title.trim().length === 0) {
      throw new Error('Document title is required');
    }

    if (title.length > 500) {
      throw new Error('Document title too long');
    }

    if (content.length > this.MAX_DOCUMENT_SIZE) {
      throw new Error('Document content too large');
    }

    const documentId = uuidv4();

    try {
      // Create document in database
      const document = await prisma.document.create({
        data: {
          id: documentId,
          title: title.trim(),
          ownerId,
          contentSize: content.length,
          wordCount: this._countWords(content),
          contentPreview: this._generatePreview(content)
        }
      });

      // Save content to blob storage
      await storageService.saveDocumentContent(documentId, content);

      // Create initial version
      await versionService.createVersion(documentId, ownerId, content, 'Initial version');

      return document;
    } catch (error) {
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  async getDocument(documentId, userId) {
    // Check if user has access to document
    const hasAccess = await this._checkDocumentAccess(documentId, userId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          accesses: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Get document content from storage
      const content = await storageService.getDocumentContent(documentId);

      // Update last accessed timestamp
      await prisma.document.update({
        where: { id: documentId },
        data: { lastAccessed: new Date() }
      });

      return {
        ...document,
        content
      };
    } catch (error) {
      throw new Error(`Failed to retrieve document: ${error.message}`);
    }
  }

  async updateDocumentContent(documentId, content, userId) {
    // Check if user has edit access
    const hasEditAccess = await this._checkDocumentPermission(documentId, userId, 'EDIT');
    if (!hasEditAccess) {
      throw new Error('Insufficient permissions');
    }

    if (content.length > this.MAX_DOCUMENT_SIZE) {
      throw new Error('Document content too large');
    }

    try {
      // Save content to blob storage
      await storageService.saveDocumentContent(documentId, content);

      // Update document metadata
      const document = await prisma.document.update({
        where: { id: documentId },
        data: {
          contentSize: content.length,
          wordCount: this._countWords(content),
          contentPreview: this._generatePreview(content),
          updatedAt: new Date()
        }
      });

      // Create version snapshot if needed
      await this._maybeCreateVersion(documentId, userId, content);

      return document;
    } catch (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  async getUserDocuments(userId, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    try {
      const [documents, totalCount] = await Promise.all([
        prisma.document.findMany({
          where: {
            OR: [
              { ownerId: userId },
              { accesses: { some: { userId } } }
            ]
          },
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            _count: {
              select: {
                accesses: true
              }
            }
          },
          orderBy: [
            { lastAccessed: 'desc' },
            { updatedAt: 'desc' }
          ],
          skip,
          take: pageSize
        }),
        prisma.document.count({
          where: {
            OR: [
              { ownerId: userId },
              { accesses: { some: { userId } } }
            ]
          }
        })
      ]);

      return {
        documents,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize)
        }
      };
    } catch (error) {
      throw new Error(`Failed to retrieve user documents: ${error.message}`);
    }
  }

  async shareDocument(documentId, ownerId, targetUserId, permissionLevel) {
    // Verify owner is sharing the document
    const isOwner = await this._isDocumentOwner(documentId, ownerId);
    if (!isOwner) {
      throw new Error('Only document owner can share documents');
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    try {
      const documentAccess = await prisma.documentAccess.upsert({
        where: {
          documentId_userId: {
            documentId,
            userId: targetUserId
          }
        },
        update: {
          permissionLevel,
          grantedAt: new Date(),
          grantedById: ownerId
        },
        create: {
          documentId,
          userId: targetUserId,
          permissionLevel,
          grantedById: ownerId
        }
      });

      return documentAccess;
    } catch (error) {
      throw new Error(`Failed to share document: ${error.message}`);
    }
  }

  async _checkDocumentAccess(documentId, userId) {
    const access = await prisma.documentAccess.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId
        }
      }
    });

    const isOwner = await this._isDocumentOwner(documentId, userId);

    return !!access || isOwner;
  }

  async _checkDocumentPermission(documentId, userId, requiredPermission) {
    const permissionHierarchy = {
      'READ': 1,
      'COMMENT': 2,
      'EDIT': 3,
      'OWNER': 4
    };

    const isOwner = await this._isDocumentOwner(documentId, userId);
    if (isOwner) return true;

    const access = await prisma.documentAccess.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId
        }
      }
    });

    if (!access) return false;

    const userLevel = permissionHierarchy[access.permissionLevel];
    const requiredLevel = permissionHierarchy[requiredPermission];

    return userLevel >= requiredLevel;
  }

  async _isDocumentOwner(documentId, userId) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true }
    });

    return document && document.ownerId === userId;
  }

  async _maybeCreateVersion(documentId, userId, content) {
    const lastVersion = await versionService.getLastVersion(documentId);
    const timeSinceLastVersion = Date.now() - new Date(lastVersion?.createdAt).getTime();

    if (!lastVersion || timeSinceLastVersion > this.VERSION_INTERVAL) {
      await versionService.createVersion(
        documentId, 
        userId, 
        content, 
        'Auto-saved version'
      );
    }
  }

  _countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  _generatePreview(content, maxLength = 200) {
    // Remove HTML tags for preview
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...' 
      : plainText;
  }
}

module.exports = new DocumentService();