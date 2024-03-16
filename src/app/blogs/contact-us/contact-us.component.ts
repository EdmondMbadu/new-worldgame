import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-contact-us',
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.css',
})
export class ContactUsComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 0);
  }
}
