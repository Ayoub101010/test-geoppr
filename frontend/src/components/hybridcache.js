/**
 * Cache hybride: IndexedDB (capacité) + comportement sessionStorage (se vide à la fermeture)
 * Utilise un flag dans sessionStorage pour savoir si c'est une nouvelle session
 */

const DB_NAME = 'GeoPPRCache';
const DB_VERSION = 1;
const SESSION_FLAG_KEY = 'geoppr_session_active';

class HybridCacheService {
  constructor() {
    this.db = null;
    this.initPromise = null;
    
    // Vérifier si c'est une nouvelle session
    this.isNewSession = !sessionStorage.getItem(SESSION_FLAG_KEY);
    
    if (this.isNewSession) {
      console.log('🆕 Nouvelle session détectée - cache sera vidé');
      sessionStorage.setItem(SESSION_FLAG_KEY, 'true');
    } else {
      console.log('♻️ Session existante - cache disponible');
    }
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Créer le store s'il n'existe pas
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
          console.log('📦 Store "cache" créé');
        }
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('✅ IndexedDB ouvert');
        
        // ✅ TOUJOURS attendre que la DB soit prête (nouvelle session OU pas)
        // Car même en session existante, les transactions peuvent échouer si appelées trop tôt
        const finishInit = () => {
          if (this.isNewSession) {
            // Nouvelle session: vider le cache
            this.clearAll().then(() => {
              console.log('🗑️ Cache vidé (nouvelle session)');
              this.isNewSession = false;
              resolve(this.db);
            }).catch((err) => {
              console.warn('Erreur nettoyage cache:', err);
              resolve(this.db);
            });
          } else {
            // Session existante: juste résoudre
            resolve(this.db);
          }
        };
        
        // ✅ Attendre 200ms dans TOUS les cas pour que la DB soit stable
        setTimeout(finishInit, 200);
      };
    });
    
    return this.initPromise;
  }

  async save(key, data) {
    try {
      if (!this.db) await this.init();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction(['cache'], 'readwrite');
          const store = transaction.objectStore('cache');
          const request = store.put({
            data: data,
            timestamp: Date.now()
          }, key);
          
          request.onsuccess = () => {
            console.log(`💾 Sauvegardé: ${key}`);
            resolve(true);
          };
          request.onerror = () => reject(request.error);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Erreur save:', error);
      return false;
    }
  }

  async get(key) {
    try {
      if (!this.db) await this.init();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction(['cache'], 'readonly');
          const store = transaction.objectStore('cache');
          const request = store.get(key);
          
          request.onsuccess = () => {
            const result = request.result;
            if (result) {
              console.log(`📦 Cache hit: ${key}`);
              resolve(result.data);
            } else {
              resolve(null);
            }
          };
          request.onerror = () => reject(request.error);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Erreur get:', error);
      return null;
    }
  }

  async clearAll() {
    try {
      if (!this.db) {
        console.log('DB pas encore initialisée');
        return true;
      }
      
      if (!this.db.objectStoreNames.contains('cache')) {
        console.log('Store n\'existe pas encore');
        return true;
      }
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction(['cache'], 'readwrite');
          const store = transaction.objectStore('cache');
          const request = store.clear();
          
          request.onsuccess = () => {
            console.log('🗑️ Cache vidé');
            resolve(true);
          };
          request.onerror = () => {
            console.error('Erreur clear:', request.error);
            reject(request.error);
          };
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Erreur clearAll:', error);
      return false;
    }
  }

  // ==================== API simplifiée ====================
  
  async saveInfrastructureData(data) {
    return await this.save('infrastructure_data', data);
  }

  async getInfrastructureData() {
    return await this.get('infrastructure_data');
  }

  async saveDashboardData(pistesCounts, globalStats) {
    return await this.save('dashboard_data', {
      pistesCounts,
      globalStats,
      timestamp: Date.now()
    });
  }

  async getDashboardData() {
    return await this.get('dashboard_data');
  }

  async saveMapData(geoJsonData) {
    return await this.save('map_data', geoJsonData);
  }

  async getMapData() {
    return await this.get('map_data');
  }

  async saveHierarchy(hierarchy) {
    return await this.save('hierarchy', hierarchy);
  }

  async getHierarchy() {
    return await this.get('hierarchy');
  }
}

const hybridCache = new HybridCacheService();
export default hybridCache;