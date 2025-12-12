// DataTrackingPage.js
import React, { useEffect, useState, useMemo } from "react";
import "./DashBoard.css";
import dataservice, { ENDPOINTS, updateRow } from "./dataservice";

import sessionCache from "./sessioncache";
import cacheservice from "./cacheservice";

// Liste des couches affichées dans le menu de gauche
const LAYERS = [
  { id: "pistes", label: "Pistes" },
  { id: "chaussees", label: "Chaussées" },
  { id: "buses", label: "Buses" },
  { id: "dalots", label: "Dalots" },
  { id: "ponts", label: "Ponts" },
  { id: "passages_submersibles", label: "Passages submersibles" },
  { id: "bacs", label: "Bacs" },
  { id: "ecoles", label: "Écoles" },
  { id: "marches", label: "Marchés" },
  { id: "services_santes", label: "Services de santé" },
  { id: "batiments_administratifs", label: "Bâtiments administratifs" },
  {
    id: "infrastructures_hydrauliques",
    label: "Infrastructures hydrauliques",
  },
  { id: "localites", label: "Localités" },
  { id: "autres_infrastructures", label: "Autres infrastructures" },
];

// ---------- Normalisation d'une ligne générique (GeoJSON ou objet simple)
function normalizeRow(item) {
  const base = item?.properties || item || {};
  const row = {};

  // conserver un identifiant
  if (item.fid !== undefined) row.fid = item.fid;
  if (item.id !== undefined && base.id === undefined) row.id = item.id;

  Object.keys(base).forEach((key) => {
    if (key === "geom" || key === "geometry") return;

    const value = base[key];

    if (value === null || value === undefined) {
      row[key] = "";
    } else if (typeof value === "object") {
      // cas typiques login, commune, etc.
      if (value.nom && value.prenom) {
        row[key] = `${value.nom} ${value.prenom}`.trim();
      } else if (value.nom) {
        row[key] = value.nom;
      } else if (value.name) {
        row[key] = value.name;
      } else if (value.id !== undefined) {
        row[key] = value.id;
      } else {
        row[key] = JSON.stringify(value);
      }
    } else {
      row[key] = value;
    }
  });

  return row;
}

// ---------- Petit helper pour récupérer un tableau quel que soit le format
function extractArray(layerData) {
  if (!layerData) return [];
  if (Array.isArray(layerData)) return layerData;

  // GeoJSON FeatureCollection ?
  if (Array.isArray(layerData.features)) return layerData.features;

  // format paginé éventuel
  if (Array.isArray(layerData.results)) return layerData.results;

  return [];
}

const DataTrackingPage = () => {
  const [infrastructureData, setInfrastructureData] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState("pistes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [editedRows, setEditedRows] = useState([]); // version modifiable
  const [saving, setSaving] = useState(false); // état du bouton Sauvegarder

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 100;

  // ---------- Chargement des données (cache session -> IndexedDB -> API)
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        let data = sessionCache.getInfrastructureData();

        if (!data) {
          data = await cacheservice.getInfrastructureData();
        }

        if (!data) {
          const result = await dataservice.loadAllInfrastructures();
          if (!result.success) {
            throw new Error(
              result.error || "Impossible de charger les données"
            );
          }
          data = result.data;
          sessionCache.saveInfrastructureData(data);
          await cacheservice.saveInfrastructureData(data);
        }

        if (!isMounted) return;

        setInfrastructureData(data);

        // choisir une couche avec des données
        const firstWithData = LAYERS.find((l) => {
          const arr = extractArray(data[l.id]);
          return arr.length > 0;
        });

        if (firstWithData) {
          setSelectedLayer(firstWithData.id);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError(err.message || "Erreur lors du chargement des données.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // ---------- Préparation des lignes / colonnes à partir des données brutes
  const { rows, columns, rawRows } = useMemo(() => {
    if (!infrastructureData || !selectedLayer) {
      return { rows: [], columns: [], rawRows: [] };
    }

    const raw = extractArray(infrastructureData[selectedLayer]);

    const normalized = raw.map((item, index) => ({
      __index: index, // index de référence vers rawRows
      ...normalizeRow(item),
    }));

    const cols =
      normalized.length > 0
        ? Object.keys(normalized[0]).filter((c) => c !== "__index")
        : [];

    return { rows: normalized, columns: cols, rawRows: raw };
  }, [infrastructureData, selectedLayer]);

  // ---------- Quand les rows changent : recopie pour édition + reset page
  useEffect(() => {
    if (!rows || !rows.length) {
      setEditedRows([]);
      setCurrentPage(1);
      return;
    }
    setEditedRows(rows.map((r) => ({ ...r })));
    setCurrentPage(1); // ✅ sans le "+" devant
  }, [rows]);

  // ---------- Filtrage sur la version éditable
  const filteredRows = useMemo(() => {
    if (!search.trim()) return editedRows;

    const term = search.toLowerCase();

    return editedRows.filter((row) =>
      Object.entries(row).some(([key, val]) => {
        if (key === "__index") return false;
        return String(val ?? "")
          .toLowerCase()
          .includes(term);
      })
    );
  }, [editedRows, search]);

  // ---------- Pagination
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredRows.slice(start, end);
  }, [filteredRows, currentPage]);

  const totalPages = useMemo(() => {
    if (!filteredRows.length) return 1;
    return Math.ceil(filteredRows.length / PAGE_SIZE);
  }, [filteredRows]);

  const currentLabel =
    LAYERS.find((l) => l.id === selectedLayer)?.label || selectedLayer;

  // ---------- Utilitaire téléchargement fichier
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ---------- Export CSV
  const handleExportCSV = () => {
    if (!columns.length || !filteredRows.length) {
      alert("Aucune donnée à exporter.");
      return;
    }

    const sep = ";";
    const header = columns.join(sep);

    const lines = filteredRows.map((row) =>
      columns
        .map((col) => {
          let value = row[col];
          if (value === null || value === undefined) value = "";
          value = String(value).replace(/"/g, '""');
          if (
            value.includes('"') ||
            value.includes(sep) ||
            value.includes("\n")
          ) {
            value = `"${value}"`;
          }
          return value;
        })
        .join(sep)
    );

    const csv = [header, ...lines].join("\n");

    downloadFile(
      csv,
      `pprcollecte_${selectedLayer}.csv`,
      "text/csv;charset=utf-8;"
    );
  };

  // ---------- Export GeoJSON
  const handleExportGeoJSON = () => {
    if (!rawRows.length || !filteredRows.length) {
      alert("Aucune donnée à exporter.");
      return;
    }

    const indices = filteredRows
      .map((r) => r.__index)
      .filter((i) => typeof i === "number" && i >= 0 && i < rawRows.length);

    const indexSet = new Set(indices);
    const features = [];

    indexSet.forEach((i) => {
      const item = rawRows[i];
      if (!item) return;

      if (item.type === "Feature") {
        features.push(item);
      } else {
        let geometry = null;
        if (item.geometry) geometry = item.geometry;
        else if (item.geom) geometry = item.geom;

        const properties = { ...item };
        delete properties.geometry;
        delete properties.geom;

        features.push({
          type: "Feature",
          geometry,
          properties,
        });
      }
    });

    if (!features.length) {
      alert("Aucune géométrie valide à exporter.");
      return;
    }

    const geojson = {
      type: "FeatureCollection",
      features,
    };

    downloadFile(
      JSON.stringify(geojson, null, 2),
      `pprcollecte_${selectedLayer}.geojson`,
      "application/geo+json;charset=utf-8;"
    );
  };

  // ---------- Modification d'une cellule
  const handleCellChange = (rowIndex, column, value) => {
    setEditedRows((prev) =>
      prev.map((row) =>
        row.__index === rowIndex ? { ...row, [column]: value } : row
      )
    );
  };

  // ---------- Sauvegarde en base
  const handleSaveChanges = async () => {
    if (!selectedLayer) return;

    if (!editedRows || editedRows.length === 0) {
      alert("Aucune modification à sauvegarder.");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    try {
      setSaving(true);

      for (const edited of editedRows) {
        const original = rows.find((r) => r.__index === edited.__index);
        const raw = rawRows[edited.__index];

        if (!original || !raw) continue;

        const baseProps = raw.properties || raw;
        const payload = {};

        columns.forEach((col) => {
          if (col === "__index" || col === "id" || col === "fid") return;

          const oldVal = original[col] ?? "";
          const newVal = edited[col] ?? "";

          if (String(oldVal) === String(newVal)) return;

          if (
            Object.prototype.hasOwnProperty.call(baseProps, col) &&
            typeof baseProps[col] === "object" &&
            baseProps[col] !== null
          ) {
            return;
          }

          payload[col] = newVal === "-" ? "" : newVal;
        });

        if (Object.keys(payload).length === 0) {
          continue;
        }

        const id = edited.id ?? raw.id ?? edited.fid ?? raw.fid;
        if (!id) {
          console.warn(
            "Impossible de mettre à jour une ligne sans id:",
            edited
          );
          errorCount++;
          continue;
        }

        const result = await updateRow(selectedLayer, id, payload);

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      if (successCount > 0) {
        try {
          await cacheservice.clearInfrastructureData();
          sessionCache.clear();
          console.log("🧹 Caches vidés après sauvegarde");

          const fresh = await dataservice.loadAllInfrastructures();
          if (fresh.success && fresh.data) {
            setInfrastructureData(fresh.data);
          }
        } catch (e) {
          console.warn("Erreur lors du rechargement global des données:", e);
        }
      }

      alert(
        `Sauvegarde terminée : ${successCount} ligne(s) mise(s) à jour, ${errorCount} erreur(s).`
      );
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la sauvegarde : " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard">
      {/* HEADER BLEU */}
      <div className="data-tracking-header">
        <div className="data-tracking-header-icon">
          <i className="fas fa-database"></i>
        </div>
        <h1 className="data-tracking-header-title">Suivi des données</h1>
        <p className="data-tracking-header-subtitle">
          Visualisation détaillée des données collectées, table par table.
        </p>
      </div>

      <div className="data-tracking-layout">
        {/* Sidebar gauche */}
        <div className="data-tracking-sidebar">
          <h3>DONNÉES</h3>
          <ul className="data-tracking-list">
            {LAYERS.map((layer) => {
              const layerData =
                infrastructureData && infrastructureData[layer.id];
              const arr = extractArray(layerData);
              const count = arr.length;

              return (
                <li
                  key={layer.id}
                  className={
                    layer.id === selectedLayer
                      ? "data-tracking-item active"
                      : "data-tracking-item"
                  }
                  onClick={() => setSelectedLayer(layer.id)}
                >
                  <span>{layer.label}</span>
                  <span className="data-tracking-count">{count}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Partie droite : filtres + tableau */}
        <div className="data-tracking-table-container">
          <div className="dashboard-controls">
            <div
              className="filters-row"
              style={{ justifyContent: "space-between" }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  Données :{" "}
                  <span style={{ color: "#009460" }}>{currentLabel}</span>
                </h2>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#555" }}>
                  {rows.length} enregistrements trouvés.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Rechercher dans le tableau..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: "0.4rem 0.6rem", minWidth: "260px" }}
                />
              </div>
            </div>

            {/* Boutons d'action */}
            <div
              className="actions-row"
              style={{ justifyContent: "flex-end", marginTop: "0.5rem" }}
            >
              <button
                className="btn btn-outline"
                onClick={handleExportCSV}
                type="button"
              >
                Export CSV
              </button>

              <button
                className="btn btn-green"
                onClick={handleExportGeoJSON}
                type="button"
                style={{ marginLeft: "0.5rem" }}
              >
                Export GeoJSON
              </button>

              <button
                className="btn btn-green"
                type="button"
                onClick={handleSaveChanges}
                disabled={saving}
                style={{
                  marginLeft: "0.5rem",
                  background: "linear-gradient(45deg, #009460, #00b37a)",
                }}
              >
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>

          {loading && (
            <div className="dashboard-loading">Chargement des données…</div>
          )}

          {error && !loading && <div className="dashboard-error">{error}</div>}

          {!loading && !error && (
            <>
              <div className="dashboard-table data-tracking-table">
                <table>
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col}>{col.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row, idx) => (
                      <tr key={row.fid || row.id || row.__index || idx}>
                        {columns.map((col) => {
                          const rawValue =
                            row[col] === null || row[col] === undefined
                              ? ""
                              : row[col];
                          const strValue = String(rawValue);
                          const size = Math.min(30, strValue.length || 1);

                          return (
                            <td key={col}>
                              <input
                                className="data-tracking-input"
                                value={strValue}
                                placeholder="-"
                                size={size}
                                title={strValue}
                                onChange={(e) =>
                                  handleCellChange(
                                    row.__index,
                                    col,
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="data-tracking-pagination">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ◀ Précédent
                  </button>

                  <span style={{ margin: "0 1rem" }}>
                    Page {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Suivant ▶
                  </button>
                </div>
              </div>

              <div className="dashboard-pagination">
                <p>
                  Affichage de {filteredRows.length} lignes sur {rows.length}{" "}
                  pour {currentLabel}.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataTrackingPage;
