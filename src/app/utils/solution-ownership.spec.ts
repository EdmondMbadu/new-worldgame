import type { Solution } from '../models/solution';
import {
  buildSolutionOwnershipTransfer,
  isSolutionAdmin,
  isSolutionOwner,
  solutionCreatorIdentity,
  solutionOwnerIdentity,
} from './solution-ownership';

describe('solution ownership', () => {
  const legacySolution: Solution = {
    solutionId: 'solution-1',
    authorAccountId: 'creator-uid',
    authorEmail: 'creator@example.com',
    authorName: 'Original Creator',
    participants: [{ name: 'creator@example.com' }] as any,
    chosenAdmins: [
      {
        authorAccountId: 'next-owner-uid',
        authorEmail: 'next@example.com',
        authorName: 'Next Owner',
      },
    ],
  };

  it('uses the immutable author as the owner for legacy solutions', () => {
    expect(solutionOwnerIdentity(legacySolution)?.authorAccountId).toBe(
      'creator-uid'
    );
    expect(
      isSolutionOwner(legacySolution, {
        uid: 'creator-uid',
        email: 'creator@example.com',
      })
    ).toBeTrue();
  });

  it('transfers ownership without changing creator attribution', () => {
    const update = buildSolutionOwnershipTransfer(
      legacySolution,
      {
        authorAccountId: 'next-owner-uid',
        authorEmail: 'next@example.com',
        authorName: 'Next Owner',
      },
      {
        uid: 'creator-uid',
        email: 'creator@example.com',
      },
      true,
      12345
    );
    const transferred = { ...legacySolution, ...update };

    expect(solutionOwnerIdentity(transferred)?.authorAccountId).toBe(
      'next-owner-uid'
    );
    expect(solutionCreatorIdentity(transferred)?.authorAccountId).toBe(
      'creator-uid'
    );
    expect(
      transferred.chosenAdmins?.some(
        (admin) => admin.authorAccountId === 'creator-uid'
      )
    ).toBeTrue();
    expect(
      transferred.chosenAdmins?.some(
        (admin) => admin.authorAccountId === 'next-owner-uid'
      )
    ).toBeTrue();
    expect(transferred.ownershipHistory?.[0].transferredAtMs).toBe(12345);
  });

  it('lets the former owner leave the admin role when fallback is disabled', () => {
    const update = buildSolutionOwnershipTransfer(
      legacySolution,
      {
        authorAccountId: 'next-owner-uid',
        authorEmail: 'next@example.com',
        authorName: 'Next Owner',
      },
      {
        uid: 'creator-uid',
        email: 'creator@example.com',
      },
      false,
      12345
    );
    const transferred = { ...legacySolution, ...update };

    expect(
      isSolutionAdmin(transferred, {
        uid: 'creator-uid',
        email: 'creator@example.com',
      })
    ).toBeFalse();
    expect(transferred.teamMemberEmails).toContain('creator@example.com');
  });
});
