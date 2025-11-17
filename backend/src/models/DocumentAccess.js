const { prisma } = require('../config/database.config');

class DocumentAccessModel {
  static async create(accessData) {
    return await prisma.documentAccess.create({
      data: accessData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        grantedBy: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
  }

  static async findByDocumentAndUser(documentId, userId) {
    return await prisma.documentAccess.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
  }

  static async updatePermission(documentId, userId, permissionLevel) {
    return await prisma.documentAccess.update({
      where: {
        documentId_userId: {
          documentId,
          userId
        }
      },
      data: { permissionLevel },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
  }

  static async delete(documentId, userId) {
    return await prisma.documentAccess.delete({
      where: {
        documentId_userId: {
          documentId,
          userId
        }
      }
    });
  }

  static async getDocumentCollaborators(documentId) {
    return await prisma.documentAccess.findMany({
      where: { documentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        grantedBy: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { grantedAt: 'desc' }
    });
  }

  static async getUserSharedDocuments(userId) {
    return await prisma.documentAccess.findMany({
      where: { userId },
      include: {
        document: {
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
                versions: true,
                comments: true
              }
            }
          }
        }
      },
      orderBy: { grantedAt: 'desc' }
    });
  }
}

module.exports = DocumentAccessModel;