import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinSolutionComponent } from './join-solution.component';

describe('JoinSolutionComponent', () => {
  let component: JoinSolutionComponent;
  let fixture: ComponentFixture<JoinSolutionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinSolutionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(JoinSolutionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
