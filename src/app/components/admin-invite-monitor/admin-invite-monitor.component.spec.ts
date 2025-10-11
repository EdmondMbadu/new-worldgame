import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminInviteMonitorComponent } from './admin-invite-monitor.component';

describe('AdminInviteMonitorComponent', () => {
  let component: AdminInviteMonitorComponent;
  let fixture: ComponentFixture<AdminInviteMonitorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminInviteMonitorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminInviteMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
