import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { firstValueFrom } from 'rxjs';

export interface S3UploadResult {
  success: boolean;
  key: string;
}

@Injectable({ providedIn: 'root' })
export class S3StorageService {
  private readonly http = inject(HttpClient);

  async putObject(uploadUrl: string, file: File): Promise<S3UploadResult> {
    const headers = new HttpHeaders({ 'Content-Type': file.type });
    const urlPath = new URL(uploadUrl).pathname;
    const finalKey = decodeURIComponent(urlPath.startsWith('/') ? urlPath.substring(1) : urlPath);

    await firstValueFrom(this.http.put(uploadUrl, file, { headers }));
    return { success: true, key: finalKey };
  }

  /**
   * Upload with progress events (0–100) for UI binding.
   */
  putObjectWithProgress(uploadUrl: string, file: File): Observable<number> {
    const headers = new HttpHeaders({ 'Content-Type': file.type });
    return this.http
      .put(uploadUrl, file, {
        headers,
        reportProgress: true,
        observe: 'events'
      })
      .pipe(
        map((event: HttpEvent<unknown>) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            return Math.round((100 * event.loaded) / event.total);
          }
          return 0;
        })
      );
  }
}
