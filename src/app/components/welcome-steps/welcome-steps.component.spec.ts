import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeStepsComponent } from './welcome-steps.component';

describe('WelcomeStepsComponent', () => {
  let component: WelcomeStepsComponent;
  let fixture: ComponentFixture<WelcomeStepsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeStepsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WelcomeStepsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
