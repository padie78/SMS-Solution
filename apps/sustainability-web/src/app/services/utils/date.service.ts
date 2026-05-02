import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';

@Injectable({ providedIn: 'root' })
export class DateService {
  nowUtc(): DateTime {
    return DateTime.utc();
  }

  parseIso(iso: string): DateTime {
    return DateTime.fromISO(iso, { zone: 'utc' });
  }

  formatDisplay(iso: string, locale: string): string {
    const dt = this.parseIso(iso);
    return dt.setLocale(locale).toLocaleString(DateTime.DATE_MED);
  }
}
