import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextPopupComponent } from './text-popup.component';

describe('TextPopupComponent', () => {
  let component: TextPopupComponent;
  let fixture: ComponentFixture<TextPopupComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TextPopupComponent]
    });
    fixture = TestBed.createComponent(TextPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
