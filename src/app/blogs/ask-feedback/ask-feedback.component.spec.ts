import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AskFeedbackComponent } from './ask-feedback.component';

describe('AskFeedbackComponent', () => {
  let component: AskFeedbackComponent;
  let fixture: ComponentFixture<AskFeedbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AskFeedbackComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AskFeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
