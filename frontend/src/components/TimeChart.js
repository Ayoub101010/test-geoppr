import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./TimeChart.css";
import api from "./api";

const TimeChart = () => {
  const chartRef = useRef(null);
  const modalChartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const modalChartInstanceRef = useRef(null);
  const exportContainerRef = useRef(null); // Référence pour l'export
  
  // États du composant
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [temporalData, setTemporalData] = useState({});
  const [totalByPeriod, setTotalByPeriod] = useState({});
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [modalDateFrom, setModalDateFrom] = useState("");
  const [modalDateTo, setModalDateTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  
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

  // Fonction pour formater une date en JJ/MM/AAAA
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

  // Fonction pour générer les dates de la période
  const generatePeriodDates = () => {
    if (!modalDateFrom || !modalDateTo) return [];
    
    const dates = [];
    const startDate = new Date(modalDateFrom);
    const endDate = new Date(modalDateTo);
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate).toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // Fonction pour construire les données du tableau récapitulatif
  const buildSummaryTableData = () => {
    const dates = generatePeriodDates();
    const selectedTypesList = Array.from(selectedTypes);
    
    const tableData = selectedTypesList.map(type => {
      const typeData = temporalData[type] || [];
      const rowData = {
        type: typeLabels[type] || type,
        color: typeColors[type],
        dates: {},
        total: 0
      };
      
      // Initialiser toutes les dates à 0
      dates.forEach(date => {
        rowData.dates[date] = 0;
      });
      
      // Remplir avec les données réelles
      typeData.forEach(item => {
        if (rowData.dates.hasOwnProperty(item.period)) {
          rowData.dates[item.period] = item.count;
          rowData.total += item.count;
        }
      });
      
      return rowData;
    });
    
    return { dates, tableData };
  };

  // Fonction d'export PNG
  const handleExportPNG = async () => {
    if (!exportContainerRef.current) return;
    
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(exportContainerRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      const link = document.createElement('a');
      link.download = `evolution-collectes-${modalDateFrom}-${modalDateTo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Erreur lors de l'export PNG:", error);
      alert("Erreur lors de l'export PNG");
    } finally {
      setIsExporting(false);
    }
  };

  // Fonction d'export PDF
  const handleExportPDF = async () => {
    if (!exportContainerRef.current) return;
    
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(exportContainerRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const imgX = (pageWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`evolution-collectes-${modalDateFrom}-${modalDateTo}.pdf`);
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      alert("Erreur lors de l'export PDF");
    } finally {
      setIsExporting(false);
    }
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

    // IMPORTANT : Toujours inclure TOUS les types (pas de filtre par selectedTypes ici)
    const datasets = Object.keys(temporalData)
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
          hidden: !selectedTypes.has(type) // Utilise hidden au lieu de filtrer
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
  const getChartOptions = (isModal) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: isModal, // ✅ Réactivé
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
                const labelText = typeLabels[type] || type;
                
                return {
                  text: labelText,
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

  // Charger les données temporelles sans dépendance aux checkboxes globales
  const loadDefaultTemporalData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allAvailableTypes = Object.keys(frontendToBackendMapping);
      
      const filters = {
        types: allAvailableTypes,
        period_type: "month"
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
        period_type: "day",
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
        setTemporalData({});
        setTotalByPeriod({});
      }
    } catch (error) {
      console.error("Erreur loadModalData:", error);
      setError("Erreur de connexion à l'API");
      setTemporalData({});
      setTotalByPeriod({});
    } finally {
      setLoading(false);
    }
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
  }, [temporalData, selectedTypes, isExpanded]); // ✅ selectedTypes réactivé pour animations

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

  // Rendu du tableau récapitulatif
  const renderSummaryTable = () => {
    const { dates, tableData } = buildSummaryTableData();
    
    if (dates.length === 0 || tableData.length === 0) {
      return null;
    }

    return (
      <div className="summary-table-container">
        <h4 className="summary-table-title">
          <i className="fas fa-table"></i>
          Tableau récapitulatif des collectes
        </h4>
        <div className="summary-table-wrapper">
          <table className="summary-table">
            <thead>
              <tr>
                <th className="type-column">Type d'infrastructure</th>
                {dates.map(date => (
                  <th key={date} className="date-column">{formatDate(date)}</th>
                ))}
                <th className="total-column">Total</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={index}>
                  <td className="type-cell">
                    <span 
                      className="type-indicator" 
                      style={{ backgroundColor: row.color }}
                    ></span>
                    {row.type}
                  </td>
                  {dates.map(date => (
                    <td key={date} className="count-cell">
                      {row.dates[date] || 0}
                    </td>
                  ))}
                  <td className="total-cell">{row.total}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td className="type-cell"><strong>Total général</strong></td>
                {dates.map(date => {
                  const dayTotal = tableData.reduce((sum, row) => sum + (row.dates[date] || 0), 0);
                  return <td key={date} className="count-cell"><strong>{dayTotal}</strong></td>;
                })}
                <td className="total-cell">
                  <strong>{tableData.reduce((sum, row) => sum + row.total, 0)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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
              {/* Période d'étude - SIMPLIFIÉE */}
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

            {/* Wrapper pour le contenu exportable */}
            <div className="export-content-wrapper">
              {/* Boutons d'export EN DEHORS du container exportable */}
              {modalDateFrom && modalDateTo && (
                <div className="export-controls">
                  <div className="export-info">
                    <i className="fas fa-info-circle"></i>
                    <span>Cliquez pour exporter le graphique et le tableau</span>
                  </div>
                  <div className="export-buttons">
                    <button 
                      className="export-btn export-png"
                      onClick={handleExportPNG}
                      disabled={isExporting}
                    >
                      <i className="fas fa-image"></i>
                      {isExporting ? 'Export...' : 'PNG'}
                    </button>
                    <button 
                      className="export-btn export-pdf"
                      onClick={handleExportPDF}
                      disabled={isExporting}
                    >
                      <i className="fas fa-file-pdf"></i>
                      {isExporting ? 'Export...' : 'PDF'}
                    </button>
                  </div>
                </div>
              )}

              {/* Container pour l'export (graphique + tableau UNIQUEMENT) */}
              <div ref={exportContainerRef} className="export-container">
                {/* Titre dynamique avec période */}
                {modalDateFrom && modalDateTo && (
                  <div className="export-header">
                    <h3 className="export-title">
                      Évolution des collectes du {formatDate(modalDateFrom)} au {formatDate(modalDateTo)}
                    </h3>
                  </div>
                )}

                {/* Graphique */}
                <div className="modal-chart-content">
                  <canvas ref={modalChartRef}></canvas>
                </div>

                {/* Tableau récapitulatif */}
                {modalDateFrom && modalDateTo && renderSummaryTable()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TimeChart;