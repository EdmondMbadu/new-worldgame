import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, take, map, tap } from 'rxjs';
import { User } from '../models/user';
import { AuthService } from './auth.service';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    console.log('AuthGuard: canActivate called');
    return this.auth.user$.pipe(
      take(1),
      map((user: User) => {
        console.log('AuthGuard: user fetched', user);
        !!user;
      }),
      tap((loggedIn: any) => {
        if (!loggedIn) {
          this.auth.setRedirectUrl(state.url);
          console.log(' the snapshot url is', state.url);
          console.log('Acced denied. Redirect to login');
          this.router.navigate(['/login']);
        }
      })
    );
  }
}
