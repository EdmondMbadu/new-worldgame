import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSolutionStepsComponent } from './create-solution-steps.component';

describe('CreateSolutionStepsComponent', () => {
  let component: CreateSolutionStepsComponent;
  let fixture: ComponentFixture<CreateSolutionStepsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSolutionStepsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateSolutionStepsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
