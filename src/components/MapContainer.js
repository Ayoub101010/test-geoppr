import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const MapContainer = () => {
  useEffect(() => {
    let map;
    let markerLayer = L.markerClusterGroup();
    let lineLayer = L.layerGroup();
    let currentMarkers = [];

    const sampleData = [
      // 🔵 Points - infrastructures associées à des pistes
      {
        id: 1,
        name: "Pont Kankan",
        type: "ponts",
        pisteId: "piste1",
        region: "kankan",
        prefecture: "kankan",
        commune: "kankan1",
        date: "2024-05-01",
        lat: 10.3851,
        lng: -9.3056,
      },
      {
        id: 2,
        name: "École Labé",
        type: "ecoles",
        pisteId: "piste2",
        region: "labe",
        prefecture: "labe",
        commune: "labe1",
        date: "2024-06-15",
        lat: 11.3183,
        lng: -12.2833,
      },
      {
        id: 3,
        name: "Marché Conakry",
        type: "marches",
        pisteId: "piste3",
        region: "conakry",
        prefecture: "conakry",
        commune: "matoto",
        date: "2024-06-10",
        lat: 9.548,
        lng: -13.678,
      },
      {
        id: 4,
        name: "Service de santé Nzérékoré",
        type: "sante",
        pisteId: "piste4",
        region: "nzerekore",
        prefecture: "nzerekore",
        commune: "nzerekore1",
        date: "2024-07-11",
        lat: 7.7564,
        lng: -8.825,
      },
      {
        id: 5,
        name: "Dalot Mamou",
        type: "dalots",
        pisteId: "piste1",
        region: "mamou",
        prefecture: "mamou",
        commune: "mamou1",
        date: "2024-07-01",
        lat: 10.3773,
        lng: -12.0911,
      },
      {
        id: 6,
        name: "Hydraulique Kindia",
        type: "hydrauliques",
        pisteId: "piste5",
        region: "kindia",
        prefecture: "kindia",
        commune: "kindia1",
        date: "2024-07-10",
        lat: 10.0632,
        lng: -12.8674,
      },
      {
        id: 8,
        name: "Bâtiment Administratif Boké",
        type: "administratifs",
        pisteId: "piste5",
        region: "boke",
        prefecture: "boke",
        commune: "boke1",
        date: "2024-06-20",
        lat: 10.932,
        lng: -14.291,
      },
      {
        id: 10,
        name: "Buse Conakry",
        type: "buses",
        pisteId: "piste3",
        region: "conakry",
        prefecture: "conakry",
        commune: "ratoma",
        date: "2024-06-25",
        lat: 9.6,
        lng: -13.65,
      },
      {
        id: 11,
        name: "École Kankan",
        type: "ecoles",
        pisteId: "piste1",
        region: "kankan",
        prefecture: "kankan",
        commune: "kankan2",
        date: "2024-06-12",
        lat: 10.39,
        lng: -9.3,
      },
      {
        id: 12,
        name: "Localité Kindia",
        type: "localites",
        pisteId: "piste5",
        region: "kindia",
        prefecture: "kindia",
        commune: "kindia2",
        date: "2024-06-26",
        lat: 10.07,
        lng: -12.86,
      },
      {
        id: 13,
        name: "Autre infra Faranah",
        type: "autres",
        pisteId: "piste4",
        region: "faranah",
        prefecture: "faranah",
        commune: "faranah1",
        date: "2024-06-18",
        lat: 10.04,
        lng: -10.75,
      },

      // 🔷 Lignes (pistes, chaussées, passages, bacs) – coordonnées proches ou sur pistes associées

      {
        id: "piste1",
        type: "pistes",
        coordinates: [
          [10.4, -9.31],
          [10.398, -9.308],
          [10.395, -9.305],
          [10.392, -9.302],
          [10.389, -9.299],
          [10.385, -9.295],
          [10.38, -9.29],
        ],
        region: "kankan",
      },
      {
        id: "piste2",
        type: "pistes",
        coordinates: [
          [11.32, -12.29],
          [11.318, -12.288],
          [11.315, -12.285],
          [11.312, -12.282],
          [11.31, -12.279],
          [11.307, -12.276],
          [11.3, -12.27],
        ],
        region: "labe",
      },
      {
        id: "piste3",
        type: "pistes",
        coordinates: [
          [9.536, -13.69], // Vers Université Gamal Abdel Nasser
          [9.538, -13.687],
          [9.54, -13.685],
          [9.542, -13.683],
          [9.544, -13.681],
          [9.546, -13.679],
          [9.548, -13.677],
          [9.55, -13.675], // Vers Carrefour chinois
        ],
        region: "conakry",
        prefecture: "conakry",
        commune: "dixinn",
      },

      {
        id: "piste4",
        type: "pistes",
        coordinates: [
          [10.04, -10.75],
          [10.042, -10.748],
          [10.045, -10.745],
          [10.048, -10.742],
          [10.052, -10.738],
          [10.055, -10.735],
          [10.06, -10.73],
        ],
        region: "faranah",
      },
      {
        id: "piste5",
        type: "pistes",
        coordinates: [
          [10.06, -12.87],
          [10.063, -12.868],
          [10.066, -12.865],
          [10.069, -12.863],
          [10.072, -12.86],
          [10.075, -12.857],
          [10.08, -12.85],
        ],
        region: "kindia",
      },

      // Chaussée proche piste5 (plus de points et coordonnées cohérentes)
      {
        id: "chaussee1",
        type: "chaussees",
        coordinates: [
          [10.065, -12.865],
          [10.067, -12.863],
          [10.069, -12.861],
          [10.07, -12.86],
        ],
        region: "kindia",
      },
      {
        id: "chaussee2",
        type: "chaussees",
        pisteId: "piste5",
        coordinates: [
          [10.073, -12.858],
          [10.075, -12.855],
          [10.077, -12.852],
          [10.08, -12.85],
        ],
        region: "kindia",
      },

      // Passage proche piste2 (plus de points)
      {
        id: "passage1",
        type: "passages",
        coordinates: [
          [11.3115, -12.285],
          [11.3118, -12.2845],
          [11.312, -12.2835],
        ],
        region: "labe",
      },
      {
        id: "passage2",
        type: "passages",
        pisteId: "piste4",
        coordinates: [
          [10.05, -10.737],
          [10.051, -10.736],
          [10.052, -10.735],
        ],
        region: "faranah",
      },
      {
        id: "passage3",
        type: "passages",
        pisteId: "piste1",
        coordinates: [
          [10.393, -9.303],
          [10.392, -9.302],
          [10.391, -9.301],
        ],
        region: "kankan",
      },

      // Bac proche piste5 (coordonnées proches et plus de points)
      {
        id: "bac1",
        type: "bacs",
        pisteId: "piste5", // Liaison à la piste5
        coordinates: [
          [10.07, -12.865],
          [10.072, -12.863],
          [10.074, -12.861],
        ],
        region: "kindia",
        prefecture: "kindia",
        commune: "kindia1",
        date: "2024-06-30",
        name: "Bac Kindia",
      },
      {
        id: "bac2",
        type: "bacs",
        pisteId: "piste2",
        coordinates: [
          [11.308, -12.274],
          [11.309, -12.272],
          [11.31, -12.27],
        ],
        region: "labe",
        prefecture: "labe",
        commune: "labe1",
        date: "2024-07-15",
        name: "Bac Labé",
      },
      {
        id: "bac3",
        type: "bacs",
        pisteId: "piste3",
        coordinates: [
          [9.566, -13.663],
          [9.568, -13.66],
          [9.57, -13.657],
        ],
        region: "conakry",
        prefecture: "conakry",
        commune: "matoto",
        date: "2024-07-20",
        name: "Bac Conakry",
      },
    ];

    const iconConfig = {
      chaussees: { icon: "road", color: "#2C3E50" },
      buses: { icon: "bus", color: "#E74C3C" },
      dalots: { icon: "water", color: "#3498DB" },
      ponts: { icon: "bridge", color: "#9B59B6" },
      passages: { icon: "water", color: "#1ABC9C" },
      bacs: { icon: "ship", color: "#F39C12" },
      localites: { icon: "home", color: "#E67E22" },
      ecoles: { icon: "graduation-cap", color: "#27AE60" },
      marches: { icon: "shopping-cart", color: "#F1C40F" },
      administratifs: { icon: "building", color: "#34495E" },
      hydrauliques: { icon: "tint", color: "#3498DB" },
      sante: { icon: "hospital", color: "#E74C3C" },
      autres: { icon: "map-pin", color: "#95A5A6" },
    };

    const createCustomIcon = (type) => {
      const config = iconConfig[type] || iconConfig.autres;
      return L.divIcon({
        html: `<div style="background-color: ${config.color}; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                <i class="fas fa-${config.icon}" style="color: white; font-size: 10px;"></i>
              </div>`,
        className: "custom-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
    };

    const getActiveFilters = () => {
      const region = document.getElementById("regionFilter")?.value || "";
      const prefecture =
        document.getElementById("prefectureFilter")?.value || "";
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

    const updateMapMarkers = () => {
      if (!map || !map._loaded || !map.getContainer().offsetParent) return;

      markerLayer.clearLayers();
      lineLayer.clearLayers();
      currentMarkers = [];

      const bounds = map.getBounds();
      const filters = getActiveFilters();

      // Filtrer les lignes (pistes, chaussées, passages, bacs)
      const filteredLines = sampleData.filter((item) => {
        if (!item.coordinates) return false; // pas une ligne
        const polylineBounds = L.polyline(item.coordinates).getBounds();
        if (!bounds.intersects(polylineBounds)) return false;
        if (filters.region && item.region !== filters.region) return false;
        if (filters.prefecture && item.prefecture !== filters.prefecture)
          return false;
        if (filters.commune && item.commune !== filters.commune) return false;
        if (!filters.types.has(item.type)) return false;
        return true;
      });

      filteredLines.forEach((item) => {
        const polyline = L.polyline(item.coordinates, {
          color: iconConfig[item.type]?.color || "#000",
          weight: item.type === "pistes" ? 6 : 4,
          opacity: 0.8,
          dashArray: item.type === "passages" ? "5, 10" : null,
        }).bindPopup(`
          <div style="padding: 8px;">
            <h4 style="margin:0 0 8px 0;color:#36022e;">${
              item.name || item.type
            }</h4>
            <p><strong>Type:</strong> ${item.type}</p>
            <p><strong>Région:</strong> ${item.region || "N/A"}</p>
            <p><strong>Date:</strong> ${item.date || "N/A"}</p>
          </div>
        `);
        lineLayer.addLayer(polyline);
      });

      if (!map.hasLayer(lineLayer)) {
        map.addLayer(lineLayer);
      }

      // Filtrer points
      const filteredPoints = sampleData.filter((item) => {
        if (item.coordinates) return false; // ligne exclue
        if (!bounds.contains([item.lat, item.lng])) return false;
        if (filters.region && item.region !== filters.region) return false;
        if (filters.prefecture && item.prefecture !== filters.prefecture)
          return false;
        if (filters.commune && item.commune !== filters.commune) return false;
        if (!filters.types.has(item.type)) return false;

        return true;
      });

      filteredPoints.forEach((item) => {
        const marker = L.marker([item.lat, item.lng], {
          icon: createCustomIcon(item.type),
        }).bindPopup(`
          <div style="padding: 8px;">
            <h4 style="margin:0 0 8px 0;color:#36022e;">${item.name}</h4>
            <p><strong>Type:</strong> ${item.type}</p>
            <p><strong>Région:</strong> ${item.region}</p>
            <p><strong>Préfecture:</strong> ${item.prefecture}</p>
            <p><strong>Date:</strong> ${item.date}</p>
          </div>
        `);
        markerLayer.addLayer(marker);
        currentMarkers.push(marker);
      });

      if (!map.hasLayer(markerLayer)) {
        map.addLayer(markerLayer);
      }

      const totalPointsEl = document.getElementById("totalPoints");
      if (totalPointsEl) totalPointsEl.innerText = filteredPoints.length;

      const activeFiltersEl = document.getElementById("activeFilters");
      if (activeFiltersEl) activeFiltersEl.innerText = filters.types.size;
    };

    map = L.map("map", {
      center: [9.9456, -11.3167],
      zoom: 7,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    map.whenReady(() => updateMapMarkers());
    map.on("moveend", updateMapMarkers);

    const allFilterInputs = document.querySelectorAll(
      ".filter-select, .filter-checkbox-group input"
    );
    allFilterInputs.forEach((el) =>
      el.addEventListener("change", updateMapMarkers)
    );

    return () => {
      allFilterInputs.forEach((el) =>
        el.removeEventListener("change", updateMapMarkers)
      );
      map.remove();
    };
  }, []);

  return (
    <div className="map-container" style={{ height: "100vh" }}>
      <div className="map-header">
        <div className="map-title">
          <i className="fas fa-globe-africa"></i> Carte interactive - République
          de Guinée
        </div>
        <div className="map-actions">
          <div className="map-stats">
            <div className="stat-item">
              <div className="stat-number" id="totalPoints">
                0
              </div>
              <div className="stat-label">Points collectés</div>
            </div>
            <div className="stat-item">
              <div className="stat-number" id="activeFilters">
                0
              </div>
              <div className="stat-label">Filtres actifs</div>
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
                onClick={() => console.log("Export JPG")}
              >
                <i className="fas fa-file-image"></i> Exporter en JPG
              </div>
              <div
                className="export-option"
                onClick={() => console.log("Export PDF")}
              >
                <i className="fas fa-file-pdf"></i> Exporter en PDF
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="map" style={{ height: "90vh" }}></div>
    </div>
  );
};

export default MapContainer;
