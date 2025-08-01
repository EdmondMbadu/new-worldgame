import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolDashboardComponent } from './school-dashboard.component';

describe('SchoolDashboardComponent', () => {
  let component: SchoolDashboardComponent;
  let fixture: ComponentFixture<SchoolDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolDashboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SchoolDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
