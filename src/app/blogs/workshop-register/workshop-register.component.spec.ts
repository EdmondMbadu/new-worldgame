import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkshopRegisterComponent } from './workshop-register.component';

describe('WorkshopRegisterComponent', () => {
  let component: WorkshopRegisterComponent;
  let fixture: ComponentFixture<WorkshopRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkshopRegisterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WorkshopRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
