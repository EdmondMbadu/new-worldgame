import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SolutionService } from '../../services/solution.service';
import { DataService } from '../../services/data.service';
import { CLASS_DRAFT_KEY, ClassDraft, emptyClassDraft, readClassDraft, safeImageUrl } from './class-draft';
import { finishClassSetup, hasPendingClassSetup, rememberClassSetup } from './class-setup-intent';

@Component({
  selector: 'app-create-class', standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create-class.component.html', styleUrls: ['./create-class.component.css'],
})
export class CreateClassComponent implements OnInit, OnDestroy {
  draft: ClassDraft = emptyClassDraft();
  account = { firstName: '', lastName: '', email: '', password: '', confirmation: '', agreed: false };
  loadingSession = true;
  submitting = false;
  verified = false;
  user: any = null;
  error = '';
  notice = '';
  storageNotice = '';
  showPassword = false;
  attempted = false;
  accountAttempted = false;
  accountCreated = false;
  showClassIntroduction = false;
  checkingVerification = false;
  uploading: { logo: boolean; cover: boolean } = { logo: false, cover: false };
  uploadError: { logo: string; cover: string } = { logo: '', cover: '' };
  readonly maxImageBytes = 5 * 1024 * 1024;
  private readonly imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private authSubscription?: Subscription;
  private sessionRevision = 0;
  readonly returnUrl = '/create-class';
  @ViewChild('stepPanel') stepPanel?: ElementRef<HTMLElement>;
  private focusTimer?: ReturnType<typeof setTimeout>;

  constructor(public auth: AuthService, private afAuth: AngularFireAuth,
    private afs: AngularFirestore, private fns: AngularFireFunctions,
    private router: Router, private route: ActivatedRoute, private solution: SolutionService, private title: Title,
    private data: DataService) {}

  ngOnInit() {
    this.title.setTitle('Create your class space | Global Solutions Lab');
    try { this.draft = readClassDraft(sessionStorage); } catch { /* Optional browser storage. */ }
    const schoolId = this.route.snapshot.queryParamMap.get('sid');
    if (schoolId) this.draft.schoolId = schoolId;
    this.authSubscription = this.auth.user$.subscribe({ next: async user => {
      const revision = ++this.sessionRevision;
      this.user = user;
      this.verified = false;
      try {
        const firebaseUser = await this.afAuth.currentUser;
        if (revision !== this.sessionRevision) return;
        this.verified = !!user && firebaseUser?.uid === user.uid &&
          (!!firebaseUser?.emailVerified || !!firebaseUser?.providerData.some(p => ['google.com', 'microsoft.com', 'apple.com', 'facebook.com', 'twitter.com'].includes(p?.providerId || '')));
        this.showClassIntroduction = this.verified && hasPendingClassSetup(user.uid) && !this.introductionSeen(user.uid);
        if (user && this.draft.ownerUid && this.draft.ownerUid !== user.uid) {
          this.draft = emptyClassDraft();
          this.saveDraft();
          this.notice = 'You are signed in with a different account. Start a new class below.';
        }
      } catch { this.error = 'We could not check your account. Refresh this page to try again.'; }
      finally { if (revision === this.sessionRevision) this.loadingSession = false; }
    }, error: () => {
      this.loadingSession = false;
      this.error = 'We could not check your account. Refresh this page to try again.';
    } });
  }
  ngOnDestroy() { this.authSubscription?.unsubscribe(); ++this.sessionRevision; clearTimeout(this.focusTimer); }

  private focusStep() {
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => {
      const panel = this.stepPanel?.nativeElement;
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private introductionSeen(uid: string) {
    try { return sessionStorage.getItem('gsl.class-introduction.' + uid) === 'seen'; }
    catch { return false; }
  }
  continueToClass() {
    this.showClassIntroduction = false;
    this.notice = '';
    try { sessionStorage.setItem('gsl.class-introduction.' + this.user.uid, 'seen'); } catch { /* Optional storage. */ }
    this.focusStep();
  }
  async checkVerification() {
    if (this.checkingVerification || this.submitting) return;
    this.checkingVerification = true;
    this.error = '';
    try {
      if (await this.auth.syncEmailVerified()) {
        this.verified = true;
        this.showClassIntroduction = !this.introductionSeen(this.user.uid);
        this.notice = '';
        this.focusStep();
      } else this.error = 'Your email is not verified yet. Open the link in your inbox, then select this button again.';
    } catch { this.error = 'We could not check your email yet. Please try again.'; }
    finally { this.checkingVerification = false; }
  }

  saveDraft() {
    try { sessionStorage.setItem(CLASS_DRAFT_KEY, JSON.stringify(this.draft)); }
    catch { this.storageNotice = 'Draft saving is unavailable in this browser. Keep this tab open while you finish setup.'; }
  }
  get coverBackground() { return this.draft.coverImage ? `url("${this.draft.coverImage.replace(/"/g, '%22')}")` : null; }
  get isUploading() { return this.uploading.logo || this.uploading.cover; }
  get previewInitials() {
    const words = (this.draft.name.trim() || this.draft.institutionName.trim() || 'Class').split(/\s+/).filter(w => /[a-z0-9]/i.test(w));
    return words.slice(0, 2).map(w => w.replace(/[^a-z0-9]/gi, '').charAt(0)).join('').toUpperCase() || 'C';
  }
  async uploadImage(kind: 'logo' | 'cover', input: HTMLInputElement) {
    const file = input.files?.item(0);
    input.value = '';
    if (!file || this.uploading[kind]) return;
    this.uploadError[kind] = '';
    if (!this.imageTypes.includes((file.type || '').toLowerCase())) { this.uploadError[kind] = 'Use a JPG, PNG, or WebP image.'; return; }
    if (file.size > this.maxImageBytes) { this.uploadError[kind] = 'Choose an image under 5 MB.'; return; }
    const firebaseUser = await this.afAuth.currentUser;
    if (!firebaseUser) { this.signIn(); return; }
    this.uploading[kind] = true;
    try {
      if (!this.draft.classId) this.draft.classId = this.afs.createId();
      const folder = kind === 'logo' ? 'logo' : 'feature';
      const url = safeImageUrl(await this.data.startUpload(file, `challenge-page/${this.draft.classId}/${folder}`, 'false', undefined, this.maxImageBytes));
      if (!url) throw new Error('upload-failed');
      if (kind === 'logo') this.draft.logoImage = url; else this.draft.coverImage = url;
      this.saveDraft();
    } catch { this.uploadError[kind] = 'That image did not upload. Please try again.'; }
    finally { this.uploading[kind] = false; }
  }
  removeImage(kind: 'logo' | 'cover') {
    if (kind === 'logo') this.draft.logoImage = ''; else this.draft.coverImage = '';
    this.uploadError[kind] = '';
    this.saveDraft();
  }
  async switchAccount() {
    this.draft.ownerUid = '';
    this.saveDraft();
    await this.afAuth.signOut().catch(() => undefined);
    this.signIn();
  }
  get previewSubtitle() {
    return [this.draft.independentEducator ? 'Independent educator' : this.draft.institutionName.trim() || 'Your school or university', this.draft.courseCode.trim(), this.draft.term.trim()].filter(Boolean).join(' · ');
  }
  signIn() {
    this.saveDraft();
    this.auth.setRedirectUrl(this.returnUrl);
    void this.router.navigate(['/login'], { queryParams: { redirectTo: this.returnUrl } });
  }
  async createAccount(form: NgForm) {
    if (this.submitting) return;
    this.accountAttempted = true;
    form.control.markAllAsTouched();
    this.error = '';
    if (form.invalid || !this.account.firstName.trim() || !this.account.lastName.trim() || !this.account.agreed || this.account.password !== this.account.confirmation) return;
    this.submitting = true;
    this.saveDraft();
    this.auth.setRedirectUrl(this.returnUrl);
    try {
      sessionStorage.setItem('redirectTo', this.returnUrl);
    } catch { /* The route also carries the return destination. */ }
    try {
      const outcome = await this.auth.register(this.account.firstName.trim(), this.account.lastName.trim(), this.account.email.trim(), this.account.password, 'Teach a class with Global Solutions Lab.', []);
      this.account.password = '';
      this.account.confirmation = '';
      const firebaseUser = await this.afAuth.currentUser;
      if (firebaseUser) {
        rememberClassSetup(firebaseUser.uid);
        this.draft.ownerUid = firebaseUser.uid;
        this.saveDraft();
      }
      if (outcome.status === 'recovered-verified') {
        await this.router.navigate(['/login'], { queryParams: { redirectTo: this.returnUrl } });
      } else {
        this.accountCreated = true;
        this.notice = 'Your account is ready. Verify your email next, then we’ll help you create your class space.';
        this.focusStep();
      }
    } catch (error: any) {
      this.error = this.friendlyError(error);
    } finally { this.submitting = false; }
  }
  verifyEmail() {
    this.saveDraft();
    this.auth.setRedirectUrl(this.returnUrl);
    void this.router.navigate(['/verify-email'], { queryParams: { redirectTo: this.returnUrl } });
  }
  async resendVerification() {
    if (this.submitting) return;
    this.submitting = true;
    this.error = '';
    try { await this.auth.resendVerificationEmail(); this.notice = 'Verification email sent. Check your inbox, then continue below.'; }
    catch (error) { this.error = this.friendlyError(error); }
    finally { this.submitting = false; }
  }
  async createClass(form: NgForm) {
    if (this.submitting) return;
    this.attempted = true;
    form.control.markAllAsTouched();
    this.error = '';
    if (form.invalid || !this.draft.name.trim() || (!this.draft.independentEducator && !this.draft.institutionName.trim())) {
      this.focusFirstInvalid();
      return;
    }
    if (this.isUploading) { this.error = 'Wait for your images to finish uploading.'; return; }
    this.submitting = true;
    try {
      const firebaseUser = await this.afAuth.currentUser;
      if (!firebaseUser || !this.user?.uid || firebaseUser.uid !== this.user.uid) { this.signIn(); return; }
      if (!this.verified) { this.verifyEmail(); return; }
      // Refresh verification claims before the server checks them.
      await firebaseUser.getIdToken(true);
      if (!this.draft.classId) this.draft.classId = this.afs.createId();
      this.draft.ownerUid = firebaseUser.uid;
      this.saveDraft();
      const { name, institutionName, independentEducator, courseCode, term, description, schoolId } = this.draft;
      const result = await firstValueFrom(this.fns.httpsCallable('createClassSpace')({
        classId: this.draft.classId, name, institutionName, independentEducator, courseCode, term, description, schoolId,
      }));
      const classId = result.classId as string;
      // Custom images are optional; the class keeps its default artwork if this update fails.
      const images: Record<string, string> = {};
      if (this.draft.logoImage) images['logoImage'] = this.draft.logoImage;
      if (this.draft.coverImage) images['imageChallenge'] = this.draft.coverImage;
      if (Object.keys(images).length) await this.afs.doc(`challengePages/${classId}`).update(images).catch(() => undefined);
      // The meeting room is optional; its provider must not block class creation.
      void firstValueFrom(this.solution.createMeetLink(classId, this.draft.name.trim()))
        .then(meeting => meeting?.hangoutLink ? this.afs.doc(`challengePages/${classId}`).update({ meetLink: meeting.hangoutLink }) : undefined)
        .catch(() => { /* Instructors can set a meeting link in workspace settings. */ });
      const opened = await this.router.navigate(['/home-challenge', classId], { queryParams: { setup: '1' } });
      if (opened) {
        finishClassSetup(firebaseUser.uid);
        try { sessionStorage.removeItem(CLASS_DRAFT_KEY); } catch { /* Optional storage. */ }
      } else this.error = 'Your class was created. Select Create class space again to open it.';
    } catch (error: any) { this.error = this.friendlyError(error); }
    finally { this.submitting = false; }
  }
  private focusFirstInvalid() {
    setTimeout(() => (this.stepPanel?.nativeElement.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
  }
  private friendlyError(error: any): string {
    const code = String(error?.code || '');
    if (/email-already-in-use|existing-account-sign-in-required/.test(code)) return 'This email already has an account. Sign in with your existing password or social sign-in to continue.';
    if (code.includes('weak-password')) return 'Choose a password with at least 6 characters.';
    if (code.includes('invalid-email')) return 'Please enter a valid email address.';
    if (code.includes('resource-exhausted')) return 'Please wait one minute, then try again.';
    if (/unavailable|network-request-failed|deadline-exceeded/.test(code)) return 'We could not connect. Your class details are saved; please try again.';
    if (code.includes('unauthenticated')) return 'Your session has expired. Sign in again to continue.';
    if (code.includes('not-found')) return 'Class setup is temporarily unavailable. Your details are saved; please try again later.';
    if (/permission-denied|failed-precondition|invalid-argument|already-exists/.test(code)) return error.message || 'Please check your account and class details.';
    return 'We could not finish this step. Your class details are saved; please try again.';
  }
}
