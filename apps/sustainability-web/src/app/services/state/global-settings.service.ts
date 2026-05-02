import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'sms_global_settings_v1';

export interface GlobalSettings {
  theme: 'light' | 'dark';
  locale: string;
  organizationId: string | null;
}

const defaultSettings = (): GlobalSettings => ({
  theme: 'light',
  locale: 'es',
  organizationId: null
});

@Injectable({ providedIn: 'root' })
export class GlobalSettingsService {
  private readonly settings = signal<GlobalSettings>(this.load());

  readonly snapshot = this.settings.asReadonly();

  patch(partial: Partial<GlobalSettings>): void {
    this.settings.update((s) => {
      const next = { ...s, ...partial };
      this.persist(next);
      return next;
    });
  }

  private persist(v: GlobalSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    } catch {
      // ignore quota / private mode
    }
  }

  private load(): GlobalSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaultSettings();
      }
      const parsed = JSON.parse(raw) as Partial<GlobalSettings>;
      return { ...defaultSettings(), ...parsed };
    } catch {
      return defaultSettings();
    }
  }
}
