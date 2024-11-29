import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorldgamePacketComponent } from './worldgame-packet.component';

describe('WorldgamePacketComponent', () => {
  let component: WorldgamePacketComponent;
  let fixture: ComponentFixture<WorldgamePacketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorldgamePacketComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WorldgamePacketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
