
import React, { useEffect, useState, useRef } from "react";
import geoLogo from "../assets/GeoPPR_Logo.png";
import "leaflet/dist/leaflet.css";
import InfrastructureDonut from "./InfrastructureDonut";
import BarChart from "./BarChart";
import MapContainer from "./MapContainer";
import TimeChart from "./TimeChart";
import Dashboard from "./DashBoard";
import GeographicFilterWithZoom from './GeographicFilterWithZoom';
import "./SuperAdminPage.css"; // Réutilise les mêmes styles
import { useAuth } from './AuthContext';

const AdminPage = () => {
  const [currentView, setCurrentView] = useState("map");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { user, logout } = useAuth();
  
  // Récupérer les infos utilisateur
  const getUserInfo = () => {
    // Priorité 1: Context
    if (user) {
      return {
        nom: user.nom || user.last_name || "Utilisateur",
        prenom: user.prenom || user.first_name || "",
        email: user.mail || user.email || "",
        role: user.role || "admin"
      };
    }
    
    // Priorité 2: localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        return {
          nom: userData.nom || userData.last_name || "Utilisateur",
          prenom: userData.prenom || userData.first_name || "",
          email: userData.mail || userData.email || "",
          role: userData.role || "admin"
        };
      } catch (e) {
        
      }
    }
    
    return { nom: "Utilisateur", prenom: "", email: "", role: "admin" };
  };
  
  const [profile] = useState(getUserInfo());
  
  // Générer les initiales (2 premières lettres)
  const getInitials = () => {
    const firstLetter = profile.prenom ? profile.prenom.charAt(0).toUpperCase() : '';
    const secondLetter = profile.nom ? profile.nom.charAt(0).toUpperCase() : '';
    return firstLetter + secondLetter || 'AD';
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <div className="superadmin-wrapper">
      {/* Header identique */}
      <div className="header">
        

        {/* Navigation SANS l'option Utilisateurs */}
        <div className="nav-menu">
          <div
            className={`nav-item ${currentView === "map" ? "active" : ""}`}
            onClick={() => setCurrentView("map")}
          >
            <i className="fas fa-map-marked-alt"></i> Carte
          </div>
          <div
            className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}
            onClick={() => setCurrentView("dashboard")}
          >
            <i className="fas fa-chart-line"></i> Tableau de Bord
          </div>
          {/* PAS de section Utilisateurs pour les admins */}
        </div>

        {/* Profil - Version corrigée */}
        <div className="user-profile" ref={profileRef}>
          <div 
            className="profile-pic"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{ cursor: "pointer" }}
          >
            {getInitials()}
          </div>
          <div className="user-info">
            <h4>{profile.prenom} {profile.nom}</h4>
            <span>Administrateur</span>
          </div>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <ul>
                <li onClick={() => { setShowLogoutModal(true); setShowProfileMenu(false); }}>
                  <i className="fas fa-sign-out-alt"></i> Déconnexion
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Modal déconnexion */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <h3>Êtes-vous sûr de vouloir vous déconnecter ?</h3>
            <div className="modal-buttons">
              <button onClick={handleLogout}>Oui</button>
              <button onClick={() => setShowLogoutModal(false)}>Non</button>
            </div>
          </div>
        </div>
      )}

      {/* Vue Carte */}
      <div className="main-container" style={{ display: currentView === "map" ? "flex" : "none" }}>
        {/* Sidebar avec filtres */}
        <div className="sidebar">
          {/* Section géographique avec événement personnalisé */}
          <div className="filter-section">
            <div className="filter-title">
              <i className="fas fa-map-marker-alt"></i> Localisation
            </div>
            <GeographicFilterWithZoom 
              onFiltersChange={(geoFilters) => {
                // Déclencher l'événement pour MapContainer
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('geographicFilterChanged', {
                    detail: geoFilters
                  }));
                }, 100);
              }}
              showLabels={true}
            />
          </div>
          
          <div className="filter-section">
            <div className="filter-title">
              <i className="fas fa-road"></i> Routes
            </div>
            <div className="filter-checkbox-group">
              {[
                ["pistes", "Pistes"],
                ["chaussees", "Chaussées"],
              ].map(([id, label]) => (
                <div className="checkbox-item" key={id}>
                  <input 
                    type="checkbox" 
                    id={id}
                    defaultChecked
                  />
                  <label htmlFor={id}>{label}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-title">
              <i className="fas fa-building"></i> Infrastructures
            </div>
            <div className="filter-checkbox-group">
              {[
                ["localites", "Localités"],
                ["ecoles", "Écoles"],
                ["marches", "Marchés"],
                ["batiments_administratifs", "Bâtiments administratifs"],
                ["infrastructures_hydrauliques", "Infrastructures hydrauliques"],
                ["services_santes", "Services de santé"],
                ["autres_infrastructures", "Autres infrastructures"],
              ].map(([id, label]) => (
                <div className="checkbox-item" key={id}>
                  <input 
                    type="checkbox" 
                    id={id}
                    defaultChecked
                  />
                  <label htmlFor={id}>{label}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-title">
              <i className="fas fa-tools"></i> Ouvrages
            </div>
            <div className="filter-checkbox-group">
              {[
                ["buses", "Buses"],
                ["dalots", "Dalots"],
                ["ponts", "Ponts"],
                ["passages_submersibles", "Passages submersibles"],
                ["bacs", "Bacs"],
              ].map(([id, label]) => (
                <div className="checkbox-item" key={id}>
                  <input 
                    type="checkbox" 
                    id={id}
                    defaultChecked
                  />
                  <label htmlFor={id}>{label}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="filter-section">
            <div className="filter-title">
              <i className="fas fa-exclamation-triangle"></i> Surveillance
            </div>
            <div className="filter-checkbox-group">
              {[
                ["points_coupures", "Points de coupure"],
                ["points_critiques", "Points critiques"],
              ].map(([id, label]) => (
                <div className="checkbox-item" key={id}>
                  <input 
                    type="checkbox" 
                    id={id}
                    defaultChecked
                  />
                  <label htmlFor={id}>{label}</label>
                </div>
              ))}
            </div>
          </div>
        </div>  
        

        {/* Carte */}
        <div className="map-container">
          <MapContainer />
        </div>

        {/* Panel de droite */}
        <div className="right-panel">
          <TimeChart />
          <InfrastructureDonut />
          <BarChart />
        </div>
      </div>

      {/* Vue Dashboard */}
      <div 
        className="view-container dashboard-view" 
        style={{ display: currentView === "dashboard" ? "block" : "none" }}
      >
        <Dashboard />
      </div>
    </div>
  );
};

export default AdminPage;