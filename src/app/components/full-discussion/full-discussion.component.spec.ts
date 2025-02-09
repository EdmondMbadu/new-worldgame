import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullDiscussionComponent } from './full-discussion.component';

describe('FullDiscussionComponent', () => {
  let component: FullDiscussionComponent;
  let fixture: ComponentFixture<FullDiscussionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullDiscussionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FullDiscussionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
