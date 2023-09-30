import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProblemListViewComponent } from './problem-list-view.component';

describe('ProblemListViewComponent', () => {
  let component: ProblemListViewComponent;
  let fixture: ComponentFixture<ProblemListViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProblemListViewComponent]
    });
    fixture = TestBed.createComponent(ProblemListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
