import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolutionEvaluationComponent } from './solution-evaluation.component';

describe('SolutionEvaluationComponent', () => {
  let component: SolutionEvaluationComponent;
  let fixture: ComponentFixture<SolutionEvaluationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolutionEvaluationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SolutionEvaluationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
