from django.core.management.base import BaseCommand
from django.utils import timezone
from agency.models import Uvedomlenie, UvedomlenieKlienta
from agency.utils import send_email_notification

class Command(BaseCommand):
    help = 'Send pending email notifications'

    def handle(self, *args, **options):
        now = timezone.now()
        # Для риэлторов
        for notif in Uvedomlenie.objects.filter(
            status_otpravki='pending',
            planirovannoe_vremya__lte=now,
            kanal='email'
        ).select_related('poluchatel'):
            if notif.poluchatel.email:
                success = send_email_notification(
                    notif.poluchatel.email,
                    "Уведомление от агентства",  # фиксированная тема
                    notif.soobshchenie,
                    f'<p>{notif.soobshchenie}</p><p><a href="{notif.ssylka}">Перейти</a></p>'
                )
                notif.status_otpravki = 'sent' if success else 'failed'
                notif.save()
        # Для клиентов
        for notif in UvedomlenieKlienta.objects.filter(
            status_otpravki='pending',
            planirovannoe_vremya__lte=now,
            kanal='email'
        ).select_related('klient'):
            if notif.klient.email:
                success = send_email_notification(
                    notif.klient.email,
                    "Уведомление от агентства",
                    notif.soobshchenie,
                    f'<p>{notif.soobshchenie}</p><p><a href="{notif.ssylka}">Перейти</a></p>'
                )
                notif.status_otpravki = 'sent' if success else 'failed'
                notif.save()
        self.stdout.write(self.style.SUCCESS('Notifications processed'))