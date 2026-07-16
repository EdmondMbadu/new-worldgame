import {
  APP_INITIALIZER,
  CUSTOM_ELEMENTS_SCHEMA,
  EnvironmentInjector,
  NgModule,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { AngularFireFunctionsModule } from '@angular/fire/compat/functions';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { environment } from 'environments/environments';
import { LanguageService } from './services/language.service';
import { initializeAngularFireCompatContext } from './services/angular-fire-compat-context';

export function initializeLanguage(languageService: LanguageService) {
  return () => languageService.initialize();
}

@NgModule({ declarations: [AppComponent, PageNotFoundComponent],
    bootstrap: [AppComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [BrowserModule,
        AppRoutingModule,
        AngularFireModule.initializeApp(environment.firebase),
        AngularFirestoreModule,
        AngularFireAuthModule,
        AngularFireStorageModule,
        AngularFireFunctionsModule,
        BrowserAnimationsModule,
        TranslateModule.forRoot({
            defaultLanguage: 'en',
        })], providers: [
        ...provideTranslateHttpLoader({
            prefix: '/assets/i18n/',
            suffix: '.json',
        }),
        {
            provide: APP_INITIALIZER,
            useFactory: initializeAngularFireCompatContext,
            deps: [EnvironmentInjector],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            useFactory: initializeLanguage,
            deps: [LanguageService],
            multi: true,
        },
        provideHttpClient(withInterceptorsFromDi()),
    ] })
export class AppModule {}
