import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolSignupFreeComponent } from './school-signup-free.component';

describe('SchoolSignupFreeComponent', () => {
  let component: SchoolSignupFreeComponent;
  let fixture: ComponentFixture<SchoolSignupFreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolSignupFreeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SchoolSignupFreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
