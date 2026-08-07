import { Injectable, OnInit } from '@angular/core';
import {
  AngularFirestoreDocument,
  AngularFirestore,
} from '@angular/fire/compat/firestore';
import {
  Broadcast,
  Comment,
  Evaluation,
  EvaluationHistoryEntry,
  JoinRequest,
  Roles,
  Solution,
} from '../models/solution';
import { ActivityService } from './activity.service';
import { AuthService } from './auth.service';
import { TimeService } from './time.service';
import {
  catchError,
  combineLatest,
  count,
  firstValueFrom,
  from,
  last,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  take,
} from 'rxjs';
import { ChallengePage, Tournament, User } from '../models/user';
import { SafeResourceUrlWithIconOptions } from '@angular/material/icon';
import { Email } from '../components/create-playground/create-playground.component';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import {
  StrategyReviewSyncMetadata,
  strategyReviewSourceAnswers,
  strategyReviewStepsHash,
} from '../utils/strategy-review-sync';
import {
  buildSolutionOwnershipTransfer,
  isPlatformAdminUser,
  isSolutionOwner,
  normalizeSolutionEmail,
  ownershipTargetFromUser,
} from '../utils/solution-ownership';
type BroadcastStatus = 'active' | 'paused' | 'pending' | 'stopped';

export type CommunitySolutionFilter =
  | 'all'
  | 'in-development'
  | 'submitted';

export interface CommunitySolutionPage {
  solutions: Solution[];
  cursor:
    | firebase.firestore.QueryDocumentSnapshot
    | { fallbackOffset: number }
    | { publicUpdatedAtMs: number }
    | null;
  hasMore: boolean;
}
@Injectable({
  providedIn: 'root',
})
export class SolutionService {
  title: string = '';
  solutionId: string = '';
  solutionRef?: Observable<Solution>;
  userRef?: AngularFirestoreDocument<any>;
  allSolutions: Solution[] = [];
  newSolution: Solution = {};
  numberOfEvaluators: number = 3;
  evaluatorsEmails: Email[] = [];
  private readonly solutionStreams = new Map<
    string,
    Observable<Solution | undefined>
  >();
  constructor(
    private auth: AuthService,
    private afs: AngularFirestore,
    private time: TimeService,
    private fns: AngularFireFunctions,
    private activity: ActivityService
  ) {
    this.auth.user$.subscribe((user) => {
      if (user && user.email) {
        this.newSolution = {
          title: '',
          solutionArea: '',
          description: '',
          participantsHolder: [{ name: user.email }],
          evaluatorsHolder: this.evaluatorsEmails,
        };
      }
    });
  }

  resetNewSolution() {
    this.newSolution = {
      title: '',
      solutionArea: '',
      description: '',
      image: '',
      participantsHolder: [{ name: this.auth.currentUser.email }],
      evaluatorsHolder: this.evaluatorsEmails,
    };
  }

  private serverTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  private withSolutionUpdatedAt<T extends Record<string, any>>(data: T) {
    return {
      ...data,
      updatedAt: this.serverTimestamp(),
    };
  }

  private withSolutionSubstantiveEditAt<T extends Record<string, any>>(
    data: T,
    sourceTimestampField?:
      | 'stepsUpdatedAt'
      | 'draftUpdatedAt'
      | 'publishedContentUpdatedAt'
  ) {
    const now = this.serverTimestamp();
    return {
      ...data,
      ...(sourceTimestampField ? { [sourceTimestampField]: now } : {}),
      updatedAt: now,
      lastSubstantiveEditAt: now,
      feedUpdatedAt: now,
    };
  }

  private isSubstantiveSolutionField(key: string): boolean {
    return (
      key === 'title' ||
      key === 'description' ||
      key === 'content' ||
      key === 'strategyReview' ||
      key.startsWith('status.')
    );
  }

  private sourceTimestampFieldForKeys(
    keys: string[]
  ):
    | 'stepsUpdatedAt'
    | 'draftUpdatedAt'
    | 'publishedContentUpdatedAt'
    | undefined {
    if (keys.some((key) => key === 'status' || key.startsWith('status.'))) {
      return 'stepsUpdatedAt';
    }
    if (keys.includes('strategyReview')) {
      return 'draftUpdatedAt';
    }
    if (keys.includes('content')) {
      return 'publishedContentUpdatedAt';
    }
    return undefined;
  }

  private withSolutionCreatedAndUpdatedAt<T extends Record<string, any>>(
    data: T
  ) {
    const now = this.serverTimestamp();
    return {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }

  async joinSolution(solution: Solution, email: string) {
    /* --- 1. normalise participants --- */
    const raw = solution.participants ?? [];
    const participants: { name: string }[] = Array.isArray(raw)
      ? [...raw]
      : Object.values(raw as Record<string, string>).map((e) => ({ name: e }));

    /* --- 2. add user if missing --- */
    if (!participants.some((p) => p.name.trim().toLowerCase() === email)) {
      participants.push({ name: email });

      await this.afs
        .doc(`solutions/${solution.solutionId}`)
        .update({ participants });
    }

    return participants; // in case caller needs it
  }

  async createdNewSolution(
    title: string,
    solutionArea: string,
    description: string,
    image: string | undefined,
    participants: any,
    evaluators: any,
    // endDate: string,
    sdgs: string[],
    solutionId: string = '',
    challengePageId: string = ''
  ) {
    console.log('The list of designers', participants);

    // Generate a unique solution ID
    this.solutionId =
      solutionId !== '' ? solutionId : this.afs.createId().toString();

    let data: {
      solutionId: string;
      title: string;
      solutionArea: string;
      authorAccountId: string;
      authorName: string;
      authorEmail: string;
      ownerAccountId: string;
      ownerName: string;
      ownerEmail: string;
      ownerProfileCredential: string;
      description: string;
      participants: any;
      evaluators: any;
      authorProfileCredential: string;
      creationDate: string;
      views: string;
      sdgs: string[];
      likes: any[];
      numLike: string;
      image?: string; // Optional image field
      createdAt?: firebase.firestore.FieldValue;
      updatedAt?: firebase.firestore.FieldValue;
      isPrivate?: boolean;
      communityVisibility?: 'community';
      feedUpdatedAt?: firebase.firestore.FieldValue;
      challengePageId?: string;
    } = {
      solutionId: this.solutionId,
      title: title,
      solutionArea: solutionArea,
      authorAccountId: this.auth.currentUser.uid,
      authorName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      authorEmail: this.auth.currentUser.email,
      ownerAccountId: this.auth.currentUser.uid,
      ownerName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      ownerEmail: normalizeSolutionEmail(this.auth.currentUser.email),
      ownerProfileCredential: this.auth.currentUser.profileCredential,
      description: description,
      participants: participants,
      evaluators: evaluators,
      authorProfileCredential: this.auth.currentUser.profileCredential,
      creationDate: this.time.todaysDate(),
      views: '1',
      sdgs: sdgs,
      likes: [],
      numLike: '0',
      isPrivate: false,
      communityVisibility: 'community' as const,
      feedUpdatedAt: this.serverTimestamp(),
    };

    // Only add the image property if it is defined and not empty
    if (image) {
      data.image = image;
    }
    if (challengePageId) {
      data.challengePageId = challengePageId;
    }

    data = this.withSolutionCreatedAndUpdatedAt(data);

    // Reference to the Firestore document
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${data.solutionId}`
    );

    // Save the initial data to Firestore
    await solutionRef.set(data, { merge: true });

    // Asynchronously create the meeting link without awaiting
    this.createMeetLink(this.solutionId, title)
      .toPromise()
      .then((dataMeeting) => {
        const meetLink = dataMeeting.hangoutLink;
        console.log('Meeting link', meetLink);

        // Update the Firestore document with the meetLink
        return solutionRef.update({ meetLink });
      })
      .catch((error) => {
        console.error('Error creating meeting link:', error);
        // Optionally handle the error, e.g., notify the user or retry
      });

    // Optionally return the solution data or a confirmation
    return {
      solutionId: this.solutionId,
      status: 'Solution created. Meeting link is being generated.',
    };
  }

  addToTournament(contact: Tournament) {
    const data = {
      solutionId: contact.solutionId,
      firstName: contact.firstName,
      last: contact.lastName,
      city: contact.city,
      country: contact.country,
    };
    const solutionRef: AngularFirestoreDocument<Tournament> = this.afs.doc(
      `tournament/${contact.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  createNewSolutionForParticipant(
    title: string,
    description: string,
    participants: any,
    endDate: string,
    initiatorId: string,
    solutionId: string,
    participantId: string,
    sdg: string
  ) {
    let formatedDate = this.time.formatDateString(endDate);

    const data = this.withSolutionCreatedAndUpdatedAt({
      solutionId: solutionId,
      title: title,
      initiatorId: initiatorId,
      authorAccountId: participantId,
      description: description,
      participants: participants,
      endDate: endDate,
      endDateFormatted: formatedDate,
      creationDate: this.time.todaysDate(),
      sdg: sdg,
      views: '1',
      numLike: '0',
      numShare: '0',
      likes: [],
      isPrivate: false,
      communityVisibility: 'community' as const,
      feedUpdatedAt: this.serverTimestamp(),
    });
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  getSolution(solutionId: string) {
    const id = String(solutionId || '').trim();
    if (!id) {
      return of(undefined);
    }

    let solutionStream = this.solutionStreams.get(id);
    if (!solutionStream) {
      solutionStream = this.afs
        .doc<Solution>(`solutions/${id}`)
        .valueChanges()
        .pipe(shareReplay({ bufferSize: 1, refCount: true }));
      this.solutionStreams.set(id, solutionStream);
    }

    return solutionStream;
  }
  updateSolutionMeetLink(solutionId: string, meetLink: string): Promise<void> {
    return this.afs.doc(`solutions/${solutionId}`).update({ meetLink });
  }

  getSolutionForNonAuthenticatedUser(solutionId: string) {
    return this.afs
      .doc<Solution>(`solutions/${solutionId}`)
      .valueChanges()
      .pipe(map((solution) => (solution ? [solution] : [])));
  }

  addCommentToSolution(solution: Solution, comments: any) {
    const data = {
      comments: comments,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    void this.activity.recordEvent('comment', solution.solutionId);
    return solutionRef.set(data, { merge: true });
  }
  // updateSolutionStatus(solutionId: string, updateData: any) {
  //   const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
  //     `solutions/${solutionId}`
  //   );

  //   return solutionRef.set(updateData, { merge: true });
  // }
  getThisUserSolution(solutionId: string) {
    return this.afs.doc<Solution>(`solutions/${solutionId}`).valueChanges();
  }

  getAuthenticatedUserAllSolutions(email = this.auth.currentUser?.email) {
    if (!email) return of([] as Solution[]);
    const normalizedEmail = normalizeSolutionEmail(email);
    const participantSolutions$ = this.afs
      .collection<Solution>(`solutions`, (ref) =>
        ref.where('participants', 'array-contains', {
          name: email,
        })
      )
      .valueChanges();
    const ownerSolutions$ = this.afs
      .collection<Solution>('solutions', (ref) =>
        ref.where('ownerEmail', '==', normalizedEmail)
      )
      .valueChanges();
    const legacyAuthorSolutions$ = this.afs
      .collection<Solution>('solutions', (ref) =>
        ref.where('authorEmail', '==', email)
      )
      .valueChanges()
      .pipe(
        map((solutions) =>
          solutions.filter(
            (solution) => !solution.ownerAccountId && !solution.ownerEmail
          )
        )
      );
    const adminSolutions$ = this.afs
      .collection<Solution>('solutions', (ref) =>
        ref.where('solutionAdminEmails', 'array-contains', normalizedEmail)
      )
      .valueChanges();

    return combineLatest([
      participantSolutions$,
      ownerSolutions$,
      legacyAuthorSolutions$,
      adminSolutions$,
    ]).pipe(
      map((groups) => {
        const unique = new Map<string, Solution>();
        groups.flat().forEach((solution) => {
          const key =
            solution.solutionId ||
            `${solution.title || ''}:${solution.creationDate || ''}`;
          unique.set(key, solution);
        });
        return Array.from(unique.values());
      })
    );
  }

  async getSolutionsForUserPicker(
    uid = this.auth.currentUser?.uid,
    email = this.auth.currentUser?.email
  ): Promise<Solution[]> {
    if (!uid || !email) return [];

    const normalizedEmail = email.trim().toLowerCase();
    const matchesUser = (value: any): boolean => {
      if (!value) return false;
      if (typeof value === 'string') {
        return value.trim().toLowerCase() === normalizedEmail || value === uid;
      }
      if (typeof value === 'object') {
        const valueUid = String(
          value.uid || value.authorAccountId || value.accountId || ''
        );
        const valueEmail = String(
          value.name || value.email || value.authorEmail || ''
        )
          .trim()
          .toLowerCase();
        return valueUid === uid || valueEmail === normalizedEmail;
      }
      return false;
    };

    const listIncludesUser = (value: any): boolean => {
      if (Array.isArray(value)) return value.some(matchesUser);
      if (value && typeof value === 'object') {
        return Object.entries(value).some(
          ([key, entry]) => matchesUser(key) || matchesUser(entry)
        );
      }
      return false;
    };

    // Older solutions use several participant shapes and may omit the
    // solutionId field entirely. Read the documents directly so the picker
    // can retain each Firestore document ID and evaluate every legacy shape.
    const snapshot = await this.afs.collection<Solution>('solutions').ref.get();
    return snapshot.docs
      .map((document) => {
        const solution = document.data() as Solution;
        return {
          ...solution,
          solutionId: solution.solutionId || document.id,
        };
      })
      .filter((solution) => {
        const legacySolution = solution as any;
        const hasExplicitOwner = !!(
          solution.ownerAccountId || solution.ownerEmail
        );
        const ownerIds = [
          solution.ownerAccountId,
          ...(hasExplicitOwner
            ? []
            : [
                solution.authorAccountId,
                solution.initiatorId,
                legacySolution.authorId,
                legacySolution.ownerId,
                legacySolution.userId,
                legacySolution.createdBy,
              ]),
        ];
        const ownerEmails = [
          solution.ownerEmail,
          ...(hasExplicitOwner
            ? []
            : [
                solution.authorEmail,
                legacySolution.createdByEmail,
                legacySolution.ownerEmail,
              ]),
        ].map((value) => String(value || '').trim().toLowerCase());

        return (
          ownerIds.includes(uid) ||
          ownerEmails.includes(normalizedEmail) ||
          listIncludesUser(solution.participants) ||
          listIncludesUser(solution.participantsHolder) ||
          listIncludesUser(solution.chosenAdmins)
        );
      });
  }

  async transferSolutionOwnership(
    solutionId: string,
    requestedOwner: User,
    keepPreviousOwnerAsAdmin: boolean
  ): Promise<void> {
    const actor = this.auth.currentUser;
    const requestedTarget = ownershipTargetFromUser(requestedOwner);
    if (!solutionId || !actor?.uid || !actor?.email || !requestedTarget) {
      throw new Error('A signed-in user and registered new owner are required.');
    }

    const solutionRef = this.afs.doc<Solution>(
      `solutions/${solutionId}`
    ).ref;
    const targetUserRef = this.afs.doc<User>(
      `users/${requestedTarget.authorAccountId}`
    ).ref;

    await this.afs.firestore.runTransaction(async (transaction) => {
      const [solutionSnapshot, targetUserSnapshot] = await Promise.all([
        transaction.get(solutionRef),
        transaction.get(targetUserRef),
      ]);
      if (!solutionSnapshot.exists) {
        throw new Error('The solution no longer exists.');
      }
      if (!targetUserSnapshot.exists) {
        throw new Error('The new owner must be a registered user.');
      }

      const currentSolution = solutionSnapshot.data() as Solution;
      if (
        !isSolutionOwner(currentSolution, actor) &&
        !isPlatformAdminUser(actor)
      ) {
        throw new Error(
          'Only the current owner or a platform administrator can transfer ownership.'
        );
      }

      const storedUser = {
        ...(targetUserSnapshot.data() as User),
        uid: targetUserSnapshot.id,
      };
      const verifiedTarget = ownershipTargetFromUser(storedUser);
      if (!verifiedTarget) {
        throw new Error('The selected user does not have a valid account.');
      }

      const update = buildSolutionOwnershipTransfer(
        currentSolution,
        verifiedTarget,
        {
          uid: actor.uid,
          email: actor.email,
        },
        keepPreviousOwnerAsAdmin
      );
      const persistedUpdate: Record<string, any> = {
        ...update,
        updatedAt: this.serverTimestamp(),
      };
      if (!verifiedTarget.authorProfilePicture) {
        persistedUpdate['ownerProfilePicture'] =
          firebase.firestore.FieldValue.delete();
      }

      transaction.set(
        solutionRef,
        persistedUpdate,
        { merge: true }
      );
    });
  }
  getAuthenticatedUserPendingEvaluations(email = this.auth.currentUser?.email) {
    if (!email) return of([] as Solution[]);

    // Query for solutions where evaluators contain the email and evaluated is 'false'
    const queryEvaluatedFalse = this.afs
      .collection<Solution>('solutions', (ref) =>
        ref.where('evaluators', 'array-contains', {
          name: email,
          evaluated: 'false',
        })
      )
      .valueChanges();

    // Query for solutions where evaluators contain the email regardless of 'evaluated'
    const queryIgnoreEvaluated = this.afs
      .collection<Solution>('solutions', (ref) =>
        ref.where('evaluators', 'array-contains', { name: email })
      )
      .valueChanges();

    // Combine results from both queries
    return combineLatest([queryEvaluatedFalse, queryIgnoreEvaluated]).pipe(
      map(([resultsFalse, resultsIgnoreEvaluated]) => {
        // Filter to remove duplicates that might appear in both queries
        const combinedResults = [...resultsFalse, ...resultsIgnoreEvaluated];
        return combinedResults.filter(
          (solution, index, self) =>
            index ===
            self.findIndex((t) => t.solutionId === solution.solutionId)
        );
      })
    );
  }
  getAllSolutionsOfThisUser(email: string) {
    return this.afs
      .collection<Solution>(`solutions`, (ref) =>
        ref.where('participants', 'array-contains', {
          name: email,
        })
      )
      .valueChanges();
  }

  getHomePageSolutions() {
    return this.afs
      .collection<Solution>('solutions', (ref) =>
        ref.where('statusForPublication', '==', 'approved')
      )
      .valueChanges({ idField: 'solutionId' })
      .pipe(
        map((solutions) => {
          const approvedSolutions = solutions.filter(
            (solution) =>
              solution.finished === 'true' && solution.solutionId
          );
          return approvedSolutions.sort((a, b) => {
            const likes = (solution: Solution) =>
              Number.parseInt(solution.numLike || '0', 10) || 0;
            return likes(b) - likes(a);
          });
        }),
        catchError((error) => {
          console.error('Unable to load Discover solutions.', error);
          return of([] as Solution[]);
        })
      );
  }

  getAllSolutionsFromAllAccounts() {
    return this.afs.collection<Solution>(`solutions`).valueChanges();
  }

  async getCommunitySolutionsPage(
    filter: CommunitySolutionFilter = 'all',
    pageSize = 20,
    cursor:
      | firebase.firestore.QueryDocumentSnapshot
      | { fallbackOffset: number }
      | { publicUpdatedAtMs: number }
      | null = null
  ): Promise<CommunitySolutionPage> {
    try {
      let query: firebase.firestore.Query = this.afs.collection<Solution>(
        'publicCommunitySolutions'
      ).ref;
      if (filter !== 'all') {
        query = query.where('feedStatus', '==', filter);
      }
      query = query.orderBy('feedUpdatedAtMs', 'desc');
      if (cursor && typeof (cursor as any).data === 'function') {
        query = query.startAfter(
          cursor as firebase.firestore.QueryDocumentSnapshot
        );
      }

      const snapshot = await query.limit(pageSize + 1).get();
      const visibleDocuments = snapshot.docs.slice(0, pageSize);
      return {
        solutions: visibleDocuments.map((document) => {
          const solution = document.data() as Solution;
          return {
            ...solution,
            solutionId: solution.solutionId || document.id,
            feedUpdatedAt: Number((solution as any).feedUpdatedAtMs || 0),
          };
        }),
        cursor:
          visibleDocuments.length > 0
            ? visibleDocuments[visibleDocuments.length - 1]
            : null,
        hasMore: snapshot.docs.length > pageSize,
      };
    } catch (error) {
      // Keep a server-sanitized fallback for transient Firestore/index errors.
      // It is not the normal hot path and therefore does not slow successful
      // home loads.
      console.warn(
        'Public community projection unavailable; using server fallback.',
        error
      );
    }

    const callable = this.fns.httpsCallable('getPublicCommunitySolutions');
    const publicCursor =
      cursor && 'publicUpdatedAtMs' in cursor
        ? cursor
        : null;
    const response: any = await firstValueFrom(
      callable({
        filter,
        pageSize,
        cursorUpdatedAtMs: publicCursor?.publicUpdatedAtMs || null,
      })
    );
    const solutions = Array.isArray(response?.solutions)
      ? response.solutions.map((solution: any) => ({
          ...solution,
          feedUpdatedAt: Number(solution?.feedUpdatedAtMs || 0),
        }))
      : [];
    const cursorUpdatedAtMs = Number(response?.cursorUpdatedAtMs || 0);

    return {
      solutions,
      cursor: cursorUpdatedAtMs
        ? { publicUpdatedAtMs: cursorUpdatedAtMs }
        : null,
      hasMore: response?.hasMore === true,
    };
  }

  async getPublicCommunitySolutionPreview(
    solutionId: string
  ): Promise<Solution | null> {
    const callable = this.fns.httpsCallable('getPublicCommunitySolution');
    const response: any = await firstValueFrom(callable({ solutionId }));
    return response?.solution ? (response.solution as Solution) : null;
  }

  private async getCommunitySolutionsFallback(
    filter: CommunitySolutionFilter,
    pageSize: number,
    offset: number
  ): Promise<CommunitySolutionPage> {
    const snapshot = await this.afs
      .collection<Solution>('solutions').ref.where('isPrivate', '==', false)
      .get();
    const eligible = snapshot.docs
      .map((document) => {
        const data = document.data();
        return {
          ...data,
          solutionId: data.solutionId || document.id,
        };
      })
      .filter(
        (solution) =>
          solution.feedEligible === true &&
          (filter === 'all' || solution.feedStatus === filter)
      )
      .sort(
        (a, b) =>
          this.solutionFeedMilliseconds(b) -
          this.solutionFeedMilliseconds(a)
      );
    const solutions = eligible.slice(offset, offset + pageSize);
    const nextOffset = offset + solutions.length;

    return {
      solutions,
      cursor:
        nextOffset < eligible.length ? { fallbackOffset: nextOffset } : null,
      hasMore: nextOffset < eligible.length,
    };
  }

  private solutionFeedMilliseconds(solution: Solution): number {
    const value =
      solution.feedUpdatedAt ||
      solution.lastSubstantiveEditAt ||
      solution.updatedAt ||
      solution.submissionDate ||
      solution.creationDate;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    const parsed = value ? Date.parse(String(value)) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  watchCommunityComments(solutionId: string): Observable<Comment[]> {
    if (!solutionId) return of([]);

    return this.afs
      .collection<Comment>(`solutions/${solutionId}/communityComments`, (ref) =>
        ref.orderBy('createdAtMs', 'asc').limit(500)
      )
      .valueChanges({ idField: 'messageId' });
  }

  async addCommunityComment(
    solutionId: string,
    content: string
  ): Promise<{ messageId: string }> {
    const callable = this.fns.httpsCallable('addCommunitySolutionComment');
    return firstValueFrom(
      callable({
        solutionId,
        content: String(content || '').trim(),
      })
    );
  }

  async setCommunityVisibility(
    solutionId: string,
    visibility: 'community' | 'private'
  ): Promise<{ visibility: 'community' | 'private'; feedEligible: boolean }> {
    const callable = this.fns.httpsCallable(
      'setSolutionCommunityVisibility'
    );
    return firstValueFrom(callable({ solutionId, visibility }));
  }

  /**
   * Search solutions by title prefix (efficient server-side query)
   * Uses Firestore's startAt/endAt for prefix matching
   * Only returns finished solutions, limited to 20 results
   */
  searchSolutionsByTitle(searchTerm: string, limit: number = 20): Observable<Solution[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return of([]);
    }
    
    const term = searchTerm.trim();
    // For prefix search, we use startAt and endAt with a high Unicode character
    const endTerm = term + '\uf8ff';
    
    return this.afs
      .collection<Solution>('solutions', (ref) =>
        ref
          .where('finished', '==', 'true')
          .orderBy('title')
          .startAt(term)
          .endAt(endTerm)
          .limit(limit)
      )
      .valueChanges();
  }

  /**
   * Search finished solutions with a limit (for navbar search)
   * Fetches recent finished solutions and filters client-side
   * More flexible than prefix search but still efficient with limit
   */
  searchFinishedSolutions(searchTerm: string, limit: number = 50): Observable<Solution[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return of([]);
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    
    // Fetch limited recent finished solutions and filter client-side
    return this.afs
      .collection<Solution>('solutions', (ref) =>
        ref
          .where('finished', '==', 'true')
          .orderBy('submissionDate', 'desc')
          .limit(limit * 2) // Fetch more to account for filtering
      )
      .valueChanges()
      .pipe(
        map((solutions) =>
          solutions
            .filter(
              (solution) =>
                solution.title?.toLowerCase().includes(lowerSearchTerm) ||
                solution.authorName?.toLowerCase().includes(lowerSearchTerm)
            )
            .slice(0, limit)
        )
      );
  }

  /**
   * Search only solutions that have been approved for publication.
   *
   * Firestore does not provide contains/full-text search, so this keeps the
   * query bounded with server-side prefix searches and a small recent-published
   * fallback for case-insensitive matching.
   */
  searchPublishedSolutions(
    searchTerm: string,
    limit: number = 10
  ): Observable<Solution[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return of([]);
    }

    const term = searchTerm.trim();
    const normalizedTerm = term.toLowerCase();
    const variants = this.getSearchTermVariants(term);
    const perQueryLimit = Math.max(limit, 6);

    const titleQueries = variants.map((variant) =>
      this.searchPublishedSolutionsByPrefix('title', variant, perQueryLimit)
    );
    const authorQueries = variants.map((variant) =>
      this.searchPublishedSolutionsByPrefix('authorName', variant, perQueryLimit)
    );
    const recentPublished$ = this.afs
      .collection<Solution>('solutions', (ref) =>
        ref
          .where('statusForPublication', '==', 'approved')
          .orderBy('submissionDate', 'desc')
          .limit(30)
      )
      .valueChanges();

    return combineLatest([...titleQueries, ...authorQueries, recentPublished$]).pipe(
      map((groups) => {
        const unique = new Map<string, Solution>();

        for (const solution of groups.flat()) {
          if (solution?.statusForPublication !== 'approved') continue;

          const haystack = [
            solution.title || '',
            solution.authorName || '',
            solution.description || '',
          ]
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(normalizedTerm)) continue;

          const key =
            solution.solutionId ||
            `${solution.title || ''}|${solution.authorName || ''}|${solution.submissionDate || ''}`;
          if (!unique.has(key)) {
            unique.set(key, solution);
          }
        }

        return Array.from(unique.values()).slice(0, limit);
      })
    );
  }

  private searchPublishedSolutionsByPrefix(
    field: 'title' | 'authorName',
    term: string,
    limitCount: number
  ): Observable<Solution[]> {
    const endTerm = term + '\uf8ff';

    return this.afs
      .collection<Solution>('solutions', (ref) =>
        ref
          .where('statusForPublication', '==', 'approved')
          .orderBy(field)
          .startAt(term)
          .endAt(endTerm)
          .limit(limitCount)
      )
      .valueChanges();
  }

  private getSearchTermVariants(term: string): string[] {
    const trimmed = term.trim();
    const lower = trimmed.toLowerCase();
    const titleCase = lower.replace(/\b\w/g, (char) => char.toUpperCase());
    const firstUpper = lower.charAt(0).toUpperCase() + lower.slice(1);

    return Array.from(new Set([trimmed, lower, titleCase, firstUpper])).filter(
      Boolean
    );
  }

  /**
   * Get limited recent finished solutions (for initial search cache)
   * Much more efficient than loading all solutions
   */
  getRecentFinishedSolutions(limit: number = 100): Observable<Solution[]> {
    return this.afs
      .collection<Solution>('solutions', (ref) =>
        ref
          .where('finished', '==', 'true')
          .orderBy('submissionDate', 'desc')
          .limit(limit)
      )
      .valueChanges();
  }

  addEvaluation(solution: Solution) {
    const data = {
      evaluationDetails: solution.evaluationDetails,
      evaluationSummary: solution.evaluationSummary,
      evaluators: solution.evaluators,
      numberofTimesEvaluated: solution.numberofTimesEvaluated,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    void this.activity.recordEvent('evaluation', solution.solutionId);
    return solutionRef.set(data, { merge: true });
  }
  updateSolutionField(id: string, key: string, value: any) {
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${id}`
    );

    // Handle nested paths like 'status.S1-A' by building nested object
    const parts = key.split('.');
    let data: any;

    if (parts.length === 2) {
      // Nested field like 'status.S1-A' -> { status: { 'S1-A': value } }
      data = { [parts[0]]: { [parts[1]]: value } };
    } else {
      // Simple field
      data = { [key]: value };
    }

    const hasSubstantiveEdit = this.isSubstantiveSolutionField(key);
    if (hasSubstantiveEdit) {
      void this.activity.recordEvent('edit', id);
    }
    if (key === 'finished' && value === 'true') {
      void this.activity.recordEvent('publish', id);
    }
    return solutionRef.set(
      hasSubstantiveEdit
        ? this.withSolutionSubstantiveEditAt(
            data,
            this.sourceTimestampFieldForKeys([key])
          )
        : this.withSolutionUpdatedAt(data),
      { merge: true }
    );
  }

  updateSolutionFields(id: string, values: Partial<Solution>) {
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${id}`
    );
    const hasSubstantiveEdit = Object.keys(values).some((key) =>
      this.isSubstantiveSolutionField(key)
    );
    if (hasSubstantiveEdit) {
      void this.activity.recordEvent('edit', id);
    }
    if (values.finished === 'true') {
      void this.activity.recordEvent('publish', id);
    }
    return solutionRef.set(
      hasSubstantiveEdit
        ? this.withSolutionSubstantiveEditAt(
            values,
            this.sourceTimestampFieldForKeys(Object.keys(values))
          )
        : this.withSolutionUpdatedAt(values),
      { merge: true }
    );
  }

  updateSolutionForTournament(solution: Solution) {
    const data = {
      tournament: 'true',
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  addLikes(solution: Solution) {
    let numLike = solution.numLike === undefined ? 0 : solution.numLike;
    const data = {
      numLike: (Number(numLike) + 1).toString(),
      likes: solution.likes,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  addNumShare(solution: Solution) {
    let numShare = solution.numShare === undefined ? 0 : solution.numShare;
    const data = {
      numShare: (Number(numShare) + 1).toString(),
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  removeLikes(solution: Solution) {
    let numberLike = solution.numLike === undefined ? 0 : solution.numLike;
    numberLike = Math.max(0, Number(numberLike) - 1);
    const data = {
      numLike: numberLike.toString(),
      likes: solution.likes,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }

  saveSolutionStrategyReview(solutionId: string, review: string) {
    // console.log('saving solution strategy review', review);
    const data = this.withSolutionSubstantiveEditAt(
      {
        strategyReview: review,
      },
      'draftUpdatedAt'
    );
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );
    return solutionRef.set(data, { merge: true }).then(() => {
      void this.activity.recordEvent('edit', solutionId);
    });
  }

  async getStrategyReviewSyncMetadata(
    solutionId: string
  ): Promise<StrategyReviewSyncMetadata | undefined> {
    if (!solutionId) {
      return undefined;
    }

    const snapshot = await this.afs
      .doc<Solution>(`solutions/${solutionId}`)
      .ref.get();
    return snapshot.exists
      ? snapshot.data()?.strategyReviewSyncMetadata
      : undefined;
  }

  async saveStrategyReviewReconciliation(
    solutionId: string,
    review: string,
    metadata: StrategyReviewSyncMetadata,
    options: {
      previousReview?: string;
      reason:
        | 'generated'
        | 'auto-updated'
        | 'merged'
        | 'kept-review'
        | 'replaced'
        | 'restored'
        | 'initialized';
      syncStatus?: 'aligned' | 'attention';
      remainingConflictCount?: number;
      preserveRecoveryRevision?: boolean;
    }
  ): Promise<void> {
    const now = this.serverTimestamp();
    const solutionRef = this.afs.doc(`solutions/${solutionId}`).ref;
    const hasExpectedReview = options.previousReview !== undefined;
    const previousReview = options.previousReview || '';
    const syncStatus = options.syncStatus || 'aligned';
    const remainingConflictCount =
      syncStatus === 'attention'
        ? Math.max(1, Number(options.remainingConflictCount || 0))
        : 0;
    const shouldArchivePreviousReview =
      Boolean(previousReview) &&
      previousReview !== review &&
      !options.preserveRecoveryRevision;

    await this.afs.firestore.runTransaction(async (transaction) => {
      const solutionSnapshot = await transaction.get(solutionRef);
      const serverSolution = (solutionSnapshot.data() || {}) as Solution;
      const serverReview = String(serverSolution.strategyReview || '');
      const serverAnswers = strategyReviewSourceAnswers(
        serverSolution.status as Record<string, string> | undefined
      );
      const serverStepsHash = strategyReviewStepsHash(serverAnswers);
      const expectedSourceHash =
        metadata.sourceSnapshotHash || metadata.lastReviewedStepsHash;

      if (hasExpectedReview && serverReview !== previousReview) {
        throw new Error(
          'STRATEGY_REVIEW_CHANGED: A teammate updated Strategy Review while it was being reconciled.'
        );
      }
      if (serverStepsHash !== expectedSourceHash) {
        throw new Error(
          'STRATEGY_STEPS_CHANGED: Steps 1–4 changed while Strategy Review was being reconciled.'
        );
      }

      const previousRevision = shouldArchivePreviousReview
        ? {
            review: previousReview,
            reason: options.reason,
            createdAt: now,
            createdByUid: this.auth.currentUser?.uid || '',
            createdByEmail: this.auth.currentUser?.email || '',
          }
        : serverSolution.strategyReviewPreviousRevision;

      transaction.set(
        solutionRef,
        {
          strategyReview: review,
          strategyReviewSyncMetadata: {
            ...metadata,
            lastOutcome: options.reason,
            updatedAt: now,
          },
          ...(previousRevision
            ? { strategyReviewPreviousRevision: previousRevision }
            : {}),
          draftUpdatedAt: now,
          ...(syncStatus === 'aligned'
            ? { strategyReviewReviewedAgainstStepsAt: now }
            : {}),
          strategyReviewSyncStatus: syncStatus,
          strategyReviewConflictCount: remainingConflictCount,
          updatedAt: now,
          lastSubstantiveEditAt: now,
          feedUpdatedAt: now,
        },
        { merge: true }
      );
    });

    if (shouldArchivePreviousReview) {
      void this.afs
        .collection(`solutions/${solutionId}/strategyReviewRevisions`)
        .add({
          review: previousReview,
          reason: options.reason,
          createdAt: this.serverTimestamp(),
          createdByUid: this.auth.currentUser?.uid || '',
          createdByEmail: this.auth.currentUser?.email || '',
        })
        .catch((error) =>
          console.warn(
            'Could not add the Strategy Review history entry. The latest recovery copy remains on the solution.',
            error
          )
        );
    }
    void this.activity.recordEvent('edit', solutionId);
  }

  saveSolutionStatus(solutionId: string, status: any) {
    const data = this.withSolutionSubstantiveEditAt(
      {
        status: status,
      },
      'stepsUpdatedAt'
    );
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );
    return solutionRef.set(data, { merge: true }).then(() => {
      void this.activity.recordEvent('edit', solutionId);
    });
  }
  submitSolution(solutionId: string) {
    const data = this.withSolutionUpdatedAt({
      // content: content,
      finished: 'true',
      stqtusForPublication: '', // every submition will need to be seen for publication
      submissionDate: this.time.todaysDate(),
    });
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }
  submitPreviewSolution(solutionId: string, content: string) {
    const data = this.withSolutionSubstantiveEditAt(
      {
        content: content,
        preview: 'true',
      },
      'publishedContentUpdatedAt'
    );
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true }).then(() => {
      void this.activity.recordEvent('edit', solutionId);
    });
  }

  editSolutionAfterInitialSubmission(
    solutionId: string,
    currentSolution: Solution
  ) {
    const evaluationHistory = this.buildEvaluationHistory(currentSolution);
    const data = this.withSolutionUpdatedAt({
      finished: 'false',
      edited: 'true',
      submissionDate: '',
      evaluationDetails: [],
      evaluationSummary: {},
      evaluationHistory,
      evaluators: currentSolution.evaluators,
      numberofTimesEvaluated: '',
    });
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  private buildEvaluationHistory(solution: Solution): EvaluationHistoryEntry[] {
    const existingHistory = Array.isArray(solution.evaluationHistory)
      ? solution.evaluationHistory
      : [];
    const evaluationDetails = Array.isArray(solution.evaluationDetails)
      ? solution.evaluationDetails
      : [];

    if (evaluationDetails.length === 0) {
      return existingHistory;
    }

    return [
      ...existingHistory,
      {
        archivedAtMs: Date.now(),
        archivedAtLabel: this.time.todaysDate(),
        submissionDate: solution.submissionDate,
        numberofTimesEvaluated:
          solution.numberofTimesEvaluated || evaluationDetails.length.toString(),
        evaluationSummary: solution.evaluationSummary || {},
        evaluationDetails,
      },
    ];
  }
  submitSolutionForPublication(solutionId: string, currentSolution: Solution) {
    const data = this.withSolutionUpdatedAt({
      statusForPublication: currentSolution.statusForPublication,
      evaluators: currentSolution.evaluators,
    });
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }
  setSolutionCategoryForPublication(
    solutionId: string,
    currentSolution: Solution
  ) {
    const data = this.withSolutionUpdatedAt({
      category: currentSolution.category,
    });
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }
  deleteSolution(solutionId: string) {
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );
    return solutionRef.delete();
  }

  updateSolutionTitle(solutionId: string, title: string) {
    const data = this.withSolutionSubstantiveEditAt({
      title: title,
    });
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true }).then(() => {
      void this.activity.recordEvent('edit', solutionId);
    });
  }
  updateSolutionBoard(solutionId: string, boardDataUrl: string): Promise<void> {
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );
    return solutionRef.update(
      this.withSolutionUpdatedAt({ board: boardDataUrl })
    );
  }

  updateSolutionRoles(roles: Roles, solutionId: string) {
    const data = this.withSolutionUpdatedAt({
      roles: roles,
    });
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  updateSolutionReadMe(solutionId: string, readMe: string) {
    const data = this.withSolutionSubstantiveEditAt({
      description: readMe,
    });
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true }).then(() => {
      void this.activity.recordEvent('edit', solutionId);
    });
  }

  addParticipantsToSolution(participants: any, solutionId: string) {
    const data = this.withSolutionUpdatedAt({
      participants: participants,
    });
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }
  addEvaluatorsToSolution(evaluators: any, solutionId: string) {
    const data = this.withSolutionUpdatedAt({
      evaluators: evaluators,
    });
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  sendSignal(solutionId: string, signalData: any) {
    const signalsRef = this.afs.collection(`solutions/${solutionId}/signals`);
    return signalsRef.add(signalData);
  }

  getSignals(
    solutionId: string,
    receiverId: string,
    receiverSessionId: string
  ): Observable<any[]> {
    return this.afs
      .collection(`solutions/${solutionId}/signals`, (ref) =>
        ref
          .where('receiverId', '==', receiverId)
          .where('receiverSessionId', '==', receiverSessionId)
      )
      .snapshotChanges()
      .pipe(
        map((actions) =>
          actions.map((a) => {
            const data: any = a.payload.doc.data();
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      );
  }

  deleteSignal(solutionId: string, signalId: string) {
    return this.afs.doc(`solutions/${solutionId}/signals/${signalId}`).delete();
  }
  addParticipant(solutionId: string, userId: string, sessionId: string) {
    const participantsRef = this.afs.collection(
      `solutions/${solutionId}/participants`
    );
    return participantsRef.doc(userId).set({
      userId: userId,
      sessionId: sessionId,
    });
  }

  removeParticipant(solutionId: string, userId: string) {
    const participantsRef = this.afs.collection(
      `solutions/${solutionId}/participants`
    );
    return participantsRef.doc(userId).delete();
  }

  getParticipants(
    solutionId: string
  ): Observable<{ userId: string; sessionId: string }[]> {
    const participantsRef = this.afs.collection(
      `solutions/${solutionId}/participants`
    );
    return participantsRef.valueChanges().pipe(
      map((participants) =>
        participants.map((p: any) => ({
          userId: p.userId,
          sessionId: p.sessionId,
        }))
      )
    );
  }

  deleteSignalsBySender(
    solutionId: string,
    senderId: string,
    senderSessionId: string
  ) {
    const signalsRef = this.afs.collection(
      `solutions/${solutionId}/signals`,
      (ref) =>
        ref
          .where('senderId', '==', senderId)
          .where('senderSessionId', '==', senderSessionId)
    );
    signalsRef.get().subscribe((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        doc.ref.delete();
      });
    });
  }

  private generateSessionId(): string {
    return Date.now().toString(); // Generates a simple session ID based on timestamp
  }
  createMeetLink(solutionId: string, title: string): Observable<any> {
    const callable = this.fns.httpsCallable('createGoogleMeet');
    return callable({ solutionId, title });
  }
  getMany(ids: string[]) {
    return this.afs
      .collection<Solution>('solutions', (ref) =>
        ref.where('solutionId', 'in', ids).limit(30)
      )
      .valueChanges();
  }
  // solution.service.ts
  getSolutionsByIds(ids: string[]) {
    if (!ids.length) return of([]);
    /* Firestore ‘in’ supports ≤30 values – chunk if needed */
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));

    return combineLatest(
      chunks.map((chunk) =>
        this.afs
          .collection<Solution>('solutions', (ref) =>
            ref.where('solutionId', 'in', chunk)
          )
          .valueChanges({ idField: 'solutionId' })
      )
    ).pipe(map((arr) => arr.flat()));
  }

  // === Start a broadcast ===
  async startBroadcast(params: {
    solutionId: string;
    title: string;
    message: string;
    includeReadMe: boolean;
    readMe?: string;
    channels: {
      email: boolean;
      broadcastFeed: boolean;
      social: boolean;
      customApi: boolean;
    };
    inviteLink: string;
    joinLink: string;
  }): Promise<string> {
    const broadcastId = this.afs.createId();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    const payload: Broadcast = {
      broadcastId,
      solutionId: params.solutionId,
      title: params.title,
      message: params.message || '',
      includeReadMe: !!params.includeReadMe,
      readMe: params.includeReadMe ? params.readMe || '' : undefined,
      channels: params.channels,
      inviteLink: params.inviteLink,
      joinLink: params.joinLink,
      active: true,
      status: 'active',
      createdByUid: this.auth.currentUser.uid,
      createdByName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      createdByEmail: this.auth.currentUser.email,
      createdAt: now,
      updatedAt: now,
    };

    // 1) create broadcast doc
    await this.afs
      .doc(`broadcasts/${broadcastId}`)
      .set(payload, { merge: true });

    // 2) mirror status on the solution
    await this.afs.doc(`solutions/${params.solutionId}`).set(
      {
        isBroadcasting: true,
        broadcastId,
        broadcastStatus: 'active',
        broadcastChannels: params.channels,
        broadCastInviteMessage: params.message || '',
        broadcastStartedAt: now,
        broadcastUpdatedAt: now,
      },
      { merge: true }
    );

    // (Optional) trigger emails / feeds via CF if chosen
    // if (params.channels.email) {
    //   const send = this.fns.httpsCallable('sendSolutionBroadcastEmails');
    //   await firstValueFrom(send({ broadcastId }));
    // }

    return broadcastId;
  }

  // === Stop broadcast by solutionId ===
  async stopBroadcastBySolutionId(solutionId: string): Promise<void> {
    // find active broadcast for this solution
    const snap = await firstValueFrom(
      this.afs
        .collection<Broadcast>('broadcasts', (ref) =>
          ref
            .where('solutionId', '==', solutionId)
            .where('active', '==', true)
            .limit(1)
        )
        .get()
    );
    if (snap.empty) {
      // still clear solution mirror if it somehow stayed on
      await this.afs.doc(`solutions/${solutionId}`).set(
        {
          isBroadcasting: false,
          broadcastStatus: 'stopped',
          broadcastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    const doc = snap.docs[0].ref;
    await doc.set(
      {
        active: false,
        status: 'stopped',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await this.afs.doc(`solutions/${solutionId}`).set(
      {
        isBroadcasting: false,
        broadcastStatus: 'stopped',
        broadcastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
  // === Start a broadcast in PENDING state (author clicks Publish Invite) ===
  async startBroadcastPending(params: {
    solutionId: string;
    title: string;
    message: string;
    includeReadMe: boolean;
    readMe?: string;
    channels: {
      email: boolean;
      broadcastFeed: boolean;
      social: boolean;
      customApi: boolean;
    };
    inviteLink: string;
    joinLink: string;
  }): Promise<string> {
    const broadcastId = this.afs.createId();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    const payload: Broadcast = {
      broadcastId,
      solutionId: params.solutionId,
      title: params.title,
      message: params.message || '',
      includeReadMe: !!params.includeReadMe,
      readMe: params.includeReadMe ? params.readMe || '' : undefined,
      channels: params.channels,
      inviteLink: params.inviteLink,
      joinLink: params.joinLink,
      active: false, // not visible
      status: 'pending', // awaiting admin approval
      createdByUid: this.auth.currentUser.uid,
      createdByName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      createdByEmail: this.auth.currentUser.email,
      createdAt: now,
      updatedAt: now,
      approvalRequestedAt: now,
      approvedByUid: null,
      approvedByName: null,
      approvedAt: null,
    };

    await this.afs
      .doc(`broadcasts/${broadcastId}`)
      .set(payload, { merge: true });

    await this.afs.doc(`solutions/${params.solutionId}`).set(
      {
        isBroadcasting: false,
        broadcastId,
        broadcastStatus: 'pending',
        broadcastChannels: params.channels,
        broadCastInviteMessage: params.message || '',
        broadcastStartedAt: now,
        broadcastUpdatedAt: now,
      },
      { merge: true }
    );

    return broadcastId;
  }

  async approveBroadcastById(
    broadcastId: string,
    approver: { uid: string; name: string }
  ) {
    const now = firebase.firestore.FieldValue.serverTimestamp();

    const docRef = this.afs.doc<Broadcast>(`broadcasts/${broadcastId}`).ref;
    const snap = await docRef.get();
    if (!snap.exists) throw new Error('Broadcast not found');
    const b = snap.data() as Broadcast;

    await docRef.set(
      {
        active: true,
        status: 'active',
        updatedAt: now,
        approvedByUid: approver.uid,
        approvedByName: approver.name,
        approvedAt: now,
      },
      { merge: true }
    );

    await this.afs.doc(`solutions/${b.solutionId}`).set(
      {
        isBroadcasting: true,
        broadcastStatus: 'active',
        broadcastUpdatedAt: now,
      },
      { merge: true }
    );
  }
  async cancelPendingBySolutionId(solutionId: string): Promise<void> {
    // find the most recent pending broadcast for this solution
    const snap = await firstValueFrom(
      this.afs
        .collection<Broadcast>('broadcasts', (ref) =>
          ref
            .where('solutionId', '==', solutionId)
            .where('status', '==', 'pending') // ⚠️ ensure index
            .orderBy('createdAt', 'desc')
            .limit(1)
        )
        .get()
    );

    if (!snap.empty) {
      const ref = snap.docs[0].ref;
      await ref.set(
        {
          active: false,
          status: 'stopped', // back to not published
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          canceledAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // clear mirror on solution
    await this.afs.doc(`solutions/${solutionId}`).set(
      {
        isBroadcasting: false,
        broadcastStatus: 'stopped',
        broadcastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        // optional: clear the broadcastId so a new submission starts fresh
        broadcastId: null,
      },
      { merge: true }
    );
  }

  // === Read: active broadcasts (for your future page) ===
  listActiveBroadcasts() {
    return this.afs
      .collection<Broadcast>('broadcasts', (ref) =>
        ref.where('active', '==', true).orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'broadcastId' });
  }

  // Active broadcasts → Solutions (convenience)
  listActiveBroadcastSolutions() {
    return this.listActiveBroadcasts().pipe(
      map((bcs) => bcs.map((b) => b.solutionId)),
      switchMap((ids) => this.getSolutionsByIds(ids)) // you already have this helper
    );
  }
  listBroadcastsByStatuses(statuses: BroadcastStatus[]) {
    // For 1 status use equality; for many use 'in'
    if (statuses.length === 1) {
      const s = statuses[0];
      return this.afs
        .collection<Broadcast>('broadcasts', (ref) =>
          ref.where('status', '==', s).orderBy('createdAt', 'desc').limit(500)
        )
        .valueChanges({ idField: 'broadcastId' });
    } else {
      return this.afs
        .collection<Broadcast>('broadcasts', (ref) =>
          ref
            .where('status', 'in', statuses)
            .orderBy('createdAt', 'desc')
            .limit(500)
        )
        .valueChanges({ idField: 'broadcastId' });
    }
  }

  async setBroadcastStatus(
    broadcastId: string,
    status: BroadcastStatus
  ): Promise<void> {
    const now = firebase.firestore.FieldValue.serverTimestamp();

    // Load broadcast to get solutionId and current values
    const docRef = this.afs.doc<Broadcast>(`broadcasts/${broadcastId}`).ref;
    const snap = await docRef.get();
    if (!snap.exists) throw new Error('Broadcast not found');
    const b = snap.data() as Broadcast;

    // Map status → active flag
    const activeFlag = status === 'active' || status === 'paused';

    // Update broadcast
    await docRef.set(
      {
        status,
        active: activeFlag,
        updatedAt: now,
        // Optional audits
        approvedAt: status === 'active' ? now : (b as any).approvedAt ?? null,
        pausedAt: status === 'paused' ? now : (b as any).pausedAt ?? null,
        stoppedAt: status === 'stopped' ? now : (b as any).stoppedAt ?? null,
        approvalRequestedAt: (b as any).approvalRequestedAt ?? now, // ensure present
      },
      { merge: true }
    );

    // Mirror to solution
    await this.afs.doc(`solutions/${b.solutionId}`).set(
      {
        isBroadcasting: status === 'active', // treat "broadcasting" as live only
        broadcastStatus: status,
        broadcastUpdatedAt: now,
        // keep broadcastId field in place
      },
      { merge: true }
    );
  }

  // === Pause / Resume (optional) ===
  async setBroadcastPaused(solutionId: string, paused: boolean): Promise<void> {
    const snap = await firstValueFrom(
      this.afs
        .collection<Broadcast>('broadcasts', (ref) =>
          ref
            .where('solutionId', '==', solutionId)
            .where('active', '==', true)
            .limit(1)
        )
        .get()
    );
    if (snap.empty) return;

    const status = paused ? 'paused' : 'active';
    await snap.docs[0].ref.set(
      {
        status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await this.afs.doc(`solutions/${solutionId}`).set(
      {
        broadcastStatus: status,
        broadcastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  async requestToJoin(
    solutionId: string,
    user: { uid: string; email: string; firstName?: string; lastName?: string },
    message: string
  ): Promise<void> {
    const docRef = this.afs.doc<JoinRequest>(
      `solutions/${solutionId}/joinRequests/${user.uid}`
    );
    const data: JoinRequest = {
      uid: user.uid,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      message: message.trim(),
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await docRef.set(data, { merge: true });

    const notify = this.fns.httpsCallable('notifyJoinRequest');
    try {
      await firstValueFrom(
        notify({
          solutionId,
          requester: {
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
          },
          message: data.message,
        })
      );
    } catch (error) {
      console.error('Failed to notify team about join request', error);
    }
  }

  cancelJoinRequest(solutionId: string, uid: string) {
    const docRef = this.afs.doc<any>(
      `solutions/${solutionId}/joinRequests/${uid}`
    );
    return docRef.set(
      {
        status: 'cancelled',
        cancelledAt: Date.now(),
        updatedAt: Date.now(),
      } as Partial<JoinRequest>,
      { merge: true }
    );
  }

  declineJoinRequest(solutionId: string, uid: string): Promise<void> {
    const docRef = this.afs.doc<any>(
      `solutions/${solutionId}/joinRequests/${uid}`
    );
    return docRef.set(
      {
        status: 'rejected',
        rejectedAt: Date.now(),
        updatedAt: Date.now(),
      } as Partial<JoinRequest>,
      { merge: true }
    );
  }

  getJoinRequestForUser(solutionId: string, uid: string) {
    return this.afs
      .doc<JoinRequest>(`solutions/${solutionId}/joinRequests/${uid}`)
      .valueChanges();
  }

  listJoinRequests(solutionId: string) {
    return this.afs
      .collection<JoinRequest>(`solutions/${solutionId}/joinRequests`, (ref) =>
        ref.orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'id' });
  }

  listPendingJoinRequests(solutionId: string) {
    return this.afs
      .collection<JoinRequest>(`solutions/${solutionId}/joinRequests`, (ref) =>
        ref.where('status', '==', 'pending').orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'id' });
  }

  private normalizeParticipants(raw: any): { name: string }[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      // ensure each entry is { name: string }
      return raw
        .map((x: any) =>
          typeof x === 'string'
            ? { name: x }
            : { name: (x?.name || '').toString() }
        )
        .filter((p: any) => (p.name || '').trim());
    }
    // map/object -> array
    return Object.values(raw)
      .map((v: any) => ({
        name: (typeof v === 'string' ? v : v?.name || '').toString(),
      }))
      .filter((p: any) => (p.name || '').trim());
  }

  async approveJoinRequest(
    solutionId: string,
    user: { uid: string; email: string; firstName?: string; lastName?: string }
  ): Promise<void> {
    const solRef = this.afs.doc(`solutions/${solutionId}`).ref;
    const reqRef = this.afs.doc(
      `solutions/${solutionId}/joinRequests/${user.uid}`
    ).ref;

    await this.afs.firestore.runTransaction(async (tx) => {
      const solSnap = await tx.get(solRef);
      const solData: any = solSnap.exists ? solSnap.data() : {};
      const participants = this.normalizeParticipants(solData.participants);

      const email = (user.email || '').trim().toLowerCase();
      const exists = participants.some(
        (p) => (p.name || '').trim().toLowerCase() === email
      );
      if (!exists) {
        participants.push({ name: email });
      }

      tx.update(solRef, { participants });
      tx.update(reqRef, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: this.auth.currentUser?.uid || null,
      });
    });

    const notifyApproved = this.fns.httpsCallable('notifyJoinApproved');
    try {
      await firstValueFrom(
        notifyApproved({
          solutionId,
          requester: {
            uid: user.uid,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
          },
        })
      );
    } catch (error) {
      console.error('Failed to notify requester about approval', error);
    }
  }
}
