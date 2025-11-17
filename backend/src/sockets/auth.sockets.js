const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database.config');

// Socket.io authentication middleware
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace('Bearer ', '');

    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);

    // Verify user exists and is active
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
      return next(new Error('Authentication error: User not found'));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user.id;
    socket.username = user.username;

    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }

    next(new Error('Authentication error'));
  }
};

// Track connected users
const connectedUsers = new Map();

const trackUserConnection = (socket) => {
  const userInfo = {
    userId: socket.userId,
    username: socket.username,
    socketId: socket.id,
    connectedAt: new Date(),
    currentDocument: null
  };

  connectedUsers.set(socket.userId, userInfo);
  socket.emit('authenticated', { user: socket.user });

  console.log(`User ${socket.username} connected via WebSocket`);
};

const trackUserDisconnection = (socket) => {
  if (connectedUsers.has(socket.userId)) {
    const userInfo = connectedUsers.get(socket.userId);
    console.log(`User ${socket.username} disconnected from WebSocket`);
    connectedUsers.delete(socket.userId);
  }
};

// Get connected user info
const getConnectedUser = (userId) => {
  return connectedUsers.get(userId);
};

// Get all connected users
const getConnectedUsers = () => {
  return Array.from(connectedUsers.values());
};

// Update user's current document
const updateUserDocument = (socket, documentId) => {
  if (connectedUsers.has(socket.userId)) {
    const userInfo = connectedUsers.get(socket.userId);
    userInfo.currentDocument = documentId;
    connectedUsers.set(socket.userId, userInfo);
  }
};

module.exports = {
  socketAuthMiddleware,
  trackUserConnection,
  trackUserDisconnection,
  getConnectedUser,
  getConnectedUsers,
  updateUserDocument
};