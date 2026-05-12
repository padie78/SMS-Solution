import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

/**
 * Carga los JSON de `src/assets/i18n/*.json` vía HttpClient (lazy por idioma).
 * Patrón estándar para ngx-translate v15 + Angular standalone 18.
 *
 * IMPORTANTE: el bundler Angular sirve `src/assets/` como `/assets/` en runtime.
 */
export function createTranslateHttpLoader(http: HttpClient): TranslateLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}
