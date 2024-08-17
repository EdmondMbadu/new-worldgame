import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSolutionComponent } from './create-solution.component';

describe('CreateSolutionComponent', () => {
  let component: CreateSolutionComponent;
  let fixture: ComponentFixture<CreateSolutionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSolutionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateSolutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
