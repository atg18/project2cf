const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DocumentVersion {
  static async create(documentId, content, userId, changes = '') {
    // Get current version number
    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' }
    });

    const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    return await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber,
        content,
        changes,
        createdById: userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  static async findByDocumentId(documentId, userId, page = 1, limit = 10) {
    // Verify user has access to document
    const documentAccess = await prisma.documentAccess.findFirst({
      where: {
        OR: [
          { documentId, userId },
          { 
            document: { 
              id: documentId,
              OR: [
                { ownerId: userId },
                { isPublic: true }
              ]
            }
          }
        ]
      }
    });

    if (!documentAccess) {
      throw new Error('Access denied to document');
    }

    const skip = (page - 1) * limit;

    const [versions, totalCount] = await Promise.all([
      prisma.documentVersion.findMany({
        where: { documentId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          versionNumber: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.documentVersion.count({
        where: { documentId }
      })
    ]);

    return {
      versions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  static async findById(id, userId) {
    const version = await prisma.documentVersion.findUnique({
      where: { id },
      include: {
        document: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!version) {
      throw new Error('Version not found');
    }

    // Verify user has access to document
    const documentAccess = await prisma.documentAccess.findFirst({
      where: {
        OR: [
          { documentId: version.documentId, userId },
          { 
            document: { 
              id: version.documentId,
              OR: [
                { ownerId: userId },
                { isPublic: true }
              ]
            }
          }
        ]
      }
    });

    if (!documentAccess) {
      throw new Error('Access denied to document version');
    }

    return version;
  }

  static async restoreVersion(versionId, userId) {
    const version = await this.findById(versionId, userId);

    // Update document content
    const document = await prisma.document.update({
      where: { id: version.documentId },
      data: {
        content: version.content,
        updatedAt: new Date()
      }
    });

    // Create a new version for the restore action
    const newVersion = await this.create(
      version.documentId,
      version.content,
      userId,
      `Restored from version ${version.versionNumber}`
    );

    return {
      document,
      restoredVersion: newVersion
    };
  }

  static async getVersionContent(versionId, userId) {
    const version = await this.findById(versionId, userId);
    return version.content;
  }
}

module.exports = DocumentVersion;