import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveTournamentsComponent } from './active-tournaments.component';

describe('ActiveTournamentsComponent', () => {
  let component: ActiveTournamentsComponent;
  let fixture: ComponentFixture<ActiveTournamentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveTournamentsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ActiveTournamentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
