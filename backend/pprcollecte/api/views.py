from django.shortcuts import render # type: ignore
from rest_framework.views import APIView # type: ignore
from rest_framework.response import Response # type: ignore
from rest_framework import status, generics # type: ignore
from django.contrib.gis.db.models.functions import Transform,Length # type: ignore
from django.db.models import Count # type: ignore
from django.db.models import Q # type: ignore
from rest_framework.pagination import PageNumberPagination # type: ignore

from rest_framework import status # type: ignore
from rest_framework_simplejwt.tokens import RefreshToken  # type: ignore

from .models import *
from .serializers import *


# ==================== GEOGRAPHIE ====================

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
        search = self.request.GET.get('q', '')
        if search:
            queryset = queryset.filter(nom__icontains=search)
        return queryset.order_by('nom')


# ==================== UTILISATEURS ====================

class LoginAPIView(APIView):
    """API de connexion avec JWT - Format compatible frontend"""
    
    def get(self, request):
        """Recuperer tous les utilisateurs"""
        users = Login.objects.all()
        serializer = LoginSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Authentification avec generation de tokens JWT"""
        mail = request.data.get('mail')
        mdp = request.data.get('mdp')

        if not mail or not mdp:
            return Response({
                "error": "Mail et mot de passe requis"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = Login.objects.get(mail=mail)
           
        except Login.DoesNotExist:
            return Response({
                "error": "Utilisateur non trouve"
            }, status=status.HTTP_404_NOT_FOUND)

        # Verification du mot de passe (simple pour l'instant)
        if user.mdp != mdp:
            return Response({
                "error": "Mot de passe incorrect"
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Generation des tokens JWT
        refresh = RefreshToken()
        refresh['user_id'] = user.id
        refresh['email'] = user.mail
        refresh['role'] = user.role
        
        # Preparation des donnees utilisateur
        user_data = {
            'id': user.id,
            'nom': user.nom,
            'prenom': user.prenom,
            'mail': user.mail,
            'role': user.role,
        }
        
        # Ajout des infos geographiques si presentes
        if user.communes_rurales_id:
            commune = user.communes_rurales_id
            user_data['commune'] = {
                'id': commune.id,
                'nom': commune.nom
            }
            
            if commune.prefectures_id:
                prefecture = commune.prefectures_id
                user_data['prefecture'] = {
                    'id': prefecture.id,
                    'nom': prefecture.nom
                }
                
                if prefecture.regions_id:
                    region = prefecture.regions_id
                    user_data['region'] = {
                        'id': region.id,
                        'nom': region.nom
                    }
        
        # IMPORTANT: Format attendu par le frontend
        # Les tokens sont directement dans la reponse, PAS dans un sous-objet
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user_data,
            "expires_in": 3600
        }, status=status.HTTP_200_OK)

class UserManagementAPIView(APIView):
    """API dediee a la gestion des utilisateurs par le super_admin"""
    
    def post(self, request):
        """Creer un nouvel utilisateur"""
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            response_serializer = LoginSerializer(user)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, user_id=None):
        """Lister tous les utilisateurs ou recuperer un utilisateur specifique"""
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
                return Response({"error": "Utilisateur non trouve"}, status=status.HTTP_404_NOT_FOUND)
        else:
            queryset = Login.objects.select_related(
                'communes_rurales_id',
                'communes_rurales_id__prefectures_id',
                'communes_rurales_id__prefectures_id__regions_id'
            )
            
            role = request.GET.get('role')
            region_id = request.GET.get('region_id')
            prefecture_id = request.GET.get('prefecture_id')
            commune_id = request.GET.get('commune_id') or request.GET.get('communes_rurales_id')
            
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
        if not user_id:
            return Response({"error": "ID utilisateur requis"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = Login.objects.get(id=user_id)
        except Login.DoesNotExist:
            return Response({"error": "Utilisateur non trouve"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            user.refresh_from_db()
            response_serializer = LoginSerializer(user)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        else:
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
                "message": f"Utilisateur {user_info} supprime avec succes"
            }, status=status.HTTP_200_OK)
        except Login.DoesNotExist:
            return Response({"error": "Utilisateur non trouve"}, status=status.HTTP_404_NOT_FOUND)


# ==================== PISTES ====================

class PisteListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    """Vue unifiee pour les pistes
    Accepte commune_id OU communes_rurales_id pour filtrage"""
    
    def get_queryset(self):
        qs = Piste.objects.all()
        commune_id = self.request.query_params.get('commune_id') or \
                     self.request.query_params.get('communes_rurales_id')
        if commune_id:
            qs = qs.filter(communes_rurales_id=commune_id)
        return qs
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return PisteReadSerializer
        return PisteWriteSerializer
    
    def perform_create(self, serializer):
        serializer.save()
    
from django.contrib.gis.db.models.functions import Length

class PisteWebListAPIView(generics.ListAPIView):
    serializer_class = PisteDashboardSerializer
    pagination_class = None  

    def get_queryset(self):
        return Piste.objects.select_related(
            'login_id',
            'communes_rurales_id'
        ).annotate(
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



# ==================== CHAUSSEES ====================

class ChausseesListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = ChausseesSerializer

    def get_queryset(self):
        qs = Chaussees.objects.all()
        # Support des deux conventions
        commune_id = self.request.query_params.get('commune_id') or \
                     self.request.query_params.get('communes_rurales_id')
        if commune_id:
            qs = qs.filter(communes_rurales_id=commune_id)
        code_piste = self.request.query_params.get('code_piste')
        if code_piste:
            qs = qs.filter(code_piste_id=code_piste)
        return qs


# ==================== POINTS ====================

class PointsCoupuresListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = PointsCoupuresSerializer

    def get_queryset(self):
        qs = PointsCoupures.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            qs = qs.filter(commune_id=commune_id)
        chaussee_id = self.request.query_params.get('chaussee_id')
        if chaussee_id:
            qs = qs.filter(chaussee_id=chaussee_id)
        return qs


class PointsCritiquesListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = PointsCritiquesSerializer

    def get_queryset(self):
        qs = PointsCritiques.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            qs = qs.filter(commune_id=commune_id)
        chaussee_id = self.request.query_params.get('chaussee_id')
        if chaussee_id:
            qs = qs.filter(chaussee_id=chaussee_id)
        return qs


# ==================== INFRASTRUCTURES ====================

class ServicesSantesListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = ServicesSantesSerializer
    
    def get_queryset(self):
        queryset = ServicesSantes.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset


class AutresInfrastructuresListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = AutresInfrastructuresSerializer
    
    def get_queryset(self):
        queryset = AutresInfrastructures.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset


class BacsListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = BacsSerializer
    
    def get_queryset(self):
        queryset = Bacs.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset


class BatimentsAdministratifsListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = BatimentsAdministratifsSerializer
    
    def get_queryset(self):
        queryset = BatimentsAdministratifs.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset


class BusesListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = BusesSerializer
    
    def get_queryset(self):
        queryset = Buses.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset


class DalotsListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = DalotsSerializer
    
    def get_queryset(self):
        queryset = Dalots.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset


class EcolesListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = EcolesSerializer
    
    def get_queryset(self):
        queryset = Ecoles.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset


class InfrastructuresHydrauliquesListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = InfrastructuresHydrauliquesSerializer
    
    def get_queryset(self):
        queryset = InfrastructuresHydrauliques.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset


class LocalitesListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = LocalitesSerializer
    
    def get_queryset(self):
        queryset = Localites.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset


class MarchesListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = MarchesSerializer
    
    def get_queryset(self):
        queryset = Marches.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset


class PassagesSubmersiblesListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = PassagesSubmersiblesSerializer
    
    def get_queryset(self):
        queryset = PassagesSubmersibles.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset


class PontsListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = None  # Désactiver la pagination
    serializer_class = PontsSerializer
    
    def get_queryset(self):
        queryset = Ponts.objects.all()
        commune_id = self.request.query_params.get('commune_id')
        if commune_id:
            queryset = queryset.filter(commune_id=commune_id)
        return queryset