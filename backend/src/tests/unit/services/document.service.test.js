const { PrismaClient } = require('@prisma/client');
const DocumentService = require('../../../../services/document.service');

// Mock Prisma client
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    document: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    documentAccess: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

describe('DocumentService', () => {
  let prisma;
  let documentService;

  beforeEach(() => {
    prisma = new PrismaClient();
    documentService = DocumentService;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('createDocument', () => {
    test('should create a document successfully', async () => {
      const mockDocument = {
        id: 'test-uuid',
        title: 'Test Document',
        ownerId: 'user-uuid',
        contentSize: 0,
        wordCount: 0,
        contentPreview: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.document.create.mockResolvedValue(mockDocument);

      const result = await documentService.createDocument(
        'user-uuid',
        'Test Document',
        '<p>Test content</p>'
      );

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Document',
          ownerId: 'user-uuid',
          contentSize: expect.any(Number),
          wordCount: expect.any(Number),
          contentPreview: expect.any(String)
        })
      });

      expect(result).toEqual(mockDocument);
    });

    test('should throw error for empty title', async () => {
      await expect(
        documentService.createDocument('user-uuid', '', 'content')
      ).rejects.toThrow('Document title is required');
    });

    test('should throw error for title too long', async () => {
      const longTitle = 'a'.repeat(501);
      
      await expect(
        documentService.createDocument('user-uuid', longTitle, 'content')
      ).rejects.toThrow('Document title too long');
    });
  });

  describe('getDocument', () => {
    test('should return document when user has access', async () => {
      const mockDocument = {
        id: 'doc-uuid',
        title: 'Test Document',
        ownerId: 'user-uuid',
        contentSize: 100,
        wordCount: 20,
        contentPreview: 'Test content...',
        owner: {
          id: 'user-uuid',
          username: 'testuser',
          email: 'test@example.com'
        },
        accesses: []
      };

      // Mock access check
      documentService._checkDocumentAccess = jest.fn().mockResolvedValue(true);
      documentService._isDocumentOwner = jest.fn().mockResolvedValue(true);
      
      prisma.document.findUnique.mockResolvedValue(mockDocument);
      prisma.document.update.mockResolvedValue(mockDocument);

      const result = await documentService.getDocument('doc-uuid', 'user-uuid');

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-uuid' },
        include: expect.any(Object)
      });

      expect(result).toHaveProperty('content');
    });

    test('should throw error when access denied', async () => {
      documentService._checkDocumentAccess = jest.fn().mockResolvedValue(false);

      await expect(
        documentService.getDocument('doc-uuid', 'user-uuid')
      ).rejects.toThrow('Access denied');
    });
  });

  describe('shareDocument', () => {
    test('should share document successfully', async () => {
      const mockAccess = {
        id: 'access-uuid',
        documentId: 'doc-uuid',
        userId: 'target-user-uuid',
        permissionLevel: 'EDIT',
        grantedById: 'owner-uuid'
      };

      documentService._isDocumentOwner = jest.fn().mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue({ id: 'target-user-uuid' });
      prisma.documentAccess.upsert.mockResolvedValue(mockAccess);

      const result = await documentService.shareDocument(
        'doc-uuid',
        'owner-uuid',
        'target-user-uuid',
        'EDIT'
      );

      expect(prisma.documentAccess.upsert).toHaveBeenCalled();
      expect(result).toEqual(mockAccess);
    });

    test('should throw error when not owner', async () => {
      documentService._isDocumentOwner = jest.fn().mockResolvedValue(false);

      await expect(
        documentService.shareDocument('doc-uuid', 'user-uuid', 'target-uuid', 'EDIT')
      ).rejects.toThrow('Only document owner can share documents');
    });
  });
});