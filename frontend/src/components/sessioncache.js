/**
 * Service de cache simple avec sessionStorage
 * Se vide automatiquement à la fermeture du navigateur
 * Partagé entre Dashboard et MapContainer
 */

class SessionCacheService {
  constructor() {
    this.KEYS = {
      // Données brutes API (partagées)
      INFRASTRUCTURE_DATA: 'infra_raw_data',
      
      // Données traitées Dashboard
      DASHBOARD_DATA: 'dashboard_processed',
      
      // Données carte (GeoJSON)
      MAP_DATA: 'map_geojson',
      
      // Hiérarchie géographique
      HIERARCHY: 'geo_hierarchy',
      
      // Flag de chargement
      LOADING: 'is_loading'
    };
  }

  // ==================== INFRASTRUCTURE DATA (brut API) ====================
  
  saveInfrastructureData(data) {
    try {
      sessionStorage.setItem(
        this.KEYS.INFRASTRUCTURE_DATA,
        JSON.stringify({
          data,
          timestamp: Date.now()
        })
      );
      console.log('💾 Infrastructure data saved (sessionStorage)');
      return true;
    } catch (error) {
      console.error('Error saving infrastructure data:', error);
      return false;
    }
  }

  getInfrastructureData() {
    try {
      const cached = sessionStorage.getItem(this.KEYS.INFRASTRUCTURE_DATA);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('📦 Infrastructure data loaded (sessionStorage)');
        return parsed.data;
      }
      return null;
    } catch (error) {
      console.error('Error loading infrastructure data:', error);
      return null;
    }
  }

  // ==================== DASHBOARD DATA (traité) ====================
  
  saveDashboardData(pistesCounts, globalStats) {
    try {
      sessionStorage.setItem(
        this.KEYS.DASHBOARD_DATA,
        JSON.stringify({
          pistesCounts,
          globalStats,
          timestamp: Date.now()
        })
      );
      console.log('💾 Dashboard data saved');
      return true;
    } catch (error) {
      console.error('Error saving dashboard data:', error);
      return false;
    }
  }

  getDashboardData() {
    try {
      const cached = sessionStorage.getItem(this.KEYS.DASHBOARD_DATA);
      if (cached) {
        console.log('📦 Dashboard data loaded');
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      return null;
    }
  }

  // ==================== MAP DATA (GeoJSON) ====================
  
  saveMapData(geoJsonData) {
    try {
      sessionStorage.setItem(
        this.KEYS.MAP_DATA,
        JSON.stringify({
          data: geoJsonData,
          timestamp: Date.now()
        })
      );
      console.log('💾 Map data saved');
      return true;
    } catch (error) {
      console.error('Error saving map data:', error);
      return false;
    }
  }

  getMapData() {
    try {
      const cached = sessionStorage.getItem(this.KEYS.MAP_DATA);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('📦 Map data loaded');
        return parsed.data;
      }
      return null;
    } catch (error) {
      console.error('Error loading map data:', error);
      return null;
    }
  }

  // ==================== HIERARCHY ====================
  
  saveHierarchy(hierarchy) {
    try {
      sessionStorage.setItem(
        this.KEYS.HIERARCHY,
        JSON.stringify({
          data: hierarchy,
          timestamp: Date.now()
        })
      );
      console.log('💾 Hierarchy saved');
      return true;
    } catch (error) {
      console.error('Error saving hierarchy:', error);
      return false;
    }
  }

  getHierarchy() {
    try {
      const cached = sessionStorage.getItem(this.KEYS.HIERARCHY);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('📦 Hierarchy loaded');
        return parsed.data;
      }
      return null;
    } catch (error) {
      console.error('Error loading hierarchy:', error);
      return null;
    }
  }

  // ==================== LOADING LOCK ====================
  
  setLoading(isLoading) {
    sessionStorage.setItem(this.KEYS.LOADING, isLoading ? 'true' : 'false');
  }

  isLoading() {
    return sessionStorage.getItem(this.KEYS.LOADING) === 'true';
  }

  // ==================== UTILITIES ====================
  
  /**
   * Vérifier si toutes les données essentielles existent
   */
  hasCompleteCache() {
    return this.getInfrastructureData() !== null &&
           this.getMapData() !== null &&
           this.getHierarchy() !== null;
  }

  /**
   * Vider tout le cache
   */
  clear() {
    try {
      Object.values(this.KEYS).forEach(key => {
        sessionStorage.removeItem(key);
      });
      console.log('🗑️ Cache cleared');
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Info sur le cache
   */
  getInfo() {
    return {
      hasInfraData: this.getInfrastructureData() !== null,
      hasDashboardData: this.getDashboardData() !== null,
      hasMapData: this.getMapData() !== null,
      hasHierarchy: this.getHierarchy() !== null,
      isLoading: this.isLoading()
    };
  }
}

const sessionCache = new SessionCacheService();
export default sessionCache;