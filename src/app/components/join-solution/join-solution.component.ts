import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, combineLatest, map, of, switchMap } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { SolutionService } from 'src/app/services/solution.service';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';

type ReqStatus = 'none' | 'pending' | 'cancelled' | 'approved' | 'rejected';

@Component({
  selector: 'app-join-solution',
  templateUrl: './join-solution.component.html',
  styleUrl: './join-solution.component.css',
})
export class JoinSolutionComponent implements OnInit, OnDestroy {
  solution: Solution = {};
  loading = true;

  // join state
  joining = false; // submitting request/cancel
  alreadyMember = false; // is in participants
  myRequestStatus: ReqStatus = 'none';

  acceptingId: string | null = null;

  // owner view of requests
  pendingRequests$ = of<any[]>([]);
  isOwner = false;

  // modal
  showRequestModal = false;
  requestMessage = '';
  maxLen = 280;

  private sub?: Subscription;
  private id!: string;

  constructor(
    private route: ActivatedRoute,
    private solutionService: SolutionService,
    public auth: AuthService,
    public data: DataService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;

    const sol$ = this.solutionService.getSolution(this.id);

    const me = this.auth.currentUser;
    const myReq$ = me?.uid
      ? this.solutionService.getJoinRequestForUser(this.id, me.uid)
      : of(undefined);

    // 1) main state
    this.sub = combineLatest([sol$, myReq$]).subscribe(([s, r]: any[]) => {
      this.solution = s;
      this.loading = false;

      // robust owner test
      this.isOwner = this.isOwnerOf(s);

      // membership
      this.alreadyMember = this.isUserInParticipants(
        s?.participants,
        this.auth.currentUser.email
      );

      // my request status
      this.myRequestStatus = (r?.status as ReqStatus) || 'none';
    });

    // 2) owner-gated stream of pending requests
    this.pendingRequests$ = sol$.pipe(
      switchMap((s: any) =>
        this.isOwnerOf(s)
          ? this.solutionService.listPendingJoinRequests(this.id)
          : of([])
      )
    );
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ----- Actions -----
  openRequestModal() {
    this.requestMessage = '';
    this.showRequestModal = true;
  }
  closeRequestModal() {
    this.showRequestModal = false;
  }

  async sendJoinRequest() {
    if (this.joining) return;
    this.joining = true;
    try {
      await this.solutionService.requestToJoin(
        this.id,
        {
          uid: this.auth.currentUser.uid,
          email: this.auth.currentUser.email,
          firstName: this.auth.currentUser.firstName,
          lastName: this.auth.currentUser.lastName,
        },
        this.requestMessage || ''
      );
      this.myRequestStatus = 'pending';
      this.showRequestModal = false;
    } catch (e) {
      console.error(e);
      alert('Could not send request. Try again.');
    } finally {
      this.joining = false;
    }
  }

  async cancelMyRequest() {
    if (this.joining) return;
    this.joining = true;
    try {
      await this.solutionService.cancelJoinRequest(
        this.id,
        this.auth.currentUser.uid
      );
      this.myRequestStatus = 'cancelled';
    } catch (e) {
      console.error(e);
      alert('Could not cancel request.');
    } finally {
      this.joining = false;
    }
  }

  // ----- Helpers -----
  get designersCount(): number {
    const p = this.solution?.participants;
    if (!p) return 0;
    return Array.isArray(p) ? p.length : Object.keys(p).length;
  }
  get sdgs() {
    return this.solution?.sdgs || [];
  }
  get designersList() {
    return (this.solution as any).teamMembers || [];
  }
  trackByIndex(i: number) {
    return i;
  }

  private isOwnerOf(s: any): boolean {
    const uid = this.auth?.currentUser?.uid;
    const email = (this.auth?.currentUser?.email || '').toLowerCase();

    // common owner fields your docs might use
    const ownerUidMatches =
      s?.authorAccountId === uid ||
      s?.authorUid === uid ||
      s?.ownerId === uid ||
      s?.createdById === uid;

    const ownerEmailMatches =
      (s?.authorEmail || '').toLowerCase() === email ||
      (s?.ownerEmail || '').toLowerCase() === email;

    return !!(ownerUidMatches || ownerEmailMatches);
  }

  private isUserInParticipants(participants: any, email: string): boolean {
    if (!participants || !email) return false;
    if (Array.isArray(participants)) {
      return participants.some(
        (p: any) =>
          (p?.name || '').trim().toLowerCase() === email.trim().toLowerCase()
      );
    }
    return !!participants[email] || Object.values(participants).includes(email);
  }

  async accept(r: any) {
    if (!r?.uid || !r?.email) return;
    this.acceptingId = r.uid;
    try {
      await this.solutionService.approveJoinRequest(this.id, {
        uid: r.uid,
        email: r.email,
      });
      // Optional toast
      // alert(`${r.email} added to participants.`);
    } catch (e) {
      console.error(e);
      alert('Could not approve request. Please try again.');
    } finally {
      this.acceptingId = null;
    }
  }
}
