import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolutionPreviewComponent } from './solution-preview.component';

describe('SolutionPreviewComponent', () => {
  let component: SolutionPreviewComponent;
  let fixture: ComponentFixture<SolutionPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolutionPreviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SolutionPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
