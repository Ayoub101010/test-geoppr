# spatial_views.py - Version FINALE optimisée avec SRID 4326
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.views.decorators.gzip import gzip_page
from django.utils.decorators import method_decorator
import time
from .models import *

@method_decorator(gzip_page, name='dispatch')
class CollectesGeoAPIView(APIView):
    """
    API OPTIMISÉE
    - select_related() pour éviter N+1 queries
    - only() pour charger uniquement les champs nécessaires
    - ✅ PAS de transform car données déjà en 4326
    - Pas de cache (données mises à jour en continu)
    """
    
    def get(self, request):
        """Retourne les infrastructures en GeoJSON avec filtres géographiques"""
        
        start_time = time.time()
        
        region_id = request.GET.get('region_id')
        prefecture_id = request.GET.get('prefecture_id')
        commune_id = request.GET.get('commune_id')
        types = request.GET.getlist('types', [])
        
        print(f"🌍 [CollectesGeoAPI] Filtres reçus - Region: {region_id}, Prefecture: {prefecture_id}, Commune: {commune_id}, Types: {types}")
        
        results = {
            'type': 'FeatureCollection',
            'features': [],
            'total': 0,
            'filters_applied': {
                'region_id': region_id,
                'prefecture_id': prefecture_id,
                'commune_id': commune_id,
                'types': types
            },
            'timestamp': timezone.now().isoformat()
        }
        
        try:
            if not region_id and not prefecture_id and not commune_id:
                print("📊 Chargement de TOUTES les données")
                target_commune_ids = None
            else:
                target_commune_ids = self._get_target_communes(region_id, prefecture_id, commune_id)
                
                if target_commune_ids is not None and len(target_commune_ids) == 0:
                    print("⚠️ Aucune commune trouvée")
                    return Response(results)
            
            print(f"🎯 Communes: {len(target_commune_ids) if target_commune_ids else 'toutes'}")
            
            self._load_point_infrastructures(results, target_commune_ids, types_filter=None)
            self._load_linear_infrastructures(results, target_commune_ids, types_filter=None)
            
            processing_time = time.time() - start_time
            results['total'] = len(results['features'])
            results['processing_time'] = f"{processing_time:.2f}s"
            
            print(f"✅ {results['total']} features retournées en {processing_time:.2f}s")
            
            return Response(results)
            
        except Exception as e:
            print(f"❌ Erreur: {e}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': str(e), 
                'type': type(e).__name__,
                'details': 'Erreur lors de la récupération des données spatiales'
            }, status=500)

    def _get_target_communes(self, region_id, prefecture_id, commune_id):
        try:
            if commune_id:
                return [int(commune_id)]
            elif prefecture_id:
                communes = CommuneRurale.objects.filter(prefectures_id_id=int(prefecture_id))
                return list(communes.values_list('id', flat=True))
            elif region_id:
                communes = CommuneRurale.objects.filter(
                    prefectures_id__regions_id_id=int(region_id)
                )
                return list(communes.values_list('id', flat=True))
            else:
                return None
        except (ValueError, TypeError) as e:
            print(f"❌ Erreur: {e}")
            return []

    def _should_include_type(self, type_name, types_filter):
        if not types_filter:
            return True
        return type_name in types_filter

    def _load_point_infrastructures(self, results, target_commune_ids, types_filter):
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
            'autres_infrastructures': AutresInfrastructures,
        }
        
        for type_name, model_class in point_models.items():
            try:
                queryset = model_class.objects.filter(
                    geom__isnull=False
                ).select_related('commune_id').only('fid', 'geom', 'commune_id')
                
                if target_commune_ids is not None:
                    queryset = queryset.filter(commune_id__in=target_commune_ids)
                
                for item in queryset:
                    try:
                        if item.geom:
                            commune_id = item.commune_id.id if item.commune_id else None
                            
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
                                    'commune_id': commune_id
                                }
                            }
                            results['features'].append(feature)
                    except Exception:
                        continue
                        
            except Exception as e:
                print(f"Erreur {type_name}: {e}")
                continue

    def _load_linear_infrastructures(self, results, target_commune_ids, types_filter):
        
        # ==================== BACS ====================
        try:
            bacs_queryset = Bacs.objects.filter(
                geom__isnull=False
            ).select_related('commune_id').only('fid', 'geom', 'commune_id')
            
            if target_commune_ids is not None:
                bacs_queryset = bacs_queryset.filter(commune_id__in=target_commune_ids)
            
            for bac in bacs_queryset:
                try:
                    if bac.geom:
                        geom_type = bac.geom.geom_type
                        coordinates = None
                        
                        if geom_type == 'Point':
                            coordinates = [float(bac.geom.x), float(bac.geom.y)]
                        elif geom_type == 'LineString':
                            simplified_geom = bac.geom.simplify(0.001)
                            coordinates = list(simplified_geom.coords)
                        elif geom_type == 'MultiLineString':
                            simplified_geom = bac.geom.simplify(0.001)
                            coordinates = [list(line.coords) for line in simplified_geom]
                        
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
                                    'commune_id': bac.commune_id.id if bac.commune_id else None,
                                }
                            }
                            results['features'].append(feature)
                except Exception:
                    continue
                        
        except Exception as e:
            print(f"Erreur bacs: {e}")
        
        # ==================== PISTES (OPTIMISÉ - SANS TRANSFORM) ====================
        try:
            piste_queryset = Piste.objects.filter(
                geom__isnull=False
            ).select_related('communes_rurales_id').only('id', 'code_piste', 'geom', 'communes_rurales_id')
            
            if target_commune_ids is not None:
                piste_queryset = piste_queryset.filter(communes_rurales_id__in=target_commune_ids)
            
            for piste in piste_queryset:
                try:
                    if piste.geom:
                        simplified_geom = piste.geom.simplify(0.001)
                        
                        if simplified_geom.empty:
                            continue
                        
                        # ✅ Déjà en 4326, pas besoin de transform - RAPIDE !
                        geom_4326 = simplified_geom
                        
                        coordinates = None
                        if geom_4326.geom_type == 'LineString':
                            coordinates = list(geom_4326.coords)
                        elif geom_4326.geom_type == 'MultiLineString':
                            coordinates = []
                            for line in geom_4326:
                                coordinates.append(list(line.coords))
                        
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
                                    'commune_id': piste.communes_rurales_id.id if piste.communes_rurales_id else None,
                                }
                            }
                            results['features'].append(feature)
                except Exception:
                    continue
                
        except Exception as e:
            print(f"Erreur pistes: {e}")
        
        # ==================== PASSAGES SUBMERSIBLES ====================
        try:
            queryset = PassagesSubmersibles.objects.filter(
                geom__isnull=False
            ).select_related('commune_id').only('fid', 'geom', 'commune_id')
            
            if target_commune_ids is not None:
                queryset = queryset.filter(commune_id__in=target_commune_ids)
            
            for passage in queryset:
                try:
                    if passage.geom:
                        simplified_geom = passage.geom.simplify(0.001)
                        
                        # ✅ Vérifier SRID et transformer si nécessaire
                        if simplified_geom.srid == 4326:
                            geom_4326 = simplified_geom
                        else:
                            geom_4326 = simplified_geom.transform(4326, clone=True)
                        
                        coordinates = list(geom_4326.coords)
                        
                        feature = {
                            'type': 'Feature',
                            'id': f"passages_submersibles_{passage.fid}",
                            'geometry': {
                                'type': 'LineString',
                                'coordinates': coordinates
                            },
                            'properties': {
                                'fid': int(passage.fid),
                                'type': 'passages_submersibles',
                                'commune_id': passage.commune_id.id if passage.commune_id else None,
                            }
                        }
                        results['features'].append(feature)
                            
                except Exception:
                    continue
                        
        except Exception as e:
            print(f"Erreur passages: {e}")


class CommunesSearchAPIView(APIView):
    """API de recherche communes"""
    
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
                    'nom': commune.nom,
                    'prefecture': prefecture_nom,
                    'region': region_nom,
                })
            
            return Response({
                'communes': results,
                'total': len(results)
            })
            
        except Exception as e:
            return Response({
                'error': str(e),
                'communes': []
            }, status=500)


class TypesInfrastructuresAPIView(APIView):
    """API pour les types d'infrastructures"""
    
    def get(self, request):
        types_config = {
            'pistes': {'label': 'Pistes', 'icon': 'road', 'color': '#2C3E50'},
            'chaussees': {'label': 'Chaussées', 'icon': 'road', 'color': '#8e44ad'},
            'ponts': {'label': 'Ponts', 'icon': 'bridge', 'color': '#9B59B6'},
            'buses': {'label': 'Buses', 'icon': 'bus', 'color': '#E74C3C'},
            'dalots': {'label': 'Dalots', 'icon': 'water', 'color': '#3498DB'},
            'bacs': {'label': 'Bacs', 'icon': 'ship', 'color': '#F39C12'},
            'passages_submersibles': {'label': 'Passages submersibles', 'icon': 'water', 'color': '#1ABC9C'},
            'localites': {'label': 'Localités', 'icon': 'home', 'color': '#E67E22'},
            'ecoles': {'label': 'Écoles', 'icon': 'graduation-cap', 'color': '#27AE60'},
            'services_santes': {'label': 'Services de santé', 'icon': 'hospital', 'color': '#E74C3C'},
            'marches': {'label': 'Marchés', 'icon': 'shopping-cart', 'color': '#F1C40F'},
            'batiments_administratifs': {'label': 'Bâtiments administratifs', 'icon': 'building', 'color': '#34495E'},
            'infrastructures_hydrauliques': {'label': 'Infrastructures hydrauliques', 'icon': 'tint', 'color': '#3498DB'},
            'autres_infrastructures': {'label': 'Autres infrastructures', 'icon': 'map-pin', 'color': '#95A5A6'}
        }
        
        return Response({
            'types': types_config,
            'total': len(types_config)
        })