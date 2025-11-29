import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css'],
})
export class VerifyEmailComponent implements OnInit {
  redirectTarget = '/school-admin';

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    const qp = this.route.snapshot.queryParamMap.get('redirectTo');
    if (qp && qp.startsWith('/')) {
      this.redirectTarget = qp;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { redirectTo: this.redirectTarget },
    });
  }
}
