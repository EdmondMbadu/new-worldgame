import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import {
  CampaignWebsiteService,
  CampaignWebsiteState,
} from '../services/campaign-website.service';

@Component({
  selector: 'app-campaign-studio',
  templateUrl: './campaign-studio.component.html',
  styleUrls: ['./campaign-studio.component.css'],
  standalone: false,
})
export class CampaignStudioComponent implements OnInit, OnDestroy {
  solutionId = '';
  solutionTitle = '';
  title = '';
  description = '';
  slug = '';
  html = '';
  status: 'draft' | 'published' | 'unpublished' = 'draft';
  hasUnpublishedChanges = false;
  canPublish = false;
  liveUrl = '';
  loading = true;
  saving = false;
  publishing = false;
  unpublishing = false;
  checkingSlug = false;
  slugAvailable: boolean | null = null;
  slugFeedback = '';
  successMessage = '';
  errorMessage = '';
  previewUrl: SafeResourceUrl | null = null;
  sourceBytes = 0;
  sanitizedBytes = 0;
  private previewObjectUrl = '';
  private sourceType: 'pasted' | 'uploaded' | 'generated' = 'pasted';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly campaignWebsites: CampaignWebsiteService,
    private readonly sanitizer: DomSanitizer
  ) {}

  async ngOnInit(): Promise<void> {
    this.solutionId = this.findRouteParam('solutionId');
    if (!this.solutionId) {
      this.errorMessage = 'A solution is required to create a website.';
      this.loading = false;
      return;
    }
    await this.load();
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  get campaignPath(): string {
    return `/campaigns/${this.slug || 'your-url'}`;
  }

  get htmlKilobytes(): string {
    return (new Blob([this.html]).size / 1024).toFixed(1);
  }

  get canSave(): boolean {
    return !!this.html.trim() && !!this.slug.trim() && !!this.title.trim() && !this.saving;
  }

  async checkSlug(): Promise<void> {
    if (!this.slug.trim()) return;
    this.checkingSlug = true;
    this.slugFeedback = '';
    this.slugAvailable = null;
    try {
      const result = await this.campaignWebsites.checkSlug(this.solutionId, this.slug);
      this.slug = result.slug;
      this.slugAvailable = result.available;
      this.slugFeedback = result.available
        ? 'This address is available.'
        : 'This address is already in use.';
    } catch (error: any) {
      this.slugAvailable = false;
      this.slugFeedback = this.errorText(error, 'Choose a different campaign address.');
    } finally {
      this.checkingSlug = false;
    }
  }

  async saveDraft(showMessage = true): Promise<boolean> {
    if (!this.canSave) return false;
    this.saving = true;
    this.clearMessages();
    try {
      const result = await this.campaignWebsites.saveDraft({
        solutionId: this.solutionId,
        title: this.title,
        description: this.description,
        slug: this.slug,
        html: this.html,
        sourceType: this.sourceType,
      });
      this.slug = result.slug;
      this.status = this.status || 'draft';
      this.hasUnpublishedChanges = true;
      this.sourceBytes = result.sourceBytes;
      this.sanitizedBytes = result.sanitizedBytes;
      this.setPreview(result.sanitizedHtml);
      if (showMessage) this.successMessage = 'Draft saved and preview updated.';
      return true;
    } catch (error: any) {
      this.errorMessage = this.errorText(error, 'The draft could not be saved.');
      return false;
    } finally {
      this.saving = false;
    }
  }

  async publish(): Promise<void> {
    if (!this.canPublish || this.publishing) return;
    this.publishing = true;
    this.clearMessages();
    try {
      const saved = await this.saveDraft(false);
      if (!saved) return;
      const result = await this.campaignWebsites.publish(this.solutionId, this.slug);
      this.status = 'published';
      this.slug = result.slug;
      this.liveUrl = result.liveUrl;
      this.hasUnpublishedChanges = false;
      this.successMessage = 'Your campaign website is live.';
    } catch (error: any) {
      this.errorMessage = this.errorText(error, 'The website could not be published.');
    } finally {
      this.publishing = false;
    }
  }

  async unpublish(): Promise<void> {
    if (!this.canPublish || this.unpublishing) return;
    if (!window.confirm('Unpublish this campaign website? Its public URL will stop working.')) {
      return;
    }
    this.unpublishing = true;
    this.clearMessages();
    try {
      await this.campaignWebsites.unpublish(this.solutionId);
      this.status = 'unpublished';
      this.liveUrl = '';
      this.successMessage = 'The campaign website is now unpublished.';
    } catch (error: any) {
      this.errorMessage = this.errorText(error, 'The website could not be unpublished.');
    } finally {
      this.unpublishing = false;
    }
  }

  async copyUrl(): Promise<void> {
    const value = this.liveUrl || `${window.location.origin}${this.campaignPath}`;
    try {
      await navigator.clipboard.writeText(value);
      this.successMessage = 'Campaign URL copied.';
    } catch {
      this.errorMessage = 'Copy was unavailable. Select the URL in your browser instead.';
    }
  }

  openFullPreview(): void {
    if (!this.previewObjectUrl) return;
    window.open(this.previewObjectUrl, '_blank', 'noopener,noreferrer');
  }

  onHtmlChanged(): void {
    this.sourceType = 'pasted';
    this.hasUnpublishedChanges = true;
  }

  onSlugChanged(): void {
    this.slugAvailable = null;
    this.slugFeedback = '';
    this.hasUnpublishedChanges = true;
  }

  onMetadataChanged(): void {
    this.hasUnpublishedChanges = true;
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.html') && file.type !== 'text/html') {
      this.errorMessage = 'Choose a single .html file.';
      input.value = '';
      return;
    }
    if (file.size > 750 * 1024) {
      this.errorMessage = 'HTML files must be smaller than 750 KB.';
      input.value = '';
      return;
    }
    this.html = await file.text();
    this.sourceType = 'uploaded';
    this.hasUnpublishedChanges = true;
    this.successMessage = `${file.name} is ready to save and preview.`;
    input.value = '';
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      const state = await this.campaignWebsites.getWebsite(this.solutionId);
      this.applyState(state);
    } catch (error: any) {
      this.errorMessage = this.errorText(error, 'The website studio could not be opened.');
    } finally {
      this.loading = false;
    }
  }

  private applyState(state: CampaignWebsiteState): void {
    this.solutionTitle = state.solutionTitle;
    this.title = state.title || state.solutionTitle;
    this.description = state.description || '';
    this.slug = state.slug || this.slugify(state.solutionTitle);
    this.html = state.html || '';
    this.status = state.status || 'draft';
    this.hasUnpublishedChanges = state.hasUnpublishedChanges;
    this.canPublish = state.canPublish;
    this.liveUrl = state.liveUrl;
    if (state.sanitizedHtml) this.setPreview(state.sanitizedHtml);
  }

  private setPreview(html: string): void {
    this.revokePreview();
    this.previewObjectUrl = URL.createObjectURL(
      new Blob([html], { type: 'text/html;charset=utf-8' })
    );
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.previewObjectUrl
    );
  }

  private revokePreview(): void {
    if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
    this.previewObjectUrl = '';
    this.previewUrl = null;
  }

  private findRouteParam(name: string): string {
    let snapshot = this.route.snapshot;
    while (snapshot) {
      const value = snapshot.paramMap.get(name);
      if (value) return value;
      snapshot = snapshot.parent as typeof snapshot;
    }
    return '';
  }

  private slugify(value: string): string {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'solution-campaign';
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private errorText(error: any, fallback: string): string {
    return String(error?.message || fallback)
      .replace(/^FirebaseError:\s*/i, '')
      .replace(/^internal\s*/i, '')
      .trim();
  }
}
