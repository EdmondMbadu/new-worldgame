import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagementPrimerComponent } from './management-primer.component';

describe('ManagementPrimerComponent', () => {
  let component: ManagementPrimerComponent;
  let fixture: ComponentFixture<ManagementPrimerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagementPrimerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManagementPrimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
