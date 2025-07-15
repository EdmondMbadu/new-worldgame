import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TournamentLandingComponent } from './tournament-landing.component';

describe('TournamentLandingComponent', () => {
  let component: TournamentLandingComponent;
  let fixture: ComponentFixture<TournamentLandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentLandingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TournamentLandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
