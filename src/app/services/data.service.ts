import { Injectable, OnInit } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { ActiveDescendantKeyManager } from '@angular/cdk/a11y';
import { Avatar, User } from '../models/user';
import { Evaluation, Solution } from '../models/solution';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class DataService implements OnInit {
  constructor(
    private auth: AuthService,
    private afs: AngularFirestore,
    private storage: AngularFireStorage,
    private router: Router
  ) {
    this.loadInitialTheme();
    window.addEventListener('storage', (event) => {
      if (event.key === 'theme') {
        this.setTheme(event.newValue);
      }
    });
    this.sdgs = this.transformSDGs(this.sdgsPaths);
  }
  sdgs: SDG[] = [];
  allowedMimeTypes: string[] = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/webb',
  ];
  url: string = '';
  private themeSource = new BehaviorSubject<string>(this.getInitialTheme());
  currentTheme = this.themeSource.asObservable();

  sdgsPaths: { [key: string]: string } = {
    None: '../../../assets/img/global-network.png',
    'SDG1   No Poverty': '../../../assets/img/sdg1.png',
    'SDG1   No Poverty-link': 'https://sdgs.un.org/goals/goal1',
    'SDG2   Zero Hunger': '../../../assets/img/sdg2.png',
    'SDG2   Zero Hunger-link': 'https://sdgs.un.org/goals/goal2',
    'SDG3   Good Health And Well Being': '../../../assets/img/sdg3.png',
    'SDG3   Good Health And Well Being-link': 'https://sdgs.un.org/goals/goal3',
    'SDG4   Quality Education': '../../../assets/img/sdg4.png',
    'SDG4   Quality Education-link': 'https://sdgs.un.org/goals/goal4',
    'SDG5   Gender Equality': '../../../assets/img/sdg5.png',
    'SDG5   Gender Equality-link': 'https://sdgs.un.org/goals/goal5',
    'SDG6   Clean Water And Sanitation': '../../../assets/img/sdg6.png',
    'SDG6   Clean Water And Sanitation-link': 'https://sdgs.un.org/goals/goal6',
    'SDG7   Affordable And Clean Energy': '../../../assets/img/sdg7.png',
    'SDG7   Affordable And Clean Energy-link':
      'https://sdgs.un.org/goals/goal7',
    'SDG8   Decent Work And Economic Growth': '../../../assets/img/sdg8.png',
    'SDG8   Decent Work And Economic Growth-link':
      'https://sdgs.un.org/goals/goal8',
    'SDG9   Industry Innovation And Infrastructure':
      '../../../assets/img/sdg9.png',
    'SDG9   Industry Innovation And Infrastructure-link':
      'https://sdgs.un.org/goals/goal9',
    'SDG10  Reduced Inequalities': '../../../assets/img/sdg10.png',
    'SDG10  Reduced Inequalities-link': 'https://sdgs.un.org/goals/goal10',
    'SDG11  Sustainable Cities And Communities':
      '../../../assets/img/sdg11.png',
    'SDG11  Sustainable Cities And Communities-link':
      'https://sdgs.un.org/goals/goal11',
    'SDG12  Responsible Consumption And Production':
      '../../../assets/img/sdg12.png',
    'SDG12  Responsible Consumption And Production-link':
      'https://sdgs.un.org/goals/goal12',
    'SDG13  Climate Action': '../../../assets/img/sdg13.png',
    'SDG13  Climate Action-link': 'https://sdgs.un.org/goals/goal13',
    'SDG14  Life Below Water': '../../../assets/img/sdg14.png',
    'SDG14  Life Below Water-link': 'https://sdgs.un.org/goals/goal14',
    'SDG15  Life And Land': '../../../assets/img/sdg15.png',
    'SDG15  Life And Land-link': 'https://sdgs.un.org/goals/goal15',
    'SDG16  Peace, Justice And Strong Institutions':
      '../../../assets/img/sdg16.png',
    'SDG16  Peace, Justice And Strong Institutions-link':
      'https://sdgs.un.org/goals/goal16',
    'SDG17  Partnership For The Goals': '../../../assets/img/sdg17.png',
    'SDG17  Partnership For The Goals-link': 'https://sdgs.un.org/goals/goal17',
  };
  transformSDGs(sdgsPaths: { [key: string]: string }): SDG[] {
    const sdgs: SDG[] = [];
    const sdgNames = Object.keys(sdgsPaths).filter(
      (key) => !key.includes('-link')
    );
    for (const sdgName of sdgNames) {
      const name = sdgName.split(' ')[0];
      const fullname = sdgName.substring(name.length).trim();
      const imagePath = sdgsPaths[sdgName];
      const linkKey = `${sdgName}-link`;
      const backgroundSelected = '';
      const link = sdgsPaths[linkKey] || '';
      if (name !== 'None')
        sdgs.push({ name, fullname, imagePath, link, backgroundSelected });
    }
    return sdgs;
  }
  darkModeInitial() {
    localStorage['theme'] = 'dark'; // Save to localStorage
    // Save to localStorage

    this.applyTheme();
  }

  applyTheme() {
    const userTheme = localStorage.getItem('theme'); // 'light', 'dark', or null
    // console.log('theme ', userTheme);
    this.setTheme(userTheme);
    // Explicitly check for 'light' and 'dark' settings

    if (userTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (userTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Apply OS preference only if no user preference is set
      const osPrefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      if (osPrefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  }

  loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Script load error for ${src}`));
      document.head.appendChild(script);
    });
  }
  get sdgEntries(): any {
    return Object.entries(this.sdgsPaths);
  }
  ngOnInit(): void {}
  private getInitialTheme(): string {
    return localStorage.getItem('theme') || 'light';
  }
  getSdgLabel(sdgCode: string) {
    for (let key in this.sdgsPaths) {
      if (key.startsWith(sdgCode) && !key.includes('-link')) {
        return key;
      }
    }
    return '';
  }

  private loadInitialTheme(): void {
    const storedTheme = localStorage.getItem('theme');
    this.setTheme(storedTheme);
  }

  private getSystemTheme(): string {
    // Default to system theme if localStorage theme is null
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  setTheme(theme: string | null): void {
    const effectiveTheme = theme || this.getSystemTheme();
    this.themeSource.next(effectiveTheme);
    document.documentElement.classList.toggle(
      'dark',
      effectiveTheme === 'dark'
    );
    localStorage.setItem('theme', effectiveTheme);
  }
  uploadPictureToCloudStorage(user: User, avatar: Avatar) {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${user.uid}`
    );
    const data = {
      profilePicture: avatar,
    };
    return userRef.set(data, { merge: true });
  }
  uploadImageCloudStorage(path: string, url: string) {
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `${path}`
    );
    const data = {
      image: url,
    };
    return solutionRef.set(data, { merge: true });
  }
  getAllUsers() {
    return this.afs.collection<User>(`users`).valueChanges();
  }

  updateFollowers(uid: string, followers: string[]) {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${uid}`
    );
    const data = {
      followersArray: followers,
      followers: followers.length.toString(),
    };
    return userRef.set(data, { merge: true });
  }

  updateFollowing(uid: string, following: string[]) {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${uid}`
    );
    const data = {
      followingArray: following,
      following: following.length.toString(),
    };
    return userRef.set(data, { merge: true });
  }
  updateLocation(uid: string, location: string) {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${uid}`
    );
    const data = {
      location: location,
    };
    return userRef.set(data, { merge: true });
  }
  workshopSignUp(wid: string, signUps: any) {
    const workshopRef: AngularFirestoreDocument<any> = this.afs.doc(
      `workshop/${wid}`
    );
    const data = {
      signUps: signUps,
    };
    return workshopRef.set(data, { merge: true });
  }
  primerSignUp(pid: string, signUps: any) {
    const primerRef: AngularFirestoreDocument<any> = this.afs.doc(
      `primer/${pid}`
    );
    const data = {
      signUps: signUps,
    };
    return primerRef.set(data, { merge: true });
  }
  getWorkshopData() {
    return this.afs.collection<any>(`workshop`).valueChanges();
  }
  getPrimerData() {
    return this.afs.collection<any>(`primer`).valueChanges();
  }
  mapEvaluationToNumeric(evaluation: Evaluation) {
    let user: any = {};
    if (evaluation) {
      return {
        average: Math.floor(parseFloat(evaluation.average!) * 10),
        achievable: Math.floor(parseFloat(evaluation.achievable!) * 10),
        feasible: parseFloat(evaluation.feasible!) * 10,
        ecological: parseFloat(evaluation.ecological!) * 10,
        economical: parseFloat(evaluation.economical!) * 10,
        equitable: parseFloat(evaluation.equitable!) * 10,
        understandable: parseFloat(evaluation.understandable!) * 10,
        evaluator: user,
      };
    } else {
      return {};
    }
  }

  getColorForValue(value: number): string {
    if (value >= 0 && value <= 60) {
      return 'bg-red-700';
    } else if (value >= 61 && value <= 70) {
      return 'bg-orange-500';
    } else if (value >= 71 && value <= 80) {
      return 'bg-amber-400';
    } else if (value >= 81 && value <= 90) {
      return 'bg-yellow-300';
    } else if (value >= 91 && value <= 100) {
      return 'bg-green-500';
    } else {
      return 'unknown'; // for values outside the range or NaN
    }
  }
  mapEvaluationToColors(evaluation: Evaluation) {
    if (evaluation) {
      return {
        average: this.getColorForValue(parseFloat(evaluation.average!) * 10),
        achievable: this.getColorForValue(
          parseFloat(evaluation.achievable!) * 10
        ),
        feasible: this.getColorForValue(parseFloat(evaluation.feasible!) * 10),
        ecological: this.getColorForValue(
          parseFloat(evaluation.ecological!) * 10
        ),
        economical: this.getColorForValue(
          parseFloat(evaluation.economical!) * 10
        ),
        equitable: this.getColorForValue(
          parseFloat(evaluation.equitable!) * 10
        ),
        understandable: this.getColorForValue(
          parseFloat(evaluation.understandable!) * 10
        ),
      };
    } else {
      return {};
    }
  }

  // this regex needs to be revisted.
  isValidEmail(email: string): boolean {
    const regex =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(email);
  }

  deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) {
      return true; // same reference
    }

    if (
      typeof obj1 !== 'object' ||
      obj1 === null ||
      typeof obj2 !== 'object' ||
      obj2 === null
    ) {
      return false; // not objects or one is null
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false; // different number of keys
    }

    for (const key of keys1) {
      if (!keys2.includes(key) || !this.deepEqual(obj1[key], obj2[key])) {
        return false; // keys don't match or values don't match
      }
    }

    return true;
  }
  async startUpload(event: FileList, currentPath: string) {
    const file = event?.item(0);
    console.log(' current file data', file);

    if (file) {
      if (!this.allowedMimeTypes.includes(file.type)) {
        console.log('unsupported file type');
        return;
      }

      // Proceed with file processing
      console.log('File is supported:', file);
      // Your file handling logic here
      if (file?.size >= 10000000) {
        console.log('the file is too big');
        alert('The picture is too big. It should be less than 5MB');
        return;
      }
    }
    // the file should not be larger than 10MB

    const path = currentPath;

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

    this.uploadImageCloudStorage(currentPath, this.url);
    return this.url;
    // this.router.navigate(['/home']);
  }

  public parseDateMMDDYYYY(dateString: string): number {
    const [month, day, year] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }

  UnfollowUser() {}
}

export interface SDG {
  name: string;
  fullname: string;
  imagePath: string;
  link: string;
  backgroundSelected?: string;
}
