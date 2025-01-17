import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartChallengeComponent } from './start-challenge.component';

describe('StartChallengeComponent', () => {
  let component: StartChallengeComponent;
  let fixture: ComponentFixture<StartChallengeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartChallengeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StartChallengeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
