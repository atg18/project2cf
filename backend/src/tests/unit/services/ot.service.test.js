const { OTService, Operation } = require('../../../../services/ot.service');

describe('OTService', () => {
  let otService;

  beforeEach(() => {
    otService = new OTService();
  });

  describe('transformInsertInsert', () => {
    test('should handle insert before insert', () => {
      const op1 = new Operation('insert', 5, 'Hello', 0, 1000, 'user1');
      const op2 = new Operation('insert', 10, 'World', 0, 1001, 'user2');

      const [transformed1, transformed2] = otService.transform(op1, op2);

      expect(transformed1.position).toBe(5);
      expect(transformed2.position).toBe(15); // 10 + 'Hello'.length
      expect(transformed1.text).toBe('Hello');
      expect(transformed2.text).toBe('World');
    });

    test('should handle concurrent inserts at same position', () => {
      const op1 = new Operation('insert', 5, 'First', 0, 1000, 'user1');
      const op2 = new Operation('insert', 5, 'Second', 0, 1001, 'user2');

      const [transformed1, transformed2] = otService.transform(op1, op2);

      expect(transformed1.position).toBe(5);
      expect(transformed2.position).toBe(10); // 5 + 'First'.length
    });

    test('should maintain consistency when operations are applied in different orders', () => {
      const initialContent = 'The quick brown fox';
      
      const op1 = new Operation('insert', 4, 'very ', 0, 1000, 'user1');
      const op2 = new Operation('insert', 10, 'and lazy ', 0, 1001, 'user2');

      const [t1, t2] = otService.transform(op1, op2);

      // Apply in order: op1 then t2
      const result1 = otService.applyOperation(
        otService.applyOperation(initialContent, op1), 
        t2
      );

      // Apply in order: op2 then t1  
      const result2 = otService.applyOperation(
        otService.applyOperation(initialContent, op2),
        t1
      );

      expect(result1).toBe(result2);
      expect(result1).toBe('The very quick and lazy brown fox');
    });
  });

  describe('transformInsertDelete', () => {
    test('should handle insert before delete', () => {
      const insertOp = new Operation('insert', 5, 'INSERTED', 0, 1000, 'user1');
      const deleteOp = new Operation('delete', 10, '', 5, 1001, 'user2');

      const [tInsert, tDelete] = otService.transform(insertOp, deleteOp);

      expect(tInsert.position).toBe(5);
      expect(tDelete.position).toBe(18); // 10 + 'INSERTED'.length
    });

    test('should handle delete before insert', () => {
      const deleteOp = new Operation('delete', 5, '', 5, 1000, 'user1');
      const insertOp = new Operation('insert', 10, 'NEW TEXT', 0, 1001, 'user2');

      const [tDelete, tInsert] = otService.transform(deleteOp, insertOp);

      expect(tInsert.position).toBe(5); // 10 - 5 (delete length)
      expect(tDelete.position).toBe(5);
    });
  });

  describe('applyOperation', () => {
    test('should apply insert operation correctly', () => {
      const content = 'Hello world';
      const operation = new Operation('insert', 6, 'beautiful ');

      const result = otService.applyOperation(content, operation);

      expect(result).toBe('Hello beautiful world');
    });

    test('should apply delete operation correctly', () => {
      const content = 'Hello beautiful world';
      const operation = new Operation('delete', 6, '', 9);

      const result = otService.applyOperation(content, operation);

      expect(result).toBe('Hello world');
    });

    test('should handle empty content', () => {
      const content = '';
      const operation = new Operation('insert', 0, 'New content');

      const result = otService.applyOperation(content, operation);

      expect(result).toBe('New content');
    });
  });

  describe('composeOperations', () => {
    test('should merge consecutive inserts', () => {
      const operations = [
        new Operation('insert', 0, 'Hello'),
        new Operation('insert', 5, ' world'),
        new Operation('insert', 11, '!')
      ];

      const composed = otService.composeOperations(operations);

      expect(composed).toHaveLength(1);
      expect(composed[0].text).toBe('Hello world!');
      expect(composed[0].position).toBe(0);
    });

    test('should not merge non-consecutive inserts', () => {
      const operations = [
        new Operation('insert', 0, 'Hello'),
        new Operation('insert', 10, 'world') // Gap between inserts
      ];

      const composed = otService.composeOperations(operations);

      expect(composed).toHaveLength(2);
      expect(composed[0].text).toBe('Hello');
      expect(composed[1].text).toBe('world');
    });
  });

  describe('resolveConflict', () => {
    test('should resolve basic conflicts', () => {
      const clientState = 'Client modifications';
      const serverState = 'Server modifications';
      const pendingOperations = [
        new Operation('insert', 7, 'updated ')
      ];

      const resolution = otService.resolveConflict(
        clientState,
        serverState,
        pendingOperations
      );

      expect(resolution.conflict).toBe(false);
      expect(resolution.resolvedState).toBe('Server updated modifications');
      expect(resolution.operations).toHaveLength(1);
    });

    test('should detect true conflicts', () => {
      const clientState = 'Original text';
      const serverState = 'Completely different content';
      const pendingOperations = [
        new Operation('insert', 8, 'client ')
      ];

      const resolution = otService.resolveConflict(
        clientState,
        serverState,
        pendingOperations
      );

      // Operation may be invalid in new context
      expect(resolution.conflict).toBe(true);
    });
  });
});