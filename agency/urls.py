# agency/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from .views import *

router = DefaultRouter()
router.register(r'landplots', ZemelnyiUchastokViewSet, basename='landplot')
router.register(r'microdistricts', MikroraionViewSet, basename='microdistrict')
router.register(r'apartments', MnogoetazhkaViewSet, basename='apartment')
router.register(r'detachedhouses', ChastnyiDomViewSet, basename='detachedhouse')
router.register(r'flats', KvartiraViewSet, basename='flat')
router.register(r'rooms', KomnataViewSet, basename='room')
router.register(r'rentals', ArendaViewSet, basename='rental')
router.register(r'sales', ProdazhaViewSet, basename='sale')
router.register(r'clients', KlientViewSet, basename='client')
router.register(r'requests', ZayavkaViewSet, basename='request')
router.register(r'request-events', SobytieZayavkiViewSet, basename='requestevent')
router.register(r'meetings', VstrechaViewSet, basename='meeting')
router.register(r'notifications', UvedomlenieViewSet, basename='notification')
router.register(r'region-settings', RegionSettingsViewSet, basename='regionsettings')
router.register(r'trash', KorzinaViewSet, basename='trash')
router.register(r'ai-description', AIDescriptionViewSet, basename='aidescription')
router.register(r'users', UserViewSet, basename='user')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'regions', RegionViewSet, basename='region')
router.register(r'cities', GorodViewSet, basename='city')
router.register(r'districts', RaionViewSet, basename='district')
router.register(r'metro-stations', MetroStantsiyaViewSet, basename='metrostation')
router.register(r'bathroom-types', TipSanuzlaViewSet, basename='bathroomtype')
router.register(r'balcony-types', BalkonLogdiaTipViewSet, basename='balconytype')
router.register(r'communication-types', TipKommunikatsiiViewSet, basename='communicationtype')
router.register(r'water-supply-types', TipVodosnabzheniyaViewSet, basename='watersupplytype')
router.register(r'severage-types', TipKanalizatsiiViewSet, basename='severagetype')
router.register(r'bathroom-locations', MestopolozhenieSanuzlaViewSet, basename='bathroomlocation')
router.register(r'technic-choices', TekhnikaViewSet, basename='technicchoice')
router.register(r'furniture-choices', MebelViewSet, basename='furniturechoice')

urlpatterns = [
    path('', include(router.urls)),
    path('meeting/confirm/<str:token>/', PodtverzhdenieVstrechiViewSet.as_view({'get': 'get_info', 'post': 'confirm_action'}), name='meeting-confirm-detail'),
    path('init-db/', views.init_db, name='init_db'),
]