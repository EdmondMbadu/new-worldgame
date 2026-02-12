import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunitySignupComponent } from './community-signup.component';

describe('CommunitySignupComponent', () => {
  let component: CommunitySignupComponent;
  let fixture: ComponentFixture<CommunitySignupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CommunitySignupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunitySignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
