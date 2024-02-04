import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolutionViewExternalComponent } from './solution-view-external.component';

describe('SolutionViewExternalComponent', () => {
  let component: SolutionViewExternalComponent;
  let fixture: ComponentFixture<SolutionViewExternalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolutionViewExternalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SolutionViewExternalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
