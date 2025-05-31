import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NwgStepsComponent } from './nwg-steps.component';

describe('NwgStepsComponent', () => {
  let component: NwgStepsComponent;
  let fixture: ComponentFixture<NwgStepsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NwgStepsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NwgStepsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
