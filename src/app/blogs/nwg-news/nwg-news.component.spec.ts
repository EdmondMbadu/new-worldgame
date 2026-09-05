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
  it('clears old thumbnail metadata when selecting a replacement video', () => {
    component.selectedThumbnail = { dataUrl: 'old', seconds: 10, duration: 60 };
    component.thumbnailCandidates = [component.selectedThumbnail];
    spyOn(component, 'generateThumbnails').and.returnValue(Promise.resolve());
    const file = new File(['video'], 'new.mp4', { type: 'video/mp4' });
    component.onReplacementVideoSelected({ target: { files: [file] } } as any);
    expect(component.selectedThumbnail).toBeNull();
    expect(component.thumbnailCandidates).toEqual([]);
    expect(component.generateThumbnails).toHaveBeenCalled();
  });

  it('does not save while thumbnail preparation is in progress', async () => {
    component.isAdmin = true;
    component.thumbnailBusy = true;
    await component.addVideo();
    expect(component.isSavingVideo).toBeFalse();
  });

  it('clears thumbnail state when the editor closes', () => {
    component.selectedThumbnail = { dataUrl: 'old', seconds: 10, duration: 60 };
    component.closeEditVideoModal();
    expect(component.selectedThumbnail).toBeNull();
    expect(component.thumbnailBusy).toBeFalse();
  });

});
