import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamBuildingComponent } from './team-building.component';

describe('TeamBuildingComponent', () => {
  let component: TeamBuildingComponent;
  let fixture: ComponentFixture<TeamBuildingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamBuildingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TeamBuildingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
