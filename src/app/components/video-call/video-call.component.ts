import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Comment, Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-video-call',
  templateUrl: './video-call.component.html',
  styleUrl: './video-call.component.css'
})
export class VideoCallComponent {
  constructor(
    public auth: AuthService, 
    private activatedRoute: ActivatedRoute,
    public data: DataService,
    public solution: SolutionService
  ){}
  dark: boolean = false;
  id: any = "";
  currentSolution: Solution = {};
  discussion: Comment[] | undefined = [];
  ngOnInit(): void {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    console.log("\n\nthis is the id! ",this.id);
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
      this.discussion = this.currentSolution.discussion;
      console.log("\n\nthis is the solution!! ",this.currentSolution);
    });
    // this.applyTheme();
    // // this.darkModeInitial();
    this.dark = true;
    const darkModeInitialized = localStorage.getItem('darkModeInitialized');

    if (!darkModeInitialized) {
      // set the default to dark mode if and only if not initialized before
      this.data.darkModeInitial();

      // Mark dark mode as initialized so it doesn't run again
      localStorage.setItem('darkModeInitialized', 'true');
    }
  }

}
