import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
// src/main.ts

(window as any).process = (window as any).process || {
  env: { DEBUG: undefined },
  nextTick: function (callback: Function, ...args: any[]) {
    Promise.resolve().then(() => callback(...args));
  },
};

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
