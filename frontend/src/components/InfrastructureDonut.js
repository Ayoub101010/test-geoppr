import React, { useRef, useEffect, useState } from "react";
import Chart from "chart.js/auto";
import "./InfrastructureDonut.css";
import useInfrastructureData from "./useinfrastructuredata";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from './AuthContext';

const InfrastructureDonut = () => {
  const chartRef = useRef(null);
  const modalChartRef = useRef(null); 
  const chartInstance = useRef(null);
  const modalChartInstance = useRef(null);
  const containerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // ✅ NOUVEAU: Utiliser le hook au lieu de l'API
  const { globalStats, loading: dataLoading, error: dataError } = useInfrastructureData();
  
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [rawStats, setRawStats] = useState({});
  const [allStats, setAllStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('categories');
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const [modalFilters, setModalFilters] = useState({
    region: '',
    prefecture: '',
    commune_id: '',
    types: []
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

  const categoryMapping = {
    "Pistes": ["pistes"],
    "Chaussées": ["chaussees"],
    "Ouvrages": ["buses", "dalots", "ponts", "passages", "bacs"],
    "Infrastructures rurales": [
      "localites", "ecoles", "marches", "administratifs", 
      "hydrauliques", "sante", "autres"
    ]
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

  const categoryColors = {
    "Pistes": "#4e73df",
    "Chaussées": "#8e44ad",
    "Ouvrages": "#1cc88a", 
    "Infrastructures rurales": "#f6c23e"
  };

  const typeColors = {
    pistes: "#4e73df",
    chaussees: "#8e44ad",
    buses: "#e74c3c",
    dalots: "#3498db",
    ponts: "#9b59b6",
    passages: "#1abc9c",
    bacs: "#f39c12",
    localites: "#e67e22",
    ecoles: "#27ae60",
    marches: "#f1c40f",
    administratifs: "#34495e",
    hydrauliques: "#36b9cc",
    sante: "#e74a3b",
    autres: "#95a5a6"
  };

  const normalizeStats = (backendStats) => {
    const normalizedStats = {};
    
    Object.keys(backendStats).forEach(backendKey => {
      const frontendKey = backendToFrontend[backendKey] || backendKey;
      normalizedStats[frontendKey] = backendStats[backendKey];
    });
    
    console.log("🔄 [Donut] Stats normalisées:", normalizedStats);
    return normalizedStats;
  };

  const getModalFilters = () => {
    return {
      region: modalFilters.region,
      prefecture: modalFilters.prefecture,
      commune_id: modalFilters.commune_id,
      types: modalFilters.types,
    };
  };

  // ✅ MODIFIÉ: Charger depuis le hook au lieu de l'API
  useEffect(() => {
    if (!dataLoading && globalStats && Object.keys(globalStats).length > 0) {
      console.log("📊 [Donut] Chargement depuis le hook (cache)");
      
      const normalizedStats = normalizeStats(globalStats);
      
      const excludedTypes = ['points_coupures', 'points_critiques'];
      const filteredStats = {};
      
      Object.keys(normalizedStats).forEach(key => {
        if (!excludedTypes.includes(key)) {
          filteredStats[key] = normalizedStats[key];
        }
      });
      
      console.log("[Donut] Stats filtrées (sans surveillance):", filteredStats);
      setAllStats(filteredStats);
      buildCategoryData(filteredStats);
      setLoading(false);
    }
    
    if (dataError) {
      console.error("❌ [Donut] Erreur:", dataError);
      setLoading(false);
    }
  }, [globalStats, dataLoading, dataError]);

  const loadFilteredData = async () => {
    if (!isExpanded) return;
    
    try {
      console.log("🔍 [Donut] Application filtres modal INDÉPENDANTS");
      
      const filters = getModalFilters();
      
      if (!filters.region && !filters.prefecture && !filters.commune_id) {
        console.log("🚀 [Donut] Réutilisation données existantes (plus rapide)");
        
        let filteredStats = { ...allStats };
        
        if (filters.types.length > 0) {
          const filtered = {};
          filters.types.forEach(type => {
            if (filteredStats[type]) {
              filtered[type] = filteredStats[type];
            }
          });
          filteredStats = filtered;
        }
        
        setRawStats(filteredStats);
        buildChartData(filteredStats);
        return;
      }
      
      // Note: Pour les filtres géographiques, on utilise les données existantes
      // car on n'a plus accès à l'API directement
      console.log("⚠️ [Donut] Filtres géographiques non supportés avec le cache");
      setRawStats(allStats);
      buildChartData(allStats);
      
    } catch (error) {
      console.error("💥 [Donut] Erreur lors du chargement filtré:", error);
      setChartData({ labels: [], datasets: [] });
    }
  };

  const handleContainerClick = (e) => {
    if (!isExpanded) {
      console.log("🖱️ [Donut] Clic sur conteneur - Ouverture modal");
      setIsExpanded(true);
      setViewMode('detailed');
    }
  };

  const buildChartData = (stats) => {
    console.log(`🎯 [Donut] Mode: ${viewMode}, Stats reçues:`, stats);
    
    if (viewMode === 'categories') {
      buildCategoryData(stats);
    } else {
      buildDetailedData(stats);
    }
  };

  const buildCategoryData = (stats) => {
    console.log("📊 [Donut] Construction vue catégories avec:", stats);
    
    const categoryStats = {};
    
    Object.keys(categoryMapping).forEach(category => {
      const types = categoryMapping[category];
      let total = 0;
      
      types.forEach(type => {
        if (stats[type]) {
          total += stats[type];
          console.log(`   ${category} += ${stats[type]} (type: ${type})`);
        }
      });
      
      if (total > 0) {
        categoryStats[category] = total;
        console.log(`🎯 ${category}: ${total} éléments`);
      }
    });

    console.log("📈 [Donut] Stats par catégorie:", categoryStats);

    const labels = Object.keys(categoryStats);
    const values = Object.values(categoryStats);
    const colors = labels.map(label => categoryColors[label] || "#95a5a6");

    setChartData({
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: "#ffffff"
      }]
    });
  };

  const buildDetailedData = (stats) => {
    console.log("🔍 [Donut] Construction vue détaillée avec:", stats);

    if (isExpanded) {
      const filters = getModalFilters();
      const activeStats = {};
      
      if (filters.types.length === 0) {
        Object.assign(activeStats, stats);
      } else {
        Object.keys(stats).forEach(type => {
          if (filters.types.includes(type)) {
            activeStats[type] = stats[type];
          }
        });
      }
      stats = activeStats;
    }

    if (Object.keys(stats).length === 0) {
      setChartData({ labels: [], datasets: [] });
      return;
    }

    const labels = Object.keys(stats).map(type => typeLabels[type] || type);
    const values = Object.values(stats);
    const colors = Object.keys(stats).map(type => typeColors[type] || "#95a5a6");

    console.log("🎨 [Donut] Vue détaillée construite:", { labels, values });

    setChartData({
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: "#ffffff"
      }]
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
        const finalCanvas = document.createElement('canvas');
        const titleHeight = 80;
        finalCanvas.width = canvas.width;
        finalCanvas.height = canvas.height + titleHeight;
        
        const ctx = finalCanvas.getContext('2d');
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Répartitions par domaine d\'infrastructure', finalCanvas.width / 2, 40);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = '#666666';
        const dateStr = new Date().toLocaleDateString('fr-FR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        ctx.fillText(`Généré le ${dateStr}`, finalCanvas.width / 2, 70);
        
        ctx.drawImage(canvas, 0, titleHeight);
        
        const link = document.createElement('a');
        link.download = `Repartitions_Infrastructure_${new Date().toISOString().split('T')[0]}.png`;
        link.href = finalCanvas.toDataURL('image/png', 1.0);
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
        pdf.text('Répartitions par Domaine d\'Infrastructure', pdfWidth / 2, 15, { align: 'center' });
        
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
        pdf.save(`Repartitions_Infrastructure_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  const getChartOptions = (expanded = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: expanded ? "right" : "top",
        labels: {
          usePointStyle: true,
          boxWidth: expanded ? 15 : 13,
          padding: expanded ? 12 : 8,
          font: {
            size: expanded ? 14 : 11,
          },
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              const dataset = data.datasets[0];
              const total = dataset.data.reduce((acc, value) => acc + value, 0);
              const meta = chart.getDatasetMeta(0);
              
              return data.labels.map((label, i) => {
                const value = dataset.data[i];
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                const isHidden = meta.data[i] && meta.data[i].hidden;
                
                return {
                  text: `${label} (${value} - ${percentage}%)`,
                  fillStyle: isHidden ? '#cccccc' : dataset.backgroundColor[i],
                  strokeStyle: dataset.borderColor,
                  lineWidth: dataset.borderWidth,
                  hidden: isHidden,
                  index: i,
                  fontColor: isHidden ? '#999999' : '#2d3748'
                };
              });
            }
            return [];
          }
        },
        onClick: (e, legendItem, legend) => {
          const index = legendItem.index;
          const chart = legend.chart;
          const meta = chart.getDatasetMeta(0);
          
          meta.data[index].hidden = !meta.data[index].hidden;
          chart.update();
        }
      },
      tooltip: {
        backgroundColor: "#ffffff",
        titleColor: "#2d3748",
        bodyColor: "#2d3748",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        padding: expanded ? 12 : 8,
        cornerRadius: 6,
        titleFont: {
          size: expanded ? 14 : 12,
          weight: "bold",
        },
        bodyFont: {
          size: expanded ? 12 : 11,
        },
        callbacks: {
          label: function (context) {
            const label = context.label;
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            
            return `${label}: ${value} éléments (${percentage}%)`;
          },
        },
      },
    },
    onHover: (event, elements) => {
      if (!expanded) {
        const canvas = event.native.target;
        canvas.style.cursor = 'pointer';
      }
    }
  });

  const strikethroughLegendPlugin = {
    id: 'strikethroughLegend',
    afterDraw: (chart) => {
      const legend = chart.legend;
      if (!legend || !legend.legendItems) return;

      const ctx = chart.ctx;
      const items = legend.legendItems;

      items.forEach((item, index) => {
        const meta = chart.getDatasetMeta(0);
        if (meta.data[index] && meta.data[index].hidden) {
          const legendX = legend.left;
          const legendY = legend.top;
          
          const textX = item.text.x || (legendX + item.left);
          const textY = item.text.y || (legendY + item.top + (item.height / 2));
          const textWidth = ctx.measureText(item.text.text || item.text).width;

          ctx.save();
          ctx.strokeStyle = '#999999';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(textX, textY);
          ctx.lineTo(textX + textWidth, textY);
          ctx.stroke();
          ctx.restore();
        }
      });
    }
  };

  const renderChart = () => {
    if (!isExpanded) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      if (chartData.labels.length === 0 || !chartRef.current) return;

      const ctx = chartRef.current.getContext("2d");
      chartInstance.current = new Chart(ctx, {
        type: "doughnut",
        data: chartData,
        options: getChartOptions(false),
        plugins: [strikethroughLegendPlugin]
      });
    } else {
      if (modalChartInstance.current) {
        modalChartInstance.current.destroy();
      }

      if (chartData.labels.length === 0 || !modalChartRef.current) return;

      const ctx = modalChartRef.current.getContext("2d");
      modalChartInstance.current = new Chart(ctx, {
        type: "doughnut",
        data: chartData,
        options: getChartOptions(true),
        plugins: [strikethroughLegendPlugin]
      });
    }
  };

  const handleCloseExpanded = (e) => {
    if (e.target.classList.contains('chart-overlay')) {
      console.log("❌ [Donut] Fermeture modal - Retour vue complète");
      setIsExpanded(false);
      setViewMode('categories');
      buildCategoryData(allStats);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      loadFilteredData();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded && Object.keys(rawStats).length > 0) {
      buildChartData(rawStats);
    }
  }, [viewMode, rawStats]);

  useEffect(() => {
    if (isExpanded) {
      loadFilteredData();
    }
  }, [modalFilters]);

  useEffect(() => {
    renderChart();
  }, [chartData, isExpanded]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      if (modalChartInstance.current) {
        modalChartInstance.current.destroy();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="donut-wrapper">
        <h2>Capacité par Domaine d'Infrastructure</h2>
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="donut-wrapper" ref={containerRef}>
        <h2>Capacité par Domaine d'Infrastructure</h2>
        
        {chartData.labels.length === 0 ? (
          <div className="chart-empty">
            <p>Aucune donnée disponible</p>
          </div>
        ) : (
          <div className="chart-container" onClick={handleContainerClick}>
            <canvas ref={chartRef} />
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="chart-overlay" onClick={handleCloseExpanded}>
          <div className="chart-expanded">
            <div className="chart-expanded-header">
              <h3>Infrastructure - Vue détaillée par type</h3>
              
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
                    console.log("❌ [Donut] Bouton fermeture cliqué");
                    setIsExpanded(false);
                    setViewMode('categories');
                    buildCategoryData(allStats);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="chart-expanded-content">
              <canvas ref={modalChartRef} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InfrastructureDonut;