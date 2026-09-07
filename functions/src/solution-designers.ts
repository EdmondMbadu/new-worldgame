/** Pure membership calculation shared by public projections and home cards. */
export function solutionDesignerCount(solution: any): number {
  const emails = new Set<string>();
  const add = (value: unknown): void => {
    if (typeof value !== 'string') return;
    const email = value.trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emails.add(email);
  };
  const addMember = (entry: any): void => {
    if (typeof entry === 'string') add(entry);
    else if (entry && typeof entry === 'object') {
      // Legacy participant records store email in `name`.
      [entry.email, entry.name, entry.authorEmail, entry.address].forEach(add);
    }
  };
  [solution?.participants, solution?.participantsHolder, solution?.chosenAdmins,
    solution?.teamMemberEmails].forEach((members) => {
    if (Array.isArray(members)) members.forEach(addMember);
    else if (members && typeof members === 'object') {
      Object.entries(members).forEach(([key, entry]) => {
        add(key);
        addMember(entry);
      });
    }
  });
  add(solution?.authorEmail);
  add(solution?.ownerEmail);
  return emails.size;
}

/** Public cards intentionally omit the private membership records. */
export function homeDesignerCount(solution: any): number {
  const count = solution?.publicDesignerCount;
  return typeof count === 'number' && Number.isFinite(count) && count >= 0
    ? count
    : solutionDesignerCount(solution);
}
