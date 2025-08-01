/* school-dashboard.component.ts */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, switchMap } from 'rxjs';
import { User, School } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';

interface Row {
  name: string;
  email: string;
  verified: boolean;
}

@Component({
  selector: 'app-school-dashboard',
  templateUrl: './school-dashboard.component.html',
})
export class SchoolDashboardComponent implements OnInit, OnDestroy {
  schoolName = '';
  students: Row[] = [];

  invitedCount = 0;
  verifiedCount = 0;

  private sub?: Subscription;

  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    /* ① get logged-in admin */
    this.sub = this.auth.user$
      .pipe(
        /* guard: only if user is admin of a school */
        switchMap((u: User | null) => {
          if (!u?.schoolId) throw new Error('No schoolId on user!');
          /* ② fetch school doc for the name */
          this.auth
            .getSchoolDoc(u.schoolId)
            .subscribe(
              (s: School | undefined) => (this.schoolName = s?.name ?? '')
            );

          /* ③ stream students list */
          return this.auth.getStudentsInSchool(u.schoolId);
        })
      )
      .subscribe((users: any) => {
        this.students = users.map((u: any) => ({
          name: `${u.firstName} ${u.lastName}`.trim(),
          email: u.email!,
          verified: !!u.verified,
        }));
        this.invitedCount = this.students.length;
        this.verifiedCount = this.students.filter((s) => s.verified).length;
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /* stub – you’ll replace with a real invite modal */
  inviteStudent() {
    alert('Coming soon: send invite email ✉️');
  }
}
