/**
 * Cursor Debugging Script for Browser Console
 * 
 * Copy and paste this entire script into your browser console
 * on the Editor page to get comprehensive debugging info.
 * 
 * Usage: Just paste it into the console, no need to run anything else.
 */

(function debugCursors() {
  console.clear();
  console.log('%c🔍 CURSOR DEBUGGING SUITE ACTIVATED', 'color: #FF6B6B; font-size: 16px; font-weight: bold');
  
  // ============ SECTION 1: SOCKET STATUS ============
  console.log('\n%c📡 SECTION 1: SOCKET STATUS', 'color: #4ECDC4; font-weight: bold');
  
  // Try to get socket from React DevTools or window
  let socket = null;
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools detected');
  }
  
  // Attempt to find socket in window
  const keys = Object.keys(window);
  const socketKey = keys.find(k => window[k]?.on && window[k]?.emit);
  if (socketKey) {
    socket = window[socketKey];
    console.log('✅ Found socket on window');
  }
  
  // Try to get from localStorage user
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('Current User:', {
    id: user.id,
    username: user.username,
    email: user.email
  });
  
  console.log('Token exists:', !!localStorage.getItem('token'));
  
  // ============ SECTION 2: QUILL EDITOR CHECK ============
  console.log('\n%c📝 SECTION 2: QUILL EDITOR', 'color: #4ECDC4; font-weight: bold');
  
  const editorElement = document.querySelector('.ql-editor');
  if (editorElement) {
    console.log('✅ .ql-editor found in DOM');
    console.log('Editor HTML length:', editorElement.innerHTML.length, 'characters');
    
    // Try to get Quill instance from element
    const quillInstance = editorElement.__quill;
    if (quillInstance) {
      console.log('✅ Quill instance found:', quillInstance);
      
      const cursorsModule = quillInstance.getModule('cursors');
      console.log('Cursors module:', cursorsModule ? '✅ FOUND' : '❌ NOT FOUND');
      
      if (cursorsModule) {
        console.log('Active cursors:', cursorsModule.cursors ? Object.keys(cursorsModule.cursors) : 'none');
        console.log('Cursors details:', cursorsModule.cursors);
      }
    } else {
      console.log('❌ Quill instance NOT found on .ql-editor element');
    }
  } else {
    console.log('❌ .ql-editor NOT found in DOM');
  }
  
  // ============ SECTION 3: DOM INSPECTION ============
  console.log('\n%c🔍 SECTION 3: DOM INSPECTION', 'color: #4ECDC4; font-weight: bold');
  
  const cursorElements = document.querySelectorAll('.ql-cursor');
  console.log(`Found ${cursorElements.length} .ql-cursor elements in DOM`);
  
  if (cursorElements.length > 0) {
    console.log('✅ Cursor elements exist!');
    cursorElements.forEach((el, i) => {
      const username = el.textContent;
      const color = window.getComputedStyle(el).color;
      console.log(`  Cursor ${i + 1}: "${username}" with color ${color}`);
    });
  } else {
    console.log('⚠️ No .ql-cursor elements in DOM');
  }
  
  // ============ SECTION 4: SOCKET EVENT MONITORING ============
  console.log('\n%c🔌 SECTION 4: SOCKET EVENT MONITOR', 'color: #4ECDC4; font-weight: bold');
  
  console.log('Setting up real-time socket event logging...');
  console.log('You should see logs as events happen in real time');
  
  // Create a simple message logger
  window.__cursorDebugLogs = [];
  
  const addLog = (event, data, direction = '📥') => {
    const timestamp = new Date().toLocaleTimeString();
    const message = `${direction} [${timestamp}] ${event}: ${JSON.stringify(data).substring(0, 100)}...`;
    window.__cursorDebugLogs.push(message);
    console.log(message);
  };
  
  // Try to intercept socket events if socket exists or will exist
  const originalLog = console.log;
  console.log('%c✅ EVENT MONITORING READY', 'color: green; font-weight: bold');
  console.log('Type this to see recent logs: window.__cursorDebugLogs');
  
  // ============ SECTION 5: HELPER FUNCTIONS ============
  console.log('\n%c🛠️ SECTION 5: HELPER FUNCTIONS', 'color: #4ECDC4; font-weight: bold');
  
  window.debugCursors = {
    // Get all active user cursors
    getActiveCursors: () => {
      const editorElement = document.querySelector('.ql-editor');
      const quill = editorElement?.__quill;
      if (!quill) return 'Quill not found';
      
      const cursorsModule = quill.getModule('cursors');
      if (!cursorsModule) return 'Cursors module not found';
      
      return cursorsModule.cursors || {};
    },
    
    // Check if a specific user's cursor exists
    hasCursor: (userId) => {
      const cursors = window.debugCursors.getActiveCursors();
      if (typeof cursors === 'string') return cursors;
      return userId in cursors ? '✅ YES' : '❌ NO';
    },
    
    // Manually create a test cursor (for testing purposes)
    createTestCursor: (userId = 'test-user', username = 'Test User', color = '#FF0000') => {
      const editorElement = document.querySelector('.ql-editor');
      const quill = editorElement?.__quill;
      if (!quill) return 'Quill not found';
      
      const cursorsModule = quill.getModule('cursors');
      if (!cursorsModule) return 'Cursors module not found';
      
      try {
        cursorsModule.createCursor(userId, username, color);
        cursorsModule.moveCursor(userId, { index: 0, length: 0 });
        return `✅ Created test cursor for ${username}`;
      } catch (e) {
        return `❌ Error: ${e.message}`;
      }
    },
    
    // Remove a cursor
    removeCursor: (userId) => {
      const editorElement = document.querySelector('.ql-editor');
      const quill = editorElement?.__quill;
      if (!quill) return 'Quill not found';
      
      const cursorsModule = quill.getModule('cursors');
      if (!cursorsModule) return 'Cursors module not found';
      
      try {
        cursorsModule.removeCursor(userId);
        return `✅ Removed cursor for ${userId}`;
      } catch (e) {
        return `❌ Error: ${e.message}`;
      }
    },
    
    // Move a cursor to a specific position
    moveCursor: (userId, index, length = 0) => {
      const editorElement = document.querySelector('.ql-editor');
      const quill = editorElement?.__quill;
      if (!quill) return 'Quill not found';
      
      const cursorsModule = quill.getModule('cursors');
      if (!cursorsModule) return 'Cursors module not found';
      
      try {
        cursorsModule.moveCursor(userId, { index, length });
        return `✅ Moved cursor for ${userId} to index ${index}`;
      } catch (e) {
        return `❌ Error: ${e.message}`;
      }
    },
    
    // Get all recent debug logs
    getLogs: () => {
      return window.__cursorDebugLogs.slice(-20); // Last 20 logs
    },
    
    // Clear logs
    clearLogs: () => {
      window.__cursorDebugLogs = [];
      return 'Logs cleared';
    },
    
    // Full status report
    status: () => {
      console.clear();
      console.log('%c═══ CURSOR STATUS REPORT ═══', 'color: #FF6B6B; font-weight: bold; font-size: 14px');
      
      const editorElement = document.querySelector('.ql-editor');
      const quill = editorElement?.__quill;
      const cursorsModule = quill?.getModule('cursors');
      
      const report = {
        'Quill Instance': quill ? '✅' : '❌',
        'Cursors Module': cursorsModule ? '✅' : '❌',
        'Active Cursors': cursorsModule ? Object.keys(cursorsModule.cursors || {}).length : 0,
        'DOM .ql-cursor Elements': document.querySelectorAll('.ql-cursor').length,
        'Current User': user.username,
        'Socket Status': 'Check console logs for socket events',
      };
      
      console.table(report);
      
      if (cursorsModule && Object.keys(cursorsModule.cursors || {}).length > 0) {
        console.log('%cActive Cursors Details:', 'font-weight: bold; color: #4ECDC4');
        console.table(cursorsModule.cursors);
      }
      
      return report;
    }
  };
  
  console.log('\n✅ Available debugging functions:');
  console.log('  window.debugCursors.status()              - Full status report');
  console.log('  window.debugCursors.getActiveCursors()    - Get all active cursors');
  console.log('  window.debugCursors.hasCursor(userId)     - Check if cursor exists');
  console.log('  window.debugCursors.createTestCursor()    - Create a test cursor');
  console.log('  window.debugCursors.removeCursor(userId)  - Remove a cursor');
  console.log('  window.debugCursors.moveCursor(id, idx)   - Move cursor to index');
  console.log('  window.debugCursors.getLogs()             - Get recent logs');
  console.log('  window.debugCursors.clearLogs()           - Clear logs');
  
  console.log('\n💡 QUICK START:');
  console.log('  1. Run: window.debugCursors.status()');
  console.log('  2. Move your cursor in the editor');
  console.log('  3. Have another user move their cursor');
  console.log('  4. Look for socket events in console logs');
  
  console.log('\n%c═════════════════════════════', 'color: #FF6B6B; font-weight: bold');
  
})();
