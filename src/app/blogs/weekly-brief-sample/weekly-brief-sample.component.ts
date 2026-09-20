import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-weekly-brief-sample',
  templateUrl: './weekly-brief-sample.component.html',
  standalone: false,
})
export class WeeklyBriefSampleComponent implements OnInit {
  readonly videoUrl =
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/nwgNewsVideos%2Fvideos%2F2026%2FLtuwKETteayh0E2HM1LC-global-solutions-lab-weekly-intelligence-brief-august-29-2026_1080p.mp4?alt=media&token=f65f1a24-35ae-4775-855e-65885e5a48bc';

  readonly videoPoster =
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/nwgNewsVideos%2Fthumbnails%2FLtuwKETteayh0E2HM1LC%2Fauto-f48be0dd-3856-42c4-baf8-3d0e9748501b.jpg?alt=media&token=f48be0dd-3856-42c4-baf8-3d0e9748501b';

  constructor(
    private readonly title: Title,
    private readonly meta: Meta
  ) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    this.title.setTitle(
      'Weekly Intelligence Brief | Global Solutions Lab'
    );
    this.meta.updateTag({
      name: 'description',
      content:
        'A public sample of the Global Solutions Lab Weekly Intelligence Brief, featuring the August 30, 2026 video briefing and a practical topic for a general audience.',
    });
  }
}
