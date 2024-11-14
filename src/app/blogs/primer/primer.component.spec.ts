import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrimerComponent } from './primer.component';

describe('PrimerComponent', () => {
  let component: PrimerComponent;
  let fixture: ComponentFixture<PrimerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrimerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
