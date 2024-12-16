import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, take, map, tap, switchMap, of } from 'rxjs';
import { User } from '../models/user';
import { AuthService } from './auth.service';
import { Injectable } from '@angular/core';
import { SolutionService } from './solution.service'; // Import SolutionService for participant checks

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(
    private auth: AuthService,
    private router: Router,
    private solutionService: SolutionService // Inject SolutionService
  ) {}

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
      return this.canActivateAdmin(route, state);
    }

    // If the route requires participant check
    if (route.data['requireParticipant']) {
      const solutionId = route.paramMap.get('id'); // Assume the solution ID is passed in the route
      return this.auth.user$.pipe(
        take(1),
        switchMap((user: User) => {
          if (!user) {
            this.auth.setRedirectUrl(state.url);
            this.router.navigate(['/login']);
            return of(false);
          }
          // Check if the user is a participant in the solution
          return this.solutionService.getSolution(solutionId!).pipe(
            map((solution) => {
              if (!solution || !solution.participants) return false;
              return Object.values(solution.participants).some(
                (participant) => {
                  const email = Object.values(participant)?.[0]; // Assuming email is the first value
                  return email === user.email;
                }
              );
            }),
            tap((isParticipant) => {
              if (!isParticipant) {
                console.log('Access denied: User is not a participant');
                this.router.navigate(['/home']);
              }
            })
          );
        })
      );
    }

    // Default behavior for non-admin routes
    return this.auth.user$.pipe(
      take(1),
      map((user: User) => !!user),
      tap((loggedIn: any) => {
        if (!loggedIn) {
          this.auth.setRedirectUrl(state.url);
          console.log('Access denied');
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
          this.router.navigate(['/home']);
        }
      })
    );
  }
}
