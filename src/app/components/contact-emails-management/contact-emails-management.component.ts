import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { combineLatest, Subscription } from 'rxjs';
import firebase from 'firebase/compat/app';

import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';

type SourceKey = 'registered' | 'primer' | 'contact_list';

type ContactList = {
  id: string;
  name: string;
  createdAt: any;
  createdBy: string;
  storagePath: string;
  downloadUrl: string;
  countValid: number;
  countInvalid: number;
  countDupes: number;
  note?: string;
  fileName?: string;
  audienceLabel?: string;
  audienceCategory?: string;
  tags?: string[];
};

type DomainLabel = {
  id?: string;
  domain: string;
  label: string;
  category: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
  updatedBy?: string;
};

type ContactSeed = {
  email: string;
  source: SourceKey;
  sourceLabel: string;
  firstName?: string;
  lastName?: string;
  fields?: Record<string, string>;
  labels?: string[];
  category?: string;
};

type ContactRow = {
  email: string;
  domain: string;
  firstName: string;
  lastName: string;
  sources: SourceKey[];
  sourceLabels: string[];
  labels: string[];
  categoryLabels: string[];
  domainLabel?: DomainLabel;
  unsubscribed: boolean;
  fields: Record<string, string>;
};

type DomainGroup = {
  domain: string;
  label: string;
  category: string;
  count: number;
  sendable: number;
  unsubscribed: number;
  sourceLabels: string[];
  hasSavedLabel: boolean;
  percentage: number;
  color: string;
};

type SourceSummary = {
  key: SourceKey;
  label: string;
  count: number;
  color: string;
};

type ParsedContactList = {
  contacts: ContactSeed[];
  invalid: string[];
  dupes: number;
};

type PieSegment = {
  domain: string;
  label: string;
  count: number;
  color: string;
  dasharray: string;
  dashoffset: number;
};

@Component({
  selector: 'app-contact-emails-management',
  templateUrl: './contact-emails-management.component.html',
  styleUrl: './contact-emails-management.component.css',
})
export class ContactEmailsManagementComponent implements OnInit, OnDestroy {
  @ViewChild('contactImportInput') contactImportInput?: ElementRef<HTMLInputElement>;

  private readonly recipientImportKey = 'bulkEmail.recipientImport.v1';
  private readonly chartColors = [
    '#2563eb',
    '#059669',
    '#dc2626',
    '#7c3aed',
    '#ea580c',
    '#0891b2',
    '#be123c',
    '#4f46e5',
  ];
  private readonly personalDomains = new Set([
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
    'proton.me',
    'protonmail.com',
    'live.com',
    'msn.com',
  ]);

  isLoggedIn = false;
  loading = true;
  parsingContactLists = false;
  importSaving = false;
  errorMessage = '';

  users: User[] = [];
  primerDocs: any[] = [];
  contactLists: ContactList[] = [];
  unsubscribedEmails = new Set<string>();
  unsubscribedList: string[] = [];
  domainLabels: DomainLabel[] = [];

  contacts: ContactRow[] = [];
  filteredContacts: ContactRow[] = [];
  domainGroups: DomainGroup[] = [];
  sourceSummaries: SourceSummary[] = [];
  pieSegments: PieSegment[] = [];

  searchTerm = '';
  selectedDomain = '';
  selectedSource: SourceKey | 'all' = 'all';
  selectedLabel = '';
  excludeUnsubscribed = true;

  selectedDomainForEdit = '';
  labelName = '';
  labelCategory = 'school';
  labelNotes = '';
  labelSaving = false;

  uploadAudienceLabel = '';
  uploadAudienceCategory = 'custom';
  uploadTags = '';
  uploadError = '';
  uploadResult = '';

  contactListErrors: Array<{ listName: string; message: string }> = [];

  private sub?: Subscription;
  private parsedContactListsById = new Map<string, ParsedContactList>();
  private contactListSignature = '';

  constructor(
    public auth: AuthService,
    private afs: AngularFirestore,
    private data: DataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });

    this.sub = combineLatest([
      this.afs.collection<User>('users').valueChanges(),
      this.afs.collection<any>('primer').valueChanges({ idField: 'id' }),
      this.afs
        .collection<ContactList>('contact_lists')
        .valueChanges({ idField: 'id' }),
      this.afs
        .collection<any>('mailing_unsubscribes')
        .valueChanges({ idField: 'id' }),
      this.afs
        .collection<DomainLabel>('contact_domain_labels')
        .valueChanges({ idField: 'id' }),
    ]).subscribe({
      next: ([users, primerDocs, contactLists, unsubscribes, domainLabels]) => {
        this.users = users || [];
        this.primerDocs = primerDocs || [];
        this.contactLists = contactLists || [];
        this.unsubscribedEmails = this.normalizeUnsubscribes(unsubscribes || []);
        this.unsubscribedList = Array.from(this.unsubscribedEmails).sort((a, b) =>
          a.localeCompare(b)
        );
        this.domainLabels = (domainLabels || []).map((label) => ({
          ...label,
          domain: this.normalizeDomain(label.domain),
        }));
        this.loading = false;
        this.rebuildContacts();
        void this.loadContactListFiles();
      },
      error: (error) => {
        console.error('contact email stream failed', error);
        this.loading = false;
        this.errorMessage = 'Failed to load contact email data.';
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get totalContacts(): number {
    return this.contacts.length;
  }

  get sendableContacts(): number {
    return this.contacts.filter((contact) => !contact.unsubscribed).length;
  }

  get unsubscribedCount(): number {
    return this.contacts.filter((contact) => contact.unsubscribed).length;
  }

  get registeredCount(): number {
    return this.contacts.filter((contact) => contact.sources.includes('registered'))
      .length;
  }

  get primerCount(): number {
    return this.contacts.filter((contact) => contact.sources.includes('primer')).length;
  }

  get contactListCount(): number {
    return this.contacts.filter((contact) =>
      contact.sources.includes('contact_list')
    ).length;
  }

  get selectedAudienceLabel(): string {
    if (this.selectedLabel) return this.selectedLabel;
    if (this.selectedDomain) {
      const group = this.domainGroups.find((item) => item.domain === this.selectedDomain);
      return group?.label || this.selectedDomain;
    }
    if (this.selectedSource !== 'all') return this.sourceLabel(this.selectedSource);
    return 'Filtered contact emails';
  }

  get selectedAudienceDescription(): string {
    const parts: string[] = [];
    if (this.selectedDomain) parts.push(`Domain: ${this.selectedDomain}`);
    if (this.selectedSource !== 'all') parts.push(`Source: ${this.sourceLabel(this.selectedSource)}`);
    if (this.selectedLabel) parts.push(`Label: ${this.selectedLabel}`);
    if (this.searchTerm.trim()) parts.push(`Search: "${this.searchTerm.trim()}"`);
    if (this.excludeUnsubscribed) parts.push('Unsubscribed excluded');
    return parts.length ? parts.join(' • ') : 'All contacts, excluding unsubscribed by default';
  }

  get selectedSendableCount(): number {
    return this.filteredContacts.filter((contact) => !contact.unsubscribed).length;
  }

  get selectedUnsubscribedCount(): number {
    return this.filteredContacts.filter((contact) => contact.unsubscribed).length;
  }

  get selectedRegisteredCount(): number {
    return this.filteredContacts.filter((contact) =>
      contact.sources.includes('registered')
    ).length;
  }

  get selectedPrimerCount(): number {
    return this.filteredContacts.filter((contact) =>
      contact.sources.includes('primer')
    ).length;
  }

  get selectedUploadedCount(): number {
    return this.filteredContacts.filter((contact) =>
      contact.sources.includes('contact_list')
    ).length;
  }

  get selectedDomainCount(): number {
    return new Set(this.filteredContacts.map((contact) => contact.domain)).size;
  }

  get knownLabelOptions(): string[] {
    const labels = new Set<string>();
    this.contacts.forEach((contact) => {
      contact.labels.forEach((label) => labels.add(label));
      if (contact.domainLabel?.label) labels.add(contact.domainLabel.label);
    });
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedDomain = '';
    this.selectedSource = 'all';
    this.selectedLabel = '';
    this.excludeUnsubscribed = true;
    this.applyFilters();
  }

  selectDomain(group: DomainGroup): void {
    this.selectedDomain = group.domain;
    this.selectedLabel = '';
    this.applyFilters();
  }

  editDomainLabel(group: DomainGroup): void {
    this.selectedDomainForEdit = group.domain;
    this.labelName = group.hasSavedLabel ? group.label : '';
    this.labelCategory = group.hasSavedLabel ? group.category : 'school';
    const saved = this.domainLabels.find((label) => label.domain === group.domain);
    this.labelNotes = saved?.notes || '';
  }

  editDomainByName(domain: string): void {
    const group = this.domainGroups.find((item) => item.domain === domain);
    if (group) this.editDomainLabel(group);
  }

  cancelDomainLabelEdit(): void {
    this.selectedDomainForEdit = '';
    this.labelName = '';
    this.labelCategory = 'school';
    this.labelNotes = '';
  }

  async saveDomainLabel(): Promise<void> {
    const domain = this.normalizeDomain(this.selectedDomainForEdit);
    const label = this.labelName.trim();
    if (!domain || !label || this.labelSaving) return;

    this.labelSaving = true;
    try {
      const doc: DomainLabel = {
        domain,
        label,
        category: this.labelCategory || 'custom',
        notes: this.labelNotes.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: this.auth.currentUser?.uid || '',
      };
      await this.afs.doc(`contact_domain_labels/${domain}`).set(doc, { merge: true });
      this.cancelDomainLabelEdit();
    } catch (error) {
      console.error('saveDomainLabel', error);
      alert('Failed to save domain label.');
    } finally {
      this.labelSaving = false;
    }
  }

  async deleteDomainLabel(domain: string): Promise<void> {
    const normalized = this.normalizeDomain(domain);
    if (!normalized) return;
    const ok = confirm(`Remove saved label for ${normalized}?`);
    if (!ok) return;

    try {
      await this.afs.doc(`contact_domain_labels/${normalized}`).delete();
      if (this.selectedDomainForEdit === normalized) this.cancelDomainLabelEdit();
    } catch (error) {
      console.error('deleteDomainLabel', error);
      alert('Failed to remove domain label.');
    }
  }

  pickImportFile(): void {
    this.contactImportInput?.nativeElement.click();
  }

  async onContactImportChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    input.value = '';

    this.uploadError = '';
    this.uploadResult = '';
    this.importSaving = true;

    try {
      const raw = await file.text();
      const parsed = this.parseContactFile(
        raw,
        file.type || '',
        file.name,
        this.uploadAudienceLabel.trim(),
        this.uploadAudienceCategory,
        this.parseTags(this.uploadTags)
      );

      if (!parsed.contacts.length) {
        this.uploadError = 'No valid emails found in this file.';
        return;
      }

      const listId = this.safeId();
      const storagePath = `contact-lists/${
        this.auth.currentUser?.uid || 'admin'
      }/${listId}/${Date.now()}-${this.safeFileName(file.name)}`;
      const downloadUrl = await this.data.startUpload(file, storagePath, '', {
        contentType: file.type || 'text/plain',
      });

      if (!downloadUrl) throw new Error('Upload failed');

      const baseName = (file.name || 'contacts').replace(/\.[^/.]+$/, '').slice(0, 80);
      const doc: ContactList = {
        id: listId,
        name: this.uploadAudienceLabel.trim() || baseName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: this.auth.currentUser?.uid || '__none__',
        storagePath,
        downloadUrl,
        countValid: parsed.contacts.length,
        countInvalid: parsed.invalid.length,
        countDupes: parsed.dupes,
        note: `Imported from Contact Emails (${file.name})`,
        fileName: file.name,
        audienceLabel: this.uploadAudienceLabel.trim(),
        audienceCategory: this.uploadAudienceCategory || 'custom',
        tags: this.parseTags(this.uploadTags),
      };

      await this.afs.doc(`contact_lists/${listId}`).set(doc);
      this.parsedContactListsById.set(listId, parsed);
      this.uploadResult = `Imported ${parsed.contacts.length} unique email(s).`;
      this.uploadAudienceLabel = '';
      this.uploadTags = '';
      this.rebuildContacts();
    } catch (error) {
      console.error('onContactImportChosen', error);
      this.uploadError = 'Failed to import this contact file.';
    } finally {
      this.importSaving = false;
    }
  }

  useFilteredInBulkEmail(): void {
    const rows = this.filteredContacts.map((contact) => ({
      email: contact.email,
      first_name: contact.firstName,
      last_name: contact.lastName,
      domain: contact.domain,
      audience_label: contact.domainLabel?.label || contact.labels[0] || '',
      source: contact.sourceLabels.join('; '),
      unsubscribeUrl: this.unsubscribeUrlFor(contact.email),
      ...contact.fields,
    }));

    localStorage.setItem(
      this.recipientImportKey,
      JSON.stringify({
        source: 'contact-emails',
        label: this.selectedAudienceLabel,
        recipients: rows,
      })
    );

    void this.router.navigate(['/bulk-emails']);
  }

  copyFilteredEmails(): void {
    const text = this.filteredContacts.map((contact) => contact.email).join('\n');
    void navigator.clipboard?.writeText(text);
  }

  downloadFilteredCsv(): void {
    const headers = [
      'email',
      'first_name',
      'last_name',
      'domain',
      'domain_label',
      'labels',
      'sources',
      'unsubscribed',
    ];
    const rows = this.filteredContacts.map((contact) => [
      contact.email,
      contact.firstName,
      contact.lastName,
      contact.domain,
      contact.domainLabel?.label || '',
      contact.labels.join('; '),
      contact.sourceLabels.join('; '),
      contact.unsubscribed ? 'yes' : 'no',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact_emails_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private rebuildContacts(): void {
    const seeds: ContactSeed[] = [];

    this.users.forEach((user) => {
      seeds.push({
        email: user.email || user.emailLower || '',
        source: 'registered',
        sourceLabel: 'Registered users',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fields: {
          first_name: user.firstName || '',
          last_name: user.lastName || '',
          uid: user.uid || '',
          school_id: user.schoolId || '',
        },
      });
    });

    this.primerDocs.forEach((doc) => {
      const signUps = Array.isArray(doc?.signUps) ? doc.signUps : [];
      signUps.forEach((signup: any) => {
        seeds.push({
          email: signup?.email || '',
          source: 'primer',
          sourceLabel: 'Primer signups',
          firstName: signup?.firstName || '',
          lastName: signup?.lastName || '',
          fields: {
            first_name: signup?.firstName || '',
            last_name: signup?.lastName || '',
            register_date: signup?.registerDate || '',
          },
        });
      });
    });

    this.parsedContactListsById.forEach((parsed) => {
      seeds.push(...parsed.contacts);
    });

    const labelsByDomain = new Map(
      this.domainLabels.map((label) => [this.normalizeDomain(label.domain), label])
    );
    const byEmail = new Map<string, ContactRow>();

    seeds.forEach((seed) => {
      const email = this.normalizeEmail(seed.email);
      if (!email) return;
      const domain = this.emailDomain(email);
      if (!domain) return;

      const existing = byEmail.get(email);
      if (existing) {
        this.mergeContact(existing, seed);
        return;
      }

      const labels = new Set<string>(seed.labels || []);
      const categoryLabels = new Set<string>();
      if (seed.category && seed.labels?.length) categoryLabels.add(seed.category);
      const domainLabel = labelsByDomain.get(domain);

      byEmail.set(email, {
        email,
        domain,
        firstName: seed.firstName || seed.fields?.['first_name'] || '',
        lastName: seed.lastName || seed.fields?.['last_name'] || '',
        sources: [seed.source],
        sourceLabels: [seed.sourceLabel],
        labels: Array.from(labels),
        categoryLabels: Array.from(categoryLabels),
        domainLabel,
        unsubscribed: this.unsubscribedEmails.has(email),
        fields: { ...(seed.fields || {}), email },
      });
    });

    this.contacts = Array.from(byEmail.values()).sort((a, b) =>
      a.email.localeCompare(b.email)
    );
    this.rebuildDomainGroups();
    this.rebuildSourceSummaries();
    this.applyFilters();
  }

  private mergeContact(contact: ContactRow, seed: ContactSeed): void {
    if (!contact.sources.includes(seed.source)) contact.sources.push(seed.source);
    if (!contact.sourceLabels.includes(seed.sourceLabel)) {
      contact.sourceLabels.push(seed.sourceLabel);
    }
    if (!contact.firstName) contact.firstName = seed.firstName || seed.fields?.['first_name'] || '';
    if (!contact.lastName) contact.lastName = seed.lastName || seed.fields?.['last_name'] || '';
    (seed.labels || []).forEach((label) => {
      if (label && !contact.labels.includes(label)) contact.labels.push(label);
    });
    if (seed.category && seed.labels?.length && !contact.categoryLabels.includes(seed.category)) {
      contact.categoryLabels.push(seed.category);
    }
    contact.fields = { ...contact.fields, ...(seed.fields || {}), email: contact.email };
  }

  private rebuildDomainGroups(): void {
    const groupMap = new Map<string, DomainGroup>();
    const labelsByDomain = new Map(
      this.domainLabels.map((label) => [this.normalizeDomain(label.domain), label])
    );

    this.contacts.forEach((contact) => {
      const saved = labelsByDomain.get(contact.domain);
      const group = groupMap.get(contact.domain) || {
        domain: contact.domain,
        label: saved?.label || contact.domain,
        category: saved?.category || (this.personalDomains.has(contact.domain) ? 'personal' : 'unlabeled'),
        count: 0,
        sendable: 0,
        unsubscribed: 0,
        sourceLabels: [],
        hasSavedLabel: Boolean(saved),
        percentage: 0,
        color: this.chartColors[groupMap.size % this.chartColors.length],
      };
      group.count += 1;
      if (contact.unsubscribed) group.unsubscribed += 1;
      else group.sendable += 1;
      contact.sourceLabels.forEach((label) => {
        if (!group.sourceLabels.includes(label)) group.sourceLabels.push(label);
      });
      groupMap.set(contact.domain, group);
    });

    const total = Math.max(1, this.contacts.length);
    this.domainGroups = Array.from(groupMap.values())
      .map((group) => ({ ...group, percentage: Math.round((group.count / total) * 1000) / 10 }))
      .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
    this.rebuildPieSegments();
  }

  private rebuildSourceSummaries(): void {
    const rows: SourceSummary[] = [
      { key: 'registered', label: 'Registered users', count: 0, color: '#2563eb' },
      { key: 'primer', label: 'Primer signups', count: 0, color: '#059669' },
      { key: 'contact_list', label: 'Uploaded lists', count: 0, color: '#ea580c' },
    ];

    rows.forEach((row) => {
      row.count = this.contacts.filter((contact) => contact.sources.includes(row.key)).length;
    });
    this.sourceSummaries = rows;
  }

  private rebuildPieSegments(): void {
    const top = this.domainGroups.slice(0, 7);
    const otherCount = this.domainGroups.slice(7).reduce((sum, item) => sum + item.count, 0);
    const chartRows = otherCount
      ? [...top, {
          domain: 'other',
          label: 'Other domains',
          category: 'mixed',
          count: otherCount,
          sendable: 0,
          unsubscribed: 0,
          sourceLabels: [],
          hasSavedLabel: false,
          percentage: 0,
          color: this.chartColors[7],
        }]
      : top;

    const total = Math.max(1, chartRows.reduce((sum, item) => sum + item.count, 0));
    const circumference = 2 * Math.PI * 45;
    let offset = 0;

    this.pieSegments = chartRows.map((item) => {
      const length = (item.count / total) * circumference;
      const segment: PieSegment = {
        domain: item.domain,
        label: item.label,
        count: item.count,
        color: item.color,
        dasharray: `${length} ${circumference - length}`,
        dashoffset: -offset,
      };
      offset += length;
      return segment;
    });
  }

  private applyFilters(): void {
    const q = this.searchTerm.trim().toLowerCase();
    this.filteredContacts = this.contacts.filter((contact) => {
      if (this.excludeUnsubscribed && contact.unsubscribed) return false;
      if (this.selectedDomain && contact.domain !== this.selectedDomain) return false;
      if (this.selectedSource !== 'all' && !contact.sources.includes(this.selectedSource)) {
        return false;
      }
      if (this.selectedLabel) {
        const labels = [
          ...contact.labels,
          contact.domainLabel?.label || '',
          contact.domainLabel?.category || '',
        ].map((value) => value.toLowerCase());
        if (!labels.includes(this.selectedLabel.toLowerCase())) return false;
      }
      if (!q) return true;
      return [
        contact.email,
        contact.domain,
        contact.firstName,
        contact.lastName,
        contact.domainLabel?.label || '',
        contact.labels.join(' '),
        contact.sourceLabels.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }

  private async loadContactListFiles(): Promise<void> {
    const signature = this.contactLists
      .map((list) => `${list.id}:${list.downloadUrl || list.storagePath || ''}:${list.countValid}`)
      .sort()
      .join('|');
    if (signature === this.contactListSignature) return;
    this.contactListSignature = signature;

    this.parsingContactLists = true;
    this.contactListErrors = [];
    try {
      await Promise.all(
        this.contactLists.map(async (list) => {
          if (!list.id || this.parsedContactListsById.has(list.id)) return;
          if (!list.downloadUrl) {
            this.contactListErrors.push({
              listName: list.name || list.id,
              message: 'Missing download URL',
            });
            return;
          }
          try {
            const response = await fetch(list.downloadUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            const parsed = this.parseContactFile(
              text,
              '',
              list.fileName || list.name || 'contacts.csv',
              list.audienceLabel || list.name,
              list.audienceCategory || 'contact_list',
              list.tags || []
            );
            this.parsedContactListsById.set(list.id, parsed);
          } catch (error) {
            console.warn('Failed to parse contact list', list, error);
            this.contactListErrors.push({
              listName: list.name || list.id,
              message: 'Could not read uploaded file',
            });
          }
        })
      );
    } finally {
      this.parsingContactLists = false;
      this.rebuildContacts();
    }
  }

  private parseContactFile(
    raw: string,
    mime: string,
    fileName: string,
    audienceLabel = '',
    audienceCategory = 'custom',
    tags: string[] = []
  ): ParsedContactList {
    const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const rows = /csv/i.test(mime) || /\.csv$/i.test(fileName)
      ? this.csvToRows(text)
      : this.textToRows(text);
    const invalid: string[] = [];
    const seen = new Set<string>();
    const contacts: ContactSeed[] = [];
    let rawTokenCount = 0;

    if (!rows.length) return { contacts, invalid, dupes: 0 };

    const rawHeader = rows[0].map((value) => value.trim());
    const header = rawHeader.map((value) => this.normalizeFieldKey(value));
    const hasHeader = header.some((value) => /email/.test(value));
    const emailIndex = hasHeader
      ? this.findEmailColumnIndex(header)
      : 0;
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i] || [];
      const emailCell = (row[emailIndex] || '').toString();
      if (!emailCell) continue;
      const fields = hasHeader ? this.extractFields(rawHeader, row, emailIndex) : {};
      const tokens = emailCell
        .split(/[;,]/)
        .map((value) => value.trim())
        .filter(Boolean);
      rawTokenCount += tokens.length;

      tokens.forEach((token) => {
        const email = this.normalizeEmail(token);
        if (!email) {
          invalid.push(token);
          return;
        }
        if (seen.has(email)) return;
        seen.add(email);
        const labels = [audienceLabel, ...tags].map((value) => value.trim()).filter(Boolean);
        contacts.push({
          email,
          source: 'contact_list',
          sourceLabel: audienceLabel || fileName || 'Uploaded contact list',
          firstName: fields['firstName'] || fields['first_name'] || fields['firstname'] || fields['first'] || '',
          lastName: fields['lastName'] || fields['last_name'] || fields['lastname'] || fields['last'] || '',
          fields,
          labels,
          category: audienceCategory || 'custom',
        });
      });
    }

    return {
      contacts,
      invalid,
      dupes: Math.max(0, rawTokenCount - contacts.length - invalid.length),
    };
  }

  private csvToRows(text: string): string[][] {
    const rows: string[][] = [];
    let field = '';
    let row: string[] = [];
    let inQuotes = false;

    const pushField = () => {
      row.push(field);
      field = '';
    };
    const pushRow = () => {
      rows.push(row);
      row = [];
    };

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        pushField();
      } else if (ch === '\n') {
        pushField();
        pushRow();
      } else {
        field += ch;
      }
    }

    pushField();
    if (row.length > 1 || row[0] !== '') pushRow();
    return rows;
  }

  private textToRows(text: string): string[][] {
    return text
      .split(/[\n;,]+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => [value]);
  }

  private normalizeUnsubscribes(rows: any[]): Set<string> {
    const emails = new Set<string>();
    rows.forEach((row) => {
      const email = this.normalizeEmail(row?.email || row?.id || '');
      if (email) emails.add(email);
    });
    return emails;
  }

  private sourceLabel(source: SourceKey): string {
    if (source === 'registered') return 'Registered users';
    if (source === 'primer') return 'Primer signups';
    return 'Uploaded lists';
  }

  private normalizeEmail(value: string): string {
    const email = (value || '').trim().toLowerCase();
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : '';
  }

  private emailDomain(email: string): string {
    const parts = email.split('@');
    return this.normalizeDomain(parts.length === 2 ? parts[1] : '');
  }

  private normalizeDomain(value: string): string {
    return (value || '').trim().toLowerCase().replace(/^@+/, '');
  }

  private normalizeFieldKey(value: string): string {
    return (value || '')
      .trim()
      .replace(/^\uFEFF/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+(.)/g, (_match, chr) => chr.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  private findEmailColumnIndex(header: string[]): number {
    let index = header.findIndex((key) => key === 'email' || key === 'emails');
    if (index === -1) index = header.findIndex((key) => /email/.test(key));
    return Math.max(0, index);
  }

  private extractFields(
    rawHeader: string[],
    row: string[],
    emailIndex: number
  ): Record<string, string> {
    const fields: Record<string, string> = {};
    rawHeader.forEach((rawKey, index) => {
      const key = this.normalizeFieldKey(rawKey);
      if (!key || index === emailIndex) return;
      fields[key] = (row[index] || '').toString().trim();
    });
    return fields;
  }

  private parseTags(value: string): string[] {
    return (value || '')
      .split(/[,\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  private unsubscribeUrlFor(email: string): string {
    return `https://newworld-game.org/unsubscribe?e=${encodeURIComponent(email)}`;
  }

  private safeId(): string {
    return (
      Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
    );
  }

  private safeFileName(name: string): string {
    return (name || 'contacts.csv').replace(/[^\w.\-]+/g, '_');
  }
}
