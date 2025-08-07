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
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { SolutionService } from './solution.service'; // Import SolutionService for participant checks

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(
    private auth: AuthService,
    private router: Router,
    private afs: AngularFirestore,
    private solutionService: SolutionService // Inject SolutionService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const requireAdmin = route.data['requireAdmin'];
    const requireAdminOrPaid = route.data['requireAdminOrPaid'] ?? requireAdmin; // support both keys
    const requireParticipant = route.data['requireParticipant'];

    if (requireAdminOrPaid) {
      return this.canActivateAdminOrPaidSchool(route, state);
    }

    if (requireParticipant) {
      const solutionId = route.paramMap.get('id');
      return this.auth.user$.pipe(
        take(1),
        switchMap((user: User | null) => {
          if (!user) {
            this.auth.setRedirectUrl(state.url);
            this.router.navigate(['/login']);
            return of(false);
          }
          return this.solutionService.getSolution(solutionId!).pipe(
            map((solution) => {
              if (!solution?.participants) return false;
              return Object.values(solution.participants).some(
                (participant) => {
                  const email = Object.values(participant)?.[0];
                  return email === user.email;
                }
              );
            }),
            tap((ok) => {
              if (!ok) {
                console.log('Access denied: User is not a participant');
                this.router.navigate(['/home']);
              }
            })
          );
        })
      );
    }

    // default auth check
    return this.auth.user$.pipe(
      take(1),
      map((user: User | null) => !!user),
      tap((loggedIn) => {
        if (!loggedIn) {
          this.auth.setRedirectUrl(state.url);
          this.router.navigate(['/login']);
        }
      })
    );
  }

  /** Admins OR Paid School Admins (owner/adminUids of a paid school) */
  private canActivateAdminOrPaidSchool(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const sidFromQuery = route.queryParamMap.get('sid') || null;

    return this.auth.user$.pipe(
      take(1),
      switchMap((user: User | null) => {
        if (!user) {
          this.auth.setRedirectUrl(state.url);
          this.router.navigate(['/login']);
          return of(false);
        }

        const isPlatformAdmin = user.admin === 'true';
        if (isPlatformAdmin) return of(true);

        // Determine which school we are checking
        const schoolId = sidFromQuery || (user as any)?.schoolId;
        if (!schoolId) {
          // No school context and not a platform admin
          this.router.navigate(['/home']);
          return of(false);
        }

        // Fetch the school once and evaluate admin+paid
        return this.afs
          .doc(`schools/${schoolId}`)
          .valueChanges()
          .pipe(
            take(1),
            map((s: any) => {
              if (!s) return false;

              // School admin check (owner or in adminUids)
              const isSchoolAdmin =
                s.ownerUid === user.uid ||
                (Array.isArray(s.adminUids) && s.adminUids.includes(user.uid));

              // Paid check (explicit first, then fallbacks)
              const statusTop = (s.paymentStatus || '')
                .toString()
                .toLowerCase();
              const statusBilling = (s.billing?.paymentStatus || '')
                .toString()
                .toLowerCase();
              const hasStripe = !!(
                s.stripe?.paymentIntent || s.stripe?.sessionId
              );
              const numericTotal = Number(s.billing?.total ?? s.total ?? 0);
              const looksPaid =
                statusTop === 'paid' ||
                statusBilling === 'paid' ||
                hasStripe ||
                numericTotal > 0;

              return isSchoolAdmin && looksPaid;
            }),
            tap((allowed) => {
              if (!allowed) {
                console.log('Access denied: not admin of a paid school');
                this.auth.setRedirectUrl(state.url);
                this.router.navigate(['/home']);
              }
            })
          );
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
