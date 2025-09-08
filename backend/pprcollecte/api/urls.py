from django.urls import path
from api.views import LoginAPIView  # import absolu recommandé
from .views import PisteListCreateAPIView
from .views import (
    LoginAPIView, PisteListCreateAPIView,
    ServicesSantesListCreateAPIView, AutresInfrastructuresListCreateAPIView, BacsListCreateAPIView,
    BatimentsAdministratifsListCreateAPIView, BusesListCreateAPIView, DalotsListCreateAPIView,
    EcolesListCreateAPIView, InfrastructuresHydrauliquesListCreateAPIView, LocalitesListCreateAPIView,
    MarchesListCreateAPIView, PassagesSubmersiblesListCreateAPIView, PontsListCreateAPIView, CommunesRuralesListCreateAPIView, PrefecturesListCreateAPIView, RegionsListCreateAPIView
)
from django.contrib import admin
from django.urls import path, include
from .temporal_views import TemporalAnalysisAPIView

urlpatterns = [
    path('api/login/', LoginAPIView.as_view(), name='api-login'),
    path('api/pistes/', PisteListCreateAPIView.as_view(), name='api-pistes'),
    path('api/services_santes/', ServicesSantesListCreateAPIView.as_view(), name='api-services-santes'),
    path('api/autres_infrastructures/', AutresInfrastructuresListCreateAPIView.as_view(), name='api-autres-infrastructures'),
    path('api/bacs/', BacsListCreateAPIView.as_view(), name='api-bacs'),
    path('api/batiments_administratifs/', BatimentsAdministratifsListCreateAPIView.as_view(), name='api-batiments-administratifs'),
    path('api/buses/', BusesListCreateAPIView.as_view(), name='api-buses'),
    path('api/dalots/', DalotsListCreateAPIView.as_view(), name='api-dalots'),
    path('api/ecoles/', EcolesListCreateAPIView.as_view(), name='api-ecoles'),
    path('api/infrastructures_hydrauliques/', InfrastructuresHydrauliquesListCreateAPIView.as_view(), name='api-infrastructures-hydrauliques'),
    path('api/localites/', LocalitesListCreateAPIView.as_view(), name='api-localites'),
    path('api/marches/', MarchesListCreateAPIView.as_view(), name='api-marches'),
    path('api/passages_submersibles/', PassagesSubmersiblesListCreateAPIView.as_view(), name='api-passages-submersibles'),
    path('api/ponts/', PontsListCreateAPIView.as_view(), name='api-ponts'),
    path('api/regions/', RegionsListCreateAPIView.as_view(), name='api-regions'),
    path('api/prefectures/', PrefecturesListCreateAPIView.as_view(), name='api-prefectures'),
    path('api/communes_rurales/', CommunesRuralesListCreateAPIView.as_view(), name='api-communes-rurales'),
    path('api/temporal-analysis/', TemporalAnalysisAPIView.as_view(), name='api-temporal-analysis'),
  
    
    path('', include('api.spatial_urls')),

]