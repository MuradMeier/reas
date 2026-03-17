from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from agency.models import Zayavka, SobytieZayavki

class Command(BaseCommand):
    help = 'Освобождает заявки, взятые более 12 часов назад, если по ним не было звонка'

    def handle(self, *args, **options):
        expired = Zayavka.objects.filter(
            status='taken',
            taken_at__lte=timezone.now() - timedelta(hours=12)
        )
        count = 0
        for z in expired:
            # Возвращаем статус на 'viewed' (можно выбрать другой)
            previous_status = 'viewed'
            z.status = previous_status
            z.naznachen = None
            z.taken_at = None
            z.save(update_fields=['status', 'naznachen', 'taken_at'])
            SobytieZayavki.objects.create(
                zayavka=z,
                tip_sobytiya='comment',
                opisanie='Заявка автоматически освобождена (не было звонка в течение 12 часов)',
                sozdal=None
            )
            count += 1
        self.stdout.write(self.style.SUCCESS(f'Освобождено {count} заявок'))