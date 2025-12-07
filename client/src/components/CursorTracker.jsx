import React, { useEffect, useRef, useState } from 'react';

/**
 * CursorTracker Component
 * 
 * Manages the display of remote user cursors with:
 * - Distinct colors per user
 * - Username labels that stay horizontal (never vertical)
 * - Real-time position updates
 * - Proper cleanup on user disconnect
 */

const CursorTracker = ({ socket, documentId, currentUserId, cursorsModule }) => {
  const cursorTimeoutsRef = useRef(new Map());
  const activeCursorsRef = useRef(new Set());

  // Handle incoming cursor update
  const handleRemoteCursor = (data) => {
    console.log('📍 Received remote-cursor event:', data);
    
    if (!cursorsModule?.current) {
      console.warn('⚠️ Cursors module not available yet');
      return;
    }
    
    if (data.userId === currentUserId) {
      console.log('↪️ Skipping own cursor');
      return;
    }

    try {
      const { userId, username, position, color, isActive } = data;
      console.log(`👤 Processing cursor for ${username} (${userId})`);

      // Ensure cursor exists
      if (!activeCursorsRef.current.has(userId)) {
        console.log(`✅ Creating cursor for ${username}`);
        cursorsModule.current.createCursor(userId, username, color || '#888888');
        activeCursorsRef.current.add(userId);
      } else {
        console.log(`♻️ Updating existing cursor for ${username}`);
      }

      // Update cursor position
      if (position && (position.index !== undefined || position.length !== undefined)) {
        const posObj = {
          index: position.index ?? 0,
          length: position.length ?? 0
        };
        console.log(`🎯 Moving cursor to position:`, posObj);
        cursorsModule.current.moveCursor(userId, posObj);
      }

      // Clear any existing inactivity timeout
      if (cursorTimeoutsRef.current.has(userId)) {
        clearTimeout(cursorTimeoutsRef.current.get(userId));
        cursorTimeoutsRef.current.delete(userId);
      }

      // Set new inactivity timeout
      if (isActive) {
        const timeout = setTimeout(() => {
          console.log(`⏱️ Cursor inactivity timeout for ${username}`);
          handleCursorInactive(userId);
        }, 35000);
        cursorTimeoutsRef.current.set(userId, timeout);
      }
    } catch (error) {
      console.error('❌ Error handling remote cursor update:', error);
    }
  };

  // Handle cursor inactivity notification
  const handleCursorInactive = (userId) => {
    console.log(`💤 Marking cursor inactive for userId: ${userId}`);
    
    if (cursorsModule?.current && activeCursorsRef.current.has(userId)) {
      try {
        cursorsModule.current.removeCursor(userId);
        activeCursorsRef.current.delete(userId);
        console.log(`🗑️ Removed inactive cursor for: ${userId}`);
      } catch (error) {
        console.warn('⚠️ Error removing inactive cursor:', error);
      }
    }
    
    if (cursorTimeoutsRef.current.has(userId)) {
      cursorTimeoutsRef.current.delete(userId);
    }
  };

  // Handle user joined
  const handleUserJoined = (userData) => {
    console.log('👋 User joined:', userData);
    
    if (!cursorsModule?.current || userData.userId === currentUserId) {
      console.log('↪️ Skipping own user-joined event');
      return;
    }

    try {
      const { userId, username, color } = userData;
      console.log(`✅ Creating cursor for joined user: ${username}`);
      
      if (!activeCursorsRef.current.has(userId)) {
        cursorsModule.current.createCursor(userId, username, color || '#888888');
        activeCursorsRef.current.add(userId);
      }
    } catch (error) {
      console.error('❌ Error handling user joined:', error);
    }
  };

  // Handle user left
  const handleUserLeft = (userData) => {
    const { userId } = userData;
    console.log('👋 User left:', userData);
    
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
        console.log(`🗑️ Removed cursor for left user: ${userId}`);
      } catch (error) {
        console.warn('⚠️ Error removing cursor for left user:', error);
      }
    }
  };

  // Initialize cursor inactivity event listener
  const handleInactiveNotification = (data) => {
    console.log('⏱️ Received cursor-inactive event:', data);
    handleCursorInactive(data.userId);
  };

  // Set up socket listeners
  useEffect(() => {
    if (!socket) {
      console.warn('⚠️ CursorTracker: Socket not available');
      return;
    }

    console.log('🔌 CursorTracker: Setting up socket listeners');
    console.log('Current user ID:', currentUserId);
    console.log('Cursors module available:', !!cursorsModule?.current);

    socket.on('remote-cursor', handleRemoteCursor);
    socket.on('cursor-inactive', handleInactiveNotification);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    return () => {
      console.log('🔌 CursorTracker: Cleaning up socket listeners');
      socket.off('remote-cursor', handleRemoteCursor);
      socket.off('cursor-inactive', handleInactiveNotification);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);

      // Clean up all timeouts
      for (const timeout of cursorTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      cursorTimeoutsRef.current.clear();
      activeCursorsRef.current.clear();
    };
  }, [socket, currentUserId, cursorsModule]);

  // Initialize existing users' cursors
  useEffect(() => {
    if (!cursorsModule.current) return;

    return () => {
      // This cleanup will happen when component unmounts
    };
  }, [cursorsModule]);

  // No visual output - this is purely a logic component
  return null;
};

export default CursorTracker;
