import { useState, useEffect } from 'react';
import dataservice from './dataservice';
import dataprocessor from './dataprocessor';
import hybridCache from './hybridcache';
import { isLoading, lockLoading, unlockLoading, getLoadingPromise, getLoadingSource } from './globalloadinglock';

const useInfrastructureData = () => {
  const [pistesCounts, setPistesCounts] = useState({});
  const [globalStats, setGlobalStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadEverything() {
      // ✅ CHECK + LOCK ATOMIQUE
      console.log('🔒 Dashboard check lock:', isLoading(), 'Source:', getLoadingSource());
      
      if (isLoading() && getLoadingPromise()) {
        console.log('⏳ Dashboard: Attente chargement en cours...');
        try {
          await getLoadingPromise();
          const cached = await hybridCache.getDashboardData();
          if (cached && mounted) {
            setPistesCounts(cached.pistesCounts);
            setGlobalStats(cached.globalStats);
          }
        } catch (err) {
          console.error('Erreur attente:', err);
        }
        setLoading(false);
        return;
      }

      // ✅ CRÉER LA PROMISE IMMÉDIATEMENT
      const loadPromise = (async () => {
        try {
          // 1. Vérifier cache Dashboard
          const cachedDashboard = await hybridCache.getDashboardData();
          if (cachedDashboard && mounted) {
            console.log('✅ Dashboard: Utilisation cache');
            setPistesCounts(cachedDashboard.pistesCounts);
            setGlobalStats(cachedDashboard.globalStats);
            setLoading(false);
            return;
          }

          // 2. Vérifier infrastructure_data (chargé par MapContainer)
          const cachedInfraData = await hybridCache.getInfrastructureData();
          
          if (cachedInfraData && mounted) {
            console.log('📦 Dashboard: Traitement données existantes');
            setLoadingProgress(60);
            
            const processed = dataprocessor.processAll(cachedInfraData);
            
            if (!mounted) return;
            setLoadingProgress(90);
            
            if (processed.success) {
              await hybridCache.saveDashboardData(
                processed.pistesCounts,
                processed.globalStats
              );
              
              setPistesCounts(processed.pistesCounts);
              setGlobalStats(processed.globalStats);
              setLoadingProgress(100);
              console.log('✅ Dashboard: Traité depuis cache');
              setLoading(false);
              return;
            }
          }

          // 3. Charger depuis API
          if (mounted) {
            console.log('📊 Dashboard: Chargement depuis API...');
            setLoadingProgress(10);
          }

          const result = await dataservice.loadAllInfrastructures();
          
          if (!mounted) return;
          setLoadingProgress(60);

          if (result.success && result.data) {
            await hybridCache.saveInfrastructureData(result.data);
            
            console.log('🔄 Dashboard: Traitement...');
            const processed = dataprocessor.processAll(result.data);
            
            if (!mounted) return;
            setLoadingProgress(90);

            if (processed.success) {
              await hybridCache.saveDashboardData(
                processed.pistesCounts,
                processed.globalStats
              );

              if (!mounted) return;
              
              setPistesCounts(processed.pistesCounts);
              setGlobalStats(processed.globalStats);
              setLoadingProgress(100);
              console.log('✅ Dashboard: Terminé');
            } else {
              throw new Error(processed.error || 'Erreur traitement');
            }
          } else {
            throw new Error(result.error || 'Aucune donnée');
          }
        } catch (err) {
          console.error('❌ Dashboard: Erreur:', err);
          if (mounted) {
            setError(err.message);
          }
          throw err; // Re-throw pour le finally
        } finally {
          // ✅ Déverrouiller
          unlockLoading();
          if (mounted) {
            setLoading(false);
          }
        }
      })();

      // ✅ ENREGISTRER LE LOCK IMMÉDIATEMENT (synchrone)
      lockLoading(loadPromise, 'Dashboard');
      
      // Attendre la completion
      await loadPromise;
    }

    loadEverything();

    return () => {
      mounted = false;
    };
  }, []);

  const reloadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Dashboard: Rechargement forcé...');
      await hybridCache.clearAll();
      
      const result = await dataservice.loadAllInfrastructures();
      
      if (result.success && result.data) {
        await hybridCache.saveInfrastructureData(result.data);
        
        const processed = dataprocessor.processAll(result.data);
        
        if (processed.success) {
          await hybridCache.saveDashboardData(
            processed.pistesCounts,
            processed.globalStats
          );

          setPistesCounts(processed.pistesCounts);
          setGlobalStats(processed.globalStats);
          console.log('✅ Dashboard: Rechargé');
        }
      }
    } catch (err) {
      console.error('❌ Erreur rechargement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    pistesCounts,
    globalStats,
    loading,
    error,
    reloadData,
    loadingProgress
  };
};

export default useInfrastructureData;