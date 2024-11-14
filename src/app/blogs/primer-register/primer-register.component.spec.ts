import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrimerRegisterComponent } from './primer-register.component';

describe('PrimerRegisterComponent', () => {
  let component: PrimerRegisterComponent;
  let fixture: ComponentFixture<PrimerRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimerRegisterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrimerRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
