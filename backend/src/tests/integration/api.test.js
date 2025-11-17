const request = require('supertest');
const app = require('../../../app');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

jest.mock('@prisma/client');
jest.mock('jsonwebtoken');

describe('API Integration Tests', () => {
  let mockPrisma;
  let authToken;

  beforeAll(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn()
      },
      document: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn()
      }
    };
    PrismaClient.mockImplementation(() => mockPrisma);

    authToken = 'mockAuthToken';
    jwt.verify.mockReturnValue({ id: 'user1', email: 'test@example.com' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auth Endpoints', () => {
    it('POST /api/auth/register - should register a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user1',
        ...userData,
        password: 'hashedPassword'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('POST /api/auth/login - should login user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // This would require more complex mocking for bcrypt
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Add more assertions based on your implementation
    });
  });

  describe('Document Endpoints', () => {
    it('GET /api/documents - should return user documents', async () => {
      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc1',
          title: 'Test Document',
          content: 'Test content',
          ownerId: 'user1',
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toHaveLength(1);
    });

    it('POST /api/documents - should create a new document', async () => {
      const documentData = {
        title: 'New Document',
        content: 'Document content',
        isPublic: false
      };

      mockPrisma.document.create.mockResolvedValue({
        id: 'doc2',
        ...documentData,
        ownerId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(documentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.document.title).toBe(documentData.title);
    });
  });
});