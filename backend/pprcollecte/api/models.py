

from django.contrib.gis.db import models # type: ignore


class Login(models.Model):
    """
    Modele utilisateur unifie
    Utilise communes_rurales_id pour coherence DB
    """
    nom = models.TextField()
    prenom = models.TextField()
    mail = models.TextField(unique=True)
    mdp = models.TextField()
    role = models.TextField()
    
    communes_rurales_id = models.ForeignKey(
        'CommuneRurale',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='communes_rurales_id',
        related_name='utilisateurs'
    )

    class Meta:
        db_table = 'login'
        managed = False

    def __str__(self):
        return f"{self.nom} {self.prenom} ({self.mail})"

    @property
    def commune_complete(self):
        """Retourne les informations completes de localisation"""
        if not self.communes_rurales_id:
            return None
        
        commune = self.communes_rurales_id
        prefecture = commune.prefectures_id if commune.prefectures_id else None
        region = prefecture.regions_id if prefecture and prefecture.regions_id else None
        
        return {
            'commune': commune.nom,
            'commune_id': commune.id,
            'prefecture': prefecture.nom if prefecture else None,
            'prefecture_id': prefecture.id if prefecture else None,
            'region': region.nom if region else None,
            'region_id': region.id if region else None
        }


class Region(models.Model):
    nom = models.CharField(max_length=80, null=True, blank=True)
    geom = models.MultiPolygonField(srid=4326, null=True, blank=True)
    created_at = models.DateField(null=True, blank=True)
    updated_at = models.CharField(max_length=80, null=True, blank=True)

    class Meta:
        db_table = 'regions'
        managed = False

    def __str__(self):
        return self.nom or "Region sans nom"


class Prefecture(models.Model):
    regions_id = models.ForeignKey(
        Region,
        db_column='regions_id',
        on_delete=models.CASCADE
    )
    nom = models.CharField(max_length=80, null=True, blank=True)
    geom = models.MultiPolygonField(srid=4326, null=True, blank=True)
    created_at = models.DateField(null=True, blank=True)
    updated_at = models.CharField(max_length=80, null=True, blank=True)

    class Meta:
        db_table = 'prefectures'
        managed = False

    def __str__(self):
        return self.nom or "Prefecture sans nom"


class CommuneRurale(models.Model):
    prefectures_id = models.ForeignKey(
        Prefecture,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='prefectures_id'
    )
    nom = models.CharField(max_length=80, null=True, blank=True)
    geom = models.MultiPolygonField(srid=4326, null=True, blank=True)
    created_at = models.CharField(max_length=80, null=True, blank=True)
    updated_at = models.CharField(max_length=80, null=True, blank=True)

    class Meta:
        db_table = 'communes_rurales'
        managed = False

    def __str__(self):
        return self.nom or "Commune sans nom"


class Piste(models.Model):
    """
    Modele Piste avec geometrie en SRID 32628 (UTM)
    """
    communes_rurales_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='communes_rurales_id'
    )
    code_piste = models.CharField(max_length=50, unique=True, null=True, blank=True)
    geom = models.MultiLineStringField(srid=32628, null=True, blank=True)
    
    # Informations horaires
    heure_debut = models.TimeField(null=True, blank=True)
    heure_fin = models.TimeField(null=True, blank=True)
    
    # Origine
    nom_origine_piste = models.TextField(null=True, blank=True)
    x_origine = models.FloatField(null=True, blank=True)
    y_origine = models.FloatField(null=True, blank=True)
    
    # Destination
    nom_destination_piste = models.TextField(null=True, blank=True)
    x_destination = models.FloatField(null=True, blank=True)
    y_destination = models.FloatField(null=True, blank=True)
    
    # Intersection
    existence_intersection = models.IntegerField(null=True, blank=True)
    x_intersection = models.FloatField(null=True, blank=True)
    y_intersection = models.FloatField(null=True, blank=True)
    
    # Occupation
    type_occupation = models.TextField(null=True, blank=True)
    debut_occupation = models.DateTimeField(null=True, blank=True)
    fin_occupation = models.DateTimeField(null=True, blank=True)
    
    # Caracteristiques
    largeur_emprise = models.FloatField(null=True, blank=True)
    frequence_trafic = models.CharField(max_length=50, null=True, blank=True)
    type_trafic = models.TextField(null=True, blank=True)
    
    # Travaux
    travaux_realises = models.TextField(null=True, blank=True)
    date_travaux = models.TextField(null=True, blank=True)
    entreprise = models.TextField(null=True, blank=True)
    
    # Metadonnees
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    login_id = models.ForeignKey(
        'Login',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )

    class Meta:
        db_table = 'pistes'
        managed = True

    def __str__(self):
        return f"Piste {self.code_piste} - {self.nom_origine_piste} vers {self.nom_destination_piste}"


# ==================== INFRASTRUCTURES ====================

class ServicesSantes(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.PointField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    x_sante = models.FloatField(null=True, blank=True)
    y_sante = models.FloatField(null=True, blank=True)
    nom = models.CharField(max_length=254, null=True, blank=True)
    type = models.CharField(max_length=254, null=True, blank=True)
    date_creat = models.DateField(null=True, blank=True)
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='services_santes'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'services_santes'
        managed = False

    def __str__(self):
        return f"{self.nom} ({self.fid})"


class AutresInfrastructures(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.PointField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    # CORRECTION: Noms reels de la DB mobile
    x_autre_in = models.FloatField(null=True, blank=True)
    y_autre_in = models.FloatField(null=True, blank=True)
    type = models.CharField(max_length=254, null=True, blank=True)
    date_creat = models.DateField(null=True, blank=True)
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='autres_infrastructures'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'autres_infrastructures'
        managed = False

    def __str__(self):
        return f"Autre infrastructure ({self.fid})"


class Bacs(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.GeometryField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    x_debut_tr = models.FloatField(null=True, blank=True)
    y_debut_tr = models.FloatField(null=True, blank=True)
    x_fin_trav = models.FloatField(null=True, blank=True)
    y_fin_trav = models.FloatField(null=True, blank=True)
    type_bac = models.CharField(max_length=254, null=True, blank=True)
    nom_cours = models.CharField(max_length=254, null=True, blank=True, db_column='nom_cours_')
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    endroit = models.CharField(max_length=254, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='bacs'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'bacs'
        managed = False

    def __str__(self):
        return f"Bac {self.fid}"


class BatimentsAdministratifs(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.PointField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    # CORRECTION: Noms reels de la DB mobile
    x_batiment = models.FloatField(null=True, blank=True)
    y_batiment = models.FloatField(null=True, blank=True)
    nom = models.CharField(max_length=254, null=True, blank=True)
    type = models.CharField(max_length=254, null=True, blank=True)
    date_creat = models.DateField(null=True, blank=True)
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='batiments_administratifs'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'batiments_administratifs'
        managed = False

    def __str__(self):
        return f"{self.nom} ({self.fid})"


class Buses(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.PointField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    x_buse = models.FloatField(null=True, blank=True)
    y_buse = models.FloatField(null=True, blank=True)
    # CORRECTION: type_buse n'existe PAS dans la DB mobile
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='buses'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'buses'
        managed = False

    def __str__(self):
        return f"Buse {self.fid}"


class Dalots(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.PointField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    x_dalot = models.FloatField(null=True, blank=True)
    y_dalot = models.FloatField(null=True, blank=True)
    # CORRECTION: type_dalot n'existe PAS, c'est "situation" dans la DB mobile
    situation = models.CharField(max_length=254, null=True, blank=True, db_column='situation_')
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='dalots'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'dalots'
        managed = False

    def __str__(self):
        return f"Dalot {self.fid}"


class Ecoles(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.PointField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    x_ecole = models.FloatField(null=True, blank=True)
    y_ecole = models.FloatField(null=True, blank=True)
    nom = models.CharField(max_length=254, null=True, blank=True)
    type = models.CharField(max_length=254, null=True, blank=True)
    date_creat = models.DateField(null=True, blank=True)
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='ecoles'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'ecoles'
        managed = False

    def __str__(self):
        return f"{self.nom} ({self.fid})"


class InfrastructuresHydrauliques(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.PointField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    x_infrastr = models.FloatField(null=True, blank=True)
    y_infrastr = models.FloatField(null=True, blank=True)
    nom = models.CharField(max_length=254, null=True, blank=True)
    type = models.CharField(max_length=254, null=True, blank=True)
    date_creat = models.DateField(null=True, blank=True)
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='infrastructures_hydrauliques'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'infrastructures_hydrauliques'
        managed = False

    def __str__(self):
        return f"{self.nom} ({self.fid})"


class Localites(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.PointField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    x_localite = models.FloatField(null=True, blank=True)
    y_localite = models.FloatField(null=True, blank=True)
    nom = models.CharField(max_length=254, null=True, blank=True)
    type = models.CharField(max_length=254, null=True, blank=True)
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='localites'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'localites'
        managed = False

    def __str__(self):
        return f"{self.nom} ({self.fid})"


class Marches(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.PointField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    x_marche = models.FloatField(null=True, blank=True)
    y_marche = models.FloatField(null=True, blank=True)
    nom = models.CharField(max_length=254, null=True, blank=True)
    type = models.CharField(max_length=254, null=True, blank=True)
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='marches'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'marches'
        managed = False

    def __str__(self):
        return f"{self.nom} ({self.fid})"


class PassagesSubmersibles(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.LineStringField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    x_debut_pa = models.FloatField(null=True, blank=True)
    y_debut_pa = models.FloatField(null=True, blank=True)
    x_fin_pass = models.FloatField(null=True, blank=True)
    y_fin_pass = models.FloatField(null=True, blank=True)
    type_mater = models.CharField(max_length=254, null=True, blank=True)
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    endroit = models.CharField(max_length=32, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='passages_submersibles'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'passages_submersibles'
        managed = False

    def __str__(self):
        return f"Passage {self.fid}"


class Ponts(models.Model):
    fid = models.BigAutoField(primary_key=True)
    geom = models.PointField(srid=4326)
    sqlite_id = models.IntegerField(null=True, blank=True, db_column='id')
    
    x_pont = models.FloatField(null=True, blank=True)
    y_pont = models.FloatField(null=True, blank=True)
    situation = models.CharField(max_length=254, null=True, blank=True, db_column='situation_')
    type_pont = models.CharField(max_length=254, null=True, blank=True)
    nom_cours = models.CharField(max_length=254, null=True, blank=True, db_column='nom_cours_')
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='code_piste'
    )
    login_id = models.ForeignKey(
        Login,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='login_id'
    )
    commune_id = models.ForeignKey(
        CommuneRurale,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='commune_id',
        related_name='ponts'
    )
    
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'ponts'
        managed = False

    def __str__(self):
        return f"Pont {self.fid} - {self.nom_cours or ''}"


class Chaussees(models.Model):
    """Modele Chaussees - present dans la base finale"""
    fid = models.BigAutoField(primary_key=True, db_column='fid')
    geom = models.MultiLineStringField(srid=4326, null=True, blank=True)
    sqlite_id = models.BigIntegerField(null=True, blank=True, db_column='id')
    
    # Coordonnees
    x_debut_ch = models.FloatField(null=True, blank=True)
    y_debut_ch = models.FloatField(null=True, blank=True)
    x_fin_ch = models.FloatField(null=True, blank=True)
    y_fin_chau = models.FloatField(null=True, blank=True)
    
    # Caracteristiques
    type_chaus = models.CharField(max_length=254, null=True, blank=True)
    etat_piste = models.CharField(max_length=254, null=True, blank=True)
    endroit = models.CharField(max_length=32, null=True, blank=True)
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    # Relations - IMPORTANT: utilise communes_rurales_id dans la DB finale
    code_piste = models.ForeignKey(
        Piste,
        to_field='code_piste',
        db_column='code_piste',
        on_delete=models.CASCADE,
        related_name='chaussees'
    )
    login_id = models.ForeignKey(
        Login,
        db_column='login_id',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chaussees'
    )
    communes_rurales_id = models.ForeignKey(
        CommuneRurale,
        db_column='communes_rurales_id',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chaussees'
    )
    
    # Metadonnees
    created_at = models.CharField(max_length=50, null=True, blank=True)
    updated_at = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'chaussees'
        managed = False

    def __str__(self):
        return f"Chaussee {self.fid} ({self.code_piste_id})"


class PointsCoupures(models.Model):
    """Points de coupure"""
    fid = models.BigAutoField(primary_key=True, db_column='fid')
    geom = models.PointField(srid=4326, null=True, blank=True)
    sqlite_id = models.BigIntegerField(null=True, blank=True, db_column='id')
    
    # Informations
    cause_coup = models.CharField(max_length=50, null=True, blank=True)
    x_point_co = models.FloatField(null=True, blank=True)
    y_point_co = models.FloatField(null=True, blank=True)
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    # Relations
    chaussee_id = models.BigIntegerField(null=True, blank=True, db_column='chaussee_id')
    commune_id = models.ForeignKey(
        CommuneRurale,
        db_column='commune_id',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='points_coupures'
    )
    
    # Metadonnees
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'points_coupures'
        managed = False

    def __str__(self):
        return f"Point coupure {self.fid}"


class PointsCritiques(models.Model):
    """Points critiques"""
    fid = models.BigAutoField(primary_key=True, db_column='fid')
    geom = models.PointField(srid=4326, null=True, blank=True)
    sqlite_id = models.BigIntegerField(null=True, blank=True, db_column='id')
    
    # Informations
    type_point = models.CharField(max_length=50, null=True, blank=True)
    x_point_cr = models.FloatField(null=True, blank=True)
    y_point_cr = models.FloatField(null=True, blank=True)
    code_gps = models.CharField(max_length=254, null=True, blank=True)
    
    # Relations
    chaussee_id = models.BigIntegerField(null=True, blank=True, db_column='chaussee_id')
    commune_id = models.ForeignKey(
        CommuneRurale,
        db_column='commune_id',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='points_critiques'
    )
    
    # Metadonnees
    created_at = models.CharField(max_length=24, null=True, blank=True)
    updated_at = models.CharField(max_length=24, null=True, blank=True)

    class Meta:
        db_table = 'points_critiques'
        managed = False

    def __str__(self):
        return f"Point critique {self.fid}"