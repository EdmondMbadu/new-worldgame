import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluatorsComponent } from './evaluators.component';

describe('EvaluatorsComponent', () => {
  let component: EvaluatorsComponent;
  let fixture: ComponentFixture<EvaluatorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluatorsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EvaluatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
