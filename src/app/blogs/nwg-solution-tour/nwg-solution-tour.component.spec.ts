import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NwgSolutionTourComponent } from './nwg-solution-tour.component';

describe('NwgSolutionTourComponent', () => {
  let component: NwgSolutionTourComponent;
  let fixture: ComponentFixture<NwgSolutionTourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NwgSolutionTourComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NwgSolutionTourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
