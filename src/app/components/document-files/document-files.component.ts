import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { Avatar } from 'src/app/models/user';
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
    private afs: AngularFirestore
  ) {}
  currentSolution: Solution = {};
  id: any;
  showAddDocument: boolean = false;
  isHovering: boolean = false;
  documents: Avatar[] = [];
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
      if (this.currentSolution.documents) {
        this.documents = this.currentSolution.documents;
        console.log('Documents:', this.documents);
      }
    });
  }
  documentType: string = '';
  documentFileTypes: string[] = [
    'pdf',
    'doc',
    'docx',
    'jpeg',
    'png',
    // 'ppt',
    // 'pptx',
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
  async startUpload(event: FileList) {
    if (!event || event.length === 0) {
      return;
    }

    // Only dealing with single-file upload
    const file = event[0];
    if (!file) return;

    // 1. Enforce max size of 10MB
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_SIZE) {
      alert('File exceeds 10MB limit.');
      return;
    }

    // 2. Exclude video files
    if (file.type.startsWith('video/')) {
      alert('Video files are not allowed.');
      return;
    }

    // 3. Set documentType automatically from the MIME type
    this.documentType = file.type;

    // If we haven't created a docId, do so now
    if (!this.documentId) {
      this.documentId = this.afs.createId();
    }

    try {
      // This is your custom method that handles the actual upload to Firebase Storage
      // and returns the download URL. If needed, adapt it with the same checks above
      // or pass the file object directly.
      const url = await this.data.startUpload(
        event,
        `documents/${this.documentId}`,
        'false'
      );
      this.documentDownloadUrl = url || '';
      console.log('The URL is', this.documentDownloadUrl);
      console.log('The ID is', this.documentId);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error occurred while uploading file. Please try again.');
    }
  }
  toggleHover(event: boolean) {
    this.isHovering = event;
  }

  // Toggle the dropdown for a given doc index
  addDocument() {
    // Ensure we have minimal fields
    if (!this.documentName || !this.documentDownloadUrl) {
      alert(
        'Please fill in all required fields (Name, File) before adding the document.'
      );
      return;
    }

    if (!this.currentSolution?.solutionId) {
      console.error('Error: solutionId is undefined.');
      return;
    }

    // Get current time for sorting/formatting
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    const formattedDate = now.toLocaleString('en-US', options);

    const newDocument: Avatar = {
      downloadURL: this.documentDownloadUrl,
      name: this.documentName,
      description: this.documentDescription,
      type: this.documentType, // e.g. "application/pdf" or "image/png", etc.
      dateSorted: now.getTime(),
      dateCreated: this.time.todaysDate(),
      formattedDateCreated: formattedDate,
    };

    // Add to local array
    this.documents.push(newDocument);
    // Sort descending by dateCreated
    this.documents.sort(
      (a: any, b: any) => (b.dateCreated ?? 0) - (a.dateCreated ?? 0)
    );

    // Update in Firestore
    this.data
      .addDocument(this.documents, this.currentSolution.solutionId)
      .then(() => {
        console.log('Document added successfully:', newDocument);

        // Reset form fields
        this.documentName = '';
        this.documentDescription = '';
        this.documentType = '';
        this.documentDownloadUrl = '';
        this.documentId = '';

        // Close the modal
        this.toggle('showAddDocument');
      })
      .catch((error: any) => {
        console.error('Error adding document:', error);
      });
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
  // deleteDocument(index: number) {
  //   if (!this.currentSolution?.solutionId) {
  //     console.error('No solutionId found; cannot delete doc.');
  //     return;
  //   }

  //   // Remove from local array
  //   this.documents.splice(index, 1);

  //   // Update Firestore with new array
  //   this.data
  //     .addDocument(this.documents, this.currentSolution.solutionId)
  //     .then(() => {
  //       console.log('Document deleted.');
  //       // Optionally close the menu
  //       this.openDocIndex = null;
  //     })
  //     .catch((error) => {
  //       console.error('Error deleting document:', error);
  //     });
  // }
  /**
   * Delete a doc from local array and push the updated array to Firestore
   */
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
}
