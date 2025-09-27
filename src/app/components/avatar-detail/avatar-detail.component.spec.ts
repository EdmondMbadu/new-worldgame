import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarDetailComponent } from './avatar-detail.component';

describe('AvatarDetailComponent', () => {
  let component: AvatarDetailComponent;
  let fixture: ComponentFixture<AvatarDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AvatarDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
