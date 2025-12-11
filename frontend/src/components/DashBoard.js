import React, { useState, useMemo, useEffect } from "react";
import "./DashBoard.css";
import { FaFileCsv, FaFileExcel, FaChartBar } from "react-icons/fa";
import { FaRegFileAlt } from "react-icons/fa";
import useinfrastructuredata from "./useinfrastructuredata";

const DashBoard = () => {
  const { pistesCounts, loading, error, reloadData, loadingProgress } = useinfrastructuredata();
  const [searchTerm, setSearchTerm] = useState("");

  const data = useMemo(() => {
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
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = 
        item.utilisateur.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code_piste.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.localite.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [data, searchTerm]);

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

      <div className="dashboard-stats">
        <div className="stats-card">
          <h3>{data.length}</h3>
          <p>Total des pistes</p>
        </div>
        <div className="stats-card">
          <h3>{data.filter(d => d.utilisateur !== "Non assigne").length}</h3>
          <p>Avec utilisateur</p>
        </div>
        <div className="stats-card">
          <h3>{data.reduce((sum, d) => sum + parseFloat(d.kilometrage), 0).toFixed(1)} km</h3>
          <p>Kilometrage total</p>
        </div>
        <div className="stats-card">
          <h3>{data.reduce((sum, d) => sum + d.chaussees_count + d.buses + d.ponts + d.dalots + d.bacs + d.ecoles + d.marches + d.services_sante + d.autres + d.batiments_admin + d.hydrauliques + d.localites + d.passages, 0)}</h3>
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
        <p>Affichage de {filteredData.length} sur {data.length} elements</p>
      </div>
    </div>
  );
};

export default DashBoard;