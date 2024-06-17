import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StateOfWorldComponent } from './state-of-world.component';

describe('StateOfWorldComponent', () => {
  let component: StateOfWorldComponent;
  let fixture: ComponentFixture<StateOfWorldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StateOfWorldComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StateOfWorldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
