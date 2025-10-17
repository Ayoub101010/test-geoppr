# api/auth_utils.py
# ⚠️ COPIER CE FICHIER DANS : api/auth_utils.py

"""
Utilitaires d'authentification sécurisée
Compatible avec la structure existante de la table login
"""
import hashlib
import secrets
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken


class PasswordHasher:
    """
    Gestion sécurisée des mots de passe
    Compatible avec migration progressive depuis mdp en clair
    """
    
    @staticmethod
    def hash_password(password):
        """Hash un mot de passe avec SHA-256 + salt"""
        salt = secrets.token_hex(16)
        pwd_hash = hashlib.sha256(f"{password}{salt}".encode()).hexdigest()
        return f"sha256${salt}${pwd_hash}"
    
    @staticmethod
    def verify_password(password, stored_hash):
        """
        Vérifie un mot de passe
        Supporte :
        - Anciens mdp en clair (rétrocompatibilité)
        - Nouveaux mdp hashés
        """
        if not stored_hash:
            return False
        
        # Si c'est un ancien mot de passe en clair
        if not stored_hash.startswith('sha256$'):
            return password == stored_hash
        
        # Si c'est un nouveau hash
        try:
            _, salt, pwd_hash = stored_hash.split('$')
            new_hash = hashlib.sha256(f"{password}{salt}".encode()).hexdigest()
            return new_hash == pwd_hash
        except ValueError:
            return False
    
    @staticmethod
    def needs_rehash(stored_hash):
        """Vérifie si le mdp doit être re-hashé"""
        return not stored_hash.startswith('sha256$')


class JWTManager:
    """Gestion des tokens JWT"""
    
    @staticmethod
    def generate_tokens(user):
        """
        Génère access_token et refresh_token pour un utilisateur
        """
        refresh = RefreshToken()
        
        # Ajout des données utilisateur dans le payload
        refresh['user_id'] = user.id
        refresh['email'] = user.mail
        refresh['role'] = user.role
        refresh['nom'] = user.nom
        refresh['prenom'] = user.prenom
        
        # Données commune si présente
        if user.communes_rurales_id:
            refresh['commune_id'] = user.communes_rurales_id.id
            refresh['commune_nom'] = user.communes_rurales_id.nom
        
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'expires_in': 3600  # 1 heure
        }
    
    @staticmethod
    def format_user_data(user):
        """Formatte les données utilisateur pour le frontend"""
        data = {
            'id': user.id,
            'nom': user.nom,
            'prenom': user.prenom,
            'mail': user.mail,
            'role': user.role,
        }
        
        # Ajout des infos géographiques si présentes
        if user.communes_rurales_id:
            commune = user.communes_rurales_id
            data['commune'] = {
                'id': commune.id,
                'nom': commune.nom
            }
            
            if commune.prefectures_id:
                prefecture = commune.prefectures_id
                data['prefecture'] = {
                    'id': prefecture.id,
                    'nom': prefecture.nom
                }
                
                if prefecture.regions_id:
                    region = prefecture.regions_id
                    data['region'] = {
                        'id': region.id,
                        'nom': region.nom
                    }
        
        return data