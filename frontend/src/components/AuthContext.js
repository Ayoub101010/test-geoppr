// src/components/AuthContext.js
// ⚠️ REMPLACER TOUT LE CONTENU DU FICHIER PAR CECI

import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from './authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = authService.isAuthenticated();
      
      if (isAuth) {
        const currentUser = authService.getCurrentUser();
        
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          authService.startTokenRefresh();
        } else {
          handleLogout();
        }
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error('❌ Erreur vérification auth:', error);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await authService.login(email, password);
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        setError(null);
      } else {
        setError(result.error);
      }
      
      return result;
    } catch (error) {
      const errorMsg = 'Erreur de connexion au serveur';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    handleLogout();
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  const refreshUser = () => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    refreshUser,
    checkAuth,
    hasRole,
    hasAnyRole,
    isSuperAdmin: () => user?.role === 'super_admin',
    isAdmin: () => user?.role === 'admin' || user?.role === 'super_admin',
    getUserRole: () => user?.role || null,
    getUserCommune: () => user?.commune || null,
    getUserPrefecture: () => user?.prefecture || null,
    getUserRegion: () => user?.region || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};