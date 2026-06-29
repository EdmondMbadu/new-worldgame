import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export interface SiteSettingUpdatedBy {
  uid?: string;
  email?: string;
  name?: string;
}

export interface Gsl2026BannerConfig {
  enabled: boolean;
  label: string;
  updatedAt?: any;
  updatedBy?: SiteSettingUpdatedBy;
}

@Injectable({
  providedIn: 'root',
})
export class SiteSettingsService {
  private readonly gsl2026BannerDocPath = 'admin_settings/gsl2026_banner';
  private readonly defaultGsl2026BannerConfig: Gsl2026BannerConfig = {
    enabled: true,
    label: 'Global Solutions Lab 2026',
  };

  constructor(private afs: AngularFirestore) {}

  watchGsl2026BannerConfig(): Observable<Gsl2026BannerConfig> {
    return this.afs
      .doc<Partial<Gsl2026BannerConfig>>(this.gsl2026BannerDocPath)
      .valueChanges()
      .pipe(
        map((config) => this.normalizeGsl2026BannerConfig(config)),
        catchError((error) => {
          console.error('Unable to load GSL 2026 banner config', error);
          return of(this.defaultGsl2026BannerConfig);
        })
      );
  }

  setGsl2026BannerEnabled(
    enabled: boolean,
    updatedBy?: SiteSettingUpdatedBy
  ): Promise<void> {
    return this.afs.doc(this.gsl2026BannerDocPath).set(
      {
        enabled,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: updatedBy || {},
      },
      { merge: true }
    );
  }

  private normalizeGsl2026BannerConfig(
    config?: Partial<Gsl2026BannerConfig>
  ): Gsl2026BannerConfig {
    const label =
      typeof config?.label === 'string' && config.label.trim()
        ? config.label.trim()
        : this.defaultGsl2026BannerConfig.label;

    return {
      ...this.defaultGsl2026BannerConfig,
      ...(config || {}),
      enabled: config?.enabled !== false,
      label,
    };
  }
}
