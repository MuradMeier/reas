# admin.py (переименована)
from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from django.utils.translation import gettext as _
from .forms import *
from .models import *


# Действия (actions) для мягкого удаления и восстановления
def soft_delete(modeladmin, request, queryset):
    for obj in queryset:
        obj.delete(user=request.user)  # используется переопределённый delete
soft_delete.short_description = _("Мягко удалить выбранные объекты")

def restore(modeladmin, request, queryset):
    queryset.update(udaleno=False, data_udaleniya=None, udalil=None)
restore.short_description = _("Восстановить выбранные объекты")

def hard_delete(modeladmin, request, queryset):
    for obj in queryset:
        obj.hard_delete()
hard_delete.short_description = _("Полностью удалить выбранные объекты")


# Базовый класс для моделей с мягким удалением
class MyagkoeUdalenieAdmin(admin.ModelAdmin):
    list_filter = ('udaleno',)
    actions = [soft_delete, restore, hard_delete]

    def get_queryset(self, request):
        qs = self.model.all_objects if hasattr(self.model, 'all_objects') else self.model.objects.all()
        return qs

    def get_list_display(self, request):
        list_display = super().get_list_display(request)
        if 'udaleno' not in list_display:
            list_display = list(list_display) + ['udaleno']
        return list_display


# --- Базовый класс для справочников ---
class ProstoySpravochnikAdmin(admin.ModelAdmin):
    list_display = ('id', 'nazvanie')
    search_fields = ('nazvanie',)


# --- Inline-классы ---
class FotoInline(GenericTabularInline):
    ct_field = "tip_obekta"
    ct_fk_field = "id_obekta"
    model = Foto
    extra = 1
    fields = ('izobrazhenie',)

class ArendaInline(GenericTabularInline):
    ct_field = "tip_obekta"
    ct_fk_field = "id_obekta"
    model = Arenda
    extra = 0
    fields = ('tsena', 'kurenie', 'deti', 'zhivotnye', 'spalnyh_mest')

class ProdazhaInline(GenericTabularInline):
    ct_field = "tip_obekta"
    ct_fk_field = "id_obekta"
    model = Prodazha
    extra = 0
    fields = ('tsena',)

class KomnataInline(GenericTabularInline):
    ct_field = "tip_obekta"
    ct_fk_field = "id_obekta"
    model = Komnata
    extra = 0
    fields = ('ploshad_komnaty', 'etazh')


# --- Базовый класс для админок объектов недвижимости ---
class NedvizhimostAdmin(MyagkoeUdalenieAdmin):
    """
    Базовый класс для всех объектов недвижимости.
    Содержит общие inlines и обработку фотографий.
    """
    inlines = [FotoInline, ArendaInline, ProdazhaInline]

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        # Если у формы есть метод save_photos, вызываем его
        if hasattr(form, 'save_photos'):
            form.save_photos(form.instance)


# --- Админка для справочников (используем ProstoySpravochnikAdmin) ---
@admin.register(TipSanuzla)
class TipSanuzlaAdmin(ProstoySpravochnikAdmin):
    pass

@admin.register(BalkonLogdiaTip)
class BalkonLogdiaTipAdmin(ProstoySpravochnikAdmin):
    pass

@admin.register(TipKommunikatsii)
class TipKommunikatsiiAdmin(ProstoySpravochnikAdmin):
    pass

@admin.register(TipVodosnabzheniya)
class TipVodosnabzheniyaAdmin(ProstoySpravochnikAdmin):
    pass

@admin.register(TipKanalizatsii)
class TipKanalizatsiiAdmin(ProstoySpravochnikAdmin):
    pass

@admin.register(MestopolozhenieSanuzla)
class MestopolozhenieSanuzlaAdmin(ProstoySpravochnikAdmin):
    pass

@admin.register(Tekhnika)
class TekhnikaAdmin(ProstoySpravochnikAdmin):
    list_display = ('id', 'vybor')
    search_fields = ('vybor',)

@admin.register(Mebel)
class MebelAdmin(ProstoySpravochnikAdmin):
    list_display = ('id', 'vybor')
    search_fields = ('vybor',)


# --- Админки объектов недвижимости (наследуют NedvizhimostAdmin) ---
@admin.register(ZemelnyiUchastok)
class ZemelnyiUchastokAdmin(NedvizhimostAdmin):
    form = ZemelnyiUchastokAdminForm
    list_display = ('id', 'gorod_tekst', 'ulitsa', 'nomer_uchastka', 'ploshad_uchastka', 'udaleno')
    list_display_links = ('id', 'gorod_tekst', 'ulitsa')
    search_fields = ('gorod_tekst', 'ulitsa', 'kadastr_nomer', 'nomer_uchastka')
    list_filter = ('tip_uchastka', 'voda', 'gaz', 'kanalizatsiya', 'udaleno')
    fieldsets = (
        (_('Адрес'), {
            'fields': ('gorod_tekst', 'ulitsa', 'koordinaty')
        }),
        (_('Расположение (справочники)'), {
            'fields': ('region', 'gorod', 'raion', 'metro_stantsii')
        }),
        (_('Характеристики'), {
            'fields': ('nomer_uchastka', 'kadastr_nomer', 'ploshad_uchastka', 'tip_uchastka',
                       'voda', 'kanalizatsiya', 'gaz')
        }),
    )


@admin.register(Mnogoetazhka)
class MnogoetazhkaAdmin(NedvizhimostAdmin):
    list_display = ('id', 'gorod_tekst', 'ulitsa', 'nomer_doma', 'god_postroiki', 'udaleno')
    list_display_links = ('id', 'gorod_tekst', 'ulitsa')
    search_fields = ('gorod_tekst', 'ulitsa', 'nomer_doma')
    list_filter = ('tip_doma', 'lift', 'udaleno')
    fieldsets = (
        (_('Адрес'), {
            'fields': ('gorod_tekst', 'ulitsa', 'nomer_doma', 'korpus', 'stroenie', 'koordinaty')
        }),
        (_('Расположение (справочники)'), {
            'fields': ('region', 'gorod', 'raion', 'metro_stantsii')
        }),
        (_('Характеристики'), {
            'fields': ('god_postroiki', 'tip_doma', 'etazhnost', 'lift')
        }),
    )


@admin.register(ChastnyiDom)
class ChastnyiDomAdmin(NedvizhimostAdmin):
    form = ChastnyiDomAdminForm
    list_display = ('id', 'gorod_tekst', 'ulitsa', 'nomer_doma', 'god_postroiki', 'udaleno')
    list_display_links = ('id', 'gorod_tekst', 'ulitsa')
    search_fields = ('gorod_tekst', 'ulitsa', 'nomer_doma')
    list_filter = ('tip_doma', 'udaleno')
    filter_horizontal = ('mestopolozhenie_sanuzla', 'kommunikatsii', 'tip_vody', 'tip_kanalizatsii')
    inlines = NedvizhimostAdmin.inlines + [KomnataInline]
    fieldsets = (
        (_('Адрес'), {
            'fields': ('gorod_tekst', 'ulitsa', 'nomer_doma', 'korpus', 'stroenie', 'koordinaty')
        }),
        (_('Расположение (справочники)'), {
            'fields': ('region', 'gorod', 'raion', 'metro_stantsii')
        }),
        (_('Характеристики дома'), {
            'fields': ('god_postroiki', 'tip_doma', 'etazhnost',
                       'rasstoyanie_do_centra', 'ploshad_uchastka', 'zhilaya_ploshad', 'kolichestvo_komnat')
        }),
        (_('Коммуникации и удобства'), {
            'fields': ('mestopolozhenie_sanuzla', 'kommunikatsii', 'tip_vody', 'tip_kanalizatsii')
        }),
    )


@admin.register(Kvartira)
class KvartiraAdmin(NedvizhimostAdmin):
    form = KvartiraAdminForm
    list_display = ('id', 'mnogoetazhka', 'nomer_kvartiry', 'kolichestvo_komnat', 'zhilaya_ploshad', 'udaleno')
    list_display_links = ('id', 'nomer_kvartiry')
    search_fields = ('mnogoetazhka__gorod_tekst', 'mnogoetazhka__ulitsa', 'mnogoetazhka__nomer_doma', 'nomer_kvartiry')
    list_filter = ('kolichestvo_komnat', 'tip_komnat', 'remont', 'udaleno')
    filter_horizontal = ('tip_sanuzla', 'balkon_ili_loggia', 'tekhnika', 'mebel')
    inlines = NedvizhimostAdmin.inlines + [KomnataInline]
    fieldsets = (
        (_('Привязка к дому'), {
            'fields': ('mnogoetazhka',)
        }),
        (_('Адрес в доме'), {
            'fields': ('nomer_kvartiry', 'etazh')
        }),
        (_('Расположение (справочники)'), {
            'fields': ('region', 'gorod', 'raion', 'metro_stantsii')
        }),
        (_('Параметры'), {
            'fields': ('kolichestvo_komnat', 'zhilaya_ploshad', 'kolichestvo_sanuzlov', 'tip_sanuzla',
                       'tip_komnat', 'balkon_ili_loggia', 'remont')
        }),
        (_('Оснащение'), {
            'fields': ('tekhnika', 'mebel')
        }),
    )
    autocomplete_fields = ('mnogoetazhka',)


# --- Остальные админки ---
@admin.register(Komnata)
class KomnataAdmin(MyagkoeUdalenieAdmin):
    list_display = ('id', 'obekt', 'ploshad_komnaty', 'etazh', 'udaleno')
    list_display_links = ('id', 'obekt')
    search_fields = ('obekt__gorod_tekst', 'obekt__ulitsa')
    list_filter = ('udaleno',)
    fieldsets = (
        (_('Привязка к объекту'), {
            'fields': ('tip_obekta', 'id_obekta')
        }),
        (_('Параметры'), {
            'fields': ('ploshad_komnaty', 'etazh')
        }),
    )


@admin.register(Arenda)
class ArendaAdmin(MyagkoeUdalenieAdmin):
    list_display = ('id', 'obekt', 'tsena', 'kurenie', 'deti', 'zhivotnye', 'udaleno')
    list_display_links = ('id', 'obekt')
    search_fields = ('obekt__gorod_tekst', 'obekt__ulitsa')
    list_filter = ('kurenie', 'deti', 'zhivotnye', 'udaleno')
    fields = ('tip_obekta', 'id_obekta', 'tsena', 'kurenie', 'deti', 'zhivotnye', 'spalnyh_mest')


@admin.register(Prodazha)
class ProdazhaAdmin(MyagkoeUdalenieAdmin):
    list_display = ('id', 'obekt', 'tsena', 'udaleno')
    list_display_links = ('id', 'obekt')
    search_fields = ('obekt__gorod_tekst', 'obekt__ulitsa')
    list_filter = ('udaleno',)
    fields = ('tip_obekta', 'id_obekta', 'tsena')


@admin.register(Klient)
class KlientAdmin(MyagkoeUdalenieAdmin):
    list_display = ('id', 'familiya', 'imya', 'telefon', 'email', 'otvetstvennyi', 'uvedomleniya_vklyucheny', 'udaleno')
    list_display_links = ('id', 'familiya', 'imya')
    search_fields = ('familiya', 'imya', 'telefon', 'email')
    list_filter = ('otvetstvennyi', 'udaleno')
    fieldsets = (
        (_('ФИО'), {
            'fields': ('familiya', 'imya', 'otchestvo')
        }),
        (_('Контакты'), {
            'fields': ('telefon', 'email')
        }),
        (_('Дополнительно'), {
            'fields': ('kommentariy', 'otvetstvennyi')
        }),
        (_('Уведомления'), {
            'fields': ('uvedomleniya_vklyucheny',)
        }),
    )
    autocomplete_fields = ('otvetstvennyi',)


class SobytieZayavkiInline(admin.TabularInline):
    model = SobytieZayavki
    extra = 0
    fields = ('tip_sobytiya', 'sozdano', 'sozdal', 'opisanie', 'vremya_vstrechi', 'mesto_vstrechi')
    readonly_fields = ('sozdano',)


class VstrechaInline(admin.TabularInline):
    model = Vstrecha
    extra = 0
    fields = ('data_vremya', 'status', 'mesto', 'sozdal')
    readonly_fields = ('sozdano',)


@admin.register(Zayavka)
class ZayavkaAdmin(MyagkoeUdalenieAdmin):
    list_display = ('id', 'klient', 'nedvizhimost', 'status', 'naznachen', 'sozdano', 'udaleno')
    list_display_links = ('id', 'klient')
    search_fields = ('klient__familiya', 'klient__telefon', 'nedvizhimost__gorod_tekst', 'nedvizhimost__ulitsa')
    list_filter = ('status', 'naznachen', 'udaleno')
    fieldsets = (
        (_('Клиент и объект'), {
            'fields': ('klient', 'tip_nedvizhimosti', 'id_nedvizhimosti', 'naznachen')
        }),
        (_('Статус и даты'), {
            'fields': ('status', 'sozdano', 'obnovleno')
        }),
        (_('Пожелания'), {
            'fields': ('byudzhet_ot', 'byudzhet_do', 'kommentariy_klienta')
        }),
    )
    readonly_fields = ('sozdano', 'obnovleno')
    inlines = [SobytieZayavkiInline, VstrechaInline]
    autocomplete_fields = ('klient', 'naznachen')


@admin.register(SobytieZayavki)
class SobytieZayavkiAdmin(admin.ModelAdmin):
    list_display = ('id', 'zayavka', 'tip_sobytiya', 'sozdano', 'sozdal')
    list_filter = ('tip_sobytiya', 'sozdal')
    search_fields = ('zayavka__klient__familiya', 'opisanie')
    fields = ('zayavka', 'tip_sobytiya', 'opisanie', 'sozdal', 'vremya_vstrechi', 'mesto_vstrechi')
    readonly_fields = ('sozdano',)


class TokenPodtverzhdeniyaVstrechiInline(admin.TabularInline):
    model = TokenPodtverzhdeniyaVstrechi
    extra = 0
    readonly_fields = ('token', 'sozdano', 'istekaet')
    fields = ('token', 'sozdano', 'istekaet')
    can_delete = False


@admin.register(Vstrecha)
class VstrechaAdmin(MyagkoeUdalenieAdmin):
    list_display = ('id', 'zayavka', 'data_vremya', 'status', 'klient_podtverdil', 'klient_otkazal', 'napominanie_otpravleno', 'sozdal', 'udaleno')
    list_filter = ('status', 'klient_podtverdil', 'klient_otkazal', 'udaleno')
    search_fields = ('zayavka__klient__familiya', 'mesto')
    fields = ('zayavka', 'data_vremya', 'dlitelnost', 'mesto', 'status', 'kommentariy', 'sozdal',
              'napominanie_za_chasov', 'klient_podtverdil', 'klient_otkazal', 'zapros_perenosa', 'napominanie_otpravleno')
    readonly_fields = ('zapros_perenosa',)
    inlines = [TokenPodtverzhdeniyaVstrechiInline]
    autocomplete_fields = ('zayavka', 'sozdal')


@admin.register(Uvedomlenie)
class UvedomlenieAdmin(admin.ModelAdmin):
    list_display = ('id', 'poluchatel', 'tip', 'soobshchenie_kratko', 'prochitano', 'sozdano')
    list_filter = ('tip', 'prochitano', 'poluchatel')
    search_fields = ('poluchatel__username', 'soobshchenie')
    fields = ('poluchatel', 'tip', 'soobshchenie', 'ssylka', 'prochitano')
    readonly_fields = ('sozdano',)

    def soobshchenie_kratko(self, obj):
        return obj.soobshchenie[:50] + ('...' if len(obj.soobshchenie) > 50 else '')
    soobshchenie_kratko.short_description = _('Сообщение')


@admin.register(Foto)
class FotoAdmin(admin.ModelAdmin):
    list_display = ('id', 'obekt', 'izobrazhenie')
    list_filter = ('tip_obekta',)
    search_fields = ('obekt__gorod_tekst', 'obekt__ulitsa')
    fields = ('tip_obekta', 'id_obekta', 'izobrazhenie')