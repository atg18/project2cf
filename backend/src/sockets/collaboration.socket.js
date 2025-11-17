const { OTService, Operation } = require('../services/ot.service');
const documentService = require('../services/document.service');
const authService = require('../services/auth.service');

const otService = new OTService();

const setupSocketHandlers = (io) => {
  // Authentication middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const user = await authService.verifyToken(token);
      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.username} connected`);

    // Join document room
    socket.on('join-document', async (documentId) => {
      try {
        // Verify user has access to document
        const hasAccess = await documentService._checkDocumentAccess(documentId, socket.userId);
        
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied to document' });
          return;
        }

        // Join the document room
        socket.join(documentId);
        
        // Notify others in the room
        socket.to(documentId).emit('user-joined', {
          userId: socket.userId,
          username: socket.username,
          timestamp: new Date().toISOString()
        });

        // Send current document state to the user
        const document = await documentService.getDocument(documentId, socket.userId);
        socket.emit('document-state', {
          content: document.content,
          title: document.title,
          users: await getUsersInRoom(io, documentId)
        });

        console.log(`User ${socket.username} joined document ${documentId}`);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle document operations
    socket.on('operation', async (data) => {
      const { documentId, operation } = data;

      try {
        // Verify user has edit access
        const hasEditAccess = await documentService._checkDocumentPermission(
          documentId, 
          socket.userId, 
          'EDIT'
        );

        if (!hasEditAccess) {
          socket.emit('error', { message: 'No edit permissions' });
          return;
        }

        // Add user info to operation
        const userOperation = {
          ...operation,
          userId: socket.userId,
          timestamp: Date.now()
        };

        // Broadcast to other users in the room
        socket.to(documentId).emit('remote-operation', {
          operation: userOperation,
          userId: socket.userId,
          username: socket.username
        });

        // Apply operation and update document (in background)
        setTimeout(async () => {
          try {
            const document = await documentService.getDocument(documentId, socket.userId);
            const newContent = otService.applyOperation(document.content, userOperation);
            await documentService.updateDocumentContent(documentId, newContent, socket.userId);
          } catch (error) {
            console.error('Error updating document:', error);
          }
        }, 0);

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle cursor movements
    socket.on('cursor-move', (data) => {
      const { documentId, position } = data;

      socket.to(documentId).emit('remote-cursor', {
        userId: socket.userId,
        username: socket.username,
        position,
        timestamp: new Date().toISOString()
      });
    });

    // Handle user leaving document
    socket.on('leave-document', (documentId) => {
      socket.leave(documentId);
      socket.to(documentId).emit('user-left', {
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.username} disconnected`);
    });
  });
};

// Helper function to get users in a room
const getUsersInRoom = async (io, roomId) => {
  const sockets = await io.in(roomId).fetchSockets();
  return sockets.map(socket => ({
    userId: socket.userId,
    username: socket.username
  }));
};

module.exports = { setupSocketHandlers };