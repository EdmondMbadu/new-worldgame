export interface SolutionOwnershipAdmin {
  authorAccountId: string;
  authorName: string;
  authorEmail: string;
  authorProfilePicture?: any;
}

export interface SolutionOwnershipSource {
  ownerAccountId?: string;
  ownerEmail?: string;
  ownerName?: string;
  ownerProfilePicture?: any;
  authorAccountId?: string;
  authorEmail?: string;
  authorName?: string;
  initiatorId?: string;
  participants?: any;
  participantsHolder?: any;
  chosenAdmins?: SolutionOwnershipAdmin[];
  ownershipHistory?: SolutionOwnershipHistoryEntry[];
}

export interface SolutionOwnershipUser {
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: any;
  profileCredential?: string;
  admin?: string | boolean;
  role?: string;
}

export interface SolutionOwnershipHistoryEntry {
  transferredAtMs: number;
  transferredByUid: string;
  transferredByEmail: string;
  previousOwnerAccountId: string;
  previousOwnerName: string;
  previousOwnerEmail: string;
  newOwnerAccountId: string;
  newOwnerName: string;
  newOwnerEmail: string;
  previousOwnerKeptAsAdmin: boolean;
}

export interface SolutionOwnershipUpdate {
  ownerAccountId: string;
  ownerName: string;
  ownerEmail: string;
  ownerProfileCredential: string;
  ownerProfilePicture?: any;
  chosenAdmins: SolutionOwnershipAdmin[];
  solutionAdminEmails: string[];
  teamMemberEmails: string[];
  ownershipTransferredAtMs: number;
  ownershipTransferredByUid: string;
  ownershipTransferredByEmail: string;
  ownershipHistory: SolutionOwnershipHistoryEntry[];
}

export interface SolutionOwnershipTarget extends SolutionOwnershipAdmin {
  profileCredential?: string;
}

export interface SolutionOwnershipActor {
  uid: string;
  email: string;
}

export const normalizeSolutionEmail = (value: unknown): string =>
  String(value || '').trim().toLowerCase();

const normalizedUid = (value: unknown): string =>
  String(value || '').trim();

const sameIdentity = (
  left: Pick<SolutionOwnershipAdmin, 'authorAccountId' | 'authorEmail'>,
  right: Pick<SolutionOwnershipAdmin, 'authorAccountId' | 'authorEmail'>
): boolean => {
  const leftUid = normalizedUid(left.authorAccountId);
  const rightUid = normalizedUid(right.authorAccountId);
  if (leftUid && rightUid && leftUid === rightUid) return true;

  const leftEmail = normalizeSolutionEmail(left.authorEmail);
  const rightEmail = normalizeSolutionEmail(right.authorEmail);
  return !!leftEmail && leftEmail === rightEmail;
};

export function solutionOwnerIdentity(
  solution?: SolutionOwnershipSource | null
): SolutionOwnershipAdmin | null {
  if (!solution) return null;

  const authorAccountId = normalizedUid(
    solution.ownerAccountId || solution.authorAccountId || solution.initiatorId
  );
  const authorEmail = normalizeSolutionEmail(
    solution.ownerEmail || solution.authorEmail
  );
  const authorName = String(
    solution.ownerName || solution.authorName || authorEmail
  ).trim();

  if (!authorAccountId && !authorEmail) return null;

  const matchingAdmin = (solution.chosenAdmins || []).find((admin) =>
    sameIdentity(
      {
        authorAccountId,
        authorEmail,
      },
      admin
    )
  );

  const owner: SolutionOwnershipAdmin = {
    authorAccountId,
    authorEmail,
    authorName,
  };
  const profilePicture =
    solution.ownerProfilePicture || matchingAdmin?.authorProfilePicture;
  if (profilePicture) owner.authorProfilePicture = profilePicture;
  return owner;
}

export function solutionCreatorIdentity(
  solution?: SolutionOwnershipSource | null
): SolutionOwnershipAdmin | null {
  if (!solution) return null;

  const authorAccountId = normalizedUid(
    solution.authorAccountId || solution.initiatorId
  );
  const authorEmail = normalizeSolutionEmail(solution.authorEmail);
  const authorName = String(
    solution.authorName || authorEmail
  ).trim();

  if (!authorAccountId && !authorEmail) return null;

  return {
    authorAccountId,
    authorEmail,
    authorName,
  };
}

export function ownershipTargetFromUser(
  user?: SolutionOwnershipUser | null
): SolutionOwnershipTarget | null {
  const authorAccountId = normalizedUid(user?.uid);
  const authorEmail = normalizeSolutionEmail(user?.email);
  if (!authorAccountId || !authorEmail) return null;

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  const target: SolutionOwnershipTarget = {
    authorAccountId,
    authorEmail,
    authorName: fullName || authorEmail,
    profileCredential: user?.profileCredential,
  };
  if (user?.profilePicture) {
    target.authorProfilePicture = user.profilePicture;
  }
  return target;
}

export function isPlatformAdminUser(
  user?: SolutionOwnershipUser | null
): boolean {
  return (
    user?.admin === 'true' ||
    (user as any)?.admin === true ||
    user?.role === 'admin'
  );
}

export function isSolutionOwner(
  solution?: SolutionOwnershipSource | null,
  user?: Pick<SolutionOwnershipUser, 'uid' | 'email'> | null
): boolean {
  const owner = solutionOwnerIdentity(solution);
  if (!owner || !user) return false;

  return sameIdentity(owner, {
    authorAccountId: normalizedUid(user.uid),
    authorEmail: normalizeSolutionEmail(user.email),
  });
}

export function isSolutionAdmin(
  solution?: SolutionOwnershipSource | null,
  user?: SolutionOwnershipUser | null,
  includePlatformAdmin = true
): boolean {
  if (!solution || !user) return false;
  if (includePlatformAdmin && isPlatformAdminUser(user)) return true;
  if (isSolutionOwner(solution, user)) return true;

  const identity = {
    authorAccountId: normalizedUid(user.uid),
    authorEmail: normalizeSolutionEmail(user.email),
  };
  return (solution.chosenAdmins || []).some((admin) =>
    sameIdentity(admin, identity)
  );
}

const collectParticipantEmails = (
  solution: SolutionOwnershipSource
): Set<string> => {
  const emails = new Set<string>();
  const add = (value: any) => {
    const email = normalizeSolutionEmail(
      typeof value === 'string'
        ? value
        : value?.name || value?.email || value?.authorEmail
    );
    if (email) emails.add(email);
  };

  [solution.participants, solution.participantsHolder].forEach((value) => {
    if (Array.isArray(value)) value.forEach(add);
    else if (value && typeof value === 'object') Object.values(value).forEach(add);
  });
  return emails;
};

const deduplicateAdmins = (
  admins: SolutionOwnershipAdmin[]
): SolutionOwnershipAdmin[] => {
  const result: SolutionOwnershipAdmin[] = [];
  admins.forEach((admin) => {
    const normalized: SolutionOwnershipAdmin = {
      ...admin,
      authorAccountId: normalizedUid(admin.authorAccountId),
      authorEmail: normalizeSolutionEmail(admin.authorEmail),
      authorName: String(admin.authorName || admin.authorEmail || '').trim(),
    };
    const index = result.findIndex((existing) =>
      sameIdentity(existing, normalized)
    );
    if (index >= 0) result[index] = { ...result[index], ...normalized };
    else result.push(normalized);
  });
  return result;
};

export function buildSolutionOwnershipTransfer(
  solution: SolutionOwnershipSource,
  newOwner: SolutionOwnershipTarget,
  actor: SolutionOwnershipActor,
  keepPreviousOwnerAsAdmin: boolean,
  transferredAtMs = Date.now()
): SolutionOwnershipUpdate {
  const previousOwner = solutionOwnerIdentity(solution);
  if (!previousOwner) {
    throw new Error('This solution does not have a valid current owner.');
  }
  if (
    sameIdentity(previousOwner, newOwner)
  ) {
    throw new Error('This person is already the solution owner.');
  }

  const nextAdmins = (solution.chosenAdmins || []).filter(
    (admin) =>
      !sameIdentity(admin, newOwner) &&
      !sameIdentity(admin, previousOwner)
  );
  // Retain the owner in the legacy admin array so older deployed metadata
  // triggers also recognize the new owner. The UI filters this duplicate.
  nextAdmins.push(newOwner);
  if (keepPreviousOwnerAsAdmin) nextAdmins.push(previousOwner);
  const chosenAdmins = deduplicateAdmins(nextAdmins);

  const teamMemberEmails = collectParticipantEmails(solution);
  teamMemberEmails.add(normalizeSolutionEmail(newOwner.authorEmail));
  chosenAdmins.forEach((admin) =>
    teamMemberEmails.add(normalizeSolutionEmail(admin.authorEmail))
  );

  const solutionAdminEmails = Array.from(
    new Set([
      normalizeSolutionEmail(newOwner.authorEmail),
      ...chosenAdmins.map((admin) =>
        normalizeSolutionEmail(admin.authorEmail)
      ),
    ])
  ).filter(Boolean);

  const historyEntry: SolutionOwnershipHistoryEntry = {
    transferredAtMs,
    transferredByUid: normalizedUid(actor.uid),
    transferredByEmail: normalizeSolutionEmail(actor.email),
    previousOwnerAccountId: previousOwner.authorAccountId,
    previousOwnerName: previousOwner.authorName,
    previousOwnerEmail: previousOwner.authorEmail,
    newOwnerAccountId: normalizedUid(newOwner.authorAccountId),
    newOwnerName: String(newOwner.authorName || newOwner.authorEmail).trim(),
    newOwnerEmail: normalizeSolutionEmail(newOwner.authorEmail),
    previousOwnerKeptAsAdmin: keepPreviousOwnerAsAdmin,
  };

  const update: SolutionOwnershipUpdate = {
    ownerAccountId: historyEntry.newOwnerAccountId,
    ownerName: historyEntry.newOwnerName,
    ownerEmail: historyEntry.newOwnerEmail,
    ownerProfileCredential: newOwner.profileCredential || '',
    chosenAdmins,
    solutionAdminEmails,
    teamMemberEmails: Array.from(teamMemberEmails).filter(Boolean),
    ownershipTransferredAtMs: transferredAtMs,
    ownershipTransferredByUid: historyEntry.transferredByUid,
    ownershipTransferredByEmail: historyEntry.transferredByEmail,
    ownershipHistory: [...(solution.ownershipHistory || []), historyEntry],
  };
  if (newOwner.authorProfilePicture) {
    update.ownerProfilePicture = newOwner.authorProfilePicture;
  }
  return update;
}
