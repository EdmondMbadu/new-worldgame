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
import { firstValueFrom, map, Subscription } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore';

type BulkRun = {
  runId: string;
  title: string;
  subject: string;
  preheader?: string;
  createdAt: any; // Timestamp
  createdBy: string;
  totals: {
    requested: number;
    valid: number;
    invalid: number;
    duplicates: number;
  };
  status: 'running' | 'completed' | 'failed';
  completedAt?: any;
  batches: Array<{
    batch: number;
    count: number;
    statusCode?: number;
    messageId?: string;
  }>;
};

type ContactList = {
  id: string;
  name: string;
  createdAt: any; // Timestamp | Date
  createdBy: string;
  storagePath: string; // Firebase Storage path
  downloadUrl: string; // public URL
  countValid: number;
  countInvalid: number;
  countDupes: number;
  note?: string; // optional helper text
};

@Component({
  selector: 'app-bulk-emails',
  templateUrl: './bulk-emails.component.html',
  styleUrls: ['./bulk-emails.component.css'],
})
export class BulkEmailsComponent implements OnDestroy {
  contactListsOpen = false;

  contactLists: ContactList[] = [];
  private contactListsSub?: Subscription;

  contactUploading = false;
  contactUploadText = '';
  contactError = '';

  reports: BulkRun[] = [];
  private reportsSub?: Subscription;

  selectedTemplateId: string = '';

  reportsOpen = false; // start collapsed
  builderOpen = false;

  // Templates state
  templates: Array<{
    id: string;
    name: string;
    html: string;
    createdAt: any;
    createdBy: string;
  }> = [];
  private templatesSub?: Subscription;

  templateName = '';
  templateHtml = '';
  templateSaving = false;
  templateError = '';
  templateModalOpen = false;

  // --- View mode ---
  isMonthMode = false;

  // Month histogram (per day 1..N)
  monthDays: number[] = [];
  monthBinsSucceeded: number[] = [];
  monthBinsFailed: number[] = [];
  monthMaxBin = 1;
  monthSummary = {
    requested: 0,
    succeeded: 0,
    failed: 0,
    invalid: 0,
    duplicates: 0,
  };
  selectedMonth = this.toMonthInputValue(new Date()); // "YYYY-MM"

  Math = Math;
  // --- Daily Summary State ---
  selectedDate = this.toDateInputValue(new Date()); // "YYYY-MM-DD"
  summaryLoading = false;

  dayRuns: BulkRun[] = [];
  daySummary = {
    requested: 0,
    succeeded: 0,
    failed: 0,
    invalid: 0,
    duplicates: 0,
  };

  // Histogram (per hour 0..23)
  hours = Array.from({ length: 24 }, (_, i) => i);
  binsSucceeded: number[] = new Array(24).fill(0);
  binsFailed: number[] = new Array(24).fill(0);
  maxBin = 0;

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

  // CSV state
  @ViewChild('csvInput') csvInput!: ElementRef<HTMLInputElement>;
  csvValid: string[] = [];
  csvInvalid: string[] = [];
  csvDupes = 0;

  sendingBulk = false;
  bulkProgressText = '';
  bulkResult = '';

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
    private fns: AngularFireFunctions,
    private afs: AngularFirestore
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

  toggleSection(key: 'reportsOpen' | 'builderOpen' | 'contactListsOpen'): void {
    // avoid toggling <details> twice if called from inside <summary>
    (this as any)[key] = !(this as any)[key];
  }
  ngOnInit() {
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
      this.subscribeReports(); // existing
      this.subscribeTemplates(); // NEW – after auth
      this.subscribeContactLists();
    });
  }

  private async subscribeReports() {
    // Limit to current user’s runs; if you need server filtering, store createdBy and add a security rule.
    this.reportsSub = this.afs
      .collection<BulkRun>('bulk_mail_runs', (ref) =>
        ref
          .where('createdBy', '==', this.auth.currentUser?.uid || '__none__')
          .orderBy('createdAt', 'desc')
          .limit(10)
      )
      .valueChanges()
      .pipe(
        map((list) => list.map((x) => ({ ...x, batches: x.batches || [] })))
      )
      .subscribe((list) => {
        this.reports = list;
        // If the selected day is today, keep the summary fresh when reports update
        const todayStr = this.toDateInputValue(new Date());
        if (this.selectedDate === todayStr) {
          // Fire and forget; no await to avoid blocking stream
          this.loadDaySummary();
        }
      });

    if (this.isMonthMode) this.loadMonthSummary();
    else this.loadDaySummary();
  }

  async deleteReport(runId: string) {
    try {
      await this.afs.doc(`bulk_mail_runs/${runId}`).delete();
    } catch (e) {
      console.error('deleteReport', e);
      alert('Failed to delete report.');
    }
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
    this.templatesSub?.unsubscribe();
    this.contactListsSub?.unsubscribe();
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

  // --- CSV UI helpers ---
  pickCsv(): void {
    this.csvInput?.nativeElement?.click();
  }

  clearCsv(): void {
    this.csvValid = [];
    this.csvInvalid = [];
    this.csvDupes = 0;
    this.bulkResult = '';
    this.bulkProgressText = '';
    if (this.csvInput?.nativeElement) this.csvInput.nativeElement.value = '';
  }

  async onCsvChosen(evt: Event): Promise<void> {
    const input = evt.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;
    const file = input.files[0];

    try {
      const text = await file.text();
      this.parseCsv(text);
    } catch (e) {
      console.error('CSV read error', e);
      alert('Failed to read CSV file.');
    } finally {
      input.value = '';
    }
  }

  /**
   * Minimal CSV parser with header detection.
   * Handles quotes and commas inside quotes (basic).
   */
  parseCsv(raw: string): void {
    // normalize newlines
    const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows = this.csvToRows(text);
    if (!rows.length) {
      this.clearCsv();
      return;
    }

    // header row
    const header = rows[0].map((h) => h.trim().toLowerCase());
    // try to find email column
    const emailCandidates = [
      'email',
      'emails',
      'email_address',
      'emailaddress',
      'e-mail',
    ];
    let emailIdx = -1;
    for (const key of emailCandidates) {
      emailIdx = header.indexOf(key);
      if (emailIdx !== -1) break;
    }

    // if still not found, attempt fuzzy match
    if (emailIdx === -1) {
      emailIdx = header.findIndex((h) => /email/.test(h));
    }

    if (emailIdx === -1) {
      alert(
        'No "email" column found. Add a column header named "email" (or "emails").'
      );
      this.clearCsv();
      return;
    }

    // collect values
    const emails: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      if (!cols || !cols.length) continue;
      const value = (cols[emailIdx] || '').toString().trim();
      if (!value) continue;

      // support multiple recipients in a single cell separated by ; or ,
      const parts = value
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const p of parts) {
        const lower = p.toLowerCase();
        if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lower)) {
          if (!seen.has(lower)) {
            seen.add(lower);
            emails.push(lower);
          }
        } else {
          invalid.push(`Row ${i + 1}: "${p}"`);
        }
      }
    }

    this.csvValid = emails;
    this.csvInvalid = invalid;
    // crude duplicate estimate: invalid for bad format; dupes are total unique vs total raw tokens
    const totalTokens = rows
      .slice(1)
      .map((r) => (r[emailIdx] || '').toString())
      .join(';')
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean).length;
    this.csvDupes = Math.max(0, totalTokens - emails.length - invalid.length);
  }

  /**
   * Convert CSV text into rows of columns handling quoted fields.
   */
  private csvToRows(text: string): string[][] {
    const rows: string[][] = [];
    let i = 0,
      field = '',
      row: string[] = [],
      inQuotes = false;

    const pushField = () => {
      row.push(field);
      field = '';
    };
    const pushRow = () => {
      rows.push(row);
      row = [];
    };

    while (i < text.length) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          } // escaped quote
          inQuotes = false;
          i++;
          continue;
        } else {
          field += ch;
          i++;
          continue;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
          continue;
        }
        if (ch === ',') {
          pushField();
          i++;
          continue;
        }
        if (ch === '\n') {
          pushField();
          pushRow();
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }
    }
    // last field/row
    pushField();
    if (row.length > 1 || row[0] !== '') pushRow();
    return rows;
  }

  downloadSampleCsv(): void {
    const sample = [
      'email,first_name,last_name,company',
      'alice@example.com,Alice,Nguyen,Acme Inc',
      'bob@example.org,Bob,Rivera,Globex',
      'carol@example.net,Carol,Diaz,Initech',
      'duplicate@example.com,Dupe,One,Contoso',
      'duplicate@example.com,Dupe,Two,Contoso',
      'bad-email,Nope,Bad,InvalidCo',
    ].join('\n');

    const a = document.createElement('a');
    a.download = 'recipients_sample.csv';
    a.href = URL.createObjectURL(new Blob([sample], { type: 'text/csv' }));
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  }

  // --- Bulk send ---
  get canSendBulk(): boolean {
    const hasEmails = this.csvValid.length > 0;
    const hasSubject = !!(this.form.value.subject || '').trim();
    const hasHtml = !!(this.finalHtml || '').trim();
    return hasEmails && hasSubject && hasHtml && !this.sendingBulk;
  }

  async sendBulk(): Promise<void> {
    if (!this.canSendBulk) return;
    this.bulkResult = '';
    this.bulkProgressText = '';

    try {
      this.sendingBulk = true;
      this.bulkProgressText = `0 / ${this.csvValid.length}`;

      // call the new callable
      const callable = this.fns.httpsCallable('sendBulkHtml');
      const payload = {
        recipients: this.csvValid,
        subject: (this.form.value.subject || '').trim(),
        html: this.finalHtml,
        preheader: this.testPreheader || '',
        title: (this.form.value.subject || '').trim(), // or a custom title field
      };

      const res: any = await firstValueFrom(callable(payload));
      if (res?.ok) {
        this.bulkResult = `✅ Sent ${res.total} recipient(s) in ${
          Array.isArray(res.batches) ? res.batches.length : '?'
        } batch(es).`;
      } else {
        this.bulkResult = '⚠️ Bulk send completed with unknown status.';
      }
    } catch (e: any) {
      console.error('bulk send error', e);
      this.bulkResult = '❌ Bulk send failed. Check console/logs.';
    } finally {
      this.sendingBulk = false;
      this.bulkProgressText = '';
    }
  }

  /** Convert Date -> "YYYY-MM-DD" in local time */
  private toDateInputValue(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Parse "YYYY-MM-DD" to local day start/end */
  private getDayBoundsLocal(yyyyMmDd: string): { start: Date; end: Date } {
    // construct local midnight
    const [y, m, d] = yyyyMmDd.split('-').map((x) => parseInt(x, 10));
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
    return { start, end };
  }

  onDateChange(evt: Event): void {
    const el = evt.target as HTMLInputElement;
    const value = (el.value || '').trim();
    if (!value) return;
    this.selectedDate = value;
    this.loadDaySummary();
  }

  resetToToday(): void {
    this.selectedDate = this.toDateInputValue(new Date());
    this.loadDaySummary();
  }

  shiftDay(deltaDays: number): void {
    const [y, m, d] = this.selectedDate.split('-').map((x) => parseInt(x, 10));
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaDays);
    this.selectedDate = this.toDateInputValue(dt);
    this.loadDaySummary();
  }

  /**
   * Load all runs by current user for the selected calendar day (local),
   * then compute summary & per-hour histogram.
   */
  async loadDaySummary(): Promise<void> {
    this.summaryLoading = true;
    try {
      const { start, end } = this.getDayBoundsLocal(this.selectedDate);
      const uid = this.auth.currentUser?.uid || '__none__';

      // widen the query window to safely include cross-midnight completes/starts
      const startRange = new Date(start.getTime() - 24 * 60 * 60 * 1000); // -1 day
      const endRange = new Date(end.getTime() + 24 * 60 * 60 * 1000); // +1 day

      // Query by createdAt in wide range; we'll filter by "when" in code
      const snap = await this.afs
        .collection<BulkRun>('bulk_mail_runs', (ref) =>
          ref
            .where('createdAt', '>=', startRange)
            .where('createdAt', '<', endRange)
            .orderBy('createdAt', 'asc')
        )
        .get()
        .toPromise();

      const raw: BulkRun[] = (snap?.docs || []).map((d) => d.data() as BulkRun);

      // Same "when" we use to bucket: completedAt ?? createdAt
      const toWhen = (r: BulkRun): Date => {
        const cAt = (r as any).completedAt;
        const kAt = (r as any).createdAt;
        const completed = cAt?.toDate?.() ?? (cAt instanceof Date ? cAt : null);
        const created =
          kAt?.toDate?.() ?? (kAt instanceof Date ? kAt : null) ?? new Date();
        return completed ?? created;
      };

      // Keep only current user's runs whose "when" falls inside the selected [start, end)
      const runs = raw
        .filter((r) => r?.createdBy === uid)
        .filter((r) => {
          const when = toWhen(r);
          return when >= start && when < end;
        });

      this.dayRuns = runs;

      // Reset summary + bins
      let requested = 0,
        invalid = 0,
        duplicates = 0,
        succeeded = 0,
        failed = 0;
      this.binsSucceeded = new Array(24).fill(0);
      this.binsFailed = new Array(24).fill(0);

      for (const r of runs) {
        requested += r?.totals?.requested || 0;
        invalid += r?.totals?.invalid || 0;
        duplicates += r?.totals?.duplicates || 0;

        const when = toWhen(r);
        const hour = when.getHours();

        const batches = Array.isArray(r.batches) ? r.batches : [];
        if (batches.length) {
          for (const b of batches) {
            const c = b?.count || 0;
            const code =
              typeof b?.statusCode === 'number' ? b.statusCode : null;

            if (code !== null) {
              if (code >= 200 && code < 300) {
                succeeded += c;
                this.binsSucceeded[hour] += c;
              } else if (code >= 400) {
                failed += c;
                this.binsFailed[hour] += c;
              }
            } else if (r.status === 'completed') {
              succeeded += c;
              this.binsSucceeded[hour] += c;
            }
          }
        } else if (r.status === 'completed') {
          const ok = r?.totals?.valid || 0;
          succeeded += ok;
          this.binsSucceeded[hour] += ok;
        }
      }

      this.daySummary = { requested, succeeded, failed, invalid, duplicates };
      this.maxBin = Math.max(
        1,
        ...this.hours.map((h) => this.binsSucceeded[h] + this.binsFailed[h])
      );
    } catch (e) {
      console.error('loadDaySummary error', e);
      this.dayRuns = [];
      this.daySummary = {
        requested: 0,
        succeeded: 0,
        failed: 0,
        invalid: 0,
        duplicates: 0,
      };
      this.binsSucceeded = new Array(24).fill(0);
      this.binsFailed = new Array(24).fill(0);
      this.maxBin = 1;
    } finally {
      this.summaryLoading = false;
    }
  }

  get yTicks(): Array<{ y: number; label: number }> {
    // 0..100 SVG units mapped to 0..maxBin counts
    const steps = [0, 0.25, 0.5, 0.75, 1];
    return steps.map((f) => {
      const label = Math.round(this.maxBin * f);
      const y = 110 - Math.round(100 * f); // same baseline as bars
      return { y, label };
    });
  }

  private getMonthBoundsLocal(yyyyMmDd: string): {
    start: Date;
    end: Date;
    daysInMonth: number;
  } {
    const [y, m] = yyyyMmDd.split('-').map((n) => parseInt(n, 10)); // yyyy-mm-dd -> yyyy, mm
    const first = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const next = new Date(y, m, 1, 0, 0, 0, 0);
    const daysInMonth = new Date(y, m, 0).getDate();
    return { start: first, end: next, daysInMonth };
  }

  async loadMonthSummary(): Promise<void> {
    this.summaryLoading = true;
    try {
      const { start, end, daysInMonth } = this.getMonthBoundsLocalFromYYYYMM(
        this.selectedMonth
      );
      const uid = this.auth.currentUser?.uid || '__none__';

      const snap = await this.afs
        .collection<BulkRun>('bulk_mail_runs', (ref) =>
          ref
            .where('createdAt', '>=', start)
            .where('createdAt', '<', end)
            .orderBy('createdAt', 'asc')
        )
        .get()
        .toPromise();

      const raw: BulkRun[] = (snap?.docs || [])
        .map((d) => d.data() as BulkRun)
        .filter((r) => r?.createdBy === uid);

      // same "when" logic as day view (completedAt ?? createdAt)
      const toWhen = (r: BulkRun): Date => {
        const cAt = (r as any).completedAt;
        const kAt = (r as any).createdAt;
        const completed = cAt?.toDate?.() ?? (cAt instanceof Date ? cAt : null);
        const created =
          kAt?.toDate?.() ?? (kAt instanceof Date ? kAt : null) ?? new Date();
        return completed ?? created;
      };

      // in-range runs by "when"
      const runs = raw.filter((r) => {
        const when = toWhen(r);
        return when >= start && when < end;
      });

      // init bins
      this.monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      this.monthBinsSucceeded = new Array(daysInMonth).fill(0);
      this.monthBinsFailed = new Array(daysInMonth).fill(0);

      let requested = 0,
        invalid = 0,
        duplicates = 0,
        succeeded = 0,
        failed = 0;

      for (const r of runs) {
        requested += r?.totals?.requested || 0;
        invalid += r?.totals?.invalid || 0;
        duplicates += r?.totals?.duplicates || 0;

        const when = toWhen(r);
        const dayIndex = when.getDate() - 1; // 0-based

        const batches = Array.isArray(r.batches) ? r.batches : [];
        if (batches.length) {
          for (const b of batches) {
            const c = b?.count || 0;
            const code =
              typeof b?.statusCode === 'number' ? b.statusCode : null;

            if (code !== null) {
              if (code >= 200 && code < 300) {
                succeeded += c;
                this.monthBinsSucceeded[dayIndex] += c;
              } else if (code >= 400) {
                failed += c;
                this.monthBinsFailed[dayIndex] += c;
              }
            } else if (r.status === 'completed') {
              succeeded += c;
              this.monthBinsSucceeded[dayIndex] += c;
            }
          }
        } else if (r.status === 'completed') {
          const ok = r?.totals?.valid || 0;
          succeeded += ok;
          this.monthBinsSucceeded[dayIndex] += ok;
        }
      }

      this.monthSummary = { requested, succeeded, failed, invalid, duplicates };
      this.monthMaxBin = Math.max(
        1,
        ...this.monthDays.map(
          (d) => this.monthBinsSucceeded[d - 1] + this.monthBinsFailed[d - 1]
        )
      );
    } finally {
      this.summaryLoading = false;
    }
  }

  private toMonthInputValue(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private getMonthBoundsLocalFromYYYYMM(yyyyMm: string): {
    start: Date;
    end: Date;
    daysInMonth: number;
  } {
    const [yStr, mStr] = yyyyMm.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10); // 1..12
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 1, 0, 0, 0, 0);
    const daysInMonth = new Date(y, m, 0).getDate();
    return { start, end, daysInMonth };
  }

  onMonthChange(evt: Event): void {
    const el = evt.target as HTMLInputElement;
    const value = (el.value || '').trim(); // "YYYY-MM"
    if (!value) return;
    this.selectedMonth = value;
    this.loadMonthSummary();
  }

  resetToThisMonth(): void {
    this.selectedMonth = this.toMonthInputValue(new Date());
    this.loadMonthSummary();
  }

  shiftMonth(deltaMonths: number): void {
    const [y, m] = this.selectedMonth.split('-').map((n) => parseInt(n, 10));
    const dt = new Date(y, m - 1, 1);
    dt.setMonth(dt.getMonth() + deltaMonths);
    this.selectedMonth = this.toMonthInputValue(dt);
    this.loadMonthSummary();
  }

  showDay(): void {
    this.isMonthMode = false;
    // keep continuity: base day off current month selection if you want
    // otherwise leave as-is; we’ll just refresh:
    this.loadDaySummary();
  }

  showMonth(): void {
    this.isMonthMode = true;
    // seed the month selector from the current selected day for continuity
    const [yy, mm] = this.selectedDate.split('-');
    this.selectedMonth = `${yy}-${mm}`;
    this.loadMonthSummary();
  }
  openTemplateModal() {
    this.templateModalOpen = true;
  }
  closeTemplateModal() {
    this.templateModalOpen = false;
  }

  /** Live list of templates for current user (compat-safe with IDs) */
  private subscribeTemplates() {
    const uid = this.auth.currentUser?.uid || '__none__';
    this.templatesSub = this.afs
      .collection('email_templates', (ref) =>
        ref.where('createdBy', '==', uid).orderBy('createdAt', 'desc')
      )
      .snapshotChanges()
      .subscribe((actions) => {
        this.templates = actions.map((a) => {
          const data = a.payload.doc.data() as any;
          const id = a.payload.doc.id;
          return {
            id,
            name: data.name || '(untitled)',
            html: data.html || '',
            createdAt: data.createdAt,
            createdBy: data.createdBy,
          };
        });
      });
  }

  /** File -> read text into textarea */
  onTemplateFile(evt: Event) {
    const input = evt.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;
    const file = input.files[0];
    file
      .text()
      .then((txt) => {
        this.templateHtml = txt || '';
      })
      .catch(() => {
        this.templateError = 'Failed to read HTML file.';
      })
      .finally(() => {
        input.value = '';
      });
  }

  /** Save new template */
  async saveTemplate() {
    this.templateError = '';
    const name = (this.templateName || '').trim();
    const html = (this.templateHtml || '').trim();
    if (!name || !html) return;

    try {
      this.templateSaving = true;
      const uid = this.auth.currentUser?.uid || '__none__';
      const id = this.afs.createId();
      await this.afs.doc(`email_templates/${id}`).set({
        id,
        name,
        html,
        createdBy: uid,
        createdAt: new Date(),
      });

      // Reset fields and close modal
      this.templateName = '';
      this.templateHtml = '';
      this.templateModalOpen = false;
    } catch (e) {
      console.error(e);
      this.templateError = 'Failed to save template.';
    } finally {
      this.templateSaving = false;
    }
  }

  /** Open template in a new tab */
  viewTemplate(t: { name: string; html: string }) {
    const blob = new Blob([t.html || ''], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  /** Delete template */
  async deleteTemplate(t: { id: string }) {
    if (!t?.id) return;
    try {
      await this.afs.doc(`email_templates/${t.id}`).delete();
    } catch (e) {
      console.error('deleteTemplate', e);
      alert('Failed to delete template.');
    }
  }

  downloadTemplate(t: { name: string; html: string }) {
    const name = (t.name || 'template').replace(/[^\w.\-]+/g, '_');
    const blob = new Blob([t.html || ''], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  useSelectedTemplate(): void {
    if (!this.selectedTemplateId) return;
    const t = this.templates.find((x) => x.id === this.selectedTemplateId);
    if (t) this.applyTemplate(t);
  }

  applyTemplate(t: { html: string }): void {
    // Replace the builder HTML with the template (subject unchanged)
    this.form.patchValue({ html: t.html || '' });
    this.recompute();
    // (Optional) focus the editor:
    setTimeout(() => this.htmlEditor?.nativeElement?.focus(), 0);
  }

  /** Live list of contact lists for current user */
  private subscribeContactLists() {
    const uid = this.auth.currentUser?.uid || '__none__';
    this.contactListsSub = this.afs
      .collection<ContactList>('contact_lists', (ref) =>
        ref.where('createdBy', '==', uid).orderBy('createdAt', 'desc')
      )
      .valueChanges()
      .subscribe((rows) => {
        this.contactLists = rows || [];
      });
  }

  /** Handle file chooser */
  async onContactFileChosen(evt: Event) {
    const input = evt.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;
    const file = input.files[0];
    input.value = '';

    this.contactError = '';
    this.contactUploading = true;
    this.contactUploadText = file.name;

    try {
      // read text for parsing stats
      const raw = await file.text();
      const parsed = this.parseContacts(raw, file.type || '', file.name);
      const baseName = (file.name || 'contacts')
        .replace(/\.[^/.]+$/, '')
        .slice(0, 80);

      // Upload original file to Storage (keep exact source)
      const listId = this.safeId();
      const storagePath = `contact-lists/${
        this.auth.currentUser?.uid || 'anon'
      }/${listId}/${Date.now()}-${file.name}`;
      const url = await this.data.startUpload(file, storagePath, '', {
        contentType: file.type || 'text/plain',
      });

      // Persist Firestore doc
      const doc: ContactList = {
        id: listId,
        name: baseName,
        createdAt: new Date(),
        createdBy: this.auth.currentUser?.uid || '__none__',
        storagePath,
        downloadUrl: url || '',
        countValid: parsed.valid.length,
        countInvalid: parsed.invalid.length,
        countDupes: parsed.dupes,
        note: parsed.note,
      };

      await this.afs.doc(`contact_lists/${listId}`).set(doc);
    } catch (e) {
      console.error('onContactFileChosen', e);
      this.contactError = 'Failed to add contact list.';
      alert(this.contactError);
    } finally {
      this.contactUploading = false;
      this.contactUploadText = '';
    }
  }

  /** Very small parser for CSV or TXT; returns stats */
  private parseContacts(
    raw: string,
    mime: string,
    fileName: string
  ): {
    valid: string[];
    invalid: string[];
    dupes: number;
    note?: string;
  } {
    const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    let emails: string[] = [];
    let invalid: string[] = [];

    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    if (/csv/i.test(mime) || /\.csv$/i.test(fileName)) {
      // try headered CSV using existing helper
      const rows = this.csvToRows(text);
      if (!rows.length)
        return { valid: [], invalid: [], dupes: 0, note: 'Empty file' };
      const header = rows[0].map((h) => h.trim().toLowerCase());
      let emailIdx = header.findIndex((h) => /email/.test(h));
      if (emailIdx === -1) {
        // fallback: treat as single column
        emailIdx = 0;
      }

      const rawTokens: string[] = [];
      for (let i = 1; i < rows.length; i++) {
        const value = (rows[i][emailIdx] || '').toString();
        if (!value) continue;
        value.split(/[;,]/).forEach((p) => rawTokens.push(p.trim()));
      }

      for (const token of rawTokens) {
        if (!token) continue;
        if (emailRegex.test(token.toLowerCase()))
          emails.push(token.toLowerCase());
        else invalid.push(token);
      }

      const unique = Array.from(new Set(emails));
      const dupes = Math.max(0, emails.length - unique.length);
      return {
        valid: unique,
        invalid,
        dupes,
        note: `Detected CSV (${header.join(', ')})`,
      };
    } else {
      // TXT: one email per line (allow commas/semicolons too)
      const tokens = text
        .split(/[\n;,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const token of tokens) {
        if (emailRegex.test(token.toLowerCase()))
          emails.push(token.toLowerCase());
        else invalid.push(token);
      }
      const unique = Array.from(new Set(emails));
      const dupes = Math.max(0, emails.length - unique.length);
      return { valid: unique, invalid, dupes, note: 'Detected TXT list' };
    }
  }

  /** Download the original uploaded file */
  downloadContactList(cl: ContactList) {
    if (cl?.downloadUrl) {
      const a = document.createElement('a');
      a.href = cl.downloadUrl;
      a.download = (cl.name || 'contacts') + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      alert('No download URL available.');
    }
  }

  /** Delete Firestore doc (and try to delete Storage object if supported) */
  async deleteContactList(cl: ContactList) {
    if (!cl?.id) return;
    const ok = confirm(`Delete contact list "${cl.name}"?`);
    if (!ok) return;

    try {
      await this.afs.doc(`contact_lists/${cl.id}`).delete();

      // Optional: if your DataService exposes deleteFile(storagePath)
      if ((this.data as any)?.deleteFile && cl.storagePath) {
        try {
          await (this.data as any).deleteFile(cl.storagePath);
        } catch {
          // ignore storage deletion errors
        }
      }
    } catch (e) {
      console.error('deleteContactList', e);
      alert('Failed to delete contact list.');
    }
  }
}
