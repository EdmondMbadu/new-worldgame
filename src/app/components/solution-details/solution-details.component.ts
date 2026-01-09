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

type InviteRole = 'designer' | 'evaluator' | 'admin';

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
  filteredTeamMembers: User[] = [];
  showPopUpTeam: boolean[] = [];
  showPopUpEvaluators: boolean[] = [];
  evaluators: User[] = [];
  filteredEvaluators: User[] = [];

  /* ––– NEW STATE ––– */
  admins: Admin[] = [];
  filteredAdmins: Admin[] = [];
  newAdminEmail = '';
  adminToDelete = '';
  showAddAdmin = false;
  showRemoveAdmin = false;

  // Invite modal state (designers/evaluators/admins)
  showInviteModal = false;
  inviteRole: InviteRole = 'designer';
  inviteInput = '';
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  showUserSuggestions = false;
  selectedUser: User | null = null;
  private inviteSearchTimeout: any;
  isSearchingUsers = false;
  invitedParticipants: Array<{
    email: string;
    name?: string;
    status: 'success' | 'error';
  }> = [];
  pendingParticipants: Array<{
    email: string;
    name: string;
    user?: User;
  }> = [];
  isAddingParticipant = false;

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

    this.auth.getALlUsers().subscribe((users) => {
      this.allUsers = users;
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
    if (property === 'showRemoveTeamMember' && this[property]) {
      this.filteredTeamMembers = [...this.teamMembers];
    }
    if (property === 'showRemoveEvaluator' && this[property]) {
      this.filteredEvaluators = [...this.evaluators];
    }
    if (property === 'showRemoveAdmin' && this[property]) {
      this.filteredAdmins = [...this.admins];
    }
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

  openInviteModal(role: InviteRole) {
    this.inviteRole = role;
    this.showInviteModal = true;
    this.resetInviteState();
  }

  closeInviteModal() {
    this.showInviteModal = false;
    this.resetInviteState();
  }

  private resetInviteState() {
    this.inviteInput = '';
    this.filteredUsers = [];
    this.showUserSuggestions = false;
    this.selectedUser = null;
    this.invitedParticipants = [];
    this.pendingParticipants = [];
    this.isAddingParticipant = false;
    this.isSearchingUsers = false;
    if (this.inviteSearchTimeout) {
      clearTimeout(this.inviteSearchTimeout);
    }
  }

  get inviteRoleSingular(): string {
    switch (this.inviteRole) {
      case 'evaluator':
        return 'Evaluator';
      case 'admin':
        return 'Admin';
      default:
        return 'Designer';
    }
  }

  get inviteRolePlural(): string {
    switch (this.inviteRole) {
      case 'evaluator':
        return 'Evaluators';
      case 'admin':
        return 'Admins';
      default:
        return 'Designers';
    }
  }

  get allowTypedEmail(): boolean {
    return this.inviteRole !== 'admin';
  }

  get canAddInvitee(): boolean {
    return (
      !!this.inviteInput &&
      (!!this.selectedUser ||
        (this.allowTypedEmail && this.data.isValidEmail(this.inviteInput)))
    );
  }

  onRemoveInput(role: InviteRole) {
    const query = this.getRemoveQuery(role);
    if (!query) {
      this.filteredTeamMembers = [...this.teamMembers];
      this.filteredEvaluators = [...this.evaluators];
      this.filteredAdmins = [...this.admins];
      return;
    }

    if (role === 'designer') {
      this.filteredTeamMembers = this.filterUsersForRemoval(
        this.teamMembers,
        query
      );
      return;
    }

    if (role === 'evaluator') {
      this.filteredEvaluators = this.filterUsersForRemoval(
        this.evaluators,
        query
      );
      return;
    }

    this.filteredAdmins = this.filterAdminsForRemoval(this.admins, query);
  }

  selectRemoveCandidate(role: InviteRole, email: string) {
    if (!email) return;
    if (role === 'designer') {
      this.teamMemberToDelete = email;
      this.filteredTeamMembers = [];
      return;
    }
    if (role === 'evaluator') {
      this.evaluatorToDelete = email;
      this.filteredEvaluators = [];
      return;
    }
    this.adminToDelete = email;
    this.filteredAdmins = [];
  }

  private getRemoveQuery(role: InviteRole): string {
    if (role === 'designer') {
      return (this.teamMemberToDelete || '').toLowerCase().trim();
    }
    if (role === 'evaluator') {
      return (this.evaluatorToDelete || '').toLowerCase().trim();
    }
    return (this.adminToDelete || '').toLowerCase().trim();
  }

  private filterUsersForRemoval(users: User[], query: string): User[] {
    return users
      .filter((user) => {
        const firstName = user.firstName?.toLowerCase() || '';
        const lastName = user.lastName?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return (
          firstName.includes(query) ||
          lastName.includes(query) ||
          fullName.includes(query) ||
          email.includes(query)
        );
      })
      .slice(0, 10);
  }

  private filterAdminsForRemoval(admins: Admin[], query: string): Admin[] {
    return admins
      .filter((admin) => {
        const name = admin.authorName?.toLowerCase() || '';
        const email = admin.authorEmail?.toLowerCase() || '';
        return name.includes(query) || email.includes(query);
      })
      .slice(0, 10);
  }

  onInviteInputChange() {
    if (this.inviteSearchTimeout) {
      clearTimeout(this.inviteSearchTimeout);
    }

    this.selectedUser = null;

    const searchTerm = this.inviteInput.toLowerCase().trim();
    if (searchTerm.length === 0) {
      this.filteredUsers = [];
      this.showUserSuggestions = false;
      this.isSearchingUsers = false;
      return;
    }

    this.filteredUsers = this.filterUsersLocally(searchTerm);
    this.showUserSuggestions = this.filteredUsers.length > 0;

    const exactMatch = this.allUsers.find(
      (user) => user.email?.toLowerCase() === searchTerm
    );
    if (exactMatch) {
      this.selectedUser = exactMatch;
    }

    if (this.filteredUsers.length < 5 || searchTerm.includes('@')) {
      this.isSearchingUsers = true;
      this.inviteSearchTimeout = setTimeout(() => {
        this.searchUsersFromServer(searchTerm);
      }, 300);
    }
  }

  private filterUsersLocally(searchTerm: string): User[] {
    return this.allUsers
      .filter((user) => {
        const firstName = user.firstName?.toLowerCase() || '';
        const lastName = user.lastName?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return (
          firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          fullName.includes(searchTerm) ||
          email.includes(searchTerm)
        );
      })
      .slice(0, 10);
  }

  private searchUsersFromServer(searchTerm: string): void {
    this.auth.searchUsers(searchTerm, 15).subscribe({
      next: (serverUsers) => {
        const existingEmails = new Set(
          this.filteredUsers.map((u) => u.email?.toLowerCase())
        );

        const newResults = serverUsers.filter((user) => {
          const email = (user.email || '').toLowerCase();
          return !existingEmails.has(email);
        });

        this.filteredUsers = [...this.filteredUsers, ...newResults].slice(0, 12);
        this.showUserSuggestions = this.filteredUsers.length > 0;
        this.isSearchingUsers = false;
      },
      error: (err) => {
        console.error('Server search failed:', err);
        this.isSearchingUsers = false;
      },
    });
  }

  selectUser(user: User) {
    this.inviteInput = user.email || '';
    this.selectedUser = user;
    this.showUserSuggestions = false;
  }

  addEmailToPending() {
    if (!this.canAddInvitee) return;

    let email = '';
    let name = '';
    let user: User | undefined;

    if (this.selectedUser) {
      email = this.selectedUser.email || '';
      name =
        `${this.selectedUser.firstName} ${this.selectedUser.lastName}`.trim();
      user = this.selectedUser;
    } else if (this.data.isValidEmail(this.inviteInput)) {
      email = this.inviteInput;
      name = email;
    }

    if (!email) return;

    const alreadyPending = this.pendingParticipants.some(
      (p) => p.email.toLowerCase() === email.toLowerCase()
    );

    if (!alreadyPending) {
      this.pendingParticipants.push({
        email: email,
        name: name,
        user: user,
      });
    }

    this.inviteInput = '';
    this.selectedUser = null;
    this.showUserSuggestions = false;
  }

  removePendingParticipant(email: string) {
    this.pendingParticipants = this.pendingParticipants.filter(
      (p) => p.email.toLowerCase() !== email.toLowerCase()
    );
  }

  hideUserSuggestions() {
    this.inviteSearchTimeout = setTimeout(() => {
      this.showUserSuggestions = false;
    }, 200);
  }

  async addAllPendingInvitees() {
    if (this.pendingParticipants.length === 0 || this.isAddingParticipant) {
      return;
    }

    this.isAddingParticipant = true;
    const inviteesToAdd = [...this.pendingParticipants];
    this.pendingParticipants = [];

    for (const invitee of inviteesToAdd) {
      await this.addInvitee(invitee);
    }

    this.isAddingParticipant = false;
  }

  async addInviteeNow() {
    if (!this.canAddInvitee || this.isAddingParticipant) return;

    this.isAddingParticipant = true;
    const invitee: { email: string; name: string; user?: User } = {
      email: '',
      name: '',
    };

    if (this.selectedUser) {
      invitee.email = this.selectedUser.email || '';
      invitee.name =
        `${this.selectedUser.firstName} ${this.selectedUser.lastName}`.trim();
      invitee.user = this.selectedUser;
    } else {
      invitee.email = this.inviteInput;
      invitee.name = this.inviteInput;
    }

    this.inviteInput = '';
    this.selectedUser = null;
    this.showUserSuggestions = false;

    await this.addInvitee(invitee);
    this.isAddingParticipant = false;
  }

  private async addInvitee(invitee: {
    email: string;
    name: string;
    user?: User;
  }) {
    try {
      let ok = false;
      if (this.inviteRole === 'designer') {
        ok = await this.addParticipantEmail(invitee.email);
      } else if (this.inviteRole === 'evaluator') {
        ok = await this.addEvaluatorEmail(invitee.email);
      } else {
        ok = await this.addAdminEmail(invitee.email, invitee.user);
      }

      this.pushInviteStatus(invitee.email, invitee.name, ok ? 'success' : 'error');
    } catch (error) {
      console.error('Invite failed:', error);
      this.pushInviteStatus(invitee.email, invitee.name, 'error');
    }
  }

  private pushInviteStatus(
    email: string,
    name: string,
    status: 'success' | 'error'
  ) {
    this.invitedParticipants.push({ email, name, status });
    setTimeout(() => {
      const index = this.invitedParticipants.findIndex(
        (p) => p.email === email && p.status === status
      );
      if (index > -1) {
        this.invitedParticipants.splice(index, 1);
      }
    }, 5000);
  }

  private participantExists(email: string): boolean {
    return this.getParticipantEmails().some(
      (existing) => existing.toLowerCase() === email.toLowerCase()
    );
  }

  private evaluatorExists(email: string): boolean {
    const evaluators = this.currentSolution.evaluators ?? [];
    return evaluators.some((evaluator: any) => {
      const value = evaluator?.name || '';
      return String(value).toLowerCase() === email.toLowerCase();
    });
  }

  private adminExists(email: string, uid?: string): boolean {
    const admins = this.currentSolution.chosenAdmins ?? [];
    return admins.some(
      (admin) =>
        admin.authorEmail?.toLowerCase() === email.toLowerCase() ||
        (!!uid && admin.authorAccountId === uid)
    );
  }

  private getParticipantsArray(): Array<{ name: string }> {
    const participants = this.currentSolution.participants;
    if (!participants) return [];
    if (Array.isArray(participants)) {
      return participants as Array<{ name: string }>;
    }

    if (typeof participants === 'object') {
      return Object.values(participants)
        .map((value) => {
          if (!value) return null;
          if (typeof value === 'string') return { name: value };
          if (typeof value === 'object') {
            const fallback = (value as any).name ?? Object.values(value)[0];
            if (typeof fallback === 'string') return { name: fallback };
          }
          return null;
        })
        .filter((value): value is { name: string } => !!value);
    }

    return [];
  }

  private getParticipantEmails(): string[] {
    return this.getParticipantsArray()
      .map((participant) => participant?.name || '')
      .filter((value) => value.length > 0);
  }

  private async addParticipantEmail(email: string): Promise<boolean> {
    if (!this.data.isValidEmail(email) || this.participantExists(email)) {
      return false;
    }

    const participants = this.getParticipantsArray();
    participants.push({ name: email });

    try {
      await this.solution.addParticipantsToSolution(
        participants,
        this.currentSolution.solutionId!
      );
      this.currentSolution.participants = participants as any;
      this.getMembers();
      await this.sendEmailToParticipant(email);
      return true;
    } catch (error) {
      console.error('Error adding participant:', error);
      return false;
    }
  }

  private async addEvaluatorEmail(email: string): Promise<boolean> {
    if (!this.data.isValidEmail(email) || this.evaluatorExists(email)) {
      return false;
    }

    const evaluators = [...(this.currentSolution.evaluators ?? [])];
    evaluators.push({ name: email });

    try {
      await this.solution.addEvaluatorsToSolution(
        evaluators,
        this.currentSolution.solutionId!
      );
      this.currentSolution.evaluators = evaluators;
      this.getEvaluators();
      await this.sendEmailToParticipant(email);
      return true;
    } catch (error) {
      console.error('Error adding evaluator:', error);
      return false;
    }
  }

  private async addAdminEmail(
    email: string,
    user?: User
  ): Promise<boolean> {
    if (!this.data.isValidEmail(email)) return false;

    let adminUser = user;
    if (!adminUser) {
      const users = await firstValueFrom(this.auth.getUserFromEmail(email));
      adminUser = users?.[0];
    }

    if (!adminUser || !adminUser.uid || !adminUser.email) {
      return false;
    }

    if (this.adminExists(adminUser.email, adminUser.uid)) {
      return false;
    }

    const newAdmin: Admin = {
      authorAccountId: adminUser.uid,
      authorName: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim(),
      authorEmail: adminUser.email,
      authorProfilePicture: adminUser.profilePicture,
    };

    const updated: Admin[] = [
      ...(this.currentSolution.chosenAdmins ?? []),
      newAdmin,
    ];

    try {
      await this.solution.updateSolutionField(
        this.currentSolution.solutionId!,
        'chosenAdmins',
        updated
      );
      this.currentSolution.chosenAdmins = updated;
      this.admins = updated;
      await this.sendEmailToParticipant(adminUser.email);
      return true;
    } catch (error) {
      console.error('Error adding admin:', error);
      return false;
    }
  }

  getInitials(
    firstName?: string,
    lastName?: string,
    email?: string,
    fullName?: string
  ): string {
    const fn = (firstName || '').trim();
    const ln = (lastName || '').trim();
    let primary = fn ? fn[0] : '';
    let secondary = ln ? ln[0] : '';

    if (!primary && !secondary && fullName) {
      const parts = fullName.trim().split(/\s+/);
      primary = parts[0]?.[0] || '';
      secondary = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    }

    if (primary || secondary) {
      if (!secondary) {
        if (fn.length > 1) secondary = fn[1];
        else if (ln.length > 1) secondary = ln[1];
      }
      return (primary + secondary).toUpperCase();
    }

    const local = (email || '').trim().split('@')[0] || '';
    if (local.length >= 2) return (local[0] + local[1]).toUpperCase();
    if (local.length === 1) return local[0].toUpperCase();
    return '?';
  }
  async addParticipantToSolution() {
    if (this.data.isValidEmail(this.newTeamMember)) {
      const participants = this.getParticipantsArray();
      participants.push({ name: this.newTeamMember });

      this.solution
        .addParticipantsToSolution(
          participants,
          this.currentSolution.solutionId!
        )

        .then(() => {
          alert(`Successfully added ${this.newTeamMember} to the solution.`);
          this.getMembers();
          this.currentSolution.participants = participants as any;

          this.toggle('showAddTeamMember');
        })
        .catch((error) => {
          alert('Error occured while adding a team member. Try Again!');
        });
      await this.sendEmailToParticipant(this.newTeamMember);
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

  async sendEmailToParticipant(email: string) {
    const sendParticipantInvite = this.fns.httpsCallable('sendParticipantInvite');

    try {
      // Fetch the user data to check if they're registered
      const users = await firstValueFrom(
        this.auth.getUserFromEmail(email)
      );
      const isRegisteredUser = users && users.length > 0;
      const inviterName = `${this.auth.currentUser.firstName || ''} ${this.auth.currentUser.lastName || ''}`.trim() || 'A team member';

      const emailData = {
        email,
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
      console.log(`Email sent to ${email}:`, result);
    } catch (error) {
      console.error(`Error sending invite to ${email}:`, error);
    }
  }

  removeParticipantFromSolution(email: string) {
    const participants = this.getParticipantsArray();
    if (participants.length === 0) {
      alert('No participants found!');
      return;
    }

    // Filter out the participant to be removed
    const updatedParticipants = participants.filter(
      (participant) => participant.name !== email
    );

    // Update the solution's participants
    this.solution
      .addParticipantsToSolution(
        updatedParticipants,
        this.currentSolution.solutionId!
      )
      .then(() => {
        alert(`Successfully removed ${email} from the solution.`);
        this.currentSolution.participants = updatedParticipants as any;
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
