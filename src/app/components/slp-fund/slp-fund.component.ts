import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map, Observable, shareReplay, switchMap, tap } from 'rxjs';
import {
  SlpContextService,
  SlpFundViewModel,
} from 'src/app/services/slp-context.service';
import { SeoService } from 'src/app/services/seo.service';

@Component({
  selector: 'app-slp-fund',
  templateUrl: './slp-fund.component.html',
  styleUrls: ['./slp-fund.component.css'],
})
export class SlpFundComponent implements OnInit {
  vm$!: Observable<SlpFundViewModel>;

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
      switchMap((solutionId) => this.slpContext.getFundViewModel(solutionId)),
      tap((vm) => {
        this.seoService.updateMetaTags({
          title: vm.shell.hasSolution
            ? `${vm.shell.solutionTitle} | SLP Fund | NewWorld Game`
            : 'SLP Funding Pathway | NewWorld Game',
          description: vm.heroDescription,
          keywords:
            'NewWorld Game funding, SLP fund pathway, solution funding readiness, team signal, evidence pack',
          url: 'https://newworld-game.org/fund',
          type: 'website',
        });
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}
