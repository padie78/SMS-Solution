import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoggerService } from '../utils/logger.service';

/**
 * Facade for outbound non-AppSync HTTP calls (e.g. Climatiq). Wire base URLs via environment when available.
 */
@Injectable({ providedIn: 'root' })
export class ExternalApiService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);

  get<T>(url: string, params?: HttpParams, headers?: HttpHeaders): Observable<T> {
    this.logger.debug('External GET', { url });
    return this.http.get<T>(url, { params, headers });
  }

  post<T>(url: string, body: unknown, headers?: HttpHeaders): Observable<T> {
    this.logger.debug('External POST', { url });
    return this.http.post<T>(url, body, { headers });
  }
}
