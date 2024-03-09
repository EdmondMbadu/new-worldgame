import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArchivePicturesComponent } from './archive-pictures.component';

describe('ArchivePicturesComponent', () => {
  let component: ArchivePicturesComponent;
  let fixture: ComponentFixture<ArchivePicturesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArchivePicturesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ArchivePicturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
