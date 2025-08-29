import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BroadcastedSolutionsComponent } from './broadcasted-solutions.component';

describe('BroadcastedSolutionsComponent', () => {
  let component: BroadcastedSolutionsComponent;
  let fixture: ComponentFixture<BroadcastedSolutionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BroadcastedSolutionsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BroadcastedSolutionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
