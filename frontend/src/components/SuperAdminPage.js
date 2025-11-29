import React, { useEffect, useState, useRef } from "react";

import "leaflet/dist/leaflet.css";
import TimeChart from "./TimeChart";
import InfrastructureDonut from "./InfrastructureDonut";
import RadarChartComponent from "./RadarChart";
import BarChart from "./BarChart";
import MapContainer from "./MapContainer";
import Dashboard from "./DashBoard";
import GestionUserPage from "./GestionUserPage";
import "./SuperAdminPage.css";
import CommuneSelector from './CommuneSelector';
import GeographicFilter from './GeographicFilterWithZoom';

const SuperAdminPage = () => {
  const [currentView, setCurrentView] = useState("map"); // ← AJOUTÉ
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Récupérer les infos utilisateur depuis localStorage
  const getUserInfo = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return {
          nom: user.nom || user.last_name || "Utilisateur",
          prenom: user.prenom || user.first_name || "",
          email: user.email || "",
          role: user.role || "super_admin"
        };
      } catch (e) {
        console.error('Erreur parsing user:', e);
      }
    }
    return { nom: "Utilisateur", prenom: "", email: "", role: "super_admin" };
  };
  
  const [profile] = useState(getUserInfo());
  
  // Générer les initiales (2 premières lettres)
  const getInitials = () => {
    const firstLetter = profile.prenom ? profile.prenom.charAt(0).toUpperCase() : '';
    const secondLetter = profile.nom ? profile.nom.charAt(0).toUpperCase() : '';
    return firstLetter + secondLetter || 'SA';
  };

  // État des filtres
  const [filters, setFilters] = useState({
    region: "",
    prefecture: "",
    commune: "",
    commune_id: "",
    types: new Set(),
  });

  const goToDashboard = () => {
    setCurrentView("dashboard");
  };

  const goToUserManagement = () => {
    setCurrentView("users");
  };

  const getActiveFilters = () => {
    const region = document.getElementById("regionFilter")?.value || "";
    const prefecture = document.getElementById("prefectureFilter")?.value || "";
    const commune_id = document.getElementById("communeFilter")?.value || "";

    const checkedTypes = Array.from(
      document.querySelectorAll(
        ".filter-checkbox-group input[type='checkbox']:checked"
      )
    ).map((cb) => cb.id);

    return {
      region,
      prefecture,
      commune_id,
      types: new Set(checkedTypes),
    };
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const exportBtn = document.getElementById("exportBtn");
    const dropdown = document.querySelector(".export-dropdown");

    const toggleDropdown = () => {
      dropdown?.classList.toggle("show");
    };

    if (exportBtn) {
      exportBtn.addEventListener("click", toggleDropdown);
    }

    return () => {
      if (exportBtn) {
        exportBtn.removeEventListener("click", toggleDropdown);
      }
    };
  }, [currentView]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/';
  };

  return (
    <div className="superadmin-wrapper">
      {/* Overlay export */}
      <div className="export-overlay" id="exportOverlay">
        <div className="export-loading">
          <div className="export-spinner"></div>
          <p>Génération de l'export en cours...</p>
        </div>
      </div>

      {/* Header */}
      <div className="header">
        
        
        <div className="nav-menu">
          <div
            className={`nav-item ${currentView === "map" ? "active" : ""}`}
            onClick={() => setCurrentView("map")}
          >
            <i className="fas fa-map"></i> Carte
          </div>
          <div
            className={`nav-item ${currentView === "dashboard" ? "active" : ""}`}
            onClick={goToDashboard}
          >
            <i className="fas fa-chart-line"></i> Tableau de bord
          </div>
          <div
            className={`nav-item ${currentView === "users" ? "active" : ""}`}
            onClick={goToUserManagement}
          >
            <i className="fas fa-users"></i> Gestion Utilisateurs
          </div>
        </div>

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
            <span>Super Admin</span>
          </div>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <ul>
                <li onClick={() => setShowLogoutModal(true)}>
                  <i className="fas fa-sign-out-alt"></i> Déconnexion
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

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

      {/* SOLUTION 1: Vue Carte - Reste avec main-container */}
      <div className="main-container" style={{ display: currentView === "map" ? "flex" : "none" }}>
        <div className="sidebar">
          {/* Filtres géographiques */}
          <div className="filter-section">
            <div className="filter-title">
              <i className="fas fa-map-marker-alt"></i> Localisation
            </div>
            <div className="filter-row">
              <GeographicFilter
                onFiltersChange={(geoFilters) => {
                  const currentFilters = {
                    region_id: filters.region_id,
                    prefecture_id: filters.prefecture_id,
                    commune_id: filters.commune_id
                  };
                  
                  if (JSON.stringify(geoFilters) === JSON.stringify(currentFilters)) {
                    return;
                  }
                  
                  setFilters(prev => ({
                    ...prev,
                    region_id: geoFilters.region_id,
                    prefecture_id: geoFilters.prefecture_id,
                    commune_id: geoFilters.commune_id
                  }));
                  
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('geographicFilterChanged', {
                      detail: geoFilters
                    }));
                  }, 100);
                }}
                initialFilters={{
                  region_id: filters.region_id,
                  prefecture_id: filters.prefecture_id,
                  commune_id: filters.commune_id
                }}
                showLabels={true}
              />
            </div>
          </div>

          {/* Filtres géométrie */}
          <div className="filter-section">
            <div className="filter-title">
              <i className="fas fa-road"></i> Voirie
            </div>
            <div className="filter-checkbox-group">
              <div className="checkbox-item">
                <input type="checkbox" id="pistes" defaultChecked />
                <label htmlFor="pistes">Pistes</label>
              </div>
              <div className="checkbox-item">
                <input type="checkbox" id="chaussees" defaultChecked />
                <label htmlFor="chaussees">Chaussées</label>
              </div>
            </div>
          </div>

          {/* Filtres infrastructures */}
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
                  <input type="checkbox" id={id} defaultChecked />
                  <label htmlFor={id}>{label}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Filtres ouvrages */}
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
                  <input type="checkbox" id={id} defaultChecked />
                  <label htmlFor={id}>{label}</label>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Contenu principal */}
        <div className="map-container">
          <MapContainer />
        </div>

        {/* Panel de droite */}
        <div className="right-panel">
          <TimeChart />
          <InfrastructureDonut />
          {/*<RadarChartComponent />*/}
          <BarChart />
        </div>
      </div>

      {/* SOLUTION 2: Vue Dashboard - Nouvelle classe spécialisée */}
      <div 
        className="view-container dashboard-view" 
        style={{ display: currentView === "dashboard" ? "block" : "none" }}
      >
        <Dashboard />
      </div>

      {/* SOLUTION 3: Vue Users - Nouvelle classe spécialisée */}
      <div 
        className="view-container users-view" 
        style={{ display: currentView === "users" ? "block" : "none" }}
      >
        <GestionUserPage />
      </div>
    </div>
  );
};

export default SuperAdminPage;