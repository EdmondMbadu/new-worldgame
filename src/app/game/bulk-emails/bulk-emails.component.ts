import { Component, HostListener, OnDestroy } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

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

  wrapHtml = true;
  baseUrl = '';
  previewWidth: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  finalHtml = '';

  readonly placeholderHtml =
    '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#334155"><p>Paste HTML on the left to preview.</p></body></html>';

  private draftKey = 'bulkEmail.templateDraft.v1';

  constructor(public auth: AuthService, private fb: FormBuilder) {
    this.form = this.fb.group({
      subject: ['', [Validators.required, Validators.maxLength(200)]],
      html: ['', [Validators.required]],
    });

    this.auth
      .getCurrentUserPromise()
      .then((user) => (this.isLoggedIn = !!user));

    const saved = localStorage.getItem(this.draftKey);
    if (saved) {
      try {
        this.form.patchValue(JSON.parse(saved), { emitEvent: false });
      } catch {}
    }

    this.form.valueChanges.subscribe(() => {
      if (this.showModal) this.recompute();
      this.saveDraft();
    });

    this.recompute();
  }

  openModal(): void {
    this.showModal = true;
    this.recompute();
    setTimeout(() => {
      document
        .querySelector<HTMLInputElement>('[formControlName="subject"]')
        ?.focus();
    }, 0);
  }
  closeModal(): void {
    this.showModal = false;
  }

  /* ------- Computation / preview ------- */
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

  /* ------- Utilities ------- */
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
}
