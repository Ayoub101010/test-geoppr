// src/components/UserPage.js
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import geoLogo from "../assets/GeoPPR_Logo.png";
import "leaflet/dist/leaflet.css";
import InfrastructureDonut from "./InfrastructureDonut";
import BarChart from "./BarChart";
import MapContainer from "./MapContainer";
import "./SuperAdminPage.css"; 
import GeographicFilter from './GeographicFilterWithZoom';
import { useAuth } from './AuthContext'; // ✅ AJOUTÉ

const UserPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth(); // ✅ AJOUTÉ
  const [currentView, setCurrentView] = useState("map");
  const isFirstRender = useRef(true);

  //  Forcer la déconnexion pour l'accès public
  useEffect(() => {
    logout(); // Nettoie complètement l'authentification
    console.log('🌐 Mode accès public activé - utilisateur déconnecté');
  }, []); // S'exécute une seule fois au montage

  // État pour les filtres avec tous les types activés par défaut
  const [filters, setFilters] = useState({
    region_id: "",
    prefecture_id: "",
    commune_id: "",
    types: new Set([
      "pistes", "chaussees", "localites", "ecoles", "marches",
      "batiments_administratifs", "infrastructures_hydrauliques",
      "services_santes", "autres_infrastructures", "buses",
      "dalots", "ponts", "passages_submersibles", "bacs"
    ])
  });

  // ... reste du code inchangé

  // Utiliser useCallback pour éviter les re-créations de fonction
  const handleGeographicFiltersChange = React.useCallback((geoFilters) => {
    // Éviter les mises à jour lors du premier rendu
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Vérifier si les valeurs ont réellement changé
    setFilters((prev) => {
      if (
        prev.region_id === geoFilters.region_id &&
        prev.prefecture_id === geoFilters.prefecture_id &&
        prev.commune_id === geoFilters.commune_id
      ) {
        return prev; // Pas de changement, retourner l'état précédent
      }

      // Émettre l'événement seulement si les valeurs ont changé
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("geographicFilterChanged", {
            detail: geoFilters,
          })
        );
      }, 100);

      return {
        ...prev,
        region_id: geoFilters.region_id,
        prefecture_id: geoFilters.prefecture_id,
        commune_id: geoFilters.commune_id,
      };
    });
  }, []);

  // Gestion des changements de types d'infrastructures
  const handleTypeFilterChange = (typeId, checked) => {
    setFilters(prev => {
      const newTypes = new Set(prev.types);
      if (checked) {
        newTypes.add(typeId);
      } else {
        newTypes.delete(typeId);
      }
      return { ...prev, types: newTypes };
    });

    // Émettre l'événement pour les autres composants
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("typeFilterChanged", {
          detail: { typeId, checked },
        })
      );
    }, 100);
  };

  // Retour à la page de connexion
  const handleBackToLogin = () => {
    navigate("/");
  };

  return (
    <div className="superadmin-wrapper">
      {/* Header */}
      <div className="header">

        <div className="nav-menu">
          <div
            className={`nav-item ${currentView === "map" ? "active" : ""}`}
            onClick={() => setCurrentView("map")}
          >
            <i className="fas fa-map"></i> Carte
          </div>
        </div>

        <div className="user-profile">
          <div
            className="nav-item active"
            onClick={handleBackToLogin}
            style={{ cursor: 'pointer' }}
          >
            <i className="fas fa-sign-in-alt"></i> Connexion
          </div>
        </div>
      </div>

      {/* Vue Carte */}
      <div
        className="main-container"
        style={{ display: currentView === "map" ? "flex" : "none" }}
      >
        <div className="sidebar">
          {/* Filtres géographiques */}
          <div className="filter-section">
            <div className="filter-title">
              <i className="fas fa-map-marker-alt"></i> Localisation
            </div>
            <GeographicFilter
              onFiltersChange={handleGeographicFiltersChange}
              initialFilters={{
                region_id: filters.region_id || "",
                prefecture_id: filters.prefecture_id || "",
                commune_id: filters.commune_id || "",
              }}
              showLabels={true}
            />
          </div>

          {/* Filtres voirie */}
          <div className="filter-section">
            <div className="filter-title">
              <i className="fas fa-road"></i> Voirie
            </div>
            <div className="filter-checkbox-group">
              <div className="checkbox-item">
                <input 
                  type="checkbox" 
                  id="pistes" 
                  checked={filters.types.has("pistes")}
                  onChange={(e) => handleTypeFilterChange("pistes", e.target.checked)}
                />
                <label htmlFor="pistes">Pistes</label>
              </div>
              <div className="checkbox-item">
                <input 
                  type="checkbox" 
                  id="chaussees" 
                  checked={filters.types.has("chaussees")}
                  onChange={(e) => handleTypeFilterChange("chaussees", e.target.checked)}
                />
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
                  <input 
                    type="checkbox" 
                    id={id} 
                    checked={filters.types.has(id)}
                    onChange={(e) => handleTypeFilterChange(id, e.target.checked)}
                  />
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
                  <input 
                    type="checkbox" 
                    id={id} 
                    checked={filters.types.has(id)}
                    onChange={(e) => handleTypeFilterChange(id, e.target.checked)}
                  />
                  <label htmlFor={id}>{label}</label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="map-container">
          <MapContainer filters={filters} />
        </div>

        {/* Panel de droite */}
        <div className="right-panel">
          <InfrastructureDonut filters={filters} />
          <BarChart filters={filters} />
        </div>
      </div>
    </div>
  );
};

export default UserPage;