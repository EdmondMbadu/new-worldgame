import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, take, map, tap, switchMap, of } from 'rxjs';
import { User } from '../models/user';
import { AuthService } from './auth.service';
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { SolutionService } from './solution.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  constructor(
    private auth: AuthService,
    private router: Router,
    private afs: AngularFirestore,
    private solutionService: SolutionService
  ) {}

  /** Accepts boolean true or string 'true' */
  private isAdmin(user: User | null): boolean {
    return (
      !!user && ((user as any).admin === true || (user as any).admin === 'true')
    );
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const requireAdmin = route.data['requireAdmin'] === true;
    const requireAdminOrPaid =
      route.data['requireAdminOrPaid'] ?? route.data['requireAdmin'] ?? false;
    const requireParticipant = route.data['requireParticipant'] === true;

    return this.auth.user$.pipe(
      take(1),
      switchMap((user: User | null) => {
        // Not logged in → send to login
        if (!user) {
          this.auth.setRedirectUrl(state.url);
          this.router.navigate(['/login']);
          return of(false);
        }

        // 🔓 Global admin bypass: admins see everything
        if (this.isAdmin(user)) {
          return of(true);
        }

        // Explicit admin-only pages (if you use data:{requireAdmin:true})
        if (requireAdmin) {
          // We already know not admin (bypass above), so deny.
          this.auth.setRedirectUrl(state.url);
          this.router.navigate(['/home']);
          return of(false);
        }

        // Admin or PAID school-admin pages
        if (requireAdminOrPaid) {
          return this.canActivateAdminOrPaidSchool(route, state);
        }

        // Participant-gated pages
        if (requireParticipant) {
          const solutionId = route.paramMap.get('id');
          if (!solutionId) {
            this.router.navigate(['/home']);
            return of(false);
          }

          return this.solutionService.getSolution(solutionId).pipe(
            take(1),
            map((solution: any) => {
              if (!solution?.participants) return false;
              // your existing participant email check
              return Object.values(solution.participants).some(
                (participant: any) => {
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
        }

        // Default: logged-in is enough
        return of(true);
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

        // (Extra safety) platform admin already handled in main guard, but keep here too
        if (this.isAdmin(user)) return of(true);

        const schoolId = sidFromQuery || (user as any)?.schoolId;
        if (!schoolId) {
          this.router.navigate(['/home']);
          return of(false);
        }

        return this.afs
          .doc(`schools/${schoolId}`)
          .valueChanges()
          .pipe(
            take(1),
            map((s: any) => {
              if (!s) return false;

              const isSchoolAdmin =
                s.ownerUid === user.uid ||
                (Array.isArray(s.adminUids) && s.adminUids.includes(user.uid));

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

  // Optional: keep if you use it explicitly elsewhere
  canActivateAdmin(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    return this.auth.user$.pipe(
      take(1),
      map((user: User | null) => this.isAdmin(user)),
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
