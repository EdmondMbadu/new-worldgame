import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, Injector, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { clearAuthReturn } from '../services/auth-return';
import { User } from '../models/user';
import {
  MAX_ANSWER_LENGTH, STARTER_FIELDS, STARTER_STEPS, STARTER_STORAGE_KEY,
  StarterDraft, StarterField, hasAnswer, mapStarterToPlayground, newStarterDraft, readStarterDraft, starterText,
} from './starter-model';

@Component({
  selector: 'app-community-starter', standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './community-starter.component.html', styleUrls: ['./community-starter.component.css'],
})
export class CommunityStarterComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly steps = STARTER_STEPS;
  readonly maxLength = MAX_ANSWER_LENGTH;
  readonly examples = [
    { label: 'Affordable food', text: 'Families in our neighborhood struggle to find affordable fresh food.' },
    { label: 'Youth opportunities', text: 'Young people in our community need more opportunities to learn skills and find meaningful work.' },
    { label: 'Safer streets', text: 'People in our neighborhood don’t feel safe walking or cycling on our streets.' },
  ];
  draft = newStarterDraft();
  user: User | null = null;
  sessionReady = false;
  storageMode: 'device' | 'tab' | 'memory' = 'device';
  storageMessage = '';
  externalDraft: StarterDraft | null = null;
  attempted = false;
  error = '';
  accountError = '';
  saving = false;
  signingIn = false;
  emailMode = false;
  creatingAccount = false;
  checkingEmail = false;
  resendingEmail = false;
  accountAttempted = false;
  showPassword = false;
  account = { firstName: '', lastName: '', email: '', password: '', agreed: false };
  accountNotice = '';
  overview = false;
  mobileBriefOpen = false;
  showNewConfirmation = false;
  downloadNotice = '';
  private authSubscription?: Subscription;
  private saveTimer?: ReturnType<typeof setTimeout>;
  private focusTimer?: ReturnType<typeof setTimeout>;
  private destroyed = false;
  @ViewChild('problemInput') problemInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('answerInput') answerInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('panelHeading') panelHeading?: ElementRef<HTMLElement>;
  @ViewChild('saveDialog') saveDialog?: ElementRef<HTMLDialogElement>;

  constructor(public auth: AuthService, private router: Router, private route: ActivatedRoute, private injector: Injector) {}

  ngOnInit() {
    let raw: string | null = null;
    try { raw = localStorage.getItem(STARTER_STORAGE_KEY); }
    catch { this.storageMode = 'tab'; }
    if (!raw) {
      try { raw = sessionStorage.getItem(STARTER_STORAGE_KEY); if (raw) this.storageMode = 'tab'; }
      catch { if (this.storageMode === 'tab') this.storageMode = 'memory'; }
    }
    const restored = readStarterDraft(raw);
    if (restored) {
      this.draft = restored;
      // A stored field can only be opened in its own step.
      if (this.draft.activeField && !this.step.fields.some(f => f.id === this.draft.activeField)) this.draft.activeField = this.nextCoreField();
    } else if (raw) this.storageMessage = 'We couldn’t restore the previous draft. You can start a new one here.';
    this.authSubscription = this.auth.user$.subscribe({
      next: user => { this.user = user; this.sessionReady = true; },
      error: () => { this.sessionReady = true; this.accountError = 'We couldn’t check your account. You can keep working as a guest.'; },
    });
  }

  ngAfterViewInit() {
    if (this.route.snapshot.queryParamMap.get('save') === '1' && this.draft.started) {
      this.focusTimer = setTimeout(() => this.openSave());
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.flushDraft();
    clearTimeout(this.focusTimer);
    this.authSubscription?.unsubscribe();
  }

  get step() { return this.steps[this.draft.step]; }
  get field(): StarterField | undefined { return this.step.fields.find(f => f.id === this.draft.activeField); }
  get coreFields() { return this.step.fields.filter(f => f.core && f.id !== 'problem'); }
  get extraFields() { return this.step.fields.filter(f => !f.core); }
  get answeredFields() { return this.step.fields.filter(f => hasAnswer(this.draft.answers[f.id])); }
  get remainingFields() { return this.step.fields.filter(f => !hasAnswer(this.draft.answers[f.id])); }
  get hasProblem() { return hasAnswer(this.draft.answers['problem']); }
  get mapping() { return mapStarterToPlayground(this.draft); }
  get answerCount() { return Object.keys(this.mapping.status).length; }
  get saved() { return !!this.draft.exported; }
  get savedForCurrentUser() { return !!this.user?.uid && this.draft.exported?.ownerUid === this.user.uid; }
  get storageLabel() {
    if (this.externalDraft) return 'Changes in another tab';
    if (this.saved) return 'Saved as a workspace';
    return this.storageMode === 'device' ? 'Draft on this device' : this.storageMode === 'tab' ? 'Draft in this tab' : 'Draft in memory only';
  }
  get buttonLabel() { return this.draft.step < 3 ? `Next: ${this.steps[this.draft.step + 1].title.toLowerCase()}` : 'Review my starting brief'; }
  countStep(index: number) { return this.steps[index].fields.filter(f => hasAnswer(this.draft.answers[f.id])).length; }
  stepCountLabel(index: number) { const count = this.countStep(index); return count ? `${count} ${count === 1 ? 'note' : 'notes'} added` : 'Open to explore'; }
  fieldAnswered(field: StarterField) { return hasAnswer(this.draft.answers[field.id]); }

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    element?.focus({ preventScroll: true });
  }

  setAnswer(id: string, value: string) {
    if (this.saved) return;
    this.draft.answers[id] = value.slice(0, MAX_ANSWER_LENGTH);
    this.draft.skipped = this.draft.skipped.filter(key => key !== id);
    this.error = '';
    this.attempted = false;
    this.scheduleSave();
  }

  useExample(text: string) {
    this.setAnswer('problem', text);
    this.problemInput?.nativeElement.focus();
  }

  start() {
    this.attempted = true;
    if (!this.hasProblem) { this.problemInput?.nativeElement.focus(); return; }
    this.draft.started = true;
    this.draft.step = 0;
    this.draft.activeField = 'context';
    this.flushDraft();
    this.focusPanel();
  }

  private nextCoreField() {
    return this.step.fields.find(f => f.core && f.id !== 'problem' && !this.fieldAnswered(f) && !this.draft.skipped.includes(f.id))?.id || '';
  }

  continueAnswer(skip = false) {
    const field = this.field;
    if (!field || this.saved) return;
    if (!skip && !hasAnswer(this.draft.answers[field.id])) {
      this.error = 'Add what you know, or choose “I’ll come back to this.”';
      this.answerInput?.nativeElement.focus();
      return;
    }
    if (skip && !this.draft.skipped.includes(field.id)) this.draft.skipped.push(field.id);
    this.draft.activeField = field.core && field.id !== 'problem' ? this.nextCoreField() : '';
    this.error = '';
    this.flushDraft();
    this.focusPanel();
  }

  editField(field: StarterField) {
    if (this.saved) return;
    this.draft.step = this.steps.findIndex(step => step.fields.some(f => f.id === field.id));
    this.draft.activeField = field.id;
    this.overview = false;
    this.error = '';
    this.scheduleSave();
    this.focusPanel();
  }

  chooseStep(index: number) {
    this.draft.step = index;
    this.draft.activeField = this.nextCoreField();
    this.overview = false;
    this.mobileBriefOpen = false;
    this.error = '';
    this.flushDraft();
    this.focusPanel();
  }

  nextStep() {
    if (this.draft.step < 3) this.chooseStep(this.draft.step + 1);
    else {
      this.overview = true;
      this.draft.activeField = '';
      this.flushDraft();
      this.focusPanel();
    }
  }

  private focusPanel() {
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => {
      const element = this.field && !this.overview ? this.answerInput?.nativeElement : this.panelHeading?.nativeElement;
      element?.focus({ preventScroll: true });
      if (window.innerWidth < 760) this.panelHeading?.nativeElement.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    });
  }

  private scheduleSave() {
    this.draft.updatedAt = Date.now();
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flushDraft(), 180);
  }

  @HostListener('window:pagehide')
  flushDraft() {
    clearTimeout(this.saveTimer);
    if (this.externalDraft) return;
    this.draft.updatedAt = Date.now();
    const raw = JSON.stringify(this.draft);
    try {
      localStorage.setItem(STARTER_STORAGE_KEY, raw);
      this.storageMode = 'device';
      try { sessionStorage.removeItem(STARTER_STORAGE_KEY); } catch { /* Local copy succeeded. */ }
      return;
    } catch { /* Fall back to tab storage before offering authentication. */ }
    try { sessionStorage.setItem(STARTER_STORAGE_KEY, raw); this.storageMode = 'tab'; }
    catch { this.storageMode = 'memory'; }
  }

  @HostListener('window:storage', ['$event'])
  storageChanged(event: StorageEvent) {
    if (event.key !== STARTER_STORAGE_KEY) return;
    const incoming = readStarterDraft(event.newValue);
    if (incoming && incoming.updatedAt !== this.draft.updatedAt) {
      clearTimeout(this.saveTimer);
      this.externalDraft = incoming;
    }
  }

  resolveOtherTab(useOther: boolean) {
    if (useOther && this.externalDraft) this.draft = this.externalDraft;
    this.externalDraft = null;
    this.overview = false;
    this.flushDraft();
  }

  openSave() {
    if (!this.hasProblem) { this.problemInput?.nativeElement.focus(); return; }
    this.flushDraft();
    this.accountError = '';
    this.saveDialog?.nativeElement.showModal();
  }

  closeSave(event?: Event) {
    if (this.saving || this.signingIn || this.creatingAccount) { event?.preventDefault(); return; }
    this.saveDialog?.nativeElement.close();
    this.account.password = '';
    if (this.auth.getRedirectUrl().startsWith('/start-a-solution')) {
      this.auth.setRedirectUrl('');
      clearAuthReturn();
    }
  }

  private prepareAuth(): boolean {
    this.flushDraft();
    if (this.externalDraft) { this.accountError = 'Choose which tab’s draft to keep before signing in.'; return false; }
    if (this.storageMode === 'memory') {
      this.accountError = 'Browser storage is unavailable. Download your brief before leaving this page, or allow browser storage and try again.';
      return false;
    }
    const destination = '/start-a-solution?save=1';
    this.auth.setRedirectUrl(destination);
    try { sessionStorage.setItem('redirectTo', destination); } catch { /* AuthService also retains the destination. */ }
    return true;
  }

  async googleSignIn() {
    if (this.signingIn || this.saving || !this.prepareAuth()) return;
    this.signingIn = true;
    this.accountError = '';
    try { await this.auth.signInWithGoogle(); }
    catch { this.accountError = 'Sign-in didn’t finish. Your draft is still here. Try again, use email, or keep working as a guest.'; }
    finally { if (!this.destroyed) this.signingIn = false; }
  }

  emailAuth(signup: boolean) {
    if (this.signingIn || this.saving || !this.prepareAuth()) return;
    if (signup) { this.emailMode = true; this.accountError = ''; return; }
    void this.router.navigate(['/login'], { queryParams: { redirectTo: '/start-a-solution?save=1' } });
  }

  async createAccount(form: NgForm) {
    if (this.creatingAccount || this.signingIn || this.saving) return;
    this.accountAttempted = true;
    form.control.markAllAsTouched();
    if (form.invalid || !this.account.firstName.trim() || !this.account.lastName.trim() || !this.account.agreed || !this.prepareAuth()) return;
    this.creatingAccount = true;
    this.accountError = '';
    try {
      const result = await this.auth.register(
        this.account.firstName.trim(), this.account.lastName.trim(), this.account.email.trim(), this.account.password,
        'Start a community solution and collaborate in Global Solutions Lab.', [],
      );
      this.emailMode = false;
      if (result.status === 'recovered-verified') {
        this.accountNotice = 'Your account already exists and is verified. Log in to continue with this draft.';
      } else {
        this.accountNotice = 'Your account is ready. Check your inbox to verify your email, then return to this tab. Your draft stays here.';
      }
    } catch (error: any) {
      const code = String(error?.code || '');
      this.accountError = code.includes('weak-password') ? 'Choose a stronger password, then try again.'
        : code.includes('invalid-email') ? 'Check your email address and try again.'
        : code.includes('too-many-requests') ? 'Please wait a moment before trying again. Your draft is safe.'
        : 'Account setup didn’t finish. If you already have an account, log in below. Otherwise try again; your draft is still here.';
    } finally { this.account.password = ''; if (!this.destroyed) this.creatingAccount = false; }
  }

  async checkEmailVerification() {
    if (this.checkingEmail || this.creatingAccount) return;
    this.checkingEmail = true;
    this.accountError = '';
    try {
      if (await this.auth.syncEmailVerified()) {
        if (this.user) this.user = { ...this.user, verified: true };
        this.accountNotice = 'Your email is verified. You can save and open your workspace.';
      } else this.accountError = 'Your email isn’t verified yet. Open the link in your inbox, then return here and check again.';
    } catch { this.accountError = 'We couldn’t check verification yet. Please try again.'; }
    finally { if (!this.destroyed) this.checkingEmail = false; }
  }

  async resendVerification() {
    if (this.resendingEmail || this.creatingAccount) return;
    this.resendingEmail = true;
    this.accountError = '';
    try { await this.auth.resendVerificationEmail(); this.accountNotice = 'Verification email sent. Check your inbox, then return to this tab.'; }
    catch { this.accountError = 'We couldn’t send another email yet. Check your inbox or wait a minute and try again.'; }
    finally { if (!this.destroyed) this.resendingEmail = false; }
  }

  async saveWorkspace() {
    if (this.saving || this.signingIn || !this.user || !this.hasProblem || this.externalDraft) return;
    if (this.saved) { if (this.savedForCurrentUser) this.openWorkspace(); return; }
    if (this.user.verified !== true) {
      this.accountError = 'Verify your email before saving your workspace. Your draft stays here.';
      return;
    }
    this.saving = true;
    this.accountError = '';
    const snapshot = structuredClone(this.draft);
    const user = { ...this.user };
    let saveDeadline: ReturnType<typeof setTimeout> | undefined;
    try {
      // Keep Firestore and workspace construction out of the starter's initial chunk.
      const { StarterWorkspaceService } = await import('./starter-workspace.service');
      const solutionId = await Promise.race([
        this.injector.get(StarterWorkspaceService).create(snapshot, user),
        new Promise<never>((_, reject) => { saveDeadline = setTimeout(() => reject(new Error('save-timeout')), 15000); }),
      ]);
      this.draft.exported = { solutionId, ownerUid: user.uid! };
      this.flushDraft();
      this.openWorkspace();
    } catch {
      this.accountError = 'We couldn’t open your workspace yet. Your browser draft is safe. Check your connection and try again; retrying won’t create a duplicate.';
    } finally { clearTimeout(saveDeadline); if (!this.destroyed) this.saving = false; }
  }

  openWorkspace() {
    if (!this.savedForCurrentUser) return;
    this.saveDialog?.nativeElement.close();
    void this.router.navigate(['/playground-steps', this.draft.exported!.solutionId], { queryParams: { step: this.draft.step } });
  }

  download() {
    const blob = new Blob([starterText(this.draft)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-community-solution.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.downloadNotice = 'Your brief has been downloaded.';
  }

  startAnother() {
    this.flushDraft();
    this.draft = newStarterDraft();
    this.overview = false;
    this.showNewConfirmation = false;
    this.error = '';
    this.externalDraft = null;
    this.flushDraft();
    this.focusTimer = setTimeout(() => this.problemInput?.nativeElement.focus());
  }
}
