import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CareersSocialComponent } from './careers-social.component';

describe('CareersSocialComponent', () => {
  let component: CareersSocialComponent;
  let fixture: ComponentFixture<CareersSocialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CareersSocialComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CareersSocialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
