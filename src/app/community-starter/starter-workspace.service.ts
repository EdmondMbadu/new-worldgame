import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { User } from '../models/user';
import { StarterDraft, hasAnswer, mapStarterToPlayground, starterTitle } from './starter-model';

@Injectable({ providedIn: 'root' })
export class StarterWorkspaceService {
  constructor(private afs: AngularFirestore) {}

  /** Create-only boundary. A retry can recover a committed workspace, but can
   * never merge into or overwrite answers subsequently edited in playground. */
  async create(draft: StarterDraft, user: User): Promise<string> {
    if (!user.uid || !user.email || !hasAnswer(draft.answers['problem'])) throw new Error('A signed-in owner and a problem are required.');
    if (!/^[a-zA-Z0-9_-]{16,64}$/.test(draft.id)) throw new Error('Invalid starter draft.');
    const uid = user.uid;
    // The existing solution rules cannot authorize a read of an absent private
    // solution. A transaction reads the owner's handoff marker instead, and
    // allocates an entirely new solution reference only when the marker is absent.
    const marker = this.afs.firestore.doc(`users/${uid}/communityStarterHandoffs/${draft.id}`);
    const mapping = mapStarterToPlayground(draft);
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Community member';
    const email = user.email.trim().toLowerCase();
    return this.afs.firestore.runTransaction(async tx => {
      const handoff = await tx.get(marker);
      if (handoff.exists) {
        const saved = handoff.data();
        if (saved?.['ownerUid'] !== uid || saved?.['draftId'] !== draft.id ||
          typeof saved?.['solutionId'] !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(saved['solutionId'])) throw new Error('Invalid saved handoff.');
        const existing = await tx.get(this.afs.firestore.doc(`solutions/${saved['solutionId']}`));
        const data = existing.data();
        if (!existing.exists || data?.['ownerAccountId'] !== uid || data?.['starterOrigin']?.draftId !== draft.id) throw new Error('This workspace belongs to a different draft.');
        return saved['solutionId'] as string;
      }
      // No read (or overwrite) of any existing solution. Firestore generates a
      // fresh reference on every transaction attempt; only the committed one is kept.
      const ref = this.afs.firestore.collection('solutions').doc();
      const solutionId = ref.id;
      const now = firebase.firestore.FieldValue.serverTimestamp();
      tx.set(ref, {
        solutionId, title: starterTitle(draft), solutionArea: 'Community',
        description: draft.answers['problem'].trim(),
        authorAccountId: uid, authorEmail: email, authorName: name,
        ownerAccountId: uid, ownerEmail: email, ownerName: name,
        authorProfileCredential: user.profileCredential || '', ownerProfileCredential: user.profileCredential || '',
        participants: [{ name: email }], evaluators: [], sdgs: [],
        teamMemberEmails: [email], solutionAdminEmails: [email],
        status: mapping.status, likes: [], numLike: '0', views: '0',
        isPrivate: true, communityVisibility: 'private', feedEligible: false,
        feedStatus: 'in-development', feedUpdatedAt: now,
        creationDate: new Date().toLocaleDateString('en-US'),
        createdAt: now, updatedAt: now, stepsUpdatedAt: now, lastSubstantiveEditAt: now,
        ...(draft.brief ? {starterBrief: draft.brief.document} : {}),
        starterOrigin: {
          version: 1, draftId: draft.id, mappingVersion: 1,
          evidence: mapping.evidence, unansweredKeys: mapping.missingKeys,
          source: 'author-input', isFirstPass: true,
          acceptedAiFields: Object.entries(draft.brief?.accepted || {}).filter(([field,text]) => draft.answers[field]?.includes(text)).map(([field]) => field),
        },
      });
      tx.set(marker, { ownerUid: uid, draftId: draft.id, solutionId, createdAt: now });
      return solutionId;
    });
  }
}
