# forms.py (переименована)
from django import forms
from django.core.validators import validate_image_file_extension
from django.utils.translation import gettext as _
from .models import *


class MultipleFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True

    def __init__(self, attrs=None):
        if attrs is None:
            attrs = {}
        attrs['multiple'] = 'multiple'
        super().__init__(attrs)

    def value_from_datadict(self, data, files, name):
        return files.getlist(name)


class BazovayaFormaNedvizhimostiAdmin(forms.ModelForm):
    """
    Базовый класс для форм объектов недвижимости,
    добавляющий поле загрузки нескольких фото и методы их сохранения.
    """
    photos = forms.FileField(
        widget=MultipleFileInput,
        label=_("Добавить фото"),
        required=False,
    )

    def clean_photos(self):
        for upload in self.files.getlist("photos"):
            validate_image_file_extension(upload)

    def save_photos(self, realty):
        for upload in self.files.getlist("photos"):
            Foto.objects.create(obekt=realty, izobrazhenie=upload)


class ChastnyiDomAdminForm(BazovayaFormaNedvizhimostiAdmin):
    class Meta:
        model = ChastnyiDom
        fields = "__all__"


class KvartiraAdminForm(BazovayaFormaNedvizhimostiAdmin):
    class Meta:
        model = Kvartira
        fields = "__all__"


class ZemelnyiUchastokAdminForm(BazovayaFormaNedvizhimostiAdmin):
    class Meta:
        model = ZemelnyiUchastok
        fields = '__all__'