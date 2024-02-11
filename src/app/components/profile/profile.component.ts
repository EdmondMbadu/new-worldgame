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
import { Observable, finalize, of, tap } from 'rxjs';
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
    for (let s of this.solutions) {
      if (s.finished === 'true') {
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
    if (this.user?.profilePicture && this.user.profilePicture.path) {
      this.profilePicturePath = this.user.profilePicture.downloadURL;
    }
    this.dateJoined = this.time.getMonthYear(this.user.dateJoined!);
  }

  async startUpload(event: FileList) {
    const file = event?.item(0);
    console.log(' current file data', file);

    if (file?.type.split('/')[0] !== 'image') {
      console.log('unsupported file type');
      return;
    }
    if (file?.size >= 1000000) {
      console.log('the file is too big');
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
}
