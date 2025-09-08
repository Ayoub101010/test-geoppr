import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { collectesAPI } from "./api";
import MapLegend from "./MapLegend"; 

const MapContainer = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerLayerRef = useRef(null);
  const lineLayerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [selectedCommuneId, setSelectedCommuneId] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Configuration des icones
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

  // Initialiser les filtres
  useEffect(() => {
    const initializeFilters = () => {
      const checkboxes = document.querySelectorAll('.filter-checkbox-group input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = true;
      });
    };
    initializeFilters();
  }, []);

  // Initialisation de la carte
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // CrÃ©er la carte
    const map = L.map(mapRef.current, {
      center: [9.9456, -11.3167],
      zoom: 7,
      zoomControl: false,
    });

    // Ajouter le controle de zoom en haut Ã  droite
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Ajouter le tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "Â© OpenStreetMap contributors",
    }).addTo(map);

    // CrÃ©er les layers
    const markerLayer = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50
    });
    const lineLayer = L.layerGroup();

    map.addLayer(markerLayer);
    map.addLayer(lineLayer);

    // Sauvegarder les rÃ©fÃ©rences
    mapInstanceRef.current = map;
    markerLayerRef.current = markerLayer;
    lineLayerRef.current = lineLayer;

    // Marquer la carte comme prte apres un delai
    const readyTimeout = setTimeout(() => {
      setIsMapReady(true);
      console.log('Carte prÃªte');
    }, 1000);

    // Nettoyage
    return () => {
      clearTimeout(readyTimeout);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerLayerRef.current = null;
        lineLayerRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  const getActiveFilters = () => {
    const checkedTypes = Array.from(
      document.querySelectorAll(
        ".filter-checkbox-group input[type='checkbox']:checked"
      )
    ).map((cb) => cb.id);

    return {
      types: checkedTypes,
      commune_id: selectedCommuneId,
    };
  };

  const fetchAPIData = async () => {
    if (loading) return null;
    
    setLoading(true);
    
    try {
      const filters = getActiveFilters();
      const map = mapInstanceRef.current;
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      
      // le bounding box string
      const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      
      const result = await collectesAPI.getWithFilters({
        commune_id: filters.commune_id,
        types: filters.types,
        zoom: zoom,
        bbox: bbox
      });
      
      if (result.success) {
        return result.data;
      } else {
        console.error('Erreur API:', result.error);
        return { type: 'FeatureCollection', features: [], total: 0 };
      }
    } catch (err) {
      console.error('Erreur fetch:', err);
      return { type: 'FeatureCollection', features: [], total: 0 };
    } finally {
      setLoading(false);
    }
  };

  const updateMapDisplay = async () => {
    // Véification stricte que tout est pret
    if (!isMapReady || !mapInstanceRef.current || !markerLayerRef.current || !lineLayerRef.current) {
      console.log('Carte pas encore prÃªte pour updateMapDisplay');
      return;
    }

    const map = mapInstanceRef.current;
    const markerLayer = markerLayerRef.current;
    const lineLayer = lineLayerRef.current;

    // Véifier que getBounds fonctionne
    let bounds;
    try {
      bounds = map.getBounds();
      if (!bounds || !bounds.isValid()) {
        console.log('Bounds invalides');
        return;
      }
    } catch (error) {
      console.log('Erreur getBounds:', error);
      return;
    }

    // Nettoyer les layers
    markerLayer.clearLayers();
    lineLayer.clearLayers();

    const apiData = await fetchAPIData();
    
    if (!apiData || !apiData.features || apiData.features.length === 0) {
      updateStats(0);
      return;
    }

    let visibleCount = 0;

    // Traitement des features
    apiData.features.forEach((feature) => {
      try {
        if (!feature.geometry || !feature.geometry.coordinates) return;
        
        const { type, coordinates } = feature.geometry;
        const properties = feature.properties || {};

        if (type === 'Point') {
          const [lng, lat] = coordinates;
          
          if (!bounds.contains([lat, lng])) return;
          
          visibleCount++;

          const marker = L.marker([lat, lng], {
            icon: createCustomIcon(properties.type),
          }).bindPopup(`
            <div style="padding: 12px; min-width: 200px;">
              <h4 style="margin: 0 0 10px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">
                ${properties.nom || 'Infrastructure'}
              </h4>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${properties.type || 'N/A'}</p>
              <p style="margin: 5px 0;"><strong>ID:</strong> ${properties.fid || 'N/A'}</p>
              ${properties.code_piste ? `<p style="margin: 5px 0;"><strong>Code Piste:</strong> ${properties.code_piste}</p>` : ''}
              ${properties.date_creat ? `<p style="margin: 5px 0;"><strong>Date crÃ©ation:</strong> ${properties.date_creat}</p>` : ''}
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
            try {
              const lineBounds = L.polyline(lineCoords).getBounds();
              if (!bounds.intersects(lineBounds)) return;

              visibleCount++;

              const polyline = L.polyline(lineCoords, {
                color: iconConfig[properties.type]?.color || "#000",
                weight: properties.type === "pistes" ? 6 : 4,
                opacity: 0.8,
              }).bindPopup(`
                <div style="padding: 12px; min-width: 200px;">
                  <h4 style="margin: 0 0 10px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">
                    ${properties.nom || 'Infrastructure linÃ©aire'}
                  </h4>
                  <p style="margin: 5px 0;"><strong>Type:</strong> ${properties.type || 'N/A'}</p>
                  ${properties.code_piste ? `<p style="margin: 5px 0;"><strong>Code:</strong> ${properties.code_piste}</p>` : ''}
                </div>
              `);
              
              lineLayer.addLayer(polyline);
            } catch (lineError) {
              console.error('Erreur crÃ©ation ligne:', lineError);
            }
          }
        }
      } catch (featureError) {
        console.error('Erreur traitement feature:', featureError);
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
  };

  
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Ã‰vÃ©nements de la carte
    const handleMoveEnd = () => {
      setTimeout(updateMapDisplay, 200);
    };

    map.on("moveend", handleMoveEnd);

    // Premier chargement
    setTimeout(updateMapDisplay, 500);

    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [isMapReady, selectedCommuneId]);

  //  filtres
  useEffect(() => {
    if (!isMapReady) return;

    const allFilterInputs = document.querySelectorAll(
      ".filter-select, .filter-checkbox-group input"
    );
    
    const handleFilterChange = (event) => {
      if (event.target.id === "communeFilter") {
        setSelectedCommuneId(event.target.value || null);
      }
      setTimeout(updateMapDisplay, 300);
    };

    allFilterInputs.forEach((el) => {
      el.addEventListener("change", handleFilterChange);
    });

    return () => {
      allFilterInputs.forEach((el) => {
        el.removeEventListener("change", handleFilterChange);
      });
    };
  }, [isMapReady]);

  return (
    <div className="map-container" style={{ height: "100%", position: "relative" }}>
      {/* Rduire la hauteur du header */}
      <div className="map-header" style={{ height: "50px" }}>
        <div className="map-title">
          <i className="fas fa-globe-africa"></i> Carte interactive - République de Guinée
        </div>
        <div className="map-actions">
          {/* Garder seulement les filtres actifs */}
          <div className="map-stats">
            <div className="stat-item">
              <div className="stat-number" id="activeFilters">
                0
              </div>
              <div className="stat-label">Types actifs</div>
            </div>
          </div>
          <div className="export-dropdown">
            <button className="export-btn" id="exportBtn">
              <i className="fas fa-download"></i> Exporter{" "}
              <i className="fas fa-chevron-down"></i>
            </button>
            <div className="export-dropdown-content">
              <div
                className="export-option"
                onClick={async () => {
                  const result = await collectesAPI.getAll();
                  if (result.success) {
                    const dataStr = JSON.stringify(result.data, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'collectes_export.json';
                    link.click();
                  }
                }}
              >
                <i className="fas fa-file-code"></i> Exporter JSON
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {!isMapReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.9)',
          padding: '20px',
          borderRadius: '10px',
          zIndex: 1000
        }}>
          Initialisation de la carte...
        </div>
      )}
      
      {/*  Carte avec plus d'espace */}
      <div ref={mapRef} id="map" style={{ height: "calc(100% - 50px)" }}></div>
      
      {/* LÃ©gende repositionnÃ©e */}
      {isMapReady && <MapLegend />}
    </div>
  );
  const fetchAllData = async () => {
  setLoading(true);
  
  try {
    const result = await collectesAPI.getAll(); // Utilise la nouvelle fonction
    console.log('TOUTES les données récupérées:', result.data?.features?.length);
    return result.data;
  } catch (err) {
    console.error('Erreur:', err);
    return { features: [] };
  } finally {
    setLoading(false);
  }
};
};

export default MapContainer;