import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from './amplify-config'; // El objeto que creamos arriba

// Configuración global de Amplify
Amplify.configure(amplifyConfig);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));