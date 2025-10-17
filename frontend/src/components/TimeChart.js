import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import "./TimeChart.css";
import api from "./api";

const TimeChart = () => {
  const chartRef = useRef(null);
  const modalChartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const modalChartInstanceRef = useRef(null);
  
  // États du composant
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [temporalData, setTemporalData] = useState({});
  const [totalByPeriod, setTotalByPeriod] = useState({});
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [modalDateFrom, setModalDateFrom] = useState("");
  const [modalDateTo, setModalDateTo] = useState("");
  
  // États pour les filtres internes de la modal (seulement les types)
  const [modalFilters, setModalFilters] = useState({
    types: []
  });

  // Plage de dates autorisées
  const DATE_LIMITS = {
    minDate: "2020-01-01",
    maxDate: "2025-12-31"
  };

  // Configuration des couleurs et labels
  const typeColors = {
    pistes: "#2980b9",
    services_santes: "#e74c3c", 
    ponts: "#9b59b6",
    buses: "#f39c12",
    dalots: "#3498db",
    ecoles: "#27ae60",
    localites: "#e67e22",
    marches: "#f1c40f",
    batiments_administratifs: "#34495e",
    infrastructures_hydrauliques: "#1abc9c",
    bacs: "#d35400",
    passages_submersibles: "#95a5a6",
    autres_infrastructures: "#7f8c8d",
    chaussees: "#8e44ad"
  };

  const typeLabels = {
    pistes: "Pistes",
    services_santes: "Services de santé",
    ponts: "Ponts", 
    buses: "Buses",
    dalots: "Dalots",
    ecoles: "Écoles",
    localites: "Localités",
    marches: "Marchés",
    batiments_administratifs: "Bât. administratifs",
    infrastructures_hydrauliques: "Infra. hydrauliques",
    bacs: "Bacs",
    passages_submersibles: "Passages submersibles",
    autres_infrastructures: "Autres infrastructures",
    chaussees: "Chaussées"
  };

  // Mapping frontend vers backend cohérent
  const frontendToBackendMapping = {
    'pistes': 'pistes',
    'services_santes': 'services_santes',
    'ponts': 'ponts',
    'buses': 'buses',
    'dalots': 'dalots',
    'ecoles': 'ecoles',
    'localites': 'localites',
    'marches': 'marches',
    'batiments_administratifs': 'batiments_administratifs',
    'infrastructures_hydrauliques': 'infrastructures_hydrauliques',
    'bacs': 'bacs',
    'passages_submersibles': 'passages_submersibles',
    'autres_infrastructures': 'autres_infrastructures'
  };

  // Fonction pour valider la plage de dates (SIMPLIFIÉE - 7 jours max)
  const validateDateRange = (dateFrom, dateTo) => {
    if (!dateFrom || !dateTo) {
      return { valid: false, error: "Veuillez sélectionner les deux dates" };
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    const minDate = new Date(DATE_LIMITS.minDate);
    const maxDate = new Date(DATE_LIMITS.maxDate);

    // Vérifier que les dates sont dans la plage autorisée
    if (startDate < minDate || endDate > maxDate) {
      return { 
        valid: false, 
        error: `Les dates doivent être entre ${DATE_LIMITS.minDate} et ${DATE_LIMITS.maxDate}` 
      };
    }

    // Vérifier que la date de début est antérieure à la date de fin
    if (startDate >= endDate) {
      return { valid: false, error: "La date de début doit être antérieure à la date de fin" };
    }

    // Calculer la durée en jours (LIMITE FIXE : 7 jours)
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
      return { 
        valid: false, 
        error: "Période maximum : 7 jours" 
      };
    }

    return { valid: true, days: diffDays };
  };

  // Initialiser les filtres internes avec tous les types disponibles
  const initializeModalFilters = () => {
    const allTypes = Object.keys(typeLabels);
    setModalFilters({
      types: allTypes
    });
  };

  // Construire les données du graphique principal
  const buildMainChartData = () => {
    const periodData = Object.entries(totalByPeriod).map(([period, count]) => ({
      period,
      count,
      sortKey: period
    }));

    const sortedData = periodData.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    
    const periods = sortedData.map(item => item.period);
    const totals = sortedData.map(item => item.count);

    if (periods.length === 0) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: periods,
      datasets: [{
        label: "Total collectes",
        data: totals,
        borderColor: "#2980b9",
        backgroundColor: "rgba(41, 128, 185, 0.1)",
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3
      }]
    };
  };

  // Rendu du graphique principal
  const renderMainChart = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const chartData = buildMainChartData();
    if (chartData.labels.length === 0 || !chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");
    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: chartData,
      options: getChartOptions(false)
    });
  };

  // Charger les données temporelles sans dépendance aux checkboxes globales
  const loadDefaultTemporalData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allAvailableTypes = Object.keys(frontendToBackendMapping);
      
      const filters = {
        types: allAvailableTypes,
        period_type: "month" // Vue principale en mois
      };
      
      const result = await api.temporalAnalysis.getTemporalData(filters);
      
      if (result.success && result.data) {
        const responseData = result.data.data || result.data;
        const responseTotalByPeriod = result.data.total_by_period || {};
        
        setTemporalData(responseData);
        setTotalByPeriod(responseTotalByPeriod);
        
        const typesWithData = Object.keys(responseData).filter(type => {
          const typeData = responseData[type];
          return Array.isArray(typeData) && typeData.length > 0;
        });
        
        setSelectedTypes(new Set(typesWithData));
        
      } else {
        setError(result.error || "Aucune donnée disponible");
        setTemporalData({});
        setTotalByPeriod({});
      }
    } catch (error) {
      console.error("Erreur loadDefaultTemporalData:", error);
      setError("Erreur de connexion à l'API");
      setTemporalData({});
      setTotalByPeriod({});
    } finally {
      setLoading(false);
    }
  };

  // Charger les données pour la modal (JOURS SEULEMENT)
  const loadModalData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Validation simple - 7 jours max
      const validation = validateDateRange(modalDateFrom, modalDateTo);
      if (!validation.valid) {
        setError(validation.error);
        setLoading(false);
        return;
      }
      
      const backendTypes = modalFilters.types.map(type => 
        frontendToBackendMapping[type] || type
      );
      
      const filters = {
        period_type: "day", // TOUJOURS en jours dans la modal
        types: backendTypes,
        date_from: modalDateFrom,
        date_to: modalDateTo
      };
      
      const result = await api.temporalAnalysis.getTemporalData(filters);
      
      if (result.success && result.data) {
        setTemporalData(result.data.data || {});
        setTotalByPeriod(result.data.total_by_period || {});
      } else {
        setError(result.error || "Aucune donnée disponible");
      }
    } catch (error) {
      console.error("Erreur loadModalData:", error);
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  // Construire les données du graphique modal
  const buildModalChartData = () => {
    const allPeriods = new Set();
    
    Object.values(temporalData).forEach(typeData => {
      if (Array.isArray(typeData)) {
        typeData.forEach(item => {
          if (item && item.period) {
            allPeriods.add(item.period);
          }
        });
      }
    });

    const sortedPeriods = Array.from(allPeriods).sort();

    if (sortedPeriods.length === 0) {
      return { labels: [], datasets: [] };
    }

    const typesToShow = selectedTypes.size > 0 
      ? Object.keys(temporalData).filter(type => selectedTypes.has(type))
      : Object.keys(temporalData);

    const datasets = typesToShow
      .filter(type => Array.isArray(temporalData[type]) && temporalData[type].length > 0)
      .map(type => {
        const typeData = sortedPeriods.map(period => {
          const periodData = temporalData[type].find(item => item && item.period === period);
          return periodData?.count || 0;
        });

        return {
          label: typeLabels[type] || type,
          data: typeData,
          borderColor: typeColors[type] || "#95a5a6",
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
          tension: 0.3,
          hidden: !selectedTypes.has(type)
        };
      });

    return { labels: sortedPeriods, datasets };
  };

  // Toggle type selection via légende
  const toggleTypeSelection = (type) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedTypes(newSelected);
  };

  // Options du graphique
  const getChartOptions = (isModal = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: isModal,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: 15,
          padding: 20,
          font: { size: 11 },
          generateLabels: function(chart) {
            const typeKeys = Object.keys(temporalData);
            
            return typeKeys
              .filter(type => {
                const typeData = temporalData[type];
                return Array.isArray(typeData) && typeData.length > 0;
              })
              .map((type, index) => {
                const isSelected = selectedTypes.has(type);
                
                return {
                  text: `${typeLabels[type] || type}`,
                  fillStyle: typeColors[type] || "#95a5a6",
                  strokeStyle: typeColors[type] || "#95a5a6",
                  pointStyle: 'circle',
                  hidden: !isSelected,
                  fontColor: isSelected ? '#333' : '#999',
                  lineWidth: isSelected ? 2 : 1,
                  datasetIndex: index
                };
              });
          }
        },
        onClick: function(e, legendItem, legend) {
          const typeKeys = Object.keys(temporalData).filter(type => {
            const typeData = temporalData[type];
            return Array.isArray(typeData) && typeData.length > 0;
          });
          
          const type = typeKeys[legendItem.datasetIndex];
          if (type) {
            toggleTypeSelection(type);
          }
        }
      },
      tooltip: {
        backgroundColor: "#ffffff",
        titleColor: "#2d3748", 
        bodyColor: "#2d3748",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        padding: 8,
        cornerRadius: 6,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y} collectes`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "#f1f3f4" },
        ticks: {
          font: { size: isModal ? 12 : 10 },
          callback: function(value) {
            return Number.isInteger(value) ? value : '';
          }
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: isModal ? 12 : 9 },
          maxRotation: 45,
          maxTicksLimit: isModal ? 10 : 8
        }
      }
    }
  });

  // Rendu du graphique modal
  const renderModalChart = () => {
    if (modalChartInstanceRef.current) {
      modalChartInstanceRef.current.destroy();
    }

    const chartData = buildModalChartData();
    if (chartData.labels.length === 0 || !modalChartRef.current) return;

    const ctx = modalChartRef.current.getContext("2d");
    modalChartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: chartData,
      options: getChartOptions(true)
    });
  };

  // Gestion des interactions
  const handleChartClick = () => {
    if (Object.keys(temporalData).length > 0) {
      setIsExpanded(true);
      initializeModalFilters();
    }
  };

  const handleCloseExpanded = () => {
    setIsExpanded(false);
    loadDefaultTemporalData();
  };

  const applyModalFilters = () => {
    loadModalData();
  };

  const resetModalFilters = () => {
    setModalDateFrom("");
    setModalDateTo("");
    initializeModalFilters();
    setError(null);
  };

  // Effects
  useEffect(() => {
    loadDefaultTemporalData();
    initializeModalFilters();
  }, []);

  useEffect(() => {
    renderMainChart();
  }, [totalByPeriod]);

  useEffect(() => {
    if (isExpanded) {
      renderModalChart();
    }
  }, [temporalData, selectedTypes, isExpanded]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
      if (modalChartInstanceRef.current) {
        modalChartInstanceRef.current.destroy();
      }
    };
  }, [isExpanded]);

  return (
    <>
      <div className="analytics-section">
        <div className="analytics-title">
          <i className="fas fa-chart-line"></i>
          Évolution temporelle Des Collectes
        </div>

        {loading ? (
          <div className="chart-loading">
            <div className="loading-spinner"></div>
            <p>Chargement...</p>
          </div>
        ) : error ? (
          <div className="chart-error">
            <i className="fas fa-exclamation-triangle"></i>
            <p>{error}</p>
            <button onClick={loadDefaultTemporalData} className="retry-btn">
              Réessayer
            </button>
          </div>
        ) : Object.keys(temporalData).length === 0 ? (
          <div className="chart-empty">
            <i className="fas fa-chart-line"></i>
            <p>Aucune donnée pour cette période</p>
          </div>
        ) : (
          <div 
            className="chart-container"
            onClick={handleChartClick}
            style={{ cursor: 'pointer' }}
          >
            <canvas ref={chartRef}></canvas>
            <div className="chart-hint">
              Cliquer pour analyse détaillée
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="chart-modal-overlay">
          <div className="chart-modal-container">
            <div className="chart-modal-header">
              <h3>Analyse temporelle détaillée (par jour)</h3>
              <button className="modal-close-btn" onClick={handleCloseExpanded}>
                ✕
              </button>
            </div>

            <div className="modal-filters">
              {/* Période d'étude - SIMPLIFIÉ */}
              <div className="filter-group">
                <label>Période d'étude (7 jours maximum) :</label>
                <div className="date-range">
                  <input
                    type="date"
                    value={modalDateFrom}
                    onChange={(e) => setModalDateFrom(e.target.value)}
                    min={DATE_LIMITS.minDate}
                    max={modalDateTo || DATE_LIMITS.maxDate}
                  />
                  <span>à</span>
                  <input
                    type="date"
                    value={modalDateTo}
                    onChange={(e) => setModalDateTo(e.target.value)}
                    min={modalDateFrom || DATE_LIMITS.minDate}
                    max={DATE_LIMITS.maxDate}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="filter-group">
                <label>&nbsp;</label>
                <div className="filter-actions">
                  <button className="apply-btn" onClick={applyModalFilters}>
                    Appliquer
                  </button>
                  <button className="reset-btn" onClick={resetModalFilters}>
                    Réinitialiser
                  </button>
                </div>
              </div>
            </div>

            {/* Information simple sur la période */}
            {modalDateFrom && modalDateTo && (
              <div className="period-info">
                {(() => {
                  const validation = validateDateRange(modalDateFrom, modalDateTo);
                  const startDate = new Date(modalDateFrom);
                  const endDate = new Date(modalDateTo);
                  const diffTime = Math.abs(endDate - startDate);
                  const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div className={`period-display ${!validation.valid ? 'error' : 'info'}`}>
                      <div className="period-summary">
                        Période sélectionnée: {daysDiff} jour{daysDiff > 1 ? 's' : ''}
                      </div>
                      
                      {!validation.valid && (
                        <div className="period-error">
                          {validation.error}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="modal-chart-content">
              <canvas ref={modalChartRef}></canvas>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TimeChart;