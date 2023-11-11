import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationSummaryComponent } from './evaluation-summary.component';

describe('EvaluationSummaryComponent', () => {
  let component: EvaluationSummaryComponent;
  let fixture: ComponentFixture<EvaluationSummaryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EvaluationSummaryComponent]
    });
    fixture = TestBed.createComponent(EvaluationSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
