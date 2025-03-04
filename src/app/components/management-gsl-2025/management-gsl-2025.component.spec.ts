import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagementGsl2025Component } from './management-gsl-2025.component';

describe('ManagementGsl2025Component', () => {
  let component: ManagementGsl2025Component;
  let fixture: ComponentFixture<ManagementGsl2025Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagementGsl2025Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManagementGsl2025Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
