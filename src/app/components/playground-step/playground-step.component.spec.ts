import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaygroundStepComponent } from './playground-step.component';

describe('PlaygroundStepComponent', () => {
  let component: PlaygroundStepComponent;
  let fixture: ComponentFixture<PlaygroundStepComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PlaygroundStepComponent]
    });
    fixture = TestBed.createComponent(PlaygroundStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
