import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagementWorkshopComponent } from './management-workshop.component';

describe('ManagementWorkshopComponent', () => {
  let component: ManagementWorkshopComponent;
  let fixture: ComponentFixture<ManagementWorkshopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagementWorkshopComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManagementWorkshopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
