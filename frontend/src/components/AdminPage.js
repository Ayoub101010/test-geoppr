// src/components/AdminPage.js
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
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const { user, logout } = useAuth();
  
  const [profile, setProfile] = useState({
    nom: user?.nom || "Admin",
    prenom: user?.prenom || "",
    email: user?.mail || "admin@example.com",
  });

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

  const handleEditProfile = () => {
    setShowEditProfileModal(true);
    setShowProfileMenu(false);
  };

  const handleSaveProfile = () => {
    console.log("Profil sauvegardé:", profile);
    setShowEditProfileModal(false);
  };

  return (
    <div className="superadmin-wrapper">
      {/* Header identique */}
      <div className="header">
        <div className="logo">
          <img src={geoLogo} alt="GeoPPR Logo" />
        </div>

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

        {/* Profil */}
        <div className="profile-section" ref={profileRef}>
          <div
            className="profile-info"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="profile-avatar">
              {profile.nom.charAt(0).toUpperCase()}
            </div>
            <span className="profile-name">
              {profile.nom} {profile.prenom}
            </span>
            <span className="profile-role">Administrateur</span>
            <i className="fas fa-chevron-down"></i>
          </div>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <ul>
                <li onClick={handleEditProfile}>
                  <i className="fas fa-user-edit"></i> Modifier le profil
                </li>
                <li onClick={() => { setShowLogoutModal(true); setShowProfileMenu(false); }}>
                  <i className="fas fa-sign-out-alt"></i> Déconnexion
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Modales identiques */}
      {showEditProfileModal && (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <h2 className="modal-title">Modifier le profil</h2>
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProfile();
              }}
            >
              <div className="form-group">
                <label htmlFor="nom" className="modal-label">Nom</label>
                <input
                  id="nom"
                  type="text"
                  value={profile.nom}
                  className="modal-input"
                  onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="prenom" className="modal-label">Prénom</label>
                <input
                  id="prenom"
                  type="text"
                  value={profile.prenom}
                  className="modal-input"
                  onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email" className="modal-label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  className="modal-input"
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
              <div className="modal-buttons">
                <button type="submit">Enregistrer</button>
                <button type="button" onClick={() => setShowEditProfileModal(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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