// src/components/api.js
const API_BASE_URL = 'http://localhost:8000/api';

// Configuration générale
const apiConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
};

// Fonction utilitaire pour les appels HTTP
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...apiConfig,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`Erreur API ${endpoint}:`, error);
    return { success: false, error: error.message };
  }
};

// ===== COLLECTES ET DONNÉES SPATIALES =====

export const collectesAPI = {
  getWithFilters: (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.commune_id) {
      params.append('commune_id', filters.commune_id);
    }
    
    if (filters.types && filters.types.length > 0) {
      params.append('types', filters.types.join(','));
    }
    
    if (filters.zoom) {
      params.append('zoom', filters.zoom);
    }
    
    if (filters.bbox) {
      params.append('bbox', filters.bbox);
    }
    
    return apiCall(`/collectes/?${params.toString()}`);
  },

  // AJOUTEZ CETTE LIGNE
  getAll: () => apiCall('/collectes/'),
};

// ===== STATISTIQUES =====

export const statistiquesAPI = {
  getStatsByType: async (filters = {}) => {
    try {
      // Utiliser l'API spatial existante
      const params = new URLSearchParams();
      
      if (filters.commune_id) {
        params.append('commune_id', filters.commune_id);
      }
      
      if (filters.region) {
        params.append('region', filters.region);
      }
      
      if (filters.prefecture) {
        params.append('prefecture', filters.prefecture);
      }
      
      // Convertir les types frontend vers backend
      const typeMapping = {
        'pistes': 'pistes',
        'chaussees': 'chaussees', 
        'buses': 'buses',
        'dalots': 'dalots',
        'ponts': 'ponts',
        'passages': 'passages_submersibles',
        'bacs': 'bacs',
        'localites': 'localites',
        'ecoles': 'ecoles',
        'marches': 'marches',
        'administratifs': 'batiments_administratifs',
        'hydrauliques': 'infrastructures_hydrauliques',
        'sante': 'services_santes',
        'autres': 'autres_infrastructures'
      };
      
      // Convertir les types si fournis
      if (filters.types && filters.types.length > 0) {
        const backendTypes = filters.types.map(type => typeMapping[type] || type);
        backendTypes.forEach(type => params.append('types', type));
      }
      
      // Appeler l'API spatiale existante
      const result = await collectesAPI.getWithFilters(filters);
      
      if (result.success && result.data.features) {
        // Compter les occurrences par type
        const stats = {};
        
        result.data.features.forEach(feature => {
          const type = feature.properties.type;
          if (type) {
            stats[type] = (stats[type] || 0) + 1;
          }
        });
        
        return { success: true, data: stats };
      }
      
      return { success: false, error: 'Aucune donnée retournée' };
      
    } catch (error) {
      console.error('Erreur API statistiques:', error);
      return { success: false, error: error.message };
    }
  },
};

// ===== ANALYSE TEMPORELLE =====

export const temporalAnalysisAPI = {
  getTemporalData: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Paramètres de base
      if (filters.period_type) params.append('period_type', filters.period_type);
      if (filters.days_back) params.append('days_back', filters.days_back);
      if (filters.commune_id) params.append('commune_id', filters.commune_id);
      
      // Paramètres de dates personnalisées
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      // Paramètres spécifiques année/mois/jour
      if (filters.year) params.append('year', filters.year);
      if (filters.month) params.append('month', filters.month);
      if (filters.day) params.append('day', filters.day);
      
      // Types d'infrastructure
      if (filters.types && filters.types.length > 0) {
        filters.types.forEach(type => params.append('types', type));
      }
      
      console.log("🌍 URL construite:", `/temporal-analysis/?${params.toString()}`);
      
      return apiCall(`/temporal-analysis/?${params.toString()}`);
    } catch (error) {
      console.error('Erreur API analyse temporelle:', error);
      return { success: false, error: error.message };
    }
  }
};

// ===== COMMUNES =====

export const communesAPI = {
  // ✅ CORRECTION : URL corrigée pour correspondre au backend
  search: (query) => {
    if (!query || query.length < 2) {
      return Promise.resolve({ success: true, data: { communes: [], total: 0 } });
    }
    // URL corrigée : /api/communes/search/ au lieu de /communes/search/
    return apiCall(`/communes/search/?q=${encodeURIComponent(query)}`);
  },
  
  // Toutes les communes (pour sélecteur simple)
  getAll: (page = 1, limit = 1000) => 
    apiCall(`/communes_rurales/?page=${page}&limit=${limit}`),
};

// ===== TYPES D'INFRASTRUCTURES =====

export const typesAPI = {
  // Liste des types disponibles
  getAll: () => apiCall('/types/'),
  
  // Types avec icônes et couleurs
  getWithConfig: () => apiCall('/types/'),
};

// ===== AUTHENTIFICATION =====

export const authAPI = {
  // Login utilisateur
  login: (credentials) => apiCall('/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  // Liste des utilisateurs (pour admin)
  getUsers: () => apiCall('/login/'),
  
  // Créer un utilisateur
  createUser: (userData) => apiCall('/login/', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
};

// ===== DONNÉES GÉOGRAPHIQUES =====

export const geoAPI = {
  // Régions
  regions: {
    getAll: () => apiCall('/regions/'),
    getById: (id) => apiCall(`/regions/${id}/`),
  },
  
  // Préfectures
  prefectures: {
    getAll: () => apiCall('/prefectures/'),
    getById: (id) => apiCall(`/prefectures/${id}/`),
    getByRegion: (regionId) => apiCall(`/prefectures/?region_id=${regionId}`),
  },
  
  // Communes avec filtrage
  communes: {
    getAll: () => apiCall('/communes_rurales/'),
    getByPrefecture: (prefectureId) => apiCall(`/communes_rurales/?prefecture_id=${prefectureId}`),
    search: (query) => communesAPI.search(query),
  }
};

// ===== INFRASTRUCTURES SPÉCIFIQUES =====

export const infrastructureAPI = {
  // Services de santé
  servicesSantes: {
    getAll: () => apiCall('/services_santes/'),
    create: (data) => apiCall('/services_santes/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  
  // Écoles
  ecoles: {
    getAll: () => apiCall('/ecoles/'),
    create: (data) => apiCall('/ecoles/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  
  // Pistes
  pistes: {
    getAll: () => apiCall('/pistes/'),
    create: (data) => apiCall('/pistes/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  
  // Ponts
  ponts: {
    getAll: () => apiCall('/ponts/'),
    create: (data) => apiCall('/ponts/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  
  // Autres infrastructures (extensible)
  autres: {
    bacs: () => apiCall('/bacs/'),
    buses: () => apiCall('/buses/'),
    dalots: () => apiCall('/dalots/'),
    marches: () => apiCall('/marches/'),
    batimentsAdministratifs: () => apiCall('/batiments_administratifs/'),
    infrastructuresHydrauliques: () => apiCall('/infrastructures_hydrauliques/'),
    localites: () => apiCall('/localites/'),
    passagesSubmersibles: () => apiCall('/passages_submersibles/'),
    autresInfrastructures: () => apiCall('/autres_infrastructures/'),
  },
};

// ===== UTILITAIRES =====

export const apiUtils = {
  // Configuration de base
  setBaseUrl: (newUrl) => {
    API_BASE_URL = newUrl;
  },
  
  // Test de connexion
  healthCheck: () => apiCall('/types/'), // Endpoint simple pour tester
  
  // Gestion des erreurs globales
  handleError: (error) => {
    console.error('Erreur API globale:', error);
    // Ici tu peux ajouter des notifications toast, etc.
  },
};

// Export par défaut avec toutes les APIs
export default {
  collectes: collectesAPI,
  statistiques: statistiquesAPI,
  temporalAnalysis: temporalAnalysisAPI,
  communes: communesAPI,
  types: typesAPI,
  auth: authAPI,
  geo: geoAPI,
  infrastructure: infrastructureAPI,
  utils: apiUtils,
};