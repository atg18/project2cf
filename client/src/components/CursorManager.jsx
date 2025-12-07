import React, { useEffect, useRef } from 'react';

/**
 * CursorManager Component
 * 
 * Manages the display and lifecycle of remote user cursors in the Quill editor.
 * 
 * Features:
 * - Creates and updates cursor positions for remote users
 * - Assigns unique colors per user
 * - Displays user names with cursor indicators
 * - Handles cursor inactivity and cleanup
 * - Properly integrates with quill-cursors module
 */

const CursorManager = ({ socket, documentId, currentUserId, cursorsModule, activeUsers = [] }) => {
  const cursorTimeoutsRef = useRef(new Map());
  const activeCursorsRef = useRef(new Set());

  // Simple deterministic color generator for users without an assigned color
  const colorPalette = [
    '#EF4444', // red
    '#F97316', // orange
    '#F59E0B', // amber
    '#10B981', // emerald
    '#06B6D4', // cyan
    '#3B82F6', // blue
    '#6366F1', // indigo
    '#A78BFA', // violet
    '#EC4899', // pink
    '#14B8A6'  // teal
  ];

  const getColorForUser = (userId) => {
    if (!userId) return '#888888';
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    const idx = Math.abs(hash) % colorPalette.length;
    return colorPalette[idx];
  };

  // Handle incoming cursor update from remote user
  const handleRemoteCursor = (data) => {
    if (!cursorsModule?.current) {
      console.warn('⚠️ Cursors module not available yet');
      return;
    }

    const { userId, username, position, color: incomingColor, isActive } = data;

    // Skip own cursor
    if (userId === currentUserId) {
      console.log('🔄 Skipping own cursor update');
      return;
    }

    try {
      // Validate position object
      if (!position || typeof position.index !== 'number') {
        console.warn('⚠️ Invalid position data:', position);
        return;
      }

      // Create cursor if it doesn't exist
      if (!activeCursorsRef.current.has(userId)) {
        const colorToUse = incomingColor || getColorForUser(userId);
        cursorsModule.current.createCursor(userId, username, colorToUse);
        activeCursorsRef.current.add(userId);
        console.log(`✅ Created cursor for ${username} (${userId})`);
      }

      // Update cursor position with validated data
      const posObj = {
        index: position.index ?? 0,
        length: position.length ?? 0
      };
      console.log(`📍 Moving cursor for ${username} to index ${posObj.index}, length ${posObj.length}`);
      cursorsModule.current.moveCursor(userId, posObj);

      // Clear existing inactivity timeout
      if (cursorTimeoutsRef.current.has(userId)) {
        clearTimeout(cursorTimeoutsRef.current.get(userId));
        cursorTimeoutsRef.current.delete(userId);
      }

      // Set new inactivity timeout (35 seconds)
      if (isActive !== false) {
        const timeout = setTimeout(() => {
          handleCursorInactive(userId);
        }, 35000);
        cursorTimeoutsRef.current.set(userId, timeout);
      }
    } catch (error) {
      console.error('❌ Error handling remote cursor update:', error);
    }
  };

  // Handle cursor inactivity (user hasn't moved cursor in 30+ seconds)
  const handleCursorInactive = (userId) => {
    if (cursorsModule?.current && activeCursorsRef.current.has(userId)) {
      try {
        cursorsModule.current.removeCursor(userId);
        activeCursorsRef.current.delete(userId);
        console.log(`Removed inactive cursor for user: ${userId}`);
      } catch (error) {
        console.warn('Error removing inactive cursor:', error);
      }
    }

    if (cursorTimeoutsRef.current.has(userId)) {
      cursorTimeoutsRef.current.delete(userId);
    }
  };

  // Handle user joined (new user entered the document)
  const handleUserJoined = (userData) => {
    if (!cursorsModule?.current || userData.userId === currentUserId) {
      return;
    }

    try {
      const { userId, username, color } = userData;
      if (!activeCursorsRef.current.has(userId)) {
        cursorsModule.current.createCursor(userId, username, color || '#888888');
        activeCursorsRef.current.add(userId);
        console.log(`User joined - created cursor for ${username}`);
      }
    } catch (error) {
      console.error('❌ Error handling user joined:', error);
    }
  };

  // Handle user left (user disconnected from document)
  const handleUserLeft = (userData) => {
    const { userId } = userData;
    console.log(`👋 User left: ${userId}`);

    // Clear timeout
    if (cursorTimeoutsRef.current.has(userId)) {
      clearTimeout(cursorTimeoutsRef.current.get(userId));
      cursorTimeoutsRef.current.delete(userId);
    }

    // Remove cursor
    if (cursorsModule?.current && activeCursorsRef.current.has(userId)) {
      try {
        cursorsModule.current.removeCursor(userId);
        activeCursorsRef.current.delete(userId);
        console.log(`✅ Removed cursor for user: ${userId}`);
      } catch (error) {
        console.warn('⚠️ Error removing cursor for left user:', error);
      }
    }
  };

  // Initialize remote user cursors when component mounts
  useEffect(() => {
    if (!socket) {
      console.warn('⚠️ Socket not available for CursorManager');
      return;
    }

    console.log('🔌 Setting up cursor event listeners on socket...');

    // Define named handlers so we can properly unsubscribe
    const handleRemoteCursorEvent = (data) => {
      console.log('📡 Received remote-cursor event:', data);
      handleRemoteCursor(data);
    };

    const handleCursorInactiveEvent = (data) => {
      console.log('😴 Received cursor-inactive event:', data);
      if (data && data.userId) {
        handleCursorInactive(data.userId);
      }
    };

    const handleUserJoinedEvent = (data) => {
      console.log('👋 Received user-joined event:', data);
      handleUserJoined(data);
    };

    const handleUserLeftEvent = (data) => {
      console.log('🚪 Received user-left event:', data);
      handleUserLeft(data);
    };

    // Set up socket event listeners
    socket.on('remote-cursor', handleRemoteCursorEvent);
    socket.on('cursor-inactive', handleCursorInactiveEvent);
    socket.on('user-joined', handleUserJoinedEvent);
    socket.on('user-left', handleUserLeftEvent);

    // Initialize any already-active users (when joining a document)
    try {
      if (cursorsModule?.current && Array.isArray(activeUsers) && activeUsers.length > 0) {
        console.log('🔄 Initializing cursors for', activeUsers.length, 'active users');
        for (const u of activeUsers) {
          try {
            if (!u || !u.userId || u.userId === currentUserId) continue;
            const color = u.color || getColorForUser(u.userId);
            if (!activeCursorsRef.current.has(u.userId)) {
              cursorsModule.current.createCursor(u.userId, u.username || 'Guest', color);
              activeCursorsRef.current.add(u.userId);
              console.log(`Initialized cursor for existing user: ${u.username}`);
            }
          } catch (err) {
            console.warn('Error creating initial cursor for user', u, err);
          }
        }
      }
    } catch (err) {
      console.warn('Error initializing active users cursors', err);
    }

    return () => {
      // Clean up socket listeners with proper handler references
      socket.off('remote-cursor', handleRemoteCursorEvent);
      socket.off('cursor-inactive', handleCursorInactiveEvent);
      socket.off('user-joined', handleUserJoinedEvent);
      socket.off('user-left', handleUserLeftEvent);

      // Clear all timeouts
      for (const timeout of cursorTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      cursorTimeoutsRef.current.clear();
      activeCursorsRef.current.clear();

      console.log('🧹 Cleaned up cursor event listeners');
    };
  }, [socket, currentUserId, cursorsModule, activeUsers]);

  // This component doesn't render anything - it's purely for managing cursor state
  return null;
};

export default CursorManager;
