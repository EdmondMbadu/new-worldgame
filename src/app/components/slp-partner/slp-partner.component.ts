import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable, shareReplay, switchMap, tap } from 'rxjs';
import {
  SlpContextService,
  SlpPartnerViewModel,
} from 'src/app/services/slp-context.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-slp-partner',
  templateUrl: './slp-partner.component.html',
  styleUrls: ['./slp-partner.component.css'],
})
export class SlpPartnerComponent implements OnInit {
  vm$!: Observable<SlpPartnerViewModel>;

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
      switchMap((solutionId) => this.slpContext.getPartnerViewModel(solutionId)),
      tap((vm) => {
        this.seoService.updateMetaTags({
          title: vm.shell.hasSolution
            ? `${vm.shell.solutionTitle} | SLP Partner | NewWorld Game`
            : 'SLP Partner Pathway | NewWorld Game',
          description: vm.heroDescription,
          keywords:
            'NewWorld Game partner pathway, solution partner workflow, collaboration room, invite flow, launch coordination',
          url: 'https://newworld-game.org/partner',
          type: 'website',
        });
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}
