import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TournamentManagementComponent } from './tournament-management.component';

describe('TournamentManagementComponent', () => {
  let component: TournamentManagementComponent;
  let fixture: ComponentFixture<TournamentManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TournamentManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
