/**
 * Service de chargement des donnees depuis les APIs
 * Charge toutes les APIs en parallele pour optimiser les performances
 */

const API_BASE_URL = 'http://localhost:8000/api';

// Configuration des endpoints
const ENDPOINTS = {
  // Base
  pistes: '/pistes/',
  
  // Voirie
  chaussees: '/chaussees/',
  
  // Ouvrages hydrauliques
  buses: '/buses/',
  dalots: '/dalots/',
  ponts: '/ponts/',
  passages_submersibles: '/passages_submersibles/',
  bacs: '/bacs/',
  
  // Infrastructures sociales
  ecoles: '/ecoles/',
  marches: '/marches/',
  services_santes: '/services_santes/',
  batiments_administratifs: '/batiments_administratifs/',
  infrastructures_hydrauliques: '/infrastructures_hydrauliques/',
  localites: '/localites/',
  autres_infrastructures: '/autres_infrastructures/',
  
  // Points de surveillance (pour la carte uniquement)
  points_coupures: '/points_coupures/',
  points_critiques: '/points_critiques/'
};

// Types d'infrastructures pour Dashboard + Graphiques (14 types)
const INFRASTRUCTURE_TYPES = [
  'pistes',
  'chaussees',
  'buses',
  'dalots',
  'ponts',
  'passages_submersibles',
  'bacs',
  'ecoles',
  'marches',
  'services_santes',
  'batiments_administratifs',
  'infrastructures_hydrauliques',
  'localites',
  'autres_infrastructures'
];

// Types supplementaires pour la carte (16 types)
const MAP_TYPES = [
  ...INFRASTRUCTURE_TYPES,
  'points_coupures',
  'points_critiques'
];

class DataService {
  
  /**
   * Charger une API specifique
   */
  async fetchEndpoint(type) {
    const url = `${API_BASE_URL}${ENDPOINTS[type]}`;
    
    try {
      console.log('Fetching ' + type + ' from ' + url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // ✅ Gérer tous les formats de réponse possibles
      let actualData = data;
      
      // 1. Format Django REST Framework avec GeoJSON dans results
      if (data && typeof data === 'object' && 'results' in data) {
        const results = data.results;
        
        // Vérifier si results contient du GeoJSON
        if (results && typeof results === 'object' && results.type === 'FeatureCollection' && Array.isArray(results.features)) {
          actualData = results.features;
          console.log(type + ': ' + actualData.length + ' features loaded (DRF + GeoJSON)');
        }
        // Sinon, results est un array simple
        else if (Array.isArray(results)) {
          actualData = results;
          console.log(type + ': ' + actualData.length + ' items loaded (DRF paginated)');
        }
        // Sinon, format inattendu
        else {
          console.warn(type + ': unexpected results format:', results);
          actualData = [];
        }
      }
      // 2. Format GeoJSON direct (sans pagination)
      else if (data && data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        actualData = data.features;
        console.log(type + ': ' + actualData.length + ' features loaded (GeoJSON)');
      }
      // 3. Format array simple
      else if (Array.isArray(data)) {
        actualData = data;
        console.log(type + ': ' + data.length + ' items loaded (array)');
      }
      // 4. Format inconnu
      else {
        console.log(type + ': 0 items loaded (unexpected format)');
        actualData = [];
      }
      
      return {
        type,
        success: true,
        data: actualData,
        count: Array.isArray(actualData) ? actualData.length : 0
      };
      
    } catch (error) {
      console.error('Error fetching ' + type + ':', error);
      return {
        type,
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Charger toutes les infrastructures en parallele (14 types)
   */
  async loadAllInfrastructures() {
    console.log('Loading all infrastructures in parallel...');
    const startTime = performance.now();
    
    try {
      const promises = INFRASTRUCTURE_TYPES.map(type => this.fetchEndpoint(type));
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      const organizedData = {};
      let totalCount = 0;
      let successCount = 0;
      
      results.forEach(result => {
        organizedData[result.type] = result.data;
        if (result.success) {
          successCount++;
          totalCount += result.count;
        }
      });
      
      console.log('All infrastructures loaded in ' + duration + 's');
      console.log('Total: ' + totalCount + ' items from ' + successCount + '/' + INFRASTRUCTURE_TYPES.length + ' APIs');
      
      return {
        success: true,
        data: organizedData,
        duration,
        totalCount,
        successCount,
        failedCount: INFRASTRUCTURE_TYPES.length - successCount
      };
      
    } catch (error) {
      console.error('Error loading infrastructures:', error);
      return {
        success: false,
        error: error.message,
        data: {}
      };
    }
  }

  /**
   * Charger toutes les donnees pour la carte (16 types)
   */
  async loadMapData() {
    console.log('Loading map data in parallel...');
    const startTime = performance.now();
    
    try {
      const promises = MAP_TYPES.map(type => this.fetchEndpoint(type));
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      const organizedData = {};
      let totalCount = 0;
      let successCount = 0;
      
      results.forEach(result => {
        organizedData[result.type] = result.data;
        if (result.success) {
          successCount++;
          totalCount += result.count;
        }
      });
      
      console.log('Map data loaded in ' + duration + 's');
      console.log('Total: ' + totalCount + ' items from ' + successCount + '/' + MAP_TYPES.length + ' APIs');
      
      return {
        success: true,
        data: organizedData,
        duration,
        totalCount,
        successCount,
        failedCount: MAP_TYPES.length - successCount
      };
      
    } catch (error) {
      console.error('Error loading map data:', error);
      return {
        success: false,
        error: error.message,
        data: {}
      };
    }
  }

  async loadPistes() {
    return this.fetchEndpoint('pistes');
  }

  async loadType(type) {
    if (!ENDPOINTS[type]) {
      return {
        success: false,
        error: `Unknown type: ${type}`,
        data: []
      };
    }
    return this.fetchEndpoint(type);
  }

  async reloadAll() {
    console.log('Force reloading all data...');
    return this.loadAllInfrastructures();
  }
}

const dataservice = new DataService();
export default dataservice;
export { INFRASTRUCTURE_TYPES, MAP_TYPES, ENDPOINTS };