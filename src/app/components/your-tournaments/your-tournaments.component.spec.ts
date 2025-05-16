import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YourTournamentsComponent } from './your-tournaments.component';

describe('YourTournamentsComponent', () => {
  let component: YourTournamentsComponent;
  let fixture: ComponentFixture<YourTournamentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YourTournamentsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(YourTournamentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
