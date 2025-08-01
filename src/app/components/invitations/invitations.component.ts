import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, filter, switchMap } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { PendingInvite, SchoolService } from 'src/app/services/school.service';

@Component({
  selector: 'app-invitations',
  templateUrl: './invitations.component.html',
  styleUrl: './invitations.component.css',
})
export class InvitationsComponent implements OnInit, OnDestroy {
  invites: PendingInvite[] = [];
  loading = true;
  actingId: string | null = null; // schoolId while processing
  private sub?: Subscription;

  constructor(public auth: AuthService, private school: SchoolService) {}

  ngOnInit(): void {
    this.sub = this.auth.user$
      .pipe(
        filter((u) => !!u?.email),
        switchMap((u) => this.school.getPendingInvitesForEmail(u!.email!))
      )
      .subscribe((rows) => {
        this.invites = rows;
        this.loading = false;
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  async accept(inv: PendingInvite) {
    try {
      this.actingId = inv.schoolId;
      const u = this.auth.currentUser; // or firstValueFrom(this.auth.user$)
      await this.school.acceptInvite({
        schoolId: inv.schoolId,
        email: inv.email,
        uid: u.uid,
        firstName: u.firstName,
        lastName: u.lastName,
      });
    } catch (e) {
      console.error(e);
      alert('Failed to accept invite.');
    } finally {
      this.actingId = null;
    }
  }

  async ignore(inv: PendingInvite) {
    const ok = confirm(`Ignore invite from "${inv.schoolName}"?`);
    if (!ok) return;

    try {
      this.actingId = inv.schoolId;
      await this.school.ignoreInvite(inv.schoolId, inv.email);
    } catch (e) {
      console.error(e);
      alert('Failed to ignore invite.');
    } finally {
      this.actingId = null;
    }
  }
}
