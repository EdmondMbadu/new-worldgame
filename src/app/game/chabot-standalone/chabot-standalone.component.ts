import { ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ChatbotComponent } from 'src/app/components/chatbot/chatbot.component';
import { AuthService } from 'src/app/services/auth.service';
import {
  ChatContextService,
  ChatPageHandoff,
} from 'src/app/services/chat-context.service';
import { ChatSessionService } from 'src/app/services/chat-session.service';

@Component({
    selector: 'app-chabot-standalone',
    templateUrl: './chabot-standalone.component.html',
    styleUrls: ['./chabot-standalone.component.css'],
    standalone: false
})
export class ChabotStandaloneComponent extends ChatbotComponent {
  /* ── UI flags ─────────────────────────────────────────────── */
  isDark = false;
  cameFromWidget = false;
  signedIn = false; // real session or guest?
  returnTo = '';
  isWideLayout =
    typeof window === 'undefined' ? true : window.innerWidth > 880;
  desktopAppSidebarVisible = true;
  mobileAppSidebarVisible = false;
  private restoredHandoff: ChatPageHandoff | null = null;

  constructor(
    afs: AngularFirestore,
    auth: AuthService,
    cd: ChangeDetectorRef,
    storage: AngularFireStorage,
    router: Router, // keep for goBack()
    private readonly route: ActivatedRoute,
    chatContext: ChatContextService,
    translate: TranslateService,
    chatSession: ChatSessionService
  ) {
    /* 1 ▪ real user present? */
    super(afs, ensureUser(auth), cd, storage, router, chatContext, translate, chatSession); // <— now safe

    /* 2 ▪ origin */
    this.cameFromWidget = route.snapshot.queryParamMap.get('from') === 'widget';
    this.signedIn =
      !!auth.currentUser &&
      auth.currentUser.uid !== 'guest' &&
      auth.currentUser.email?.trim().length;
  }

  override ngOnInit(): void {
    const solutionId = this.route.snapshot.queryParamMap.get('solution');
    this.restoredHandoff = this.cameFromWidget
      ? this.chatContext.getFullPageHandoff(solutionId)
      : null;

    const requestedAvatarId =
      this.restoredHandoff?.avatarId ||
      this.route.snapshot.queryParamMap.get('avatar');
    const requestedAvatar = this.aiAvatars.find(
      (avatar) => avatar.id === requestedAvatarId
    );

    if (requestedAvatar) {
      this.selectedAi = requestedAvatar;
      this.collectionPath = `users/${this.auth.currentUser.uid}/${requestedAvatar.collectionKey}`;
    }

    if (this.restoredHandoff) {
      const handoff = this.restoredHandoff;
      if (handoff.context) {
        this.chatContext.setContext(handoff.context);
      }

      this.responses = handoff.messages.map((message) => ({
        ...message,
        insertable: false,
      }));
      this.prompt = handoff.draft || '';
      if (handoff.isThinking) {
        this.uiPhase = 'thinking';
        this.thinkingLabel = handoff.thinkingLabel || 'Continuing your response';
      }
    }

    this.returnTo = this.resolveReturnDestination(solutionId);
    this.isDark = document.documentElement.classList.contains('dark');

    super.ngOnInit();

    const requestedSessionId =
      this.route.snapshot.queryParamMap.get('session') ||
      this.restoredHandoff?.sessionId;
    if (requestedSessionId) {
      this.loadSession(requestedSessionId, this.responses);
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    if (this.restoredHandoff?.context) {
      this.chatContext.clearContext();
    }
  }

  private readonly starterPromptOptions = [
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
  starterPrompts = this.starterPromptOptions.map((prompt) => ({ ...prompt }));

  /* ▸ Masquage automatique après clic */
  selectStarter(p: { title: string; subtitle: string }) {
    this.prompt = `${p.title} ${p.subtitle}`;
    this.starterPrompts = []; // ➜ fait disparaître le bloc
    this.submitPrompt(); // (commente-la si tu
  } //   veux juste pré-remplir)
  /** Masquer les suggestions et envoyer la question */
  override async submitPrompt(): Promise<void> {
    if (!this.prompt?.trim() && !this.previews.length) return;

    this.starterPrompts = []; // on cache le bloc
    await super.submitPrompt(); // conserve la logique parent
  }

  override startNewConversation(): void {
    super.startNewConversation();
    this.starterPrompts = this.starterPromptOptions.map((prompt) => ({
      ...prompt,
    }));
  }

  handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;

    event.preventDefault();
    void this.submitPrompt();
  }

  get historySidebarVisible(): boolean {
    return this.showHistoryPanel;
  }

  override toggleHistoryPanel(): void {
    super.toggleHistoryPanel();
  }

  get appSidebarVisible(): boolean {
    return this.isWideLayout
      ? this.desktopAppSidebarVisible
      : this.mobileAppSidebarVisible;
  }

  toggleAppSidebar(): void {
    if (this.isWideLayout) {
      this.desktopAppSidebarVisible = !this.desktopAppSidebarVisible;
    } else {
      this.mobileAppSidebarVisible = !this.mobileAppSidebarVisible;
    }
    this.showHistoryPanel = false;
    this.showAiSelector = false;
  }

  closeMobileAppSidebar(): void {
    if (!this.isWideLayout) {
      this.mobileAppSidebarVisible = false;
    }
  }

  @HostListener('window:resize')
  syncResponsiveLayout(): void {
    this.isWideLayout = window.innerWidth > 880;
  }

  /* ── Navigation back to bubble ────────────────────────────── */
  goBack(): void {
    if (this.returnTo) {
      void this.router.navigateByUrl(this.returnTo);
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
      return;
    }

    void this.router.navigate(['/']);
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

  get solutionTitle(): string {
    return this.playgroundContext?.solutionTitle || 'Solution workspace';
  }

  get solutionId(): string | null {
    return (
      this.playgroundContext?.solutionId ||
      this.route.snapshot.queryParamMap.get('solution')
    );
  }

  get solutionDevelopmentUrl(): string {
    const returnUrl = this.returnTo || '';
    if (returnUrl.startsWith('/playground-steps/')) {
      return returnUrl;
    }

    return this.solutionId
      ? `/playground-steps/${this.solutionId}`
      : '/problem-list-view';
  }

  get solutionDevelopmentPath(): string {
    return this.solutionDevelopmentUrl.split('?')[0];
  }

  get solutionDevelopmentQueryParams(): Record<string, string> {
    try {
      return this.router.parseUrl(this.solutionDevelopmentUrl).queryParams;
    } catch {
      return {};
    }
  }

  get userDisplayName(): string {
    const fullName = [this.user?.firstName, this.user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return fullName || this.user?.email || 'Your profile';
  }

  get contextLabel(): string {
    return (
      this.playgroundContext?.currentStepName ||
      (this.route.snapshot.queryParamMap.get('solution')
        ? 'Solution conversation'
        : 'General conversation')
    );
  }

  private resolveReturnDestination(solutionId: string | null): string {
    const requestedReturn =
      this.route.snapshot.queryParamMap.get('returnTo') ||
      this.restoredHandoff?.returnTo ||
      '';

    if (
      requestedReturn.startsWith('/') &&
      !requestedReturn.startsWith('//') &&
      !requestedReturn.startsWith('/ask-bucky')
    ) {
      return requestedReturn;
    }

    return solutionId ? `/playground-steps/${solutionId}` : '';
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
