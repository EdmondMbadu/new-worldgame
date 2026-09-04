export type ReportingUserEvidence = {
  hasSolutionActivity?: boolean;
};

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasGoal(user: any): boolean {
  return Boolean(String(user?.goal || '').trim());
}

function hasSolutionActivity(
  user: any,
  evidence: ReportingUserEvidence
): boolean {
  return (
    asNumber(user?.tempSolutionstarted) > 0 ||
    asNumber(user?.tempSolutionSubmitted) > 0 ||
    evidence.hasSolutionActivity === true
  );
}

function isRandomLookingNameToken(token: unknown): boolean {
  const clean = String(token || '').replace(/[^a-zA-Z]/g, '');
  if (clean.length < 14) return false;

  const upperCount = (clean.match(/[A-Z]/g) || []).length;
  const lowerCount = (clean.match(/[a-z]/g) || []).length;
  if (upperCount < 3 || lowerCount < 6) return false;

  const upperRatio = upperCount / clean.length;
  const caseTransitions = clean
    .slice(1)
    .split('')
    .reduce((count, char, index) => {
      const previous = clean[index];
      const changedCase =
        (/[A-Z]/.test(previous) && /[a-z]/.test(char)) ||
        (/[a-z]/.test(previous) && /[A-Z]/.test(char));
      return count + (changedCase ? 1 : 0);
    }, 0);

  const hasGeneratedCaseMix =
    clean.length >= 18 &&
    upperRatio > 0.18 &&
    upperRatio < 0.82 &&
    caseTransitions >= 4;
  const hasDenseMixedCase =
    upperRatio > 0.25 && upperRatio < 0.75 && caseTransitions >= 3;

  return hasGeneratedCaseMix || hasDenseMixedCase;
}

function hasSuspiciousNameFormat(user: any): boolean {
  const first = String(user?.firstName || '').trim();
  const last = String(user?.lastName || '').trim();
  const firstRandom = isRandomLookingNameToken(first);
  const lastRandom = isRandomLookingNameToken(last);
  if (firstRandom && lastRandom) return true;

  const combinedLength = `${first}${last}`.replace(/[^a-zA-Z]/g, '').length;
  return combinedLength >= 24 && (firstRandom || lastRandom);
}

function isUnconfirmedCheckoutProfile(
  user: any,
  evidence: ReportingUserEvidence
): boolean {
  const status = String(user?.status || '').trim().toLowerCase();
  if (status !== 'pendingpayment') return false;

  return (
    !String(user?.schoolId || '').trim() &&
    user?.verified !== true &&
    !hasGoal(user) &&
    !hasSolutionActivity(user, evidence)
  );
}

function isAdminUser(user: any): boolean {
  const role = String(user?.role || '').trim().toLowerCase();
  const adminFlag = String(user?.admin || '').trim().toLowerCase();
  return adminFlag === 'true' || role === 'admin' || role === 'schooladmin';
}

/**
 * Mirrors the deliberately conservative dashboard rule. Positive evidence of
 * a real person always wins; otherwise generated-looking names and abandoned
 * paid-school checkout profiles are excluded from reporting.
 */
export function isLikelyReportingBot(
  user: any,
  evidence: ReportingUserEvidence = {}
): boolean {
  if (user?.verified === true) return false;
  if (hasGoal(user)) return false;
  if (hasSolutionActivity(user, evidence)) return false;

  if (hasSuspiciousNameFormat(user)) return true;
  if (isUnconfirmedCheckoutProfile(user, evidence)) return true;
  if (isAdminUser(user)) return false;

  return false;
}
