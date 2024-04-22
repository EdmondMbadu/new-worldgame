import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HowToComponent } from './how-to.component';

describe('HowToComponent', () => {
  let component: HowToComponent;
  let fixture: ComponentFixture<HowToComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HowToComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HowToComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
