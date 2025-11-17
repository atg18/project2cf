const { prisma } = require('../config/database.config');

class DocumentModel {
  static async findById(id) {
    return await prisma.document.findUnique({
      where: { id },
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
        },
        _count: {
          select: {
            versions: true,
            comments: true,
            accesses: true
          }
        }
      }
    });
  }

  static async create(documentData) {
    return await prisma.document.create({
      data: documentData,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
  }

  static async update(id, updateData) {
    return await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
  }

  static async delete(id) {
    return await prisma.document.delete({
      where: { id }
    });
  }

  static async getUserDocuments(userId, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

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
              accesses: true,
              versions: true
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
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  }

  static async updateLastAccessed(id) {
    return await this.update(id, {
      lastAccessed: new Date()
    });
  }

  static async checkAccess(documentId, userId) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        OR: [
          { ownerId: userId },
          { accesses: { some: { userId } } }
        ]
      },
      select: { id: true }
    });

    return !!document;
  }

  static async checkPermission(documentId, userId) {
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        OR: [
          { ownerId: userId },
          { accesses: { some: { userId } } }
        ]
      },
      include: {
        accesses: {
          where: { userId },
          select: { permissionLevel: true }
        }
      }
    });

    if (!document) return null;

    if (document.ownerId === userId) {
      return 'OWNER';
    }

    return document.accesses[0]?.permissionLevel || null;
  }
}

module.exports = DocumentModel;