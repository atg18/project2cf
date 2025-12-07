import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, LogOut, Loader } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const Dashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Fetch documents on load
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      // Backend: GET /api/documents (Returns { data: { documents: [...] } })
      const response = await api.get('/documents');
      setDocuments(response.data.data.documents);
    } catch (err) {
      setError('Failed to load documents.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    const title = window.prompt('Enter document title:');
    if (!title) return;

    setCreating(true);
    try {
      // Backend: POST /api/documents
      const response = await api.post('/documents', { 
        title, 
        content: '' // Start empty
      });
      // Redirect immediately to the editor
      navigate(`/document/${response.data.data.id}`);
    } catch (err) {
      alert('Failed to create document');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevent clicking the card
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.delete(`/documents/${id}`);
      // Remove from local state
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="text-blue-600" />
          CodeFather Editor
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Welcome, <b>{user?.username}</b></span>
          <button 
            onClick={logout}
            className="text-gray-500 hover:text-red-600 flex items-center gap-1 transition"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">My Documents</h2>
          <button
            onClick={handleCreateDocument}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm disabled:opacity-50"
          >
            {creating ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />}
            New Document
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20">
            <Loader className="animate-spin text-blue-600" size={40} />
          </div>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : documents.length === 0 ? (
          <div className="text-center mt-20 text-gray-400">
            <FileText size={64} className="mx-auto mb-4 opacity-20" />
            <p>No documents yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => navigate(`/document/${doc.id}`)}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 cursor-pointer transition group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <FileText size={24} />
                  </div>
                  {/* Only Owner can delete */}
                  {user.id === doc.owner.id && (
                    <button 
                      onClick={(e) => handleDelete(e, doc.id)}
                      className="text-gray-300 hover:text-red-500 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <h3 className="font-semibold text-lg text-gray-800 mb-1 truncate">{doc.title}</h3>
                <div className="text-sm text-gray-500 flex justify-between items-center mt-4">
                  <span>{format(new Date(doc.updatedAt), 'MMM d, yyyy')}</span>
                  {doc.owner.username !== user.username && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      Shared by {doc.owner.username}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;