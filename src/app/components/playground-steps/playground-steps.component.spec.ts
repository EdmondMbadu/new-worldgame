import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaygroundStepsComponent } from './playground-steps.component';

describe('PlaygroundStepsComponent', () => {
  let component: PlaygroundStepsComponent;
  let fixture: ComponentFixture<PlaygroundStepsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PlaygroundStepsComponent]
    });
    fixture = TestBed.createComponent(PlaygroundStepsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
