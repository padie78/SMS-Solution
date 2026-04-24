import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { MessageService } from 'primeng/api'; // <--- IMPORTANTE
import { Amplify } from 'aws-amplify';

// Configuración de AWS
// Tip: Más adelante podremos inyectar estos valores desde un environment.ts
Amplify.configure({
  API: {
    GraphQL: {
      endpoint: 'https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql',
      region: 'eu-central-1',
      defaultAuthMode: 'userPool'
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    MessageService
  ]
};