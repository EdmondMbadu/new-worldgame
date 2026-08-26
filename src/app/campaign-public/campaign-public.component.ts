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
  private objectUrl = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly campaignWebsites: CampaignWebsiteService,
    private readonly sanitizer: DomSanitizer
  ) {}

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
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
      this.objectUrl = URL.createObjectURL(
        new Blob([campaign.html], { type: 'text/html;charset=utf-8' })
      );
      this.pageUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
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
}

