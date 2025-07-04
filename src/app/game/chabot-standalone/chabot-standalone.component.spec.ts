import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChabotStandaloneComponent } from './chabot-standalone.component';

describe('ChabotStandaloneComponent', () => {
  let component: ChabotStandaloneComponent;
  let fixture: ComponentFixture<ChabotStandaloneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChabotStandaloneComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChabotStandaloneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
