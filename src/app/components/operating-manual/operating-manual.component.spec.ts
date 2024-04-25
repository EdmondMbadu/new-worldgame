import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperatingManualComponent } from './operating-manual.component';

describe('OperatingManualComponent', () => {
  let component: OperatingManualComponent;
  let fixture: ComponentFixture<OperatingManualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatingManualComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OperatingManualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
