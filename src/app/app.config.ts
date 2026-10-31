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
      50: '#EAF0FD',
      100: '#D6E1FB',
      200: '#B3C7F9',
      300: '#8AA8F5',
      400: '#5A81EE',
      500: '#2457E6',
      600: '#1948C8',
      700: '#163DA8',
      800: '#142F82',
      900: '#122865',
      950: '#0B1A42'
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
