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
    const requireAdmin = route.data['requireAdmin'];

    if (requireAdmin) {
      return this.canActivateAdmin(route, state); // Call admin-specific logic
    }
    return this.auth.user$.pipe(
      take(1),
      map((user: User) => !!user),
      tap((loggedIn: any) => {
        if (!loggedIn) {
          this.auth.setRedirectUrl(state.url);
          console.log('Acced denied');
          this.router.navigate(['/login']);
        }
      })
    );
  }
  canActivateAdmin(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return this.auth.user$.pipe(
      take(1),
      map((user: User) => user && user.admin === 'true'), // Check if user is admin
      tap((isAdmin: boolean) => {
        if (!isAdmin) {
          this.auth.setRedirectUrl(state.url);
          console.log('Admin access denied');
          this.router.navigate(['/home']); // Redirect non-admins to login
        }
      })
    );
  }
}
