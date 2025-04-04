import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

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
  ngOnInit(): void {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
      // edge case if the solution has no description

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
  get isAuthorOfSolution(): boolean {
    if (this.currentSolution && this.auth.currentUser) {
      return this.currentSolution.authorAccountId === this.auth.currentUser.uid;
    }
    return false;
    // return this.challengePage.authorId === this.auth.currentUser.uid;
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
    const genericEmail = this.fns.httpsCallable('genericEmail');
    const nonUserEmail = this.fns.httpsCallable('nonUserEmail'); // Ensure you have this Cloud Function set up

    try {
      // Fetch the user data
      const users = await firstValueFrom(
        this.auth.getUserFromEmail(this.newTeamMember)
      );
      console.log('extracted user from email', users);
      console.log('the new solution data', this.solution.newSolution);

      if (users && users.length > 0) {
        // Participant is a registered user
        const emailData = {
          email: this.newTeamMember, // Ensure this is the correct field
          subject: `You Have Been Invited to Join a Solution Lab (NewWorld Game)`,
          title: `${this.currentSolution.title}`,
          description: `${this.currentSolution.description}`,
          author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
          image: `${this.currentSolution.image}`,
          path: `https://newworld-game.org/playground-steps/${this.currentSolution.solutionId}`,
          user: `${users[0].firstName} ${users[0].lastName}`,
          // Add any other necessary fields
        };

        const result = await firstValueFrom(genericEmail(emailData));
        console.log(`Email sent to ${this.newTeamMember}:`, result);
      } else {
        // Participant is NOT a registered user
        // Participant is a registered user
        const emailData = {
          email: this.newTeamMember, // Ensure this is the correct field
          subject: `You Have Been Invited to Join a Solution Lab (NewWorld Game)`,
          title: this.currentSolution.title,
          description: this.currentSolution.description,
          author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
          image: this.currentSolution.image,
          path: `https://newworld-game.org/playground-steps/${this.currentSolution.solutionId}`,
          // Add any other necessary fields
        };

        const result = await firstValueFrom(nonUserEmail(emailData));
        console.log(`Email sent to ${this.newTeamMember}:`, result);
      }
    } catch (error) {
      console.error(
        `Error processing participant ${this.newTeamMember}:`,
        error
      );
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
}
