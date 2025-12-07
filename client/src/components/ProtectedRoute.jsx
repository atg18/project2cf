import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-4">Loading...</div>;
  
  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;