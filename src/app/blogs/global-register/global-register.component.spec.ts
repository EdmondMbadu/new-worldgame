import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalRegisterComponent } from './global-register.component';

describe('GlobalRegisterComponent', () => {
  let component: GlobalRegisterComponent;
  let fixture: ComponentFixture<GlobalRegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalRegisterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GlobalRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
