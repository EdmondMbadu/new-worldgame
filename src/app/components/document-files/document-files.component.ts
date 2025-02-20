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
  async startUpload(event: FileList) {
    if (!this.documentId) {
      this.documentId = this.afs.createId(); // Generate ID only if not already generated
    }

    try {
      const url = await this.data.startUpload(
        event,
        `documents/${this.documentId}`,
        'false'
      );
      this.documentDownloadUrl = url!;
      console.log('The URL is', url);
      console.log('The ID is', this.documentId);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error occurred while uploading file. Please try again.');
    }
  }
  toggleHover(event: boolean) {
    this.isHovering = event;
  }
  addDocument() {
    if (!this.documentName || !this.documentType || !this.documentDownloadUrl) {
      alert('Please fill in all required fields before adding the document.');
      return;
    }

    if (!this.currentSolution?.solutionId) {
      console.error('Error: solutionId is undefined.');
      return;
    }
    // Current time
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true, // ensures AM/PM in US locale
    };
    const formattedDate = now.toLocaleString('en-US', options);

    const newDocument: Avatar = {
      downloadURL: this.documentDownloadUrl,
      name: this.documentName,
      description: this.documentDescription,
      type: this.documentType,
      dateSorted: now.getTime(), // numeric timestamp for sorting
      dateCreated: this.time.todaysDate(), // numeric timestamp for sorting
      formattedDateCreated: formattedDate, // e.g. "1/13/25, 3:54 PM"
    };

    this.documents.push(newDocument);
    // Sort so newest is first (descending by dateCreated)
    this.documents.sort(
      (a: any, b: any) => (b.dateCreated ?? 0) - (a.dateCreated ?? 0)
    );
    this.data
      .addDocument(this.documents, this.currentSolution.solutionId)
      .then((data: any) => {
        console.log('Document added successfully:', newDocument);
        this.documentName = '';
        this.documentDescription = '';
        this.documentType = '';
        this.documentDownloadUrl = '';
        this.toggle('showAddDocument');
      })
      .catch((error: any) => {
        console.error('Error adding challenge:', error);
      });
  }

  // Toggle the dropdown for a given doc index
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

  // Delete the doc from our local array, then push the updated array to Firestore
  deleteDocument(index: number) {
    if (!this.currentSolution?.solutionId) {
      console.error('No solutionId found; cannot delete doc.');
      return;
    }

    // Remove from local array
    this.documents.splice(index, 1);

    // Update Firestore with new array
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
}
