import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly messages = inject(MessageService);

  show(severity: ToastSeverity, summary: string, detail?: string): void {
    this.messages.add({ severity, summary, detail });
  }

  success(summary: string, detail?: string): void {
    this.show('success', summary, detail);
  }

  error(summary: string, detail?: string): void {
    this.show('error', summary, detail);
  }
}
