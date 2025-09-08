// src/components/authService.js
const API_BASE_URL = 'http://localhost:8000/api';

class AuthService {
  // Connexion utilisateur
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mail: email,
          mdp: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Stocker les infos utilisateur dans localStorage
        localStorage.setItem('user', JSON.stringify(data));
        localStorage.setItem('isAuthenticated', 'true');
        return { success: true, user: data };
      } else {
        return { 
          success: false, 
          error: data.error || 'Erreur de connexion' 
        };
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return { 
        success: false, 
        error: 'Erreur de connexion au serveur' 
      };
    }
  }

  // Déconnexion
  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true';
  }

  // Obtenir l'utilisateur actuel
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  // Obtenir le rôle de l'utilisateur
  getUserRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }

  // Vérifier si l'utilisateur est super admin
  isSuperAdmin() {
    return this.getUserRole() === 'super_admin';
  }
}

export default new AuthService();