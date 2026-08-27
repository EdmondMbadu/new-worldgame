import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import {
  CampaignConnection,
  CampaignWebsiteGoal,
  CampaignWebsiteMetrics,
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
  editorMode: 'ai' | 'html' = 'ai';
  solutionId = '';
  solutionTitle = '';
  title = '';
  description = '';
  generationBrief = '';
  websiteGoal: CampaignWebsiteGoal = 'awareness';
  websiteTone = 'Hopeful and credible';
  readonly focusOptions = [
    'The challenge',
    'How it works',
    'Community impact',
    'Evidence & results',
    'Ways to help',
  ];
  selectedFocusAreas = ['The challenge', 'How it works', 'Community impact'];
  slug = '';
  html = '';
  status: 'draft' | 'published' | 'unpublished' = 'draft';
  hasUnpublishedChanges = false;
  canPublish = false;
  liveUrl = '';
  sourceWarning = '';
  strategyReviewAvailable = false;
  metrics: CampaignWebsiteMetrics = {
    views: 0,
    shares: 0,
    supporters: 0,
    connections: 0,
  };
  recentConnections: CampaignConnection[] = [];
  previewDevice: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  detailsOpen = false;
  loading = true;
  generating = false;
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
  sourceType: 'pasted' | 'uploaded' | 'generated' = 'pasted';

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

  get campaignUrl(): string {
    return new URL(this.campaignPath, window.location.origin).toString();
  }

  get htmlKilobytes(): string {
    return (new Blob([this.html]).size / 1024).toFixed(1);
  }

  get canSave(): boolean {
    return !!this.html.trim() && !!this.slug.trim() && !!this.title.trim() && !this.saving;
  }

  get canGenerate(): boolean {
    return !!this.generationBrief.trim() && !!this.slug.trim() && !!this.title.trim() && !this.generating;
  }

  get briefCharacters(): number {
    return this.generationBrief.length;
  }

  get campaignEmailUrl(): string {
    const body = `${this.description ? `${this.description}\n\n` : ''}${this.campaignUrl}`;
    return `mailto:?subject=${encodeURIComponent(this.title)}&body=${encodeURIComponent(body)}`;
  }

  selectEditorMode(mode: 'ai' | 'html'): void {
    this.editorMode = mode;
    this.clearMessages();
  }

  toggleFocusArea(area: string): void {
    this.selectedFocusAreas = this.selectedFocusAreas.includes(area)
      ? this.selectedFocusAreas.filter((item) => item !== area)
      : [...this.selectedFocusAreas, area];
  }

  isFocusSelected(area: string): boolean {
    return this.selectedFocusAreas.includes(area);
  }

  async requestGeneration(): Promise<void> {
    if (!this.canGenerate) return;
    this.generating = true;
    this.clearMessages();
    try {
      const result = await this.campaignWebsites.generateDraft({
        solutionId: this.solutionId,
        title: this.title,
        description: this.description,
        slug: this.slug,
        brief: this.generationBrief,
        goal: this.websiteGoal,
        tone: this.websiteTone,
        focusAreas: this.selectedFocusAreas,
      });
      this.slug = result.slug;
      this.title = result.title || this.title;
      this.description = result.description || this.description;
      this.html = result.sanitizedHtml;
      this.sourceType = 'generated';
      this.sourceBytes = result.sourceBytes;
      this.sanitizedBytes = result.sanitizedBytes;
      this.sourceWarning = result.sourceWarning || this.sourceWarning;
      this.hasUnpublishedChanges = true;
      this.setPreview(result.sanitizedHtml);
      this.successMessage = 'Your grounded campaign draft is ready to review.';
    } catch (error: any) {
      this.errorMessage = this.errorText(error, 'The website could not be generated.');
    } finally {
      this.generating = false;
    }
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
      this.liveUrl = new URL(
        `/campaigns/${result.slug}`,
        window.location.origin
      ).toString();
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
    const value = this.campaignUrl;
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

  async shareLiveSite(): Promise<void> {
    const url = this.campaignUrl;
    if (navigator.share) {
      try {
        await navigator.share({ title: this.title, text: this.description, url });
        return;
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
      }
    }
    await this.copyUrl();
  }

  setPreviewDevice(device: 'desktop' | 'tablet' | 'mobile'): void {
    this.previewDevice = device;
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
    this.editorMode = 'html';
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
    this.generationBrief = this.defaultGenerationBrief(
      state.solutionTitle,
      state.description
    );
    if (state.generationBrief) this.generationBrief = state.generationBrief;
    this.slug = state.slug || this.slugify(state.solutionTitle);
    this.html = state.html || '';
    this.sourceType = state.sourceType || (this.html.trim() ? 'pasted' : 'generated');
    this.editorMode = this.sourceType === 'generated' || !this.html.trim() ? 'ai' : 'html';
    this.websiteGoal = state.generationGoal || 'awareness';
    this.websiteTone = state.generationTone || 'Hopeful and credible';
    this.selectedFocusAreas = state.generationFocusAreas?.length
      ? state.generationFocusAreas
      : this.selectedFocusAreas;
    this.sourceWarning = state.sourceWarning || '';
    this.strategyReviewAvailable = state.strategyReviewAvailable;
    this.metrics = state.metrics || this.metrics;
    this.recentConnections = state.recentConnections || [];
    this.status = state.status || 'draft';
    this.hasUnpublishedChanges = state.hasUnpublishedChanges;
    this.canPublish = state.canPublish;
    this.liveUrl = state.status === 'published' ? this.campaignUrl : '';
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

  private defaultGenerationBrief(solutionTitle: string, summary: string): string {
    const solution = solutionTitle || 'this solution';
    const context = summary?.trim()
      ? ` Use this existing summary as context: ${summary.trim()}`
      : '';
    return `Create a compelling campaign website for ${solution}. Explain the problem in clear, human language, show how the solution works, and make its potential impact feel concrete. Use a hopeful, credible tone with a strong opening message, a concise story, proof or outcomes where available, and a clear call to action for people who want to support or share the work.${context}`;
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
