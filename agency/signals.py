# signals.py (переименована)
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import Group
from django.utils import timezone
from .models import Zayavka, Vstrecha, Uvedomlenie, Klient, User
from .utils import sozdat_uvedomlenie  # определим ниже

def _uvedomit_vsekh_rieltorov(tip, soobshchenie, ssylka=''):
    from django.contrib.auth.models import Group
    groups = Group.objects.filter(name__in=['Риэлтор', 'Главный риэлтор'])
    users = User.objects.filter(groups__in=groups).distinct()
    for user in users:
        Uvedomlenie.objects.create(
            poluchatel=user,
            tip=tip,
            soobshchenie=soobshchenie,
            ssylka=ssylka
        )

@receiver(post_save, sender=Zayavka)
def sozdat_uvedomlenie_o_zayavke(sender, instance, created, **kwargs):
    """
    При создании заявки (публичной или риэлтором) – уведомление главному риэлтору.
    При изменении статуса на важные: 'meeting_scheduled', 'contract_signed', 'rejected' – уведомление главному.
    """
    if instance.eto_spam:
        return  # не уведомляем о спаме

    if created:
        # Новая заявка
        message = f'Новая заявка #{instance.id} от {instance.klient}'
        notif_type = 'new_request'
        _uvedomit_vsekh_rieltorov('new_request', message, f'/api/v1/requests/{instance.id}/')
    else:
        # Обновление статуса
        if instance.tracker.has_changed('status'):
            old_status = instance.tracker.previous('status')
            new_status = instance.status
            important_statuses = ['meeting_scheduled', 'contract_signed', 'rejected', 'no_answer', 'callback']
            if new_status in important_statuses:
                message = f'Статус заявки #{instance.id} изменён с {old_status} на {new_status}'
                _uvedomit_vsekh_rieltorov('status_change', message, f'/api/v1/requests/{instance.id}/')

@receiver(post_save, sender=Vstrecha)
def sozdat_uvedomlenie_o_vstreche(sender, instance, created, **kwargs):
    """
    При создании встречи – уведомление главному риэлтору и ответственному риэлтору (если он есть).
    При изменении статуса (подтверждение/отказ/перенос) – уведомление ответственному риэлтору и главному.
    """
    # Определяем получателей: главные риэлторы и, возможно, ответственный за заявку
    head_realtors = _poluchit_glavnykh_rieltorov()
    responsible = instance.zayavka.naznachen if instance.zayavka.naznachen else None

    recipients = set(head_realtors)
    if responsible:
        recipients.add(responsible)

    if created:
        message = f'Назначена новая встреча #{instance.id} по заявке #{instance.zayavka.id}'
        notif_type = 'meeting_created'
        target_url = f'/admin/agency/vstrecha/{instance.id}/change/'
        for user in recipients:
            Uvedomlenie.objects.create(
                poluchatel=user,
                tip=notif_type,
                soobshchenie=message,
                ssylka=target_url
            )
    else:
        # Проверяем изменения важных полей: статус, подтверждение клиента
        changes = []
        if instance.tracker.has_changed('status'):
            changes.append(f'статус изменён на {instance.status}')
        if instance.tracker.has_changed('klient_podtverdil') and instance.klient_podtverdil:
            changes.append('клиент подтвердил')
        if instance.tracker.has_changed('klient_otkazal') and instance.klient_otkazal:
            changes.append('клиент отказался')
        if instance.tracker.has_changed('zapros_perenosa') and instance.zapros_perenosa:
            changes.append('запрос на перенос')

        if changes:
            message = f'Встреча #{instance.id}: ' + ', '.join(changes)
            for user in recipients:
                Uvedomlenie.objects.create(
                    poluchatel=user,
                    tip='meeting_updated',
                    soobshchenie=message,
                    ssylka=f'/admin/agency/vstrecha/{instance.id}/change/'
                )

# Вспомогательные функции
def _poluchit_glavnykh_rieltorov():
    try:
        group = Group.objects.get(name='Главный риэлтор')
        return group.user_set.all()
    except Group.DoesNotExist:
        return User.objects.none()

def _uvedomit_glavnykh_rieltorov(tip, soobshchenie, ssylka=''):
    for user in _poluchit_glavnykh_rieltorov():
        Uvedomlenie.objects.create(
            poluchatel=user,
            tip=tip,
            soobshchenie=soobshchenie,
            ssylka=ssylka
        )