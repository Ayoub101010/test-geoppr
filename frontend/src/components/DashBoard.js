import React, { useState, useMemo, useEffect } from "react";
import "./DashBoard.css";
import useinfrastructuredata from "./useinfrastructuredata";
import BarChart from "./BarChart";
import InfrastructureDonut from "./InfrastructureDonut";

const DashBoard = () => {
  const { pistesCounts, globalStats, loading, error, reloadData, loadingProgress } = useinfrastructuredata();
  const [searchTerm, setSearchTerm] = useState("");

  // Donnees du tableau (pistesCount avec details)
  const tableData = useMemo(() => {
    if (!pistesCounts || Object.keys(pistesCounts).length === 0) {
      return [];
    }

    return Object.values(pistesCounts).map(piste => ({
      code_piste: piste.code_piste,
      date: piste.created_at ? new Date(piste.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      utilisateur: piste.utilisateur || "Non assigne",
      localite: piste.commune || "N/A",
      kilometrage: parseFloat(piste.kilometrage || 0).toFixed(1),
      chaussees_count: piste.chaussees?.count || 0,
      chaussees_km: parseFloat(piste.chaussees?.km || 0).toFixed(1),
      buses: piste.buses || 0,
      ponts: piste.ponts || 0,
      dalots: piste.dalots || 0,
      bacs: piste.bacs || 0,
      ecoles: piste.ecoles || 0,
      marches: piste.marches || 0,
      services_sante: piste.services_santes || 0,
      autres: piste.autres_infrastructures || 0,
      batiments_admin: piste.batiments_administratifs || 0,
      hydrauliques: piste.infrastructures_hydrauliques || 0,
      localites: piste.localites || 0,
      passages: piste.passages_submersibles || 0
    }));
  }, [pistesCounts]);

  // Stats globales (globalStats pour les cartes en haut)
  const stats = useMemo(() => {
    if (!globalStats || Object.keys(globalStats).length === 0) {
      return {
        totalPistes: 0,
        totalChaussees: 0,
        totalOuvrages: 0,
        totalInfrastructures: 0
      };
    }

    const totalOuvrages = 
      (globalStats.buses || 0) +
      (globalStats.dalots || 0) +
      (globalStats.ponts || 0) +
      (globalStats.passages_submersibles || 0) +
      (globalStats.bacs || 0);
    
    const totalInfrastructures = 
      (globalStats.localites || 0) +
      (globalStats.ecoles || 0) +
      (globalStats.marches || 0) +
      (globalStats.batiments_administratifs || 0) +
      (globalStats.infrastructures_hydrauliques || 0) +
      (globalStats.services_santes || 0) +
      (globalStats.autres_infrastructures || 0);

    return {
      totalPistes: globalStats.pistes || 0,
      totalChaussees: globalStats.chaussees || 0,
      totalOuvrages,
      totalInfrastructures
    };
  }, [globalStats]);

  useEffect(() => {
    const tableContainer = document.querySelector('.dashboard-table');
    
    if (tableContainer) {
      const checkScroll = () => {
        const hasHorizontalScroll = tableContainer.scrollWidth > tableContainer.clientWidth;
        const hasVerticalScroll = tableContainer.scrollHeight > tableContainer.clientHeight;
        
        if (hasHorizontalScroll) {
          tableContainer.classList.add('has-horizontal-scroll');
        } else {
          tableContainer.classList.remove('has-horizontal-scroll');
        }
        
        if (hasVerticalScroll) {
          tableContainer.classList.add('has-vertical-scroll');
        } else {
          tableContainer.classList.remove('has-vertical-scroll');
        }
      };
      
      checkScroll();
      window.addEventListener('resize', checkScroll);
      
      return () => window.removeEventListener('resize', checkScroll);
    }
  }, [tableData]);

  const filteredData = useMemo(() => {
    return tableData.filter((item) => {
      const matchesSearch = 
        item.utilisateur.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code_piste.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.localite.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [tableData, searchTerm]);

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
          <p>Chargement des donnees... {loadingProgress}%</p>
          <div style={{
            width: '200px',
            height: '10px',
            backgroundColor: '#f3f3f3',
            borderRadius: '5px',
            margin: '1rem auto',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${loadingProgress}%`,
              height: '100%',
              backgroundColor: '#3498db',
              transition: 'width 0.3s'
            }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Tableau de Bord - Collectes</h1>
        </div>
        <div className="error-container" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#dc3545' }}>Erreur: {error}</p>
          <button 
            onClick={() => reloadData()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reessayer
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
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="actions-row">
          <button 
            className="btn btn-green" 
            onClick={() => reloadData()}
            title="Recharger les donnees depuis le serveur"
          >
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Statistiques globales depuis globalStats */}
      <div className="dashboard-stats">
        <div className="stats-card">
          <h3>{stats.totalPistes.toLocaleString()}</h3>
          <p>Total Pistes</p>
        </div>
        <div className="stats-card">
          <h3>{stats.totalChaussees.toLocaleString()}</h3>
          <p>Total Chaussees</p>
        </div>
        <div className="stats-card">
          <h3>{stats.totalOuvrages.toLocaleString()}</h3>
          <p>Total Ouvrages</p>
        </div>
        <div className="stats-card">
          <h3>{stats.totalInfrastructures.toLocaleString()}</h3>
          <p>Total Infrastructures</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="charts-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', margin: '2rem 0' }}>
        <div className="chart-card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '1rem' }}>Repartition par Type</h2>
          <BarChart />
        </div>

        <div className="chart-card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '1rem' }}>Distribution Generale</h2>
          <InfrastructureDonut />
        </div>
      </div>

      {/* Tableau des pistes */}
      <div className="dashboard-table">
        <table>
          <thead>
            <tr>
              <th>Code Piste</th>
              <th>Date</th>
              <th>Utilisateur</th>
              <th>Localite</th>
              <th>Km</th>
              <th>Chaussees</th> 
              <th>Buses</th>
              <th>Ponts</th>
              <th>Dalots</th>
              <th>Bacs</th>
              <th>Ecoles</th>
              <th>Marches</th>
              <th>Services Sante</th>
              <th>Autres</th>
              <th>Bat. Admin</th>
              <th>Hydrauliques</th>
              <th>Localites</th>
              <th>Passages Sub.</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.code_piste}>
                <td className="code-piste">{item.code_piste}</td>
                <td>{item.date}</td>
                <td className={item.utilisateur === "Non assigne" ? "non-assigne" : ""}>{item.utilisateur}</td>
                <td>{item.localite}</td>
                <td className="kilometrage-cell">{item.kilometrage} km</td>
                <td className="infra-count">
                  {item.chaussees_count > 0 ? (
                    <>
                      {item.chaussees_count}
                      {parseFloat(item.chaussees_km) > 0 && (
                        <span style={{ fontSize: '0.85em', color: '#666' }}> ({item.chaussees_km} km)</span>
                      )}
                    </>
                  ) : (
                    0
                  )}
                </td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dashboard-pagination">
        <p>Affichage de {filteredData.length} sur {tableData.length} elements</p>
      </div>
    </div>
  );
};

export default DashBoard;