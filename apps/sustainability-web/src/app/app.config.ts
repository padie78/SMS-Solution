import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

// Importes de PrimeNG necesarios para el inyector
import { MessageService, PrimeNGConfig } from 'primeng/api'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    MessageService, // Para los Toasts,
    provideHttpClient(), // Para las llamadas HTTP
    PrimeNGConfig   // <--- AGREGA ESTO. Es vital para componentes complejos de PrimeNG
  ]
};