# serializers.py (полностью переименован на русские термины в транслите)
from django.contrib.auth.models import Group
from rest_framework import serializers
from .models import *
from django.contrib.gis.geos import Point
from .utils import *

# ----------------------------------------------------------------------
# Базовый сериализатор для справочников
# ----------------------------------------------------------------------
class SpravochnikSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['id', 'gorod_tekst', 'ulitsa', 'koordinaty', 'sozdano', 'obnovleno', 'obrazy', 'region', 'gorod', 'raion', 'metro_stantsii', 'predlozheniya_arendy', 'predlozheniya_prodazhi', 'photos']


# ----------------------------------------------------------------------
# Сериализаторы для справочников (наследуют SpravochnikSerializer)
# ----------------------------------------------------------------------
class TipSanuzlaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipSanuzla
        fields = ['id', 'nazvanie']

class BalkonLogdiaTipSerializer(serializers.ModelSerializer):
    class Meta:
        model = BalkonLogdiaTip
        fields = ['id', 'nazvanie']

class TipKommunikatsiiSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipKommunikatsii
        fields = ['id', 'nazvanie']

class TipVodosnabzheniyaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipVodosnabzheniya
        fields = ['id', 'nazvanie']

class TipKanalizatsiiSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipKanalizatsii
        fields = ['id', 'nazvanie']

class MestopolozhenieSanuzlaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MestopolozhenieSanuzla
        fields = ['id', 'nazvanie']

class TekhnikaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tekhnika
        fields = ['id', 'vybor']  # поле называется vybor

class MebelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mebel
        fields = ['id', 'vybor']


# ----------------------------------------------------------------------
# Сериализатор для изображений
# ----------------------------------------------------------------------
class FotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Foto
        fields = ['id', 'izobrazhenie', 'sozdano']
        read_only_fields = ['id', 'sozdano']


# ----------------------------------------------------------------------
# Сериализаторы для Region, Gorod, Raion, MetroStantsiya
# ----------------------------------------------------------------------
class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ('id', 'nazvanie', 'poryadok', 'kladr_id')


class GorodSerializer(serializers.ModelSerializer):
    region = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Gorod
        fields = ('id', 'nazvanie', 'region', 'est_metro')


class RaionSerializer(serializers.ModelSerializer):
    gorod = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Raion
        fields = ('id', 'nazvanie', 'gorod')


class MetroStantsiyaSerializer(serializers.ModelSerializer):
    gorod = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = MetroStantsiya
        fields = ('id', 'nazvanie', 'gorod', 'koordinaty')


# ----------------------------------------------------------------------
# Базовый сериализатор для объектов недвижимости
# ----------------------------------------------------------------------
class NedvizhimostSerializer(serializers.ModelSerializer):
    obrazy = FotoSerializer(many=True, read_only=True)
    predlozheniya_arendy = serializers.SerializerMethodField(read_only=True)
    predlozheniya_prodazhi = serializers.SerializerMethodField(read_only=True)
    photos = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )
    region = serializers.PrimaryKeyRelatedField(queryset=Region.objects.all(), required=False, allow_null=True)
    gorod = serializers.PrimaryKeyRelatedField(queryset=Gorod.objects.all(), required=False, allow_null=True)
    raion = serializers.PrimaryKeyRelatedField(queryset=Raion.objects.all(), required=False, allow_null=True)
    metro_stantsii = serializers.PrimaryKeyRelatedField(many=True, queryset=MetroStantsiya.objects.all(), required=False)

    class Meta:
        fields = ['id', 'gorod_tekst', 'ulitsa', 'koordinaty', 'sozdano', 'obnovleno', 'obrazy', 'region', 'gorod', 'raion', 'metro_stantsii', 'predlozheniya_arendy', 'predlozheniya_prodazhi', 'photos', 'opublikovano']
        read_only_fields = ['sozdano', 'obnovleno', 'udaleno', 'data_udaleniya', 'udalil']

    def get_predlozheniya_prodazhi(self, obj):
        if hasattr(obj, 'prodazhi'):
            qs = obj.prodazhi.filter(udaleno=False)
            return ProdazhaSerializer(qs, many=True).data
        return []

    def get_predlozheniya_arendy(self, obj):
        if hasattr(obj, 'arendy'):
            qs = obj.arendy.filter(udaleno=False)
            return ArendaSerializer(qs, many=True).data
        return []

    def get_address_parts(self, validated_data, instance=None):
        """
        Возвращает список частей адреса для геокодирования.
        Должен быть переопределен в наследниках, если структура адреса отличается.
        По умолчанию собирает из полей gorod_tekst, ulitsa, nomer_doma, korpus, stroenie.
        """
        parts = []
        if instance:
            parts.append(validated_data.get('gorod_tekst', instance.gorod_tekst))
            parts.append(validated_data.get('ulitsa', instance.ulitsa))
            parts.append(validated_data.get('nomer_doma', getattr(instance, 'nomer_doma', '')))
            parts.append(validated_data.get('korpus', getattr(instance, 'korpus', '')))
            parts.append(validated_data.get('stroenie', getattr(instance, 'stroenie', '')))
        else:
            parts.append(validated_data.get('gorod_tekst', ''))
            parts.append(validated_data.get('ulitsa', ''))
            parts.append(validated_data.get('nomer_doma', ''))
            parts.append(validated_data.get('korpus', ''))
            parts.append(validated_data.get('stroenie', ''))
        return [p for p in parts if p]

    def preprocess_m2m_fields(self, validated_data):
        """
        Извлекает из validated_data специфические many-to-many поля,
        которые будут обработаны вручную после сохранения.
        Возвращает словарь с этими полями.
        По умолчанию возвращает пустой словарь.
        """
        return {}

    def postprocess_m2m_fields(self, instance, m2m_data):
        """
        Устанавливает many-to-many связи после создания/обновления объекта.
        m2m_data - словарь, возвращенный preprocess_m2m_fields.
        """
        pass

    def update_location(self, validated_data, instance=None):
        """
        Обновляет поле koordinaty на основе геокодирования, если адрес изменился.
        """
        address_changed = False
        if instance:
            address_fields = ['gorod_tekst', 'ulitsa', 'nomer_doma', 'korpus', 'stroenie']
            for field in address_fields:
                if field in validated_data and validated_data[field] != getattr(instance, field, ''):
                    address_changed = True
                    break
        else:
            address_changed = True

        if address_changed:
            address_parts = self.get_address_parts(validated_data, instance)
            if address_parts:
                address = ', '.join(address_parts)
                coords = geocode_address(address)
                if coords:
                    validated_data['koordinaty'] = Point(coords['lon'], coords['lat'], srid=4326)
                else:
                    validated_data.pop('koordinaty', None)
            else:
                validated_data.pop('koordinaty', None)

    def create(self, validated_data):
        photos = validated_data.pop('photos', [])
        m2m_data = self.preprocess_m2m_fields(validated_data)
        self.update_location(validated_data)
        instance = super().create(validated_data)
        self.postprocess_m2m_fields(instance, m2m_data)
        for photo in photos:
            Foto.objects.create(obekt=instance, izobrazhenie=photo)
        return instance

    def update(self, instance, validated_data):
        photos = validated_data.pop('photos', [])
        m2m_data = self.preprocess_m2m_fields(validated_data)
        self.update_location(validated_data, instance)
        instance = super().update(instance, validated_data)
        self.postprocess_m2m_fields(instance, m2m_data)
        for photo in photos:
            Foto.objects.create(obekt=instance, izobrazhenie=photo)
        return instance


# ----------------------------------------------------------------------
# Конкретные сериализаторы для объектов недвижимости
# ----------------------------------------------------------------------
class ZemelnyiUchastokSerializer(NedvizhimostSerializer):
    # Поля для фронтенда
    city = serializers.CharField(source='gorod_tekst', read_only=True)
    sozdal_imya = serializers.StringRelatedField(source='sozdal', read_only=True)
    street = serializers.CharField(source='ulitsa', read_only=True)
    house_number = serializers.CharField(source='nomer_uchastka', read_only=True)
    land_area = serializers.IntegerField(source='ploshad_uchastka', read_only=True)
    cadastral_number = serializers.CharField(source='kadastr_nomer', read_only=True)
    land_type = serializers.CharField(source='tip_uchastka', read_only=True)
    is_water = serializers.BooleanField(source='voda', read_only=True)
    is_gas = serializers.BooleanField(source='gaz', read_only=True)
    is_severage = serializers.BooleanField(source='kanalizatsiya', read_only=True)
    images = FotoSerializer(source='obrazy', many=True, read_only=True)
    opisanie = serializers.CharField(required=False, allow_blank=True)

    class Meta(NedvizhimostSerializer.Meta):
        model = ZemelnyiUchastok
        fields = [
            # Стандартные поля
            'id', 'gorod_tekst', 'ulitsa', 'koordinaty', 'sozdano', 'obnovleno',
            'obrazy', 'region', 'gorod', 'raion', 'metro_stantsii',
            'predlozheniya_arendy', 'predlozheniya_prodazhi', 'photos',
            # Поля участка
            'nomer_uchastka', 'kadastr_nomer', 'ploshad_uchastka', 'voda',
            'kanalizatsiya', 'gaz', 'tip_uchastka',
            # Добавленные поля для фронтенда
            'city', 'street', 'house_number', 'land_area', 'cadastral_number',
            'land_type', 'is_water', 'is_gas', 'is_severage', 'images', 'opisanie', 'sozdal_imya',
        ]


class MnogoetazhkaSerializer(NedvizhimostSerializer):
    class Meta(NedvizhimostSerializer.Meta):
        model = Mnogoetazhka

        fields = NedvizhimostSerializer.Meta.fields + [
            "god_postroiki",
            "tip_doma",
            "etazhnost",
            "lift",
            "nomer_doma",
            "korpus",
            "stroenie",
            ]


class ChastnyiDomSerializer(NedvizhimostSerializer):
    # ManyToMany поля, специфичные для дома
    mestopolozhenie_sanuzla = serializers.PrimaryKeyRelatedField(many=True, queryset=MestopolozhenieSanuzla.objects.all())
    kommunikatsii = serializers.PrimaryKeyRelatedField(many=True, queryset=TipKommunikatsii.objects.all())
    tip_vody = serializers.PrimaryKeyRelatedField(many=True, queryset=TipVodosnabzheniya.objects.all())
    tip_kanalizatsii = serializers.PrimaryKeyRelatedField(many=True, queryset=TipKanalizatsii.objects.all())
    komnaty = serializers.SerializerMethodField(read_only=True)
    sozdal_imya = serializers.StringRelatedField(source='sozdal', read_only=True)
    # Поля для фронтенда (адрес и характеристики)
    city = serializers.CharField(source='gorod_tekst', read_only=True)
    street = serializers.CharField(source='ulitsa', read_only=True)
    house_number = serializers.CharField(source='nomer_doma', read_only=True)
    quantity_rooms = serializers.IntegerField(source='kolichestvo_komnat', read_only=True)
    home_area = serializers.IntegerField(source='zhilaya_ploshad', read_only=True)
    land_area = serializers.IntegerField(source='ploshad_uchastka', read_only=True)
    floor_in_house = serializers.IntegerField(source='etazhnost', read_only=True)
    year_construction = serializers.IntegerField(source='god_postroiki', read_only=True)
    images = FotoSerializer(source='obrazy', many=True, read_only=True)
    opisanie = serializers.CharField(required=False, allow_blank=True)

    class Meta(NedvizhimostSerializer.Meta):
        model = ChastnyiDom
        fields = [
            # Стандартные поля от NedvizhimostSerializer (через наследование)
            'id', 'gorod_tekst', 'ulitsa', 'koordinaty', 'sozdano', 'obnovleno',
            'obrazy', 'region', 'gorod', 'raion', 'metro_stantsii',
            'predlozheniya_arendy', 'predlozheniya_prodazhi', 'photos',
            # Поля дома
            'mestopolozhenie_sanuzla', 'kommunikatsii', 'tip_vody', 'tip_kanalizatsii',
            'komnaty',
            # Добавленные поля для фронтенда
            'city', 'street', 'house_number', 'quantity_rooms', 'home_area',
            'land_area', 'floor_in_house', 'year_construction', 'images', 'opisanie',
            'sozdal_imya',
        ]

    def get_komnaty(self, obj):
        if hasattr(obj, 'komnaty'):
            qs = obj.komnaty.filter(udaleno=False)
            return KomnataSerializer(qs, many=True).data
        return []

    def preprocess_m2m_fields(self, validated_data):
        m2m_fields = {}
        for field in ['mestopolozhenie_sanuzla', 'kommunikatsii', 'tip_vody', 'tip_kanalizatsii']:
            if field in validated_data:
                m2m_fields[field] = validated_data.pop(field)
        return m2m_fields

    def postprocess_m2m_fields(self, instance, m2m_data):
        for field, value in m2m_data.items():
            getattr(instance, field).set(value)


class KvartiraSerializer(NedvizhimostSerializer):
    # ManyToMany поля, специфичные для квартиры
    mnogoetazhka_detail = MnogoetazhkaSerializer(source='mnogoetazhka', read_only=True)
    tip_sanuzla = serializers.PrimaryKeyRelatedField(many=True, required=False, queryset=TipSanuzla.objects.all())
    balkon_ili_loggia = serializers.PrimaryKeyRelatedField(many=True, required=False, queryset=BalkonLogdiaTip.objects.all())
    tekhnika = serializers.PrimaryKeyRelatedField(many=True, queryset=Tekhnika.objects.all(), required=False,
                                                  allow_empty=True)
    mebel = serializers.PrimaryKeyRelatedField(many=True, queryset=Mebel.objects.all(), required=False,
                                               allow_empty=True)
    komnaty = serializers.SerializerMethodField(read_only=True)
    sozdal_imya = serializers.StringRelatedField(source='sozdal', read_only=True)
    # Поля для фронтенда
    city = serializers.CharField(source='mnogoetazhka.gorod_tekst', read_only=True)
    street = serializers.CharField(source='mnogoetazhka.ulitsa', read_only=True)
    house_number = serializers.CharField(source='mnogoetazhka.nomer_doma', read_only=True)
    apartment_number = serializers.CharField(source='nomer_kvartiry', read_only=True)
    quantity_rooms = serializers.IntegerField(source='kolichestvo_komnat', read_only=True)
    home_area = serializers.IntegerField(source='zhilaya_ploshad', read_only=True)
    floor = serializers.IntegerField(source='etazh', read_only=True)
    rooms_type = serializers.CharField(source='tip_komnat', read_only=True)
    renovation = serializers.CharField(source='remont', read_only=True)
    bathroom_quantity = serializers.IntegerField(source='kolichestvo_sanuzlov', read_only=True)
    images = FotoSerializer(source='obrazy', many=True, read_only=True)
    opisanie = serializers.CharField(required=False, allow_blank=True)
    mikroraion = serializers.PrimaryKeyRelatedField(queryset=Mikroraion.objects.all(), required=False, allow_null=True)
    tip_sanuzla_display = serializers.SerializerMethodField()
    balkon_ili_loggia_display = serializers.SerializerMethodField()
    tekhnika_display = serializers.SerializerMethodField()
    mebel_display = serializers.SerializerMethodField()
    totalFloors = serializers.IntegerField(source='mnogoetazhka.etazhnost', read_only=True)
    elevator = serializers.BooleanField(source='mnogoetazhka.lift', read_only=True)
    houseType = serializers.CharField(source='mnogoetazhka.tip_doma', read_only=True)
    year_construction = serializers.IntegerField(source='mnogoetazhka.god_postroiki', read_only=True)



    class Meta(NedvizhimostSerializer.Meta):
        model = Kvartira
        fields = [
            'id', 'mnogoetazhka', 'nomer_kvartiry', 'koordinaty',
            'kolichestvo_komnat', 'zhilaya_ploshad', 'etazh',
            'kolichestvo_sanuzlov', 'tip_komnat', 'remont',
            'sozdano', 'obnovleno', 'tip_sanuzla', 'balkon_ili_loggia',
            'tekhnika', 'mebel', 'obrazy', 'predlozheniya_arendy',
            'predlozheniya_prodazhi', 'komnaty', 'region', 'gorod',
            'raion', 'mikroraion', 'metro_stantsii', 'photos',
            # Добавленные поля:
            'city', 'street', 'house_number', 'apartment_number',
            'quantity_rooms', 'home_area', 'floor', 'rooms_type', 'totalFloors', 'elevator', 'houseType',
            'renovation', 'bathroom_quantity', 'images', 'opisanie', 'mnogoetazhka_detail', 'year_construction',
            'tip_sanuzla_display', 'balkon_ili_loggia_display', 'tekhnika_display', 'mebel_display', 'sozdal_imya',
        ]

    def create(self, validated_data):
        mnogoetazhka = validated_data.get('mnogoetazhka')
        if mnogoetazhka:
            validated_data['region'] = mnogoetazhka.region
            validated_data['gorod'] = mnogoetazhka.gorod
        return super().create(validated_data)

    def update(self, instance, validated_data):
            mnogoetazhka = validated_data.get("mnogoetazhka", instance.mnogoetazhka)
            if mnogoetazhka:
                    validated_data["region"] = mnogoetazhka.region
            validated_data["gorod"] = mnogoetazhka.gorod
            return super().update(instance, validated_data)

    def get_tip_sanuzla_display(self, obj):
        return [item.nazvanie for item in obj.tip_sanuzla.all()]

    def get_balkon_ili_loggia_display(self, obj):
        return [item.nazvanie for item in obj.balkon_ili_loggia.all()]

    def get_tekhnika_display(self, obj):
        return [item.vybor for item in obj.tekhnika.all()]

    def get_mebel_display(self, obj):
        return [item.vybor for item in obj.mebel.all()]

    def get_komnaty(self, obj):
        if hasattr(obj, 'komnaty'):
            qs = obj.komnaty.filter(udaleno=False)
            return KomnataSerializer(qs, many=True).data
        return []

    def get_address_parts(self, validated_data, instance=None):
        """
        Для квартиры адрес строится из связанного дома.
        """
        if instance is None:
            mnogoetazhka = validated_data.get('mnogoetazhka')
            if not mnogoetazhka:
                return []
            parts = [
                mnogoetazhka.gorod_tekst,
                mnogoetazhka.ulitsa,
                mnogoetazhka.nomer_doma,
                mnogoetazhka.korpus,
                mnogoetazhka.stroenie,
                f"кв.{validated_data.get('nomer_kvartiry', '')}"
            ]
        else:
            mnogoetazhka = validated_data.get('mnogoetazhka', instance.mnogoetazhka)
            parts = [
                mnogoetazhka.gorod_tekst,
                mnogoetazhka.ulitsa,
                mnogoetazhka.nomer_doma,
                mnogoetazhka.korpus,
                mnogoetazhka.stroenie,
                f"кв.{validated_data.get('nomer_kvartiry', instance.nomer_kvartiry)}"
            ]
        return [p for p in parts if p]

    def update_location(self, validated_data, instance=None):
        """
        Для квартиры координаты берутся из дома или геокодируются.
        """
        if instance and 'mnogoetazhka' not in validated_data and instance.mnogoetazhka:
            if instance.mnogoetazhka.koordinaty:
                validated_data['koordinaty'] = instance.mnogoetazhka.koordinaty
                return
        elif 'mnogoetazhka' in validated_data:
            mnogoetazhka = validated_data['mnogoetazhka']
            if mnogoetazhka and mnogoetazhka.koordinaty:
                validated_data['koordinaty'] = mnogoetazhka.koordinaty
                return
        super().update_location(validated_data, instance)

    def preprocess_m2m_fields(self, validated_data):
        m2m_fields = {}
        for field in ['tip_sanuzla', 'balkon_ili_loggia', 'tekhnika', 'mebel']:
            if field in validated_data:
                m2m_fields[field] = validated_data.pop(field)
        return m2m_fields

    def postprocess_m2m_fields(self, instance, m2m_data):
        for field, value in m2m_data.items():
            getattr(instance, field).set(value)


class RegionSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegionSettings
        fields = ['allowed_region_codes', 'updated_at']

# ----------------------------------------------------------------------
# Сериализаторы для предложений аренды и продажи
# ----------------------------------------------------------------------
class ArendaSerializer(serializers.ModelSerializer):
    obekt = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Arenda
        fields = ['id', 'tsena', 'tip_obekta', 'id_obekta', 'obekt', 'sozdano', 'obnovleno', 'kurenie', 'deti',
                  'zhivotnye', 'spalnyh_mest']
        read_only_fields = ['sozdano', 'obnovleno']


class ProdazhaSerializer(serializers.ModelSerializer):
    obekt = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Prodazha
        fields = ['id', 'tsena', 'tip_obekta', 'id_obekta', 'obekt', 'sozdano', 'obnovleno']
        read_only_fields = ['sozdano', 'obnovleno']


# ----------------------------------------------------------------------
# Сериализатор для комнат
# ----------------------------------------------------------------------
class KomnataSerializer(serializers.ModelSerializer):
    sozdal_imya = serializers.StringRelatedField(source='sozdal', read_only=True)
    parent_detail = serializers.SerializerMethodField()  # для отображения
    # Поля для записи родителя (write-only)
    tip_obekta = serializers.SlugRelatedField(
        slug_field='model',
        queryset=ContentType.objects.filter(model__in=['kvartira', 'chastnyidom']),
        write_only=True,
        required=False,
        allow_null=True
    )
    id_obekta = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Komnata
        fields = [
            'id', 'ploshad_komnaty', 'etazh', 'opisanie', 'opublikovano',
            'sozdano', 'obnovleno', 'sozdal', 'sozdal_imya',
            'parent_detail', 'tip_obekta', 'id_obekta'
        ]
        read_only_fields = ['sozdano', 'obnovleno']

    def get_parent_detail(self, obj):
        if not obj.obekt:
            return None
        if isinstance(obj.obekt, Kvartira):
            return {
                'type': 'flat',
                'id': obj.obekt.id,
                'address': f"{obj.obekt.mnogoetazhka.gorod_tekst}, {obj.obekt.mnogoetazhka.ulitsa} {obj.obekt.mnogoetazhka.nomer_doma}, кв.{obj.obekt.nomer_kvartiry}",
                'total_floors': obj.obekt.mnogoetazhka.etazhnost,
                'house_type': obj.obekt.mnogoetazhka.tip_doma,
            }
        elif isinstance(obj.obekt, ChastnyiDom):
            return {
                'type': 'house',
                'id': obj.obekt.id,
                'address': f"{obj.obekt.gorod_tekst}, {obj.obekt.ulitsa} {obj.obekt.nomer_doma}",
                'total_floors': obj.obekt.etazhnost,
                'house_type': obj.obekt.tip_doma,
            }
        return None

    def create(self, validated_data):
        kvartira_id = validated_data.pop('kvartira_id', None)
        dom_id = validated_data.pop('dom_id', None)
        if kvartira_id and dom_id:
            raise serializers.ValidationError("Нельзя указать одновременно квартиру и дом")
        if kvartira_id:
            try:
                kvartira = Kvartira.objects.get(id=kvartira_id)
                validated_data['tip_obekta'] = ContentType.objects.get_for_model(Kvartira)
                validated_data['id_obekta'] = kvartira.id
            except Kvartira.DoesNotExist:
                raise serializers.ValidationError({"kvartira_id": "Квартира не найдена"})
        elif dom_id:
            try:
                dom = ChastnyiDom.objects.get(id=dom_id)
                validated_data['tip_obekta'] = ContentType.objects.get_for_model(ChastnyiDom)
                validated_data['id_obekta'] = dom.id
            except ChastnyiDom.DoesNotExist:
                raise serializers.ValidationError({"dom_id": "Дом не найден"})
        # иначе остаётся без привязки
        return super().create(validated_data)

    def update(self, instance, validated_data):
        kvartira_id = validated_data.pop('kvartira_id', None)
        dom_id = validated_data.pop('dom_id', None)
        if kvartira_id and dom_id:
            raise serializers.ValidationError("Нельзя указать одновременно квартиру и дом")
        if kvartira_id is not None:
            try:
                kvartira = Kvartira.objects.get(id=kvartira_id)
                instance.tip_obekta = ContentType.objects.get_for_model(Kvartira)
                instance.id_obekta = kvartira.id
            except Kvartira.DoesNotExist:
                raise serializers.ValidationError({"kvartira_id": "Квартира не найдена"})
        elif dom_id is not None:
            try:
                dom = ChastnyiDom.objects.get(id=dom_id)
                instance.tip_obekta = ContentType.objects.get_for_model(ChastnyiDom)
                instance.id_obekta = dom.id
            except ChastnyiDom.DoesNotExist:
                raise serializers.ValidationError({"dom_id": "Дом не найден"})
        else:
            # если оба параметра отсутствуют или None, отвязываем
            instance.tip_obekta = None
            instance.id_obekta = None
        return super().update(instance, validated_data)


# ----------------------------------------------------------------------
# Сериализаторы для клиентов, заявок, встреч, уведомлений
# ----------------------------------------------------------------------
class KlientSerializer(serializers.ModelSerializer):
    familiya = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Klient
        fields = ['id', 'imya', 'familiya', 'otchestvo', 'telefon', 'email', 'kommentariy', 'uvedomleniya_vklyucheny',
                  'otvetstvennyi', 'sozdano', 'obnovleno']
        read_only_fields = ['sozdano', 'obnovleno', 'udaleno', 'data_udaleniya', 'udalil']


class SobytieZayavkiSerializer(serializers.ModelSerializer):
    sozdal_imya = serializers.StringRelatedField(source='sozdal', read_only=True)

    class Meta:
        model = SobytieZayavki
        fields = ['id', 'zayavka', 'tip_sobytiya', 'sozdano', 'sozdal', 'sozdal_imya', 'opisanie', 'vremya_vstrechi', 'mesto_vstrechi', 'napominanie_otpravleno']
        read_only_fields = ['sozdano']


class VstrechaSerializer(serializers.ModelSerializer):
    sozdal_imya = serializers.SerializerMethodField()
    ssylka_podtverzhdeniya = serializers.SerializerMethodField()
    zayavka_detail = serializers.SerializerMethodField()

    class Meta:
        model = Vstrecha
        fields = [
            'id', 'zayavka', 'data_vremya', 'dlitelnost', 'mesto', 'status',
            'kommentariy', 'sozdal', 'sozdano', 'obnovleno', 'napominanie_za_chasov',
            'klient_podtverdil', 'klient_otkazal', 'zapros_perenosa',
            'napominanie_otpravleno', 'ssylka_podtverzhdeniya', 'sozdal_imya',
            'zayavka_detail'
        ]
        read_only_fields = ['sozdano', 'obnovleno', 'udaleno', 'data_udaleniya', 'udalil']

    def get_sozdal_imya(self, obj):
        if obj.sozdal:
            return f"{obj.sozdal.last_name} {obj.sozdal.first_name}".strip()
        return None

    def get_ssylka_podtverzhdeniya(self, obj):
        request = self.context.get('request')
        if request is None:
            return None
        token_obj = obj.tokeny_podtverzhdeniya.filter(istekaet__gt=timezone.now()).first()
        if token_obj:
            return request.build_absolute_uri(f"/api/v1/meeting/confirm/{token_obj.token}/")
        return None

    def get_zayavka_detail(self, obj):
        zayavka = obj.zayavka
        if not zayavka:
            return None
        # Базовые данные заявки
        data = {
            'id': zayavka.id,
            'purpose': zayavka.purpose,
            'property_type': zayavka.property_type,
            'status': zayavka.status,
            'sozdano': zayavka.sozdano,
            'obnovleno': zayavka.obnovleno,
            'klient_detail': None,
        }
        if zayavka.klient:
            data['klient_detail'] = {
                'id': zayavka.klient.id,
                'imya': zayavka.klient.imya,
                'familiya': zayavka.klient.familiya,
                'otchestvo': zayavka.klient.otchestvo,
                'telefon': zayavka.klient.telefon,
                'email': zayavka.klient.email,
            }
        return data

class UvedomlenieKlientaSerializer(serializers.ModelSerializer):
    class Meta:
        model = UvedomlenieKlienta
        fields = [
            'id', 'klient', 'soobshchenie', 'ssylka', 'prochitano', 'sozdano',
            'kanal', 'status_otpravki', 'planirovannoe_vremya'
        ]
        read_only_fields = ['sozdano', 'status_otpravki', 'planirovannoe_vremya']


class ZayavkaSerializer(serializers.ModelSerializer):
    # Поля для создания клиента (write-only)
    imya = serializers.CharField(write_only=True, required=False)
    familiya = serializers.CharField(write_only=True, required=False, allow_blank=True)
    telefon = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    uvedomleniya_vklyucheny = serializers.BooleanField(write_only=True, required=False, default=False)
    klient = serializers.PrimaryKeyRelatedField(
        queryset=Klient.objects.all(),
        required=False,
        allow_null=True
    )
    # Поля для чтения
    klient_detail = KlientSerializer(source='klient', read_only=True)
    nedvizhimost = serializers.StringRelatedField(read_only=True)
    sobytiya = SobytieZayavkiSerializer(many=True, read_only=True)
    vstrechi = VstrechaSerializer(many=True, read_only=True)
    naznachen_imya = serializers.SerializerMethodField()

    tip_nedvizhimosti = serializers.PrimaryKeyRelatedField(
        queryset=ContentType.objects.all(),
        allow_null=True,
        required=False
    )
    id_nedvizhimosti = serializers.IntegerField(allow_null=True, required=False)

    ip_adres = serializers.CharField(read_only=True)
    purpose = serializers.ChoiceField(choices=Zayavka.PURPOSE_CHOICES, required=False)
    property_type = serializers.ChoiceField(choices=Zayavka.PROPERTY_TYPE_CHOICES, required=False)
    extended_data = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = Zayavka
        fields = [
            'id', 'klient', 'ip_adres', 'eto_spam', 'tip_nedvizhimosti', 'id_nedvizhimosti',
            'nedvizhimost', 'status', 'sozdano', 'obnovleno', 'naznachen', 'byudzhet_ot',
            'byudzhet_do', 'kommentariy_klienta', 'klient_detail', 'sobytiya', 'vstrechi',
            'naznachen_imya', 'imya', 'familiya', 'telefon', 'email', 'uvedomleniya_vklyucheny', 'purpose', 'property_type', 'extended_data', 'taken_at'
        ]
        read_only_fields = [
            'sozdano', 'obnovleno', 'udaleno', 'data_udaleniya', 'udalil',
            'ip_adres', 'eto_spam', 'taken_at'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'klient' in self.fields:
            self.fields['klient'].required = False
            self.fields['klient'].allow_null = True

    def validate(self, data):
        tip_nedvizhimosti = data.get('tip_nedvizhimosti')
        id_nedvizhimosti = data.get('id_nedvizhimosti')
        if (tip_nedvizhimosti is None) != (id_nedvizhimosti is None):
            raise serializers.ValidationError(
                "Оба поля tip_nedvizhimosti и id_nedvizhimosti должны быть либо заданы, либо пусты"
            )
        if tip_nedvizhimosti and id_nedvizhimosti:
            model_class = tip_nedvizhimosti.model_class()
            if not model_class.objects.filter(id=id_nedvizhimosti).exists():
                raise serializers.ValidationError("Объект недвижимости не найден")
        return data

    def create(self, validated_data):
        uvedomleniya_vklyucheny = validated_data.pop('uvedomleniya_vklyucheny', False)
        request = self.context.get('request')
        ip = None
        is_spam = False

        imya = validated_data.pop('imya', None)
        familiya = validated_data.pop('familiya', '')
        telefon = validated_data.pop('telefon', None)
        email = validated_data.pop('email', '')
        klient_id = validated_data.pop('klient', None)

        is_anonymous = request and request.user.is_anonymous
        new_request = None

        if is_anonymous:
            ip = request.META.get('REMOTE_ADDR')
            validated_data['ip_adres'] = ip

            if not telefon:
                telefon = f"no-phone-{ip}"
                is_spam = True

            from django.utils import timezone
            one_hour_ago = timezone.now() - timezone.timedelta(hours=1)
            count = Zayavka.objects.filter(ip_adres=ip, sozdano__gte=one_hour_ago).count()
            if count >= 5:
                is_spam = True

            try:
                klient = Klient.objects.get(telefon=telefon)
                if imya and klient.imya != imya:
                    klient.imya = imya
                if familiya and klient.familiya != familiya:
                    klient.familiya = familiya
                if email and klient.email != email:
                    klient.email = email
                if klient.uvedomleniya_vklyucheny != uvedomleniya_vklyucheny:
                    klient.uvedomleniya_vklyucheny = uvedomleniya_vklyucheny
                klient.save()
            except Klient.DoesNotExist:
                klient = Klient.objects.create(
                    imya=imya or "Аноним",
                    familiya=familiya,
                    telefon=telefon,
                    email=email,
                    uvedomleniya_vklyucheny=uvedomleniya_vklyucheny
                )

            tip_nedvizhimosti = validated_data.get('tip_nedvizhimosti')
            id_nedvizhimosti = validated_data.get('id_nedvizhimosti')
            one_hour_ago = timezone.now() - timezone.timedelta(hours=1)
            existing_qs = Zayavka.objects.filter(
                klient=klient,
                sozdano__gte=one_hour_ago,
                eto_spam=False
            )
            if tip_nedvizhimosti and id_nedvizhimosti:
                existing_qs = existing_qs.filter(
                    tip_nedvizhimosti=tip_nedvizhimosti,
                    id_nedvizhimosti=id_nedvizhimosti
                )
            else:
                existing_qs = existing_qs.filter(
                    tip_nedvizhimosti__isnull=True,
                    id_nedvizhimosti__isnull=True
                )
            existing = existing_qs.order_by('-sozdano').first()

            if existing and not is_spam:
                existing.kommentariy_klienta = validated_data.get('kommentariy_klienta', existing.kommentariy_klienta)
                existing.byudzhet_ot = validated_data.get('byudzhet_ot', existing.byudzhet_ot)
                existing.byudzhet_do = validated_data.get('byudzhet_do', existing.byudzhet_do)
                existing.save()
                return existing
            else:
                validated_data['klient'] = klient
                validated_data['eto_spam'] = is_spam
                new_request = super().create(validated_data)
        else:
            if not klient_id:
                raise serializers.ValidationError(
                    {"klient": "Для авторизованных пользователей необходимо указать клиента"})
            validated_data['klient'] = klient_id
            validated_data['eto_spam'] = False
            new_request = super().create(validated_data)

        # Общая часть после создания заявки
        if new_request and not new_request.eto_spam:
            # Уведомления для заявок с сайта
            if is_anonymous:
                notify_realtors_about_new_request(new_request)
        return new_request

    def get_naznachen_imya(self, obj):
        if obj.naznachen:
            return f"{obj.naznachen.last_name} {obj.naznachen.first_name}".strip()
        return None

class UserSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all(), required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'groups', 'password')
        read_only_fields = ('id',)

    def create(self, validated_data):
        groups = validated_data.pop('groups', [])
        password = validated_data.pop('password', None)
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        if groups:
            user.groups.set(groups)
        return user

    def update(self, instance, validated_data):
        groups = validated_data.pop('groups', None)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if groups is not None:
            instance.groups.set(groups)
        return instance


class UvedomlenieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Uvedomlenie
        fields = [
            'id', 'poluchatel', 'tip', 'soobshchenie', 'ssylka', 'prochitano',
            'sozdano', 'kanal', 'status_otpravki', 'planirovannoe_vremya'
        ]
        read_only_fields = ['sozdano', 'status_otpravki', 'planirovannoe_vremya']


class KorzinaSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    tip_obekta = serializers.CharField()
    predstavlenie = serializers.CharField()
    data_udaleniya = serializers.DateTimeField()
    udalil = serializers.CharField(allow_null=True)
    detali = serializers.SerializerMethodField()

    def get_detali(self, obj):
        return str(obj['detali'])
# ----------------------------------------------------------------------
# Сериализатор для микрорайонов
# ----------------------------------------------------------------------
class MikroraionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mikroraion
        fields = ('id', 'nazvanie', 'raion')
