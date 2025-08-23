import { Injectable, OnInit } from '@angular/core';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { BehaviorSubject, lastValueFrom, map, Observable, of } from 'rxjs';
import { ActiveDescendantKeyManager } from '@angular/cdk/a11y';
import { AskDoc, AskStatus, Avatar, User } from '../models/user';
import { Evaluation, Solution } from '../models/solution';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Router } from '@angular/router';
import { Presentation } from '../models/presentation';
import { FeedbackDoc } from '../components/feedback-management/feedback-management.component';

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
    this.sdgPlus = this.transformSDGsPlus(this.sdgsPaths);
  }
  sdgs: SDG[] = [];
  sdgPlus: SDGPlus[] = [];

  aiOptions = [
    {
      avatarPath: '../../../assets/img/zara-agent.png',
      name: 'Zara Nkosi',
      group: 'colleague',
      sdgs: [1, 4, 15, 10, 17],
      intro: `${name}  a vibrant AI inspired by South African ubuntu
philosophy, believes that “I am because we are.” With a knack for
weaving compelling narratives, she helps players understand
complex social issues like poverty (SDG 1) and inequality (SDG
10) through human-centered stories. Her talent for systems
thinking enables her to guide players in mapping community
dynamics and designing inclusive solutions. Zara’s warm
encouragement makes her a favorite among younger players,
while her deep understanding of grassroots innovation inspires
professionals. She often uses metaphors from African wildlife to
explain interconnected systems, like comparing a thriving
ecosystem to a balanced community.`,
      collectionPath: `users/${this.auth.currentUser.uid}/zara/`,
    },
    {
      avatarPath: '../../../assets/img/arjun-agent.png',
      name: 'Arjun Patel',
      group: 'colleague',
      sdgs: [1, 4, 6, 8, 9, 11],
      intro: ` Arjun, an AI modeled after India’s vibrant tech and social
entrepreneurship scene, thrives on finding solutions with limited
resources. His expertise in data analysis helps players crunch
numbers to tackle challenges like clean water access (SDG 6) or
education gaps (SDG 4). Arjun’s knack for “jugaad” (frugal
innovation) inspires creative, low-cost solutions, such as
repurposing local materials for sustainable infrastructure. His
curious nature encourages players to ask “why” and dig deeper
into problems. Arjun’s ability to bridge cultural perspectives
makes him invaluable in diverse teams, and his witty humor keeps
players engaged.`,
      collectionPath: `users/${this.auth.currentUser.uid}/arjun/`,
    },
    {
      avatarPath: '../../../assets/img/sofia-agent.png',
      name: 'Sofia Morales',
      group: 'colleague',
      sdgs: [5, 13, 16],
      intro: ` Sofia, inspired by Colombia’s peacebuilding and biodiversity,
is a fierce advocate for sustainable development. Her expertise in
conflict resolution helps players navigate tensions in group
dynamics or competing stakeholder interests, crucial for
addressing issues like peace and justice (SDG 16). Sofia’s passion
for environmental stewardship shines when tackling climate
action (SDG 13), guiding players to design solutions that balance
human and ecological needs. Her participatory design skills
ensure that solutions are co-created with communities. Sofia’s
resilience, drawn from Latin America’s history of overcoming
adversity, motivates players to persevere through tough
challenges.`,
      collectionPath: `users/${this.auth.currentUser.uid}/sofia/`,
    },
    {
      avatarPath: '../../../assets/img/li-agent.png',
      name: 'Li Wei',
      group: 'colleague',
      sdgs: [2, 9, 11],
      intro: ` Li Wei, an AI rooted in China’s rapid urbanization and
technological advancements, is a master of strategic thinking. He
excels at helping players design scalable solutions for sustainable
cities (SDG 11) and industry innovation (SDG 9). Li Wei’s ability to
integrate cutting-edge technologies like AI or renewable energy
into problem-solving makes him a go-to for complex challenges.
His long-term forecasting skills help players anticipate future
impacts of their solutions, ensuring durability. While disciplined,
Li Wei’s visionary optimism inspires players to think big, often
quoting ancient Chinese proverbs to spark reflection.`,
      collectionPath: `users/${this.auth.currentUser.uid}/li/`,
    },
    {
      avatarPath: '../../../assets/img/amina-agent.png',
      name: 'Amina Al-Sayed',
      group: 'colleague',
      sdgs: [5, 10, 13],
      intro: `Amina, drawing from Morocco’s rich cultural tapestry, is a
wise AI who emphasizes inclusion and equity in problem-solving.
Her expertise in cross-cultural communication helps players
navigate diverse perspectives, vital for global challenges like
gender equality (SDG 5). Amina’s advocacy for heritage
preservation ensures solutions respect local traditions while
advancing progress, such as protecting cultural sites amid
climate change (SDG 13). Her calming presence and storytelling,
often inspired by Moroccan souks, make complex issues
accessible to younger players, while her nuanced insights
resonate with professionals.`,
      collectionPath: `users/${this.auth.currentUser.uid}/amina/`,
    },
    {
      avatarPath: '../../../assets/img/elena-agent.png',
      name: 'Elena Volkov',
      group: 'colleague',
      sdgs: [2, 3, 7, 12, 17],
      intro: `Elena, inspired by Ukraine’s resilience and innovation amid
adversity, is a bold AI who thrives in high-pressure scenarios. Her
crisis management skills help players tackle urgent challenges
like hunger (SDG 2) or health emergencies (SDG 3), guiding them
to prioritize and act swiftly. Elena’s expertise in renewable energy
supports solutions for affordable, clean energy (SDG 7), such as
designing microgrids for rural areas. Her adaptive leadership
encourages players to pivot when plans fail, and her fierce
determination inspires confidence. Elena’s dry humor and real-
world pragmatism make her relatable across age groups.`,
      collectionPath: `users/${this.auth.currentUser.uid}/elena/`,
    },
    {
      avatarPath: '../../../assets/img/tane-agent.png',
      name: 'Tane Kahu',
      sdgs: [6, 12, 14, 15],
      group: 'colleague',
      intro: `Tane, an AI rooted in Māori wisdom and New Zealand’s
sustainability ethos, brings a holistic perspective to problem-
solving. His deep knowledge of indigenous practices helps
players design solutions that honor local ecosystems, vital for life
on land (SDG 15) and below water (SDG 14). Tane’s expertise in
circular economy principles guides players to create zero-waste
systems, like sustainable agriculture models. His creative
problem-solving, often inspired by Māori storytelling and art,
sparks innovative ideas. Tane’s grounded demeanor and respect
for nature make him a trusted guide for players seeking
meaningful, lasting impact.`,
      collectionPath: `users/${this.auth.currentUser.uid}/tane/`,
    },
    {
      avatarPath: '../../../assets/img/marie-curie.jpg',
      name: 'Marie Curie',
      group: 'elder',
      sdgs: [3, 7],
      intro: `${name} Polish physicist and chemist who revolutionized the fields of medicine and radiology through her groundbreaking research on radioactivity.`,
      collectionPath: `users/${this.auth.currentUser.uid}/marie/`,
    },
    {
      avatarPath: '../../../assets/img/rachel-carlson.jpeg',
      name: 'Rachel Carson',
      group: 'elder',
      sdgs: [8, 13, 14],
      intro: `${name} American marine biologist, writer, and conservationist who is often called the first woman environmentalist.`,
      collectionPath: `users/${this.auth.currentUser.uid}/rachel/`,
    },
    {
      avatarPath: '../../../assets/img/fuller.jpg',
      name: 'Buckminster Fuller',
      group: 'elder',
      // sdgs: [9, 11, 12],
      intro: `${name} American architect, designer, inventor and philosopher who developed the geodesic dome, design science, the World Game, and"
   For more information see <a href="/bucky" class="text-blue-500 underline hover:text-blue-800">here</a>.`,
      collectionPath: `users/${this.auth.currentUser.uid}/bucky/`,
    },
    {
      avatarPath: '../../../assets/img/albert.png',
      name: 'Albert Einstein',
      group: 'elder',
      sdgs: [7, 11, 16],
      intro: `${name} German-born physicist who developed the special and general theories of relativity. He was also a strong peace activist.`,
      collectionPath: `users/${this.auth.currentUser.uid}/albert/`,
    },
    {
      avatarPath: '../../../assets/img/mandela.png',
      name: 'Nelson Mandela',
      group: 'elder',
      sdgs: [8, 16],
      intro: `${name} South African anti-apartheid activist, politician, and statesman who served as the first president of South Africa.`,
      collectionPath: `users/${this.auth.currentUser.uid}/nelson/`,
    },
  ];
  allowedMimeTypes: string[] = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/webb',
    'image/heic',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  ];

  url: string = '';
  private themeSource = new BehaviorSubject<string>(this.getInitialTheme());
  currentTheme = this.themeSource.asObservable();

  sdgsPaths: { [key: string]: string } = {
    None: '../../../assets/img/global-network.webp',
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

      // Include "None" option
      if (name === 'None') {
        sdgs.unshift({
          name,
          fullname: 'None',
          imagePath,
          link,
          backgroundSelected,
        });
      } else {
        sdgs.push({ name, fullname, imagePath, link, backgroundSelected });
      }
    }

    return sdgs;
  }
  darkModeInitial() {
    try {
      localStorage.setItem('theme', 'dark');
    } catch (error) {
      console.warn('Access to localStorage denied:', error);
    }

    this.applyTheme();
  }

  // applyTheme() {
  //   const userTheme = localStorage.getItem('theme'); // 'light', 'dark', or null
  //   // console.log('theme ', userTheme);
  //   this.setTheme(userTheme);
  //   // Explicitly check for 'light' and 'dark' settings

  //   if (userTheme === 'dark') {
  //     document.documentElement.classList.add('dark');
  //   } else if (userTheme === 'light') {
  //     document.documentElement.classList.remove('dark');
  //   } else {
  //     // Apply OS preference only if no user preference is set
  //     const osPrefersDark = window.matchMedia(
  //       '(prefers-color-scheme: dark)'
  //     ).matches;
  //     if (osPrefersDark) {
  //       document.documentElement.classList.add('dark');
  //     } else {
  //       document.documentElement.classList.remove('dark');
  //       document.documentElement.classList.add('light');
  //     }
  //   }
  // }

  applyTheme() {
    let userTheme = null;
    try {
      userTheme = localStorage.getItem('theme');
    } catch (error) {
      console.warn('Access to localStorage denied:', error);
    }

    this.setTheme(userTheme);

    if (userTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (userTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
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
    try {
      return localStorage.getItem('theme') || 'light';
    } catch (error) {
      console.warn('Access to localStorage denied:', error);
      return 'light'; // Default to light mode if storage is inaccessible
    }
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
    let storedTheme: string | null = null;
    try {
      storedTheme = localStorage.getItem('theme');
    } catch (error) {
      console.warn('Access to localStorage denied:', error);
    }

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

    try {
      localStorage.setItem('theme', effectiveTheme);
    } catch (error) {
      console.warn('Access to localStorage denied:', error);
    }
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
  // NEW: Ask Anything submission
  askAnythingSubmit(payload: {
    firstName: string;
    lastName: string;
    email: string;
    question: string;
    uid: string | null;
    createdAtMs: number; // <-- NEW
    status: 'new' | 'read' | 'closed';
  }) {
    return this.afs.collection('ask_anything').add({
      ...payload,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), // exact server write time
    });
  }
  listAskAnything(): Observable<AskDoc[]> {
    return this.afs
      .collection('ask_anything') // order is done in component after normalization
      .snapshotChanges()
      .pipe(
        map((snaps) =>
          snaps.map((s) => {
            const data = s.payload.doc.data() as Omit<AskDoc, 'id'>;
            return { id: s.payload.doc.id, ...data };
          })
        )
      );
  }
  // Feedback submission
  askFeedbackSubmit(payload: {
    firstName: string;
    lastName: string;
    email: string;
    opinion: string; // A
    levels: string[]; // B
    improvements: string; // C
    prompts: string; // D
    courseUse: string; // E
    uid: string | null;
    createdAtMs: number;
    status: 'new' | 'read' | 'closed';
  }) {
    return this.afs.collection('ask_feedback').add({
      ...payload,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  // List feedback (ask_feedback)
  listAskFeedback(): Observable<FeedbackDoc[]> {
    return this.afs
      .collection('ask_feedback') // order handled client-side (createdAtMs normalized)
      .snapshotChanges()
      .pipe(
        map((snaps) =>
          snaps.map((s) => {
            const data = s.payload.doc.data() as Omit<FeedbackDoc, 'id'>;
            return { id: s.payload.doc.id, ...data } as FeedbackDoc;
          })
        )
      );
  }

  // Update status
  setAskFeedbackStatus(
    docId: string,
    status: 'new' | 'read' | 'closed'
  ): Promise<void> {
    return this.afs.collection('ask_feedback').doc(docId).update({
      status,
      // optional: audit trail
      statusChangedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
  setAskStatus(id: string, status: AskStatus) {
    return this.afs.doc(`ask_anything/${id}`).set({ status }, { merge: true });
  }

  deleteAsk(id: string) {
    return this.afs.doc(`ask_anything/${id}`).delete();
  }
  globalLabSignUp(pid: string, registrations: any) {
    const globalLabRef: AngularFirestoreDocument<any> = this.afs.doc(
      `global-lab-2025/${pid}`
    );
    const data = {
      registrations: registrations,
    };
    return globalLabRef.set(data, { merge: true });
  }

  getWorkshopData() {
    return this.afs.collection<any>(`workshop`).valueChanges();
  }
  getPrimerData() {
    return this.afs.collection<any>(`primer`).valueChanges();
  }

  getGlobalLab2025Data() {
    return this.afs.collection<any>(`global-lab-2025`).valueChanges();
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
  async startUpload(
    fileOrList: File | FileList,
    currentPath: string,
    upload = '',
    metadata: Record<string, any> | undefined = undefined // <- NE
  ) {
    const file: File | null =
      fileOrList instanceof File ? fileOrList : fileOrList.item(0);
    console.log(' current file data', file);
    if (!file) return;
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
        alert('The document is too big. It should be less than 10MB');
        return;
      }
    }
    // the file should not be larger than 10MB

    const path = currentPath;

    // the main task
    console.log('the path', path);

    // this.task = await this.storage.upload(path, file);
    const uploadTask = await this.storage.upload(path, file, metadata);
    this.url = await uploadTask.ref.getDownloadURL();
    uploadTask.totalBytes;
    // console.log('the download url', this.url);
    const avatar = {
      path: path,
      downloadURL: this.url,
      size: uploadTask.totalBytes.toString(),
    };

    if (upload === '') this.uploadImageCloudStorage(currentPath, this.url);
    return this.url;
    // this.router.navigate(['/home']);
  }

  parseDateMMDDYYYY(dateStr?: string): number {
    if (!dateStr) return 0;
    const s = dateStr.trim();

    const native = Date.parse(s);
    if (!Number.isNaN(native)) return native;

    const sep = s.includes('/') ? '/' : s.includes('-') ? '-' : '';
    if (!sep) return 0;

    const [mm, dd, yyyy] = s.split(sep);
    const t = new Date(
      parseInt(yyyy, 10),
      parseInt(mm, 10) - 1,
      parseInt(dd, 10)
    ).getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  addDocument(documents: Avatar[], solutionId: string) {
    const solutioneRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );
    const data = {
      documents: documents,
    };
    return solutioneRef.set(data, { merge: true });
  }

  /** Factory that CKEditor will call for every pasted/dropped file */
  createCkeditorUploadAdapter(
    loader: any,
    solutionId: string,
    basePath: string = 'ckeditor'
  ) {
    return {
      /** Uploads the file and resolves with { default : downloadURL } */
      upload: async () => {
        const file: File = await loader.file;

        // ---- client-side guards ------------------------------------------
        if (!this.allowedMimeTypes.includes(file.type))
          return Promise.reject('Unsupported file type');
        if (file.size > 2_000_000 /* 1 MB */)
          return Promise.reject('Image > 2 MB – please shrink it');
        // ------------------------------------------------------------------

        const path = `${basePath}/${Date.now()}_${file.name}`;
        const ref = this.storage.ref(path);
        const task = ref.put(file);

        // wire progress to the CKEditor loader (optional but nice)
        task.percentageChanges().subscribe((p) => {
          loader.uploadTotal = file.size;
          loader.uploaded = Math.floor(((p ?? 0) / 100) * file.size);
        });

        await lastValueFrom(task.snapshotChanges()); // wait for finish
        const url = await lastValueFrom(ref.getDownloadURL());
        // ── NEW: push to `documents` array so DocumentFilesComponent sees it
        const now = new Date();
        const avatar = {
          downloadURL: url,
          name: file.name,
          type: file.type,
          dateSorted: now.getTime(),
          dateCreated: now.getTime(), // use numeric; component formats later
        };

        await this.afs.doc(`solutions/${solutionId}`).update({
          documents: firebase.firestore.FieldValue.arrayUnion(avatar),
        });

        return { default: url }; // CKEditor inserts <img src="…">
      },

      /** Cancels an in-flight upload */
      abort: () => {
        // @ts-ignore – putTasks have a cancel method
        if ((this as any).task?.cancel) (this as any).task.cancel();
      },
    };
  }
  /** Create OR update an NWG presentation (sub-collection of the solution) */
  addPresentation(p: Presentation) {
    return this.afs
      .collection('solutions')
      .doc(p.solutionId)
      .collection<Presentation>('presentations')
      .doc(p.id)
      .set(p, { merge: true });
  }

  /* ------------------------------------------------------------------------- */
  /** Live list of presentations for one solution, ordered newest first */
  getPresentations(solutionId: string) {
    return this.afs
      .collection('solutions')
      .doc(solutionId)
      .collection<Presentation>('presentations', (ref) =>
        ref.orderBy('dateCreated', 'desc')
      )
      .valueChanges({ idField: 'id' });
  }

  /* ------------------------------------------------------------------------- */
  /** Single presentation (used by slide-viewer) */
  getPresentationById(solutionId: string, presentationId: string) {
    return this.afs
      .collection('solutions')
      .doc(solutionId)
      .collection<Presentation>('presentations')
      .doc(presentationId)
      .valueChanges({ idField: 'id' }) as Observable<Presentation>;
  }

  deletePresentationById(solutionId: string, presentationId: string) {
    return this.afs
      .collection('solutions')
      .doc(solutionId)
      .collection('presentations')
      .doc(presentationId)
      .delete();
  }

  /** NEW: produces an array indexed by SDG number (icons + links only) */
  private transformSDGsPlus(paths: { [k: string]: string }): SDGPlus[] {
    const base: { [n: number]: Partial<SDGPlus> } = {};
    Object.entries(paths).forEach(([k, v]) => {
      const match = /^SDG(\d{1,2})\s{2,}(.*)/.exec(k);
      if (!match) return; // skip "None" or broken keys
      const num = Number(match[1]) as SDGPlus['number'];
      base[num] ??= { number: num } as SDGPlus;
      if (k.endsWith('-link')) {
        base[num]!.link = v;
      } else {
        base[num]!.title = match[2];
        base[num]!.icon = v;
      }
    });
    return Object.values(base).map((b) => ({
      number: b.number!,
      title: b.title!,
      icon: b.icon!,
      link: b.link ?? '#',
      avatars: [],
    }));
  }

  public attachAvatars(
    aiOptions: { avatarPath: string; sdgs?: number[] }[]
  ): SDGPlus[] {
    // Deep-copy so we don't mutate the singleton
    const tiles = JSON.parse(JSON.stringify(this.sdgPlus)) as SDGPlus[];

    aiOptions.forEach((ai) => {
      ai.sdgs?.forEach((n) => {
        const tile = tiles.find((t) => t.number === n);
        if (tile) tile.avatars.push(ai.avatarPath);
      });
    });
    return tiles;
  }

  UnfollowUser() {}
  // 👇 REPLACE your old scrollTo method with this one 👇
  scrollTo(event: Event, fragment: string): void {
    event.preventDefault();

    const element = document.getElementById(fragment);
    if (element) {
      // 1. Define the height of your sticky navigation bar
      const offset = 150; // 👈 ADJUST THIS VALUE (in pixels)

      // 2. Calculate the element's position from the top of the page
      const elementPosition =
        element.getBoundingClientRect().top + window.scrollY;

      // 3. Calculate the final scroll position, subtracting the offset
      const offsetPosition = elementPosition - offset;

      // 4. Scroll to the calculated position
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  }
}

export interface SDG {
  name: string;
  fullname: string;
  imagePath: string;
  link: string;
  backgroundSelected?: string;
}
export interface SDGPlus {
  number:
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17;
  title: string;
  icon: string;
  link: string;
  avatars: string[]; // will be filled later
}
