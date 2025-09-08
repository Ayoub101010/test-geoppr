from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import generics

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
    MarchesSerializer, PassagesSubmersiblesSerializer, PontsSerializer, CommuneRuraleSerializer, PrefectureSerializer, RegionSerializer
)

class RegionsListCreateAPIView(generics.ListCreateAPIView):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer

class PrefecturesListCreateAPIView(generics.ListCreateAPIView):
    queryset = Prefecture.objects.all()
    serializer_class = PrefectureSerializer

class CommunesRuralesListCreateAPIView(generics.ListCreateAPIView):
    queryset = CommuneRurale.objects.all()
    serializer_class = CommuneRuraleSerializer

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
     # GET pour récupérer tous les utilisateurs
    def get(self, request):
        users = Login.objects.all()
        serializer = LoginSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    
    def post(self, request):
        mail = request.data.get('mail')
        mdp = request.data.get('mdp')

        if not mail or not mdp:
            return Response({"error": "Mail et mot de passe requis"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = Login.objects.get(mail=mail)
        except Login.DoesNotExist:
            return Response({"error": "Utilisateur non trouvé"}, status=status.HTTP_404_NOT_FOUND)

        if user.mdp != mdp:
            return Response({"error": "Mot de passe incorrect"}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = LoginSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PisteListCreateAPIView(generics.ListCreateAPIView):
    queryset = Piste.objects.all()
    serializer_class = PisteSerializer

    def perform_create(self, serializer):
        serializer.save()