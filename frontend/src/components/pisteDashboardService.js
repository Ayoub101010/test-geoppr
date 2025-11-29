const API_BASE_URL = 'http://localhost:8000/api';

class PisteDashboardService {
    
    async getPistesDashboard() {
        try {
            console.log('🔄 Chargement données dashboard (sans pagination)...');
            
            const startTime = performance.now();
            
            const response = await fetch(`${API_BASE_URL}/pistes/web/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            console.log(`✅ ${data.length} pistes chargées en ${duration}s`);
            
            return { 
                success: true, 
                data: {
                    total_pistes: data.length,
                    pistes: data,
                    features: data
                }
            };
            
        } catch (error) {
            console.error('❌ Erreur chargement dashboard:', error);
            return { 
                success: false, 
                error: 'Erreur de connexion au serveur' 
            };
        }
    }
}

export default new PisteDashboardService();