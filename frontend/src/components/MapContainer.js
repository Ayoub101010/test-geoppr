// MapContainer.js - Version finale avec cache global unique
import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from './AuthContext';
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { collectesAPI } from "./api";
import MapLegend from "./MapLegend";
import "./MapContainer.css";


// Variables globales pour empêcher les appels multiples
let GLOBAL_DATA_CACHE = null;
let GLOBAL_HIERARCHY_CACHE = null;
let GLOBAL_LOADING = false;

const MapContainer = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerLayersByTypeRef = useRef({}); 
  const lineLayerRef = useRef(null);
  const iconCacheRef = useRef(null);
  
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
  const [isExporting, setIsExporting] = useState(false);
  const { user } = useAuth();
   
  // Fonction pour vérifier si l'utilisateur peut exporter
  const canExport = () => {
    // Si pas d'utilisateur → Accès public → PAS d'export
    if (!user) {
      console.log('❌ Pas d\'utilisateur (accès public) - export refusé');
      return false;
    }
    
    // Si utilisateur authentifié → Vérifier le rôle
    const isAuthorized = user.role === 'super_admin' || user.role === 'admin';
    console.log(`${isAuthorized ? '✅' : '❌'} User: ${user.nom}, Role: ${user.role}, Export: ${isAuthorized}`);
    
    return isAuthorized;
  };
  // Générer les icônes en cache (une seule fois)
  const generateIconCache = async () => {
    if (iconCacheRef.current) return iconCacheRef.current;
    
    console.log('🎨 Génération du cache des icônes...');
    
    const iconDefinitions = {
      'Ponts': { icon: 'bridge', color: '#9B59B6' },
      'Buses': { icon: 'dot-circle', color: '#7F8C8D' },
      'Dalots': { icon: 'water', color: '#3498DB' },
      'Bacs': { icon: 'ship', color: '#F39C12' },
      'Passages submersibles': { icon: 'water', color: '#1ABC9C' },
      'Localités': { icon: 'home', color: '#E67E22' },
      'Écoles': { icon: 'graduation-cap', color: '#27AE60' },
      'Services de santé': { icon: 'hospital', color: '#E74C3C' },
      'Marchés': { icon: 'shopping-cart', color: '#F1C40F' },
      'Bât. administratifs': { icon: 'building', color: '#34495E' },
      'Infra. hydrauliques': { icon: 'tint', color: '#3498DB' },
      'Autres infrastructures': { icon: 'map-pin', color: '#95A5A6' }
    };
    
    const cache = {};
    
    for (const [label, { icon, color }] of Object.entries(iconDefinitions)) {
      const size = 32;
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
        position: absolute;
        left: -9999px;
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
      `;
      tempDiv.innerHTML = `<i class="fas fa-${icon}" style="color: white; font-size: 16px;"></i>`;
      
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, {
        backgroundColor: null,
        scale: 2,
        logging: false
      });
      
      document.body.removeChild(tempDiv);
      cache[label] = canvas;
    }
    
    iconCacheRef.current = cache;
    console.log('✅ Cache des icônes créé');
    return cache;
  };

  // Configuration des icônes
  const iconConfig = {
    services_santes: { icon: "hospital", color: "#E74C3C" },
    bacs: { icon: "ship", color: "#F39C12" },
    ponts: { icon: "bridge", color: "#9B59B6" },
    buses: { icon: "dot-circle", color: "#7F8C8D" },
    dalots: { icon: "water", color: "#3498DB" },
    ecoles: { icon: "graduation-cap", color: "#27AE60" },
    marches: { icon: "shopping-cart", color: "#F1C40F" },
    batiments_administratifs: { icon: "building", color: "#34495E" },
    infrastructures_hydrauliques: { icon: "tint", color: "#3498DB" },
    localites: { icon: "home", color: "#E67E22" },
    passages_submersibles: { icon: "water", color: "#1ABC9C" },
    autres_infrastructures: { icon: "map-pin", color: "#95A5A6" },
    pistes: { icon: "road", color: "#FF6B00" },
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
        collectesAPI.getAll(), //  CORRECT - Sans paramètre
        fetch('http://localhost:8000/api/geography/hierarchy/')
      ]);
      
      const hierarchyJson = await hierarchyResponse.json();
      
      if (dataResult.success && dataResult.data?.features) {
        GLOBAL_DATA_CACHE = dataResult.data;
        setLocalDataCache(GLOBAL_DATA_CACHE);
        console.log(` Cache global créé: ${dataResult.data.features.length} features`);
      } else {
        GLOBAL_DATA_CACHE = { features: [] };
        setLocalDataCache(GLOBAL_DATA_CACHE);
      }
      
      if (hierarchyJson.success) {
        GLOBAL_HIERARCHY_CACHE = hierarchyJson.hierarchy;
        setHierarchyData(GLOBAL_HIERARCHY_CACHE);
        console.log(` Cache hiérarchie créé: ${hierarchyJson.total_communes} communes`);
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
      
      const currentGeoFilters = geographicFilters;
      console.log("🎯 getTargetCommunes appelé avec:", currentGeoFilters);
      console.log("🔍 DEBUG - Valeurs exactes:", {
          commune_id: `"${currentGeoFilters.commune_id}"`,
          prefecture_id: `"${currentGeoFilters.prefecture_id}"`, 
          region_id: `"${currentGeoFilters.region_id}"`
      });
      
      // Vérifier commune d'abord
      const communeId = currentGeoFilters.commune_id;
      if (communeId && String(communeId).trim() !== '' && communeId !== 'null') {
          console.log("🏘️ Commune sélectionnée:", communeId);
          return [parseInt(communeId)];
      }
      
      // Puis préfecture
      const prefectureId = currentGeoFilters.prefecture_id;
      if (prefectureId && String(prefectureId).trim() !== '' && prefectureId !== 'null') {
          const prefecture = hierarchyData
              .flatMap(region => region.prefectures)
              .find(p => p.id === parseInt(prefectureId));
          
          const communeIds = prefecture ? prefecture.communes.map(c => c.id) : [];
          console.log("🏛️ Préfecture sélectionnée, communes:", communeIds);
          return communeIds;
      }
      
      // Enfin région
      const regionId = currentGeoFilters.region_id;
      if (regionId && String(regionId).trim() !== '' && regionId !== 'null') {
          const region = hierarchyData.find(r => r.id === parseInt(regionId));
          const communeIds = region ? region.prefectures.flatMap(p => p.communes.map(c => c.id)) : [];
          console.log("🌍 Région sélectionnée, communes:", communeIds);
          return communeIds;
      }
      
      console.log("🌐 Aucun filtre géographique - toutes les communes");
      return null;
  };

  // FILTRAGE LOCAL INSTANTANÉ
  const getActiveFilters = () => {
    const checkboxes = document.querySelectorAll(".filter-checkbox-group input[type='checkbox']");
    const checkedTypes = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.id);
    
    //  LOGIQUE CORRIGÉE pour gérer l'état initial "tous cochés"
    // Si aucun coché → n'afficher rien
    if (checkedTypes.length === 0) {
        return { types: [] };
    }
    
    // Retourner les types cochés
    return { types: checkedTypes };
  };

  const filterDataLocally = () => {
      if (!localDataCache?.features) return [];
      
      const activeFilters = getActiveFilters();
      const activeTypes = activeFilters.types;
      const targetCommunes = getTargetCommunes();
      
      console.log("🔍 Début filtrage:");
      console.log("   - Types actifs:", activeTypes);
      console.log("   - Communes cibles:", targetCommunes);
      console.log("   - Filtres géo courants:", geographicFilters);
      
      const filtered = localDataCache.features.filter(feature => {
          const properties = feature.properties || {};
          
          //  FILTRE PAR TYPE
          let typeMatch = true;
          if (activeTypes.length === 0) {
              typeMatch = false;
          } else {
              typeMatch = activeTypes.includes(properties.type);
          }
          
          //  FILTRE GÉOGRAPHIQUE - LOGIQUE STABLE
          let geoMatch = true;
          if (targetCommunes !== null && Array.isArray(targetCommunes) && targetCommunes.length > 0) {
              // Zone spécifique sélectionnée
              geoMatch = targetCommunes.includes(properties.commune_id);
          } else if (geographicFilters.region_id || geographicFilters.prefecture_id || geographicFilters.commune_id) {
              // Filtre géo actif mais aucune commune trouvée
              console.log("⚠️ Filtre géo actif mais communes vides");
              geoMatch = false;
          }
          // Sinon (aucun filtre géo) → afficher toutes les zones
          
          return typeMatch && geoMatch;
      });
      
      console.log(`🔍 Résultat filtrage: ${filtered.length}/${localDataCache.features.length} features`);
      console.log(`   Types actifs: ${activeTypes.length}/${document.querySelectorAll('.filter-checkbox-group input[type="checkbox"]').length}`);
      console.log(`   Communes ciblées: ${targetCommunes ? targetCommunes.length : 'toutes'}`);
      console.log(`   Filtres géo actifs:`, geographicFilters);
      
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
    if (!markerLayersByTypeRef.current || !lineLayerRef.current || !localDataCache) return;

    const markerLayersByType = markerLayersByTypeRef.current;
    const lineLayer = lineLayerRef.current;

    //  NOUVEAU : Nettoyer tous les clusters par type
    Object.values(markerLayersByType).forEach(layer => {
      layer.clearLayers();
    });
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
          
          //  NOUVEAU : Ajouter au cluster correspondant au type
          const markerType = properties.type || 'autres_infrastructures';
          const targetLayer = markerLayersByTypeRef.current[markerType];
          
          if (targetLayer) {
            targetLayer.addLayer(marker);
          } else {
            console.warn(`Pas de cluster pour le type: ${markerType}`);
          }
          
        } else if (type === 'LineString' || type === 'MultiLineString') {
          let lineCoords = [];
          
          if (type === 'LineString') {
            lineCoords = coordinates.map(coord => [coord[1], coord[0]]);
          } else if (type === 'MultiLineString' && coordinates[0]) {
            lineCoords = coordinates[0].map(coord => [coord[1], coord[0]]);
          }

          if (lineCoords.length > 0) {
            visibleCount++;

            //  Style différencié pour les pistes (pointillées)
            const isPiste = properties.type === "pistes";
            const isBacOrPassage = properties.type === 'bacs' || properties.type === 'passages_submersibles';
            
            const polyline = L.polyline(lineCoords, {
              color: iconConfig[properties.type]?.color || "#000",
              weight: isPiste ? 3 : 4,
              opacity: 0.8,
              dashArray: isPiste ? '10, 10' : null, //  Ligne pointillée pour pistes
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

    //  NOUVEAU : Ajouter icône au premier point pour bacs et passages
    if (isBacOrPassage) {
      const [firstLat, firstLng] = lineCoords[0];
      
      const iconMarker = L.marker([firstLat, firstLng], {
        icon: createCustomIcon(properties.type),
        zIndexOffset: 1000
      }).bindPopup(`
        <div style="padding: 12px; min-width: 200px;">
          <h4 style="margin: 0 0 10px 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;">
            ${properties.type === 'bacs' ? 'Bac' : 'Passage submersible'}
          </h4>
          <p style="margin: 5px 0;"><strong>Type:</strong> ${properties.type || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>ID:</strong> ${properties.fid || properties.id || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Commune ID:</strong> ${properties.commune_id || 'N/A'}</p>
        </div>
      `);
      
      //  NOUVEAU : Ajouter au cluster correspondant
      const targetLayer = markerLayersByTypeRef.current[properties.type];
      if (targetLayer) {
        targetLayer.addLayer(iconMarker);
      }
    }
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

  
  // Fonction d'export de la carte 
  // Fonction d'export PROFESSIONNELLE avec lignes et échelle dynamique
  const exportMap = async (format = 'png') => {
    setIsExporting(true);
    
    try {
      const mapElement = document.getElementById('map');
      const map = mapInstanceRef.current;
      
      // 1. Masquer les contrôles
      const controls = mapElement.querySelectorAll('.leaflet-control');
      controls.forEach(ctrl => ctrl.style.display = 'none');
      
      // 2. Capturer la carte
      const mapCanvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });
      
      // 3. Restaurer les contrôles
      controls.forEach(ctrl => ctrl.style.display = '');
      
      // ✅ NOUVEAU : Créer un canvas temporaire pour ajouter les lignes
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = mapCanvas.width;
      tempCanvas.height = mapCanvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Copier la carte capturée
      tempCtx.drawImage(mapCanvas, 0, 0);
      
      // ✅ DESSINER LES LIGNES MANUELLEMENT
      const lineLayer = lineLayerRef.current;
      if (lineLayer) {
        lineLayer.eachLayer((layer) => {
          if (layer instanceof L.Polyline) {
            const latlngs = layer.getLatLngs();
            
            // Gérer MultiLineString
            const paths = Array.isArray(latlngs[0]) ? latlngs : [latlngs];
            
            paths.forEach(path => {
              tempCtx.strokeStyle = layer.options.color || '#000';
              tempCtx.lineWidth = (layer.options.weight || 3) * 2; // *2 car scale=2
              tempCtx.globalAlpha = layer.options.opacity || 0.8;
              
              // Ligne pointillée si dashArray
              if (layer.options.dashArray) {
                const dash = layer.options.dashArray.split(',').map(n => parseInt(n.trim()) * 2);
                tempCtx.setLineDash(dash);
              } else {
                tempCtx.setLineDash([]);
              }
              
              tempCtx.beginPath();
              path.forEach((latlng, index) => {
                const point = map.latLngToContainerPoint(latlng);
                const x = point.x * 2; // *2 car scale=2
                const y = point.y * 2;
                
                if (index === 0) {
                  tempCtx.moveTo(x, y);
                } else {
                  tempCtx.lineTo(x, y);
                }
              });
              tempCtx.stroke();
              tempCtx.globalAlpha = 1;
              tempCtx.setLineDash([]);
            });
          }
        });
      }
      
      // Utiliser le canvas avec les lignes
      const finalMapCanvas = tempCanvas;
      
      // 4. Dimensions du canvas final
      const legendWidth = 400;
      const marginTop = 100;
      const marginBottom = 150;
      
      const finalWidth = finalMapCanvas.width + legendWidth + 60;
      const finalHeight = finalMapCanvas.height + marginTop + marginBottom;
      
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = finalWidth;
      finalCanvas.height = finalHeight;
      const ctx = finalCanvas.getContext('2d');
      
      // 5. Fond blanc
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalWidth, finalHeight);
      
      // 6. EN-TÊTE
      const titleHeight = 80;
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(0, 0, finalWidth, titleHeight);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CARTE DES INFRASTRUCTURES', finalWidth / 2, 38);
      
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText('République de Guinée', finalWidth / 2, 65);
      
      // 7. Position de la carte AVEC LES LIGNES
      const mapX = 30;
      const mapY = titleHeight + 20;
      ctx.drawImage(finalMapCanvas, mapX, mapY);
      
      // 8. Cadre carte
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 4;
      ctx.strokeRect(mapX, mapY, finalMapCanvas.width, finalMapCanvas.height);
      
      // 9. LÉGENDE PROFESSIONNELLE
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      const legendX = mapX + finalMapCanvas.width + 30;
      const legendY = mapY;
      const legWidth = 370;
      const legHeight = 650;

      // Fond
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(legendX, legendY, legWidth, legHeight);
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 3;
      ctx.strokeRect(legendX, legendY, legWidth, legHeight);

      // Titre légende
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(legendX, legendY, legWidth, 55);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LÉGENDE', legendX + legWidth / 2, legendY + 38);

      const legendItems = [
        { label: 'Pistes', color: '#FF6B00', type: 'dashed' },
        { label: 'Ponts', color: '#9B59B6', type: 'circle' },
        { label: 'Buses', color: '#7F8C8D', type: 'circle' },
        { label: 'Dalots', color: '#3498DB', type: 'circle' },
        { label: 'Bacs', color: '#F39C12', type: 'circle' },
        { label: 'Passages submersibles', color: '#1ABC9C', type: 'circle' },
        { label: 'Localités', color: '#E67E22', type: 'circle' },
        { label: 'Écoles', color: '#27AE60', type: 'circle' },
        { label: 'Services de santé', color: '#E74C3C', type: 'circle' },
        { label: 'Marchés', color: '#F1C40F', type: 'circle' },
        { label: 'Bât. administratifs', color: '#34495E', type: 'circle' },
        { label: 'Infra. hydrauliques', color: '#3498DB', type: 'circle' },
        { label: 'Autres infrastructures', color: '#95A5A6', type: 'circle' }
      ];

      let iconCanvasMap = iconCacheRef.current;
      if (!iconCanvasMap) {
        await generateIconCache();
        iconCanvasMap = iconCacheRef.current;
      }

      let yPos = legendY + 85;
      const lineHeight = 45;

      ctx.textAlign = 'left';
      ctx.font = '18px Arial, sans-serif';

      legendItems.forEach(item => {
        const centerX = legendX + 45;
        const centerY = yPos - 5;
        
        if (item.type === 'dashed') {
          ctx.strokeStyle = item.color;
          ctx.lineWidth = 6;
          ctx.setLineDash([12, 6]);
          ctx.beginPath();
          ctx.moveTo(legendX + 20, yPos - 3);
          ctx.lineTo(legendX + 70, yPos - 3);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          const iconCanvas = iconCanvasMap[item.label];
          if (iconCanvas) {
            ctx.drawImage(iconCanvas, centerX - 16, centerY - 16, 32, 32);
          }
        }
        
        ctx.fillStyle = '#2c3e50';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, legendX + 90, yPos - 5);
        yPos += lineHeight;
      });
      
      // 10. FLÈCHE DU NORD
      const northX = mapX + finalMapCanvas.width - 90;
      const northY = mapY + 60;
      const northRadius = 45;
      
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.arc(northX, northY, northRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = '#2980b9';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(northX, northY - 30);
      ctx.lineTo(northX - 12, northY + 8);
      ctx.lineTo(northX + 12, northY + 8);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#2c3e50';
      ctx.font = 'bold 26px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', northX, northY + 32);
      
      // 11. ✅ ÉCHELLE DYNAMIQUE
      const scaleX = mapX + 50;
      const scaleY = mapY + finalMapCanvas.height - 90;
      const scaleWidth = 280;
      const scaleHeight = 16;
      const boxPadding = 25;

      // CALCUL DE L'ÉCHELLE RÉELLE
      const zoom = map.getZoom();
      const center = map.getCenter();
      const bounds = map.getBounds();
      const mapWidthInMeters = center.distanceTo(L.latLng(center.lat, bounds.getEast()));
      const metersPerPixel = (mapWidthInMeters * 2) / finalMapCanvas.width;
      const scaleMeters = (scaleWidth / 2) * metersPerPixel; // Échelle à mi-largeur

      // Arrondir à des valeurs cartographiques
      let displayDistance;
      let unit = 'km';

      if (scaleMeters < 1000) {
        unit = 'm';
        const possibleValues = [1, 2, 5, 10, 20, 50, 100, 200, 500];
        displayDistance = possibleValues.find(v => v >= scaleMeters) || 500;
      } else {
        const scaleKm = scaleMeters / 1000;
        const possibleValues = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
        displayDistance = possibleValues.find(v => v >= scaleKm) || 1000;
      }

      // Fond
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(scaleX - boxPadding, scaleY - 50, scaleWidth + boxPadding * 2, 90);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Bordure
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 2;
      ctx.strokeRect(scaleX - boxPadding, scaleY - 50, scaleWidth + boxPadding * 2, 90);

      // Titre
      ctx.fillStyle = '#2c3e50';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('ÉCHELLE', scaleX + scaleWidth / 2, scaleY - 28);

      // Barre
      const segments = 5;
      const segmentWidth = scaleWidth / segments;

      for (let i = 0; i < segments; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#2c3e50' : '#ffffff';
        ctx.fillRect(scaleX + i * segmentWidth, scaleY, segmentWidth, scaleHeight);
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.strokeRect(scaleX + i * segmentWidth, scaleY, segmentWidth, scaleHeight);
      }

      // ✅ Valeurs DYNAMIQUES
      ctx.fillStyle = '#2c3e50';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const distances = [0, 1, 2, 3, 4, 5].map(i => Math.round(displayDistance * i / 5));
      distances.forEach((distance, index) => {
        const x = scaleX + segmentWidth * index;
        ctx.fillText(`${distance}`, x, scaleY + scaleHeight + 5);
      });

      // Unité dynamique
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(unit === 'm' ? 'mètres' : 'kilomètres', scaleX + scaleWidth / 2, scaleY + scaleHeight + 28);
      
      // 12. INFORMATIONS CARTOGRAPHIQUES
      const infoY = mapY + finalMapCanvas.height + 50;
      const infoHeight = 100;

      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = '#ecf0f1';
      ctx.fillRect(0, infoY - 20, finalWidth, infoHeight);

      ctx.strokeStyle = '#2980b9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, infoY - 20);
      ctx.lineTo(finalWidth, infoY - 20);
      ctx.stroke();

      ctx.fillStyle = '#2c3e50';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('INFORMATIONS CARTOGRAPHIQUES', 40, infoY + 5);

      ctx.font = '17px Arial, sans-serif';
      ctx.fillStyle = '#2c3e50';
      ctx.textAlign = 'left';

      ctx.fillText(`Pays: République de Guinée`, 40, infoY + 35);
      ctx.fillText(`Système: WGS 84 / EPSG:4326`, 40, infoY + 60);

      ctx.textAlign = 'right';
      ctx.fillText(`Date: ${new Date().toLocaleDateString('fr-FR')}`, finalWidth - 40, infoY + 35);
      ctx.fillText(`Heure: ${new Date().toLocaleTimeString('fr-FR')}`, finalWidth - 40, infoY + 60);
      
      // 13. EXPORT
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `carte_guinee_${new Date().toISOString().split('T')[0]}.png`;
        link.href = finalCanvas.toDataURL('image/png', 1.0);
        link.click();
        
      } else if (format === 'pdf') {
        const imgData = finalCanvas.toDataURL('image/png', 1.0);
        
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [finalCanvas.width * 0.75, finalCanvas.height * 0.75]
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`carte_guinee_${new Date().toISOString().split('T')[0]}.pdf`);
      }
      
      console.log('✅ Export réussi avec lignes et échelle dynamique');
      
    } catch (error) {
      console.error('❌ Erreur export:', error);
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };
  

  // Initialisation carte
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [9.9456, -11.3167],
      zoom: 7,
      zoomControl: false,
      preferCanvas: true,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

     L.control.scale({
      position: 'bottomright',
      metric: true,
      imperial: false,
      maxWidth: 200

    }).addTo(map);
    // ✅ FONDS DE CARTE - 3 options seulement
const baseLayers = {
  "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
    crossOrigin: true
  }),
  
  "Satellite": L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
    attribution: "© Google",
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"]
  }),
  
  "Satellite + Labels": L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
    attribution: "© Google",
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"]
  })
};

// ✅ COUCHE PAR DÉFAUT (OpenStreetMap)
baseLayers["OpenStreetMap"].addTo(map);

// ✅ SÉLECTEUR DE COUCHES
L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

    //  NOUVEAU : Créer un cluster pour chaque type d'infrastructure
    const allTypes = [
      'services_santes', 'bacs', 'ponts', 'buses', 'dalots', 'ecoles',
      'marches', 'batiments_administratifs', 'infrastructures_hydrauliques',
      'localites', 'passages_submersibles', 'autres_infrastructures'
    ];

    const markerLayersByType = {};
    
    allTypes.forEach(type => {
      const config = iconConfig[type] || iconConfig.autres_infrastructures;
      
      markerLayersByType[type] = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        
        //  Icône personnalisée par type
        iconCreateFunction: function(cluster) {
          const count = cluster.getChildCount();
          
          return L.divIcon({
            html: `
              <div style="
                background-color: ${config.color};
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                font-weight: bold;
                color: white;
              ">
                <i class="fas fa-${config.icon}" style="font-size: 14px; margin-bottom: 2px;"></i>
                <span style="font-size: 11px;">${count}</span>
              </div>
            `,
            className: `custom-cluster-icon cluster-${type}`,
            iconSize: L.point(40, 40)
          });
        }
      });
      
      map.addLayer(markerLayersByType[type]);
    });

    const lineLayer = L.layerGroup();
    map.addLayer(lineLayer);

    mapInstanceRef.current = map;
    markerLayersByTypeRef.current = markerLayersByType;
    lineLayerRef.current = lineLayer;

    setTimeout(() => {
      setIsMapReady(true);
      console.log('🗺️ Carte prête avec clusters par type');
    }, 1000);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerLayersByTypeRef.current = {};
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

  // RÉAGIR AUX CHANGEMENTS DE TYPES - VERSION PROTÉGÉE
  useEffect(() => {
      if (!isMapReady || !localDataCache) return;

      const allFilterInputs = document.querySelectorAll(".filter-checkbox-group input");
      
      const handleFilterChange = (event) => {
        console.log(`🔄 Changement type: ${event.target.id} → ${event.target.checked}`);
        console.log(`🔒 Filtres géo avant: ${JSON.stringify(geographicFilters)}`);
        
        //  NE PAS TOUCHER AUX FILTRES GÉOGRAPHIQUES !
        setTimeout(() => {
          updateMapDisplay(); // Seulement re-dessiner la carte
        }, 50);
        
        console.log(`🔒 Filtres géo après: ${JSON.stringify(geographicFilters)}`);
      };

      allFilterInputs.forEach(input => {
        input.addEventListener("change", handleFilterChange);
      });

      return () => {
        allFilterInputs.forEach(input => {
          input.removeEventListener("change", handleFilterChange);
        });
      };
  }, [isMapReady, localDataCache, hierarchyData, geographicFilters]); //  Ajouter geographicFilters comme dépendance

    // MISE À JOUR INITIALE QUAND DONNÉES CHARGÉES
    useEffect(() => {
    if (localDataCache && isMapReady) {
      updateMapDisplay();
    }
  }, [localDataCache, isMapReady]);

  // Pré-générer les icônes quand la carte est prête
  useEffect(() => {
    if (isMapReady && !iconCacheRef.current) {
      generateIconCache();
    }
  }, [isMapReady]);

  // Composant pour les éléments cartographiques (nord, échelle, etc.)
  const CartographicElements = () => (
    <div className="cartographic-elements">
      {/* Flèche du Nord */}
      <div className="north-arrow">
        <div className="north-arrow-icon">
          <i className="fas fa-arrow-up"></i>
        </div>
        <div className="north-label">N</div>
      </div>
      
      {/* Coordonnées et informations */}
      <div className="map-info-box">
        <div className="info-row">
          <i className="fas fa-map-marker-alt"></i>
          <span>Guinée</span>
        </div>
        <div className="info-row">
          <i className="fas fa-globe"></i>
          <span>WGS 84 / EPSG:4326</span>
        </div>
        <div className="info-row">
          <i className="fas fa-calendar"></i>
          <span>{new Date().toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
    </div>
  );

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
          

          
          {/* Boutons d'export - VISIBLE UNIQUEMENT pour super_admin et admin */}
          {canExport() && (
            <div className="export-button-container">
              <button 
                className="export-button"
                onClick={() => exportMap('png')}
                disabled={isExporting}
                title="Exporter la carte en PNG"
              >
                {isExporting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Export...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-download"></i>
                    <span>PNG</span>
                  </>
                )}
              </button>
              
              <button 
                className="export-button export-button-pdf"
                onClick={() => exportMap('pdf')}
                disabled={isExporting}
                title="Exporter la carte en PDF"
              >
                {isExporting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Export...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-pdf"></i>
                    <span>PDF</span>
                  </>
                )}
              </button>
            </div>
          )}
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

      {/*  Éléments cartographiques */}
        {isMapReady && <CartographicElements />}
     
    </div>
  );
};

export default MapContainer;