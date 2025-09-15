// src/components/GeographicFilterWithZoom.js
import React, { useState, useEffect } from 'react';
import './GeographicFilter.css';
import api from './api';

/**
 * Composant de filtrage géographique hiérarchique avec zoom automatique
 * Région > Préfecture > Commune avec mise à jour de la carte
 */
const GeographicFilterWithZoom = ({ 
  onFiltersChange, 
  onZoomToLocation,
  initialFilters = {},
  showLabels = true,
  disabled = false 
}) => {
  // État local
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    region_id: initialFilters.region_id || '',
    prefecture_id: initialFilters.prefecture_id || '',
    commune_id: initialFilters.commune_id || ''
  });

  // Données dérivées (calculées côté client pour performance)
  const [availablePrefectures, setAvailablePrefectures] = useState([]);
  const [availableCommunes, setAvailableCommunes] = useState([]);

  // Charger toute la hiérarchie au montage (1 seul appel API)
  useEffect(() => {
    loadGeographyHierarchy();
  }, []);

  // Recalculer les options disponibles quand les filtres changent
  useEffect(() => {
    updateAvailableOptions();
  }, [hierarchy, filters.region_id, filters.prefecture_id]);

  // Notifier le parent quand les filtres changent
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);

  const loadGeographyHierarchy = async () => {
    setLoading(true);
    try {
      const result = await api.geography.getHierarchy();
      
      if (result.success) {
        setHierarchy(result.data.hierarchy || []);
        console.log(`✅ Hiérarchie chargée: ${result.data.total_regions} régions, ${result.data.total_prefectures} préfectures, ${result.data.total_communes} communes`);
      } else {
        throw new Error(result.error || 'Erreur chargement hiérarchie');
      }
      
    } catch (error) {
      console.error('Erreur chargement hiérarchie:', error);
      setHierarchy([]);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailableOptions = () => {
    if (!hierarchy.length) return;

    // Calculer les préfectures disponibles
    if (filters.region_id) {
      const selectedRegion = hierarchy.find(r => r.id === parseInt(filters.region_id));
      setAvailablePrefectures(selectedRegion ? selectedRegion.prefectures : []);
    } else {
      // Toutes les préfectures si aucune région sélectionnée
      const allPrefectures = hierarchy.flatMap(r => r.prefectures);
      setAvailablePrefectures(allPrefectures);
    }

    // Calculer les communes disponibles
    if (filters.prefecture_id) {
      const selectedPrefecture = availablePrefectures.find(p => p.id === parseInt(filters.prefecture_id));
      setAvailableCommunes(selectedPrefecture ? selectedPrefecture.communes : []);
    } else if (filters.region_id) {
      // Toutes les communes de la région sélectionnée
      const selectedRegion = hierarchy.find(r => r.id === parseInt(filters.region_id));
      const allCommunesInRegion = selectedRegion ? 
        selectedRegion.prefectures.flatMap(p => p.communes) : [];
      setAvailableCommunes(allCommunesInRegion);
    } else {
      // Toutes les communes
      const allCommunes = hierarchy.flatMap(r => 
        r.prefectures.flatMap(p => p.communes)
      );
      setAvailableCommunes(allCommunes);
    }
  };

  // ✅ ZOOM AUTOMATIQUE vers la localisation sélectionnée
  const zoomToLocation = async (type, id) => {
    if (!onZoomToLocation) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/geography/zoom/?type=${type}&id=${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.location) {
        console.log(`🎯 Zoom vers ${data.location.type}: ${data.location.nom}`);
        onZoomToLocation(data.location);
      }
      
    } catch (error) {
      console.error(`Erreur zoom vers ${type} ${id}:`, error);
    }
  };

  const handleRegionChange = (e) => {
    const regionId = e.target.value;
    setFilters({
      region_id: regionId,
      prefecture_id: '', // Reset cascade
      commune_id: ''     // Reset cascade
    });
    
    // ✅ ZOOM AUTOMATIQUE sur la région
    if (regionId) {
      zoomToLocation('region', regionId);
    }
  };

  const handlePrefectureChange = (e) => {
    const prefectureId = e.target.value;
    setFilters(prev => ({
      ...prev,
      prefecture_id: prefectureId,
      commune_id: '' // Reset cascade
    }));
    
    // ✅ ZOOM AUTOMATIQUE sur la préfecture
    if (prefectureId) {
      zoomToLocation('prefecture', prefectureId);
    }
  };

  const handleCommuneChange = (e) => {
    const communeId = e.target.value;
    setFilters(prev => ({
      ...prev,
      commune_id: communeId
    }));
    
    // ✅ ZOOM AUTOMATIQUE sur la commune
    if (communeId) {
      zoomToLocation('commune', communeId);
    }
  };

  const resetFilters = () => {
    setFilters({
      region_id: '',
      prefecture_id: '',
      commune_id: ''
    });
    
    // ✅ ZOOM sur la Guinée entière (coordonnées par défaut)
    if (onZoomToLocation) {
      onZoomToLocation({
        nom: 'Guinée',
        type: 'country',
        center: [-11.3167, 9.9456],
        bounds: null // Laissera la carte utiliser le zoom par défaut
      });
    }
  };

  if (loading) {
    return (
      <div className="geographic-filter">
        <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
          🌍 Chargement de la géographie...
        </div>
      </div>
    );
  }

  return (
    <div className="geographic-filter">
      {/* Région */}
      <div className="filter-group">
        {showLabels && <div className="filter-label">Région</div>}
        <select 
          className="filter-select" 
          value={filters.region_id}
          onChange={handleRegionChange}
          disabled={disabled}
        >
          <option value="">Toutes les régions</option>
          {hierarchy.map(region => (
            <option key={region.id} value={region.id}>
              {region.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Préfecture */}
      <div className="filter-group">
        {showLabels && <div className="filter-label">Préfecture</div>}
        <select 
          className="filter-select" 
          value={filters.prefecture_id}
          onChange={handlePrefectureChange}
          disabled={disabled || !availablePrefectures.length}
        >
          <option value="">
            {filters.region_id ? 'Toutes les préfectures' : 'Sélectionner une région d\'abord'}
          </option>
          {availablePrefectures.map(prefecture => (
            <option key={prefecture.id} value={prefecture.id}>
              {prefecture.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Commune */}
      <div className="filter-group">
        {showLabels && <div className="filter-label">Commune</div>}
        <select 
          className="filter-select" 
          value={filters.commune_id}
          onChange={handleCommuneChange}
          disabled={disabled || !availableCommunes.length}
        >
          <option value="">
            {filters.prefecture_id || filters.region_id ? 'Toutes les communes' : 'Sélectionner une zone d\'abord'}
          </option>
          {availableCommunes.map(commune => (
            <option key={commune.id} value={commune.id}>
              {commune.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Boutons de contrôle */}
      <div className="filter-controls">
        {/* Bouton reset */}
        {(filters.region_id || filters.prefecture_id || filters.commune_id) && (
          <button 
            type="button" 
            className="btn reset-btn" 
            onClick={resetFilters}
            disabled={disabled}
            title="Réinitialiser les filtres et voir toute la Guinée"
          >
            🔄 Réinitialiser
          </button>
        )}
        
        {/* Indicateur de sélection active */}
        <div className="filter-status">
          {filters.commune_id && (
            <span className="status-active">🎯 Commune sélectionnée</span>
          )}
          {!filters.commune_id && filters.prefecture_id && (
            <span className="status-active">🎯 Préfecture sélectionnée</span>
          )}
          {!filters.commune_id && !filters.prefecture_id && filters.region_id && (
            <span className="status-active">🎯 Région sélectionnée</span>
          )}
          {!filters.region_id && !filters.prefecture_id && !filters.commune_id && (
            <span className="status-default">🌍 Vue nationale</span>
          )}
        </div>
      </div>

      {/* Affichage debug en développement */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info" style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.5rem' }}>
          Debug: R:{filters.region_id} P:{filters.prefecture_id} C:{filters.commune_id}
          <br />
          Options: {availablePrefectures.length} préfectures, {availableCommunes.length} communes
        </div>
      )}
    </div>
  );
};

export default GeographicFilterWithZoom;