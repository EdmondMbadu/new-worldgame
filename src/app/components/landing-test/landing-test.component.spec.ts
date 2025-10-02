import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingTestComponent } from './landing-test.component';

describe('LandingTestComponent', () => {
  let component: LandingTestComponent;
  let fixture: ComponentFixture<LandingTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingTestComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LandingTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
