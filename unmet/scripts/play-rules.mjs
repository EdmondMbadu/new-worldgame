// Writes the game's security rules into database.rules.json (the "play" key),
// leaving every other rule in that file exactly as it is.
//
//   node unmet/scripts/play-rules.mjs            rewrite database.rules.json
//   node unmet/scripts/play-rules.mjs --check    exit 1 if the file is out of date
//
// The rules are generated because the same two conditions (see room.js for
// the idea) are needed at several depths of the tree:
//   hostOk    this write carries a fresh proof of the host's key
//   playerOk  this write carries a fresh proof of that player's key
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../../database.rules.json', import.meta.url));

/** The room as it is before this write. */
const WAS = "root.child('play/rooms/' + $code)";
/** The room as it will be after this write, seen from a rule `depth` levels below it. */
const WILL = (depth) => `newData${'.parent()'.repeat(depth)}`;
const hostOk = (depth) => {
  const room = WILL(depth), w = `${room}.child('pub/hw').val()`;
  return `${room}.child('pub/hw').isString() && ${WAS}.child('sec/hk').exists() && !${WAS}.child('sec/px/' + ${w}).exists() && ${room}.child('sec/px/' + ${w}).val() === ${WAS}.child('sec/hk').val()`;
};
const playerOk = (depth) => {
  const room = WILL(depth), w = "newData.child('w').val()";
  return `newData.child('w').isString() && !${WAS}.child('sec/px/' + ${w}).exists() && ${room}.child('sec/pk/' + $pid).isString() && ${room}.child('sec/px/' + ${w}).val() === ${room}.child('sec/pk/' + $pid).val()`;
};
const notKicked = `!${WAS}.child('pub/kicked/' + $pid).exists()`;
const bool = { '.validate': 'newData.isBoolean()' };
const num = (lo, hi) => ({ '.validate': `newData.isNumber() && newData.val() >= ${lo} && newData.val() <= ${hi}` });
const str = (max) => ({ '.validate': `newData.isString() && newData.val().length <= ${max}` });
const PROOF = '/^[A-Za-z0-9]{16,32}$/', PID = '/^[A-Za-z0-9]{8,24}$/';
const key = { '.validate': 'newData.isString() && newData.val().length >= 20 && newData.val().length <= 64' };
const once = `!data.exists() && newData.exists() && ${WAS}.child('sec/hk').exists()`;

export const playRules = {
  rooms: {
    $code: {
      // A room is made in one write, by whoever supplies its host key. A code is free again after a day.
      '.write': `$code.matches(/^[A-Z]{4}$/) && newData.child('pub/created').val() === now && newData.child('sec/hk').isString() && (!data.exists() || data.child('pub/created').val() < now - 86400000)`,
      '.validate': "newData.hasChildren(['pub', 'sec'])",
      pub: {
        '.read': true,
        '.validate': "newData.hasChildren(['host', 'created', 'cfg', 'state'])",
        host: { '.validate': `newData.isString() && newData.val().matches(${PID})` },
        created: { '.validate': 'newData.val() === now' },
        hw: { '.write': hostOk(2), '.validate': `newData.isString() && newData.val().matches(${PROOF})` },
        live: { '.write': hostOk(2), ...bool },
        cfg: {
          '.write': hostOk(2),
          '.validate': "newData.hasChildren(['rounds', 'secs'])",
          rounds: num(3, 12), secs: num(10, 60), max: num(2, 300),
          region: str(12), topics: str(160),
          auto: bool, hostPlays: bool, email: bool, locked: bool,
          $other: { '.validate': false },
        },
        state: {
          '.write': hostOk(2),
          '.validate': "newData.child('phase').isString() && newData.child('phase').val().matches(/^(lobby|guess|reveal|final)$/)",
        },
        players: {
          $pid: {
            // The host may change or remove anyone; a player only their own entry, never after being removed,
            // and a locked room takes no new players.
            '.write': `(${hostOk(3)}) || (${playerOk(3)} && ${notKicked} && (data.exists() || ${WAS}.child('pub/cfg/locked').val() !== true))`,
            '.validate': `newData.hasChildren(['name', 'at', 'w']) && $pid.matches(${PID})`,
            name: { '.validate': 'newData.isString() && newData.val().length > 0 && newData.val().length <= 20' },
            at: { '.validate': 'newData.isNumber() && newData.val() <= now' },
            on: bool, left: bool,
            w: { '.validate': `newData.isString() && newData.val().matches(${PROOF})` },
            $other: { '.validate': false },
          },
        },
        kicked: { $pid: { '.write': hostOk(3), ...bool } },
        guesses: {
          $key: {
            $pid: {
              // One answer per player per round, only while that round is open.
              '.write': `!data.exists() && ${playerOk(4)} && ${notKicked} && ${WAS}.child('pub/state/phase').val() === 'guess' && ${WAS}.child('pub/state/key').val() === $key && ${WAS}.child('pub/players/' + $pid).exists()`,
              '.validate': "newData.hasChildren(['v', 'at', 'w'])",
              v: { '.validate': '(newData.isNumber() && newData.val() >= 0 && newData.val() <= 100) || (newData.isString() && newData.val().matches(/^[ab]$/))' },
              at: { '.validate': 'newData.val() === now' },
              w: { '.validate': `newData.isString() && newData.val().matches(${PROOF})` },
              $other: { '.validate': false },
            },
          },
        },
        scores: { '.write': hostOk(2) },
        final: { '.write': hostOk(2) },
        $other: { '.validate': false },
      },
      // Nothing under sec is ever readable. Keys are claimed once; each proof is written once.
      sec: {
        hk: key,
        pk: { $pid: { '.write': once, '.validate': `newData.isString() && newData.val().length >= 20 && newData.val().length <= 64 && $pid.matches(${PID})` } },
        px: { $proof: { '.write': once, '.validate': `newData.isString() && newData.val().length <= 64 && $proof.matches(${PROOF})` } },
        $other: { '.validate': false },
      },
      $other: { '.validate': false },
    },
  },
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const before = JSON.stringify(json.rules.play || null);
  json.rules.play = playRules;
  if (process.argv.includes('--check')) {
    if (before !== JSON.stringify(playRules)) { console.error('database.rules.json is out of date. Run: node unmet/scripts/play-rules.mjs'); process.exit(1); }
    console.log('database.rules.json has the current game rules.');
  } else {
    writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
    console.log('Wrote the game rules into database.rules.json');
  }
}
