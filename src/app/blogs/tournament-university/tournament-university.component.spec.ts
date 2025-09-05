import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TournamentUniversityComponent } from './tournament-university.component';

describe('TournamentUniversityComponent', () => {
  let component: TournamentUniversityComponent;
  let fixture: ComponentFixture<TournamentUniversityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentUniversityComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TournamentUniversityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
