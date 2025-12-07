import React, { useState } from 'react';
import api from '../services/api';
import { Mail, Loader, X, Check, AlertCircle } from 'lucide-react'; // Added AlertCircle

const ShareModal = ({ documentId, onClose, onSuccess }) => {
  // FIX 1: Change state variable from targetUserId to targetEmail
  const [targetEmail, setTargetEmail] = useState(''); 
  const [permissionLevel, setPermissionLevel] = useState('READ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleShare = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess('');

    try {
      // Backend: POST /api/documents/:id/share
      // FIX 2: Change payload key from userId to targetEmail, sending the targetEmail state
      await api.post(`/documents/${documentId}/share`, {
        targetEmail: targetEmail,
        permissionLevel,
      });

      // FIX 3: Update success message to reflect email sharing
      setSuccess(`Access granted to ${targetEmail} with level: ${permissionLevel}`);
      setTargetEmail('');
      onSuccess(); 
    } catch (err) {
      const msg = err.response?.data?.error || 'Sharing failed. Check email or permissions.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Share Document
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleShare}>
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 flex items-center gap-2 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div className="bg-green-100 text-green-700 p-3 rounded mb-4 flex items-center gap-2 text-sm">
              <Check size={16} /> {success}
            </div>
          )}

          <div className="mb-4">
            {/* FIX 4: Update label text */}
            <label className="block text-gray-700 text-sm font-medium mb-1">Collaborator Email</label>
            <div className="flex items-center border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
                <Mail size={18} className="text-gray-400 ml-3" />
                {/* FIX 5: Change type to email */}
                <input
                  type="email" 
                  value={targetEmail} // FIX 6: Use targetEmail state
                  onChange={(e) => setTargetEmail(e.target.value)} // FIX 7: Use setTargetEmail handler
                  placeholder="Enter Collaborator Email" // FIX 8: Change placeholder
                  required
                  className="w-full p-2.5 outline-none bg-transparent"
                />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-1">Permission Level</label>
            <select
              value={permissionLevel}
              onChange={(e) => setPermissionLevel(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="EDIT">Edit (Full Control)</option>
              <option value="COMMENT">Comment</option>
              <option value="READ">Read Only</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? <Loader size={20} className="animate-spin" /> : 'Grant Access'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ShareModal;