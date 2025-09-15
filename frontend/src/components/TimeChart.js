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
  const [loading, setLoading] = useState(false); // CORRECTION PRINCIPALE
  const [error, setError] = useState(null);
  const [temporalData, setTemporalData] = useState({});
  const [totalByPeriod, setTotalByPeriod] = useState({});
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [modalTimeScale, setModalTimeScale] = useState("month");
  const [modalDateFrom, setModalDateFrom] = useState("");
  const [modalDateTo, setModalDateTo] = useState("");
  
  // États pour les filtres internes de la modal (seulement les types)
  const [modalFilters, setModalFilters] = useState({
    types: []
  });

  // Limites de période selon l'échelle
  const PERIOD_LIMITS = {
    day: {
      maxDays: 7,
      maxRange: "7 jours maximum"
    },
    week: {
      maxDays: 84, // 12 semaines
      maxRange: "12 semaines maximum"
    },
    month: {
      maxDays: 730, // 2 ans
      maxRange: "24 mois maximum"
    },
    year: {
      maxDays: 3650, // 10 ans
      maxRange: "10 ans maximum"
    }
  };

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
    batiments_administratifs: "Bât. admin.",
    infrastructures_hydrauliques: "Infra. hydrauliques",
    bacs: "Bacs",
    passages_submersibles: "Passages submersibles",
    autres_infrastructures: "Autres",
    chaussees: "Chaussées"
  };

  // Fonction pour valider la plage de dates
  const validateDateRange = (dateFrom, dateTo, timeScale) => {
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

    // Calculer la durée en jours
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Vérifier les limites selon l'échelle
    const limit = PERIOD_LIMITS[timeScale];
    if (diffDays > limit.maxDays) {
      return { 
        valid: false, 
        error: `Période trop longue pour l'échelle "${timeScale}". ${limit.maxRange}` 
      };
    }

    return { valid: true, days: diffDays };
  };

  // Fonction pour compléter la dernière semaine incomplète
  const completeLastWeek = (dateFrom, dateTo) => {
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    
    // Trouver le dimanche de la dernière semaine
    const lastSunday = new Date(endDate);
    const daysToAdd = 6 - endDate.getDay(); // 0 = dimanche, 6 = samedi
    lastSunday.setDate(endDate.getDate() + daysToAdd);
    
    // Retourner la date ajustée au format YYYY-MM-DD
    return lastSunday.toISOString().split('T')[0];
  };

  // Fonction pour calculer le nombre de semaines complètes
  const calculateWeekSpan = (dateFrom, dateTo) => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(diffDays / 7);
    const remainingDays = diffDays % 7;
    
    return { weeks, remainingDays, totalDays: diffDays };
  };

  // Initialiser les filtres internes avec tous les types disponibles
  const initializeModalFilters = () => {
    const allTypes = Object.keys(typeLabels);
    setModalFilters({
      types: allTypes // Tous les types sélectionnés par défaut
    });
  };

  // Construire les données du graphique principal
  const buildMainChartData = () => {
    const periodData = Object.entries(totalByPeriod).map(([period, count]) => ({
      period,
      count,
      sortKey: period.includes('/') ? 
        period.split('/').reverse().join('-') : 
        period
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

  // Charger les données temporelles (logique indépendante)
  const loadDefaultTemporalData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Utiliser la logique qui lit les checkboxes du panneau de gauche
      const checkedTypes = Array.from(
        document.querySelectorAll(".filter-checkbox-group input[type='checkbox']:checked")
      ).map((cb) => cb.id);

      const filters = {
        types: checkedTypes.length > 0 ? checkedTypes : Object.keys(typeLabels),
        period_type: "month"
      };
      
      const result = await api.temporalAnalysis.getTemporalData(filters);
      
      if (result.success && result.data) {
        const responseData = result.data.data || result.data;
        const responseTotalByPeriod = result.data.total_by_period || {};
        
        setTemporalData(responseData);
        setTotalByPeriod(responseTotalByPeriod);
        
        // Sélectionner tous les types disponibles
        const allAvailableTypes = Object.keys(responseData).filter(type => {
          const typeData = responseData[type];
          return Array.isArray(typeData) && typeData.length > 0;
        });
        
        setSelectedTypes(new Set(allAvailableTypes));
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

  // Charger les données pour la modal avec filtres internes
  const loadModalData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // LOGIQUE DE BASCULEMENT AUTOMATIQUE (OBLIGATOIRE)
      let finalTimeScale = modalTimeScale;
      let adjustedDateTo = modalDateTo;
      let willAutoSwitch = false;
      
      if (modalDateFrom && modalDateTo) {
        const startDate = new Date(modalDateFrom);
        const endDate = new Date(modalDateTo);
        const diffTime = Math.abs(endDate - startDate);
        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Basculement automatique OBLIGATOIRE si échelle "jours" et période > 7 jours
        if (modalTimeScale === 'day' && daysDiff > 7) {
          finalTimeScale = 'week';
          adjustedDateTo = completeLastWeek(modalDateFrom, modalDateTo);
          willAutoSwitch = true;
        }
      }

      // Validation des dates avec l'échelle finale (après basculement)
      const validation = validateDateRange(modalDateFrom, adjustedDateTo, finalTimeScale);
      if (!validation.valid) {
        setError(validation.error);
        setLoading(false);
        return;
      }
      
      // Utiliser les filtres internes de la modal (INDÉPENDANTS)
      const filters = {
        period_type: finalTimeScale,
        types: modalFilters.types, // Filtres internes seulement
        date_from: modalDateFrom,
        date_to: adjustedDateTo
      };
      
      const result = await api.temporalAnalysis.getTemporalData(filters);
      
      if (result.success && result.data) {
        setTemporalData(result.data.data || {});
        setTotalByPeriod(result.data.total_by_period || {});
      } else {
        setError(result.error || "Aucune donnée disponible");
      }
    } catch (error) {
      console.error("Erreur:", error);
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
            const datasets = chart.data.datasets;
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
          maxTicksLimit: isModal ? 20 : 8
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
      // Initialiser les filtres internes indépendants
      initializeModalFilters();
    }
  };

  const handleCloseExpanded = () => {
    setIsExpanded(false);
    // Recharger les données principales après fermeture de la modal
    loadDefaultTemporalData();
  };

  const applyModalFilters = () => {
    loadModalData();
  };

  const resetModalFilters = () => {
    setModalTimeScale("month");
    setModalDateFrom("");
    setModalDateTo("");
    initializeModalFilters(); // Réinitialiser avec tous les types
    setError(null);
    // Charger les données avec les filtres par défaut
    setTimeout(() => {
      loadModalData();
    }, 100);
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
          Évolution temporelle
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
              <h3>Analyse temporelle détaillée</h3>
              <button className="modal-close-btn" onClick={handleCloseExpanded}>
                ✕
              </button>
            </div>

            <div className="modal-filters">
              {/* Échelle temporelle */}
              <div className="filter-group">
                <label>Échelle temporelle :</label>
                <div className="time-scale-buttons">
                  {['day', 'week', 'month', 'year'].map((scale) => (
                    <button
                      key={scale}
                      className={`scale-btn ${modalTimeScale === scale ? "active" : ""}`}
                      onClick={() => setModalTimeScale(scale)}
                    >
                      {scale === "day" && "Jours"}
                      {scale === "week" && "Semaines"}
                      {scale === "month" && "Mois"}
                      {scale === "year" && "Années"}
                    </button>
                  ))}
                </div>
                <div className="scale-limits">
                  {PERIOD_LIMITS[modalTimeScale]?.maxRange}
                </div>
              </div>

              {/* Période d'étude */}
              <div className="filter-group">
                <label>Période d'étude :</label>
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
                <label>&nbsp;</label> {/* Label vide pour alignement */}
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

            {/* Informations sur la période */}
            {modalDateFrom && modalDateTo && (
              <div className="period-info">
                {(() => {
                  // Calculer avec l'échelle actuelle ET l'échelle après basculement
                  const startDate = new Date(modalDateFrom);
                  const endDate = new Date(modalDateTo);
                  const diffTime = Math.abs(endDate - startDate);
                  const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  const willAutoSwitch = modalTimeScale === 'day' && daysDiff > 7;
                  const finalScale = willAutoSwitch ? 'week' : modalTimeScale;
                  const finalDateTo = willAutoSwitch ? completeLastWeek(modalDateFrom, modalDateTo) : modalDateTo;
                  
                  const validation = validateDateRange(modalDateFrom, finalDateTo, finalScale);
                  const span = calculateWeekSpan(modalDateFrom, modalDateTo);
                  
                  return (
                    <div className={`period-display ${!validation.valid ? 'error' : willAutoSwitch ? 'warning' : 'info'}`}>
                      <div className="period-summary">
                        Période: {span.totalDays} jours 
                        {span.totalDays > 7 && (
                          <span> = {span.weeks} semaine{span.weeks > 1 ? 's' : ''} 
                          {span.remainingDays > 0 && ` + ${span.remainingDays} jour${span.remainingDays > 1 ? 's' : ''}`}
                          </span>
                        )}
                      </div>
                      
                      {!validation.valid && (
                        <div className="period-error">
                          {validation.error}
                        </div>
                      )}
                      
                      {willAutoSwitch && validation.valid && (
                        <div className="period-warning">
                          ⚠️ Basculement automatique vers l'échelle "Semaines"
                          {span.remainingDays > 0 && (
                            <div className="period-extension">
                              (Période étendue pour compléter la dernière semaine)
                            </div>
                          )}
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