import React, { useEffect, useState, useRef } from "react";
import geoLogo from "../assets/GeoPPR_Logo.png";
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
  const [currentView, setCurrentView] = useState("map");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profile, setProfile] = useState({
    nom: "Admin",
    prenom: "Admin1",
    email: "Admin@example.com",
  });

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

  const handleEditProfile = () => {
    setShowEditProfileModal(true);
    setShowProfileMenu(false);
  };

  const handleSaveProfile = () => {
    console.log('Profil sauvegardé:', profile);
    setShowEditProfileModal(false);
  };

  return (
    <div className="superadmin-wrapper"> {/* Utiliser superadmin-wrapper pour correspondre au CSS */}
      {/* Overlay export */}
      <div className="export-overlay" id="exportOverlay">
        <div className="export-loading">
          <div className="export-spinner"></div>
          <p>Génération de l'export en cours...</p>
        </div>
      </div>

      {/* Header */}
      <div className="header">
        <div className="logo">
          <img src={geoLogo} alt="GeoPPR Logo" />
        </div>
        
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
            SA
          </div>
          <div className="user-info">
            <h4>{profile.prenom} {profile.nom}</h4>
            <span>Super Admin</span>
          </div>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <ul>
                <li onClick={handleEditProfile}>
                  <i className="fas fa-edit"></i> Modifier le profil
                </li>
                <li onClick={() => setShowLogoutModal(true)}>
                  <i className="fas fa-sign-out-alt"></i> Déconnexion
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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

      {/* Contenu dynamique selon la vue */}
      {currentView === "map" && (
        <div className="main-container">
          {/* Sidebar */}
          <div className="sidebar">
            {/* Filtres géographiques */}
            <div className="filter-section">
              <div className="filter-title">
                <i className="fas fa-map-marker-alt"></i> Localisation
              </div>
              <div className="filter-row">
                <GeographicFilter
                  onFiltersChange={(geoFilters) => {
                    // ✅ PROTECTION ANTI-BOUCLE
                    const currentFilters = {
                      region_id: filters.region_id,
                      prefecture_id: filters.prefecture_id,
                      commune_id: filters.commune_id
                    };
                    
                    if (JSON.stringify(geoFilters) === JSON.stringify(currentFilters)) {
                      return; // Pas de changement, éviter la boucle
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
                <i className="fas fa-road"></i> Type de géométrie
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
                  ["buses", "Buses"],
                  ["dalots", "Dalots"],
                  ["ponts", "Ponts"],
                  ["passages_submersibles", "Passages submersibles"],
                  ["bacs", "Bacs"],
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
          </div>

          {/* Contenu principal */}
          <div className="map-container">
            <MapContainer />
          </div>

          {/* Panel de droite */}
          <div className="right-panel">
            <TimeChart />
            <InfrastructureDonut />
            <RadarChartComponent />
            <BarChart />
          </div>
        </div>
      )}

      {currentView === "dashboard" && <Dashboard />}

      {currentView === "users" && (
        <div className="users-container">
          <GestionUserPage />
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;