import { Injectable, isDevMode } from '@angular/core';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private enabled(level: LogLevel): boolean {
    if (level === 'error' || level === 'warn') {
      return true;
    }
    return isDevMode();
  }

  debug(message: string, context?: Record<string, string>): void {
    if (this.enabled('debug')) {
      console.debug(`[SMS] ${message}`, context ?? '');
    }
  }

  info(message: string, context?: Record<string, string>): void {
    if (this.enabled('info')) {
      console.info(`[SMS] ${message}`, context ?? '');
    }
  }

  warn(message: string, context?: Record<string, string>): void {
    if (this.enabled('warn')) {
      console.warn(`[SMS] ${message}`, context ?? '');
    }
  }

  error(message: string, err?: unknown): void {
    console.error(`[SMS] ${message}`, err);
  }
}
