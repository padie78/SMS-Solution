import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from './amplify-config'; // El objeto que creamos arriba

declare global {
  interface Window {
    pdfWorkerSrc?: string;
  }
}

const baseHref = document.querySelector('base')?.getAttribute('href') ?? '/';
const normalizedBase = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
// Served from src/assets/pdfjs (see package.json postinstall); path must match ng serve / build.
window.pdfWorkerSrc = `${normalizedBase}assets/pdfjs/pdf.worker.min.mjs`;

// Configuración global de Amplify
Amplify.configure(amplifyConfig);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));