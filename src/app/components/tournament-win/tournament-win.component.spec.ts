import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TournamentWinComponent } from './tournament-win.component';

describe('TournamentWinComponent', () => {
  let component: TournamentWinComponent;
  let fixture: ComponentFixture<TournamentWinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentWinComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TournamentWinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
