import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { Avatar } from 'src/app/models/user';
import { PresentationFormComponent } from 'src/app/presentations/presentation-form/presentation-form.component';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-document-files',
  templateUrl: './document-files.component.html',
  styleUrl: './document-files.component.css',
})
export class DocumentFilesComponent implements OnInit {
  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    public data: DataService,
    private time: TimeService,
    private router: Router,
    private fns: AngularFireFunctions,
    private afs: AngularFirestore,
    private dialog: MatDialog
  ) {}
  currentSolution: Solution = {};
  id: any;
  showAddDocument: boolean = false;
  isHovering: boolean = false;
  documents: Avatar[] = [];
  presentations: any[] = [];
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
      if (this.currentSolution.documents) {
        this.documents = this.currentSolution.documents;
        console.log('Documents:', this.documents);
      }
      /* ② NEW – live list of presentations */
      this.data.getPresentations(this.id).subscribe((p) => {
        this.presentations = p;
      });
    });
  }
  documentType: string = '';
  documentFileTypes = [
    'pdf',
    'doc',
    'docx',
    'ppt',
    'pptx',
    'xls',
    'xlsx',
    'txt',
    'csv',
    'jpeg',
    'jpg',
    'png',
    'gif',
  ];

  documentName: string = '';
  documentDownloadUrl: string = '';
  documentId: string = '';
  documentDescription: string = '';
  // Track which doc is “open” for the 3-dot menu.
  openDocIndex: number | null = null;

  toggle(property: 'showAddDocument') {
    this[property] = !this[property];
  }

  /**
   * Called when user selects a file OR drops a file in the drop zone.
   * We'll reject if >10MB or if it's a video file.
   * Otherwise, we'll store the MIME type, upload to Firestore, and get a download URL.
   */
  async startUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      return alert('File exceeds 10 MB limit.');
    }
    if (file.type.startsWith('video/')) {
      return alert('Video files are not allowed.');
    }

    this.documentType = file.type;
    this.documentId ||= this.afs.createId();

    try {
      const url = await this.data.startUpload(
        fileList,
        `documents/${this.documentId}`,
        'false'
      );
      this.documentDownloadUrl = url ?? '';
    } catch (err) {
      console.error(err);
      alert('Upload failed, please try again.');
    }
  }
  toggleHover(event: boolean) {
    this.isHovering = event;
  }

  /* ────────────────────────────────
       Save document metadata
  ───────────────────────────────── */
  addDocument() {
    if (!this.documentName || !this.documentDownloadUrl) {
      return alert('Name & file are required.');
    }
    if (!this.currentSolution.solutionId) {
      return;
    }

    const now = new Date();
    const newDoc: Avatar = {
      downloadURL: this.documentDownloadUrl,
      name: this.documentName,
      description: this.documentDescription,
      type: this.documentType, // full MIME
      dateSorted: now.getTime(),
      dateCreated: this.time.todaysDate(),
      formattedDateCreated: now.toLocaleString('en-US', {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };

    this.documents = [newDoc, ...this.documents]; // prepend
    this.data
      .addDocument(this.documents, this.currentSolution.solutionId)
      .then(() => this.resetForm())
      .catch((err) => console.error(err));
  }

  /* helpers */
  resetForm() {
    this.documentName = '';
    this.documentDescription = '';
    this.documentType = '';
    this.documentDownloadUrl = '';
    this.documentId = '';
    this.toggle('showAddDocument');
  }

  toggleDocMenu(index: number) {
    // If this doc’s menu is already open, close it; otherwise open it
    this.openDocIndex = this.openDocIndex === index ? null : index;
  }

  // Copy the document’s URL to the clipboard
  copyUrl(url: string | undefined) {
    if (!url) {
      alert('No URL found for this document.');
      return;
    }

    navigator.clipboard.writeText(url).then(
      () => {
        alert('URL copied to clipboard!');
        // Optionally close the menu
        this.openDocIndex = null;
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  }
  copyEmbedCodeHtml(url: string | undefined) {
    if (!url) {
      alert('No URL found for this document.');
      return;
    }

    // For example, your snippet can wrap an <img> in a <figure>:
    const figureHtml = `
  <figure class="image">
    <img 
      src="${url}" 
      style="aspect-ratio:1164/904;" 
      width="1164" 
      height="904"
    >
  </figure>`;

    // Put HTML onto the clipboard as 'text/html' so CKEditor treats it as HTML:
    const clipboardData = [
      new ClipboardItem({
        // We provide both text/html and text/plain so there's a fallback
        'text/html': new Blob([figureHtml], { type: 'text/html' }),
        'text/plain': new Blob([figureHtml], { type: 'text/plain' }),
      }),
    ];

    navigator.clipboard
      .write(clipboardData)
      .then(() => {
        alert(
          'Image snippet copied as HTML. Paste in CKEditor to see the image!'
        );
        this.openDocIndex = null;
      })
      .catch((err) => {
        console.error('Clipboard write failed: ', err);
        alert('Could not copy as HTML. Check browser permissions.');
      });
  }

  // Delete the doc from our local array, then push the updated array to Firestore

  deleteDocument(index: number) {
    if (!this.currentSolution?.solutionId) {
      console.error('No solutionId found; cannot delete doc.');
      return;
    }

    // Remove it locally
    this.documents.splice(index, 1);

    // Persist in Firestore
    this.data
      .addDocument(this.documents, this.currentSolution.solutionId)
      .then(() => {
        console.log('Document deleted.');
        // Optionally close the menu
        this.openDocIndex = null;
      })
      .catch((error) => {
        console.error('Error deleting document:', error);
      });
  }

  // --- Optional Helpers to show previews in HTML ---
  isImage(mimeType: string): boolean {
    return mimeType?.startsWith('image/');
  }

  isPDF(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }
  /* ③ refresh list after the dialog closes */
  openPresentationForm() {
    this.dialog
      .open(PresentationFormComponent, {
        data: { solutionId: this.id },
        width: '700px',
      })
      .afterClosed()
      .subscribe(() => {
        /* optional: force reload once saved */
        this.data
          .getPresentations(this.id)
          .subscribe((p) => (this.presentations = p));
      });
  }

  openViewer(pid: string) {
    this.router.navigate(
      ['/document-files', this.id, 'presentation', pid] // absolute path
    );
  }
  deletePresentation(pid: string, e: Event) {
    e.stopPropagation(); // ⬅ stop card click
    if (!confirm('Delete this presentation?')) {
      return;
    }

    this.data
      .deletePresentationById(this.id, pid)
      .then(() => console.log('Presentation deleted'))
      .catch((err) => console.error(err));
  }
}
