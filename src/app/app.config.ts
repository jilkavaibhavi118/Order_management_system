import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { ngrokInterceptor } from './interceptors/ngrok-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
        withInterceptors([ngrokInterceptor])
    ),
    MessageService,
    provideRouter(routes),
    provideClientHydration(withEventReplay())
  ]
};
