// src/components/pisteDashboardService.js
const API_BASE_URL = 'http://localhost:8000/api';

class PisteDashboardService {
    
    async getPistesDashboard() {
        try {
            console.log('🔄 Chargement données dashboard pistes...');
            
            const response = await fetch(`${API_BASE_URL}/pistes/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Données pistes récupérées:', result.data.total_pistes, 'pistes');
                return { success: true, data: result.data };
            } else {
                return { 
                    success: false, 
                    error: result.error || 'Erreur lors de la récupération des données' 
                };
            }
        } catch (error) {
            console.error('❌ Erreur getPistesDashboard:', error);
            return { 
                success: false, 
                error: 'Erreur de connexion au serveur' 
            };
        }
    }
}

export default new PisteDashboardService();