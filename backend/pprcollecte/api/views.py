from django.shortcuts import render
from django.db import transaction 
from .auth_utils import PasswordHasher, JWTManager

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import generics

from django.db.models import Count, Q
from django.contrib.gis.db.models.functions import Length, Transform

from .models import Login
from .serializers import LoginSerializer, PisteSerializer
from .models import Piste
from .models import (
    ServicesSantes, AutresInfrastructures, Bacs, BatimentsAdministratifs,
    Buses, Dalots, Ecoles, InfrastructuresHydrauliques, Localites,
    Marches, PassagesSubmersibles, Ponts, CommuneRurale, Prefecture, Region
)
from .serializers import (
    ServicesSantesSerializer, AutresInfrastructuresSerializer, BacsSerializer,
    BatimentsAdministratifsSerializer, BusesSerializer, DalotsSerializer,
    EcolesSerializer, InfrastructuresHydrauliquesSerializer, LocalitesSerializer,
    MarchesSerializer, PassagesSubmersiblesSerializer, PontsSerializer, CommuneRuraleSerializer,
      PrefectureSerializer, RegionSerializer,UserCreateSerializer, UserUpdateSerializer
)

class RegionsListCreateAPIView(generics.ListCreateAPIView):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer

class PrefecturesListCreateAPIView(generics.ListCreateAPIView):
    queryset = Prefecture.objects.all()
    serializer_class = PrefectureSerializer

class CommunesRuralesListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CommuneRuraleSerializer
    
    def get_queryset(self):
        queryset = CommuneRurale.objects.select_related(
            'prefectures_id',
            'prefectures_id__regions_id'
        )
        
        # Ajouter le filtre de recherche
        search = self.request.GET.get('q', '')
        if search:
            queryset = queryset.filter(nom__icontains=search)
        
        return queryset.order_by('nom')

class ServicesSantesListCreateAPIView(generics.ListCreateAPIView):
    queryset = ServicesSantes.objects.all()
    serializer_class = ServicesSantesSerializer

class AutresInfrastructuresListCreateAPIView(generics.ListCreateAPIView):
    queryset = AutresInfrastructures.objects.all()
    serializer_class = AutresInfrastructuresSerializer

class BacsListCreateAPIView(generics.ListCreateAPIView):
    queryset = Bacs.objects.all()
    serializer_class = BacsSerializer

class BatimentsAdministratifsListCreateAPIView(generics.ListCreateAPIView):
    queryset = BatimentsAdministratifs.objects.all()
    serializer_class = BatimentsAdministratifsSerializer

class BusesListCreateAPIView(generics.ListCreateAPIView):
    queryset = Buses.objects.all()
    serializer_class = BusesSerializer

class DalotsListCreateAPIView(generics.ListCreateAPIView):
    queryset = Dalots.objects.all()
    serializer_class = DalotsSerializer

class EcolesListCreateAPIView(generics.ListCreateAPIView):
    queryset = Ecoles.objects.all()
    serializer_class = EcolesSerializer

class InfrastructuresHydrauliquesListCreateAPIView(generics.ListCreateAPIView):
    queryset = InfrastructuresHydrauliques.objects.all()
    serializer_class = InfrastructuresHydrauliquesSerializer

class LocalitesListCreateAPIView(generics.ListCreateAPIView):
    queryset = Localites.objects.all()
    serializer_class = LocalitesSerializer

class MarchesListCreateAPIView(generics.ListCreateAPIView):
    queryset = Marches.objects.all()
    serializer_class = MarchesSerializer

class PassagesSubmersiblesListCreateAPIView(generics.ListCreateAPIView):
    queryset = PassagesSubmersibles.objects.all()
    serializer_class = PassagesSubmersiblesSerializer

class PontsListCreateAPIView(generics.ListCreateAPIView):
    queryset = Ponts.objects.all()
    serializer_class = PontsSerializer




class LoginAPIView(APIView):
    """
    API d'authentification sécurisée avec JWT
    - POST: Connexion avec email/password
    - GET: Liste des utilisateurs
    """
    
    def get(self, request):
        """Récupérer tous les utilisateurs"""
        users = Login.objects.select_related(
            'communes_rurales_id',
            'communes_rurales_id__prefectures_id',
            'communes_rurales_id__prefectures_id__regions_id'
        ).all()
        serializer = LoginSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Authentification sécurisée avec JWT - RÉSERVÉE AUX ADMINS"""
        mail = request.data.get('mail', '').strip()
        mdp = request.data.get('mdp', '')
        
        # Validation des entrées
        if not mail or not mdp:
            return Response({
                "success": False,
                "error": "Email et mot de passe requis"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Recherche utilisateur
        try:
            user = Login.objects.select_related(
                'communes_rurales_id',
                'communes_rurales_id__prefectures_id',
                'communes_rurales_id__prefectures_id__regions_id'
            ).get(mail=mail)
        except Login.DoesNotExist:
            return Response({
                "success": False,
                "error": "Email ou mot de passe incorrect"
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Vérification du mot de passe
        if not PasswordHasher.verify_password(mdp, user.mdp):
            return Response({
                "success": False,
                "error": "Email ou mot de passe incorrect"
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # 🔒 BLOQUER LES UTILISATEURS NORMAUX
        if user.role not in ['admin', 'super_admin']:
            return Response({
                "success": False,
                "error": "Connexion réservée aux administrateurs uniquement"
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Migration progressive des anciens mots de passe
        if PasswordHasher.needs_rehash(user.mdp):
            with transaction.atomic():
                user.mdp = PasswordHasher.hash_password(mdp)
                user.save(update_fields=['mdp'])
                print(f"✅ Mot de passe migré pour {user.mail}")
        
        # Génération des tokens JWT
        tokens = JWTManager.generate_tokens(user)
        user_data = JWTManager.format_user_data(user)
        
        return Response({
            "success": True,
            "user": user_data,
            "tokens": tokens,
            "message": "Connexion réussie"
        }, status=status.HTTP_200_OK)

class TokenRefreshAPIView(APIView):
    """Rafraîchir l'access token avec un refresh token"""
    
    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework_simplejwt.exceptions import TokenError
        
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response({
                "success": False,
                "error": "Refresh token requis"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            refresh = RefreshToken(refresh_token)
            return Response({
                "success": True,
                "access": str(refresh.access_token),
                "expires_in": 3600
            }, status=status.HTTP_200_OK)
        except TokenError:
            return Response({
                "success": False,
                "error": "Token invalide ou expiré"
            }, status=status.HTTP_401_UNAUTHORIZED)

class PisteListCreateAPIView(generics.ListCreateAPIView):
    queryset = Piste.objects.all()
    serializer_class = PisteSerializer

    def perform_create(self, serializer):
        serializer.save()

    def get(self, request):
        try:
            # Utilisation ORM avec annotations
            pistes = Piste.objects.select_related(
                'login_id',  # Relation vers utilisateur
                'communes_rurales_id'  # Relation vers commune
            ).annotate(
                # Calcul kilométrage avec ORM PostGIS
                kilometrage=Length(Transform('geom', 3857)) / 1000,
                
                # Comptage infrastructures par type avec ORM
                nb_buses=Count('buses', filter=Q(buses__code_piste__isnull=False)),
                nb_ponts=Count('ponts', filter=Q(ponts__code_piste__isnull=False)),
                nb_dalots=Count('dalots', filter=Q(dalots__code_piste__isnull=False)),
                nb_bacs=Count('bacs', filter=Q(bacs__code_piste__isnull=False)),
                nb_ecoles=Count('ecoles', filter=Q(ecoles__code_piste__isnull=False)),
                nb_marches=Count('marches', filter=Q(marches__code_piste__isnull=False)),
                nb_services_santes=Count('servicessantes', filter=Q(servicessantes__code_piste__isnull=False)),
                nb_autres_infrastructures=Count('autresinfrastructures', filter=Q(autresinfrastructures__code_piste__isnull=False)),
                nb_batiments_administratifs=Count('batimentsadministratifs', filter=Q(batimentsadministratifs__code_piste__isnull=False)),
                nb_infrastructures_hydrauliques=Count('infrastructureshydrauliques', filter=Q(infrastructureshydrauliques__code_piste__isnull=False)),
                nb_localites=Count('localites', filter=Q(localites__code_piste__isnull=False)),
                nb_passages_submersibles=Count('passagessubmersibles', filter=Q(passagessubmersibles__code_piste__isnull=False))
            ).order_by('-created_at')
            
            # Sérialisation des données
            pistes_data = []
            for piste in pistes:
                # Gestion des NULL avec ORM
                utilisateur_nom = piste.login_id.nom_complet if piste.login_id else "Non assigné"
                utilisateur_email = piste.login_id.email if piste.login_id else ""
                commune_nom = piste.communes_rurales_id.nom if piste.communes_rurales_id else "Non assignée"
                
                # Calcul total infrastructures
                total_infrastructures = (
                    piste.nb_buses + piste.nb_ponts + piste.nb_dalots +
                    piste.nb_bacs + piste.nb_ecoles + piste.nb_marches +
                    piste.nb_services_santes + piste.nb_autres_infrastructures +
                    piste.nb_batiments_administratifs + piste.nb_infrastructures_hydrauliques +
                    piste.nb_localites + piste.nb_passages_submersibles
                )
                
                piste_data = {
                    'id': piste.id,
                    'code_piste': piste.code_piste,
                    'nom_complet': f"{piste.nom_origine_piste} → {piste.nom_destination_piste}",
                    'nom_origine': piste.nom_origine_piste,
                    'nom_destination': piste.nom_destination_piste,
                    'utilisateur': utilisateur_nom,
                    'utilisateur_email': utilisateur_email,
                    'commune': commune_nom,
                    'kilometrage': round(float(piste.kilometrage or 0), 2),
                    'total_infrastructures': total_infrastructures,
                    'infrastructures_par_type': {
                        'Buses': piste.nb_buses,
                        'Ponts': piste.nb_ponts,
                        'Dalots': piste.nb_dalots,
                        'Bacs': piste.nb_bacs,
                        'Écoles': piste.nb_ecoles,
                        'Marchés': piste.nb_marches,
                        'Services Santé': piste.nb_services_santes,
                        'Autres Infrastructures': piste.nb_autres_infrastructures,
                        'Bâtiments Administratifs': piste.nb_batiments_administratifs,
                        'Infrastructures Hydrauliques': piste.nb_infrastructures_hydrauliques,
                        'Localités': piste.nb_localites,
                        'Passages Submersibles': piste.nb_passages_submersibles
                    },
                    'created_at': piste.created_at,
                    'updated_at': piste.updated_at
                }
                
                pistes_data.append(piste_data)
            
            return Response({
                'success': True,
                'data': {
                    'pistes': pistes_data,
                    'total_pistes': len(pistes_data),
                    'resume': {
                        'pistes_avec_utilisateur': len([p for p in pistes_data if p['utilisateur'] != 'Non assigné']),
                        'pistes_sans_utilisateur': len([p for p in pistes_data if p['utilisateur'] == 'Non assigné']),
                        'kilometrage_total': sum([p['kilometrage'] for p in pistes_data]),
                        'total_infrastructures': sum([p['total_infrastructures'] for p in pistes_data])
                    }
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Erreur lors de la récupération des données: {str(e)}'
            })

class UserManagementAPIView(APIView):
    """API dédiée à la gestion des utilisateurs par le super_admin"""
    
    def post(self, request):
        """Créer un nouvel utilisateur avec commune"""
        print(f"🔍 Données reçues pour création utilisateur:", request.data)  # Ajout debug
        
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            response_serializer = LoginSerializer(user)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            print(f"❌ Erreurs de validation:", serializer.errors)  # Ajout debug
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, user_id=None):
        """Lister tous les utilisateurs ou récupérer un utilisateur spécifique"""
        if user_id:
            try:
                user = Login.objects.select_related(
                    'communes_rurales_id',
                    'communes_rurales_id__prefectures_id',
                    'communes_rurales_id__prefectures_id__regions_id'
                ).get(id=user_id)
                serializer = LoginSerializer(user)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Login.DoesNotExist:
                return Response({"error": "Utilisateur non trouvé"}, status=status.HTTP_404_NOT_FOUND)
        else:
            queryset = Login.objects.select_related(
                'communes_rurales_id',
                'communes_rurales_id__prefectures_id',
                'communes_rurales_id__prefectures_id__regions_id'
            )
            
            role = request.GET.get('role')
            region_id = request.GET.get('region_id')
            prefecture_id = request.GET.get('prefecture_id')
            commune_id = request.GET.get('commune_id')
            
            if role:
                queryset = queryset.filter(role=role)
            if region_id:
                queryset = queryset.filter(communes_rurales_id__prefectures_id__regions_id=region_id)
            if prefecture_id:
                queryset = queryset.filter(communes_rurales_id__prefectures_id=prefecture_id)
            if commune_id:
                queryset = queryset.filter(communes_rurales_id=commune_id)
            
            serializer = LoginSerializer(queryset, many=True)
            return Response({
                'users': serializer.data,
                'total': queryset.count()
            }, status=status.HTTP_200_OK)
    
    def put(self, request, user_id=None):
        """Modifier un utilisateur existant"""
        print(f"🔍 PUT /api/users/{user_id}/ - Données reçues:", request.data)
        
        if not user_id:
            return Response({"error": "ID utilisateur requis"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = Login.objects.get(id=user_id)
            print(f"✅ Utilisateur trouvé: {user.nom} {user.prenom}")
        except Login.DoesNotExist:
            print(f"❌ Utilisateur {user_id} non trouvé")
            return Response({"error": "Utilisateur non trouvé"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            print("✅ Serializer valide")
            serializer.save()
            user.refresh_from_db()
            response_serializer = LoginSerializer(user)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        else:
            print(f"❌ Erreurs de validation: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, user_id=None):
        """Supprimer un utilisateur"""
        if not user_id:
            return Response({"error": "ID utilisateur requis"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = Login.objects.get(id=user_id)
            user_info = f"{user.nom} {user.prenom}"
            user.delete()
            return Response({
                "message": f"Utilisateur {user_info} supprimé avec succès"
            }, status=status.HTTP_200_OK)
        except Login.DoesNotExist:
            return Response({"error": "Utilisateur non trouvé"}, status=status.HTTP_404_NOT_FOUND)
        
class RegionsListAPIView(APIView):
    """
    API pour récupérer toutes les régions
    Modifiée pour le filtrage géographique
    """
    def get(self, request):
        try:
            from .models import Regions
            
            regions = Regions.objects.all().order_by('nom')
            
            data = []
            for region in regions:
                region_data = {
                    'id': region.id,
                    'nom': region.nom,
                }
                # Ajouter la géométrie si elle existe
                if region.geom:
                    region_data['geom'] = json.loads(region.geom.geojson)
                    
                data.append(region_data)
            
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PrefecturesFilteredAPIView(APIView):
    """
    API pour récupérer les préfectures avec filtrage par région
    """
    def get(self, request):
        try:
            from .models import Prefectures
            
            region_id = request.GET.get('region_id')
            
            if region_id:
                prefectures = Prefectures.objects.filter(
                    regions_id=region_id
                ).select_related('regions_id').order_by('nom')
            else:
                prefectures = Prefectures.objects.all().select_related(
                    'regions_id'
                ).order_by('nom')
            
            data = []
            for prefecture in prefectures:
                prefecture_data = {
                    'id': prefecture.id,
                    'nom': prefecture.nom,
                    'regions_id': prefecture.regions_id.id if prefecture.regions_id else None,
                    'region_nom': prefecture.regions_id.nom if prefecture.regions_id else None,
                }
                # Ajouter la géométrie si elle existe
                if prefecture.geom:
                    prefecture_data['geom'] = json.loads(prefecture.geom.geojson)
                    
                data.append(prefecture_data)
            
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CommunesFilteredAPIView(APIView):
    """
    API pour récupérer les communes avec filtrage par préfecture ou région
    """
    def get(self, request):
        try:
            from .models import CommunesRurales
            
            prefecture_id = request.GET.get('prefecture_id')
            region_id = request.GET.get('region_id')
            
            queryset = CommunesRurales.objects.all()
            
            if prefecture_id:
                queryset = queryset.filter(prefectures_id=prefecture_id)
            elif region_id:
                queryset = queryset.filter(
                    prefectures_id__regions_id=region_id
                )
            
            communes = queryset.select_related(
                'prefectures_id', 
                'prefectures_id__regions_id'
            ).order_by('nom')
            
            data = []
            for commune in communes:
                commune_data = {
                    'id': commune.id,
                    'nom': commune.nom,
                    'prefectures_id': commune.prefectures_id.id if commune.prefectures_id else None,
                    'prefecture': commune.prefectures_id.nom if commune.prefectures_id else None,
                    'region': commune.prefectures_id.regions_id.nom if commune.prefectures_id and commune.prefectures_id.regions_id else None,
                }
                
                # Ajouter la géométrie et les bounds
                if commune.geom:
                    commune_data['geom'] = json.loads(commune.geom.geojson)
                    # Calculer les bounds (envelope)
                    envelope = commune.geom.envelope
                    if envelope:
                        commune_data['bounds'] = json.loads(envelope.geojson)
                    
                data.append(commune_data)
            
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

