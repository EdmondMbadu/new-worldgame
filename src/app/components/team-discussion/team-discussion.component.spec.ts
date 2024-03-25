import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamDiscussionComponent } from './team-discussion.component';

describe('TeamDiscussionComponent', () => {
  let component: TeamDiscussionComponent;
  let fixture: ComponentFixture<TeamDiscussionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamDiscussionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TeamDiscussionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
