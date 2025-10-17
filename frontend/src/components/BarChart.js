import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import "./BarChart.css";
import api from "./api";

const BarChart = () => {
  const chartRef = useRef(null);
  const modalChartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const modalChartInstanceRef = useRef(null);
  const containerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [allStats, setAllStats] = useState({}); // Toutes les données (pour vue initiale)
  const [loading, setLoading] = useState(false);
  
  //  FILTRES INTÉGRÉS INDÉPENDANTS - AVEC INTERFACE VISIBLE
  const [modalFilters, setModalFilters] = useState({
    selectedTypes: new Set() // Types sélectionnés SEULEMENT dans cette modal
  });

  //  MAPPING CORRECT backend vers frontend
  const backendToFrontend = {
    'pistes': 'pistes',
    'chaussees': 'chaussees',
    'buses': 'buses',
    'dalots': 'dalots', 
    'ponts': 'ponts',
    'passages_submersibles': 'passages',
    'bacs': 'bacs',
    'localites': 'localites',
    'ecoles': 'ecoles',
    'marches': 'marches',
    'batiments_administratifs': 'administratifs',
    'infrastructures_hydrauliques': 'hydrauliques',
    'services_santes': 'sante',
    'autres_infrastructures': 'autres'
  };

  // Labels français pour les types individuels
  const typeLabels = {
    pistes: "Pistes",
    chaussees: "Chaussées", 
    buses: "Buses",
    dalots: "Dalots",
    ponts: "Ponts",
    passages: "Passages submersibles",
    bacs: "Bacs",
    localites: "Localités",
    ecoles: "Écoles",
    marches: "Marchés",
    administratifs: "Bâtiments administratifs",
    hydrauliques: "Infrastructures hydrauliques",
    sante: "Services de santé",
    autres: "Autres infrastructures"
  };

  //  NORMALISER les données backend vers frontend
  const normalizeStats = (backendStats) => {
    const normalizedStats = {};
    
    Object.keys(backendStats).forEach(backendKey => {
      const frontendKey = backendToFrontend[backendKey] || backendKey;
      normalizedStats[frontendKey] = backendStats[backendKey];
    });
    
    console.log("🔄 [BarChart] Stats normalisées:", normalizedStats);
    return normalizedStats;
  };

  //  CHARGER TOUTES LES DONNÉES UNE SEULE FOIS (optimisation performance)
  const loadAllData = async () => {
    setLoading(true);
    try {
      console.log("📊 [BarChart] Chargement TOUTES les données (vue initiale - INDÉPENDANT)");
      
      //  AUCUN FILTRE - Récupérer TOUTES les données
      const result = await api.statistiques.getStatsByType({});
      
      if (result.success) {
        const backendStats = result.data;
        const normalizedStats = normalizeStats(backendStats);
        
        console.log(" [BarChart] Toutes les stats normalisées:", normalizedStats);
        setAllStats(normalizedStats);
        
        // Construire la vue initiale avec TOUTES les données
        buildChartData(normalizedStats);
      } else {
        console.error("❌ [BarChart] Erreur API:", result.error);
        setChartData({ labels: [], datasets: [] });
      }
    } catch (error) {
      console.error("💥 [BarChart] Erreur lors du chargement:", error);
      setChartData({ labels: [], datasets: [] });
    } finally {
      setLoading(false);
    }
  };

  //  APPLIQUER LES FILTRES MODAUX INDÉPENDANTS (réutilise les données existantes)
  const applyModalFilters = () => {
    let filteredStats = { ...allStats };

    // Appliquer les filtres de types sélectionnés dans la modal (INDÉPENDAMMENT)
    if (modalFilters.selectedTypes.size > 0) {
      const filtered = {};
      Array.from(modalFilters.selectedTypes).forEach(type => {
        if (filteredStats[type]) {
          filtered[type] = filteredStats[type];
        }
      });
      filteredStats = filtered;
    }

    console.log("🔍 [BarChart] Stats filtrées par modal INDÉPENDANT:", filteredStats);
    buildChartData(filteredStats);
  };

  //  GESTION DES FILTRES INDÉPENDANTS DANS LA MODAL
  const handleTypeToggle = (type) => {
    const newSelectedTypes = new Set(modalFilters.selectedTypes);
    
    if (newSelectedTypes.has(type)) {
      newSelectedTypes.delete(type);
    } else {
      newSelectedTypes.add(type);
    }
    
    setModalFilters(prev => ({
      ...prev,
      selectedTypes: newSelectedTypes
    }));
  };

  const clearAllFilters = () => {
    setModalFilters({
      selectedTypes: new Set()
    });
  };

  //  CONSTRUIRE LES DONNÉES DU GRAPHIQUE
  const buildChartData = (stats) => {
    console.log("📊 [BarChart] Construction avec:", stats);

    if (Object.keys(stats).length === 0) {
      setChartData({ labels: [], datasets: [] });
      return;
    }

    const labels = Object.keys(stats).map(key => typeLabels[key] || key);
    const values = Object.values(stats);

    setChartData({
      labels,
      datasets: [
        {
          label: "Nombre de collectes",
          data: values,
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 2,
          borderRadius: 8,
          barPercentage: 0.7,
        },
      ],
    });

    console.log("🎨 [BarChart] Données construites:", { labels, values });
  };

  //  GESTION DU CLIC SUR TOUT LE CONTENEUR (pas seulement les barres)
  const handleContainerClick = (e) => {
    if (!isExpanded) {
      console.log("🖱️ [BarChart] Clic sur conteneur - Ouverture modal");
      setIsExpanded(true);
    }
  };

  // Options du graphique
  const getChartOptions = (expanded = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1F2937",
        titleColor: "#FFF",
        bodyColor: "#FFF",
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: expanded ? 16 : 14 },
        bodyFont: { size: expanded ? 14 : 12 },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: expanded ? 30 : 45,
          minRotation: expanded ? 15 : 45,
          font: { size: expanded ? 14 : 12 },
          callback: function(value, index) {
            const label = this.getLabelForValue(value);
            // Tronquer les labels trop longs
            if (label && label.length > (expanded ? 20 : 15)) {
              return label.substring(0, expanded ? 20 : 15) + '...';
            }
            return label;
          }
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Nombre de collectes",
          font: { 
            weight: "600",
            size: expanded ? 16 : 14
          },
        },
        grid: {
          color: "#E5E7EB",
        },
        ticks: {
          font: { size: expanded ? 14 : 12 },
          precision: 0, // Forcer les entiers
          callback: function (value) {
            // Afficher seulement les entiers
            return Number.isInteger(value) ? value : "";
          },
        },
      },
    },
    //  PAS d'onClick dans les options - gestion via conteneur
    onHover: (event, elements) => {
      if (!expanded) {
        const canvas = event.native.target;
        canvas.style.cursor = 'pointer';
      }
    }
  });

  // Créer/mettre à jour le graphique
  const renderChart = () => {
    if (!isExpanded) {
      // Canvas normal (vue initiale)
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      if (chartData.labels.length === 0 || !chartRef.current) return;

      const ctx = chartRef.current.getContext("2d");
      chartInstanceRef.current = new Chart(ctx, {
        type: "bar",
        data: chartData,
        options: getChartOptions(false),
      });
    } else {
      // Canvas modal (vue expanded avec filtres)
      if (modalChartInstanceRef.current) {
        modalChartInstanceRef.current.destroy();
      }

      if (chartData.labels.length === 0 || !modalChartRef.current) return;

      const ctx = modalChartRef.current.getContext("2d");
      modalChartInstanceRef.current = new Chart(ctx, {
        type: "bar",
        data: chartData,
        options: getChartOptions(true),
      });
    }
  };

  // Gérer la fermeture de la modal
  const handleCloseExpanded = (e) => {
    if (e.target.classList.contains('chart-overlay')) {
      console.log("❌ [BarChart] Fermeture modal");
      setIsExpanded(false);
      // Revenir à la vue complète (toutes les données - sans rechargement)
      buildChartData(allStats);
    }
  };

  //  EFFECTS OPTIMISÉS
  useEffect(() => {
    // Charger TOUTES les données UNE SEULE FOIS au démarrage
    loadAllData();
  }, []);

  useEffect(() => {
    // Appliquer les filtres INDÉPENDANTS seulement si on est en mode expanded
    if (isExpanded && Object.keys(allStats).length > 0) {
      applyModalFilters();
    }
  }, [modalFilters, isExpanded]);

  useEffect(() => {
    renderChart();
  }, [chartData, isExpanded]);

  useEffect(() => {
    //  PLUS D'ÉCOUTE DES FILTRES DE GAUCHE - COMPLÈTEMENT INDÉPENDANT
    // Cleanup seulement
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
      if (modalChartInstanceRef.current) {
        modalChartInstanceRef.current.destroy();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="bar-chart-wrapper">
        <h2 className="chart-title">📊 Collectes par type d'infrastructure</h2>
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/*  VUE INITIALE - TOUTES LES DONNÉES (ignore filtres de gauche) */}
      <div className="bar-chart-wrapper" ref={containerRef}>
        <h2 className="chart-title">📊 Collectes par type d'infrastructure</h2>
        
        {chartData.labels.length === 0 ? (
          <div className="chart-empty">
            <p>Aucune donnée disponible</p>
          </div>
        ) : (
          <div className="bar-chart-canvas" onClick={handleContainerClick}>
            <canvas ref={chartRef}></canvas>
          </div>
        )}
      </div>

      {/*  MODAL AVEC FILTRES INTÉGRÉS INDÉPENDANTS (COMME LE DONUT) */}
      {isExpanded && (
        <div className="chart-overlay" onClick={handleCloseExpanded}>
          <div className="chart-expanded">
            <div className="chart-expanded-header">
              <h3>📊 Collectes par type - Analyse détaillée</h3>
              <button 
                className="chart-close-btn"
                onClick={() => {
                  console.log("❌ [BarChart] Bouton fermeture cliqué");
                  setIsExpanded(false);
                  buildChartData(allStats);
                }}
              >
                ✕
              </button>
            </div>
            
            {/*  PANNEAU DE FILTRES INTÉGRÉS INDÉPENDANTS (EXACTEMENT COMME LE DONUT) */}
            <div className="chart-filters-panel">
              <div className="filters-row">
                <div className="filter-stats">
                  <span>
                    {modalFilters.selectedTypes.size === 0 
                      ? `Tous les types (${Object.keys(allStats).length})` 
                      : `${modalFilters.selectedTypes.size} type(s) sélectionné(s)`
                    }
                  </span>
                </div>
                
                <button 
                  onClick={clearAllFilters}
                  className="clear-filters-btn"
                  disabled={modalFilters.selectedTypes.size === 0}
                >
                  Effacer les filtres
                </button>
              </div>
              
              {/*  FILTRES PAR TYPES - COMPLÈTEMENT INDÉPENDANTS DES FILTRES DE GAUCHE */}
              <div className="types-filter-group">
                <label>Filtrer par types d'infrastructure:</label>
                <div className="types-checkboxes">
                  {Object.keys(allStats).map(type => (
                    <label key={type} className="type-checkbox">
                      <input
                        type="checkbox"
                        checked={modalFilters.selectedTypes.has(type)}
                        onChange={() => handleTypeToggle(type)}
                      />
                      <span className="checkbox-label">
                        {typeLabels[type] || type}
                        <span className="type-count">({allStats[type]})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="chart-expanded-content">
              <canvas ref={modalChartRef}></canvas>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BarChart;