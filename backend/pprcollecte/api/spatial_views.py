from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import *

class CollectesGeoAPIView(APIView):
    """API avec chargement adaptatif selon le zoom"""
    
    def get(self, request):
        commune_id = request.GET.get('commune_id')
        types_param = request.GET.get('types', '')
        zoom_level = int(request.GET.get('zoom', 7))
        bbox = request.GET.get('bbox', '')
        
        # Détecter si c'est pour des statistiques (pas de zoom fourni)
        is_for_stats = request.GET.get('zoom') is None
        
        # Définir les limites selon le zoom SEULEMENT si ce n'est pas pour les stats
        if not is_for_stats:
            if zoom_level <= 7:
                limit_points = 200
                limit_lines = 50
            elif zoom_level <= 10:
                limit_points = 500
                limit_lines = 100
            elif zoom_level <= 12:
                limit_points = 1000
                limit_lines = 200
            else:
                limit_points = 2000
                limit_lines = 500
        else:
            # Pas de limites pour les statistiques
            limit_points = None
            limit_lines = None
        
        types = [t.strip() for t in types_param.split(',') if t.strip()] if types_param else []
        
        results = {
            'type': 'FeatureCollection',
            'features': [],
            'total': 0,
            'debug': f"Zoom: {zoom_level}, Stats: {is_for_stats}, Limites: points={limit_points}, lines={limit_lines}"
        }
        
        try:
            # Filtrage spatial par bounding box si fourni
            spatial_filter = None
            if bbox:
                try:
                    from django.contrib.gis.geos import Polygon
                    coords = [float(x) for x in bbox.split(',')]
                    if len(coords) == 4:
                        minLng, minLat, maxLng, maxLat = coords
                        spatial_filter = Polygon.from_bbox((minLng, minLat, maxLng, maxLat))
                except:
                    pass
            
            # Récupérer géométrie commune
            commune_geom = None
            if commune_id:
                try:
                    commune = CommuneRurale.objects.get(id=commune_id)
                    commune_geom = commune.geom
                except CommuneRurale.DoesNotExist:
                    pass
            
            # Utiliser le filtre spatial le plus restrictif
            final_spatial_filter = commune_geom or spatial_filter
            
            # Mapping des types
            type_mapping = {
                'services_santes': 'services_santes',
                'ponts': 'ponts',
                'buses': 'buses',
                'dalots': 'dalots',
                'ecoles': 'ecoles',
                'marches': 'marches',
                'batiments_administratifs': 'batiments_administratifs',
                'infrastructures_hydrauliques': 'infrastructures_hydrauliques',
                'localites': 'localites',
                'passages_submersibles': 'passages_submersibles',
                'autres_infrastructures': 'autres_infrastructures',
                'bacs': 'bacs',
                'pistes': 'pistes',
                'sante': 'services_santes',
                'administratifs': 'batiments_administratifs',
                'hydrauliques': 'infrastructures_hydrauliques',
                'passages': 'passages_submersibles',
                'autres': 'autres_infrastructures',
            }
            
            point_models = {
                'services_santes': ServicesSantes,
                'ponts': Ponts,
                'buses': Buses,
                'dalots': Dalots,
                'ecoles': Ecoles,
                'marches': Marches,
                'batiments_administratifs': BatimentsAdministratifs,
                'infrastructures_hydrauliques': InfrastructuresHydrauliques,
                'localites': Localites,
                'passages_submersibles': PassagesSubmersibles,
                'autres_infrastructures': AutresInfrastructures,
            }
            
            if not types:
                types_to_process = list(point_models.keys()) + ['bacs', 'pistes']
            else:
                types_to_process = []
                for frontend_type in types:
                    backend_type = type_mapping.get(frontend_type, frontend_type)
                    if backend_type not in types_to_process:
                        types_to_process.append(backend_type)
            
            # Traitement des points
            for type_name in types_to_process:
                if type_name in point_models:
                    model_class = point_models[type_name]
                    queryset = model_class.objects.filter(geom__isnull=False)
                    
                    # Filtrage spatial
                    if final_spatial_filter:
                        try:
                            spatial_filter_32628 = final_spatial_filter.transform(32628, clone=True)
                            piste_queryset = piste_queryset.filter(geom__intersects=spatial_filter_32628)
                        except Exception as e:
                            print(f"Erreur transformation SRID: {e}")
                    
                    # Appliquer limite seulement si définie
                    if limit_points:
                        queryset = queryset[:limit_points]
                    
                    for item in queryset:
                        try:
                            if item.geom:
                                feature = {
                                    'type': 'Feature',
                                    'id': f"{type_name}_{item.fid}",
                                    'geometry': {
                                        'type': 'Point',
                                        'coordinates': [float(item.geom.x), float(item.geom.y)]
                                    },
                                    'properties': {
                                        'fid': int(item.fid),
                                        'type': type_name,
                                        'nom': str(item.nom) if hasattr(item, 'nom') and item.nom else f'{type_name}_{item.fid}',
                                        'date_creat': str(item.date_creat) if hasattr(item, 'date_creat') and item.date_creat else None,
                                        'code_piste': str(item.code_piste) if hasattr(item, 'code_piste') and item.code_piste else None,
                                    }
                                }
                                results['features'].append(feature)
                        except Exception as e:
                            continue
            
            # Traitement des bacs
            if 'bacs' in types_to_process:
                bacs_queryset = Bacs.objects.filter(geom__isnull=False)
                
                if final_spatial_filter:
                    bacs_queryset = bacs_queryset.filter(geom__intersects=final_spatial_filter)
                
                # Appliquer limite seulement si définie
                if limit_lines:
                    bacs_queryset = bacs_queryset[:limit_lines]
                
                for bac in bacs_queryset:
                    try:
                        if bac.geom:
                            geom_type = bac.geom.geom_type
                            coordinates = None
                            
                            if geom_type == 'Point':
                                coordinates = [float(bac.geom.x), float(bac.geom.y)]
                            elif geom_type == 'LineString':
                                coordinates = list(bac.geom.coords)
                            elif geom_type == 'MultiLineString':
                                coordinates = [list(line.coords) for line in bac.geom]
                            
                            if coordinates:
                                feature = {
                                    'type': 'Feature', 
                                    'id': f"bac_{bac.fid}",
                                    'geometry': {
                                        'type': geom_type,
                                        'coordinates': coordinates
                                    },
                                    'properties': {
                                        'fid': int(bac.fid),
                                        'type': 'bacs',
                                        'type_bac': str(bac.type_bac) if bac.type_bac else None,
                                        'endroit': str(bac.endroit) if bac.endroit else None,
                                        'code_piste': str(bac.code_piste) if hasattr(bac, 'code_piste') and bac.code_piste else None,
                                    }
                                }
                                results['features'].append(feature)
                    except Exception as e:
                        continue
            
            # Traitement des pistes
            if 'pistes' in types_to_process:
                piste_queryset = Piste.objects.filter(geom__isnull=False)
                
                if final_spatial_filter:
                    if commune_geom:
                        commune_geom_32628 = commune_geom.transform(32628, clone=True)
                        piste_queryset = piste_queryset.filter(geom__intersects=commune_geom_32628)
                    else:
                        spatial_filter_32628 = final_spatial_filter.transform(32628, clone=True)
                        piste_queryset = piste_queryset.filter(geom__intersects=spatial_filter_32628)
                
                # Appliquer limite seulement si définie
                if limit_lines:
                    piste_queryset = piste_queryset[:limit_lines]
                
                for piste in piste_queryset:
                    try:
                        if piste.geom:
                            geom_4326 = piste.geom.transform(4326, clone=True)
                            
                            coordinates = None
                            if geom_4326.geom_type == 'LineString':
                                coordinates = list(geom_4326.coords)
                            elif geom_4326.geom_type == 'MultiLineString':
                                coordinates = [list(line.coords) for line in geom_4326]
                            
                            if coordinates:
                                feature = {
                                    'type': 'Feature',
                                    'id': f"piste_{piste.id}",
                                    'geometry': {
                                        'type': geom_4326.geom_type,
                                        'coordinates': coordinates
                                    },
                                    'properties': {
                                        'id': int(piste.id),
                                        'type': 'pistes',
                                        'nom': f"{piste.nom_origine_piste or ''} → {piste.nom_destination_piste or ''}",
                                        'code_piste': str(piste.code_piste) if piste.code_piste else None,
                                        'commune_id': int(piste.communes_rurales_id) if piste.communes_rurales_id else None,
                                    }
                                }
                                results['features'].append(feature)
                    except Exception as e:
                        continue
            
            results['total'] = len(results['features'])
            return Response(results)
            
        except Exception as e:
            return Response({
                'error': str(e), 
                'type': type(e).__name__,
                'details': 'Erreur lors de la récupération des données spatiales'
            }, status=500)

# ATTENTION: Les classes suivantes doivent être au niveau racine, pas indentées
class CommunesSearchAPIView(APIView):
    """API de recherche communes - Corrigée"""
    
    def get(self, request):
        query = request.GET.get('q', '').strip()
        
        if not query or len(query) < 2:
            return Response({
                'communes': [],
                'message': 'Tapez au moins 2 caractères'
            })
        
        try:
            communes = CommuneRurale.objects.filter(
                nom__icontains=query
            ).select_related('prefectures_id__regions_id').order_by('nom')[:20]
            
            results = []
            for commune in communes:
                prefecture_nom = commune.prefectures_id.nom if commune.prefectures_id else "N/A"
                region_nom = commune.prefectures_id.regions_id.nom if commune.prefectures_id and commune.prefectures_id.regions_id else "N/A"
                
                results.append({
                    'id': commune.id,
                    'nom': str(commune.nom),
                    'prefecture': prefecture_nom,
                    'region': region_nom,
                    'label': f"{commune.nom} ({prefecture_nom})"
                })
            
            return Response({
                'communes': results,
                'total': len(results),
                'query': query
            })
            
        except Exception as e:
            print(f"Erreur recherche communes: {e}")
            return Response({'error': str(e)}, status=500)

class TypesInfrastructuresAPIView(APIView):
    """API types infrastructures - Inchangée"""
    
    def get(self, request):
        types_disponibles = [
            {'id': 'services_santes', 'nom': 'Services de santé', 'icon': 'hospital', 'color': '#E74C3C'},
            {'id': 'bacs', 'nom': 'Bacs', 'icon': 'ship', 'color': '#F39C12'},
            {'id': 'ponts', 'nom': 'Ponts', 'icon': 'bridge', 'color': '#9B59B6'},
            {'id': 'buses', 'nom': 'Buses', 'icon': 'bus', 'color': '#E74C3C'},
            {'id': 'dalots', 'nom': 'Dalots', 'icon': 'water', 'color': '#3498DB'},
            {'id': 'ecoles', 'nom': 'Écoles', 'icon': 'graduation-cap', 'color': '#27AE60'},
            {'id': 'marches', 'nom': 'Marchés', 'icon': 'shopping-cart', 'color': '#F1C40F'},
            {'id': 'batiments_administratifs', 'nom': 'Bâtiments administratifs', 'icon': 'building', 'color': '#34495E'},
            {'id': 'infrastructures_hydrauliques', 'nom': 'Infrastructures hydrauliques', 'icon': 'tint', 'color': '#3498DB'},
            {'id': 'localites', 'nom': 'Localités', 'icon': 'home', 'color': '#E67E22'},
            {'id': 'passages_submersibles', 'nom': 'Passages submersibles', 'icon': 'water', 'color': '#1ABC9C'},
            {'id': 'autres_infrastructures', 'nom': 'Autres infrastructures', 'icon': 'map-pin', 'color': '#95A5A6'},
            {'id': 'pistes', 'nom': 'Pistes', 'icon': 'road', 'color': '#2C3E50'}
        ]
        
        return Response({
            'types': types_disponibles,
            'total': len(types_disponibles)
        })