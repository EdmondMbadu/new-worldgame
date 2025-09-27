import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { SolutionService } from './solution.service';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  constructor(
    private auth: AuthService,
    private router: Router,
    private afs: AngularFirestore,
    private solutionService: SolutionService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const requireParticipant = route.data['requireParticipant'] === true;
    const requireAdmin = route.data['requireAdmin'] === true; // platform admin only
    const requireAdminOrPaid = route.data['requireAdminOrPaid'] === true; // legacy paid gate
    const requireAdminOrSchoolAdmin =
      route.data['requireAdminOrSchoolAdmin'] === true; // NEW
    const requireSchoolAdmin = route.data['requireSchoolAdmin'] === true; // optional

    if (requireParticipant) return this.checkParticipant(route, state);
    if (requireAdminOrPaid) return this.checkAdminOrPaidSchool(route, state);
    if (requireAdminOrSchoolAdmin)
      return this.checkAdminOrSchoolAdmin(route, state);
    if (requireSchoolAdmin) return this.checkSchoolAdmin(route, state);
    if (requireAdmin) return this.checkPlatformAdmin(state); // strict admin

    // default: must be logged in
    return this.auth.user$.pipe(
      take(1),
      map((u: User | null) => !!u),
      tap((loggedIn) => {
        if (!loggedIn) {
          this.auth.setRedirectUrl(state.url);
          sessionStorage.setItem('redirectTo', state.url);
          this.router.navigate(['/login']);
        }
      })
    );
  }

  // ---- helpers ----

  private isPlatformAdmin(u: any): boolean {
    return u?.admin === 'true' || u?.role === 'admin';
  }

  private resolveSchoolId(
    route: ActivatedRouteSnapshot,
    u: any
  ): string | null {
    // try query ?sid=, then :sid or :schoolId or :id, then user.schoolId
    return (
      route.queryParamMap.get('sid') ||
      route.paramMap.get('sid') ||
      route.paramMap.get('schoolId') ||
      route.paramMap.get('id') ||
      u?.schoolId ||
      null
    );
  }

  private checkPlatformAdmin(state: RouterStateSnapshot) {
    return this.auth.user$.pipe(
      take(1),
      map((u) => !!u && this.isPlatformAdmin(u)),
      tap((ok) => {
        if (!ok) {
          this.auth.setRedirectUrl(state.url);
          sessionStorage.setItem('redirectTo', state.url);
          this.router.navigate(['/home']);
        }
      })
    );
  }

  /** Platform admin OR school admin (no paid requirement) */
  private checkAdminOrSchoolAdmin(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {
    return this.auth.user$.pipe(
      take(1),
      switchMap((u: any) => {
        if (!u) {
          this.auth.setRedirectUrl(state.url);
          sessionStorage.setItem('redirectTo', state.url);
          this.router.navigate(['/login']);
          return of(false);
        }
        if (this.isPlatformAdmin(u)) return of(true);

        const schoolId = this.resolveSchoolId(route, u);
        if (!schoolId) {
          // fallback: if user explicitly has role=schoolAdmin, allow
          if (u?.role === 'schoolAdmin') return of(true);
          this.router.navigate(['/home']);
          return of(false);
        }

        return this.afs
          .doc(`schools/${schoolId}`)
          .valueChanges()
          .pipe(
            take(1),
            map((s: any) => {
              if (!s) {
                // fallback to user role if school doc missing
                return u?.role === 'schoolAdmin';
              }
              const isSchoolAdmin =
                s.ownerUid === u.uid ||
                (Array.isArray(s.adminUids) && s.adminUids.includes(u.uid)) ||
                u?.role === 'schoolAdmin';
              return !!isSchoolAdmin;
            }),
            tap((ok) => {
              if (!ok) {
                this.auth.setRedirectUrl(state.url);
                sessionStorage.setItem('redirectTo', state.url);
                this.router.navigate(['/home']);
              }
            })
          );
      })
    );
  }

  /** Platform admin OR admin of a *paid* school (your previous behavior) */
  private checkAdminOrPaidSchool(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {
    return this.auth.user$.pipe(
      take(1),
      switchMap((u: any) => {
        if (!u) {
          this.auth.setRedirectUrl(state.url);
          sessionStorage.setItem('redirectTo', state.url);
          this.router.navigate(['/login']);
          return of(false);
        }
        if (this.isPlatformAdmin(u)) return of(true);

        const schoolId = this.resolveSchoolId(route, u);
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
                s.ownerUid === u.uid ||
                (Array.isArray(s.adminUids) && s.adminUids.includes(u.uid)) ||
                u?.role === 'schoolAdmin';
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
            tap((ok) => {
              if (!ok) {
                this.auth.setRedirectUrl(state.url);
                sessionStorage.setItem('redirectTo', state.url);
                this.router.navigate(['/home']);
              }
            })
          );
      })
    );
  }

  /** Participant check unchanged */
  private checkParticipant(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {
    const solutionId = route.paramMap.get('id');
    const allowAdminBypass = route.data['allowAdminBypass'] !== false; // default: admins can bypass

    return this.auth.user$.pipe(
      take(1),
      switchMap((user: User | null) => {
        if (!user) {
          this.auth.setRedirectUrl(state.url);
          sessionStorage.setItem('redirectTo', state.url);
          this.router.navigate(['/login']);
          return of(false);
        }

        // ⬇️ platform admin bypass
        if (allowAdminBypass && this.isPlatformAdmin(user)) {
          return of(true);
        }

        // regular participant check
        return this.solutionService.getSolution(solutionId!).pipe(
          map((solution: any) => {
            if (!solution?.participants) return false;
            return Object.values(solution.participants).some(
              (participant: any) => {
                const email = (Object.values(participant)?.[0] ?? '')
                  .toString()
                  .toLowerCase();
                return email === (user.email ?? '').toLowerCase();
              }
            );
          }),
          tap((ok) => {
            if (!ok) this.router.navigate(['/home']);
          })
        );
      })
    );
  }

  /** Optional: schoolAdmin only (no platform admin) */
  private checkSchoolAdmin(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {
    return this.auth.user$.pipe(
      take(1),
      switchMap((u: any) => {
        if (!u) {
          this.auth.setRedirectUrl(state.url);
          sessionStorage.setItem('redirectTo', state.url);
          this.router.navigate(['/login']);
          return of(false);
        }
        const schoolId = this.resolveSchoolId(route, u);
        if (!schoolId) return of(u?.role === 'schoolAdmin');

        return this.afs
          .doc(`schools/${schoolId}`)
          .valueChanges()
          .pipe(
            take(1),
            map((s: any) => {
              if (!s) return u?.role === 'schoolAdmin';
              return (
                s.ownerUid === u.uid ||
                (Array.isArray(s.adminUids) && s.adminUids.includes(u.uid)) ||
                u?.role === 'schoolAdmin'
              );
            }),
            tap((ok) => {
              if (!ok) {
                this.auth.setRedirectUrl(state.url);
                sessionStorage.setItem('redirectTo', state.url);
                this.router.navigate(['/home']);
              }
            })
          );
      })
    );
  }
}
