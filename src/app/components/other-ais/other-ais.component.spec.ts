import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherAisComponent } from './other-ais.component';

describe('OtherAisComponent', () => {
  let component: OtherAisComponent;
  let fixture: ComponentFixture<OtherAisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtherAisComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OtherAisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
