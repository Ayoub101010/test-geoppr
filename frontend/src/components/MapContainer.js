// MapContainer.js - Version finale avec cache global unique
import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { collectesAPI } from "./api";
import MapLegend from "./MapLegend";

// Variables globales pour empêcher les appels multiples
let GLOBAL_DATA_CACHE = null;
let GLOBAL_HIERARCHY_CACHE = null;
let GLOBAL_LOADING = false;

const MapContainer = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerLayerRef = useRef(null);
  const lineLayerRef = useRef(null);
  
  // États locaux
  const [localDataCache, setLocalDataCache] = useState(null);
  const [hierarchyData, setHierarchyData] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [geographicFilters, setGeographicFilters] = useState({
    region_id: '',
    prefecture_id: '',
    commune_id: ''
  });
  const [isMapReady, setIsMapReady] = useState(false);

  // Configuration des icônes
  const iconConfig = {
    services_santes: { icon: "hospital", color: "#E74C3C" },
    bacs: { icon: "ship", color: "#F39C12" },
    ponts: { icon: "bridge", color: "#9B59B6" },
    buses: { icon: "bus", color: "#E74C3C" },
    dalots: { icon: "water", color: "#3498DB" },
    ecoles: { icon: "graduation-cap", color: "#27AE60" },
    marches: { icon: "shopping-cart", color: "#F1C40F" },
    batiments_administratifs: { icon: "building", color: "#34495E" },
    infrastructures_hydrauliques: { icon: "tint", color: "#3498DB" },
    localites: { icon: "home", color: "#E67E22" },
    passages_submersibles: { icon: "water", color: "#1ABC9C" },
    autres_infrastructures: { icon: "map-pin", color: "#95A5A6" },
    pistes: { icon: "road", color: "#2C3E50" },
  };

  const createCustomIcon = (type) => {
    const config = iconConfig[type] || iconConfig.autres_infrastructures;
    return L.divIcon({
      html: `<div style="background-color: ${config.color}; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              <i class="fas fa-${config.icon}" style="color: white; font-size: 10px;"></i>
            </div>`,
      className: "custom-marker",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // CHARGEMENT INITIAL AVEC CACHE GLOBAL
  const loadAllDataOnce = async () => {
    // Utiliser le cache global s'il existe ET qu'il n'est pas vide
    if (GLOBAL_DATA_CACHE && GLOBAL_HIERARCHY_CACHE && 
        GLOBAL_DATA_CACHE.features && GLOBAL_DATA_CACHE.features.length > 0) {
      console.log("📦 Utilisation du cache global existant");
      setLocalDataCache(GLOBAL_DATA_CACHE);
      setHierarchyData(GLOBAL_HIERARCHY_CACHE);
      setIsInitialLoading(false);
      return;
    }
    
    // Si le cache existe déjà localement, l'utiliser aussi
    if (localDataCache && hierarchyData && 
        localDataCache.features && localDataCache.features.length > 0) {
      console.log("📦 Données déjà présentes localement");
      setIsInitialLoading(false);
      return;
    }
    
    // Si un autre composant est en train de charger, attendre
    if (GLOBAL_LOADING) {
      console.log("⏳ Chargement en cours par un autre composant...");
      return;
    }
    
    GLOBAL_LOADING = true;
    setIsInitialLoading(true);
    console.log("🔄 Chargement UNIQUE des données et hiérarchie...");
    
    try {
      // Chargement parallèle des données et de la hiérarchie
      const [dataResult, hierarchyResponse] = await Promise.all([
        collectesAPI.getAll(), // ✅ CORRECT - Sans paramètre
        fetch('http://localhost:8000/api/geography/hierarchy/')
      ]);
      
      const hierarchyJson = await hierarchyResponse.json();
      
      if (dataResult.success && dataResult.data?.features) {
        GLOBAL_DATA_CACHE = dataResult.data;
        setLocalDataCache(GLOBAL_DATA_CACHE);
        console.log(`✅ Cache global créé: ${dataResult.data.features.length} features`);
      } else {
        GLOBAL_DATA_CACHE = { features: [] };
        setLocalDataCache(GLOBAL_DATA_CACHE);
      }
      
      if (hierarchyJson.success) {
        GLOBAL_HIERARCHY_CACHE = hierarchyJson.hierarchy;
        setHierarchyData(GLOBAL_HIERARCHY_CACHE);
        console.log(`✅ Cache hiérarchie créé: ${hierarchyJson.total_communes} communes`);
      }
      
    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      GLOBAL_DATA_CACHE = { features: [] };
      setLocalDataCache(GLOBAL_DATA_CACHE);
    } finally {
      setIsInitialLoading(false);
      GLOBAL_LOADING = false;
    }
  };

  // CALCULER LES COMMUNES CIBLES SELON FILTRES HIÉRARCHIQUES
  const getTargetCommunes = () => {
    if (!hierarchyData) return null;
    
    if (geographicFilters.commune_id) {
      return [parseInt(geographicFilters.commune_id)];
    } else if (geographicFilters.prefecture_id) {
      const prefecture = hierarchyData
        .flatMap(region => region.prefectures)
        .find(p => p.id === parseInt(geographicFilters.prefecture_id));
      
      return prefecture ? prefecture.communes.map(c => c.id) : [];
    } else if (geographicFilters.region_id) {
      const region = hierarchyData.find(r => r.id === parseInt(geographicFilters.region_id));
      
      return region ? region.prefectures.flatMap(p => p.communes.map(c => c.id)) : [];
    }
    
    return null; // Toutes les communes
  };

  // FILTRAGE LOCAL INSTANTANÉ
  const getActiveFilters = () => {
    const checkedTypes = Array.from(
      document.querySelectorAll(".filter-checkbox-group input[type='checkbox']:checked")
    ).map((cb) => cb.id);

    return { types: checkedTypes };
  };

  const filterDataLocally = () => {
    if (!localDataCache?.features) return [];
    
    const activeTypes = getActiveFilters().types;
    const targetCommunes = getTargetCommunes();
    
    const filtered = localDataCache.features.filter(feature => {
      const properties = feature.properties || {};
      
      // Filtre par type
      const typeMatch = activeTypes.includes(properties.type);
      
      // Filtre géographique hiérarchique
      let geoMatch = true;
      if (targetCommunes !== null) {
        geoMatch = targetCommunes.includes(properties.commune_id);
      }
      
      return typeMatch && geoMatch;
    });
    
    // Debug
    if (targetCommunes) {
      console.log(`🔍 Filtrage local: ${filtered.length}/${localDataCache.features.length} éléments (communes: ${targetCommunes.length})`);
    }
    
    return filtered;
  };

  // ZOOM AUTOMATIQUE
  const zoomToSelectedArea = async () => {
    if (!mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    
    try {
      if (geographicFilters.commune_id) {
        const response = await fetch(`http://localhost:8000/api/geography/zoom/?type=commune&id=${geographicFilters.commune_id}`);
        const data = await response.json();
        
        if (data.success && data.location) {
          if (data.location.bounds) {
            const [minLng, minLat, maxLng, maxLat] = data.location.bounds;
            map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [20, 20] });
          } else if (data.location.center) {
            map.setView([data.location.center[1], data.location.center[0]], 12);
          }
          console.log(`🎯 Zoom commune: ${data.location.nom}`);
        }
      } else if (geographicFilters.prefecture_id) {
        const response = await fetch(`http://localhost:8000/api/geography/zoom/?type=prefecture&id=${geographicFilters.prefecture_id}`);
        const data = await response.json();
        
        if (data.success && data.location) {
          if (data.location.bounds) {
            const [minLng, minLat, maxLng, maxLat] = data.location.bounds;
            map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [20, 20] });
          } else if (data.location.center) {
            map.setView([data.location.center[1], data.location.center[0]], 10);
          }
          console.log(`🎯 Zoom préfecture: ${data.location.nom}`);
        }
      } else if (geographicFilters.region_id) {
        const response = await fetch(`http://localhost:8000/api/geography/zoom/?type=region&id=${geographicFilters.region_id}`);
        const data = await response.json();
        
        if (data.success && data.location) {
          if (data.location.bounds) {
            const [minLng, minLat, maxLng, maxLat] = data.location.bounds;
            map.fitBounds([[minLat, minLng], [maxLat, maxLng]], { padding: [20, 20] });
          } else if (data.location.center) {
            map.setView([data.location.center[1], data.location.center[0]], 8);
          }
          console.log(`🎯 Zoom région: ${data.location.nom}`);
        }
      } else {
        map.setView([9.9456, -11.3167], 7);
        console.log("🌍 Vue nationale");
      }
    } catch (error) {
      console.error("❌ Erreur zoom:", error);
    }
  };

  // MISE À JOUR AFFICHAGE - INSTANTANÉ
  const updateMapDisplay = () => {
    if (!localDataCache || !mapInstanceRef.current || !markerLayerRef.current || !lineLayerRef.current) {
      return;
    }

    const markerLayer = markerLayerRef.current;
    const lineLayer = lineLayerRef.current;

    // Nettoyage
    markerLayer.clearLayers();
    lineLayer.clearLayers();

    // Filtrage local instantané
    const filteredFeatures = filterDataLocally();
    
    if (filteredFeatures.length === 0) {
      updateStats(0);
      return;
    }

    let visibleCount = 0;

    filteredFeatures.forEach((feature) => {
      try {
        if (!feature.geometry || !feature.geometry.coordinates) return;
        
        const { type, coordinates } = feature.geometry;
        const properties = feature.properties || {};

        if (type === 'Point') {
          const [lng, lat] = coordinates;
          visibleCount++;

          const marker = L.marker([lat, lng], {
            icon: createCustomIcon(properties.type),
          }).bindPopup(`
            <div style="padding: 12px; min-width: 200px;">
              <h4 style="margin: 0 0 10px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">
                Infrastructure
              </h4>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${properties.type || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>ID:</strong> ${properties.fid || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>Commune ID:</strong> ${properties.commune_id || 'N/A'}</p>
            </div>
          `);
          
          markerLayer.addLayer(marker);
          
        } else if (type === 'LineString' || type === 'MultiLineString') {
          let lineCoords = [];
          
          if (type === 'LineString') {
            lineCoords = coordinates.map(coord => [coord[1], coord[0]]);
          } else if (type === 'MultiLineString' && coordinates[0]) {
            lineCoords = coordinates[0].map(coord => [coord[1], coord[0]]);
          }

          if (lineCoords.length > 0) {
            visibleCount++;

            const polyline = L.polyline(lineCoords, {
              color: iconConfig[properties.type]?.color || "#000",
              weight: properties.type === "pistes" ? 6 : 4,
              opacity: 0.8,
            }).bindPopup(`
              <div style="padding: 12px; min-width: 200px;">
                <h4 style="margin: 0 0 10px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">
                  Infrastructure linéaire
                </h4>
                <p style="margin: 5px 0;"><strong>Type:</strong> ${properties.type || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Commune ID:</strong> ${properties.commune_id || 'N/A'}</p>
              </div>
            `);
            
            lineLayer.addLayer(polyline);
          }
        }
      } catch (featureError) {
        console.error('Erreur feature:', featureError);
      }
    });

    updateStats(visibleCount);
  };

  const updateStats = (visibleCount) => {
    const activeFiltersEl = document.getElementById("activeFilters");
    if (activeFiltersEl) {
      const filters = getActiveFilters();
      activeFiltersEl.innerText = filters.types.length;
    }
    
    const totalVisibleEl = document.getElementById("totalVisible");
    if (totalVisibleEl) {
      totalVisibleEl.innerText = visibleCount;
    }
  };

  // Initialisation carte
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [9.9456, -11.3167],
      zoom: 7,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    const markerLayer = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50
    });
    const lineLayer = L.layerGroup();

    map.addLayer(markerLayer);
    map.addLayer(lineLayer);

    mapInstanceRef.current = map;
    markerLayerRef.current = markerLayer;
    lineLayerRef.current = lineLayer;

    setTimeout(() => {
      setIsMapReady(true);
      console.log('🗺️ Carte prête');
    }, 1000);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerLayerRef.current = null;
        lineLayerRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // Initialiser filtres
  useEffect(() => {
    const checkboxes = document.querySelectorAll('.filter-checkbox-group input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
  }, []);

  // Chargement initial unique
  useEffect(() => {
    if (isMapReady && !localDataCache) {
      loadAllDataOnce();
    }
  }, [isMapReady]);

  // ÉCOUTER FILTRES GÉOGRAPHIQUES
  useEffect(() => {
    const handleGeographicFilterChange = (event) => {
      const newFilters = event.detail;
      console.log("🎯 Filtres géographiques:", newFilters);
      
      if (JSON.stringify(newFilters) === JSON.stringify(geographicFilters)) {
        return;
      }
      
      setGeographicFilters(newFilters);
    };
    
    window.addEventListener('geographicFilterChanged', handleGeographicFilterChange);
    
    return () => {
      window.removeEventListener('geographicFilterChanged', handleGeographicFilterChange);
    };
  }, [geographicFilters]);

  // RÉAGIR AUX CHANGEMENTS DE FILTRES GÉOGRAPHIQUES
  useEffect(() => {
    if (isMapReady && localDataCache && hierarchyData) {
      updateMapDisplay(); // Filtrage local instantané
      zoomToSelectedArea(); // Zoom sur la zone
    }
  }, [geographicFilters, hierarchyData]);

  // RÉAGIR AUX CHANGEMENTS DE TYPES
  useEffect(() => {
    if (!isMapReady || !localDataCache) return;

    const allFilterInputs = document.querySelectorAll(".filter-checkbox-group input");
    
    const handleFilterChange = () => {
      setTimeout(() => {
        updateMapDisplay();
      }, 50);
    };

    allFilterInputs.forEach(input => {
      input.addEventListener("change", handleFilterChange);
    });

    return () => {
      allFilterInputs.forEach(input => {
        input.removeEventListener("change", handleFilterChange);
      });
    };
  }, [isMapReady, localDataCache, hierarchyData]);

  // MISE À JOUR INITIALE QUAND DONNÉES CHARGÉES
  useEffect(() => {
    if (localDataCache && isMapReady) {
      updateMapDisplay();
    }
  }, [localDataCache, isMapReady]);

  return (
    <div style={{ height: "100%", position: "relative" }}>
      {/* Header */}
      <div className="map-header">
        <div className="map-title">
          <i className="fas fa-map"></i>
          Carte des Infrastructures
        </div>
        <div className="map-stats">
          <div className="stat-item">
            <div className="stat-number" id="totalVisible">
              0
            </div>
            <div className="stat-label">Affichés</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" id="activeFilters">0</div>
            <div className="stat-label">Filtres actifs</div>
          </div>
        </div>
      </div>
      
      {/* Loading */}
      {isInitialLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.9)',
          padding: '20px',
          borderRadius: '10px',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          <div>🔄 Chargement unique des données...</div>
          <div style={{fontSize: '12px', marginTop: '10px', color: '#666'}}>
            {localDataCache ? 'Données en cache' : 'Premier chargement'}
          </div>
        </div>
      )}
      
      {/* Carte */}
      <div ref={mapRef} id="map" style={{ height: "calc(100% - 50px)" }}></div>
      
      {/* Légende */}
      {isMapReady && <MapLegend />}
    </div>
  );
};

export default MapContainer;