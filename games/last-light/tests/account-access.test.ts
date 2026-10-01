import { describe, expect, it } from 'vitest';
import { clinicAccess, requireClinicAccess, AccountRequiredError } from '../src/account-access';

describe('first-delivery account policy', () => {
  it('allows repeated guest deliveries only at the first clinic', () => {
    expect(clinicAccess('guest', 0)).toBe('allowed');
    for (let mission = 1; mission < 5; mission++) {
      expect(clinicAccess('guest', mission)).toBe('account-required');
      expect(() => requireClinicAccess('guest', mission)).toThrow(AccountRequiredError);
    }
  });
  it('does not treat unresolved or failed authentication as a guest session', () => {
    for (const status of ['loading', 'unavailable'] as const) for (let mission = 0; mission < 5; mission++) {
      expect(clinicAccess(status, mission)).toBe('pending');
      expect(() => requireClinicAccess(status, mission)).toThrow('saved progress is safe');
    }
  });
  it('allows signed-in players to continue without a verification gate', () => {
    for (let mission = 0; mission < 5; mission++) expect(clinicAccess('signed-in', mission)).toBe('allowed');
  });
});
