import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';
import { Admin, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

/** Full SDG titles in the order 1 → 17.
 *  ⚠  Keep the exact spelling & double-space after the number,
 *     because your data service uses those as keys. */
const SDG_TITLES: string[] = [
  'No Poverty',
  'Zero Hunger',
  'Good Health And Well Being',
  'Quality Education',
  'Gender Equality',
  'Clean Water And Sanitation',
  'Affordable And Clean Energy',
  'Decent Work And Economic Growth',
  'Industry Innovation And Infrastructure',
  'Reduced Inequalities',
  'Sustainable Cities And Communities',
  'Responsible Consumption And Production',
  'Climate Action',
  'Life Below Water',
  'Life And Land',
  'Peace, Justice And Strong Institutions',
  'Partnership For The Goals',
];

/** Builds the exact key used in sdgsPaths, e.g. 1 → "SDG1   No Poverty" */
function toSdgKey(n: number): string {
  return `SDG${n}   ${SDG_TITLES[n - 1]}`;
}

@Component({
  selector: 'app-solution-details',
  templateUrl: './solution-details.component.html',
  styleUrl: './solution-details.component.css',
})
export class SolutionDetailsComponent implements OnInit {
  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions
  ) {}

  copied = false;

  async copySolutionId(id?: string) {
    if (!id) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(id);
      } else {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = id;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      this.copied = true;
      setTimeout(() => (this.copied = false), 1500);
    } catch {
      // small retry fallback if needed
      this.copied = false;
    }
  }

  currentSolution: Solution = {};
  id: any;
  newReadMe: string = '';
  newTeamMember: string = '';
  teamMemberToDelete: string = '';
  updateReadMeBox: boolean = false;
  updateTitleBox: boolean = false;
  addTeamMember: boolean = false;
  newTitle: string = '';
  title: string = '';
  showAddTeamMember: boolean = false;
  showRemoveTeamMember: boolean = false;
  showAddEvaluator: boolean = false;
  showRemoveEvaluator: boolean = false;
  newEvaluator: string = '';
  evaluatorToDelete: string = '';
  isHovering: boolean = false;
  teamMembers: User[] = [];
  showPopUpTeam: boolean[] = [];
  showPopUpEvaluators: boolean[] = [];
  evaluators: User[] = [];

  /* ––– NEW STATE ––– */
  admins: Admin[] = [];
  newAdminEmail = '';
  adminToDelete = '';
  showAddAdmin = false;
  showRemoveAdmin = false;

  /* ---- SDG state ---- */
  /* ---- SDG state ---- */
  showAddSdg = false;
  showRemoveSdg = false;

  newSdg = ''; // ← string, pas number
  sdgToDelete = ''; // idem
  selectedSdgToAdd = ''; // holds full key e.g. "SDG4   Quality Education"
  selectedSdgToRemove = ''; // idem

  ngOnInit(): void {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
      console.log('the current solution sdgs', this.currentSolution.sdgs);
      // edge case if the solution has no description
      /* ––– load admins once solution arrives ––– */
      this.admins = this.currentSolution.chosenAdmins ?? [];

      this.newReadMe = this.currentSolution.description || '';
      this.title = this.currentSolution.title || '';
      this.getMembers();
      this.getEvaluators();
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

  toggle(
    property:
      | 'updateReadMeBox'
      | 'addTeamMember'
      | 'showAddTeamMember'
      | 'showRemoveTeamMember'
      | 'updateTitleBox'
      | 'showAddEvaluator'
      | 'showRemoveEvaluator'
      | 'showAddAdmin'
      | 'showRemoveAdmin'
      | 'showAddSdg'
      | 'showRemoveSdg'
  ) {
    this[property] = !this[property];
  }
  async updateReadMe() {
    if (this.newReadMe === this.currentSolution.description) {
      alert('You changed nothing.');
      return;
    } else if (this.newReadMe !== this.currentSolution.description) {
      try {
        const updatedReadMe = await this.solution.updateSolutionReadMe(
          this.currentSolution.solutionId!,
          this.newReadMe
        );
        this.currentSolution.description = this.newReadMe;
        this.toggle('updateReadMeBox');
      } catch (error) {
        alert('Error occured while updating title. Try again!');
      }
    } else {
      alert('Enter a title');
    }
  }
  getMembers() {
    this.teamMembers = [];
    console.log('all participants', this.currentSolution.participants);
    for (const key in this.currentSolution.participants) {
      let participant = this.currentSolution.participants[key];
      let email = Object.values(participant)[0];
      this.auth.getUserFromEmail(email).subscribe((data) => {
        // Check if the email of the incoming data is already in the teamMembers
        if (
          data &&
          data[0] &&
          !this.teamMembers.some((member) => member.email === data[0].email)
        ) {
          this.teamMembers.push(data[0]);
        }
      });
    }
  }
  getEvaluators() {
    this.evaluators = [];

    if (this.currentSolution.evaluators) {
      for (const evaluator of this.currentSolution.evaluators) {
        let email = evaluator.name;
        if (email && evaluator.evaluated !== 'true') {
          this.auth.getUserFromEmail(email).subscribe((data) => {
            // Check if the email of the incoming data is already in the teamMembers
            if (
              data &&
              data[0] &&
              !this.evaluators.some((member) => member.email === data[0].email)
            ) {
              this.evaluators.push(data[0]);
            }
          });
        }
      }
    }
  }
  onHoverImageTeam(index: number) {
    this.showPopUpTeam[index] = true;
  }
  onLeaveTeam(index: number) {
    this.showPopUpTeam[index] = false;
  }

  onHoverImageEvaluators(index: number) {
    this.showPopUpEvaluators[index] = true;
  }
  onLeaveEvaluatros(index: number) {
    this.showPopUpEvaluators[index] = false;
  }
  async addParticipantToSolution() {
    let participants: any = [];
    if (this.data.isValidEmail(this.newTeamMember)) {
      participants = this.currentSolution.participants;
      participants.push({ name: this.newTeamMember });

      this.solution
        .addParticipantsToSolution(
          participants,
          this.currentSolution.solutionId!
        )

        .then(() => {
          alert(`Successfully added ${this.newTeamMember} to the solution.`);
          this.getMembers();

          this.toggle('showAddTeamMember');
        })
        .catch((error) => {
          alert('Error occured while adding a team member. Try Again!');
        });
      await this.sendEmailToParticipant();
      this.newTeamMember = '';
    } else {
      alert('Enter a valid email!');
    }
  }

  addEvaluatorToSolution() {
    let evaluators: any = [];
    if (this.data.isValidEmail(this.newEvaluator)) {
      evaluators = this.currentSolution.evaluators;
      evaluators.push({ name: this.newEvaluator });

      this.solution
        .addEvaluatorsToSolution(evaluators, this.currentSolution.solutionId!)
        .then(() => {
          alert(`Successfully added ${this.newEvaluator} as an evaluator.`);
          this.getEvaluators();
          this.toggle('showAddEvaluator');
        })
        .catch((error) => {
          alert('Error occured while adding an evaluator. Try Again!');
        });
      this.newEvaluator = '';
    } else {
      alert('Enter a valid email!');
    }
  }
  // get isAuthorOfSolution(): boolean {
  //   if (this.currentSolution && this.auth.currentUser) {
  //     return this.currentSolution.authorAccountId === this.auth.currentUser.uid;
  //   }
  //   return false;
  //   // return this.challengePage.authorId === this.auth.currentUser.uid;
  // }

  /* ––– replace old author-only check ––– */
  get isAdminOfSolution(): boolean {
    if (!this.currentSolution || !this.auth.currentUser) return false;
    const uid = this.auth.currentUser.uid;
    return (
      this.currentSolution.authorAccountId === uid ||
      (this.currentSolution.chosenAdmins ?? []).some(
        (a) => a.authorAccountId === uid
      )
    );
  }

  removeEvaluatorFromSolution(email: string) {
    // Ensure evaluators array exists
    if (
      !this.currentSolution.evaluators ||
      !Array.isArray(this.currentSolution.evaluators)
    ) {
      alert('No evaluators found!');
      return;
    } else {
      // Filter out the evaluator to be removed
      const updatedEvaluators = this.currentSolution.evaluators.filter(
        (evaluator: any) => evaluator.name !== email
      );
      // Update the solution's evaluators
      this.solution
        .addEvaluatorsToSolution(
          updatedEvaluators,
          this.currentSolution.solutionId!
        )
        .then(() => {
          alert(`Successfully removed ${email} from the evaluators.`);
          this.getEvaluators(); // Refresh the evaluators list
          this.evaluatorToDelete = '';
          this.toggle('showRemoveEvaluator');
        })
        .catch((error) => {
          console.error('Error occurred while removing an evaluator:', error);
          alert('Error occurred while removing an evaluator. Try again!');
        });
    }
  }

  async sendEmailToParticipant() {
    const sendParticipantInvite = this.fns.httpsCallable('sendParticipantInvite');

    try {
      // Fetch the user data to check if they're registered
      const users = await firstValueFrom(
        this.auth.getUserFromEmail(this.newTeamMember)
      );
      const isRegisteredUser = users && users.length > 0;
      const inviterName = `${this.auth.currentUser.firstName || ''} ${this.auth.currentUser.lastName || ''}`.trim() || 'A team member';

      const emailData = {
        email: this.newTeamMember,
        inviterName,
        title: this.currentSolution.title || 'Solution Lab',
        description: this.currentSolution.description || '',
        image: this.currentSolution.image || '',
        path: `https://newworld-game.org/playground-steps/${this.currentSolution.solutionId}`,
        type: 'solution',
        recipientName: isRegisteredUser ? `${users[0].firstName || ''} ${users[0].lastName || ''}`.trim() : '',
        isNewUser: !isRegisteredUser,
      };

      const result = await firstValueFrom(sendParticipantInvite(emailData));
      console.log(`Email sent to ${this.newTeamMember}:`, result);
    } catch (error) {
      console.error(`Error sending invite to ${this.newTeamMember}:`, error);
    }
  }

  removeParticipantFromSolution(email: string) {
    // Ensure participants array exists
    if (
      !this.currentSolution.participants ||
      !Array.isArray(this.currentSolution.participants)
    ) {
      alert('No participants found!');
      return;
    }

    // Filter out the participant to be removed
    const updatedParticipants = this.currentSolution.participants.filter(
      (participant: any) => participant.name !== email
    );

    // Update the solution's participants
    this.solution
      .addParticipantsToSolution(
        updatedParticipants,
        this.currentSolution.solutionId!
      )
      .then(() => {
        alert(`Successfully removed ${email} from the solution.`);
        this.getMembers(); // Refresh the members list
        this.teamMemberToDelete = '';
        this.toggle('showRemoveTeamMember');
      })
      .catch((error) => {
        console.error('Error occurred while removing a team member:', error);
        alert('Error occurred while removing a team member. Try again!');
      });
  }

  updateTitile() {
    if (this.newTitle !== '') {
      this.solution
        .updateSolutionTitle(this.currentSolution.solutionId!, this.newTitle)
        .then(() => {
          this.title = this.newTitle;
          this.toggle('updateTitleBox');
        })
        .catch((error: any) => {
          alert('Error occured while updating title. Try again!');
        });
    } else {
      alert('Enter a title');
    }
  }
  /* ––– add helper methods ––– */
  addAdminToSolution() {
    if (!this.data.isValidEmail(this.newAdminEmail)) {
      alert('Enter a valid email');
      return;
    }
    this.auth
      .getUserFromEmail(this.newAdminEmail)
      .pipe(take(1)) //  ⬅ grab the first snapshot then complete
      .subscribe((users) => {
        if (!users || !users[0]) {
          alert('No such user');
          return;
        }

        const u = users[0];
        const already = (this.currentSolution.chosenAdmins ?? []).some(
          (a) => a.authorAccountId === u.uid
        );
        if (already) {
          alert('Already admin');
          return;
        }
        const newAdmin: Admin = {
          authorAccountId: u.uid!, //  ← the `!` tells TS “this is non-null”
          authorName: `${u.firstName!} ${u.lastName!}`,
          authorEmail: u.email!, //  ← same here
          authorProfilePicture: u.profilePicture,
        };
        const updated: Admin[] = [
          ...(this.currentSolution.chosenAdmins ?? []),
          newAdmin,
        ];
        this.persistAdmins(updated, () => {
          this.admins = updated;
          this.newAdminEmail = '';
          this.toggle('showAddAdmin');
        });
      });
  }

  removeAdminFromSolution(email: string) {
    const updated = (this.currentSolution.chosenAdmins ?? []).filter(
      (a) =>
        a.authorEmail !== email &&
        a.authorAccountId !== this.currentSolution.authorAccountId // original author is protected
    );
    if (updated.length === (this.currentSolution.chosenAdmins ?? []).length) {
      alert('Cannot remove this admin');
      return;
    }
    this.persistAdmins(updated, () => {
      this.admins = updated;
      this.adminToDelete = '';
      this.toggle('showRemoveAdmin');
    });
  }

  /* ––– tiny DRY helper ––– */
  private persistAdmins(list: Admin[], onOk: () => void) {
    this.solution
      .updateSolutionField(
        this.currentSolution.solutionId!,
        'chosenAdmins',
        list
      )
      .then(onOk)
      .catch(() => alert('Error while updating admins – try again'));
  }
  addSdgToSolution() {
    const key = this.selectedSdgToAdd;
    if (!key) {
      alert('Choose an SDG');
      return;
    }

    const updated = [...(this.currentSolution.sdgs ?? []), key];
    this.persistSdgs(updated, () => {
      this.currentSolution.sdgs = updated;
      this.selectedSdgToAdd = '';
      this.toggle('showAddSdg');
    });
  }

  removeSdgFromSolution() {
    const key = this.selectedSdgToRemove;
    if (!key) {
      alert('Choose an SDG');
      return;
    }

    const updated = (this.currentSolution.sdgs ?? []).filter((k) => k !== key);
    this.persistSdgs(updated, () => {
      this.currentSolution.sdgs = updated;
      this.selectedSdgToRemove = '';
      this.toggle('showRemoveSdg');
    });
  }

  private persistSdgs(list: string[], onOk: () => void) {
    this.solution
      .updateSolutionField(this.currentSolution.solutionId!, 'sdgs', list)
      .then(onOk)
      .catch(() => alert('Error while updating SDGs – try again'));
  }
  get availableSdgs(): string[] {
    // keys that are NOT yet selected
    const current = this.currentSolution.sdgs ?? [];
    return Array.from({ length: 17 }, (_, i) => toSdgKey(i + 1)).filter(
      (k) => !current.includes(k)
    );
  }

  get currentSdgs(): string[] {
    // keys that ARE already selected
    return [...(this.currentSolution.sdgs ?? [])];
  }
}
