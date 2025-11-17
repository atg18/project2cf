const { PrismaClient } = require('@prisma/client');
const database = require('../../../utils/database');
const logger = require('../../../utils/logger');

// Mock logger to avoid console output during tests
jest.mock('../../../utils/logger');

describe('Database Integration Tests', () => {
  let prisma;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await database.connectDatabase();
  });

  afterAll(async () => {
    await database.disconnectDatabase();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.comment.deleteMany();
    await prisma.documentVersion.deleteMany();
    await prisma.documentAccess.deleteMany();
    await prisma.document.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      const isHealthy = await database.checkDatabaseHealth();
      expect(isHealthy).toBe(true);
    });

    it('should execute raw SQL queries', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result[0].test).toBe(1);
    });
  });

  describe('User Database Operations', () => {
    it('should create a new user', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashedpassword',
          name: 'Test User'
        }
      });

      expect(user).toHaveProperty('id');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
    });

    it('should not allow duplicate emails', async () => {
      await prisma.user.create({
        data: {
          email: 'duplicate@example.com',
          password: 'password1',
          name: 'User One'
        }
      });

      await expect(
        prisma.user.create({
          data: {
            email: 'duplicate@example.com',
            password: 'password2',
            name: 'User Two'
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Document Database Operations', () => {
    let user;

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          email: 'owner@example.com',
          password: 'password',
          name: 'Document Owner'
        }
      });
    });

    it('should create a document with owner', async () => {
      const document = await prisma.document.create({
        data: {
          title: 'Test Document',
          content: 'Test content',
          ownerId: user.id,
          isPublic: false
        }
      });

      expect(document.title).toBe('Test Document');
      expect(document.ownerId).toBe(user.id);
      expect(document.isPublic).toBe(false);
    });

    it('should retrieve document with owner information', async () => {
      const document = await prisma.document.create({
        data: {
          title: 'Test Document',
          content: 'Test content',
          ownerId: user.id,
          isPublic: false
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      expect(document.owner.id).toBe(user.id);
      expect(document.owner.name).toBe('Document Owner');
    });
  });

  describe('Document Versioning', () => {
    let user, document;

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: 'password',
          name: 'Test User'
        }
      });

      document = await prisma.document.create({
        data: {
          title: 'Version Test Document',
          content: 'Initial content',
          ownerId: user.id,
          isPublic: false
        }
      });
    });

    it('should create document versions', async () => {
      const version1 = await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: 1,
          content: 'Initial content',
          changes: 'Initial version',
          createdById: user.id
        }
      });

      const version2 = await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: 2,
          content: 'Updated content',
          changes: 'Added more content',
          createdById: user.id
        }
      });

      expect(version1.versionNumber).toBe(1);
      expect(version2.versionNumber).toBe(2);
      expect(version2.content).toBe('Updated content');
    });

    it('should enforce unique version numbers per document', async () => {
      await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: 1,
          content: 'Content',
          changes: 'Changes',
          createdById: user.id
        }
      });

      await expect(
        prisma.documentVersion.create({
          data: {
            documentId: document.id,
            versionNumber: 1, // Duplicate version number
            content: 'Different content',
            changes: 'Different changes',
            createdById: user.id
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Document Sharing', () => {
    let owner, collaborator, document;

    beforeEach(async () => {
      owner = await prisma.user.create({
        data: {
          email: 'owner@example.com',
          password: 'password',
          name: 'Document Owner'
        }
      });

      collaborator = await prisma.user.create({
        data: {
          email: 'collaborator@example.com',
          password: 'password',
          name: 'Collaborator'
        }
      });

      document = await prisma.document.create({
        data: {
          title: 'Shared Document',
          content: 'Shared content',
          ownerId: owner.id,
          isPublic: false
        }
      });
    });

    it('should share document with collaborator', async () => {
      const share = await prisma.documentAccess.create({
        data: {
          documentId: document.id,
          userId: collaborator.id,
          permission: 'EDIT'
        }
      });

      expect(share.documentId).toBe(document.id);
      expect(share.userId).toBe(collaborator.id);
      expect(share.permission).toBe('EDIT');
    });

    it('should prevent duplicate sharing', async () => {
      await prisma.documentAccess.create({
        data: {
          documentId: document.id,
          userId: collaborator.id,
          permission: 'VIEW'
        }
      });

      await expect(
        prisma.documentAccess.create({
          data: {
            documentId: document.id,
            userId: collaborator.id, // Same user again
            permission: 'EDIT'
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Comment System', () => {
    let user, document;

    beforeEach(async () => {
      user = await prisma.user.create({
        data: {
          email: 'user@example.com',
          password: 'password',
          name: 'Test User'
        }
      });

      document = await prisma.document.create({
        data: {
          title: 'Document with Comments',
          content: 'Document content',
          ownerId: user.id,
          isPublic: false
        }
      });
    });

    it('should create comments on documents', async () => {
      const comment = await prisma.comment.create({
        data: {
          content: 'This is a test comment',
          documentId: document.id,
          userId: user.id,
          lineNumber: 1
        }
      });

      expect(comment.content).toBe('This is a test comment');
      expect(comment.documentId).toBe(document.id);
      expect(comment.userId).toBe(user.id);
      expect(comment.lineNumber).toBe(1);
    });

    it('should create comment replies', async () => {
      const parentComment = await prisma.comment.create({
        data: {
          content: 'Parent comment',
          documentId: document.id,
          userId: user.id
        }
      });

      const reply = await prisma.comment.create({
        data: {
          content: 'This is a reply',
          documentId: document.id,
          userId: user.id,
          parentCommentId: parentComment.id
        }
      });

      expect(reply.parentCommentId).toBe(parentComment.id);
    });
  });
});