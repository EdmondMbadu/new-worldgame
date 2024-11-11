import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateThanksComponent } from './template-thanks.component';

describe('TemplateThanksComponent', () => {
  let component: TemplateThanksComponent;
  let fixture: ComponentFixture<TemplateThanksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplateThanksComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TemplateThanksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
