import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { ngrokInterceptor } from './core/interceptors/ngrok-interceptor';

const OrderFlowPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff1f4',
      100: '#ffe1e8',
      200: '#ffc3d1',
      300: '#ff9ab3',
      400: '#ff7093',
      500: '#ff416c',
      600: '#e6335d',
      700: '#c9274d',
      800: '#a91f42',
      900: '#861b38',
      950: '#4e0b1c'
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
        withInterceptors([ngrokInterceptor])
    ),
    MessageService,
    providePrimeNG({
      theme: {
        preset: OrderFlowPreset,
        options: {
          darkModeSelector: "[data-theme='dark']"
        }
      }
    }),
    provideRouter(routes),
    provideClientHydration(withEventReplay())
  ]
};
