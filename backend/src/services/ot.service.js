class Operation {
  constructor(type, position, text = '', length = 0, timestamp = Date.now(), userId = null) {
    this.type = type;
    this.position = position;
    this.text = text;
    this.length = length;
    this.timestamp = timestamp;
    this.userId = userId;
  }
}

class OTService {
  constructor() {
    this.operationHistory = new Map();
  }

  /**
   * Transform two concurrent operations
   */
  transform(op1, op2) {
    if (op1.type === 'insert' && op2.type === 'insert') {
      return this._transformInsertInsert(op1, op2);
    } else if (op1.type === 'insert' && op2.type === 'delete') {
      return this._transformInsertDelete(op1, op2);
    } else if (op1.type === 'delete' && op2.type === 'insert') {
      return this._transformDeleteInsert(op1, op2);
    } else if (op1.type === 'delete' && op2.type === 'delete') {
      return this._transformDeleteDelete(op1, op2);
    }
    
    return [op1, op2];
  }

  _transformInsertInsert(op1, op2) {
    if (op1.position < op2.position) {
      return [op1, { ...op2, position: op2.position + op1.text.length }];
    } else if (op1.position > op2.position) {
      return [{ ...op1, position: op1.position + op2.text.length }, op2];
    } else {
      // Same position - use timestamp as tiebreaker
      if (op1.timestamp < op2.timestamp) {
        return [op1, { ...op2, position: op2.position + op1.text.length }];
      } else {
        return [{ ...op1, position: op1.position + op2.text.length }, op2];
      }
    }
  }

  _transformInsertDelete(insertOp, deleteOp) {
    if (insertOp.position <= deleteOp.position) {
      return [insertOp, { ...deleteOp, position: deleteOp.position + insertOp.text.length }];
    } else if (insertOp.position > deleteOp.position + deleteOp.length) {
      return [{ ...insertOp, position: insertOp.position - deleteOp.length }, deleteOp];
    } else {
      // Insert within delete range
      return this._handleInsertWithinDelete(insertOp, deleteOp);
    }
  }

  _transformDeleteInsert(deleteOp, insertOp) {
    const [transformedInsert, transformedDelete] = this._transformInsertDelete(insertOp, deleteOp);
    return [transformedDelete, transformedInsert];
  }

  _transformDeleteDelete(op1, op2) {
    if (op1.position < op2.position) {
      const overlap = Math.max(0, op1.position + op1.length - op2.position);
      return [
        op1,
        {
          ...op2,
          position: op2.position - op1.length + overlap,
          length: op2.length - overlap
        }
      ];
    } else {
      const overlap = Math.max(0, op2.position + op2.length - op1.position);
      return [
        {
          ...op1,
          position: op1.position - op2.length + overlap,
          length: op1.length - overlap
        },
        op2
      ];
    }
  }

  _handleInsertWithinDelete(insertOp, deleteOp) {
    // Split delete operation around the insert
    const relativePosition = insertOp.position - deleteOp.position;
    
    return [
      insertOp,
      {
        ...deleteOp,
        length: deleteOp.length + insertOp.text.length
      }
    ];
  }

  /**
   * Apply operation to document content
   */
  applyOperation(content, operation) {
    if (operation.type === 'insert') {
      return content.slice(0, operation.position) + operation.text + content.slice(operation.position);
    } else if (operation.type === 'delete') {
      return content.slice(0, operation.position) + content.slice(operation.position + operation.length);
    }
    return content;
  }

  /**
   * Compose multiple operations into minimal set
   */
  composeOperations(operations) {
    if (operations.length === 0) return [];
    if (operations.length === 1) return operations;

    const composed = [operations[0]];

    for (let i = 1; i < operations.length; i++) {
      const currentOp = operations[i];
      const lastComposed = composed[composed.length - 1];

      // Try to merge consecutive inserts
      if (lastComposed.type === 'insert' && 
          currentOp.type === 'insert' &&
          lastComposed.position + lastComposed.text.length === currentOp.position) {
        
        composed[composed.length - 1] = {
          ...lastComposed,
          text: lastComposed.text + currentOp.text,
          timestamp: Math.max(lastComposed.timestamp, currentOp.timestamp)
        };
      } else {
        composed.push(currentOp);
      }
    }

    return composed;
  }

  /**
   * Resolve conflicts between client and server states
   */
  resolveConflict(clientState, serverState, pendingOperations) {
    let currentState = serverState;
    const validOperations = [];

    for (const op of pendingOperations) {
      try {
        // Validate operation can be applied to current state
        if (this._validateOperation(op, currentState)) {
          currentState = this.applyOperation(currentState, op);
          validOperations.push(op);
        }
      } catch (error) {
        console.warn('Skipping invalid operation during conflict resolution:', op);
      }
    }

    return {
      resolvedState: currentState,
      operations: validOperations,
      conflict: validOperations.length !== pendingOperations.length
    };
  }

  _validateOperation(operation, content) {
    if (operation.type === 'delete') {
      return operation.position >= 0 && 
             operation.position + operation.length <= content.length;
    } else if (operation.type === 'insert') {
      return operation.position >= 0 && 
             operation.position <= content.length;
    }
    return true;
  }
}

module.exports = { OTService, Operation };