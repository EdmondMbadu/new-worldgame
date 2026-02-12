import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-chester-report',
  templateUrl: './chester-report.component.html',
  styleUrl: './chester-report.component.css',
})
export class ChesterReportComponent implements OnInit {
  readonly reportUrl: string =
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/bulk-mails%2FChester%20Incinerator%20SHUT%20DOWN%20V.2.pdf?alt=media&token=fad0bc89-d81c-4387-b880-df4fca54863f';

  readonly safeReportUrl: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {
    this.safeReportUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.reportUrl
    );
  }

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }
}
