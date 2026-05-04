import { Injectable, signal } from '@angular/core';

/**
 * Contador de alertas activas para Incident Center (badge dinámico).
 * Conectar después con API/EventBridge/AppSync subscriptions.
 */
@Injectable({ providedIn: 'root' })
export class OperationalAlertsBadgeService {
  readonly activeCount = signal(0);

  setActiveCount(n: number): void {
    this.activeCount.set(Math.max(0, Math.floor(n)));
  }
}
