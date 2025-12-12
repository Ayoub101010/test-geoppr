/**
 * Service de chargement des données depuis les APIs
 * VERSION CORRIGÉE - Utilise les bons endpoints
 */

const API_BASE_URL = "http://localhost:8000/api";

// Configuration des endpoints (sans /infrastructure/)
const ENDPOINTS = {
  // Base
  pistes: "/pistes/",

  // Voirie
  chaussees: "/chaussees/",

  // Ouvrages hydrauliques
  buses: "/buses/",
  dalots: "/dalots/",
  ponts: "/ponts/",
  passages_submersibles: "/passages_submersibles/",
  bacs: "/bacs/",

  // Infrastructures sociales
  ecoles: "/ecoles/",
  marches: "/marches/",
  services_santes: "/services_santes/",
  batiments_administratifs: "/batiments_administratifs/",
  infrastructures_hydrauliques: "/infrastructures_hydrauliques/",
  localites: "/localites/",
  autres_infrastructures: "/autres_infrastructures/",

  // Points de surveillance
  points_coupures: "/points_coupures/",
  points_critiques: "/points_critiques/",
};

// Types d'infrastructures pour Dashboard (14 types - sans points surveillance)
const INFRASTRUCTURE_TYPES = [
  "pistes",
  "chaussees",
  "buses",
  "dalots",
  "ponts",
  "passages_submersibles",
  "bacs",
  "ecoles",
  "marches",
  "services_santes",
  "batiments_administratifs",
  "infrastructures_hydrauliques",
  "localites",
  "autres_infrastructures",
];

// Types pour la carte (16 types - avec points surveillance)
const MAP_TYPES = [
  ...INFRASTRUCTURE_TYPES,
  "points_coupures",
  "points_critiques",
];

class DataService {
  /**
   * Charger un endpoint spécifique
   */
  async fetchEndpoint(type) {
    const url = `${API_BASE_URL}${ENDPOINTS[type]}`;

    try {
      console.log(`📡 Fetching ${type} from ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const count = data.length || data.features?.length || 0;

      console.log(`  ✓ ${type}: ${count} éléments`);

      return {
        type,
        success: true,
        data: data.features || data,
        count,
      };
    } catch (error) {
      console.error(`  ❌ Erreur ${type}:`, error);
      return {
        type,
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Charger toutes les infrastructures (14 types - Dashboard + Suivi données)
   */
  async loadAllInfrastructures() {
    console.log("📥 Loading all infrastructures in parallel...");
    const startTime = performance.now();

    try {
      const promises = INFRASTRUCTURE_TYPES.map((type) =>
        this.fetchEndpoint(type)
      );
      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      const organizedData = {};
      let totalCount = 0;
      let successCount = 0;

      results.forEach((result) => {
        organizedData[result.type] = result.data;
        if (result.success) {
          successCount++;
          totalCount += result.count;
        }
      });

      console.log(`✅ Infrastructures loaded in ${duration}s`);
      console.log(
        `📊 Total: ${totalCount} items from ${successCount}/${INFRASTRUCTURE_TYPES.length} APIs`
      );

      return {
        success: successCount > 0,
        duration,
        totalCount,
        data: organizedData,
        details: results,
      };
    } catch (error) {
      console.error("❌ Error loading infrastructures:", error);
      return {
        success: false,
        duration: 0,
        totalCount: 0,
        data: {},
        error: error.message,
      };
    }
  }

  /**
   * Charger UN SEUL type d'infrastructure
   */
  async fetchInfrastructureData(type) {
    if (!ENDPOINTS[type]) {
      console.warn(`⚠️ Type d'infrastructure inconnu: ${type}`);
      return {
        success: false,
        error: "Type inconnu",
        data: [],
      };
    }
    return this.fetchEndpoint(type);
  }

  /**
   * Charger toutes les données pour la carte (16 types)
   */
  async loadMapData() {
    console.log("🗺️ Loading map data in parallel...");
    const startTime = performance.now();

    try {
      const promises = MAP_TYPES.map((type) => this.fetchEndpoint(type));
      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      const organizedData = {};
      let totalCount = 0;
      let successCount = 0;

      results.forEach((result) => {
        organizedData[result.type] = result.data;
        if (result.success) {
          successCount++;
          totalCount += result.count;
        }
      });

      console.log(`✅ Map data loaded in ${duration}s`);
      console.log(
        `📊 Total: ${totalCount} items from ${successCount}/${MAP_TYPES.length} APIs`
      );

      return {
        success: successCount > 0,
        duration,
        totalCount,
        data: organizedData,
        details: results,
      };
    } catch (error) {
      console.error("❌ Error loading map data:", error);
      return {
        success: false,
        duration: 0,
        totalCount: 0,
        data: {},
        error: error.message,
      };
    }
  }

  /**
   * Recharger UNIQUEMENT un type (pour refresh partiel)
   */
  async reloadType(type) {
    if (!ENDPOINTS[type]) {
      console.warn(`⚠️ Type d'infrastructure inconnu: ${type}`);
      return {
        success: false,
        error: "Type inconnu",
        data: [],
      };
    }
    return this.fetchEndpoint(type);
  }

  async reloadAll() {
    console.log("🔄 Force reloading all data...");
    return this.loadAllInfrastructures();
  }
}

/**
 * Mettre à jour une ligne d'une table via l'API générique :
 * PUT /api/update/<table>/<id>/
 */
export async function updateRow(table, id, updatedFields) {
  const url = `${API_BASE_URL}/update/${table}/${id}/`;

  console.log("📡 PUT", url, updatedFields);

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedFields),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ ERREUR UPDATE", result);
      return { success: false, error: result.error || "Erreur inconnue" };
    }

    console.log("✅ UPDATE OK :", result);
    return { success: true, data: result };
  } catch (err) {
    console.error("⚠️ Exception updateRow", err);
    return { success: false, error: err.message };
  }
}

const dataservice = new DataService();
export default dataservice;
export { INFRASTRUCTURE_TYPES, MAP_TYPES, ENDPOINTS };
