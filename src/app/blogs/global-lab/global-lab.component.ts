import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-global-lab',
  templateUrl: './global-lab.component.html',
  styleUrl: './global-lab.component.css',
})
export class GlobalLabComponent implements OnInit {
  ngOnInit(): void {
    window.scrollTo(0, 0);
  }
  reachOutVisa: string = 'info@1earthgame.org';
}
