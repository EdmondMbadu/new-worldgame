import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolutionDetailsComponent } from './solution-details.component';

describe('SolutionDetailsComponent', () => {
  let component: SolutionDetailsComponent;
  let fixture: ComponentFixture<SolutionDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolutionDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SolutionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
