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

  /* ── Suggestions affichées tant qu’aucune question n’est posée ── */
  /* ── Suggestions affichées tant qu’aucune question n’est posée ── */
  starterPrompts = [
    {
      title: 'Design a solution',
      subtitle: 'to reduce food waste in urban areas',
    },
    {
      title: 'Create a platform',
      subtitle: 'to connect volunteers with local NGOs',
    },

    {
      title: 'Propose an initiative',
      subtitle: 'to improve digital access in rural communities',
    },
    {
      title: 'Latest news',
      subtitle:
        'to discover how recent events impact your community and the world',
    },
  ];

  /* ▸ Masquage automatique après clic */
  selectStarter(p: { title: string; subtitle: string }) {
    this.prompt = `${p.title} ${p.subtitle}`;
    this.starterPrompts = []; // ➜ fait disparaître le bloc
    this.submitPrompt(); // (commente-la si tu
  } //   veux juste pré-remplir)
  /** Masquer les suggestions et envoyer la question */
  override async submitPrompt(): Promise<void> {
    if (!this.prompt?.trim()) return; // rien à faire

    this.starterPrompts = []; // on cache le bloc
    await super.submitPrompt(); // conserve la logique parent
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
