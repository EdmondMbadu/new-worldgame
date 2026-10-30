import { StarterWorkspaceService } from './starter-workspace.service';
import { newStarterDraft } from './starter-model';

describe('Starter create-only workspace handoff', () => {
  const owner = { uid: 'owner-1', email: 'Owner@example.com', firstName: 'Test', lastName: 'Owner', verified: true };
  function harness() {
    const records = new Map<string, Record<string, any>>();
    const ref = (path: string) => ({ path, id: path.split('/').pop()! });
    let sequence = 0;
    const get = jasmine.createSpy('transaction.get').and.callFake(async (doc: { path: string }) => ({ exists: records.has(doc.path), data: () => records.get(doc.path) }));
    const set = jasmine.createSpy('transaction.set');
    const afs = { firestore: {
      doc: jasmine.createSpy('doc').and.callFake(ref),
      collection: () => ({ doc: () => ref(`solutions/new-solution-${++sequence}`) }),
      runTransaction: async (callback: (value: any) => Promise<string>) => {
        const pending: [string, Record<string, any>][] = [];
        const result = await callback({ get, set: (doc: { path: string }, data: Record<string, any>) => { set(doc, data); pending.push([doc.path, data]); } });
        for (const [path, data] of pending) records.set(path, data);
        return result;
      },
    } };
    return { service: new StarterWorkspaceService(afs as any), records, get, set, afs };
  }

  it('atomically creates a private solution and an owner-scoped handoff marker', async () => {
    const { service, set, records, get } = harness();
    const draft = newStarterDraft();
    draft.answers = { problem: 'A problem.', firstAction: 'Talk with residents.' };
    const id = await service.create(draft, owner);
    expect(set).toHaveBeenCalledTimes(2);
    const data = records.get(`solutions/${id}`)!;
    expect(data['isPrivate']).toBeTrue();
    expect(data['communityVisibility']).toBe('private');
    expect(data['feedEligible']).toBeFalse();
    expect(data['participants']).toEqual([{ name: 'owner@example.com' }]);
    expect(data['teamMemberEmails']).toEqual(['owner@example.com']);
    expect(data['solutionAdminEmails']).toEqual(['owner@example.com']);
    expect(data['ownerAccountId']).toBe(owner.uid);
    expect(data['status']['S4-N']).toContain('Talk with residents.');
    expect(data['status']['S4-E']).toBeUndefined();
    expect(data['finished']).toBeUndefined();
    expect(data['strategyReview']).toBeUndefined();
    expect(data['starterOrigin'].isFirstPass).toBeTrue();
    expect(records.get(`users/${owner.uid}/communityStarterHandoffs/${draft.id}`)?.['solutionId']).toBe(id);
    // No permission-denied read of a nonexistent solution under existing rules.
    expect(get.calls.allArgs().every(args => args[0].path.startsWith('users/'))).toBeTrue();
  });

  it('recovers a committed save without overwriting later playground edits', async () => {
    const { service, records, set } = harness();
    const draft = newStarterDraft(); draft.answers['problem'] = 'A problem.';
    const first = await service.create(draft, owner);
    records.get(`solutions/${first}`)!['status']['S1-A'] = 'Edited in the playground';
    draft.answers['problem'] = 'Different browser draft';
    set.calls.reset();
    const second = await service.create(draft, owner);
    expect(first).toBe(second);
    expect(set).not.toHaveBeenCalled();
    expect(records.get(`solutions/${first}`)?.['status']['S1-A']).toBe('Edited in the playground');
  });

  it('uses separate targets for different accounts and separate drafts', async () => {
    const { service } = harness();
    const draft = newStarterDraft(); draft.answers['problem'] = 'A problem.';
    const first = await service.create(draft, owner);
    const other = await service.create(draft, { ...owner, uid: 'owner-2' });
    expect(first).not.toBe(other);
    expect(first).toBe(await service.create(draft, owner));
    const separate = { ...draft, id: newStarterDraft().id };
    expect(first).not.toBe(await service.create(separate, owner));
  });

  it('refuses a handoff whose target belongs to a different owner', async () => {
    const { service, records, set } = harness();
    const draft = newStarterDraft(); draft.answers['problem'] = 'A problem.';
    const id = await service.create(draft, owner);
    records.get(`solutions/${id}`)!['ownerAccountId'] = 'someone-else';
    set.calls.reset();
    await expectAsync(service.create(draft, owner)).toBeRejected();
    expect(set).not.toHaveBeenCalled();
  });

  it('never resurrects a deleted workspace or writes to a malformed marker target', async () => {
    const { service, records, set } = harness();
    const draft = newStarterDraft(); draft.answers['problem'] = 'A problem.';
    const id = await service.create(draft, owner);
    records.delete(`solutions/${id}`);
    set.calls.reset();
    await expectAsync(service.create(draft, owner)).toBeRejected();
    expect(set).not.toHaveBeenCalled();
    records.get(`users/${owner.uid}/communityStarterHandoffs/${draft.id}`)!['solutionId'] = '../other/doc';
    await expectAsync(service.create(draft, owner)).toBeRejected();
    expect(set).not.toHaveBeenCalled();
  });

  it('requires an authenticated owner and meaningful problem before any write', async () => {
    const { service, set, afs } = harness();
    const draft = newStarterDraft();
    await expectAsync(service.create(draft, owner)).toBeRejected();
    draft.answers['problem'] = 'A problem.';
    await expectAsync(service.create(draft, { email: 'guest@example.com' })).toBeRejected();
    expect(set).not.toHaveBeenCalled();
    expect(afs.firestore.doc).not.toHaveBeenCalled();
  });
});
