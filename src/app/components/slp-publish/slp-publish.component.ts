import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable, shareReplay, switchMap, tap } from 'rxjs';
import {
  SlpContextService,
  SlpPublishViewModel,
} from 'src/app/services/slp-context.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-slp-publish',
  templateUrl: './slp-publish.component.html',
  styleUrls: ['./slp-publish.component.css'],
})
export class SlpPublishComponent implements OnInit {
  vm$!: Observable<SlpPublishViewModel>;

  constructor(
    private seoService: SeoService,
    private route: ActivatedRoute,
    private slpContext: SlpContextService
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);

    this.vm$ = combineLatest([
      this.route.paramMap,
      this.route.queryParamMap,
    ]).pipe(
      map(
        ([params, queryParams]) =>
          params.get('solutionId') ||
          queryParams.get('solutionId') ||
          queryParams.get('sid') ||
          undefined
      ),
      switchMap((solutionId) => this.slpContext.getPublishViewModel(solutionId)),
      tap((vm) => {
        this.seoService.updateMetaTags({
          title: vm.shell.hasSolution
            ? `${vm.solutionTitle} | SLP Publish | NewWorld Game`
            : 'SLP Publish Pathway | NewWorld Game',
          description: vm.heroDescription,
          keywords:
            'NewWorld Game SLP, publish pathway, solution launch, public preview, launch workflow',
          url: 'https://newworld-game.org/slp',
          type: 'website',
        });
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}
