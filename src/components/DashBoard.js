import React, { useState } from "react";
import "./DashBoard.css";
import { FaFileCsv, FaFileExcel, FaChartBar } from "react-icons/fa";
import { FaRegFileAlt } from "react-icons/fa"; // pour un icône de rapport générique

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("Tous les types");
  const [selectedEtat, setSelectedEtat] = useState("Tous les états");

  const data = [
    {
      id: "001",
      date: "2025-07-20",
      utilisateur: "Mamadou Diallo",
      piste: "P-001",
      type: "Chaussée",
      localite: "Conakry",
      etat: "Bon",
      coordonnees: "9.6412, -13.5784",
      observations: "Revêtement en bon état",
    },
    {
      id: "002",
      date: "2025-07-20",
      utilisateur: "Fatoumata Camara",
      piste: "P-002",
      type: "Buse",
      localite: "Kankan",
      etat: "Moyen",
      coordonnees: "10.3856, -9.3666",
      observations: "Obstruction partielle",
    },
    {
      id: "003",
      date: "2025-07-21",
      utilisateur: "Ibrahima Bah",
      piste: "P-003",
      type: "Pont",
      localite: "Labé",
      etat: "Mauvais",
      coordonnees: "11.3234, -12.3456",
      observations: "Structure endommagée",
    },
    // ➕ Ajoute d'autres lignes ici si besoin
  ];
  const types = [
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
    "Autre infrastructure",
  ];
  const typeToColor = {
    Chaussée: "purple",
    Buse: "blue",
    Pont: "green",
    Dalot: "yellow",
    "Passage submersible": "red",
    Bac: "purple",
    Piste: "yellow",
    Localité: "blue",
    École: "green",
    Marché: "yellow",
    "Bâtiment administratif": "purple",
    "Infrastructure hydraulique": "blue",
    "Service de santé": "red",
    "Autre infrastructure": "purple",
  };
  const etatToClass = {
    Bon: "good",
    Moyen: "medium",
    Mauvais: "bad",
  };

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.utilisateur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.localite.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      selectedType === "Tous les types" || item.type === selectedType;

    const matchesEtat =
      selectedEtat === "Tous les états" || item.etat === selectedEtat;

    return matchesSearch && matchesType && matchesEtat;
  });

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header">
        <img
          src="https://img.icons8.com/ios-filled/50/000000/combo-chart.png"
          alt="icon"
        />

        <h1>Données Collectées sur le Terrain</h1>
        <p>
          Système de visualisation et gestion des infrastructures routières -
          Guinée
        </p>
      </div>

      <div className="dashboard-filters">
        <input
          placeholder="🔍 Rechercher par localité, utilisateur, type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option>Tous les types</option>
          {types.map((type, index) => (
            <option key={index}>{type}</option>
          ))}
        </select>
        <select
          value={selectedEtat}
          onChange={(e) => setSelectedEtat(e.target.value)}
        >
          <option>Tous les états</option>
          <option>Bon</option>
          <option>Moyen</option>
          <option>Mauvais</option>
        </select>
        <div className="buttons-export">
          <button className="csv">
            <FaFileCsv /> Export CSV
          </button>
          <button className="excel">
            <FaFileExcel /> Export Excel
          </button>
          <button className="report">📄 Rapport</button>
        </div>
      </div>

      <div className="dashboard-stats">
        <div>
          <h2>148</h2>
          <p>Points collectés</p>
        </div>
        <div>
          <h2>12</h2>
          <p>Utilisateurs actifs</p>
        </div>
        <div>
          <h2>23</h2>
          <p>Pistes référencées</p>
        </div>
        <div className="update-info">
          <h2>Aujourd’hui</h2>
          <p>Dernière mise à jour</p>
        </div>
      </div>

      <table className="dashboard-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Utilisateur</th>
            <th>Piste</th>
            <th>Type d’infrastructure</th>
            <th>Localité</th>
            <th>État</th>
            <th>Coordonnées</th>
            <th>Observations</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, index) => (
            <tr key={index}>
              <td>{row.id}</td>
              <td>{row.date}</td>
              <td>{row.utilisateur}</td>
              <td>{row.piste}</td>
              <td>
                <span className={`badge ${typeToColor[row.type] || "purple"}`}>
                  {row.type}
                </span>
              </td>
              <td>{row.localite}</td>
              <td>
                <span className={`etat ${etatToClass[row.etat] || "medium"}`}>
                  {row.etat}
                </span>
              </td>
              <td>{row.coordonnees}</td>
              <td>{row.observations}</td>
              <td className="actions">
                <button className="voir">👁️ Voir</button>
                <button className="modifier">✏️ Modifier</button>
                <button className="supprimer">🗑️ Supprimer</button>
              </td>
            </tr>
          ))}

          {/* Ajoute d'autres lignes comme nécessaire */}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
