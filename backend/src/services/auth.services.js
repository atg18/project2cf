const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AuthService {
  constructor() {
    this.SALT_ROUNDS = 12;
    this.JWT_EXPIRES_IN = '7d';
  }

  async register(email, password, username) {
    // Validate input
    this._validateRegistrationInput(email, password, username);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    try {
      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          username,
          password: hashedPassword
        },
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true
        }
      });

      // Generate JWT token
      const token = this._generateToken(user);

      return {
        user,
        token
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    // Generate token
    const token = this._generateToken(userWithoutPassword);

    return {
      user: userWithoutPassword,
      token
    };
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  _validateRegistrationInput(email, password, username) {
    const errors = [];

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.push('Valid email is required');
    }

    // Password validation
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    // Username validation
    if (!username || username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  _generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }
}

module.exports = new AuthService();