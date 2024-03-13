import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NwgAiComponent } from './nwg-ai.component';

describe('NwgAiComponent', () => {
  let component: NwgAiComponent;
  let fixture: ComponentFixture<NwgAiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NwgAiComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NwgAiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
