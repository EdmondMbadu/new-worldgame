import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagementDemoComponent } from './management-demo.component';

describe('ManagementDemoComponent', () => {
  let component: ManagementDemoComponent;
  let fixture: ComponentFixture<ManagementDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagementDemoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManagementDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
