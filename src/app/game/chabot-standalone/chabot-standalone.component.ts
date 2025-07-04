import { ChangeDetectorRef, Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatbotComponent } from 'src/app/components/chatbot/chatbot.component';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-chabot-standalone',
  templateUrl: './chabot-standalone.component.html',
  styleUrl: './chabot-standalone.component.css',
})
export class ChabotStandaloneComponent extends ChatbotComponent {
  /** true = dark-mode UI */
  isDark = false;
  constructor(
    afs: AngularFirestore,
    auth: AuthService,
    cd: ChangeDetectorRef,
    storage: AngularFireStorage,
    router: Router,
    route: ActivatedRoute
  ) {
    super(afs, auth, cd, storage, router); // keep all base-class logic
    this.cameFromWidget = route.snapshot.queryParamMap.get('from') === 'widget';
  }
  cameFromWidget = false;
  goBack(): void {
    if (this.cameFromWidget) {
      this.router.navigate(['../']); // or:  window.history.back();
    }
  }
  /** Initial for the placeholder avatar */
  get userInitial(): string {
    const n = this.user?.firstName || this.user?.firstName || '';
    return n ? n.charAt(0).toUpperCase() : 'U';
  }
  /** Toggles Tailwind dark class on <html> */
  toggleTheme(): void {
    this.isDark = !this.isDark;
    document.documentElement.classList.toggle('dark', this.isDark);
  }
}
