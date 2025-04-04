import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListFinishedSolutionsComponent } from './list-finished-solutions.component';

describe('ListFinishedSolutionsComponent', () => {
  let component: ListFinishedSolutionsComponent;
  let fixture: ComponentFixture<ListFinishedSolutionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListFinishedSolutionsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ListFinishedSolutionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
