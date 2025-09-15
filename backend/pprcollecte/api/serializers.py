from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Login
from .models import Piste
from .models import (
    ServicesSantes, AutresInfrastructures, Bacs, BatimentsAdministratifs,
    Buses, Dalots, Ecoles, InfrastructuresHydrauliques, Localites,
    Marches, PassagesSubmersibles, Ponts, CommuneRurale, Prefecture, Region
)
from django.contrib.gis.geos import Point

class RegionSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Region
        geo_field = "geom"
        fields = '__all__'

class PrefectureSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Prefecture
        geo_field = "geom"
        fields = '__all__'

class CommuneRuraleSerializer(GeoFeatureModelSerializer):
    # Ajouter ces lignes pour afficher les infos hiérarchiques
    prefecture_nom = serializers.CharField(source='prefectures_id.nom', read_only=True)
    prefecture_id = serializers.IntegerField(source='prefectures_id.id', read_only=True)
    region_nom = serializers.CharField(source='prefectures_id.regions_id.nom', read_only=True)
    region_id = serializers.IntegerField(source='prefectures_id.regions_id.id', read_only=True)
    localisation_complete = serializers.SerializerMethodField()
    
    class Meta:
        model = CommuneRurale
        geo_field = "geom"
        fields = '__all__'
    
    def get_localisation_complete(self, obj):
        """Format: Commune, Préfecture, Région"""
        prefecture = obj.prefectures_id.nom if obj.prefectures_id else "N/A"
        region = obj.prefectures_id.regions_id.nom if obj.prefectures_id and obj.prefectures_id.regions_id else "N/A"
        return f"{obj.nom}, {prefecture}, {region}"
    
class ServicesSantesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = ServicesSantes
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},      # Auto-généré
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        # Conversion x_sante, y_sante → geom
        if 'x_sante' in data and 'y_sante' in data:
            x = float(data.pop('x_sante'))
            y = float(data.pop('y_sante'))
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)

class AutresInfrastructuresSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = AutresInfrastructures
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},      # Auto-généré
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_autre_infrastructure' in data and 'y_autre_infrastructure' in data:
            x = float(data.pop('x_autre_infrastructure'))
            y = float(data.pop('y_autre_infrastructure'))
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)

class BacsSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Bacs
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},      # Auto-généré
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
    # Modifier cette partie dans BacsSerializer
        if ('x_debut_tr' in data and 'y_debut_tr' in data and 
            'x_fin_trav' in data and 'y_fin_trav' in data):
            
            x_debut = float(data.pop('x_debut_tr'))
            y_debut = float(data.pop('y_debut_tr'))
            x_fin = float(data.pop('x_fin_trav'))
            y_fin = float(data.pop('y_fin_trav'))
            
            # Créer une LineString au lieu d'un Point
            from django.contrib.gis.geos import LineString
            data['geom'] = LineString((x_debut, y_debut), (x_fin, y_fin), srid=4326)
            
        return super().to_internal_value(data)

class BatimentsAdministratifsSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = BatimentsAdministratifs
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},      # Auto-généré
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_batiment_administratif' in data and 'y_batiment_administratif' in data:
            x = float(data.pop('x_batiment_administratif'))
            y = float(data.pop('y_batiment_administratif'))
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)

class BusesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Buses
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},      # Auto-généré
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_buse' in data and 'y_buse' in data:
            x = float(data.pop('x_buse'))
            y = float(data.pop('y_buse'))
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)

class DalotsSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Dalots
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},      # Auto-généré
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_dalot' in data and 'y_dalot' in data:
            x = float(data.pop('x_dalot'))
            y = float(data.pop('y_dalot'))
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)

class EcolesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Ecoles
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},      # Auto-généré
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_ecole' in data and 'y_ecole' in data:
            x = float(data.pop('x_ecole'))
            y = float(data.pop('y_ecole'))
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)

class InfrastructuresHydrauliquesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = InfrastructuresHydrauliques
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},      # Auto-généré
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_infrastructure_hydraulique' in data and 'y_infrastructure_hydraulique' in data:
            x = float(data.pop('x_infrastructure_hydraulique'))
            y = float(data.pop('y_infrastructure_hydraulique'))
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)

class LocalitesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Localites
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},      # Auto-généré
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        # Faire une copie pour éviter de modifier l'original
        data = data.copy()
        
        if 'x_localite' in data and 'y_localite' in data:
            x = float(data.get('x_localite'))
            y = float(data.get('y_localite'))
            # Créer le Point géométrique
            data['geom'] = Point(x, y, srid=4326)
            # Supprimer les champs x et y pour éviter les erreurs
            data.pop('x_localite', None)
            data.pop('y_localite', None)
        
        return super().to_internal_value(data)

class MarchesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Marches
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},      # Auto-généré
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_marche' in data and 'y_marche' in data:
            x = float(data.pop('x_marche'))
            y = float(data.pop('y_marche'))
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)

class PassagesSubmersiblesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = PassagesSubmersibles
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},  # Auto-généré
            
        }
    
    

class PontsSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Ponts
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},  # Auto-généré
            
        }
    
    def to_internal_value(self, data):
        if 'x_pont' in data and 'y_pont' in data:
            x = float(data.pop('x_pont'))
            y = float(data.pop('y_pont'))
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)

class LoginSerializer(serializers.ModelSerializer):
    #  ces champs en lecture seule
    commune_complete = serializers.ReadOnlyField()
    commune_nom = serializers.CharField(source='communes_rurales_id.nom', read_only=True)
    prefecture_nom = serializers.CharField(source='communes_rurales_id.prefectures_id.nom', read_only=True)
    region_nom = serializers.CharField(source='communes_rurales_id.prefectures_id.regions_id.nom', read_only=True)
    
    class Meta:
        model = Login
        fields = ['id', 'nom', 'prenom', 'mail', 'role', 'communes_rurales_id', 
                 'commune_complete', 'commune_nom', 'prefecture_nom', 'region_nom']


class PisteSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Piste
        geo_field = "geom"
        fields = '__all__'

    def to_internal_value(self, data):
        # Si 'geom' existe, on force le SRID sur 32628
        if 'geom' in data and data['geom'] is not None:
            from django.contrib.gis.geos import GEOSGeometry
            geom = GEOSGeometry(str(data['geom']))
            geom.srid = 32628  # forcer SRID UTM
            data['geom'] = geom
        return super().to_internal_value(data)
    
class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer un nouvel utilisateur avec commune"""
    communes_rurales_id = serializers.PrimaryKeyRelatedField(
    queryset=CommuneRurale.objects.all(),
    required=False,
    allow_null=True
)

    
    class Meta:
        model = Login
        fields = ['nom', 'prenom', 'mail', 'mdp', 'role', 'communes_rurales_id']
    
    
    def validate_role(self, value):
        """Vérifier que le rôle est valide"""
        valid_roles = ['user', 'admin', 'super_admin']
        if value not in valid_roles:
            raise serializers.ValidationError(f"Rôle invalide. Valeurs autorisées : {valid_roles}")
        return value
    
    def validate_mail(self, value):
        """Vérifier que l'email est unique"""
        if Login.objects.filter(mail=value).exists():
            raise serializers.ValidationError("Cette adresse email est déjà utilisée.")
        return value

class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour modifier un utilisateur existant"""
    communes_rurales_id = serializers.IntegerField(required=False,allow_null=True)
    
    class Meta:
        model = Login
        fields = ['nom', 'prenom', 'mail', 'role', 'communes_rurales_id']
    
    def validate_communes_rurales_id(self, value):
        """Vérifier que la commune existe si fournie"""
        if value is not None:
            try:
                CommuneRurale.objects.get(id=value)
                return value
            except CommuneRurale.DoesNotExist:
                raise serializers.ValidationError("Cette commune n'existe pas.")
        return value
    
    def validate_mail(self, value):
        """Vérifier que l'email est unique lors de la modification"""
        # Récupérer l'instance en cours de modification
        instance = getattr(self, 'instance', None)
        
        # Si l'email est différent de l'actuel, vérifier l'unicité
        if instance and instance.mail != value:
            if Login.objects.filter(mail=value).exists():
                raise serializers.ValidationError("Cette adresse email est déjà utilisée.")
        
        return value
    
    def validate_role(self, value):
        """Vérifier que le rôle est valide"""
        valid_roles = ['user', 'admin', 'super_admin']
        if value and value not in valid_roles:
            raise serializers.ValidationError(f"Rôle invalide. Valeurs autorisées : {valid_roles}")
        return value

class CommuneSearchSerializer(serializers.ModelSerializer):
    """Serializer pour la recherche de communes avec infos complètes"""
    prefecture_nom = serializers.CharField(source='prefectures_id.nom', read_only=True)
    region_nom = serializers.CharField(source='prefectures_id.regions_id.nom', read_only=True)
    localisation_complete = serializers.SerializerMethodField()
    
    class Meta:
        model = CommuneRurale
        fields = ['id', 'nom', 'prefecture_nom', 'region_nom', 'localisation_complete']
    
    def get_localisation_complete(self, obj):
        """Format: Commune, Préfecture, Région"""
        prefecture = obj.prefectures_id.nom if obj.prefectures_id else "N/A"
        region = obj.prefectures_id.regions_id.nom if obj.prefectures_id and obj.prefectures_id.regions_id else "N/A"
        return f"{obj.nom}, {prefecture}, {region}"