/**
 * Hook React personnalise pour gerer les donnees d'infrastructures
 * Gere le cache IndexedDB/sessionStorage et le chargement des donnees
 * ✅ NOUVEAU: Détecte la fermeture du navigateur et recharge les données
 * ✅ NOUVEAU: Système de verrouillage global pour éviter appels multiples
 */

import { useState, useEffect, useCallback } from 'react';
import cacheservice from './cacheservice';
import dataservice from './dataservice';
import dataprocessor from './dataprocessor';

// ✅ VARIABLES GLOBALES POUR ÉVITER APPELS MULTIPLES
let GLOBAL_LOADING = false;
let GLOBAL_LOAD_PROMISE = null;
let CACHED_RESULT = null;

const useInfrastructureData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [infrastructureData, setInfrastructureData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  /**
   * Charger les donnees depuis le cache ou l'API
   */
  const loadData = useCallback(async (forceReload = false) => {
    console.log('Loading infrastructure data...');
    
    // ✅ VÉRIFIER CACHE MÉMOIRE GLOBAL D'ABORD
    if (CACHED_RESULT && !forceReload) {
      console.log('Using memory cache');
      setInfrastructureData(CACHED_RESULT.infrastructureData);
      setProcessedData(CACHED_RESULT.processedData);
      setLoading(false);
      setLoadingProgress(100);
      return { success: true, source: 'memory' };
    }
    
    // ✅ SI CHARGEMENT EN COURS PAR UN AUTRE COMPOSANT, ATTENDRE
    if (GLOBAL_LOADING && GLOBAL_LOAD_PROMISE) {
      console.log('Loading already in progress, waiting...');
      try {
        const result = await GLOBAL_LOAD_PROMISE;
        if (CACHED_RESULT) {
          setInfrastructureData(CACHED_RESULT.infrastructureData);
          setProcessedData(CACHED_RESULT.processedData);
          setLoading(false);
          setLoadingProgress(100);
        }
        return result;
      } catch (err) {
        console.error('Error waiting for global load:', err);
      }
    }
    
    // ✅ MARQUER COMME EN COURS DE CHARGEMENT
    GLOBAL_LOADING = true;
    setLoading(true);
    setError(null);
    setLoadingProgress(0);

    // ✅ CRÉER LA PROMESSE GLOBALE
    GLOBAL_LOAD_PROMISE = (async () => {
      try {
        // Vérifier si le navigateur a été fermé
        const browserSessionActive = sessionStorage.getItem('dashboard_session_active');
        
        if (!browserSessionActive) {
          console.log("🔄 Navigateur réouvert, rechargement depuis API...");
          await cacheservice.clear();
          forceReload = true;
          sessionStorage.setItem('dashboard_session_active', 'true');
        } else {
          console.log("✅ Session navigateur active (refresh simple)");
        }

        // Verifier le cache si pas de force reload
        if (!forceReload) {
          const cachedInfraData = await cacheservice.getInfrastructureData();
          const cachedProcessedData = await cacheservice.getProcessedData();
          
          if (cachedInfraData && cachedProcessedData) {
            console.log('Using IndexedDB cache');
            
            // ✅ SAUVEGARDER DANS CACHE MÉMOIRE
            CACHED_RESULT = {
              infrastructureData: cachedInfraData,
              processedData: cachedProcessedData
            };
            
            setInfrastructureData(cachedInfraData);
            setProcessedData(cachedProcessedData);
            setLoading(false);
            setLoadingProgress(100);
            
            return { success: true, source: 'cache' };
          }
        }

        // Charger depuis l'API
        console.log('Loading from API...');
        setLoadingProgress(10);

        const result = await dataservice.loadAllInfrastructures();
        setLoadingProgress(60);

        if (!result.success) {
          throw new Error(result.error || 'Failed to load data');
        }

        console.log('Data loaded from API');
        setInfrastructureData(result.data);
        
        await cacheservice.saveInfrastructureData(result.data);
        setLoadingProgress(70);

        console.log('Processing data...');
        const processed = dataprocessor.processAll(result.data);
        setLoadingProgress(90);

        if (!processed.success) {
          throw new Error(processed.error || 'Failed to process data');
        }

        console.log('Data processed');
        setProcessedData(processed);
        
        await cacheservice.saveProcessedData(processed);
        
        if (processed.chausseesMapping) {
          await cacheservice.saveChausseesMapping(processed.chausseesMapping);
        }
        
        // ✅ SAUVEGARDER DANS CACHE MÉMOIRE
        CACHED_RESULT = {
          infrastructureData: result.data,
          processedData: processed
        };
        
        setLoadingProgress(100);
        setLoading(false);

        return {
          success: true,
          source: 'api',
          duration: result.duration
        };

      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
        setLoading(false);
        setLoadingProgress(0);
        
        return {
          success: false,
          error: err.message
        };
      } finally {
        // ✅ LIBÉRER LE VERROUILLAGE
        GLOBAL_LOADING = false;
        GLOBAL_LOAD_PROMISE = null;
      }
    })();

    return GLOBAL_LOAD_PROMISE;
  }, []);

  /**
   * Recharger les donnees (force refresh)
   */
  const reloadData = useCallback(() => {
    console.log('Force reloading data...');
    CACHED_RESULT = null; // ✅ Vider le cache mémoire
    return loadData(true);
  }, [loadData]);

  /**
   * Vider le cache
   */
  const clearCache = useCallback(async () => {
    console.log('Clearing cache...');
    await cacheservice.clear();
    setInfrastructureData(null);
    setProcessedData(null);
  }, []);

  /**
   * Charger automatiquement au montage
   */
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Etat
    loading,
    error,
    loadingProgress,
    
    // Donnees
    infrastructureData,
    processedData,
    pistesCounts: processedData?.pistesCounts || {},
    globalStats: processedData?.globalStats || {},
    chausseesMapping: processedData?.chausseesMapping || {},
    
    // Methodes
    reloadData,
    clearCache,
    
    // Info
    cacheInfo: {}
  };
};

/**
 * Hook simplifie pour obtenir uniquement les donnees traitees
 */
export const useProcessedData = () => {
  const { processedData, loading, error } = useInfrastructureData();
  
  return {
    pistesCounts: processedData?.pistesCounts || {},
    globalStats: processedData?.globalStats || {},
    loading,
    error
  };
};

/**
 * Hook pour obtenir les donnees brutes
 */
export const useRawData = () => {
  const { infrastructureData, loading, error } = useInfrastructureData();
  
  return {
    data: infrastructureData || {},
    loading,
    error
  };
};

// Export default
export default useInfrastructureData;