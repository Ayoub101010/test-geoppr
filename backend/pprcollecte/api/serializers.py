

from rest_framework import serializers # type: ignore
from rest_framework_gis.serializers import GeoFeatureModelSerializer # type: ignore
from rest_framework_gis.fields import GeometryField # type: ignore
from django.contrib.gis.geos import Point, LineString, MultiLineString, GEOSGeometry # type: ignore
from .models import *


# ==================== GEOGRAPHIE ====================

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
        prefecture = obj.prefectures_id.nom if obj.prefectures_id else "N/A"
        region = obj.prefectures_id.regions_id.nom if obj.prefectures_id and obj.prefectures_id.regions_id else "N/A"
        return f"{obj.nom}, {prefecture}, {region}"


# ==================== UTILISATEURS ====================

class LoginSerializer(serializers.ModelSerializer):
    commune_complete = serializers.ReadOnlyField()
    commune_nom = serializers.CharField(source='communes_rurales_id.nom', read_only=True)
    prefecture_nom = serializers.CharField(source='communes_rurales_id.prefectures_id.nom', read_only=True)
    prefecture_id = serializers.IntegerField(source='communes_rurales_id.prefectures_id.id', read_only=True)
    region_nom = serializers.CharField(source='communes_rurales_id.prefectures_id.regions_id.nom', read_only=True)
    region_id = serializers.IntegerField(source='communes_rurales_id.prefectures_id.regions_id.id', read_only=True)

    class Meta:
        model = Login
        fields = [
            'id', 'nom', 'prenom', 'mail', 'role', 'communes_rurales_id',
            'commune_complete', 'commune_nom', 'prefecture_nom', 'prefecture_id',
            'region_nom', 'region_id'
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    communes_rurales_id = serializers.PrimaryKeyRelatedField(
        queryset=CommuneRurale.objects.all(),
        required=False,
        allow_null=True
    )
    commune_id = serializers.PrimaryKeyRelatedField(
        queryset=CommuneRurale.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )
    
    class Meta:
        model = Login
        fields = ['nom', 'prenom', 'mail', 'mdp', 'role', 'communes_rurales_id', 'commune_id']
    
    def validate(self, attrs):
        if 'commune_id' in attrs and attrs['commune_id']:
            attrs['communes_rurales_id'] = attrs.pop('commune_id')
        return attrs
    
    def validate_role(self, value):
        valid_roles = ['user', 'admin', 'super_admin']
        if value not in valid_roles:
            raise serializers.ValidationError(f"Role invalide. Valeurs autorisees : {valid_roles}")
        return value
    
    def validate_mail(self, value):
        if Login.objects.filter(mail=value).exists():
            raise serializers.ValidationError("Cette adresse email est deja utilisee.")
        return value



class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour modifier un utilisateur existant"""
    communes_rurales_id = serializers.IntegerField(required=False, allow_null=True)
    
    class Meta:
        model = Login
        fields = ['nom', 'prenom', 'mail', 'role', 'communes_rurales_id']
    
    def validate_communes_rurales_id(self, value):
        """Verifier que la commune existe si fournie"""
        if value is not None:
            try:
                CommuneRurale.objects.get(id=value)
                return value
            except CommuneRurale.DoesNotExist:
                raise serializers.ValidationError("Cette commune n'existe pas.")
        return value
    
    def validate_mail(self, value):
        """Verifier que l'email est unique lors de la modification"""
        instance = getattr(self, 'instance', None)
        
        if instance and instance.mail != value:
            if Login.objects.filter(mail=value).exists():
                raise serializers.ValidationError("Cette adresse email est deja utilisee.")
        
        return value
    
    def validate_role(self, value):
        """Verifier que le role est valide"""
        valid_roles = ['user', 'admin', 'super_admin']
        if value and value not in valid_roles:
            raise serializers.ValidationError(f"Role invalide. Valeurs autorisees : {valid_roles}")
        return value
    
    def update(self, instance, validated_data):
        """Surcharger update pour gerer la conversion ID -> instance"""
        # Extraire communes_rurales_id si present
        commune_id = validated_data.pop('communes_rurales_id', None)
        
        # Mettre a jour les autres champs
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Gerer communes_rurales_id separement
        if commune_id is not None:
            try:
                commune = CommuneRurale.objects.get(id=commune_id)
                instance.communes_rurales_id = commune
            except CommuneRurale.DoesNotExist:
                pass  # Deja valide dans validate_communes_rurales_id
        else:
            instance.communes_rurales_id = None
        
        instance.save()
        return instance


# ==================== PISTES ====================

class PisteWriteSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Piste
        geo_field = "geom"
        fields = "__all__"

    def to_internal_value(self, data):
        if 'geom' in data and data['geom'] is not None:
            geom = GEOSGeometry(str(data['geom']))
            geom.srid = 32628
            data['geom'] = geom
        return super().to_internal_value(data)


class PisteReadSerializer(GeoFeatureModelSerializer):
    geom_4326 = GeometryField(read_only=True)

    class Meta:
        model = Piste
        geo_field = "geom_4326"
        exclude = ("geom",)

class PisteWebSerializer(GeoFeatureModelSerializer):
    """Serializer ultra-léger pour web"""
    
    geom_4326 = GeometryField(read_only=True)
    utilisateur = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()  # Calculé depuis created_at
    
    def get_utilisateur(self, obj):
        if obj.login_id:
            return f"{obj.login_id.nom} {obj.login_id.prenom}".strip()
        return "Non assigné"
    
    def get_date(self, obj):
        """Retourner created_at formaté comme date"""
        if obj.created_at:
            return obj.created_at.date()
        return None
    
    class Meta:
        model = Piste
        geo_field = "geom_4326"
        fields = [
            'id',
            'code_piste',
            'date',  # ← SerializerMethodField (calculé)
            'utilisateur',
            'nom_origine_piste',
            'nom_destination_piste',
            'geom_4326',
        ]


# ==================== INFRASTRUCTURES ====================

class ServicesSantesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = ServicesSantes
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_sante' in data and 'y_sante' in data:
            x = float(data['x_sante'])
            y = float(data['y_sante'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)


class AutresInfrastructuresSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = AutresInfrastructures
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        # CORRECTION: Utiliser x_autre_in et y_autre_in (noms reels)
        if 'x_autre_in' in data and 'y_autre_in' in data:
            x = float(data['x_autre_in'])
            y = float(data['y_autre_in'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)


class BacsSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Bacs
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if ('x_debut_tr' in data and 'y_debut_tr' in data and 
            'x_fin_trav' in data and 'y_fin_trav' in data):
            x_debut = float(data['x_debut_tr'])
            y_debut = float(data['y_debut_tr'])
            x_fin = float(data['x_fin_trav'])
            y_fin = float(data['y_fin_trav'])
            data['geom'] = LineString((x_debut, y_debut), (x_fin, y_fin), srid=4326)
        return super().to_internal_value(data)


class BatimentsAdministratifsSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = BatimentsAdministratifs
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        # CORRECTION: Utiliser x_batiment et y_batiment (noms reels)
        if 'x_batiment' in data and 'y_batiment' in data:
            x = float(data['x_batiment'])
            y = float(data['y_batiment'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)


class BusesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Buses
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_buse' in data and 'y_buse' in data:
            x = float(data['x_buse'])
            y = float(data['y_buse'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)


class DalotsSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Dalots
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_dalot' in data and 'y_dalot' in data:
            x = float(data['x_dalot'])
            y = float(data['y_dalot'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)


class EcolesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Ecoles
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_ecole' in data and 'y_ecole' in data:
            x = float(data['x_ecole'])
            y = float(data['y_ecole'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)


class InfrastructuresHydrauliquesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = InfrastructuresHydrauliques
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_infrastr' in data and 'y_infrastr' in data:
            x = float(data['x_infrastr'])
            y = float(data['y_infrastr'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)


class LocalitesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Localites
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_localite' in data and 'y_localite' in data:
            x = float(data['x_localite'])
            y = float(data['y_localite'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)


class MarchesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Marches
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_marche' in data and 'y_marche' in data:
            x = float(data['x_marche'])
            y = float(data['y_marche'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)


class PassagesSubmersiblesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = PassagesSubmersibles
        geo_field = "geom"
        fields = "__all__"
        extra_kwargs = {
            "fid": {"required": False},
            "sqlite_id": {"required": False, "allow_null": True},
        }

    def to_internal_value(self, data):
        if all(k in data for k in ("x_debut_pa", "y_debut_pa", "x_fin_pass", "y_fin_pass")):
            x_debut = float(data["x_debut_pa"])
            y_debut = float(data["y_debut_pa"])
            x_fin = float(data["x_fin_pass"])
            y_fin = float(data["y_fin_pass"])
            data["geom"] = LineString((y_debut, x_debut), (y_fin, x_fin), srid=4326)
        return super().to_internal_value(data)


class PontsSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Ponts
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }
    
    def to_internal_value(self, data):
        if 'x_pont' in data and 'y_pont' in data:
            x = float(data['x_pont'])
            y = float(data['y_pont'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)


class CommuneSearchSerializer(serializers.ModelSerializer):
    prefecture_nom = serializers.CharField(source='prefectures_id.nom', read_only=True)
    region_nom = serializers.CharField(source='prefectures_id.regions_id.nom', read_only=True)
    localisation_complete = serializers.SerializerMethodField()
    
    class Meta:
        model = CommuneRurale
        fields = ['id', 'nom', 'prefecture_nom', 'region_nom', 'localisation_complete']
    
    def get_localisation_complete(self, obj):
        prefecture = obj.prefectures_id.nom if obj.prefectures_id else "N/A"
        region = obj.prefectures_id.regions_id.nom if obj.prefectures_id and obj.prefectures_id.regions_id else "N/A"
        return f"{obj.nom}, {prefecture}, {region}"


class ChausseesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Chaussees
        geo_field = "geom"
        fields = "__all__"
        extra_kwargs = {
            'fid': {'required': False},
        }

    def to_internal_value(self, data):
        """Construction automatique de la geometrie depuis les coordonnees"""
        if all(k in data for k in ("x_debut_ch", "y_debut_ch", "x_fin_ch", "y_fin_chau")) and not data.get("geom"):
            x1 = float(data["x_debut_ch"])
            y1 = float(data["y_debut_ch"])
            x2 = float(data["x_fin_ch"])
            y2 = float(data["y_fin_chau"])
            ls = LineString((x1, y1), (x2, y2), srid=4326)
            mls = MultiLineString(ls, srid=4326)
            data["geom"] = mls
        return super().to_internal_value(data)


class PointsCoupuresSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = PointsCoupures
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }

    def to_internal_value(self, data):
        """Generation automatique de geometrie depuis coordonnees"""
        if 'x_point_co' in data and 'y_point_co' in data and not data.get('geom'):
            x = float(data['x_point_co'])
            y = float(data['y_point_co'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)


class PointsCritiquesSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = PointsCritiques
        geo_field = "geom"
        fields = '__all__'
        extra_kwargs = {
            'fid': {'required': False},
            'sqlite_id': {'required': False, 'allow_null': True},
        }

    def to_internal_value(self, data):
        """Generation automatique de geometrie depuis coordonnees"""
        if 'x_point_cr' in data and 'y_point_cr' in data and not data.get('geom'):
            x = float(data['x_point_cr'])
            y = float(data['y_point_cr'])
            data['geom'] = Point(x, y, srid=4326)
        return super().to_internal_value(data)

class PisteDashboardSerializer(serializers.Serializer):
    """Serializer pour dashboard - Basé sur l'ancien backend web"""
    
    id = serializers.IntegerField()
    code_piste = serializers.CharField()
    created_at = serializers.DateTimeField()
    utilisateur = serializers.SerializerMethodField()
    commune = serializers.SerializerMethodField()
    kilometrage = serializers.SerializerMethodField()
    infrastructures_par_type = serializers.SerializerMethodField()
    
    def get_utilisateur(self, obj):
        if hasattr(obj, 'login_id') and obj.login_id:
            return f"{obj.login_id.nom} {obj.login_id.prenom}".strip()
        return "Non assigné"
    
    def get_commune(self, obj):
        if hasattr(obj, 'communes_rurales_id') and obj.communes_rurales_id:
            return obj.communes_rurales_id.nom
        return "N/A"
    
    def get_kilometrage(self, obj):  # ← CORRECTION ICI
        """Arrondir à 2 décimales"""
        km = getattr(obj, 'kilometrage', 0)
        if km:
            return round(float(km), 2)
        return 0
    
    def get_infrastructures_par_type(self, obj):
        """Retourner les compteurs déjà calculés par annotate()"""
        return {
            'Buses': getattr(obj, 'nb_buses', 0),
            'Ponts': getattr(obj, 'nb_ponts', 0),
            'Dalots': getattr(obj, 'nb_dalots', 0),
            'Bacs': getattr(obj, 'nb_bacs', 0),
            'Écoles': getattr(obj, 'nb_ecoles', 0),
            'Marchés': getattr(obj, 'nb_marches', 0),
            'Services Santé': getattr(obj, 'nb_services_santes', 0),
            'Autres Infrastructures': getattr(obj, 'nb_autres_infrastructures', 0),
            'Bâtiments Administratifs': getattr(obj, 'nb_batiments_administratifs', 0),
            'Infrastructures Hydrauliques': getattr(obj, 'nb_infrastructures_hydrauliques', 0),
            'Localités': getattr(obj, 'nb_localites', 0),
            'Passages Submersibles': getattr(obj, 'nb_passages_submersibles', 0)
        }


