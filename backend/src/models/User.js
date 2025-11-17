const { prisma } = require('../config/database.config');

class UserModel {
  static async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
      }
    });
  }

  static async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
      }
    });
  }

  static async findByUsername(username) {
    return await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
      }
    });
  }

  static async create(userData) {
    return await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  static async update(id, updateData) {
    return await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
      }
    });
  }

  static async updateLastLogin(id) {
    return await this.update(id, {
      lastLogin: new Date()
    });
  }

  static async exists(email, username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username }
        ]
      },
      select: { id: true }
    });

    return !!existingUser;
  }
}

module.exports = UserModel;