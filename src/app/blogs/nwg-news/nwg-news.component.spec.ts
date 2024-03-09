import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NwgNewsComponent } from './nwg-news.component';

describe('NwgNewsComponent', () => {
  let component: NwgNewsComponent;
  let fixture: ComponentFixture<NwgNewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NwgNewsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NwgNewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
