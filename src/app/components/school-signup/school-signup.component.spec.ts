import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolSignupComponent } from './school-signup.component';

describe('SchoolSignupComponent', () => {
  let component: SchoolSignupComponent;
  let fixture: ComponentFixture<SchoolSignupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolSignupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SchoolSignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
