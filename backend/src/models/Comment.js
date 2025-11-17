const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class Comment {
  static async create(commentData) {
    return await prisma.comment.create({
      data: {
        content: commentData.content,
        documentId: commentData.documentId,
        userId: commentData.userId,
        parentCommentId: commentData.parentCommentId || null,
        lineNumber: commentData.lineNumber || null,
        resolved: commentData.resolved || false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
  }

  static async findByDocumentId(documentId, userId) {
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

    return await prisma.comment.findMany({
      where: {
        documentId,
        parentCommentId: null // Only get top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  }

  static async findById(id, userId) {
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        document: true,
        user: true
      }
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Verify user has access to the document
    const documentAccess = await prisma.documentAccess.findFirst({
      where: {
        OR: [
          { documentId: comment.documentId, userId },
          { 
            document: { 
              id: comment.documentId,
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
      throw new Error('Access denied to comment');
    }

    return comment;
  }

  static async update(id, userId, updateData) {
    // Verify user owns the comment
    const comment = await prisma.comment.findFirst({
      where: { id, userId }
    });

    if (!comment) {
      throw new Error('Comment not found or access denied');
    }

    return await prisma.comment.update({
      where: { id },
      data: {
        content: updateData.content,
        resolved: updateData.resolved
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
  }

  static async delete(id, userId) {
    // Verify user owns the comment or is document owner
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { document: true }
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId && comment.document.ownerId !== userId) {
      throw new Error('Access denied');
    }

    // Delete replies first if any
    await prisma.comment.deleteMany({
      where: { parentCommentId: id }
    });

    return await prisma.comment.delete({
      where: { id }
    });
  }

  static async addReply(commentId, userId, content) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { document: true }
    });

    if (!parentComment) {
      throw new Error('Parent comment not found');
    }

    // Verify user has access to document
    const documentAccess = await prisma.documentAccess.findFirst({
      where: {
        OR: [
          { documentId: parentComment.documentId, userId },
          { 
            document: { 
              id: parentComment.documentId,
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

    return await this.create({
      content,
      documentId: parentComment.documentId,
      userId,
      parentCommentId: commentId,
      lineNumber: parentComment.lineNumber
    });
  }
}

module.exports = Comment;