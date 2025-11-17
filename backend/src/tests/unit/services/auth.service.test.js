const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthService = require('../../../../services/auth.service');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $disconnect: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

describe('AuthService', () => {
  let prisma;
  let authService;

  beforeEach(() => {
    prisma = new (require('@prisma/client').PrismaClient)();
    authService = AuthService;
    
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('should register user successfully', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: new Date()
      };

      const mockToken = 'mock-jwt-token';

      prisma.user.findFirst.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue(mockToken);

      const result = await authService.register(
        'test@example.com',
        'Password123',
        'testuser'
      );

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          password: 'hashed-password'
        },
        select: expect.any(Object)
      });

      expect(result).toEqual({
        user: mockUser,
        token: mockToken
      });
    });

    test('should throw error for existing user', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing-user' });

      await expect(
        authService.register('existing@example.com', 'Password123', 'existinguser')
      ).rejects.toThrow('User with this email or username already exists');
    });

    test('should validate password requirements', async () => {
      await expect(
        authService.register('test@example.com', 'weak', 'testuser')
      ).rejects.toThrow('Password must be at least 8 characters long');
    });
  });

  describe('login', () => {
    test('should login user successfully', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashed-password',
        createdAt: new Date()
      };

      const mockToken = 'mock-jwt-token';

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue(mockToken);

      const result = await authService.login('test@example.com', 'Password123');

      expect(bcrypt.compare).toHaveBeenCalledWith('Password123', 'hashed-password');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', mockToken);
    });

    test('should throw error for invalid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    test('should throw error for wrong password', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        password: 'hashed-password'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyToken', () => {
    test('should verify valid token', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        username: 'testuser'
      };

      const mockDecoded = {
        id: 'user-uuid',
        email: 'test@example.com',
        username: 'testuser'
      };

      jwt.verify.mockReturnValue(mockDecoded);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.verifyToken('valid-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(result).toEqual(mockUser);
    });

    test('should throw error for invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await expect(
        authService.verifyToken('invalid-token')
      ).rejects.toThrow('Invalid token');
    });

    test('should throw error for non-existent user', async () => {
      const mockDecoded = {
        id: 'non-existent-uuid',
        email: 'nonexistent@example.com'
      };

      jwt.verify.mockReturnValue(mockDecoded);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.verifyToken('token-for-non-existent-user')
      ).rejects.toThrow('User not found');
    });
  });
});