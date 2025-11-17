const { faker } = require('@faker-js/faker');

const createMockUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  password: faker.internet.password(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides
});

const createMockDocument = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.lorem.words(3),
  content: faker.lorem.paragraphs(2),
  isPublic: faker.datatype.boolean(),
  ownerId: faker.string.uuid(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  owner: createMockUser(),
  ...overrides
});

const createMockDocumentAccess = (overrides = {}) => ({
  id: faker.string.uuid(),
  documentId: faker.string.uuid(),
  userId: faker.string.uuid(),
  permission: faker.helpers.arrayElement(['VIEW', 'EDIT']),
  grantedAt: faker.date.past(),
  user: createMockUser(),
  ...overrides
});

const createMockOperation = (overrides = {}) => ({
  id: faker.string.uuid(),
  documentId: faker.string.uuid(),
  userId: faker.string.uuid(),
  operation: {
    type: faker.helpers.arrayElement(['insert', 'delete']),
    position: faker.number.int({ min: 0, max: 100 }),
    text: faker.lorem.word(),
    length: faker.number.int({ min: 1, max: 5 })
  },
  version: faker.number.int({ min: 1, max: 100 }),
  appliedAt: faker.date.recent(),
  ...overrides
});

module.exports = {
  createMockUser,
  createMockDocument,
  createMockDocumentAccess,
  createMockOperation
};