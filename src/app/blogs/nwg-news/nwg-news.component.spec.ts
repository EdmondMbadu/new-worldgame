import { convertToParamMap } from '@angular/router';
import { NwgNewsComponent } from './nwg-news.component';

describe('NwgNewsComponent', () => {
  let component: NwgNewsComponent;
  let queryParams: Record<string, string>;

  beforeEach(() => {
    queryParams = {};
    const route = {
      snapshot: {
        get queryParamMap() {
          return convertToParamMap(queryParams);
        },
      },
    };
    component = new NwgNewsComponent(
      {} as any,
      {} as any,
      {} as any,
      route as any,
      { navigate: jasmine.createSpy('navigate') } as any,
      { bypassSecurityTrustResourceUrl: (url: string) => url } as any
    );
    spyOn<any>(component, 'autoPlayWithAudio');
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not play a fallback while a deep-linked admin video is loading', () => {
    queryParams = { v: 'weekly-brief-id' };

    (component as any).refreshVideosFromSources();

    expect(component.mainVideo).toBeNull();
    expect(component.isVideoCatalogLoading).toBeTrue();
  });

  it('selects only the requested video when it arrives after the initial render', () => {
    queryParams = { v: 'weekly-brief-id' };
    (component as any).refreshVideosFromSources();
    (component as any).adminVideos = [
      {
        id: 'weekly-brief-id',
        title: 'This week intelligence brief',
        url: 'https://example.com/weekly-brief.mp4',
        source: 'admin',
        createdAtMs: 10,
      },
    ];
    (component as any).hasLoadedAdminVideos = true;

    (component as any).refreshVideosFromSources();

    expect(component.mainVideo?.id).toBe('weekly-brief-id');
    expect(component.mainVideo?.title).toBe('This week intelligence brief');
    expect(component.isVideoCatalogLoading).toBeFalse();
  });

  it('waits for settings before choosing the default video without a deep link', () => {
    (component as any).adminVideos = [
      {
        id: 'saved-default',
        title: 'Saved default',
        url: 'https://example.com/default.mp4',
        source: 'admin',
        createdAtMs: 1,
      },
    ];
    (component as any).hasLoadedAdminVideos = true;

    (component as any).refreshVideosFromSources();
    expect(component.mainVideo).toBeNull();

    component.defaultVideoId = 'saved-default';
    (component as any).hasLoadedNewsSettings = true;
    (component as any).refreshVideosFromSources();

    expect(component.mainVideo?.id).toBe('saved-default');
    expect(component.isVideoCatalogLoading).toBeFalse();
  });
});
