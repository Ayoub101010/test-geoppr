// src/components/UserPage.js
import React, { useEffect, useState, useRef } from "react";
import geoLogo from "../assets/GeoPPR_Logo.png";
import "leaflet/dist/leaflet.css";
import TimeChart from "./TimeChart";
import InfrastructureDonut from "./InfrastructureDonut";
import RadarChartComponent from "./RadarChart";
import BarChart from "./BarChart";
import MapContainer from "./MapContainer";
import "./SuperAdminPage.css"; // Utilise le même CSS
import CommuneSelector from './CommuneSelector';

const UserPage = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  // États des filtres
  const [filters, setFilters] = useState({
    region: "",
    prefecture: "",
    commune: "",
    commune_id: "",
    types: new Set(),
  });

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
      if (exportBtn) {
        exportBtn.removeEventListener("click", toggleDropdown);
      }
      allInputs.forEach((input) => {
        input.removeEventListener("change", handleChange);
      });
    };
  }, []);

  return (
    <div className="superadmin-wrapper"> {/* Utilise la même classe pour cohérence CSS */}
      {/* Overlay export */}
      <div className="export-overlay" id="exportOverlay">
        <div className="export-loading">
          <div className="export-spinner"></div>
          <p>Génération de l'export en cours...</p>
        </div>
      </div>

      {/* Header simplifié pour utilisateurs publics */}
      <div className="header">
        <div className="logo">
          <img src={geoLogo} alt="Logo GeoPPR" />
        </div>
        
        {/* Navigation simplifiée - seulement Carte */}
        <div className="nav-menu">
          <div className="nav-item active">
            <i className="fas fa-map"></i> Carte Interactive
          </div>
        </div>

        {/* Profil simplifié */}
        <div className="user-profile" ref={profileRef}>
          <div 
            className="profile-pic"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{ cursor: "pointer" }}
          >
            UP
          </div>
          <div className="user-info">
            <h4>Utilisateur Public</h4>
            <span>Accès Public</span>
          </div>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <ul>
                <li onClick={() => window.location.href = "/"}>
                  <i className="fas fa-sign-in-alt"></i> Se connecter
                </li>
                <li onClick={() => alert("Plateforme GeoPPR - République de Guinée\nSuivi et évaluation des infrastructures")}>
                  <i className="fas fa-info-circle"></i> À propos
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal - Toujours afficher la carte */}
      <div className="main-container">
        {/* Sidebar avec filtres */}
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
                <option value="">Toutes les régions</option>
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
                <option value="">Toutes les préfectures</option>
              </select>
            </div>
            <div className="filter-group">
              <div className="filter-label">Commune</div>
              <CommuneSelector onCommuneChange={(communeId) => {
                setFilters(prev => ({...prev, commune_id: communeId}));
                
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('communeFilterChanged', {
                    detail: { commune_id: communeId }
                  }));
                }, 100);
              }} />
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

        {/* Carte principale */}
        <div className="map-container">
          <MapContainer filters={filters} />
        </div>

        {/* Panel de droite avec graphiques */}
        <div className="right-panel">
          <div className="analytics-section">
            <div className="analytics-title">
              <i className="fas fa-chart-area"></i>
              Analyses Temporelles
            </div>
            <TimeChart />
          </div>

          <div className="analytics-section">
            <div className="analytics-title">
              <i className="fas fa-chart-pie"></i>
              Répartition par Type
            </div>
            <InfrastructureDonut filters={filters} />
          </div>

          <div className="analytics-section">
            <div className="analytics-title">
              <i className="fas fa-chart-bar"></i>
              Analyse Comparative
            </div>
            <RadarChartComponent />
          </div>

          <div className="analytics-section">
            <div className="analytics-title">
              <i className="fas fa-chart-column"></i>
              Statistiques Régionales
            </div>
            <BarChart />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPage;