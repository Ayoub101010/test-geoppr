

const API_BASE_URL = 'http://localhost:8000/api';

class AuthService {
  constructor() {
    this.setupTokenRefresh();
  }

  /**
   * Connexion utilisateur avec gestion JWT
   */
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

      if (response.ok && data.success) {
        this.setTokens(data.tokens);
        this.setUser(data.user);
        this.startTokenRefresh();
        
        return { 
          success: true, 
          user: data.user,
          message: data.message 
        };
      } else {
        return { 
          success: false, 
          error: data.error || 'Erreur de connexion'
        };
      }
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      return { 
        success: false, 
        error: 'Impossible de contacter le serveur' 
      };
    }
  }

  /**
   * Déconnexion sécurisée
   */
  logout() {
    this.stopTokenRefresh();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('isAuthenticated');
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated() {
    const token = this.getAccessToken();
    const expiresAt = localStorage.getItem('token_expires_at');
    
    if (!token || !expiresAt) {
      return false;
    }
    
    return Date.now() < parseInt(expiresAt);
  }

  /**
   * Obtenir l'utilisateur actuel
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Obtenir le rôle de l'utilisateur
   */
  getUserRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }

  /**
   * Vérifier si super admin
   */
  isSuperAdmin() {
    return this.getUserRole() === 'super_admin';
  }

  /**
   * Vérifier si admin
   */
  isAdmin() {
    const role = this.getUserRole();
    return role === 'admin' || role === 'super_admin';
  }

  // ==========================================
  // GESTION JWT
  // ==========================================

  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  setTokens(tokens) {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    
    const expiresAt = Date.now() + (tokens.expires_in * 1000);
    localStorage.setItem('token_expires_at', expiresAt);
    localStorage.setItem('isAuthenticated', 'true');
  }

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshToken
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('access_token', data.access);
        
        const expiresAt = Date.now() + (data.expires_in * 1000);
        localStorage.setItem('token_expires_at', expiresAt);
        
        console.log('✅ Token rafraîchi');
        return true;
      } else {
        this.logout();
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur refresh token:', error);
      this.logout();
      return false;
    }
  }

  setupTokenRefresh() {
    this.refreshInterval = null;
  }

  startTokenRefresh() {
    this.stopTokenRefresh();
    
    this.refreshInterval = setInterval(() => {
      const expiresAt = localStorage.getItem('token_expires_at');
      if (expiresAt) {
        const timeUntilExpiry = parseInt(expiresAt) - Date.now();
        
        if (timeUntilExpiry < 10 * 60 * 1000) {
          this.refreshAccessToken();
        }
      }
    }, 5 * 60 * 1000);
  }

  stopTokenRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  getAuthHeader() {
    const token = this.getAccessToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}

export default new AuthService();