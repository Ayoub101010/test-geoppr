import React, { useState, useEffect } from 'react';
import './MapLegend.css';

const MapLegend = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState(new Set());

  // Configuration des icônes et couleurs (cohérente avec MapContainer)
  const legendItems = [
    // Infrastructures de transport
    { 
      category: "Transport & Ouvrages",
      items: [
        { type: "pistes", label: "Pistes", icon: "road", color: "#2C3E50" },
        { type: "ponts", label: "Ponts", icon: "bridge", color: "#9B59B6" },
        { type: "buses", label: "Buses", icon: "bus", color: "#E74C3C" },
        { type: "dalots", label: "Dalots", icon: "water", color: "#3498DB" },
        { type: "bacs", label: "Bacs", icon: "ship", color: "#F39C12" },
        { type: "passages", label: "Passages submersibles", icon: "water", color: "#1ABC9C" }
      ]
    },
    // Infrastructures rurales
    {
      category: "Infrastructures Rurales",
      items: [
        { type: "localites", label: "Localités", icon: "home", color: "#E67E22" },
        { type: "ecoles", label: "Écoles", icon: "graduation-cap", color: "#27AE60" },
        { type: "sante", label: "Services de santé", icon: "hospital", color: "#E74C3C" },
        { type: "marches", label: "Marchés", icon: "shopping-cart", color: "#F1C40F" },
        { type: "administratifs", label: "Bât. administratifs", icon: "building", color: "#34495E" },
        { type: "hydrauliques", label: "Infra. hydrauliques", icon: "tint", color: "#3498DB" },
        { type: "autres", label: "Autres infrastructures", icon: "map-pin", color: "#95A5A6" }
      ]
    }
  ];

  // Surveiller les filtres actifs
  useEffect(() => {
    const updateVisibleTypes = () => {
      const checkedTypes = Array.from(
        document.querySelectorAll('.filter-checkbox-group input[type="checkbox"]:checked')
      ).map(cb => cb.id);
      
      setVisibleTypes(new Set(checkedTypes));
    };

    // Mise à jour initiale
    updateVisibleTypes();

    // Écouter les changements de filtres
    const filterInputs = document.querySelectorAll('.filter-checkbox-group input[type="checkbox"]');
    filterInputs.forEach(input => {
      input.addEventListener('change', updateVisibleTypes);
    });

    return () => {
      filterInputs.forEach(input => {
        input.removeEventListener('change', updateVisibleTypes);
      });
    };
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const createLegendIcon = (item) => {
    return (
      <div 
        className="legend-icon"
        style={{ backgroundColor: item.color }}
      >
        <i className={`fas fa-${item.icon}`}></i>
      </div>
    );
  };

  return (
    <div className={`map-legend ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header avec bouton de réduction */}
      <div className="legend-header" onClick={toggleCollapse}>
        <div className="legend-title">
          <i className="fas fa-map-signs"></i>
          <span>Légende</span>
        </div>
        <button className="legend-toggle">
          <i className={`fas fa-chevron-${isCollapsed ? 'up' : 'down'}`}></i>
        </button>
      </div>

      {/* Contenu de la légende */}
      {!isCollapsed && (
        <div className="legend-content">
          {legendItems.map((category, categoryIndex) => (
            <div key={categoryIndex} className="legend-category">
              <div className="legend-category-title">
                {category.category}
              </div>
              
              <div className="legend-items">
                {category.items.map((item, itemIndex) => {
                  const isVisible = visibleTypes.has(item.type);
                  
                  return (
                    <div 
                      key={itemIndex} 
                      className={`legend-item ${!isVisible ? 'disabled' : ''}`}
                      title={isVisible ? `${item.label} - Visible` : `${item.label} - Masqué`}
                    >
                      {createLegendIcon(item)}
                      <span className="legend-label">{item.label}</span>
                      {!isVisible && (
                        <i className="fas fa-eye-slash legend-hidden-icon"></i>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Footer avec info */}
          <div className="legend-footer">
            <small>
              <i className="fas fa-info-circle"></i>
              {visibleTypes.size} type(s) affiché(s)
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapLegend;