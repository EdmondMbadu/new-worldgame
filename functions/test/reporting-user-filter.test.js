const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isLikelyReportingBot,
} = require('../lib/reporting-user-filter.js');

function pendingCheckoutUser(overrides = {}) {
  return {
    email: 'borrowed-address@example.com',
    firstName: 'Mbcl',
    lastName: 'Xiuzy',
    role: 'schoolAdmin',
    status: 'pendingPayment',
    tempSolutionstarted: '0',
    tempSolutionSubmitted: '0',
    ...overrides,
  };
}

test('excludes an unconfirmed provisional checkout even with a short name', () => {
  assert.equal(isLikelyReportingBot(pendingCheckoutUser()), true);
});

test('keeps provisional profiles with positive real-user evidence', () => {
  assert.equal(
    isLikelyReportingBot(pendingCheckoutUser({ verified: true })),
    false
  );
  assert.equal(
    isLikelyReportingBot(pendingCheckoutUser({ goal: 'Improve health care' })),
    false
  );
  assert.equal(
    isLikelyReportingBot(pendingCheckoutUser(), {
      hasSolutionActivity: true,
    }),
    false
  );
  assert.equal(
    isLikelyReportingBot(
      pendingCheckoutUser({ schoolId: 'completed-school-checkout' })
    ),
    false
  );
});

test('uses stored solution counters as activity evidence', () => {
  assert.equal(
    isLikelyReportingBot(
      pendingCheckoutUser({ tempSolutionstarted: '1' })
    ),
    false
  );
});

test('keeps a normal quiet user who is not an abandoned checkout', () => {
  assert.equal(
    isLikelyReportingBot(
      pendingCheckoutUser({
        firstName: 'Marco',
        lastName: 'Vassura',
        role: 'individual',
        status: '',
      })
    ),
    false
  );
});

test('excludes generated mixed-case names without positive evidence', () => {
  assert.equal(
    isLikelyReportingBot({
      firstName: 'VEVEHrDRvPSiVYDAzRyJk',
      lastName: 'DmzZMhRahLBqNObVLNzp',
    }),
    true
  );
});

test('verified status overrides the generated-name fallback', () => {
  assert.equal(
    isLikelyReportingBot({
      firstName: 'VEVEHrDRvPSiVYDAzRyJk',
      lastName: 'DmzZMhRahLBqNObVLNzp',
      verified: true,
    }),
    false
  );
});
