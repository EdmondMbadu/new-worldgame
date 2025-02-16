import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentFilesComponent } from './document-files.component';

describe('DocumentFilesComponent', () => {
  let component: DocumentFilesComponent;
  let fixture: ComponentFixture<DocumentFilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentFilesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DocumentFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
