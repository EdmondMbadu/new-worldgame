import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProblemListFeedbackComponent } from './problem-list-feedback.component';

describe('ProblemListFeedbackComponent', () => {
  let component: ProblemListFeedbackComponent;
  let fixture: ComponentFixture<ProblemListFeedbackComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProblemListFeedbackComponent]
    });
    fixture = TestBed.createComponent(ProblemListFeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
