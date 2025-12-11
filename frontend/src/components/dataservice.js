/**
 * Service de chargement des données depuis les APIs
 * VERSION CORRIGÉE - Utilise les bons endpoints
 */

const API_BASE_URL = 'http://localhost:8000/api';

// Configuration des endpoints (sans /infrastructure/)
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
  
  // Points de surveillance
  points_coupures: '/points_coupures/',
  points_critiques: '/points_critiques/'
};

// Types d'infrastructures pour Dashboard (14 types - sans points surveillance)
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

// Types pour la carte (16 types - avec points surveillance)
const MAP_TYPES = [
  ...INFRASTRUCTURE_TYPES,
  'points_coupures',
  'points_critiques'
];

class DataService {
  
  /**
   * Charger un endpoint spécifique
   */
  async fetchEndpoint(type) {
    // ✅ BON CHEMIN: http://localhost:8000/api/pistes/
    const url = `${API_BASE_URL}${ENDPOINTS[type]}`;
    
    try {
      console.log(`📡 Fetching ${type} from ${url}`);
      
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
      console.log(`  ✓ ${type}: ${data.length || data.features?.length || 0} éléments`);
      
      return {
        type,
        success: true,
        data: data.features || data,
        count: data.length || data.features?.length || 0
      };
      
    } catch (error) {
      console.error(`  ❌ Erreur ${type}:`, error);
      return {
        type,
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Charger toutes les infrastructures (14 types - Dashboard)
   */
  async loadAllInfrastructures() {
    console.log('📥 Loading all infrastructures in parallel...');
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
      
      console.log(`✅ Chargement terminé en ${duration}s`);
      console.log(`📊 Total: ${totalCount} éléments depuis ${successCount}/${MAP_TYPES.length} APIs`);
      
      return {
        success: true,
        data: organizedData,
        duration,
        totalCount,
        successCount,
        failedCount: MAP_TYPES.length - successCount
      };
      
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      return {
        success: false,
        error: error.message,
        data: {}
      };
    }
  }

  /**
   * Charger toutes les données pour la carte (16 types)
   */
  async loadMapData() {
    console.log('🗺️ Loading map data in parallel...');
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
      
      console.log(`✅ Map data loaded in ${duration}s`);
      console.log(`📊 Total: ${totalCount} items from ${successCount}/${MAP_TYPES.length} APIs`);
      
      return {
        success: true,
        data: organizedData,
        duration,
        totalCount,
        successCount,
        failedCount: MAP_TYPES.length - successCount
      };
      
    } catch (error) {
      console.error('❌ Error loading map data:', error);
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
    console.log('🔄 Force reloading all data...');
    return this.loadAllInfrastructures();
  }
}

const dataservice = new DataService();
export default dataservice;
export { INFRASTRUCTURE_TYPES, MAP_TYPES, ENDPOINTS };