const testUsers = {
  regularUser: {
    id: 'user1',
    email: 'user@example.com',
    name: 'Test User',
    password: 'password123'
  },
  adminUser: {
    id: 'admin1',
    email: 'admin@example.com',
    name: 'Admin User',
    password: 'admin123',
    role: 'ADMIN'
  }
};

const testDocuments = {
  publicDocument: {
    id: 'doc1',
    title: 'Public Document',
    content: 'This is a public document',
    isPublic: true,
    ownerId: 'user1'
  },
  privateDocument: {
    id: 'doc2',
    title: 'Private Document',
    content: 'This is a private document',
    isPublic: false,
    ownerId: 'user1'
  },
  sharedDocument: {
    id: 'doc3',
    title: 'Shared Document',
    content: 'This document is shared',
    isPublic: false,
    ownerId: 'user1'
  }
};

const testOperations = {
  insertOperation: {
    type: 'insert',
    position: 0,
    text: 'Hello '
  },
  deleteOperation: {
    type: 'delete',
    position: 5,
    length: 1
  }
};

module.exports = {
  testUsers,
  testDocuments,
  testOperations
};