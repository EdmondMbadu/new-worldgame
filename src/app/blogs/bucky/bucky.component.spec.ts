import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuckyComponent } from './bucky.component';

describe('BuckyComponent', () => {
  let component: BuckyComponent;
  let fixture: ComponentFixture<BuckyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuckyComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BuckyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
