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

  const goToDashboard = () => {
    setCurrentView("dashboard");
  };
  const [filters, setFilters] = useState({
    region: "",
    prefecture: "",
    commune: "",
    types: new Set(),
  });
  const getActiveFilters = () => {
    const region = document.getElementById("regionFilter")?.value || "";
    const prefecture = document.getElementById("prefectureFilter")?.value || "";
    const commune = document.getElementById("communeFilter")?.value || "";

    const checkedTypes = Array.from(
      document.querySelectorAll(
        ".filter-checkbox-group input[type='checkbox']:checked"
      )
    ).map((cb) => cb.id);

    return {
      region,
      prefecture,
      commune,
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
      dropdown.classList.toggle("show");
    };

    if (exportBtn) {
      exportBtn.addEventListener("click", toggleDropdown);
    }

    const allInputs = document.querySelectorAll(
      ".filter-select, .filter-checkbox-group input"
    );

    const handleChange = () => {
      setFilters(getActiveFilters());
    };

    allInputs.forEach((input) => {
      input.addEventListener("change", handleChange);
    });

    // Init au montage
    handleChange();

    return () => {
      allInputs.forEach((input) => {
        input.removeEventListener("change", handleChange);
      });
    };
  }, []);

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
        <div className="logo">
          <img src={geoLogo} alt="Logo" />
        </div>
        <div className="nav-menu">
          <div
            className={`nav-item ${currentView === "map" ? "active" : ""}`}
            onClick={() => setCurrentView("map")}
          >
            <i className="fas fa-chart-line"></i> Accueil
          </div>
          <div
            className={`nav-item ${
              currentView === "dashboard" ? "active" : ""
            }`}
            onClick={goToDashboard}
          >
            <i className="fas fa-tachometer-alt"></i> Tableau de bord
          </div>
          <div
            className={`nav-item ${currentView === "users" ? "active" : ""}`}
            onClick={() => setCurrentView("users")}
          >
            <i className="fas fa-users-cog"></i> Gestion des Utilisateurs
          </div>
        </div>
        <div
          className="user-profile"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          ref={profileRef}
          style={{ cursor: "pointer", position: "relative" }}
        >
          <div className="profile-pic">SA</div>
          <div className="user-info">
            <h4>SuperAdmin</h4>
          </div>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <ul>
                <li onClick={() => setShowEditProfileModal(true)}>
                  Modifier le profil
                </li>

                <li onClick={() => setShowLogoutModal(true)}>Se déconnecter</li>
              </ul>
            </div>
          )}
          {showEditProfileModal && (
            <div className="superadmin-wrapper">
              <div
                className="modal-overlay"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-content">
                  <h2 className="modal-title">Modifier le profil</h2>

                  <form
                    className="modal-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      console.log("Profil modifié :", profile);
                      setShowEditProfileModal(false);
                    }}
                  >
                    <div className="form-group">
                      <label htmlFor="nom" className="modal-label">
                        Nom
                      </label>
                      <input
                        id="nom"
                        type="text"
                        value={profile.nom}
                        className="modal-input"
                        onChange={(e) =>
                          setProfile({ ...profile, nom: e.target.value })
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="prenom" className="modal-label">
                        Prénom
                      </label>
                      <input
                        id="prenom"
                        type="text"
                        value={profile.prenom}
                        className="modal-input"
                        onChange={(e) =>
                          setProfile({ ...profile, prenom: e.target.value })
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email" className="modal-label">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={profile.email}
                        className="modal-input"
                        onChange={(e) =>
                          setProfile({ ...profile, email: e.target.value })
                        }
                      />
                    </div>

                    <div className="modal-buttons">
                      <button type="submit">Enregistrer</button>
                      <button
                        type="button"
                        onClick={() => setShowEditProfileModal(false)}
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {showLogoutModal && (
            <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <h3>Êtes-vous sûr de vouloir vous déconnecter ?</h3>
                <div className="modal-buttons">
                  <button
                    onClick={() => {
                      setShowLogoutModal(false);
                      // ici tu rediriges vers LoginPage
                      window.location.href = "/";
                    }}
                  >
                    Oui
                  </button>
                  <button onClick={() => setShowLogoutModal(false)}>Non</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenu dynamique selon la vue */}
      {currentView === "map" && (
        <div className="main-container">
          {/* Sidebar */}
          <div className="sidebar">
            {/* Filtres géographiques */}
            <div className="filter-section">
              <div className="filter-title">
                <i className="fas fa-map-marker-alt"></i>
                Localisation géographique
              </div>
              <div className="filter-group">
                <div className="filter-label">Région</div>
                <select className="filter-select" id="regionFilter">
                  <option value="">Les régions</option>
                  <option value="conakry">Conakry</option>
                  <option value="boke">Boké</option>
                  <option value="kindia">Kindia</option>
                  <option value="mamou">Mamou</option>
                  <option value="labe">Labé</option>
                  <option value="faranah">Faranah</option>
                  <option value="kankan">Kankan</option>
                  <option value="nzerekore">Nzérékoré</option>
                </select>
              </div>
              <div className="filter-group">
                <div className="filter-label">Préfecture</div>
                <select className="filter-select" id="prefectureFilter">
                  <option value="">Les Préfectures</option>
                </select>
              </div>
              <div className="filter-group">
                <div className="filter-label">Commune</div>
                <select className="filter-select" id="communeFilter">
                  <option value="">Les Communes</option>
                </select>
              </div>
            </div>

            {/* Filtres géométrie */}
            <div className="filter-section">
              <div className="filter-title">
                <i className="fas fa-road"></i> Type de géométrie
              </div>
              <div className="filter-checkbox-group">
                {[
                  ["pistes", "Pistes"],
                  ["chaussees", "Chaussées"],
                  ["buses", "Buses"],
                  ["dalots", "Dalots"],
                  ["ponts", "Ponts"],
                  ["passages", "Passages submersibles"],
                  ["bacs", "Bacs"],
                ].map(([id, label]) => (
                  <div className="checkbox-item" key={id}>
                    <input type="checkbox" id={id} defaultChecked />
                    <label htmlFor={id}>{label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Filtres infrastructures */}
            <div className="filter-section">
              <div className="filter-title">
                <i className="fas fa-building"></i> Infrastructures rurales
              </div>
              <div className="filter-checkbox-group">
                {[
                  ["localites", "Localités"],
                  ["ecoles", "Écoles"],
                  ["marches", "Marchés"],
                  ["administratifs", "Bâtiments administratifs"],
                  ["hydrauliques", "Infrastructures hydrauliques"],
                  ["sante", "Services de santé"],
                  ["autres", "Autres infrastructures"],
                ].map(([id, label]) => (
                  <div className="checkbox-item" key={id}>
                    <input type="checkbox" id={id} defaultChecked />
                    <label htmlFor={id}>{label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Carte */}
          <MapContainer filters={filters} />
          {/* Right Panel */}
          <div className="right-panel">
            <TimeChart />
            <InfrastructureDonut filters={filters} />
            <RadarChartComponent />
            <BarChart />
          </div>
        </div>
      )}
      {currentView === "dashboard" && <Dashboard />}

      {currentView === "users" && <GestionUserPage />}
    </div>
  );
};

export default SuperAdminPage;
