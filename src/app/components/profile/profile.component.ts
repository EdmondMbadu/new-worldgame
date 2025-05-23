import { Component, OnInit } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import {
  BoxEducationCredential,
  BoxEmploymentCredential,
  BoxLocationCredential,
  BoxProfileCredential,
  BoxProfileDescription,
} from 'src/app/services/box.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';
import {
  AngularFireStorage,
  AngularFireUploadTask,
} from '@angular/fire/compat/storage';
import { Observable, async, finalize, of, tap } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  user: User = {};
  profilePicturePath?: string = '';
  solutions: Solution[] = [];
  completedSolutions: Solution[] = [];
  dateJoined: string = '';
  task?: AngularFireUploadTask;
  percentage?: Observable<number | undefined>;
  snapshot?: Observable<any>;
  downloadURL?: Observable<string>;
  url: string = '';
  points: number = 100;
  maxPoints: number = 100;
  showSolutionCompletedBadge: boolean = false;
  showSolutionWithPointsBadge: boolean = false;
  location: string = '';

  displayPromptLocation: boolean = true;

  isHovering?: boolean;
  constructor(
    private router: Router,
    public auth: AuthService,
    private time: TimeService,
    private solution: SolutionService,
    public boxProfile: BoxProfileCredential,
    public boxDescription: BoxProfileDescription,
    public boxEmployment: BoxEmploymentCredential,
    public boxEducation: BoxEducationCredential,
    public boxLocation: BoxLocationCredential,
    private storage: AngularFireStorage,
    private data: DataService
  ) {}

  toggleHover(event: boolean) {
    this.isHovering = event;
  }

  findCompletedSolutions() {
    this.completedSolutions = [];
    this.points = 0;
    for (let s of this.solutions) {
      if (s.finished === 'true') {
        if (s.evaluationSummary && s.evaluationSummary.average !== undefined) {
          this.points += Number(s.evaluationSummary.average);
        }

        this.completedSolutions.push(s);
      }
    }
  }
  ngOnInit(): void {
    window.scroll(0, 0);
    this.user = this.auth.currentUser;

    this.solution.getAuthenticatedUserAllSolutions().subscribe((data: any) => {
      this.solutions = data;
      this.findCompletedSolutions();
    });
    if (this.user && this.user.location) {
      this.displayPromptLocation = false;
    }
    if (this.user?.profilePicture && this.user.profilePicture.path) {
      this.profilePicturePath = this.user.profilePicture.downloadURL;
    }
    this.dateJoined = this.time.getMonthYear(this.user.dateJoined!);
  }
  onHoverImageToggle(imageName: string) {
    if (imageName === 'solution-completed') {
      this.showSolutionCompletedBadge = !this.showSolutionCompletedBadge;
    } else if (imageName === 'points') {
      this.showSolutionWithPointsBadge = !this.showSolutionWithPointsBadge;
    }
  }

  async startUpload(event: FileList) {
    const file = event?.item(0);
    console.log(' current file data', file);

    if (file?.type.split('/')[0] !== 'image') {
      console.log('unsupported file type');
      return;
    }
    // the file should not be larger than 5MB
    if (file?.size >= 5000000) {
      console.log('the file is too big');
      alert('The picture is too big. It should be less than 5MB');
      return;
    }
    const path = `avatar/${this.auth.currentUser.uid}-${file.name}`;

    // the main task
    console.log('the path', path);

    // this.task = await this.storage.upload(path, file);
    const uploadTask = await this.storage.upload(path, file);
    this.url = await uploadTask.ref.getDownloadURL();
    uploadTask.totalBytes;
    // console.log('the download url', this.url);
    const avatar = {
      path: path,
      downloadURL: this.url,
      size: uploadTask.totalBytes.toString(),
    };
    this.data.uploadPictureToCloudStorage(this.user, avatar);
    this.router.navigate(['/home']);
  }

  isActive(snapshot: any) {
    return (
      snapshot.state === 'running' &&
      snapshot.bytesTransferred < snapshot.totalBytes
    );
  }

  toggleProfileCredential() {
    this.boxProfile.toggle();
  }

  toggleProfileDescription() {
    this.boxDescription.toggle();
  }

  toggleEmployementCredential() {
    this.boxEmployment.toggle();
  }
  toggleEducationCredential() {
    this.boxEducation.toggle();
  }
  toggleLocationCredential() {
    this.boxLocation.toggle();
  }
  closeDisplayPromptLocation() {
    this.displayPromptLocation = !this.displayPromptLocation;
  }
  async submitLocation() {
    if (this.location === '') {
      alert('Enter your Location');
      return;
    }
    try {
      await this.data.updateLocation(this.user.uid!, this.location);
      // this.closeDisplayPromptLocation();
      this.ngOnInit();
    } catch (error) {
      console.error('Error updating location:', error);
      // Optionally, you can add more error handling logic here, such as displaying an error message to the user.
    }
  }
  async RejectSubmitLocation() {
    try {
      await this.data.updateLocation(this.user.uid!, 'NA');
      this.closeDisplayPromptLocation();
      // this.ngOnInit();
    } catch (error) {
      console.error('Error updating location:', error);
      // Optionally, you can add more error handling logic here, such as displaying an error message to the user.
    }
  }
}
