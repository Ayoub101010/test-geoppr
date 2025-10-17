import React, { useRef, useEffect, useState } from "react";
import Chart from "chart.js/auto";
import "./InfrastructureDonut.css";
import api from "./api";
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
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [rawStats, setRawStats] = useState({});
  const [allStats, setAllStats] = useState({}); // Toutes les données complètes
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('categories'); // 'categories' ou 'detailed'
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  //  FILTRES INTÉGRÉS INDÉPENDANTS - INVISIBLES (même style qu'avant)
  const [modalFilters, setModalFilters] = useState({
    region: '',
    prefecture: '',
    commune_id: '',
    types: []
  });

  // Fonction pour vérifier si l'utilisateur peut exporter
  const canExport = () => {
    if (!user) return false;
    return user.role === 'super_admin' || user.role === 'admin';
  };

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

  // Mapping des catégories
  const categoryMapping = {
    "Pistes": ["pistes"],
    "Chaussées": ["chaussees"],
    "Ouvrages": ["buses", "dalots", "ponts", "passages", "bacs"],
    "Infrastructures rurales": [
      "localites", "ecoles", "marches", "administratifs", 
      "hydrauliques", "sante", "autres"
    ]
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

  // Couleurs pour les catégories
  const categoryColors = {
    "Pistes": "#4e73df",
    "Chaussées": "#8e44ad",
    "Ouvrages": "#1cc88a", 
    "Infrastructures rurales": "#f6c23e"
  };

  // Couleurs pour les types détaillés
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

  //  NORMALISER les données backend vers frontend
  const normalizeStats = (backendStats) => {
    const normalizedStats = {};
    
    Object.keys(backendStats).forEach(backendKey => {
      const frontendKey = backendToFrontend[backendKey] || backendKey;
      normalizedStats[frontendKey] = backendStats[backendKey];
    });
    
    console.log("🔄 [Donut] Stats normalisées:", normalizedStats);
    return normalizedStats;
  };

  //  NOUVEAU - Récupérer les filtres INDÉPENDANTS de la modal (pas ceux de gauche)
  const getModalFilters = () => {
    //  UTILISE LES FILTRES INTÉGRÉS DU COMPOSANT (pas ceux de gauche)
    return {
      region: modalFilters.region,
      prefecture: modalFilters.prefecture,
      commune_id: modalFilters.commune_id,
      types: modalFilters.types,
    };
  };

  //  CHARGER TOUTES LES DONNÉES UNE SEULE FOIS (optimisation performance)
  const loadAllData = async () => {
    setLoading(true);
    try {
      console.log("📊 [Donut] Chargement TOUTES les données (vue initiale - INDÉPENDANT)");
      
      //  AUCUN FILTRE - Récupérer TOUTES les données
      const result = await api.statistiques.getStatsByType({});
      
      if (result.success) {
        const backendStats = result.data;
        const normalizedStats = normalizeStats(backendStats);
        
        console.log("✅ [Donut] Toutes les stats normalisées:", normalizedStats);
        setAllStats(normalizedStats);
        
        // Construire la vue initiale (catégories avec TOUTES les données)
        buildCategoryData(normalizedStats);
      } else {
        console.error("❌ [Donut] Erreur API:", result.error);
        setChartData({ labels: [], datasets: [] });
      }
    } catch (error) {
      console.error("💥 [Donut] Erreur lors du chargement:", error);
      setChartData({ labels: [], datasets: [] });
    } finally {
      setLoading(false);
    }
  };

  //  CHARGER DONNÉES FILTRÉES INDÉPENDANTES (pour modal seulement - optimisé)
  const loadFilteredData = async () => {
    if (!isExpanded) return; // Seulement pour la modal
    
    try {
      console.log("🔍 [Donut] Application filtres modal INDÉPENDANTS");
      
      const filters = getModalFilters(); //  UTILISE LES FILTRES INDÉPENDANTS
      
      //  RÉUTILISER les données existantes si pas de filtres géographiques
      if (!filters.region && !filters.prefecture && !filters.commune_id) {
        console.log("🚀 [Donut] Réutilisation données existantes (plus rapide)");
        
        let filteredStats = { ...allStats };
        
        // Appliquer seulement les filtres de types INDÉPENDANTS
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
      
      //  SEULEMENT si filtres géographiques, faire appel API
      setLoading(true);
      const result = await api.statistiques.getStatsByType(filters);
      
      if (result.success) {
        const backendStats = result.data;
        const normalizedStats = normalizeStats(backendStats);
        
        console.log("✅ [Donut] Stats filtrées normalisées:", normalizedStats);
        setRawStats(normalizedStats);
        
        // Appliquer le filtrage supplémentaire si nécessaire
        const filteredStats = {};
        if (filters.types.length === 0) {
          Object.assign(filteredStats, normalizedStats);
        } else {
          filters.types.forEach(type => {
            if (normalizedStats[type]) {
              filteredStats[type] = normalizedStats[type];
            }
          });
        }
        
        buildChartData(filteredStats);
      } else {
        console.error("❌ [Donut] Erreur API filtres:", result.error);
        setChartData({ labels: [], datasets: [] });
      }
    } catch (error) {
      console.error("💥 [Donut] Erreur lors du chargement filtré:", error);
      setChartData({ labels: [], datasets: [] });
    } finally {
      setLoading(false);
    }
  };

  //  GESTION DU CLIC SUR TOUT LE CONTENEUR (pas seulement les sections)
  const handleContainerClick = (e) => {
    if (!isExpanded) {
      console.log("🖱️ [Donut] Clic sur conteneur - Ouverture modal");
      setIsExpanded(true);
      setViewMode('detailed');
    }
  };

  // Construire les données du graphique
  const buildChartData = (stats) => {
    console.log(`🎯 [Donut] Mode: ${viewMode}, Stats reçues:`, stats);
    
    if (viewMode === 'categories') {
      buildCategoryData(stats);
    } else {
      buildDetailedData(stats);
    }
  };

  //  VUE PAR CATÉGORIES
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

  //  VUE DÉTAILLÉE
  const buildDetailedData = (stats) => {
    console.log("🔍 [Donut] Construction vue détaillée avec:", stats);

    //  UTILISER LES FILTRES INDÉPENDANTS (pas ceux de gauche)
    if (isExpanded) {
      const filters = getModalFilters(); //  INDÉPENDANT
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

    // Vérifier qu'on a des données
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

  // ✅ Fonction d'export AMÉLIORÉE (haute qualité + titre + date)
  const exportChart = async (format = 'png') => {
    setIsExporting(true);
    try {
      // Capturer seulement le contenu du graphique (sans les boutons)
      const chartElement = isExpanded 
        ? document.querySelector('.chart-expanded-content')
        : containerRef.current;
      
      // Masquer temporairement les boutons pour ne pas les capturer
      const exportButtons = document.querySelectorAll('.chart-expanded-header button');
      exportButtons.forEach(btn => btn.style.visibility = 'hidden');
      
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 3,  // Haute qualité
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      // Restaurer les boutons
      exportButtons.forEach(btn => btn.style.visibility = 'visible');

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `Capacite_Infrastructure_${new Date().toISOString().split('T')[0]}.png`;
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
        
        // ✅ AJOUTER LE TITRE
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('Capacité par Domaine d\'Infrastructure', pdfWidth / 2, 15, { align: 'center' });
        
        // ✅ AJOUTER LA DATE
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        const dateStr = new Date().toLocaleDateString('fr-FR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        pdf.text(`Généré le ${dateStr}`, pdfWidth / 2, 22, { align: 'center' });
        
        // Calculer l'espace pour le graphique
        let finalWidth, finalHeight;
        const margin = 10;
        const topMargin = 30; // Espace pour le titre et date
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
        pdf.save(`Capacite_Infrastructure_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export. Veuillez réessayer.');
    } finally {
      setIsExporting(false);
    }
  };

  // Options du graphique
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
              
              return data.labels.map((label, i) => {
                const value = dataset.data[i];
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                
                return {
                  text: `${label} (${value} - ${percentage}%)`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.borderColor,
                  lineWidth: dataset.borderWidth,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        },
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

  // Créer/mettre à jour le graphique
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
      });
    }
  };

  // Gérer la fermeture
  const handleCloseExpanded = (e) => {
    if (e.target.classList.contains('chart-overlay')) {
      console.log("❌ [Donut] Fermeture modal - Retour vue complète");
      setIsExpanded(false);
      setViewMode('categories');
      buildCategoryData(allStats);
    }
  };

  //  EFFECTS OPTIMISÉS
  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isExpanded) {
      loadFilteredData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded && Object.keys(rawStats).length > 0) {
      buildChartData(rawStats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, rawStats]);

  useEffect(() => {
    if (isExpanded) {
      loadFilteredData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalFilters]);

  useEffect(() => {
    renderChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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