/**
 * Service de traitement des donnees
 * Regroupe les infrastructures par code_piste et calcule les statistiques
 */

class DataProcessor {
  
  /**
   * Creer un mapping chaussee_id -> code_piste
   */
  createChausseesMapping(chaussees) {
    const mapping = {};
    
    if (!chaussees || !Array.isArray(chaussees)) {
      return mapping;
    }
    
    chaussees.forEach(chaussee => {
      const chausseeId = chaussee.fid || chaussee.id;
      const codePiste = chaussee.code_piste || chaussee.properties?.code_piste;
      
      if (chausseeId && codePiste) {
        mapping[chausseeId] = codePiste;
      }
    });
    
    console.log('Chaussees mapping created: ' + Object.keys(mapping).length + ' entries');
    return mapping;
  }

  /**
   * Extraire le code_piste d'un objet (GeoJSON ou JSON simple)
   */
  extractCodePiste(item) {
    return item.code_piste || 
           item.properties?.code_piste || 
           null;
  }

  /**
   * Calculer la longueur en km pour les chaussees
   */
  calculateChausseeLength(chaussee) {
    if (chaussee.length_km || chaussee.properties?.length_km) {
      return parseFloat(chaussee.length_km || chaussee.properties.length_km);
    }
    return 0;
  }

  /**
   * Regrouper les infrastructures par code_piste
   */
  groupByPiste(infrastructureData) {
    console.log('Grouping infrastructures by code_piste...');
    
    const pistesCounts = {};
    const pistesInfo = {};
    
    if (infrastructureData.pistes && Array.isArray(infrastructureData.pistes)) {
      infrastructureData.pistes.forEach(piste => {
        const codePiste = this.extractCodePiste(piste);
        if (!codePiste) return;
        
        pistesInfo[codePiste] = {
          id: piste.id || piste.properties?.id,
          code_piste: codePiste,
          created_at: piste.created_at || piste.properties?.created_at,
          utilisateur: this.extractUtilisateur(piste),
          commune: this.extractCommune(piste),
          kilometrage: this.extractKilometrage(piste)
        };
        
        pistesCounts[codePiste] = {
          chaussees: { count: 0, km: 0 },
          buses: 0,
          dalots: 0,
          ponts: 0,
          passages_submersibles: 0,
          bacs: 0,
          ecoles: 0,
          marches: 0,
          services_santes: 0,
          batiments_administratifs: 0,
          infrastructures_hydrauliques: 0,
          localites: 0,
          autres_infrastructures: 0
        };
      });
    }
    
    console.log(Object.keys(pistesInfo).length + ' pistes found');
    
    // Compter les chaussees (avec km) - VERIFIER QUE C'EST UN ARRAY
    if (infrastructureData.chaussees && Array.isArray(infrastructureData.chaussees)) {
      infrastructureData.chaussees.forEach(item => {
        const codePiste = this.extractCodePiste(item);
        if (codePiste && pistesCounts[codePiste]) {
          pistesCounts[codePiste].chaussees.count++;
          pistesCounts[codePiste].chaussees.km += this.calculateChausseeLength(item);
        }
      });
    } else {
      console.warn('⚠️ chaussees is not an array:', infrastructureData.chaussees);
    }
    
    const typesToCount = [
      'buses', 'dalots', 'ponts', 'passages_submersibles', 'bacs',
      'ecoles', 'marches', 'services_santes', 'batiments_administratifs',
      'infrastructures_hydrauliques', 'localites', 'autres_infrastructures'
    ];
    
    typesToCount.forEach(type => {
      if (infrastructureData[type] && Array.isArray(infrastructureData[type])) {
        infrastructureData[type].forEach(item => {
          const codePiste = this.extractCodePiste(item);
          if (codePiste && pistesCounts[codePiste]) {
            pistesCounts[codePiste][type]++;
          }
        });
      }
    });
    
    const result = {};
    Object.keys(pistesInfo).forEach(codePiste => {
      result[codePiste] = {
        ...pistesInfo[codePiste],
        ...pistesCounts[codePiste]
      };
    });
    
    console.log('Grouping complete: ' + Object.keys(result).length + ' pistes with counts');
    return result;
  }

  /**
   * Calculer les statistiques globales
   */
  calculateGlobalStats(infrastructureData) {
    console.log('Calculating global statistics...');
    
    const stats = {
      pistes: 0,
      chaussees: 0,
      buses: 0,
      dalots: 0,
      ponts: 0,
      passages_submersibles: 0,
      bacs: 0,
      ecoles: 0,
      marches: 0,
      services_santes: 0,
      batiments_administratifs: 0,
      infrastructures_hydrauliques: 0,
      localites: 0,
      autres_infrastructures: 0
    };
    
    Object.keys(stats).forEach(type => {
      if (infrastructureData[type] && Array.isArray(infrastructureData[type])) {
        stats[type] = infrastructureData[type].length;
      }
    });
    
    console.log('Global stats calculated:', stats);
    return stats;
  }

  /**
   * Traiter toutes les donnees
   */
  processAll(infrastructureData) {
    console.log('Processing all infrastructure data...');
    const startTime = performance.now();
    
    try {
      const chausseesMapping = this.createChausseesMapping(infrastructureData.chaussees);
      const pistesCounts = this.groupByPiste(infrastructureData);
      const globalStats = this.calculateGlobalStats(infrastructureData);
      
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log('Processing complete in ' + duration + 's');
      
      return {
        success: true,
        pistesCounts,
        globalStats,
        chausseesMapping,
        duration
      };
      
    } catch (error) {
      console.error('Error processing data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extraire les informations utilisateur
   */
  extractUtilisateur(piste) {
    const obj = piste.properties || piste;
    
    if (obj.utilisateur) {
      return obj.utilisateur;
    }
    
    if (obj.login_id) {
      const login = obj.login_id;
      if (typeof login === 'object') {
        return `${login.nom || ''} ${login.prenom || ''}`.trim();
      }
    }
    
    return "Non assigne";
  }

  /**
   * Extraire les informations de commune
   */
  extractCommune(piste) {
    const obj = piste.properties || piste;
    
    if (obj.commune) {
      return obj.commune;
    }
    
    if (obj.communes_rurales_id) {
      const commune = obj.communes_rurales_id;
      if (typeof commune === 'object') {
        return commune.nom || 'N/A';
      }
    }
    
    return "N/A";
  }

  /**
   * Extraire le kilometrage
   */
  extractKilometrage(piste) {
    const obj = piste.properties || piste;
    
    if (obj.kilometrage !== undefined) {
      return parseFloat(obj.kilometrage) || 0;
    }
    
    if (obj.length_km !== undefined) {
      return parseFloat(obj.length_km) || 0;
    }
    
    return 0;
  }

  /**
   * Filtrer les donnees par commune
   */
  filterByCommune(pistesCounts, communeId) {
    if (!communeId) return pistesCounts;
    
    const filtered = {};
    Object.keys(pistesCounts).forEach(codePiste => {
      const piste = pistesCounts[codePiste];
      if (piste.commune_id === communeId) {
        filtered[codePiste] = piste;
      }
    });
    
    return filtered;
  }

  /**
   * Convertir pistesCounts en array pour le Dashboard
   */
  pistesCountsToArray(pistesCounts) {
    return Object.values(pistesCounts);
  }
}

const dataprocessor = new DataProcessor();
export default dataprocessor;