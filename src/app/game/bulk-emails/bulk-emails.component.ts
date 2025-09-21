import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from 'src/app/services/data.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-bulk-emails',
  templateUrl: './bulk-emails.component.html',
  styleUrls: ['./bulk-emails.component.css'],
})
export class BulkEmailsComponent implements OnDestroy {
  isLoggedIn = false;
  showModal = false;

  form: FormGroup;
  copiedSubject = false;
  copiedHtml = false;

  totalBytes = 0;
  lineCount = 0;

  wrapHtml = true; // uses [(ngModel)] with standalone:true
  baseUrl = ''; // uses [(ngModel)] with standalone:true
  previewWidth: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  finalHtml = '';

  isUploading = false;
  uploadProgressText = '';

  testEmail = '';
  testPreheader = '';
  sending = false;
  sendResult = '';

  recentUploads: Array<{ url: string; name: string }> = [];

  readonly placeholderHtml =
    '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#334155"><p>Paste HTML on the left to preview.</p></body></html>';

  private draftKey = 'bulkEmail.templateDraft.v1';
  private uploadsKey = 'bulkEmail.recentUploads.v1';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('htmlEditor') htmlEditor!: ElementRef<HTMLTextAreaElement>;

  constructor(
    public auth: AuthService,
    private fb: FormBuilder,
    private data: DataService,
    private fns: AngularFireFunctions
  ) {
    this.form = this.fb.group({
      subject: ['', [Validators.required, Validators.maxLength(200)]],
      html: ['', [Validators.required]],
    });

    this.auth
      .getCurrentUserPromise()
      .then((user) => (this.isLoggedIn = !!user));

    // Restore drafts
    const saved = localStorage.getItem(this.draftKey);
    if (saved) {
      try {
        this.form.patchValue(JSON.parse(saved), { emitEvent: false });
      } catch {}
    }
    const savedUploads = localStorage.getItem(this.uploadsKey);
    if (savedUploads) {
      try {
        this.recentUploads = JSON.parse(savedUploads);
      } catch {}
    }

    this.form.valueChanges.subscribe(() => {
      if (this.showModal) this.recompute();
      this.saveDraft();
    });

    this.recompute();
  }

  /* ---------- Modal ---------- */
  openModal(): void {
    this.showModal = true;
    this.recompute();
    setTimeout(() => this.htmlEditor?.nativeElement?.focus(), 0);
  }
  closeModal(): void {
    this.showModal = false;
  }

  /* ---------- Upload flow ---------- */
  onPickImage(): void {
    this.fileInput?.nativeElement?.click();
  }

  async onImageChosen(evt: Event): Promise<void> {
    const input = evt.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    input.value = '';

    try {
      this.isUploading = true;
      this.uploadProgressText = file.name;

      // IMPORTANT: use an EVEN number of segments so any Firestore doc write in the service is valid.
      // Storage path: bulk-mails/{uuid}/files/{timestamp-filename}
      const uniqueId = this.safeId();
      const storagePath = `bulk-mails/${uniqueId}/files/${Date.now()}-${
        file.name
      }`;
      const metadata = { contentType: file.type };

      const url = await this.data.startUpload(file, storagePath, '', metadata);

      if (url) {
        this.insertImageAtCursor(url, file.name);
        this.rememberUpload(url, file.name);
      }
    } catch (e) {
      console.error('Upload failed', e);
      alert('Image upload failed. Please try again.');
    } finally {
      this.isUploading = false;
      this.uploadProgressText = '';
    }
  }

  insertImageAtCursor(url: string, name = 'image'): void {
    const snippet =
      `<img src="${this.escapeAttr(url)}" alt="${this.escapeAttr(
        name
      )}" width="600" ` +
      `style="max-width:100%; height:auto; display:block; border:0; outline:none; text-decoration:none;">`;
    this.insertAtCursor(snippet + '\n');
  }

  private insertAtCursor(snippet: string): void {
    const area = this.htmlEditor?.nativeElement;
    const control = this.form.get('html');
    const current = (control?.value || '').toString();

    if (!area || !control) {
      this.form.patchValue({ html: current + snippet });
      this.recompute();
      return;
    }

    const start = area.selectionStart ?? current.length;
    const end = area.selectionEnd ?? start;
    const next = current.slice(0, start) + snippet + current.slice(end);
    control.setValue(next);
    this.recompute();

    const pos = start + snippet.length;
    setTimeout(() => {
      area.focus();
      area.setSelectionRange(pos, pos);
    }, 0);
  }

  private rememberUpload(url: string, name: string): void {
    this.recentUploads.unshift({ url, name });
    this.recentUploads = this.recentUploads.slice(0, 6);
    localStorage.setItem(this.uploadsKey, JSON.stringify(this.recentUploads));
  }

  private safeId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as any).randomUUID();
    }
    return (
      'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    );
  }

  /* ---------- Preview pipeline ---------- */
  recompute(): void {
    const subject = (this.form.value.subject || '').trim();
    const rawHtml = this.form.value.html || '';

    this.totalBytes = new TextEncoder().encode(subject + rawHtml).length;
    this.lineCount = rawHtml.split('\n').length;

    const sanitized = this.stripScripts(rawHtml);
    const withBase = this.injectBaseTagIfNeeded(sanitized, this.baseUrl);
    this.finalHtml = this.wrapHtml
      ? this.wrapEnvelope(withBase, subject)
      : withBase;
  }

  private stripScripts(html: string): string {
    let cleaned = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '');
    return cleaned;
  }
  private injectBaseTagIfNeeded(html: string, baseUrl?: string): string {
    if (!baseUrl) return html;
    if (/<base\s/i.test(html)) return html;
    if (/<head[\s>]/i.test(html)) {
      return html.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="${this.escapeAttr(baseUrl)}">`
      );
    }
    return `<head><base href="${this.escapeAttr(baseUrl)}"></head>` + html;
  }
  private wrapEnvelope(innerHtml: string, subject: string): string {
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      `<title>${this.escapeHtml(subject || 'Email')}</title>`,
      '<meta http-equiv="x-ua-compatible" content="ie=edge">',
      '</head>',
      '<body>',
      innerHtml,
      '</body>',
      '</html>',
    ].join('');
  }
  private escapeHtml(s: string): string {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  private escapeAttr(s: string): string {
    return this.escapeHtml(s);
  }

  copySubject(): void {
    const s = (this.form.value.subject || '').toString();
    navigator.clipboard.writeText(s).then(() => {
      this.copiedSubject = true;
      setTimeout(() => (this.copiedSubject = false), 900);
    });
  }
  copyHtml(): void {
    const h = (this.form.value.html || '').toString();
    navigator.clipboard.writeText(h).then(() => {
      this.copiedHtml = true;
      setTimeout(() => (this.copiedHtml = false), 900);
    });
  }
  openInNewTab(): void {
    const url = URL.createObjectURL(
      new Blob([this.finalHtml || this.placeholderHtml], { type: 'text/html' })
    );
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  downloadHtml(): void {
    const a = document.createElement('a');
    a.download = this.safeFileName(
      (this.form.value.subject || 'email') + '.html'
    );
    a.href = URL.createObjectURL(
      new Blob([this.finalHtml || this.placeholderHtml], { type: 'text/html' })
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  }

  setPreview(kind: 'desktop' | 'tablet' | 'mobile'): void {
    this.previewWidth = kind;
  }
  get previewFrameStyle() {
    switch (this.previewWidth) {
      case 'mobile':
        return { width: '412px' };
      case 'tablet':
        return { width: '820px' };
      default:
        return { width: '100%' };
    }
  }

  resetForm(): void {
    this.form.reset({ subject: '', html: '' });
    this.recompute();
    localStorage.removeItem(this.draftKey);
  }
  loadSample(): void {
    const sampleSubject = 'Welcome to NewWorld Game 🌍';
    const sampleHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7f9;padding:24px 0">
        <tr><td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="background:#ffffff;border-radius:12px;overflow:hidden">
            <tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:32px;color:#111827">Welcome to NewWorld Game</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:22px;color:#374151">Thanks for joining! This is a sample HTML email.</p>
              <p style="margin:0 0 24px">
                <a href="https://newworld-game.org" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">
                  Explore Now
                </a>
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
              <p style="margin:0;font-size:12px;color:#6b7280">You’re receiving this email because you signed up for updates.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>`;
    this.form.patchValue({ subject: sampleSubject, html: sampleHtml });
    this.recompute();
  }

  private saveDraft(): void {
    localStorage.setItem(this.draftKey, JSON.stringify(this.form.value));
  }
  private safeFileName(name: string): string {
    return name.replace(/[^\w.\-]+/g, '_');
  }

  @HostListener('document:keydown', ['$event'])
  onDocKeydown(e: KeyboardEvent) {
    if (!this.showModal) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this.closeModal();
    if (e.key === 'Escape') this.closeModal();
  }

  ngOnDestroy(): void {
    this.saveDraft();
  }

  get canSendTest(): boolean {
    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.testEmail);
    const hasSubject = !!(this.form.value.subject || '').trim();
    const hasHtml = !!(this.finalHtml || '').trim();
    return emailOk && hasSubject && hasHtml;
  }

  async sendTest(): Promise<void> {
    this.sendResult = '';
    if (!this.canSendTest) return;

    try {
      this.sending = true;

      const payload = {
        to: this.testEmail.trim(),
        subject: (this.form.value.subject || '').trim(),
        html: this.finalHtml,
        preheader: this.testPreheader || '',
      };

      const callable = this.fns.httpsCallable('sendBulkTestEmail'); // compat API returns Observable
      const res: any = await firstValueFrom(callable(payload));

      if (res?.ok) {
        const msgId = res.messageId ? ` (id: ${res.messageId})` : '';
        this.sendResult = `✅ Test sent${msgId}`;
      } else {
        this.sendResult = '⚠️ Sent, but no confirmation received.';
      }
    } catch (e: any) {
      console.error(e);
      this.sendResult = '❌ Failed to send test.';
      alert(e?.message || 'Failed to send test email.');
    } finally {
      this.sending = false;
    }
  }
}
