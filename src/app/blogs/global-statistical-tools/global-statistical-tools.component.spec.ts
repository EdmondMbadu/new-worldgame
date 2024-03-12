import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalStatisticalToolsComponent } from './global-statistical-tools.component';

describe('GlobalStatisticalToolsComponent', () => {
  let component: GlobalStatisticalToolsComponent;
  let fixture: ComponentFixture<GlobalStatisticalToolsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalStatisticalToolsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GlobalStatisticalToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
