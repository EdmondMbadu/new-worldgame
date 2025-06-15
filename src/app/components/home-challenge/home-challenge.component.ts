import { Component, ElementRef, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { nonUserchallengePageInvite } from 'functions/src';
import { firstValueFrom } from 'rxjs';
import { ChallengePage } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-home-challenge',
  templateUrl: './home-challenge.component.html',
  styleUrl: './home-challenge.component.css',
})
export class HomeChallengeComponent {
  titleCreateChallenge: string = '';
  imageCreateChallenge: string = '';
  descriptionCreateChallenge: string = '';
  categoryCreateChallenge: string = '';
  isLoading: boolean = false;

  isSidebarOpen = false;
  heading: string = '';
  subHeading: any = '';
  image: string = '';
  logoImage: string = '';
  showAddChallenge: boolean = false;
  showAddTeamMember: boolean = false;
  showRemoveTeamMember: boolean = false;
  challengePage: ChallengePage = new ChallengePage();
  challengePageId?: any = '';
  categories: string[] = [];
  participantsHidden = false;
  showAllParticipants = false;
  challenges: {
    [key: string]: {
      ids?: string[];
      titles: string[];
      descriptions: string[];
      images: string[];
    };
  } = {};
  challengeId: string = '';
  // Active data to display
  titles: string[] = [];
  descriptions: string[] = [];
  challengeImages: string[] = [];
  ids: string[] = [];
  participants: string[] = [];
  googleMeetLink: string = '';
  newParticipant: string = '';
  teamMemberToDelete: string = '';
  zoomLink = '';
  chatNote = '';
  showEditLinks = false;

  isHovering: boolean = false;
  @ViewChild('solutions') solutionsSection!: ElementRef;
  showDiscussion = false;

  isPrivate = false;
  allowAccess = false; // computed locally
  pageReady = false;
  handouts: { name: string; url: string }[] = [];
  showEditHandouts = false;

  // ✨ temp holders while adding one file
  handoutName = '';
  handoutFile: File | null = null;

  programPDF: { title: string; url: string } | null = null;
  programTitleTmp = '';
  programFileTmp: File | null = null;
  showEditProgram = false;

  // home-challenge.component.ts
  goToChallengeDiscussion() {
    this.router.navigate(['/challenge-discussion', this.challengePageId], {
      queryParams: {
        title: this.heading, // already added
        meet: this.googleMeetLink || this.zoomLink || '', // NEW
      },
    });
  }

  scrollToSolutions() {
    this.solutionsSection.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
  activeCategory: string = '';
  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private router: Router,
    private solution: SolutionService,
    private data: DataService,
    private time: TimeService,
    private afs: AngularFirestore,
    private challenge: ChallengesService,
    private fns: AngularFireFunctions
  ) {}
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.activatedRoute.paramMap.subscribe((params) => {
      this.challengePageId = params.get('id');
      window.scrollTo(0, 0);
      this.pageReady = false;
      this.loadChallengePage();
    });
  }
  loadChallengePage(): void {
    // Reset challenge-related data before fetching new ones
    this.categories = [];
    this.challenges = {};
    this.activeCategory = '';
    this.titles = [];
    this.descriptions = [];
    this.challengeImages = [];
    this.ids = [];

    this.challenge
      .getChallengePageById(this.challengePageId)
      .subscribe((data: any) => {
        this.challengePage = data;
        this.heading = this.challengePage.heading!;
        this.subHeading = this.challengePage.subHeading!;
        this.isPrivate = !!data.isPrivate;
        this.pageReady = true;
        this.participantsHidden = !!data.participantsHidden; // default = false
        this.showParticipantsList = !this.participantsHidden; // sync UI

        // test first if the logo image is available
        if (this.challengePage.logoImage) {
          this.logoImage = this.challengePage.logoImage;
        }
        if (data.handouts) this.handouts = data.handouts;
        if (data.programPDF) this.programPDF = data.programPDF;

        if (this.challengePage.imageChallenge) {
          this.image = this.challengePage.imageChallenge;
        }
        // test if participants array is there
        if (this.challengePage.participants) {
          this.participants = this.challengePage.participants;
          console.log('Participants:', this.participants);
        }
        if (this.challengePage.meetLink) {
          this.googleMeetLink = this.challengePage.meetLink;
          console.log('Google Meet Link:', this.googleMeetLink);
        }
        if (this.challengePage.zoomLink) {
          this.zoomLink = this.challengePage.zoomLink;
        }
        if (this.challengePage.chatNote) {
          this.chatNote = this.challengePage.chatNote;
        }

        this.checkAccess();

        this.challenge
          .getThisUserChallenges(
            this.challengePage.authorId!,
            this.challengePageId
          )
          .subscribe((challenges: any[]) => {
            // Extract unique categories from new challenges
            const uniqueCategories = Array.from(
              new Set(challenges.map((challenge) => challenge.category))
            );

            this.categories = uniqueCategories;
            this.activeCategory = this.categories[0] || ''; // Set to first category if available
            this.fetchChallenges(this.activeCategory);
          });
      });
  }
  private checkAccess(): void {
    // author always gets in
    this.allowAccess =
      this.isAuthorPage ||
      this.participants.includes(this.auth.currentUser.email);
  }

  get isAuthorPage(): boolean {
    return this.challengePage.authorId === this.auth.currentUser.uid;
  }
  toggleAside() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  async setActiveCategory(category: string) {
    if (this.activeCategory === category) {
      return;
    } // noop if already active
    this.activeCategory = category;

    // If this category is already in memory, paint it instantly (no flicker)
    if (this.challenges[category]) {
      this.updateChallenges();
    }

    // Always kick off (re)fetch—will refresh data & UI when query returns
    this.fetchChallenges(category);
  }
  async saveLinks() {
    try {
      await this.afs.doc(`challengePages/${this.challengePageId}`).set(
        {
          meetLink: this.googleMeetLink || null,
          zoomLink: this.zoomLink || null,
          chatNote: this.chatNote?.trim() || null,
        },
        { merge: true }
      );

      this.toggle('showEditLinks');
      alert('Links updated!');
    } catch (err) {
      console.error('Error updating links:', err);
      alert('Could not save links—try again.');
    }
  }
  /** whether the detailed list is visible */
  showParticipantsList = false;

  fetchChallenges(category: string) {
    // only fetch challenges if the category is present and not an empty string
    if (!category) {
      console.warn('No category provided to fetch challenges.');
      return;
    }
    this.challenge
      .getUserChallengesByCategory(category)
      .subscribe((data: any[]) => {
        // Transform the array into the expected format
        const transformedData = {
          ids: data.map((challenge) => challenge.id),
          titles: data.map((challenge) => challenge.title),
          descriptions: data.map((challenge) => challenge.description),
          images: data.map(
            (challenge) => challenge.image || 'No image available'
          ),
        };
        this.challenges[category] = transformedData; // Assign to the challenges object
        // console.log(
        //   `Challenges for category ${category}:`,
        //   this.challenges[category]
        // );
        this.updateChallenges(); // Update the active challenge display
      });
  }

  updateChallenges(): void {
    const categoryData = this.challenges[this.activeCategory];
    // ⬅️ NEW – if we haven’t fetched this category yet, don’t blank the UI
    if (!categoryData) {
      return;
    }
    if (!categoryData) {
      console.warn(`No challenges found for category: ${this.activeCategory}`);
      this.titles = [];
      this.descriptions = [];
      this.challengeImages = [];
      this.ids = [];
      return;
    }
    this.titles = categoryData.titles;
    this.descriptions = categoryData.descriptions;
    this.challengeImages = categoryData.images;
    this.ids = categoryData.ids!;
  }
  /* ── helper to decide which slice to render (optional) ── */
  get participantsToRender(): string[] {
    // always show at least the first 5; show all if toggled
    return this.showAllParticipants
      ? this.participants
      : this.participants.slice(0, 5);
  }
  toggle(
    property:
      | 'isSidebarOpen'
      | 'showAddChallenge'
      | 'showAddTeamMember'
      | 'showRemoveTeamMember'
      | 'showEditLinks'
      | 'showEditHandouts'
      | 'showEditProgram'
  ) {
    this[property] = !this[property];
  }

  async addParticipant() {
    if (!this.newParticipant && this.data.isValidEmail(this.newParticipant)) {
      alert('Please enter a valid email address to add a participant.');
      return;
    }
    if (this.participants.includes(this.newParticipant)) {
      alert('This participant has already been added.');
      return;
    }

    this.participants.push(this.newParticipant);
    this.isLoading = true;

    try {
      this.challenge.addParticipantToChallengePage(
        this.challengePageId,
        this.participants
      ); // then send email to participant
      await this.sendEmailToParticipant(this.newParticipant);

      console.log('Participant added successfully:', this.newParticipant);
      alert('Participant added successfully!');
      this.toggle('showAddTeamMember');
      this.isLoading = false;
    } catch (error) {
      console.error('Error adding participant:', error);
    }
    this.newParticipant = '';
  }

  removeParticipant(email: string) {
    if (!email) {
      console.error('No email provided to remove participant.');
      return; // Exit early
    } else if (!this.participants.includes(email)) {
      console.error('Participant not found in the list.');
      return; // Exit early
    }
    const index = this.participants.indexOf(email);
    this.participants.splice(index, 1); // Remove the participant from the list

    try {
      this.challenge.addParticipantToChallengePage(
        this.challengePageId,
        this.participants
      );

      console.log('Participant removed successfully:', email);
      alert('Participant removed successfully!');
      this.toggle('showRemoveTeamMember');
    } catch (error) {
      console.error('Error removing participant from challenge:', error);
    }
  }
  deleteChallengePage() {
    if (
      !confirm(
        'Are you sure you want to delete this challenge page and all associated user challenges?'
      )
    ) {
      return;
    }

    const batch = this.afs.firestore.batch();
    const challengePageRef = this.afs.doc(
      `challengePages/${this.challengePageId}`
    ).ref;

    // Delete the challenge page
    batch.delete(challengePageRef);

    // Fetch and delete all user challenges where `authorId` matches the current user ID
    const userId = this.auth.currentUser.uid;
    this.afs
      .collection('user-challenges', (ref) =>
        ref.where('authorId', '==', userId)
      )
      .get()
      .subscribe((snapshot) => {
        snapshot.forEach((doc) => {
          batch.delete(doc.ref); // Add each user challenge document to the batch
        });

        // Commit the batch
        batch
          .commit()
          .then(() => {
            console.log(
              'Challenge page and related user challenges deleted successfully.'
            );
            this.router.navigate(['/home']);
          })
          .catch((error) => {
            console.error(
              'Error deleting challenge page or related challenges:',
              error
            );
            alert(
              'There was an error while deleting the challenge page. Try again.'
            );
          });
      });
  }

  toggleHover(event: boolean) {
    this.isHovering = event;
  }
  async startUpload(event: FileList) {
    if (!this.challengeId) {
      this.challengeId = this.afs.createId(); // Generate ID only if not already generated
    }

    try {
      const url = await this.data.startUpload(
        event,
        `challenges/${this.challengeId}`,
        'false'
      );
      this.imageCreateChallenge = url!;
      console.log('The URL is', url);
      console.log('The ID is', this.challengeId);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error occurred while uploading file. Please try again.');
    }
  }
  // addCreateChallenge() {
  //   if (
  //     !this.titleCreateChallenge ||
  //     !this.descriptionCreateChallenge ||
  //     !this.categoryCreateChallenge ||
  //     !this.imageCreateChallenge
  //   ) {
  //     alert('Please fill in all required fields before adding the challenge.');
  //     return;
  //   }

  //   const newChallenge = {
  //     id: this.challengeId,
  //     title: this.titleCreateChallenge,
  //     description: this.descriptionCreateChallenge,
  //     category: this.categoryCreateChallenge,
  //     image: this.imageCreateChallenge,
  //     authordId: this.auth.currentUser.uid,
  //     challengePageId: this.challengePageId,
  //   };

  //   this.challenge
  //     .addUserChallenge(newChallenge)
  //     .then(() => {
  //       console.log('Challenge added successfully:', newChallenge);

  //       // Automatically select the added challenge and navigate
  //       this.selectChallenge();

  //       // Clear the form fields
  //       this.resetCreateChallengeInfo();
  //     })
  //     .catch((error) => {
  //       console.error('Error adding challenge:', error);
  //     });
  // }

  async addCreateChallenge() {
    if (
      !this.titleCreateChallenge ||
      !this.descriptionCreateChallenge ||
      !this.categoryCreateChallenge ||
      !this.imageCreateChallenge
    ) {
      alert('Please fill in all required fields before adding the challenge.');
      return;
    }

    const newChallenge = {
      id: this.challengeId,
      title: this.titleCreateChallenge,
      description: this.descriptionCreateChallenge,
      category: this.categoryCreateChallenge,
      image: this.imageCreateChallenge,
      authordId: this.auth.currentUser.uid,
      challengePageId: this.challengePageId,
    };

    try {
      this.isLoading = true;
      await this.challenge.addUserChallenge(newChallenge);
      console.log('Challenge added successfully:', newChallenge);
      // this.selectChallenge();
      // 2️⃣ create the linked Solution

      await this.solution.createdNewSolution(
        newChallenge.title,
        '',
        newChallenge.description,
        newChallenge.image,

        this.solution.newSolution.participantsHolder, // Assuming 'any' means an array of participants
        [], // Assuming 'any' means an array of evaluators
        // endDate: "", // This was commented out in your request, so I've kept it out
        [],
        this.challengeId
      );
      // Clear the form fields

      // 4️⃣ housekeeping
      // this.resetCreateChallengeInfo();
      // this.toggle('showAddChallenge');
      this.isLoading = false;
      this.router.navigate(['/dashboard', this.challengeId]);
    } catch (err) {
      console.error('Error creating challenge & solution:', err);
      alert('There was a problem creating the challenge.');
    }

    // Automatically select the added challenge and navigate
  }

  resetCreateChallengeInfo() {
    this.titleCreateChallenge = '';
    this.descriptionCreateChallenge = '';
    this.categoryCreateChallenge = '';
    this.imageCreateChallenge = '';
  }
  selectChallenge() {
    if (!this.challengeId) {
      console.error('No challenge ID available to select.');
      return;
    }
    const selectedChallengeItem = {
      id: this.challengeId,
      title: this.titleCreateChallenge,
      description: this.descriptionCreateChallenge,
      image: this.imageCreateChallenge,
      restricted: 'true',
    };

    this.challenge.setSelectedChallengeItem(selectedChallengeItem);

    this.router.navigate(['/start-challenge/']);
  }
  // Function to copy the current URL to the clipboard
  copyUrlToClipboard() {
    const currentUrl = window.location.href;

    // Use the Clipboard API to copy the URL
    navigator.clipboard
      .writeText(currentUrl)
      .then(() => {
        alert('URL copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy URL: ', err);
        alert('Failed to copy URL. Please try again.');
      });
  }

  // New method to send emails to participants
  async sendEmailToParticipant(participant: string) {
    console.log('sending email invite to ', participant);
    const challengePageInvite = this.fns.httpsCallable('challengePageInvite');
    const nonUserchallengePageInvite = this.fns.httpsCallable(
      'nonUserchallengePageInvite'
    ); // Ensure you have this Cloud Function set up

    // for (const participant of participants) {
    try {
      // Fetch the user data
      const users = await firstValueFrom(
        this.auth.getUserFromEmail(participant)
      );
      console.log('extracted user from email', users);
      console.log('the new solution data', this.solution.newSolution);

      if (users && users.length > 0) {
        // Participant is a registered user
        console.log('Participant is a registered user');

        const emailData = {
          email: participant, // Ensure this is the correct field
          subject: `You Have Been Invited to Join a Challenge Workspace @ NewWorld Game`,
          title: `${this.challengePage.name}`,
          description: `${this.challengePage.description}`,
          author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
          image: `${this.challengePage.imageChallenge}`,
          path: `https://newworld-game.org/home-challenge/${this.challengePageId}`,
          user: `${users[0].firstName} ${users[0].lastName}`,
          // Add any other necessary fields
        };

        const result = await firstValueFrom(challengePageInvite(emailData));
        console.log(`Email sent to ${participant}:`, result);
      } else {
        console.log('Participant is NOT a registered user');
        // Participant is NOT a registered user
        // Participant is a registered user
        const emailData = {
          email: participant, // Ensure this is the correct field
          subject: `You Have Been Invited to Join a Challenge Workspace @ NewWorld Game`,
          title: `${this.challengePage.name}`,
          description: `${this.challengePage.description}`,
          author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
          image: `${this.challengePage.imageChallenge}`,
          path: `https://newworld-game.org/home-challenge/${this.challengePageId}`,
          // Add any other necessary fields
        };

        const result = await firstValueFrom(
          nonUserchallengePageInvite(emailData)
        );
        console.log(`Email sent to ${participant}:`, result);
      }
    } catch (error) {
      console.error(`Error processing participant ${participant}:`, error);
    }
    // }
  }
  async deleteChallenge(challengeId: string, index: number) {
    if (!confirm('Delete this challenge? This cannot be undone.')) {
      return;
    }

    this.isLoading = true;

    try {
      /* 1️⃣ delete the user-challenge document */
      await this.afs.doc(`user-challenges/${challengeId}`).delete();

      /* 2️⃣ (optional) delete the linked Solution doc */
      await this.afs
        .doc(`solutions/${challengeId}`)
        .delete()
        .catch(() => {});

      /* 3️⃣ Remove from local arrays so the UI updates instantly */
      this.ids.splice(index, 1);
      this.titles.splice(index, 1);
      this.descriptions.splice(index, 1);
      this.challengeImages.splice(index, 1);

      // If you also track counts per category, update them here.

      alert('Challenge deleted.');
    } catch (err) {
      console.error('Error deleting challenge:', err);
      alert('Could not delete challenge—try again.');
    } finally {
      this.isLoading = false;
    }
  }
  async moveChallenge(challengeId: string, localIndex: number) {
    // 1️⃣ Build a list of choices
    const choices = [...this.categories]; // existing categories
    const newCat = prompt(
      'Move to which category?\n' +
        choices.map((c, idx) => `${idx + 1}. ${c}`).join('\n') +
        '\n\nOr type a new category name:'
    );

    if (!newCat) {
      return;
    } // user cancelled

    // 2️⃣ Update Firestore
    this.isLoading = true;
    try {
      await this.afs
        .doc(`user-challenges/${challengeId}`)
        .update({ category: newCat });

      /* 3️⃣ Local UI updates */

      // 3a remove from current lists
      this.ids.splice(localIndex, 1);
      this.titles.splice(localIndex, 1);
      this.descriptions.splice(localIndex, 1);
      this.challengeImages.splice(localIndex, 1);

      // 3b if new category is brand-new, add it to the filter pills
      if (!this.categories.includes(newCat)) {
        this.categories.push(newCat);
        this.categories.sort();
      }

      // 3c fetch challenges for the destination category so it shows up
      await this.fetchChallenges(newCat);
      this.activeCategory = newCat; // auto-switch view
      alert('Challenge moved.');
    } catch (err) {
      console.error('Move failed:', err);
      alert('Could not move challenge—try again.');
    } finally {
      this.isLoading = false;
    }
  }
  // home-challenge.component.ts  (add below other methods)
  toggleVisibility(): void {
    this.isPrivate = !this.isPrivate;
    this.afs
      .doc(`challengePages/${this.challengePageId}`)
      .update({ isPrivate: this.isPrivate })
      .catch((err) => console.error('Visibility update failed', err));
  }
  async toggleParticipantsVisibilityGlobal() {
    if (!this.isAuthorPage) {
      // safeguard - only author can change for all
      this.showParticipantsList = !this.showParticipantsList; // local fallback
      return;
    }

    // flip & persist
    this.participantsHidden = !this.participantsHidden;
    this.showParticipantsList = !this.participantsHidden;

    try {
      await this.afs
        .doc(`challengePages/${this.challengePageId}`)
        .update({ participantsHidden: this.participantsHidden });
    } catch (err) {
      console.error('Failed to update visibility', err);
      alert('Could not update participants visibility.');
    }
  }
  async addHandout() {
    if (!this.handoutName.trim() || !this.handoutFile) {
      alert('Choose a file and give it a name.');
      return;
    }
    this.isLoading = true;
    try {
      const url = await this.uploadHandout(this.handoutFile);
      this.handouts.push({ name: this.handoutName.trim(), url });

      await this.afs
        .doc(`challengePages/${this.challengePageId}`)
        .update({ handouts: this.handouts });

      // reset inputs
      this.handoutName = '';
      this.handoutFile = null;
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    } finally {
      this.isLoading = false;
    }
  }

  async removeHandout(index: number) {
    if (!confirm('Delete this document?')) return;
    this.handouts.splice(index, 1);
    await this.afs
      .doc(`challengePages/${this.challengePageId}`)
      .update({ handouts: this.handouts });
  }
  async uploadHandout(file: File): Promise<string> {
    // store under the current page → handouts/{randomId}
    const url = await this.data.startUpload(
      file,
      `handouts/${this.afs.createId()}`,
      'false'
    );
    return url!;
  }
  async uploadProgramPDF(file: File): Promise<string> {
    const url = await this.data.startUpload(
      file,
      `programDocs/${this.afs.createId()}`,
      'false'
    );
    return url!;
  }
  async saveProgramPDF() {
    if (!this.programTitleTmp.trim()) {
      alert('Please enter a title.');
      return;
    }

    // if user is only renaming, no new file is needed
    if (!this.programFileTmp && !this.programPDF) {
      alert('Please choose a PDF to upload.');
      return;
    }

    this.isLoading = true;
    try {
      let url = this.programPDF?.url || '';
      if (this.programFileTmp) {
        url = await this.uploadProgramPDF(this.programFileTmp);
      }

      this.programPDF = { title: this.programTitleTmp.trim(), url };

      await this.afs
        .doc(`challengePages/${this.challengePageId}`)
        .update({ programPDF: this.programPDF });

      // reset
      this.programTitleTmp = '';
      this.programFileTmp = null;
      this.toggle('showEditProgram');
    } catch (err) {
      console.error('Program PDF update failed', err);
      alert('Upload failed — try again.');
    } finally {
      this.isLoading = false;
    }
  }

  /* delete */
  async deleteProgramPDF() {
    if (!confirm('Remove the current Program PDF?')) return;
    await this.afs
      .doc(`challengePages/${this.challengePageId}`)
      .update({ programPDF: null });
    this.programPDF = null;
  }
}
