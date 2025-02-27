import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalLabComponent } from './global-lab.component';

describe('GlobalLabComponent', () => {
  let component: GlobalLabComponent;
  let fixture: ComponentFixture<GlobalLabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalLabComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GlobalLabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
