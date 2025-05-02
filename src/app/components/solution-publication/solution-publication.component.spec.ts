import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolutionPublicationComponent } from './solution-publication.component';

describe('SolutionPublicationComponent', () => {
  let component: SolutionPublicationComponent;
  let fixture: ComponentFixture<SolutionPublicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolutionPublicationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SolutionPublicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
