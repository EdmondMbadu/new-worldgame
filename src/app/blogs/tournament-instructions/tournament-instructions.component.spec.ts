import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TournamentInstructionsComponent } from './tournament-instructions.component';

describe('TournamentInstructionsComponent', () => {
  let component: TournamentInstructionsComponent;
  let fixture: ComponentFixture<TournamentInstructionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentInstructionsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TournamentInstructionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
