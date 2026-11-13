// The twelve basic needs, and the public indicator that measures each one.
// Shared by the data scripts (Node) and the page (browser). No imports.
//
// kind   'access'  value is the % of people who HAVE the need met
//        'lack'    value is the % of people who LACK it (we flip it)
//        'rate'    value is deaths per 1,000 (lower is better, not a share)
// base   who the percentage is counted over. Only 'population' needs can be
//        turned into a head-count without inventing a second data set.
// goal   the level at which we call the need "met", in the indicator's own
//        unit. `why` says where that number comes from. See "How this works".

export const NEEDS = [
  { id: 'electricity', code: 'EG.ELC.ACCS.ZS', kind: 'access', base: 'population', goal: 99, why: 'universal', sdg: 7 },
  { id: 'cooking', code: 'EG.CFT.ACCS.ZS', kind: 'access', base: 'population', goal: 99, why: 'universal', sdg: 7 },
  { id: 'water', code: 'SH.H2O.BASW.ZS', kind: 'access', base: 'population', goal: 99, why: 'universal', sdg: 6 },
  { id: 'sanitation', code: 'SH.STA.BASS.ZS', kind: 'access', base: 'population', goal: 99, why: 'universal', sdg: 6 },
  { id: 'food', code: 'SN.ITK.DEFC.ZS', kind: 'lack', base: 'population', goal: 2.5, why: 'fao', sdg: 2 },
  { id: 'poverty', code: 'SI.POV.DDAY', kind: 'lack', base: 'population', goal: 3, why: 'wb', sdg: 1 },
  { id: 'survival', code: 'SH.DYN.MORT', kind: 'rate', base: 'children', goal: 25, why: 'sdg32', sdg: 3 },
  { id: 'birth', code: 'SH.STA.BRTC.ZS', kind: 'access', base: 'births', goal: 99, why: 'universal', sdg: 3 },
  { id: 'vaccines', code: 'SH.IMM.IDPT', kind: 'access', base: 'infants', goal: 90, why: 'ia2030', sdg: 3 },
  { id: 'school', code: 'SE.PRM.UNER.ZS', kind: 'lack', base: 'pupils', goal: 3, why: 'unesco', sdg: 4 },
  { id: 'internet', code: 'IT.NET.USER.ZS', kind: 'access', base: 'population', goal: 95, why: 'ours', sdg: 9 },
  { id: 'account', code: 'FX.OWN.TOTL.ZS', kind: 'access', base: 'adults', goal: 95, why: 'ours', sdg: 8 },
];

export const POPULATION_CODE = 'SP.POP.TOTL';
export const FIRST_YEAR = 1990;
/** A reading older than this many years no longer counts as "measured". */
export const STALE_AFTER = 10;
/** The pace is read from the last PACE_WINDOW years of readings. */
export const PACE_WINDOW = 10;
export const HORIZON = 2100;
export const SDG_YEAR = 2030;

export const needById = Object.fromEntries(NEEDS.map((n) => [n.id, n]));
