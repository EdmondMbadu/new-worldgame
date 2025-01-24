import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerateChallengesComponent } from './generate-challenges.component';

describe('GenerateChallengesComponent', () => {
  let component: GenerateChallengesComponent;
  let fixture: ComponentFixture<GenerateChallengesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenerateChallengesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GenerateChallengesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
