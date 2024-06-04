import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AskBuckyComponent } from './ask-bucky.component';

describe('AskBuckyComponent', () => {
  let component: AskBuckyComponent;
  let fixture: ComponentFixture<AskBuckyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AskBuckyComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AskBuckyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
