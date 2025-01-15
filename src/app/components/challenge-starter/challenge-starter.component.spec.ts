import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChallengeStarterComponent } from './challenge-starter.component';

describe('ChallengeStarterComponent', () => {
  let component: ChallengeStarterComponent;
  let fixture: ComponentFixture<ChallengeStarterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeStarterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChallengeStarterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
