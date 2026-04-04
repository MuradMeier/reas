# models.py (полностью переименована на русские термины в транслите)
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.contrib.gis.db import models as gis_models
from django.core.exceptions import ValidationError
from django.conf import settings
from datetime import date
import secrets
from django.utils import timezone
from django.contrib.auth import get_user_model
from model_utils import FieldTracker


User = get_user_model()

# ----------------------------------------------------------------------
# Справочники (все имена полей переведены)
# ----------------------------------------------------------------------

class TipSanuzla(models.Model):
    nazvanie = models.CharField(max_length=50, unique=True, verbose_name='Название')
    class Meta:
        verbose_name = 'Тип санузла'
        verbose_name_plural = 'Типы санузлов'
    def __str__(self):
        return self.nazvanie

class BalkonLogdiaTip(models.Model):
    nazvanie = models.CharField(max_length=50, unique=True, verbose_name='Название')
    class Meta:
        verbose_name = 'Балкон/лоджия'
        verbose_name_plural = 'Балконы/лоджии'
    def __str__(self):
        return self.nazvanie

class TipKommunikatsii(models.Model):
    nazvanie = models.CharField(max_length=50, unique=True, verbose_name='Название')
    class Meta:
        verbose_name = 'Коммуникация'
        verbose_name_plural = 'Коммуникации'
    def __str__(self):
        return self.nazvanie

class TipVodosnabzheniya(models.Model):
    nazvanie = models.CharField(max_length=50, unique=True, verbose_name='Название')
    class Meta:
        verbose_name = 'Тип водоснабжения'
        verbose_name_plural = 'Типы водоснабжения'
    def __str__(self):
        return self.nazvanie

class TipKanalizatsii(models.Model):
    nazvanie = models.CharField(max_length=50, unique=True, verbose_name='Название')
    class Meta:
        verbose_name = 'Тип канализации'
        verbose_name_plural = 'Типы канализации'
    def __str__(self):
        return self.nazvanie

class MestopolozhenieSanuzla(models.Model):
    nazvanie = models.CharField(max_length=50, unique=True, verbose_name='Название')
    class Meta:
        verbose_name = 'Местоположение санузла'
        verbose_name_plural = 'Местоположения санузлов'
    def __str__(self):
        return self.nazvanie

class Tekhnika(models.Model):
    vybor = models.CharField(max_length=255, unique=True, verbose_name='Техника')
    class Meta:
        verbose_name_plural = "Техника"
    def __str__(self):
        return self.vybor

class Mebel(models.Model):
    vybor = models.CharField(max_length=255, unique=True, verbose_name='Мебель')
    class Meta:
        verbose_name_plural = "Мебель"
    def __str__(self):
        return self.vybor


# ----------------------------------------------------------------------
# Абстрактный миксин для мягкого удаления (поля переименованы)
# ----------------------------------------------------------------------

class MyagkoeUdalenieManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(udaleno=False)

class MyagkoeUdalenieModel(models.Model):
    udaleno = models.BooleanField(default=False, db_index=True, verbose_name='Удалено')
    data_udaleniya = models.DateTimeField(null=True, blank=True, verbose_name='Дата удаления')
    udalil = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Кем удалено',
        related_name='udalil_%(class)ss'
    )
    objects = MyagkoeUdalenieManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False, user=None):
        self.udaleno = True
        self.data_udaleniya = timezone.now()
        if user:
            self.udalil = user
        self.save(update_fields=['udaleno', 'data_udaleniya', 'udalil'])
        self._notify_head_realtors('soft_delete')

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using, keep_parents)

    def restore(self, user=None):
        self.udaleno = False
        self.data_udaleniya = None
        if user:
            self.udalil = None
        self.save(update_fields=['udaleno', 'data_udaleniya'])
        self._notify_head_realtors('restore')

    def _notify_head_realtors(self, action):
        from django.contrib.auth.models import Group
        from django.contrib.contenttypes.models import ContentType
        from .models import Uvedomlenie
        group_name = 'Главный риэлтор'
        try:
            group = Group.objects.get(name=group_name)
            recipients = group.user_set.all()
        except Group.DoesNotExist:
            return
        content_type = ContentType.objects.get_for_model(self)
        object_name = str(self)
        message = f'Объект удалён: {object_name}' if action == 'soft_delete' else f'Объект восстановлен: {object_name}'
        notif_type = 'soft_delete' if action == 'soft_delete' else 'restore'
        for user in recipients:
            Uvedomlenie.objects.create(
                poluchatel=user,
                tip=notif_type,
                soobshchenie=message,
                ssylka=f'/admin/{content_type.app_label}/{content_type.model}/{self.pk}/change/'
            )


# ----------------------------------------------------------------------
# Миксин для гео-полей (поля переименованы)
# ----------------------------------------------------------------------
class MestopolozhenieMixin(models.Model):
    region = models.ForeignKey('Region', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Регион')
    gorod = models.ForeignKey('Gorod', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Город')
    raion = models.ForeignKey('Raion', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Район')
    metro_stantsii = models.ManyToManyField('MetroStantsiya', blank=True, verbose_name='Станции метро')
    mikroraion = models.ForeignKey('Mikroraion', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Микрорайон')

    class Meta:
        abstract = True


# ----------------------------------------------------------------------
# Регион, Город, Район, Метро (поля переименованы)
# ----------------------------------------------------------------------
class Region(models.Model):
    nazvanie = models.CharField(max_length=100, unique=True, verbose_name='Название')
    poryadok = models.PositiveSmallIntegerField(default=0, verbose_name='Порядок сортировки')
    kladr_id = models.CharField(max_length=2, blank=True, null=True, verbose_name='Код КЛАДР (первые 2 символа)')
    fias_id = models.CharField(max_length=36, blank=True, null=True, verbose_name='ФИАС ID региона')
    class Meta:
        verbose_name = 'Регион'
        verbose_name_plural = 'Регионы'
        ordering = ['poryadok', 'nazvanie']
    def __str__(self):
        return self.nazvanie

class Gorod(models.Model):
    nazvanie = models.CharField(max_length=100, verbose_name='Название')
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name='goroda', verbose_name='Регион')
    est_metro = models.BooleanField(default=False, verbose_name='Есть метро')
    koordinaty = gis_models.PointField(null=True, blank=True, verbose_name='Координаты центра города')
    class Meta:
        unique_together = ('nazvanie', 'region')
        verbose_name = 'Город'
        verbose_name_plural = 'Города'
        ordering = ['nazvanie']
    def __str__(self):
        return f"{self.nazvanie} ({self.region.nazvanie})"

class Raion(models.Model):
    nazvanie = models.CharField(max_length=100, verbose_name='Название')
    gorod = models.ForeignKey(Gorod, on_delete=models.CASCADE, related_name='raiony', verbose_name='Город')
    class Meta:
        unique_together = ('nazvanie', 'gorod')
        verbose_name = 'Район'
        verbose_name_plural = 'Районы'
        ordering = ['nazvanie']
    def __str__(self):
        return f"{self.nazvanie} ({self.gorod.nazvanie})"

class MetroStantsiya(models.Model):
    nazvanie = models.CharField(max_length=100, verbose_name='Название')
    gorod = models.ForeignKey(Gorod, on_delete=models.CASCADE, related_name='metro_stantsii', verbose_name='Город')
    koordinaty = gis_models.PointField(null=True, blank=True, verbose_name='Координаты станции')
    class Meta:
        unique_together = ('nazvanie', 'gorod')
        verbose_name = 'Станция метро'
        verbose_name_plural = 'Станции метро'
        ordering = ['nazvanie']
    def __str__(self):
        return f"{self.nazvanie} ({self.gorod.nazvanie})"


# ----------------------------------------------------------------------
# Абстрактные базовые классы недвижимости (поля переименованы)
# ----------------------------------------------------------------------
class Nedvizhimost(models.Model):
    id = models.AutoField(primary_key=True)
    gorod_tekst = models.CharField(max_length=100, verbose_name='Город', db_index=True)
    ulitsa = models.CharField(max_length=255, verbose_name='Улица', db_index=True)
    koordinaty = gis_models.PointField(null=True, blank=True, verbose_name='Координаты')
    sozdano = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    obnovleno = models.DateTimeField(auto_now=True, verbose_name='Обновлено')
    opublikovano = models.BooleanField(default=False, verbose_name='Опубликовано')
    sozdal = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Кем создан',
        related_name='sozdannye_%(class)ss'
    )
    obrazy = GenericRelation('Foto', content_type_field='tip_obekta', object_id_field='id_obekta')
    class Meta:
        abstract = True
    def __str__(self):
        return f"{self.gorod_tekst}, {self.ulitsa}"

class ZhilayaNedvizhimost(Nedvizhimost):
    god_postroiki = models.PositiveIntegerField(verbose_name='Год постройки')
    nomer_doma = models.CharField(max_length=20, verbose_name='Номер дома')
    korpus = models.CharField(max_length=10, blank=True, verbose_name='Корпус')
    stroenie = models.CharField(max_length=10, blank=True, verbose_name='Строение')
    tip_doma = models.CharField(
        max_length=20,
        choices=[('brick', 'Кирпич'), ('monolith', 'Монолит'), ('panel', 'Панельный')],
        verbose_name='Тип дома',
        default='monolith'
    )
    etazhnost = models.PositiveIntegerField(verbose_name='Количество этажей')
    class Meta:
        abstract = True
    def clean(self):
        if self.god_postroiki > date.today().year:
            raise ValidationError({'god_postroiki': 'Год постройки не может быть больше текущего.'})


# ----------------------------------------------------------------------
# Конкретные модели недвижимости (с миксином MestopolozhenieMixin)
# ----------------------------------------------------------------------
class ZemelnyiUchastok(MyagkoeUdalenieModel, Nedvizhimost, MestopolozhenieMixin):
    prodazhi = GenericRelation('Prodazha', content_type_field='tip_obekta', object_id_field='id_obekta')
    arendy = GenericRelation('Arenda', content_type_field='tip_obekta', object_id_field='id_obekta')
    nomer_uchastka = models.CharField(max_length=50, blank=True, verbose_name='Номер участка')
    kadastr_nomer = models.CharField(max_length=50, blank=True, verbose_name='Кадастровый номер', db_index=True)
    ploshad_uchastka = models.PositiveIntegerField(verbose_name='Площадь участка (сотки)', help_text='в сотках')
    voda = models.BooleanField(verbose_name="Вода")
    kanalizatsiya = models.BooleanField(verbose_name="Канализация")
    opisanie = models.TextField(blank=True, verbose_name='Описание')
    gaz = models.BooleanField(verbose_name="Газ")
    tip_uchastka = models.CharField(max_length=3, choices=[('ИЖС', 'ИЖС'), ('СНТ', 'СНТ')], verbose_name="Тип участка")
    class Meta:
        verbose_name = 'Земельный участок'
        verbose_name_plural = 'Земельные участки'
        constraints = [models.CheckConstraint(check=models.Q(ploshad_uchastka__gt=0), name='landplot_area_positive')]
    def __str__(self):
        return f"Участок: {self.gorod}, {self.ulitsa} {self.nomer_uchastka or ''}"

class Mnogoetazhka(MyagkoeUdalenieModel, ZhilayaNedvizhimost, MestopolozhenieMixin):
    lift = models.BooleanField(verbose_name='Лифт')
    opisanie = models.TextField(blank=True, verbose_name='Описание')
    class Meta:
        verbose_name = 'Многоэтажка'
        verbose_name_plural = "Многоэтажки"
    def __str__(self):
        return f"Дом: {self.gorod}, {self.ulitsa} {self.nomer_doma}"

class ChastnyiDom(MyagkoeUdalenieModel, ZhilayaNedvizhimost, MestopolozhenieMixin):
    prodazhi = GenericRelation('Prodazha', content_type_field='tip_obekta', object_id_field='id_obekta')
    arendy = GenericRelation('Arenda', content_type_field='tip_obekta', object_id_field='id_obekta')
    opisanie = models.TextField(blank=True, verbose_name='Описание')
    mestopolozhenie_sanuzla = models.ManyToManyField(MestopolozhenieSanuzla, verbose_name='Местоположение санузлов', blank=True)
    rasstoyanie_do_centra = models.PositiveIntegerField(verbose_name='Расстояние до центра (км)')
    kommunikatsii = models.ManyToManyField(TipKommunikatsii, verbose_name='Коммуникации', blank=True)
    ploshad_uchastka = models.PositiveIntegerField(verbose_name='Площадь участка (сотки)')
    zhilaya_ploshad = models.PositiveIntegerField(verbose_name='Жилая площадь (кв.м)')
    tip_vody = models.ManyToManyField(TipVodosnabzheniya, verbose_name='Источник воды', blank=True)
    tip_kanalizatsii = models.ManyToManyField(TipKanalizatsii, verbose_name='Тип канализации', blank=True)
    kolichestvo_komnat = models.PositiveIntegerField(verbose_name='Количество комнат')
    komnaty = GenericRelation('Komnata', content_type_field='tip_obekta', object_id_field='id_obekta')
    class Meta:
        verbose_name = 'Частный дом'
        verbose_name_plural = "Частные дома"
        constraints = [
            models.CheckConstraint(check=models.Q(ploshad_uchastka__gt=0), name='detached_land_area_positive'),
            models.CheckConstraint(check=models.Q(zhilaya_ploshad__gt=0), name='detached_home_area_positive'),
        ]
    def __str__(self):
        return f"Дом: {self.gorod_tekst}, {self.ulitsa} {self.nomer_doma}"

class Kvartira(MyagkoeUdalenieModel, MestopolozhenieMixin):

    prodazhi = GenericRelation('Prodazha', content_type_field='tip_obekta', object_id_field='id_obekta')
    opublikovano = models.BooleanField(default=False, verbose_name='Опубликовано')
    opisanie = models.TextField(blank=True, verbose_name='Описание')
    arendy = GenericRelation('Arenda', content_type_field='tip_obekta', object_id_field='id_obekta')
    mnogoetazhka = models.ForeignKey(Mnogoetazhka, on_delete=models.CASCADE, verbose_name='Дом', related_name='kvartiry')
    nomer_kvartiry = models.CharField(max_length=10, verbose_name='Номер квартиры')
    koordinaty = gis_models.PointField(null=True, blank=True, verbose_name='Координаты')
    kolichestvo_komnat = models.PositiveIntegerField(verbose_name='Количество комнат')
    zhilaya_ploshad = models.PositiveIntegerField(verbose_name='Жилая площадь (кв.м)')
    etazh = models.IntegerField(verbose_name='Этаж')
    kolichestvo_sanuzlov = models.IntegerField(verbose_name='Число санузлов', default=1)
    tip_sanuzla = models.ManyToManyField(TipSanuzla, verbose_name='Типы санузлов', blank=True)
    balkon_ili_loggia = models.ManyToManyField(BalkonLogdiaTip, verbose_name='Балкон / лоджия', blank=True)
    tip_komnat = models.CharField(max_length=20, verbose_name='Тип комнат', choices=[('separate', 'Раздельный'), ('adjective', 'Смежный')], default='separate')
    tekhnika = models.ManyToManyField(Tekhnika, verbose_name='Техника', blank=True)
    mebel = models.ManyToManyField(Mebel, verbose_name='Мебель', blank=True)
    remont = models.CharField(max_length=20, verbose_name='Ремонт', blank=True, choices=[('euro', 'Евро'), ('cosmetic', 'Косметический'), ('capital', 'Капитальный'), ('designer', 'Дизайнерский')])
    sozdano = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    sozdal = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Кем создан',
        related_name='sozdannye_%(class)ss'
    )
    obnovleno = models.DateTimeField(auto_now=True, verbose_name='Обновлено')
    obrazy = GenericRelation('Foto', content_type_field='tip_obekta', object_id_field='id_obekta')
    komnaty = GenericRelation('Komnata', content_type_field='tip_obekta', object_id_field='id_obekta')
    class Meta:
        verbose_name = 'Квартира'
        verbose_name_plural = "Квартиры"
        constraints = [
            models.CheckConstraint(check=models.Q(zhilaya_ploshad__gt=0), name='flat_home_area_positive'),
            models.CheckConstraint(check=models.Q(kolichestvo_sanuzlov__gt=0), name='flat_bathroom_quantity_positive'),
        ]
    def __str__(self):
        return f"Кв.{self.nomer_kvartiry} в {self.mnogoetazhka}"


# ----------------------------------------------------------------------
# Комната (поля переименованы)
# ----------------------------------------------------------------------
class Komnata(MyagkoeUdalenieModel):
    ploshad_komnaty = models.PositiveIntegerField(verbose_name='Площадь комнаты (кв.м)')
    opisanie = models.TextField(blank=True, verbose_name='Описание')
    opublikovano = models.BooleanField(default=False, verbose_name='Опубликовано')
    sozdal = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Кем создан',
        related_name='sozdannye_%(class)ss'
    )
    etazh = models.PositiveIntegerField(null=True, blank=True, verbose_name='Этаж (если отличается от объекта)')
    tip_obekta = models.ForeignKey(ContentType, on_delete=models.RESTRICT)
    id_obekta = models.PositiveIntegerField()
    obekt = GenericForeignKey('tip_obekta', 'id_obekta')
    sozdano = models.DateTimeField(auto_now_add=True)
    obnovleno = models.DateTimeField(auto_now=True)


    class Meta:
        verbose_name = 'Комната'
        verbose_name_plural = "Комнаты"
        indexes = [models.Index(fields=['tip_obekta', 'id_obekta'])]

    def __str__(self):
        return f"Комната {self.ploshad_komnaty} кв.м (в {self.obekt})"

    @property
    def parent_type(self):
        return self.tip_obekta.model if self.tip_obekta else None

    @property
    def parent_id(self):
        return self.id_obekta


# ----------------------------------------------------------------------
# Фотографии (поля переименованы)
# ----------------------------------------------------------------------
class Foto(models.Model):
    tip_obekta = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    id_obekta = models.PositiveIntegerField()
    obekt = GenericForeignKey('tip_obekta', 'id_obekta')
    izobrazhenie = models.ImageField(upload_to='photos/', verbose_name='Фото')
    sozdano = models.DateTimeField(auto_now_add=True, verbose_name='Добавлено')
    class Meta:
        verbose_name = "Фотография"
        verbose_name_plural = "Фотографии"
        indexes = [models.Index(fields=['tip_obekta', 'id_obekta'])]
    def __str__(self):
        return f"Фото {self.id} для {self.obekt}"


# ----------------------------------------------------------------------
# Базовая модель для предложений аренды/продажи (поля переименованы)
# ----------------------------------------------------------------------
class BazovoePredlozhenie(MyagkoeUdalenieModel):
    tsena = models.IntegerField(verbose_name='Цена (руб)', db_index=True)
    tip_obekta = models.ForeignKey(ContentType, on_delete=models.RESTRICT)
    id_obekta = models.PositiveIntegerField()
    obekt = GenericForeignKey('tip_obekta', 'id_obekta')
    sozdano = models.DateTimeField(auto_now_add=True)
    obnovleno = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=['tip_obekta', 'id_obekta']),
        ]

    def __str__(self):
        return f"{self._meta.verbose_name} {self.obekt} за {self.tsena}"


# ----------------------------------------------------------------------
# Предложения аренды и продажи (наследуют BazovoePredlozhenie)
# ----------------------------------------------------------------------
class Arenda(BazovoePredlozhenie):
    kurenie = models.BooleanField(verbose_name='Можно курить')
    deti = models.BooleanField(verbose_name='Можно с детьми')
    zhivotnye = models.BooleanField(verbose_name='Можно с животными')
    spalnyh_mest = models.IntegerField(verbose_name='Количество спальных мест', default=1)

    class Meta(BazovoePredlozhenie.Meta):
        verbose_name = 'Аренда'
        verbose_name_plural = 'Аренда'
        constraints = [
            models.CheckConstraint(check=models.Q(tsena__gt=0), name='rental_price_positive'),
        ]


class Prodazha(BazovoePredlozhenie):
    class Meta(BazovoePredlozhenie.Meta):
        verbose_name = 'Продажа'
        verbose_name_plural = 'Продажа'
        constraints = [
            models.CheckConstraint(check=models.Q(tsena__gt=0), name='sale_price_positive'),
        ]


# ----------------------------------------------------------------------
# Клиенты и заявки (поля переименованы)
# ----------------------------------------------------------------------
class Klient(MyagkoeUdalenieModel):
    imya = models.CharField(max_length=100, verbose_name='Имя')
    uvedomleniya_vklyucheny = models.BooleanField(default=False, verbose_name='Согласие на уведомления')
    familiya = models.CharField(max_length=100, verbose_name='Фамилия')
    otchestvo = models.CharField(max_length=100, blank=True, verbose_name='Отчество')
    telefon = models.CharField(max_length=20, unique=True, verbose_name='Телефон', db_index=True)
    email = models.EmailField(blank=True, verbose_name='Email')
    kommentariy = models.TextField(blank=True, verbose_name='Комментарий')
    sozdano = models.DateTimeField(auto_now_add=True, verbose_name='Создан')
    obnovleno = models.DateTimeField(auto_now=True, verbose_name='Обновлён')
    otvetstvennyi = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Ответственный', related_name='klienty')
    class Meta:
        verbose_name = 'Клиент'
        verbose_name_plural = 'Клиенты'
    def __str__(self):
        return f"{self.familiya} {self.imya} ({self.telefon})"

class Zayavka(MyagkoeUdalenieModel, models.Model):
    PURPOSE_CHOICES = [
        ('buy', 'Купить'),
        ('sell', 'Продать'),
        ('rent', 'Снять'),
        ('lease', 'Сдать'),
    ]
    PROPERTY_TYPE_CHOICES = [
        ('flat', 'Квартира'),
        ('house', 'Дом'),
        ('land', 'Участок'),
        ('room', 'Комната'),
    ]
    STATUS_CHOICES = [
        ('new', 'Новая'),
        ('viewed', 'Просмотрена'),
        ('call_made', 'Совершён звонок'),
        ('no_answer', 'Не дозвонился'),
        ('callback', 'Перезвонить позже'),
        ('contacted', 'Контакт установлен'),
        ('meeting_scheduled', 'Встреча назначена'),
        ('pending_result', 'Ожидание результата встречи'),  # новый
        ('contract_signed', 'Договор подписан'),
        ('rejected_at_call', 'Отказ на этапе звонка'),  # новый
        ('rejected_at_meeting', 'Отказ на встрече'),  # новый
        ('thinking_after_call', 'Клиент думает (после звонка)'),
        ('thinking_after_meeting', 'Клиент думает (после встречи)'),
        ('taken', 'Взята в обработку'),
    ]

    purpose = models.CharField(max_length=10, choices=PURPOSE_CHOICES, verbose_name='Цель', default='buy')
    property_type = models.CharField(max_length=10, choices=PROPERTY_TYPE_CHOICES, verbose_name='Тип объекта',
                                     default='flat')
    extended_data = models.JSONField(null=True, blank=True, verbose_name='Дополнительные данные')
    klient = models.ForeignKey(Klient, on_delete=models.PROTECT, verbose_name='Клиент', related_name='zayavki')
    ip_adres = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP-адрес')
    eto_spam = models.BooleanField(default=False, verbose_name='Спам', db_index=True)
    tip_nedvizhimosti = models.ForeignKey(ContentType, on_delete=models.PROTECT, null=True, blank=True)
    id_nedvizhimosti = models.PositiveIntegerField(null=True, blank=True)
    nedvizhimost = GenericForeignKey('tip_nedvizhimosti', 'id_nedvizhimosti')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='new', db_index=True, verbose_name='Статус')
    sozdano = models.DateTimeField(auto_now_add=True, verbose_name='Создана')
    obnovleno = models.DateTimeField(auto_now=True, verbose_name='Обновлена')
    naznachen = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Ответственный риэлтор', related_name='naznachennye_zayavki')
    byudzhet_ot = models.IntegerField(null=True, blank=True, verbose_name='Бюджет от')
    byudzhet_do = models.IntegerField(null=True, blank=True, verbose_name='Бюджет до')
    kommentariy_klienta = models.TextField(blank=True, verbose_name='Пожелания клиента')
    taken_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата взятия в обработку')
    tracker = FieldTracker(fields=['status'])
    class Meta:
        verbose_name = 'Заявка'
        verbose_name_plural = 'Заявки'
        indexes = [models.Index(fields=['tip_nedvizhimosti', 'id_nedvizhimosti'])]
    def __str__(self):
        return f"Заявка #{self.id} от {self.klient}"

class SobytieZayavki(models.Model):
    EVENT_TYPES = [
        ('view', 'Просмотр'),
        ('call', 'Звонок'),
        ('contacted', 'Дозвонился'),  # новый
        ('no_answer', 'Не дозвонился'),
        ('callback', 'Перезвонить позже'),# новый
        ('comment', 'Комментарий'),
        ('meeting_scheduled', 'Встреча назначена'),
        ('meeting_done', 'Встреча состоялась'),
        ('offer', 'Предложение'),
        ('rejected', 'Отказ от встречи'),
    ]
    napominanie_otpravleno = models.BooleanField(default=False, verbose_name='Напоминание о результате отправлено')
    zayavka = models.ForeignKey(Zayavka, on_delete=models.CASCADE, related_name='sobytiya', verbose_name='Заявка')
    tip_sobytiya = models.CharField(max_length=20, choices=EVENT_TYPES, verbose_name='Тип события')
    sozdano = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    sozdal = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, verbose_name='Создатель', related_name='sobytiya_zayavok_sozdal')
    opisanie = models.TextField(blank=True, verbose_name='Описание')
    vremya_vstrechi = models.DateTimeField(null=True, blank=True, verbose_name='Дата и время встречи')
    mesto_vstrechi = models.CharField(max_length=255, blank=True, verbose_name='Место встречи')
    objects = models.Manager()
    class Meta:
        verbose_name = 'Событие'
        verbose_name_plural = 'События'
        ordering = ['-sozdano']
    def __str__(self):
        return f"{self.get_tip_sobytiya_display()} по заявке #{self.zayavka.id}"

class Vstrecha(MyagkoeUdalenieModel, models.Model):
    zayavka = models.ForeignKey(Zayavka, on_delete=models.CASCADE, related_name='vstrechi', verbose_name='Заявка')
    data_vremya = models.DateTimeField(verbose_name='Дата и время')
    dlitelnost = models.DurationField(null=True, blank=True, verbose_name='Длительность')
    mesto = models.CharField(max_length=255, blank=True, verbose_name='Место')
    status = models.CharField(max_length=20, choices=[('planned', 'Запланирована'), ('completed', 'Состоялась'), ('cancelled', 'Отменена')], default='planned', verbose_name='Статус')
    kommentariy = models.TextField(blank=True, verbose_name='Комментарий')
    sozdal = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, verbose_name='Создатель')
    sozdano = models.DateTimeField(auto_now_add=True)
    obnovleno = models.DateTimeField(auto_now=True)
    napominanie_za_chasov = models.PositiveIntegerField(default=24, verbose_name='Напоминание за (часов)')
    tracker = FieldTracker(fields=['status', 'klient_podtverdil', 'klient_otkazal', 'zapros_perenosa'])
    klient_podtverdil = models.BooleanField(default=False, verbose_name='Подтверждено клиентом')
    klient_otkazal = models.BooleanField(default=False, verbose_name='Отказ клиента')
    zapros_perenosa = models.JSONField(null=True, blank=True, verbose_name='Запрос на перенос', help_text='{"new_datetime": "...", "comment": "..."}')
    napominanie_otpravleno = models.BooleanField(default=False, verbose_name='Напоминание отправлено')
    class Meta:
        verbose_name = 'Встреча'
        verbose_name_plural = 'Встречи'
    def __str__(self):
        return f"Встреча {self.data_vremya} по заявке #{self.zayavka.id}"

class RegionSettings(models.Model):
    """Настройки разрешенных регионов"""
    allowed_region_codes = models.JSONField(
        default=list,
        verbose_name='Коды разрешенных регионов',
        help_text='Список кодов КЛАДР (первые два символа), например: ["77", "50", "40"]'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Настройки регионов'
        verbose_name_plural = 'Настройки регионов'

    def clean(self):
        if not isinstance(self.allowed_region_codes, list):
            raise ValidationError({'allowed_region_codes': 'Должен быть список'})
        for code in self.allowed_region_codes:
            if not isinstance(code, str) or len(code) != 2:
                raise ValidationError({'allowed_region_codes': f'Код {code} должен быть двухсимвольной строкой'})

    def save(self, *args, **kwargs):
        self.clean()
        # Обеспечиваем синглтон – только одна запись
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

class TokenPodtverzhdeniyaVstrechi(models.Model):
    objects = models.Manager()
    vstrecha = models.ForeignKey(Vstrecha, on_delete=models.CASCADE, related_name='tokeny_podtverzhdeniya')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    sozdano = models.DateTimeField(auto_now_add=True)
    istekaet = models.DateTimeField()
    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)
        if not self.istekaet:
            self.istekaet = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)
    def is_valid(self):
        return timezone.now() <= self.istekaet
    class Meta:
        verbose_name = 'Токен подтверждения встречи'
        verbose_name_plural = 'Токены подтверждения встреч'

# ----------------------------------------------------------------------
# Уведомления (поля переименованы)
# ----------------------------------------------------------------------
class Uvedomlenie(models.Model):
    poluchatel = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='uvedomleniya', verbose_name='Получатель')
    objects = models.Manager()
    tip = models.CharField(max_length=50, verbose_name='Тип')
    soobshchenie = models.TextField(verbose_name='Сообщение')
    ssylka = models.CharField(max_length=255, blank=True, verbose_name='Ссылка на объект')
    prochitano = models.BooleanField(default=False, verbose_name='Прочитано')
    kanal = models.CharField(max_length=20, choices=[('email', 'Email'), ('sms', 'SMS'), ('site', 'Сайт')],
                             default='site')
    status_otpravki = models.CharField(max_length=20,
                                       choices=[('pending', 'Ожидает'), ('sent', 'Отправлено'), ('failed', 'Ошибка')],
                                       default='pending')
    planirovannoe_vremya = models.DateTimeField(null=True, blank=True, verbose_name='Запланированное время отправки')
    sozdano = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    class Meta:
        verbose_name = 'Уведомление'
        verbose_name_plural = 'Уведомления'
        ordering = ['-sozdano']
    def __str__(self):
        return f"Уведомление для {self.poluchatel}: {self.soobshchenie[:50]}"

class UvedomlenieKlienta(models.Model):
    klient = models.ForeignKey(Klient, on_delete=models.CASCADE, related_name='uvedomleniya')
    soobshchenie = models.TextField(verbose_name='Сообщение')
    ssylka = models.CharField(max_length=255, blank=True, verbose_name='Ссылка')
    prochitano = models.BooleanField(default=False, verbose_name='Прочитано')
    kanal = models.CharField(max_length=20, choices=[('email', 'Email'), ('sms', 'SMS'), ('site', 'Сайт')],
                             default='site')
    status_otpravki = models.CharField(max_length=20,
                                       choices=[('pending', 'Ожидает'), ('sent', 'Отправлено'), ('failed', 'Ошибка')],
                                       default='pending')
    planirovannoe_vremya = models.DateTimeField(null=True, blank=True, verbose_name='Запланированное время отправки')
    sozdano = models.DateTimeField(auto_now_add=True, verbose_name='Создано')
    class Meta:
        verbose_name = 'Уведомление клиента'
        verbose_name_plural = 'Уведомления клиентов'
        ordering = ['-sozdano']
# ----------------------------------------------------------------------
# Микрорайон (добавлено)
# ----------------------------------------------------------------------
# models.py
class Mikroraion(models.Model):
    nazvanie = models.CharField(max_length=100, verbose_name='Название')
    raion = models.ForeignKey(
        'Raion',
        on_delete=models.CASCADE,
        related_name='mikroraiony',
        verbose_name='Район',
        null=True,          # <-- добавить
        blank=True          # <-- добавить
    )
    class Meta:
        unique_together = ('nazvanie', 'raion')  # Обратите внимание: теперь raion может быть null,
                                                 # но уникальность будет работать (в PostgreSQL NULL считается уникальным)
        verbose_name = 'Микрорайон'
        verbose_name_plural = 'Микрорайоны'
        ordering = ['nazvanie']
    def __str__(self):
        if self.raion:
            return f"{self.nazvanie} ({self.raion.nazvanie})"
        return self.nazvanie
