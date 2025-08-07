import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolManagementComponent } from './school-management.component';

describe('SchoolManagementComponent', () => {
  let component: SchoolManagementComponent;
  let fixture: ComponentFixture<SchoolManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SchoolManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
