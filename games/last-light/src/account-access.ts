export type AccountStatus = 'loading' | 'guest' | 'signed-in' | 'unavailable';
/** Every entry point uses the same policy; verification affects ranking, not play. */
export function clinicAccess(status: AccountStatus, mission: number): 'allowed' | 'account-required' | 'pending' {
  if (status === 'loading' || status === 'unavailable') return 'pending';
  return status === 'guest' && mission > 0 ? 'account-required' : 'allowed';
}
export class AccountRequiredError extends Error {
  readonly code = 'last-light/account-required';
  constructor() { super('Create a free account or log in to continue to the next clinic.'); }
}
export function requireClinicAccess(status: AccountStatus, mission: number) {
  const access = clinicAccess(status, mission);
  if (access === 'account-required') throw new AccountRequiredError();
  if (access === 'pending') throw new Error('Account connection is still being checked. Your saved progress is safe. Please try again.');
}
