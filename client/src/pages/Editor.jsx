import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../styles/cursors.css';

import QuillCursors from 'quill-cursors'; // Component import
import { ArrowLeft, Download, Loader, Clock, CheckCircle, Users, Share2, MessageCircle } from 'lucide-react';
import { saveAs } from 'file-saver';
import { io } from 'socket.io-client';
import api from '../services/api';
import ShareModal from '../components/ShareModal';
import CursorManager from '../components/CursorManager'; 

// Register the Cursor Module
Quill.register('modules/cursors', QuillCursors);

// Debounce hook (CRITICAL: Must be defined ONLY ONCE)
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};


const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Refs
  const quillRef = useRef(null);
  const socketRef = useRef(null);
  const cursorsModule = useRef(null);
  
  // Guards to prevent double initialization in Strict Mode
  const socketInitializedRef = useRef(false);
  const cursorSetupDoneRef = useRef(false);
  
  // Debounce timer for socket emissions
  const emissionDebounceRef = useRef(null);
  const EMISSION_DEBOUNCE_MS = 50; // Batch changes within 50ms

  // State
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('synced');
  const [activeUsers, setActiveUsers] = useState([]); 
  const [editor, setEditor] = useState(null);
  const [isApplyingRemoteDelta, setIsApplyingRemoteDelta] = useState(false);

  const modules = useMemo(() => ({
    cursors: true,
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean']
    ]
  }), []);
  
  // Permissions State
  const [permission, setPermission] = useState('READ');
  const [showShareModal, setShowShareModal] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false); // Track socket connection status
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Autosave Logic
  const debouncedContent = useDebounce(content, 2000);
  const [isDirty, setIsDirty] = useState(false);

  // Version History State
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);

  // --- HANDLERS AND LOGIC (Simplified stubs for brevity) ---

  const saveToBackend = async () => {
    setSaveStatus('saving');
    try {
      await api.put(`/documents/${id}`, { content });
      setSaveStatus('synced');
      setIsDirty(false);
    } catch (err) { setSaveStatus('error'); }
  };

  const handleDownload = () => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${title}</title></head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + content + footer;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    saveAs(blob, `${title}.doc`);
  };

  const handleEditorChange = (value, delta, source, editor) => {
    // Only update state if we're not applying remote changes
    // This prevents state thrashing when remote deltas arrive
    if (!isApplyingRemoteDelta) {
      setContent(value);
      if (source === 'user') {
        setIsDirty(true);
        setSaveStatus('unsaved');
        // Note: Real-time socket emit is now handled by Quill's text-change listener
        // This keeps the state in sync for autosave and UI updates
      }
    }
  };

  // Refs for cursor tracking
  const lastCursorEmitRef = useRef(0);
  const cursorTimeoutRef = useRef(null);
  const CURSOR_EMIT_THROTTLE = 100; // Emit cursor updates max every 100ms

  const handleSelectionChange = (range, source) => {
    // Cursor Movement Sync: emit on every user-initiated selection change
    if (source === 'user' && socketRef.current?.connected) {
      try {
        const position = { 
          index: range?.index ?? 0, 
          length: range?.length ?? 0 
        };

        const now = Date.now();
        const timeSinceLastEmit = now - lastCursorEmitRef.current;

        // Throttle cursor updates to prevent overwhelming the server
        if (timeSinceLastEmit >= CURSOR_EMIT_THROTTLE) {
          console.log('📍 Emitting cursor-move:', { documentId: id, position });
          socketRef.current.emit('cursor-move', { 
            documentId: id, 
            position
          });
          lastCursorEmitRef.current = now;
        } else {
          // Schedule a delayed emit if we're being throttled
          if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
          cursorTimeoutRef.current = setTimeout(() => {
            if (socketRef.current?.connected) {
              console.log('📍 Emitting delayed cursor-move:', { documentId: id, position });
              socketRef.current.emit('cursor-move', { 
                documentId: id, 
                position
              });
              lastCursorEmitRef.current = Date.now();
            }
          }, CURSOR_EMIT_THROTTLE);
        }
      } catch (e) {
        console.error('❌ Failed to emit cursor move:', e);
      }
    } else if (source === 'user' && !socketRef.current?.connected) {
      console.warn('⚠️ Socket not connected, cannot emit cursor-move');
    }
  };

  const fetchVersions = async () => {
    if (showVersions) { setShowVersions(false); return; }
    try {
      const response = await api.get(`/documents/${id}/versions`);
      setVersions(response.data.data.versions || []);
      setShowVersions(true);
    } catch (err) { alert("Failed to load history"); }
  };

  const fetchComments = async () => {
    try {
      const response = await api.get(`/documents/${id}/comments`);
      setComments(response.data.data.comments || []);
    } catch (err) { console.error('Failed to load comments'); }
  };
  
  const handleRevert = async (versionContent) => {
    if(window.confirm("Revert to this version? Current changes will be lost.")) {
      setContent(versionContent || ""); 
      setIsDirty(true); 
      setShowVersions(false);
    }
  };

  // --- USE EFFECTS (Load, Sync, Save) ---

  // Socket initialization (runs once)
  useEffect(() => {
    // Prevent double socket initialization in Strict Mode
    if (socketInitializedRef.current) {
      console.log('🔌 Socket already initialized, skipping...');
      return;
    }
    socketInitializedRef.current = true;

    const socketUrl = 'http://localhost:8000';
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    console.log('🔌 Setting up socket connection for user:', user.username, user.id);
    socketRef.current = io(socketUrl, { auth: { token }, transports: ['websocket'] });
    const socket = socketRef.current;
    
    socket.on('connect', () => { 
      console.log('✅ [socket] Connected with ID:', socket.id);
      console.log('✅ [socket] Joining document:', id);
      socket.emit('join-document', id); 
    });

    socket.on('disconnect', () => {
      console.log('⚠️ [socket] Disconnected');
    });

    socket.on('error', (err) => {
      console.error('❌ [socket] Error:', err);
    });

    const fetchDocument = async () => {
      try {
        const response = await api.get(`/documents/${id}`);
        const data = response.data.data || {};
        const { title, content } = data;
        
        // Determine user permission
        let userPermission = data.permission;
        if (!userPermission) {
          const ownerId = data.ownerId;
          const accesses = data.accesses;
          userPermission = ownerId === user.id ? 'OWNER' : accesses?.find(a => a.userId === user.id)?.permissionLevel || 'READ';
        }

        setTitle(title);
        setContent(content || '');
        setPermission(userPermission);
        
        // Initialize active users from server-sent list
        const users = data.users || [];
        console.log('Initial active users:', users);
        setActiveUsers(users);
        
        await fetchComments();
      } catch (error) { 
        navigate('/'); 
      } finally { 
        setLoading(false); 
      }
    };
    
    fetchDocument();

    // Clean up socket (only once, when component unmounts for real)
    return () => {
      console.log('🧹 Cleaning up socket');
      // Clear any pending debounced emissions
      if (emissionDebounceRef.current) {
        clearTimeout(emissionDebounceRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Empty dependency - runs once on mount

  // Socket listeners (re-attach whenever needed, Strict Mode safe)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) {
      console.warn('⚠️ Socket not available for listener registration');
      return;
    }

    // Remote operation listener
    const handleRemoteOperation = (payload) => {
      try {
        const { operation, userId: remoteUserId } = payload;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!operation || remoteUserId === user.id) return;

        console.log('📥 Received remote-operation:', operation);

        // ✅ CORRECT: ReactQuill v2 way with safe optional chaining
        const editor = quillRef.current?.editor?.getEditor?.();
        if (!editor) {
          console.warn('⚠️ Editor not ready for remote-operation');
          return;
        }

        // Mark that we're applying remote changes
        setIsApplyingRemoteDelta(true);

        // Legacy support: apply simple insert/delete ops
        if (operation.type === 'insert') {
          editor.insertText(operation.position, operation.text, 'silent');
        } else if (operation.type === 'delete') {
          editor.deleteText(operation.position, operation.length, 'silent');
        }

        // Update content after a microtask to avoid state conflicts
        setTimeout(() => {
          setContent(editor.root.innerHTML);
          setIsApplyingRemoteDelta(false);
        }, 0);
      } catch (e) {
        console.error('Failed applying remote operation', e);
        setIsApplyingRemoteDelta(false);
      }
    };

    // Remote delta listener - with proper state handling
    const handleRemoteDelta = (payload) => {
      try {
        console.log('📥 [remote-delta] Received payload:', payload);
        
        const { delta, userId: remoteUserId } = payload;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        console.log('📥 [remote-delta] Checking:', { remoteUserId, currentUserId: user.id, hasDelta: !!delta });
        
        if (!delta || remoteUserId === user.id) {
          console.log('📥 [remote-delta] Skipping (no delta or own user)');
          return;
        }

        console.log('📥 [remote-delta] Processing delta from user:', remoteUserId);

        // ✅ CORRECT: ReactQuill v2 way with safe optional chaining
        const editor = quillRef.current?.editor?.getEditor?.();
        if (!editor) {
          console.warn('⚠️ [remote-delta] Editor not ready');
          return;
        }

        // Mark that we're applying remote changes to prevent state thrashing
        setIsApplyingRemoteDelta(true);

        // Apply the delta from remote user WITHOUT triggering onChange
        console.log('📥 [remote-delta] Applying to editor...');
        editor.updateContents(delta, 'api');
        
        // Update content state after delta is applied
        setTimeout(() => {
          const newContent = editor.root.innerHTML;
          setContent(newContent);
          setIsApplyingRemoteDelta(false);
          console.log('✅ [remote-delta] Applied successfully, content updated');
        }, 0);
      } catch (e) {
        console.error('❌ [remote-delta] Error:', e);
        setIsApplyingRemoteDelta(false);
      }
    };

    // User joined listener
    const handleUserJoined = (u) => {
      console.log('👤 User joined:', u);
      setActiveUsers(prev => {
        if (prev.find(p => p.userId === u.userId)) return prev;
        return [...prev, u];
      });
    };

    // User left listener
    const handleUserLeft = (u) => {
      console.log('👤 User left:', u);
      setActiveUsers(prev => prev.filter(p => p.userId !== u.userId));
    };

    // Register all listeners
    socket.on('remote-operation', handleRemoteOperation);
    socket.on('remote-delta', handleRemoteDelta);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    // Cleanup listeners on unmount or dependency change
    return () => {
      console.log('🧹 Cleaning up socket listeners');
      socket.off('remote-operation', handleRemoteOperation);
      socket.off('remote-delta', handleRemoteDelta);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, [isApplyingRemoteDelta]); // Re-attach if state changes to ensure handlers have fresh context

  // Separate effect for Quill text-change listener - attaches immediately when Quill is available
  useEffect(() => {
    if (!quillRef.current) {
      console.log('🔌 [text-change] Quill ref not available yet');
      return;
    }

    const reactQuillEditor = quillRef.current?.editor;
    if (!reactQuillEditor) {
      console.log('🔌 [text-change] ReactQuill editor not ready');
      return;
    }

    const quill = reactQuillEditor?.getEditor?.();
    if (!quill) {
      console.log('🔌 [text-change] Quill instance not available');
      return;
    }

    console.log('✅ [text-change] Quill ready, setting up listener');

    // Define the handler with debouncing to batch rapid changes
    const handleQuillChange = (delta, oldDelta, source) => {
      console.log('📝 [text-change] Quill event fired:', { source, socketConnected: socketRef.current?.connected });
      
      if (source === 'user') {
        console.log('👤 [text-change] Source is user, debouncing emission...');
        
        // Clear previous debounce timer
        if (emissionDebounceRef.current) {
          clearTimeout(emissionDebounceRef.current);
        }
        
        // Debounce the emission to batch rapid changes
        emissionDebounceRef.current = setTimeout(() => {
          if (socketRef.current?.connected) {
            console.log('📤 [text-change] Socket connected! Emitting operation:', delta);
            try {
              socketRef.current.emit('operation', { documentId: id, operation: { delta: delta } });
              console.log('✅ [text-change] Operation emitted successfully');
            } catch (e) {
              console.error('❌ [text-change] Failed to emit:', e);
            }
          } else {
            console.warn('⚠️ [text-change] Socket NOT connected:', socketRef.current?.connected, socketRef.current?.id);
          }
        }, EMISSION_DEBOUNCE_MS);
      } else {
        console.log('🔄 [text-change] Source is not user, ignoring:', source);
      }
    };

    // Attach listener
    console.log('🔌 [text-change] Attaching text-change listener to Quill');
    quill.on('text-change', handleQuillChange);

    // Cleanup
    return () => {
      console.log('🧹 [text-change] Detaching text-change listener');
      if (emissionDebounceRef.current) {
        clearTimeout(emissionDebounceRef.current);
      }
      quill.off('text-change', handleQuillChange);
    };
  }, [id]); // Only re-attach if document ID changes

  useEffect(() => {
    // Guard: ensure Quill ref has the editor instance
    if (!quillRef.current) {
      console.warn('⚠️ Quill ref not available yet');
      return;
    }

    // ✅ CORRECT: ReactQuill v2 stores Quill at .editor.getEditor()
    // Use safe optional chaining to avoid errors
    const reactQuillEditor = quillRef.current?.editor;
    if (!reactQuillEditor) {
      console.warn('⚠️ ReactQuill editor not ready yet');
      return;
    }

    const quill = reactQuillEditor?.getEditor?.();
    if (!quill) {
      console.warn('⚠️ Quill instance not available');
      return;
    }

    console.log('✅ Quill instance captured:', quill);

    // Initialize cursors module (only once)
    if (!cursorsModule.current) {
      const module = quill.getModule('cursors');
      if (!module) {
        console.error('❌ Cursors module not found! Check Quill.register');
        return;
      }

      cursorsModule.current = module;
      setEditor(quill);

      // Debug helper
      window.quillDebug = {
        quill,
        cursorsModule: module
      };

      console.log('✅ Cursors module initialized:', module);
    }

    // ⭐ CRITICAL: Text-change listener is now handled in a separate useEffect
    // This keeps cursor setup logic focused on cursor initialization only

    // Create cursors for already-active users (only once per render)
    if (!cursorSetupDoneRef.current) {
      const module = cursorsModule.current;
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      const localId = localUser.id;

      activeUsers.forEach(u => {
        if (!u || !u.userId || u.userId === localId) return;

        try {
          const color = u.color || '#' + Math.floor(Math.random() * 16777215).toString(16);
          module.createCursor(u.userId, u.username || 'Guest', color);
          console.log(`✅ Created cursor for ${u.username} (${u.userId})`);

          if (u.position && typeof u.position.index === 'number') {
            module.moveCursor(u.userId, u.position);
            console.log(`📍 Moved cursor for ${u.username} to index ${u.position.index}`);
          }
        } catch (err) {
          console.warn('❌ Failed to create cursor:', err);
        }
      });

      cursorSetupDoneRef.current = true;
    }
  }, [activeUsers, loading, id]);

  useEffect(() => {
    if (isDirty && debouncedContent && !isApplyingRemoteDelta) { 
      saveToBackend(); 
    }
  }, [debouncedContent, isApplyingRemoteDelta]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (emissionDebounceRef.current) {
        clearTimeout(emissionDebounceRef.current);
      }
    };
  }, []);

  // --- RENDERING ---

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader className="animate-spin" /></div>;

  const canEdit = permission === 'OWNER' || permission === 'EDIT';

  return (
    <div className="h-screen flex flex-col bg-white relative">
      <header className="border-b px-6 py-3 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-blue-600"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{title}</h1>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              {/* Fixed Save Status Indicator */}
              {saveStatus === 'saving' && <span className="text-blue-500">Saving...</span>}
              {saveStatus === 'synced' && <span className="text-green-500 flex items-center gap-1"><CheckCircle size={12} /> Saved</span>}
              {saveStatus === 'unsaved' && <span>Typing...</span>}
              {saveStatus === 'error' && <span className="text-red-500">Error saving!</span>}
            </span>
            <span className="text-xs text-gray-400 mt-0.5 block">
                <span className="inline-block px-2 py-1 rounded text-xs font-medium" style={{
                  backgroundColor: permission === 'OWNER' ? '#dbeafe' : permission === 'EDIT' ? '#d1fae5' : permission === 'COMMENT' ? '#fef08a' : '#f3f4f6',
                  color: permission === 'OWNER' ? '#0369a1' : permission === 'EDIT' ? '#059669' : permission === 'COMMENT' ? '#b45309' : '#6b7280'
                }}>
                  {permission === 'OWNER' ? '🔑 Owner' : permission === 'EDIT' ? '✏️ Can Edit' : permission === 'COMMENT' ? '💬 Can Comment' : '👁️ Read-Only'}
                </span>
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
            {permission === 'OWNER' && (
                <button onClick={() => setShowShareModal(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Share document">
                    <Share2 size={20} />
                </button>
            )}

            {(permission === 'COMMENT' || permission === 'EDIT' || permission === 'OWNER') && (
                <button onClick={() => { setCommentsOpen(!commentsOpen); if (!commentsOpen) fetchComments(); }} className={`p-2 rounded-lg transition ${commentsOpen ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`} title="Comments">
                    <MessageCircle size={20} />
                </button>
            )}
            
            <button onClick={fetchVersions} className={`p-2 rounded-lg transition ${showVersions ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`} title="History">
                <Clock size={20} />
            </button>
            <button onClick={handleDownload} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Download">
                <Download size={20} />
            </button>
        </div>
      </header>

      {/* Comments Sidebar */}
      {commentsOpen && (
        <div className="absolute right-0 top-16 w-80 h-[calc(100vh-4rem)] bg-white border-l shadow-lg flex flex-col z-20">
          <div className="p-4 border-b">
            <h2 className="font-bold text-gray-800">Comments</h2>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400">No comments yet</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="text-sm border rounded p-2 bg-gray-50">
                  <div className="font-semibold text-xs text-gray-600 flex justify-between items-start">
                    <span>{comment.user.username}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{comment.user.email}</p>
                  <p className="text-gray-700 mt-1">{comment.content}</p>
                </div>
              ))
            )}
          </div>

          {/* Add Comment */}
          {(permission === 'COMMENT' || permission === 'EDIT' || permission === 'OWNER') && (
            <div className="p-4 border-t">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-2 border rounded text-sm resize-none"
                rows="3"
              />
              <button
                onClick={async () => {
                  if (!newComment.trim()) return;
                  try {
                    await api.post(`/documents/${id}/comments`, { content: newComment });
                    setNewComment('');
                    // Reload comments
                    const res = await api.get(`/documents/${id}/comments`);
                    setComments(res.data.data.comments);
                  } catch (err) {
                    const errorMessage = err.response?.data?.error || err.message || 'Failed to add comment';
                    alert(errorMessage);
                    console.error('Comment error:', err);
                  }
                }}
                className="mt-2 w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
              >
                Post
              </button>
            </div>
          )}
        </div>
      )}

      {/* Version Sidebar */}

      <div className="flex-1 overflow-hidden bg-gray-50 flex justify-center">
        <div className="w-full max-w-4xl bg-white shadow-lg my-6 mx-4 overflow-y-auto">
          {/* Cursor Manager Component - handles all remote cursor updates and display */}
          {socketRef.current && (
            <CursorManager 
              socket={socketRef.current} 
              documentId={id}
              currentUserId={JSON.parse(localStorage.getItem('user') || '{}').id}
              cursorsModule={cursorsModule.current}
              activeUsers={activeUsers}
            />
          )}
          
          <ReactQuill 
            ref={quillRef}
            theme="snow" 
            value={content} 
            onChange={handleEditorChange}
            onChangeSelection={handleSelectionChange}
            readOnly={!canEdit} 
            className="h-full"
            modules={modules}
          />
        </div>
      </div>

      {/* Share Modal Render */}
      {showShareModal && (
        <ShareModal
          documentId={id}
          onClose={() => setShowShareModal(false)}
          onSuccess={() => { /* Close logic */ }}
        />
      )}
    </div>
  );
};

export default Editor;