import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { AIOption, DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-landing-community',
  templateUrl: './landing-community.component.html',
  styleUrls: ['./landing-community.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingCommunityComponent implements OnInit {
  aiOptions: AIOption[] = [];
  isLoggedIn = false;

  constructor(
    public data: DataService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    this.aiOptions = this.data.getAll();
    const user = await this.auth.getCurrentUserPromise();
    this.isLoggedIn = !!user;
    this.cdr.markForCheck();
  }

  trackByIndex(index: number): number {
    return index;
  }
}

