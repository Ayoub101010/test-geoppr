/* @refresh reset */

import React, { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import "./BarChart.css";
import api from "./api";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from './AuthContext';

// ✅ Enregistrer Chart.js SANS ChartDataLabels globalement
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
  // PAS de ChartDataLabels ici - il sera ajouté localement
);

// ✅ Désactiver animations en dev pour éviter conflits hot-reload
if (process.env.NODE_ENV === 'development') {
  ChartJS.defaults.animation = false;
}

const BarChart = () => {
  const chartRef = useRef(null);
  const modalChartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const modalChartInstanceRef = useRef(null);
  const containerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [allStats, setAllStats] = useState({});
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  
  const [modalFilters, setModalFilters] = useState({
    selectedTypes: new Set()
  });

  const canExport = () => {
    if (!user) return false;
    return user.role === 'super_admin' || user.role === 'admin';
  };

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

  const normalizeStats = (backendStats) => {
    const normalizedStats = {};
    
    Object.keys(backendStats).forEach(backendKey => {
      const frontendKey = backendToFrontend[backendKey] || backendKey;
      normalizedStats[frontendKey] = backendStats[backendKey];
    });
    
    console.log("🔄 [BarChart] Stats normalisées:", normalizedStats);
    return normalizedStats;
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      console.log("📊 [BarChart] Chargement TOUTES les données (vue initiale - INDÉPENDANT)");
      
      const result = await api.statistiques.getStatsByType({});
      
      if (result.success) {
        const backendStats = result.data;
        const normalizedStats = normalizeStats(backendStats);
        
        console.log("✅ [BarChart] Toutes les stats normalisées:", normalizedStats);
        setAllStats(normalizedStats);
        
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

  const applyModalFilters = () => {
    let filteredStats = { ...allStats };

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

  const exportChart = async (format = 'png') => {
    setIsExporting(true);
    try {
      const chartElement = isExpanded 
        ? document.querySelector('.chart-expanded-content')
        : containerRef.current;
      
      const exportButtons = document.querySelectorAll('.chart-expanded-header button');
      exportButtons.forEach(btn => btn.style.visibility = 'hidden');
      
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      exportButtons.forEach(btn => btn.style.visibility = 'visible');

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `Collectes_Infrastructure_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      } else if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        const orientation = ratio > 1 ? 'landscape' : 'portrait';
        const pdf = new jsPDF(orientation, 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('📊 Collectes par type d\'infrastructure', pdfWidth / 2, 15, { align: 'center' });
        
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        const dateStr = new Date().toLocaleDateString('fr-FR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        pdf.text(`Généré le ${dateStr}`, pdfWidth / 2, 22, { align: 'center' });
        
        let finalWidth, finalHeight;
        const margin = 10;
        const topMargin = 30;
        const availableHeight = pdfHeight - topMargin - margin;
        
        if (ratio > pdfWidth / availableHeight) {
          finalWidth = pdfWidth - (2 * margin);
          finalHeight = finalWidth / ratio;
        } else {
          finalHeight = availableHeight;
          finalWidth = finalHeight * ratio;
        }
        
        const x = (pdfWidth - finalWidth) / 2;
        const y = topMargin;
        
        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');
        pdf.save(`Collectes_Infrastructure_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

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

  const handleContainerClick = (e) => {
    if (!isExpanded) {
      console.log("🖱️ [BarChart] Clic sur conteneur - Ouverture modal");
      setIsExpanded(true);
    }
  };

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
      datalabels: {
        anchor: 'end',
        align: 'top',
        offset: expanded ? 8 : 4,
        color: '#374151',
        font: {
          size: expanded ? 14 : 12,
          weight: 'bold'
        },
        formatter: (value) => value,
        display: true,
        clip: false
      }
    },
    scales: {
      x: {
        ticks: {
          maxRotation: expanded ? 30 : 45,
          minRotation: expanded ? 15 : 45,
          font: { size: expanded ? 14 : 12 },
          callback: function(value, index) {
            const label = this.getLabelForValue(value);
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
          precision: 0,
          callback: function (value) {
            return Number.isInteger(value) ? value : "";
          },
        },
        suggestedMax: function(context) {
          const max = Math.max(...context.chart.data.datasets[0].data);
          return max * 1.15;
        }
      },
    },
    onHover: (event, elements) => {
      if (!expanded) {
        const canvas = event.native?.target;
        if (canvas) canvas.style.cursor = 'pointer';
      }
    },
    layout: {
      padding: {
        top: expanded ? 30 : 20
      }
    }
  });

  // ✅ Fonction de rendu avec plugin LOCAL (n'affecte QUE BarChart)
  const renderChart = () => {
    setTimeout(() => {
      if (!isExpanded) {
        if (chartInstanceRef.current) {
          try {
            chartInstanceRef.current.destroy();
          } catch (e) {
            // Ignorer les erreurs de destruction
          }
          chartInstanceRef.current = null;
        }

        if (chartData.labels.length === 0 || !chartRef.current) return;

        const ctx = chartRef.current.getContext("2d");
        if (!ctx) return;
        
        try {
          chartInstanceRef.current = new ChartJS(ctx, {
            type: "bar",
            data: JSON.parse(JSON.stringify(chartData)),
            options: getChartOptions(false),
            plugins: [ChartDataLabels]  // ✅ Plugin LOCAL - seulement pour BarChart
          });
        } catch (error) {
          console.error("❌ Erreur création chart normal:", error);
        }
      } else {
        if (modalChartInstanceRef.current) {
          try {
            modalChartInstanceRef.current.destroy();
          } catch (e) {
            // Ignorer les erreurs de destruction
          }
          modalChartInstanceRef.current = null;
        }

        if (chartData.labels.length === 0 || !modalChartRef.current) return;

        const ctx = modalChartRef.current.getContext("2d");
        if (!ctx) return;
        
        try {
          modalChartInstanceRef.current = new ChartJS(ctx, {
            type: "bar",
            data: JSON.parse(JSON.stringify(chartData)),
            options: getChartOptions(true),
            plugins: [ChartDataLabels]  // ✅ Plugin LOCAL - seulement pour BarChart
          });
        } catch (error) {
          console.error("❌ Erreur création chart modal:", error);
        }
      }
    }, 0);
  };

  const handleCloseExpanded = (e) => {
    if (e.target.classList.contains('chart-overlay')) {
      console.log("❌ [BarChart] Fermeture modal");
      setIsExpanded(false);
      buildChartData(allStats);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadAllData();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isExpanded && Object.keys(allStats).length > 0) {
      applyModalFilters();
    }
  }, [modalFilters, isExpanded]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    renderChart();
  }, [chartData, isExpanded]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.destroy();
        } catch (e) {
          // Ignorer
        }
        chartInstanceRef.current = null;
      }
      if (modalChartInstanceRef.current) {
        try {
          modalChartInstanceRef.current.destroy();
        } catch (e) {
          // Ignorer
        }
        modalChartInstanceRef.current = null;
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

      {isExpanded && (
        <div className="chart-overlay" onClick={handleCloseExpanded}>
          <div className="chart-expanded">
            <div className="chart-expanded-header">
              <h3>📊 Collectes par type - Analyse détaillée</h3>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {canExport() && (
                  <>
                    <button 
                      onClick={() => exportChart('png')}
                      disabled={isExporting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: isExporting ? 'not-allowed' : 'pointer',
                        opacity: isExporting ? 0.6 : 1,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => !isExporting && (e.target.style.background = 'rgba(255, 255, 255, 0.3)')}
                      onMouseLeave={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
                    >
                      {isExporting ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          <span>Export...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-image"></i>
                          <span>PNG</span>
                        </>
                      )}
                    </button>
                    
                    <button 
                      onClick={() => exportChart('pdf')}
                      disabled={isExporting}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: isExporting ? 'not-allowed' : 'pointer',
                        opacity: isExporting ? 0.6 : 1,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => !isExporting && (e.target.style.background = 'rgba(255, 255, 255, 0.3)')}
                      onMouseLeave={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
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
                  </>
                )}
                
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
            </div>
            
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