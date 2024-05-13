import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamplePrefferedStatesComponent } from './sample-preffered-states.component';

describe('SamplePrefferedStatesComponent', () => {
  let component: SamplePrefferedStatesComponent;
  let fixture: ComponentFixture<SamplePrefferedStatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamplePrefferedStatesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SamplePrefferedStatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
