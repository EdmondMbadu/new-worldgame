import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-operating-manual',
  templateUrl: './operating-manual.component.html',
  styleUrl: './operating-manual.component.css',
})
export class OperatingManualComponent implements OnInit {
  constructor(public auth: AuthService) {}
  ngOnInit(): void {
    window.scroll(0, 0);
  }
}
