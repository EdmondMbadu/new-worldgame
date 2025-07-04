import { ChangeDetectorRef, Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatbotComponent } from 'src/app/components/chatbot/chatbot.component';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-chabot-standalone',
  templateUrl: './chabot-standalone.component.html',
  styleUrls: ['./chabot-standalone.component.css'],
})
export class ChabotStandaloneComponent extends ChatbotComponent {
  /* ── UI flags ─────────────────────────────────────────────── */
  isDark = false;
  cameFromWidget = false;
  signedIn = false; // real session or guest?

  constructor(
    afs: AngularFirestore,
    auth: AuthService,
    cd: ChangeDetectorRef,
    storage: AngularFireStorage,
    router: Router, // keep for goBack()
    route: ActivatedRoute
  ) {
    /* 1 ▪ real user present? */
    super(afs, ensureUser(auth), cd, storage, router); // <— now safe

    /* 2 ▪ origin */
    this.cameFromWidget = route.snapshot.queryParamMap.get('from') === 'widget';
    this.signedIn =
      !!auth.currentUser &&
      auth.currentUser.uid !== 'guest' &&
      auth.currentUser.email?.trim().length;
  }

  /* ── Navigation back to bubble ────────────────────────────── */
  goBack(): void {
    if (this.cameFromWidget) this.router.navigate(['../']);
  }

  /* ── Placeholder letter for avatar ────────────────────────── */
  get userInitial(): string {
    const n = this.user?.firstName || '';
    return n ? n[0].toUpperCase() : 'U';
  }

  /* ── Dark / light toggle ──────────────────────────────────── */
  toggleTheme(): void {
    this.isDark = !this.isDark;
    document.documentElement.classList.toggle('dark', this.isDark);
  }
}

/* ------------------------------------------------------------------
   Helper: if AuthService has no user yet, inject a one-field guest
-------------------------------------------------------------------*/
function ensureUser(auth: AuthService) {
  if (!auth.currentUser) {
    auth.currentUser = { uid: 'guest' } as any;
  }
  return auth;
}
