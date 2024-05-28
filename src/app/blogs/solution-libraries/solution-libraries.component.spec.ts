import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolutionLibrariesComponent } from './solution-libraries.component';

describe('SolutionLibrariesComponent', () => {
  let component: SolutionLibrariesComponent;
  let fixture: ComponentFixture<SolutionLibrariesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolutionLibrariesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SolutionLibrariesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
