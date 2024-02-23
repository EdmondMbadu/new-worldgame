import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomGptDesignScienceStoryboardComponent } from './custom-gpt-design-science-storyboard.component';

describe('CustomGptDesignScienceStoryboardComponent', () => {
  let component: CustomGptDesignScienceStoryboardComponent;
  let fixture: ComponentFixture<CustomGptDesignScienceStoryboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomGptDesignScienceStoryboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CustomGptDesignScienceStoryboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
