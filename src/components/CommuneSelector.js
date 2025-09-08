import React, { useState, useEffect } from 'react';

const CommuneSelector = ({ onCommuneChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [communes, setCommunes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCommune, setSelectedCommune] = useState(null);

  // Test direct avec fetch (contourne le wrapper API)
  const searchCommunes = async (query) => {
    if (!query || query.length < 2) {
      setCommunes([]);
      return;
    }

    setLoading(true);
    try {
      console.log(`Recherche directe: "${query}"`);
      
      const response = await fetch(`http://localhost:8000/api/communes/search/?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Réponse API:', data);
      
      if (data.communes && Array.isArray(data.communes)) {
        setCommunes(data.communes);
        console.log(`${data.communes.length} communes trouvées`);
      } else {
        console.warn('Format de réponse inattendu:', data);
        setCommunes([]);
      }
      
    } catch (error) {
      console.error('Erreur recherche communes:', error);
      setCommunes([]);
    } finally {
      setLoading(false);
    }
  };

  // Déclencher la recherche quand on tape
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCommunes(searchTerm);
    }, 300); // Délai pour éviter trop de requêtes

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    
    // Reset selection si on modifie
    if (selectedCommune) {
      setSelectedCommune(null);
      onCommuneChange('');
    }
  };

  const handleCommuneSelect = (commune) => {
    console.log('Commune sélectionnée:', commune);
    setSelectedCommune(commune);
    setSearchTerm(commune.nom);
    onCommuneChange(commune.id);
    
    // Zoom si disponible
    if (window.zoomToCommune) {
      window.zoomToCommune(commune);
    }
  };

  const clearSelection = () => {
    setSelectedCommune(null);
    setSearchTerm('');
    setCommunes([]);
    onCommuneChange('');
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Input de recherche */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Rechercher une commune..."
          value={searchTerm}
          onChange={handleInputChange}
          className="filter-select"
          style={{ 
            paddingRight: selectedCommune ? '30px' : '10px',
            background: selectedCommune ? '#e8f5e8' : 'white'
          }}
          disabled={loading}
        />
        
        {selectedCommune && (
          <button
            onClick={clearSelection}
            style={{
              position: 'absolute',
              right: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#666',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Liste des résultats */}
      {searchTerm && !selectedCommune && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #ddd',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {loading && (
            <div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
              Recherche en cours...
            </div>
          )}
          
          {!loading && communes.length > 0 && communes.map((commune) => (
            <div
              key={commune.id}
              onClick={() => handleCommuneSelect(commune)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
              onMouseLeave={(e) => e.target.style.background = 'white'}
            >
              <div style={{ fontWeight: '500' }}>{commune.nom}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {commune.prefecture} • {commune.region}
              </div>
            </div>
          ))}
          
          {!loading && searchTerm.length >= 2 && communes.length === 0 && (
            <div style={{ padding: '12px', color: '#666', textAlign: 'center' }}>
              Aucune commune trouvée pour "{searchTerm}"
            </div>
          )}
        </div>
      )}

      {/* Statut */}
      <div style={{ fontSize: '11px', marginTop: '4px', color: '#666' }}>
        {loading && 'Recherche...'}
        {selectedCommune && `${selectedCommune.nom} (${selectedCommune.prefecture})`}
        {!loading && !selectedCommune && searchTerm.length < 2 && 'Tapez au moins 2 caractères'}
      </div>

      {/* Input caché pour compatibilité */}
      <input
        type="hidden"
        id="communeFilter"
        value={selectedCommune ? selectedCommune.id : ''}
        readOnly
      />
    </div>
  );
};

export default CommuneSelector;