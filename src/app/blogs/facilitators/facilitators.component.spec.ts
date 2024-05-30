import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitatorsComponent } from './facilitators.component';

describe('FacilitatorsComponent', () => {
  let component: FacilitatorsComponent;
  let fixture: ComponentFixture<FacilitatorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacilitatorsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FacilitatorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
