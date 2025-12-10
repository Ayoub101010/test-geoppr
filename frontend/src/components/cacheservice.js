/**
 * Service de gestion du cache hybride (IndexedDB + sessionStorage)
 * IndexedDB pour les donnees volumineuses (sans limite de taille)
 * sessionStorage pour les metadonnees legeres
 */

import indexeddbservice from './indexeddbservice';

class CacheService {
  constructor() {
    this.KEYS = {
      INFRASTRUCTURE_DATA: 'infrastructure_data',
      PROCESSED_DATA: 'processed_data',
      CHAUSSEES_MAPPING: 'chaussees_mapping',
      METADATA: 'infrastructure_data_metadata'
    };
    this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures
  }

  /**
   * Sauvegarder infrastructure_data dans IndexedDB
   */
  async saveInfrastructureData(data) {
    try {
      // Sauvegarder dans IndexedDB
      await indexeddbservice.save('infrastructure', 'data', data);
      
      // Sauvegarder metadata dans sessionStorage
      const metadata = {
        timestamp: Date.now(),
        counts: {
          pistes: data.pistes?.length || 0,
          chaussees: data.chaussees?.length || 0,
          buses: data.buses?.length || 0,
          dalots: data.dalots?.length || 0,
          ponts: data.ponts?.length || 0,
          passages_submersibles: data.passages_submersibles?.length || 0,
          bacs: data.bacs?.length || 0,
          ecoles: data.ecoles?.length || 0,
          marches: data.marches?.length || 0,
          services_santes: data.services_santes?.length || 0,
          batiments_administratifs: data.batiments_administratifs?.length || 0,
          infrastructures_hydrauliques: data.infrastructures_hydrauliques?.length || 0,
          localites: data.localites?.length || 0,
          autres_infrastructures: data.autres_infrastructures?.length || 0
        }
      };
      
      sessionStorage.setItem(this.KEYS.METADATA, JSON.stringify(metadata));
      console.log('Cache saved: infrastructure_data (IndexedDB)');
      return true;
    } catch (error) {
      console.error('Error saving infrastructure_data:', error);
      return false;
    }
  }

  /**
   * Recuperer infrastructure_data depuis IndexedDB
   */
  async getInfrastructureData() {
    try {
      const metadata = sessionStorage.getItem(this.KEYS.METADATA);
      if (!metadata) {
        return null;
      }
      
      const meta = JSON.parse(metadata);
      
      // Verifier expiration
      if (Date.now() - meta.timestamp > this.CACHE_DURATION) {
        console.log('Cache expire (24h)');
        await this.clearInfrastructureData();
        return null;
      }
      
      const data = await indexeddbservice.get('infrastructure', 'data');
      
      if (data) {
        console.log('Cache hit: infrastructure_data (IndexedDB)');
      }
      
      return data;
    } catch (error) {
      console.error('Error getting infrastructure_data:', error);
      return null;
    }
  }

  /**
   * Sauvegarder processed_data dans IndexedDB
   */
  async saveProcessedData(data) {
    try {
      await indexeddbservice.save('processed', 'data', data);
      console.log('Cache saved: processed_data (IndexedDB)');
      return true;
    } catch (error) {
      console.error('Error saving processed_data:', error);
      return false;
    }
  }

  /**
   * Recuperer processed_data depuis IndexedDB
   */
  async getProcessedData() {
    try {
      const data = await indexeddbservice.get('processed', 'data');
      
      if (data) {
        console.log('Cache hit: processed_data (IndexedDB)');
      }
      
      return data;
    } catch (error) {
      console.error('Error getting processed_data:', error);
      return null;
    }
  }

  /**
   * Sauvegarder chaussees_mapping dans sessionStorage (leger)
   */
  saveChausseesMapping(mapping) {
    try {
      sessionStorage.setItem(this.KEYS.CHAUSSEES_MAPPING, JSON.stringify(mapping));
      console.log('Cache saved: chaussees_mapping');
      return true;
    } catch (error) {
      console.error('Error saving chaussees_mapping:', error);
      return false;
    }
  }

  /**
   * Recuperer chaussees_mapping depuis sessionStorage
   */
  getChausseesMapping() {
    try {
      const cached = sessionStorage.getItem(this.KEYS.CHAUSSEES_MAPPING);
      if (cached) {
        console.log('Cache hit: chaussees_mapping');
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error getting chaussees_mapping:', error);
      return null;
    }
  }

  /**
   * Verifier si le cache complet existe
   */
  async hasCompleteCache() {
    const hasMetadata = sessionStorage.getItem(this.KEYS.METADATA) !== null;
    if (!hasMetadata) return false;
    
    const infraData = await this.getInfrastructureData();
    const processedData = await this.getProcessedData();
    
    return infraData !== null && processedData !== null;
  }

  /**
   * Verifier si une cle existe (sessionStorage uniquement)
   */
  exists(key) {
    return sessionStorage.getItem(key) !== null;
  }

  /**
   * Vider tout le cache
   */
  async clear() {
    try {
      sessionStorage.clear();
      await indexeddbservice.clear();
      console.log('All cache cleared');
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Vider uniquement infrastructure_data
   */
  async clearInfrastructureData() {
    try {
      sessionStorage.removeItem(this.KEYS.METADATA);
      await indexeddbservice.save('infrastructure', 'data', null);
      return true;
    } catch (error) {
      console.error('Error clearing infrastructure_data:', error);
      return false;
    }
  }

  /**
   * Obtenir des informations sur le cache
   */
  getCacheInfo() {
    const info = {
      hasMetadata: this.exists(this.KEYS.METADATA),
      hasChausseesMapping: this.exists(this.KEYS.CHAUSSEES_MAPPING),
      storageUsed: this._getStorageSize()
    };
    return info;
  }

  /**
   * Calculer la taille du sessionStorage
   */
  _getStorageSize() {
    let total = 0;
    for (let key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        total += sessionStorage[key].length + key.length;
      }
    }
    return (total / 1024).toFixed(2) + ' KB';
  }
}

const cacheservice = new CacheService();
export default cacheservice;