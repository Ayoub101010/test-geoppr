// ============================================
// NOUVEAU FICHIER: src/components/globalloadinglock.js
// ============================================

/**
 * Système de verrouillage global partagé entre tous les composants
 * pour éviter les appels API multiples simultanés
 */

// Variables globales partagées
let GLOBAL_LOADING = false;
let GLOBAL_LOAD_PROMISE = null;
let GLOBAL_DATA_CACHE = null;
let LOADING_SOURCE = null; // ✅ NOUVEAU: Identifier qui charge

/**
 * Verrouiller le chargement
 */
export const lockLoading = (promise, source = 'unknown') => {
  GLOBAL_LOADING = true;
  GLOBAL_LOAD_PROMISE = promise;
  LOADING_SOURCE = source; // ✅ NOUVEAU
};

/**
 * Déverrouiller le chargement
 */
export const unlockLoading = () => {
  GLOBAL_LOADING = false;
  GLOBAL_LOAD_PROMISE = null;
  LOADING_SOURCE = null; // ✅ NOUVEAU
};

/**
 * Vérifier si le chargement est en cours
 */
export const isLoading = () => {
  return GLOBAL_LOADING;
};

/**
 * Obtenir qui est en train de charger
 */
export const getLoadingSource = () => {
  return LOADING_SOURCE;
};

/**
 * Obtenir la promesse de chargement en cours
 */
export const getLoadingPromise = () => {
  return GLOBAL_LOAD_PROMISE;
};

/**
 * Sauvegarder les données dans le cache global
 */
export const setCachedData = (data) => {
  GLOBAL_DATA_CACHE = data;
};

/**
 * Récupérer les données du cache global
 */
export const getCachedData = () => {
  return GLOBAL_DATA_CACHE;
};

/**
 * Vider le cache global
 */
export const clearCachedData = () => {
  GLOBAL_DATA_CACHE = null;
};

/**
 * Vérifier si le cache existe
 */
export const hasCachedData = () => {
  return GLOBAL_DATA_CACHE !== null;
};