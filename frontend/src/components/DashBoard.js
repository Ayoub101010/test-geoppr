import React, { useState, useEffect, useRef } from "react";
import "./DashBoard.css";
import { FaFileCsv, FaFileExcel, FaChartBar } from "react-icons/fa";
import { FaRegFileAlt } from "react-icons/fa";
import pisteDashboardService from "./pisteDashboardService";

// Cache global simple pour éviter les rechargements
let cachedData = null;
let isLoaded = false;

const Dashboard = () => {
  // États pour les vraies données
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États existants
  const [searchTerm, setSearchTerm] = useState("");
  
  // ✅ Protection contre doubles appels (React StrictMode)
  const isLoadingRef = useRef(false);

  // Chargement des données au montage
  useEffect(() => {
    // Utiliser le cache si disponible
    if (isLoaded && cachedData) {
      console.log('📦 Utilisation du cache Dashboard');
      setData(cachedData);
      setLoading(false);
    } else if (!isLoadingRef.current) {
      loadPistes();
    } else {
      console.log('🔒 Chargement déjà en cours, skip');
    }
  }, []);

  const loadPistes = async () => {
    // ✅ Protection contre appels multiples
    if (isLoadingRef.current) {
      console.log('🔒 loadPistes déjà en cours, skip');
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);
    
    try {
      const result = await pisteDashboardService.getPistesDashboard();
      
      if (result.success) {
        // Transformation des données API vers format tableau avec infrastructures
        const transformedData = result.data.pistes.map((piste) => ({
          code_piste: piste.code_piste,
          date: piste.created_at ? new Date(piste.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          utilisateur: piste.utilisateur,
          localite: piste.commune,
          kilometrage: piste.kilometrage,
          observations: `${piste.kilometrage} km - Total: ${piste.total_infrastructures}`,
          // Types d'infrastructures séparés
          buses: piste.infrastructures_par_type.Buses || 0,
          ponts: piste.infrastructures_par_type.Ponts || 0,
          dalots: piste.infrastructures_par_type.Dalots || 0,
          bacs: piste.infrastructures_par_type.Bacs || 0,
          ecoles: piste.infrastructures_par_type.Écoles || 0,
          marches: piste.infrastructures_par_type.Marchés || 0,
          services_sante: piste.infrastructures_par_type["Services Santé"] || 0,
          autres: piste.infrastructures_par_type["Autres Infrastructures"] || 0,
          batiments_admin: piste.infrastructures_par_type["Bâtiments Administratifs"] || 0,
          hydrauliques: piste.infrastructures_par_type["Infrastructures Hydrauliques"] || 0,
          localites: piste.infrastructures_par_type.Localités || 0,
          passages: piste.infrastructures_par_type["Passages Submersibles"] || 0
        }));
        
        setData(transformedData);
        // Sauvegarder dans le cache global
        cachedData = transformedData;
        isLoaded = true;
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('❌ Erreur chargement Dashboard:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const types = [
    "Tous les types",
    "Piste",
    "Chaussée",
    "Buse",
    "Dalot",
    "Pont",
    "Passage submersible",
    "Bac",
    "Localité",
    "École",
    "Marché",
    "Bâtiment administratif",
    "Infrastructure hydraulique",
    "Service de santé",
    "Autres infrastructures"
  ];

  const etats = ["Tous les états", "Bon", "Moyen", "Mauvais", "À vérifier"];

  const filteredData = data.filter((item) => {
    const matchesSearch = 
      item.utilisateur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code_piste.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.localite.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Loading state
  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Tableau de Bord - Collectes</h1>
        </div>
        <div className="loading-container" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  // Error state  
  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Tableau de Bord - Collectes</h1>
        </div>
        <div className="error-container" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#dc3545' }}>Erreur: {error}</p>
          <button 
            onClick={() => {
              // Réinitialiser le flag avant de recharger
              isLoadingRef.current = false;
              loadPistes();
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Tableau de Bord - Collectes</h1>
      </div>

      <div className="dashboard-controls">
        <div className="filters-row">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="actions-row">
          <button 
            className="btn btn-green" 
            onClick={() => {
              // Réinitialiser cache et recharger
              isLoaded = false;
              cachedData = null;
              isLoadingRef.current = false;
              loadPistes();
            }}
          >
            <span>🔄</span> Actualiser
          </button>
          <button className="btn btn-blue">
            <FaFileCsv />
            Export CSV
          </button>
          <button className="btn btn-purple">
            <FaFileExcel />
            Export Excel
          </button>
          <button className="btn btn-orange">
            <FaChartBar />
            Rapport
          </button>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stats-card">
          <h3>{data.length}</h3>
          <p>Total des collectes</p>
        </div>
        <div className="stats-card">
          <h3>{data.filter(d => d.utilisateur !== "Non assigné").length}</h3>
          <p>Avec utilisateur</p>
        </div>
        <div className="stats-card">
          <h3>{data.reduce((sum, d) => sum + d.kilometrage, 0).toFixed(1)} km</h3>
          <p>Kilométrage total</p>
        </div>
        <div className="stats-card">
          <h3>{data.reduce((sum, d) => sum + d.buses + d.ponts + d.dalots + d.bacs + d.ecoles + d.marches + d.services_sante + d.autres + d.batiments_admin + d.hydrauliques + d.localites + d.passages, 0)}</h3>
          <p>Total infrastructures</p>
        </div>
      </div>

      <div className="dashboard-table">
        <table>
          <thead>
            <tr>
              <th>Code Piste</th>
              <th>Date</th>
              <th>Utilisateur</th>
              <th>Localité</th>
              <th>Km</th>
              <th>Buses</th>
              <th>Ponts</th>
              <th>Dalots</th>
              <th>Bacs</th>
              <th>Écoles</th>
              <th>Marchés</th>
              <th>Services Santé</th>
              <th>Autres</th>
              <th>Bât. Admin</th>
              <th>Hydrauliques</th>
              <th>Localités</th>
              <th>Passages Sub.</th>
              <th>Observations</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.code_piste}>
                <td className="code-piste">{item.code_piste}</td>
                <td>{item.date}</td>
                <td className={item.utilisateur === "Non assigné" ? "non-assigne" : ""}>{item.utilisateur}</td>
                <td>{item.localite}</td>
                <td className="kilometrage-cell">{item.kilometrage} km</td>
                <td className="infra-count">{item.buses}</td>
                <td className="infra-count">{item.ponts}</td>
                <td className="infra-count">{item.dalots}</td>
                <td className="infra-count">{item.bacs}</td>
                <td className="infra-count">{item.ecoles}</td>
                <td className="infra-count">{item.marches}</td>
                <td className="infra-count">{item.services_sante}</td>
                <td className="infra-count">{item.autres}</td>
                <td className="infra-count">{item.batiments_admin}</td>
                <td className="infra-count">{item.hydrauliques}</td>
                <td className="infra-count">{item.localites}</td>
                <td className="infra-count">{item.passages}</td>
                <td>{item.observations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dashboard-pagination">
        <p>Affichage de {filteredData.length} sur {data.length} éléments</p>
      </div>
    </div>
  );
};

export default Dashboard;
