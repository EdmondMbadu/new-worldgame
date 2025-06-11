// src/app/services/no-auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NoAuthGuard implements CanActivate {
  constructor(private afAuth: AngularFireAuth, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.afAuth.authState.pipe(
      take(1), // wait until Firebase resolves
      map((user) => {
        if (user) {
          // 👉 already logged-in
          this.router.navigate(['/home']); //    → push to /home
          return false; //    → block the landing page
        }
        return true; // not logged-in → show landing
      })
    );
  }
}
