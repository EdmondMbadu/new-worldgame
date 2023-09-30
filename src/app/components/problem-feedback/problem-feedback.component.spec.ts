import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProblemFeedbackComponent } from './problem-feedback.component';

describe('ProblemFeedbackComponent', () => {
  let component: ProblemFeedbackComponent;
  let fixture: ComponentFixture<ProblemFeedbackComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProblemFeedbackComponent]
    });
    fixture = TestBed.createComponent(ProblemFeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
