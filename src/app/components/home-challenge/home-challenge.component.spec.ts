import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeChallengeComponent } from './home-challenge.component';

describe('HomeChallengeComponent', () => {
  let component: HomeChallengeComponent;
  let fixture: ComponentFixture<HomeChallengeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeChallengeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HomeChallengeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
