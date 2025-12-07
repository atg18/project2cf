import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Backend route: POST /api/auth/verify
          const response = await api.post('/auth/verify');
          // Backend returns { success: true, data: user }
          setUser(response.data.data);
        } catch (error) {
          console.error("Token verification failed:", error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // Login Function
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      // Backend returns { success: true, data: { user, token } }
      const { user, token } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true };
    } catch (error) {
      // Backend error format: { success: false, error: "message" }
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  // Register Function
  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      const { user, token } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true };
    } catch (error) {
      // Handle Joi validation errors array from backend
      // See backend/src/middleware/validation.middleware.js
      let msg = 'Registration failed';
      
      if (error.response?.data?.details) {
        // Extract the first validation message
        msg = error.response.data.details[0].message;
      } else if (error.response?.data?.error) {
        msg = error.response.data.error;
      }
      
      return { success: false, error: msg };
    }
  };

  // Logout Function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);