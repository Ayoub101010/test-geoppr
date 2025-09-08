// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthContext";

import LoginPage from "./components/LoginPage";
import SuperAdminPage from "./components/SuperAdminPage";
import UserPage from "./components/UserPage";
import Dashboard from "./components/DashBoard";

import "leaflet/dist/leaflet.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Composant pour protéger les routes
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div style={{
          padding: '20px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          Chargement...
        </div>
      </div>
    );
  }

  // Si la route nécessite une authentification et que l'utilisateur n'est pas connecté
  if (requiredRole && !isAuthenticated) {
    return <Navigate to="/" />;
  }

  // Si un rôle spécifique est requis et que l'utilisateur n'a pas ce rôle
  if (requiredRole && user?.role !== requiredRole) {
    // Rediriger vers la bonne page selon le rôle
    if (user?.role === 'super_admin') {
      return <Navigate to="/superadmin" />;
    } else {
      return <Navigate to="/user" />;
    }
  }

  return children;
};

// Composant séparé pour les routes (nécessaire pour utiliser useAuth)
function AppRoutes() {
  return (
    <Routes>
      {/* Route de login - page d'accueil */}
      <Route path="/" element={<LoginPage />} />
      
      {/* Route UserPage - accessible publiquement via le bouton "Accéder à la plateforme" */}
      <Route path="/user" element={<UserPage />} />
      
      {/* Route SuperAdmin - protégée, nécessite le rôle super_admin */}
      <Route 
        path="/superadmin" 
        element={
          <ProtectedRoute requiredRole="super_admin">
            <SuperAdminPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Route Dashboard - protégée, nécessite le rôle super_admin */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute requiredRole="super_admin">
            <Dashboard />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;