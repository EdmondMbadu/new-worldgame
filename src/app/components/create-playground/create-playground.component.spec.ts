import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePlaygroundComponent } from './create-playground.component';

describe('CreatePlaygroundComponent', () => {
  let component: CreatePlaygroundComponent;
  let fixture: ComponentFixture<CreatePlaygroundComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CreatePlaygroundComponent]
    });
    fixture = TestBed.createComponent(CreatePlaygroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
