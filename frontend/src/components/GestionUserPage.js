import React, { useState, useEffect } from "react";
import CommuneSelector from "./CommuneSelector";
import userManagementService from "./userManagementService"; // Service dédié
import "./GestionUserPage.css";

const GestionUserPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(""); // "view", "edit", "delete"
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  const [newUser, setNewUser] = useState({
    nom: "",
    prenom: "",
    mail: "",
    mdp: "",
    role: "user",
    communes_rurales_id: ""
  });

  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    users: 0,
    admins: 0,
    super_admins: 0
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userManagementService.getUsers();
      console.log("📦 Réponse brute backend :", response);
      if (response.success) {
        const usersList = response.data.users || response.data;
        console.log("👥 Liste des utilisateurs :", usersList);
        setUsers(usersList);
        calculateStats(usersList);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
    setLoading(false);
  };

  const calculateStats = (usersList) => {
    const total = usersList.length;
    const users = usersList.filter(u => u.role === 'user').length;
    const admins = usersList.filter(u => u.role === 'admin').length;
    const super_admins = usersList.filter(u => u.role === 'super_admin').length;
    
    setStats({ total, users, admins, super_admins });
  };

  const handleAddUser = async () => {
    if (!newUser.nom || !newUser.prenom || !newUser.mail || !newUser.mdp) {
    alert('Nom, prénom, email et mot de passe sont obligatoires');
    return;
  }

    setLoading(true);
    try {
      const response = await userManagementService.createUser(newUser);
      if (response.success) {
        alert('Utilisateur créé avec succès !');
        setShowAddModal(false);
        setNewUser({
          nom: "",
          prenom: "",
          mail: "",
          mdp: "",
          role: "user",
          communes_rurales_id: ""
        });
        loadUsers();
      } else {
        alert('Erreur: ' + (response.error || 'Impossible de créer l\'utilisateur'));
      }
    } catch (error) {
      alert('Erreur lors de la création de l\'utilisateur');
      console.error(error);
    }
    setLoading(false);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await userManagementService.updateUser(selectedUser.id, selectedUser);
      if (response.success) {
        alert('Utilisateur modifié avec succès !');
        setActionType("");
        setSelectedUser(null);
        loadUsers();
      } else {
        alert('Erreur: ' + (response.error || 'Impossible de modifier l\'utilisateur'));
      }
    } catch (error) {
      alert('Erreur lors de la modification');
      console.error(error);
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await userManagementService.deleteUser(userId);
      if (response.success) {
        alert('Utilisateur supprimé avec succès !');
        loadUsers();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      alert('Erreur lors de la suppression');
      console.error(error);
    }
    setLoading(false);
  };

  const handleAction = (user, type) => {
    setSelectedUser({...user});
    setActionType(type);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setActionType("");
  };

  // Filtrage des utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.mail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.commune_nom && user.commune_nom.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === '' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role) => {
    switch(role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Administrateur';
      case 'user': return 'Utilisateur';
      default: return role;
    }
  };

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'super_admin': return 'green';
      case 'admin': return 'blue';
      case 'user': return 'gray';
      default: return 'gray';
    }
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

      {/* Statistiques mises à jour */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-label">Total Utilisateurs</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Utilisateurs</div>
          <div className="stat-value">{stats.users}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Administrateurs</div>
          <div className="stat-value">{stats.admins}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Super Admins</div>
          <div className="stat-value">{stats.super_admins}</div>
        </div>
      </div>

      {/* Contrôles avec filtre de rôle */}
      <div className="gestion-controls">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, email, commune..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="btn-group">
          <select 
            className="search-input" 
            style={{maxWidth: '200px', marginRight: '1rem'}}
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Tous les rôles</option>
            <option value="user">Utilisateurs</option>
            <option value="admin">Administrateurs</option>
            <option value="super_admin">Super Admins</option>
          </select>
          <button className="btn green" onClick={() => setShowAddModal(true)}>
            ➕ Nouvel utilisateur
          </button>
          <button className="btn blue">📊 Exporter</button>
        </div>
      </div>

      {/* Table des utilisateurs avec données réelles */}
      <div className="users-table-container">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', color: '#666' }}>
              Chargement des utilisateurs...
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <input type="checkbox" />
                </th>
                <th>Utilisateur</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Commune</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <input type="checkbox" />
                  </td>
                  <td>
                    <strong>{user.nom} {user.prenom}</strong>
                    <br />
                    <small style={{color: '#666'}}>ID: {user.id}</small>
                  </td>
                  <td>{user.mail}</td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td>
                    <strong>{user.commune_nom || 'Non assignée'}</strong>
                    {user.prefecture_nom && (
                      <div style={{fontSize: '0.8rem', color: '#666'}}>
                        {user.prefecture_nom}, {user.region_nom}
                      </div>
                    )}
                  </td>
                  <td className="actions">
                    <button
                      className="voir"
                      onClick={() => handleAction(user, "view")}
                    >
                      👁️ Voir
                    </button>
                    <button
                      className="modifier"
                      onClick={() => handleAction(user, "edit")}
                    >
                      ✏️ Modifier
                    </button>
                    
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: '#666'}}>
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Modales existantes mises à jour */}
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
                  <p><strong>Nom:</strong> {selectedUser.nom} {selectedUser.prenom}</p>
                  <p><strong>Email:</strong> {selectedUser.mail}</p>
                  <p><strong>Rôle:</strong> {getRoleLabel(selectedUser.role)}</p>
                  <p><strong>Commune:</strong> {selectedUser.commune_nom || 'Non assignée'}</p>
                  {selectedUser.prefecture_nom && (
                    <>
                      <p><strong>Préfecture:</strong> {selectedUser.prefecture_nom}</p>
                      <p><strong>Région:</strong> {selectedUser.region_nom}</p>
                    </>
                  )}
                </div>
              )}

              {actionType === "edit" && (
                <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
                  <label>Nom</label>
                  <input 
                    type="text" 
                    value={selectedUser.nom}
                    onChange={(e) => setSelectedUser({...selectedUser, nom: e.target.value})}
                  />

                  <label>Prénom</label>
                  <input 
                    type="text" 
                    value={selectedUser.prenom}
                    onChange={(e) => setSelectedUser({...selectedUser, prenom: e.target.value})}
                  />

                  <label>Email</label>
                  <input 
                    type="email" 
                    value={selectedUser.mail}
                    onChange={(e) => setSelectedUser({...selectedUser, mail: e.target.value})}
                  />

                  <label>Rôle</label>
                  <select 
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
                  >
                    <option value="user">Utilisateur</option>
                    <option value="admin">Administrateur</option>
                    <option value="super_admin">Super Administrateur</option>
                  </select>

                  <label style={{gridColumn: 'span 2'}}>Commune</label>
                  <div style={{gridColumn: 'span 2'}}>
                    <CommuneSelector
                      selectedCommune={selectedUser.communes_rurales_id}
                      onCommuneSelect={(communeId) => 
                        setSelectedUser({...selectedUser, communes_rurales_id: communeId})
                      }
                    />
                  </div>

                  <button type="button" className="btn green" onClick={handleEditUser}>
                    💾 Enregistrer
                  </button>
                </form>
              )}

              {actionType === "delete" && (
                <div>
                  <p>
                    Voulez-vous vraiment supprimer{" "}
                    <strong>{selectedUser.nom} {selectedUser.prenom}</strong> ?
                  </p>
                  <button className="btn red" onClick={() => {
                    handleDeleteUser(selectedUser.id);
                    closeModal();
                  }}>
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

        {/* Modal d'ajout d'utilisateur */}
        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Nouvel Utilisateur</h2>
              <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
                <label>Nom *</label>
                <input
                  type="text"
                  value={newUser.nom}
                  onChange={(e) => setNewUser({...newUser, nom: e.target.value})}
                  placeholder="Nom de famille"
                />

                <label>Prénom *</label>
                <input
                  type="text"
                  value={newUser.prenom}
                  onChange={(e) => setNewUser({...newUser, prenom: e.target.value})}
                  placeholder="Prénom"
                />

                <label>Email *</label>
                <input
                  type="email"
                  value={newUser.mail}
                  onChange={(e) => setNewUser({...newUser, mail: e.target.value})}
                  placeholder="adresse@email.com"
                />

                <label>Mot de passe *</label>
                <input
                  type="password"
                  value={newUser.mdp}
                  onChange={(e) => setNewUser({...newUser, mdp: e.target.value})}
                  placeholder="Mot de passe"
                />

                <label>Rôle *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                  <option value="super_admin">Super Administrateur</option>
                </select>

                <label style={{gridColumn: 'span 2'}}>Commune *</label>
                <div style={{gridColumn: 'span 2'}}>
                  <CommuneSelector
                    selectedCommune={newUser.communes_rurales_id}
                    onCommuneSelect={(communeId) => 
                      setNewUser({...newUser, communes_rurales_id: communeId})
                    }
                  />
                </div>

                <div style={{gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                  <button 
                    type="button"
                    className="btn"
                    onClick={() => setShowAddModal(false)}
                  >
                    ❌ Annuler
                  </button>
                  <button 
                    type="button"
                    className="btn green"
                    onClick={handleAddUser}
                    disabled={loading}
                  >
                    {loading ? 'Création...' : '💾 Créer l\'utilisateur'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionUserPage;