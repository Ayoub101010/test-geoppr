// src/components/GeographicFilterWithZoom.js - VERSION OPTIMISÉE SANS APPELS API
import React, { useState, useEffect, useRef } from 'react';
import './GeographicFilter.css';
import api from './api';

const GeographicFilterWithZoom = ({ 
  onFiltersChange, 
  onZoomToLocation,
  initialFilters = {},
  showLabels = true,
  disabled = false 
}) => {
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    region_id: initialFilters.region_id || '',
    prefecture_id: initialFilters.prefecture_id || '',
    commune_id: initialFilters.commune_id || ''
  });

  const [availablePrefectures, setAvailablePrefectures] = useState([]);
  const [availableCommunes, setAvailableCommunes] = useState([]);
  
  // ✅ REF pour éviter les chargements multiples
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // ✅ CHARGEMENT UNIQUE au montage
  useEffect(() => {
    if (!hasLoadedRef.current && !isLoadingRef.current) {
      loadGeographyHierarchy();
    }
  }, []);

  useEffect(() => {
    updateAvailableOptions();
  }, [hierarchy, filters.region_id, filters.prefecture_id]);

  useEffect(() => {
    if (onFiltersChange && hasLoadedRef.current) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);

  const loadGeographyHierarchy = async () => {
    if (isLoadingRef.current || hasLoadedRef.current) {
      console.log('🔒 Hiérarchie déjà chargée ou en cours');
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      console.log('🔄 Chargement hiérarchie (UNIQUE)...');
      const result = await api.geography.getHierarchy();
      
      if (result.success) {
        setHierarchy(result.data.hierarchy || []);
        hasLoadedRef.current = true;
        console.log(`✅ Hiérarchie chargée: ${result.data.total_regions} régions, ${result.data.total_prefectures} préfectures, ${result.data.total_communes} communes`);
      } else {
        throw new Error(result.error || 'Erreur chargement hiérarchie');
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement hiérarchie:', error);
      setHierarchy([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const updateAvailableOptions = () => {
    if (!hierarchy.length) return;

    if (filters.region_id) {
      const selectedRegion = hierarchy.find(r => r.id === parseInt(filters.region_id));
      setAvailablePrefectures(selectedRegion ? selectedRegion.prefectures : []);
    } else {
      const allPrefectures = hierarchy.flatMap(r => r.prefectures);
      setAvailablePrefectures(allPrefectures);
    }

    if (filters.prefecture_id) {
      const selectedPrefecture = availablePrefectures.find(p => p.id === parseInt(filters.prefecture_id));
      setAvailableCommunes(selectedPrefecture ? selectedPrefecture.communes : []);
    } else if (filters.region_id) {
      const selectedRegion = hierarchy.find(r => r.id === parseInt(filters.region_id));
      const allCommunes = selectedRegion ? selectedRegion.prefectures.flatMap(p => p.communes) : [];
      setAvailableCommunes(allCommunes);
    } else {
      const allCommunes = hierarchy.flatMap(r => r.prefectures.flatMap(p => p.communes));
      setAvailableCommunes(allCommunes);
    }
  };

  // ✅ ZOOM côté CLIENT (PAS d'appel API)
  const zoomToLocation = (location) => {
    if (!onZoomToLocation || !location) return;
    
    console.log(`🎯 Zoom vers ${location.type}: ${location.nom}`);
    onZoomToLocation({
      type: location.type,
      nom: location.nom,
      bounds: location.bounds,
      center: location.center
    });
  };

  const handleRegionChange = (e) => {
    const newRegionId = e.target.value;
    setFilters({
      region_id: newRegionId,
      prefecture_id: '',
      commune_id: ''
    });

    // ✅ Zoom avec données locales (pas d'API)
    if (newRegionId) {
      const selectedRegion = hierarchy.find(r => r.id === parseInt(newRegionId));
      if (selectedRegion) {
        zoomToLocation({
          type: 'region',
          nom: selectedRegion.nom,
          bounds: selectedRegion.bounds,
          center: selectedRegion.center
        });
      }
    }
  };

  const handlePrefectureChange = (e) => {
    const newPrefectureId = e.target.value;
    setFilters({
      ...filters,
      prefecture_id: newPrefectureId,
      commune_id: ''
    });

    // ✅ Zoom avec données locales (pas d'API)
    if (newPrefectureId) {
      const selectedPrefecture = availablePrefectures.find(p => p.id === parseInt(newPrefectureId));
      if (selectedPrefecture) {
        zoomToLocation({
          type: 'prefecture',
          nom: selectedPrefecture.nom,
          bounds: selectedPrefecture.bounds,
          center: selectedPrefecture.center
        });
      }
    }
  };

  const handleCommuneChange = (e) => {
    const newCommuneId = e.target.value;
    setFilters({
      ...filters,
      commune_id: newCommuneId
    });

    // ✅ Zoom avec données locales (pas d'API)
    if (newCommuneId) {
      const selectedCommune = availableCommunes.find(c => c.id === parseInt(newCommuneId));
      if (selectedCommune) {
        zoomToLocation({
          type: 'commune',
          nom: selectedCommune.nom,
          bounds: selectedCommune.bounds,
          center: selectedCommune.center
        });
      }
    }
  };

  const handleReset = () => {
    setFilters({
      region_id: '',
      prefecture_id: '',
      commune_id: ''
    });

    if (onZoomToLocation) {
      onZoomToLocation({
        type: 'country',
        nom: 'Guinée',
        center: [-11.3167, 9.9456],
        bounds: null
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
        {(filters.region_id || filters.prefecture_id || filters.commune_id) && (
          <button 
            type="button" 
            className="btn reset-btn" 
            onClick={handleReset}
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
    </div>
  );
};

export default GeographicFilterWithZoom;
