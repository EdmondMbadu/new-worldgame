import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagementAskComponent } from './management-ask.component';

describe('ManagementAskComponent', () => {
  let component: ManagementAskComponent;
  let fixture: ComponentFixture<ManagementAskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagementAskComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManagementAskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
