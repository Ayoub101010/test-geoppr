import React, { useEffect, useState } from "react";
import geoLogo from "../assets/GeoPPR_Logo.png";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import MapContainer from "./MapContainer";
import TimeChart from "./TimeChart";
import InfrastructureDonut from "./InfrastructureDonut";
import RadarChartComponent from "./RadarChart";
import BarChart from "./BarChart";
import { FaArrowLeft } from "react-icons/fa"; // utiliser react-icons pour icône

import "./UserPage.css";

const SuperAdminPage = () => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
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
    <div className="user-wrapper">
      {/* Overlay d'export */}
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
          <div className="nav-item active">
            <i className="fas fa-chart-line"></i> Accueil
          </div>
        </div>
        <div className="user-profile">
          <button
            className="profile-pic back-button"
            onClick={() => setShowLogoutModal(true)}
            title="Quitter la plateforme"
          >
            <FaArrowLeft />
          </button>
          <div className="user-info">
            <h4>Quitter La Plateforme</h4>
          </div>

          {/* Modal de déconnexion */}
          {showLogoutModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>Êtes-vous sûr de vouloir vous quitter ?</h3>
                <div className="modal-buttons">
                  <button
                    onClick={() => {
                      setShowLogoutModal(false);
                      navigate("/"); // ou window.location.href = "/" selon ton routing
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

      {/* Contenu principal */}
      <div className="main-container">
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
              <i className="fas fa-road"></i>
              Type de géométrie
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
              <i className="fas fa-building"></i>
              Infrastructures rurales
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
    </div>
  );
};

export default SuperAdminPage;
