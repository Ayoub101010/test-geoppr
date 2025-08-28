import React, { useState } from "react";
import AddUserModal from "./AddUserModal";

import "./GestionUserPage.css";

const GestionUserPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(""); // "view", "edit", "delete"
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
  });
  const handleAddUser = () => {
    console.log("Nouvel utilisateur ajouté :", newUser);
    setShowAddModal(false);
    setNewUser({ nom: "", prenom: "", email: "", password: "" });
  };
  const handleAction = (user, type) => {
    setSelectedUser(user);
    setActionType(type);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setActionType("");
  };

  return (
    <div className="gestion-user-wrapper">
      <div className="gestion-header">
        <img
          src="https://img.icons8.com/ios-filled/50/security-checked.png"
          alt="icon"
        />
        <h1>Gestion des Utilisateurs</h1>
        <p>Système de gestion des comptes utilisateurs - Guinée</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card users">
          <div className="stat-label">Total Utilisateurs</div>
          <div className="stat-value">156</div>
        </div>
        <div className="stat-card active">
          <div className="stat-label">Utilisateurs Actifs</div>
          <div className="stat-value">134</div>
        </div>
        <div className="stat-card inactive">
          <div className="stat-label">Inactifs</div>
          <div className="stat-value">18</div>
        </div>
        <div className="stat-card blocked">
          <div className="stat-label">Bloqués</div>
          <div className="stat-value">4</div>
        </div>
      </div>

      <div className="gestion-controls">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, email, rôle..."
          className="search-input"
        />
        <div className="btn-group">
          <button className="btn green" onClick={() => setShowAddModal(true)}>
            ➕ Nouvel utilisateur
          </button>
          {showAddModal && (
            <AddUserModal
              onClose={() => setShowAddModal(false)}
              onSubmit={handleAddUser}
              formData={newUser}
              setFormData={setNewUser}
            />
          )}
          <button className="btn blue">📊 Exporter</button>
        </div>
      </div>

      <div className="users-table-container">
        <table>
          <thead>
            <tr>
              <th>
                <input type="checkbox" />
              </th>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Dernière Connexion</th>
              <th>Région</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <input type="checkbox" />
              </td>
              <td>Mamadou Diallo</td>
              <td>Agent Collecteur</td>
              <td>
                <span className="badge green">Actif</span>
              </td>
              <td>2025-07-20</td>
              <td>Conakry</td>
              <td className="actions">
                <button
                  className="voir"
                  onClick={() =>
                    handleAction(
                      {
                        name: "Mamadou Diallo",
                        role: "Agent Collecteur",
                        status: "Actif",
                        region: "Conakry",
                        lastLogin: "2025-07-20",
                      },
                      "view"
                    )
                  }
                >
                  👁️Voir
                </button>
                <button
                  className="modifier"
                  onClick={() =>
                    handleAction({ name: "Mamadou Diallo" }, "edit")
                  }
                >
                  ✏️Modifier
                </button>
                <button
                  className="supprimer"
                  onClick={() =>
                    handleAction({ name: "Mamadou Diallo" }, "delete")
                  }
                >
                  🗑️Supprimer
                </button>
              </td>
            </tr>
            <tr>
              <td>
                <input type="checkbox" />
              </td>
              <td>Fatoumata Camara</td>
              <td>Administrateur</td>
              <td>
                <span className="badge gray">Inactif</span>
              </td>
              <td>2025-07-18</td>
              <td>Kankan</td>
              <td className="actions">
                <button className="voir">👁️Voir</button>
                <button className="modifier">✏️Modifier</button>
                <button className="supprimer">🗑️Supprimer</button>
              </td>
            </tr>
            <tr>
              <td>
                <input type="checkbox" />
              </td>
              <td>Abdoulaye Bah</td>
              <td>Superviseur</td>
              <td>
                <span className="badge red">Bloqué</span>
              </td>
              <td>2025-07-17</td>
              <td>Labé</td>
              <td className="actions">
                <button className="voir">👁️Voir</button>
                <button className="modifier">✏️Modifier</button>
                <button className="supprimer">🗑️Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
        {selectedUser && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>
                {actionType === "view" && "Détails de l'utilisateur"}
                {actionType === "edit" && "Modifier l'utilisateur"}
                {actionType === "delete" && "Confirmation de suppression"}
              </h2>

              {actionType === "view" && (
                <div>
                  <p>
                    <strong>Nom:</strong> {selectedUser.name}
                  </p>
                  <p>
                    <strong>Rôle:</strong> {selectedUser.role}
                  </p>
                  <p>
                    <strong>Statut:</strong> {selectedUser.status}
                  </p>
                  <p>
                    <strong>Région:</strong> {selectedUser.region}
                  </p>
                  <p>
                    <strong>Dernière Connexion:</strong>{" "}
                    {selectedUser.lastLogin}
                  </p>
                </div>
              )}

              {actionType === "edit" && (
                <form
                  className="edit-form"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <label>Nom</label>
                  <input type="text" defaultValue={selectedUser.name} />

                  <label>Rôle</label>
                  <input type="text" defaultValue={selectedUser.role} />

                  <label>Statut</label>
                  <select defaultValue={selectedUser.status}>
                    <option>Actif</option>
                    <option>Inactif</option>
                    <option>Bloqué</option>
                  </select>

                  <label>Dernière Connexion</label>
                  <input type="date" defaultValue={selectedUser.lastLogin} />

                  <label>Région</label>
                  <input type="text" defaultValue={selectedUser.region} />

                  <button type="submit" className="btn green">
                    💾 Enregistrer
                  </button>
                </form>
              )}

              {actionType === "delete" && (
                <div>
                  <p>
                    Voulez-vous vraiment supprimer{" "}
                    <strong>{selectedUser.name}</strong> ?
                  </p>
                  <button className="btn red" onClick={closeModal}>
                    🗑️ Oui, supprimer
                  </button>
                </div>
              )}

              <button className="btn" onClick={closeModal}>
                ❌ Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionUserPage;
