import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import Aura from '@primeng/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { LayoutModule } from './layout/layout.module';
import { producerProviders } from './modules/producer/producer.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(appRoutes),
    importProvidersFrom(LayoutModule),
    ...producerProviders,
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
  ],
};
