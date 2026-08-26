import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { CampaignWebsiteService } from '../services/campaign-website.service';

@Component({
  selector: 'app-campaign-public',
  templateUrl: './campaign-public.component.html',
  styleUrls: ['./campaign-public.component.css'],
  standalone: false,
})
export class CampaignPublicComponent implements OnInit, OnDestroy {
  loading = true;
  notFound = false;
  errorMessage = '';
  pageUrl: SafeResourceUrl | null = null;
  slug = '';
  title = '';
  description = '';
  supportCount = 0;
  supported = false;
  showShare = false;
  showConnect = false;
  connecting = false;
  connectionStatus = '';
  connection = {
    reason: 'partnership',
    name: '',
    email: '',
    message: '',
  };
  private objectUrl = '';
  private visitorId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly campaignWebsites: CampaignWebsiteService,
    private readonly sanitizer: DomSanitizer
  ) {}

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.slug = slug;
    this.visitorId = this.getVisitorId();
    try {
      const campaign = await this.campaignWebsites.getPublished(slug);
      if (campaign.redirectTo) {
        await this.router.navigate(['/campaigns', campaign.redirectTo], {
          replaceUrl: true,
        });
        return;
      }
      if (!campaign.html) {
        this.notFound = true;
        return;
      }
      document.title = campaign.title || 'Global Solutions Lab campaign';
      this.title = campaign.title || 'Global Solutions Lab campaign';
      this.description = campaign.description || '';
      this.supportCount = Number(campaign.supportCount || 0);
      this.objectUrl = URL.createObjectURL(
        new Blob([campaign.html], { type: 'text/html;charset=utf-8' })
      );
      this.pageUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
      void this.track('view');
      this.showShare = this.route.snapshot.fragment === 'share';
      this.showConnect = this.route.snapshot.fragment === 'connect';
    } catch (error: any) {
      const code = String(error?.code || '');
      this.notFound = code.includes('not-found');
      if (!this.notFound) {
        this.errorMessage =
          'This campaign could not be loaded. Please try again in a moment.';
      }
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  get publicUrl(): string {
    return `${window.location.origin}/campaigns/${this.slug}`;
  }

  shareHref(channel: 'email' | 'linkedin' | 'facebook' | 'x' | 'whatsapp'): string {
    const url = encodeURIComponent(this.publicUrl);
    const message = encodeURIComponent(
      `${this.title}${this.description ? ` — ${this.description}` : ''}`
    );
    if (channel === 'email') {
      return `mailto:?subject=${encodeURIComponent(this.title)}&body=${message}%0A%0A${url}`;
    }
    if (channel === 'linkedin') {
      return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    }
    if (channel === 'facebook') {
      return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    }
    if (channel === 'x') {
      return `https://twitter.com/intent/tweet?text=${message}&url=${url}`;
    }
    return `https://api.whatsapp.com/send?text=${message}%0A${url}`;
  }

  async toggleSupport(): Promise<void> {
    try {
      const result = await this.track('support');
      this.supported = result.supported === true;
      this.supportCount = Number(result.supportCount || 0);
    } catch {
      this.errorMessage = 'Support could not be recorded. Please try again.';
    }
  }

  async copyLink(): Promise<void> {
    await navigator.clipboard.writeText(this.publicUrl);
    await this.track('share', { channel: 'copy' });
  }

  async nativeShare(): Promise<void> {
    if (!navigator.share) {
      await this.copyLink();
      return;
    }
    try {
      await navigator.share({ title: this.title, text: this.description, url: this.publicUrl });
      await this.track('share', { channel: 'native' });
    } catch (error: any) {
      if (error?.name !== 'AbortError') await this.copyLink();
    }
  }

  trackShare(channel: string): void {
    void this.track('share', { channel });
  }

  async submitConnection(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;
    this.connectionStatus = 'Sending…';
    try {
      await this.track('connect', this.connection);
      this.connection = { reason: 'partnership', name: '', email: '', message: '' };
      this.connectionStatus = 'Message sent. The solution team can now follow up.';
    } catch (error: any) {
      this.connectionStatus = String(error?.message || 'The message could not be sent.');
    } finally {
      this.connecting = false;
    }
  }

  closeDialogs(): void {
    this.showShare = false;
    this.showConnect = false;
  }

  private track(
    action: 'view' | 'support' | 'share' | 'connect',
    payload: Record<string, unknown> = {}
  ) {
    return this.campaignWebsites.engage({
      slug: this.slug,
      visitorId: this.visitorId,
      action,
      ...payload,
    });
  }

  private getVisitorId(): string {
    const key = 'gsl-campaign-visitor';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    localStorage.setItem(key, value);
    return value;
  }
}
