import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions
  ) {}

  currentSolution: Solution = {};
  id: any;
  isHovering: boolean = false;
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
    });
  }
  toggleHover(event: boolean) {
    this.isHovering = event;
  }
  async startUpload(event: FileList) {
    try {
      await this.data.startUpload(
        event,
        `solutions/${this.currentSolution.solutionId}`
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error occurred while uploading file. Please try again.');
    }
  }
  onImageClick() {
    // fix the below code to open the file dialog

    const fileInput = document.getElementById('getFile') as HTMLElement;
  }
}
