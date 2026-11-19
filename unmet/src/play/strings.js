// Every word of the game, in English and French. Need names, country names
// and the "people who lack it" phrases come from Unmet's own i18n.js so the
// two pages always say the same thing.
import { LANGS as UNMET, countryName } from '../i18n.js';
import { needById } from '../needs.js';
import { people as fmtPeople } from '../model.js';

const nth = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`; };
const nieme = (n) => (n === 1 ? '1er' : `${n}e`);
const dollars = (line) => String(parseFloat(line || '3'));

const en = {
  tagline: 'A live guessing game on real data',
  h1: ['How well do you', 'know', 'the world?'],
  lede: 'Out of 100 people, how many have electricity? Clean water? A school? Guess, then see the truth. Play live with friends or a whole class, or solo in two minutes.',
  joinLabel: 'Join a room', codePlaceholder: 'CODE', join: 'Join', or: 'Or',
  host: 'Host a room', hostSub: 'for friends or a class',
  solo: 'Play today’s five', soloSub: (n) => `daily #${n} · 2 minutes`, soloDone: (score, max) => `today: ${score}/${max}`,
  resume: (code) => `Back to room ${code}`,
  credit: 'A Global Solutions Lab project', how: 'How to play', sound: 'Sound', gsl: 'Global Solutions Lab',
  footData: (c, n) => `${c} countries · ${n} basic needs`, footSource: 'World Bank data · CC BY 4.0', loading: 'Loading the world…',
  failed: 'The game did not load. Check your connection and reload.',
  sample: 'Sample data · these numbers are invented',
  // joining
  roomLabel: (code) => `Room ${code}`, nameH: ['What should we', 'call', 'you?'], namePlaceholder: 'Your name', nameHint: 'Shown on the big screen. Keep it friendly.',
  enter: 'I’m in', joining: 'Joining…', opening: 'Opening a room…', back: 'Back',
  hostNameH: ['Your room is', 'ready.', ''], hostPlays: 'I’m playing too',
  err: {
    'not-found': 'No room with that code. Check it and try again.', kicked: 'The host removed you from this room.', locked: 'This room is locked. Ask the host to let you in.',
    full: 'This room is full.', name: 'Please pick another name.', backend: 'Live rooms are not switched on yet. You can still play solo.', offline: 'Could not reach the room. Check your connection and try again.',
    code: 'A room code is four letters.',
  },
  // lobby
  joinAt: 'Join at', codeIs: 'Room code', scan: 'Or scan', copyLink: 'Copy link', invite: 'Invite', copied: 'Link copied', share: 'Share',
  players: 'Players', noPlayers: 'Waiting for the first player…', youAreIn: ['You’re in,', ''], waitHost: 'Waiting for the host to start. Watch the big screen.',
  start: 'Start the game', startNeed: 'Needs at least one player', startSub: (n, secs) => `${n} rounds · ${secs}s each`,
  options: 'Options', rounds: 'Rounds', timer: 'Seconds per round', region: 'Where', topics: 'Topics', allTopics: 'All twelve', auto: 'Move on automatically', lock: 'Lock the room', showQr: 'Show QR code', askEmail: 'Offer the email follow-up',
  regions: { world: 'The world', africa: 'Africa', asia: 'Asia & Pacific', americas: 'The Americas', europe: 'Europe & Central Asia', mena: 'Middle East & North Africa' },
  remove: 'Remove', rename: 'New name', you: 'you', hostTag: 'host', away: 'away', editName: 'Change name', leave: 'Leave', leaveAsk: 'Leave this room?',
  hostGone: 'The host is disconnected. Hang on…', removed: 'The host removed you from this room.', roomClosed: 'This room has closed.',
  // playing
  round: (i, n) => `Round ${i} of ${n}`, double: 'Double points', final: 'Final round',
  ask: (group, place, pred) => `Out of 100 ${group} in <em>${place}</em>, how many ${pred}?`,
  said: (n, group, pred) => `${n} out of 100 ${group} ${pred}.`,
  outOf: 'out of 100', lockIn: 'Lock it in', locked: 'Locked in', drag: 'Drag to guess', timeUp: 'Time’s up', noAnswer: 'No answer',
  inCount: (got, of) => `${got} of ${of} locked in`, waiting: 'Waiting for the others…', revealNow: 'Reveal now', sec: 's',
  // reveal
  truth: 'The truth', youGuessed: (v) => `You guessed ${v}`, off: (n) => (n === 0 ? 'spot on' : n === 1 ? '1 off' : `${n} off`), bullseye: 'Bullseye', points: (n) => `+${n}`, pts: 'pts',
  roomAvg: (v) => `Room average ${v}`, closest: 'Closest', right: 'Right', wrong: 'Not this time', gotIt: (ok, n) => `${ok} of ${n} got it right`,
  of: (n, of) => `${n} of ${of.toLocaleString('en-US')}`, source: (y) => `World Bank · ${y}`, atPace: 'At today’s pace', seeUnmet: 'See the whole picture on Unmet',
  rank: (r, n) => `${nth(r)} of ${n}`, board: 'Leaderboard', next: 'Next', nextIn: (s) => `Next in ${s}s`, pause: 'Hold', resumeGame: 'Carry on', paused: 'On hold', results: 'See the results', finishIn: (s) => `Results in ${s}s`,
  // final
  wins: (name) => [name, 'wins.'], tie: ['It’s a', 'tie.'], podium: 'Podium', awards: 'Awards',
  award: { sharp: 'Sharpest guess', optimist: 'The optimist', pessimist: 'The pessimist' },
  awardBy: { sharp: (n) => (n === 0 ? 'a bullseye' : `${n} off`), optimist: (n) => `saw the world ${n} points better than it is`, pessimist: (n) => `saw the world ${n} points worse than it is` },
  roomView: { optimist: (n) => `As a room, you pictured the world ${n} points better than it is.`, pessimist: (n) => `As a room, you pictured the world ${n} points worse than it is.`, realist: () => 'As a room, you see the world about as it is.' },
  view: { optimist: 'Optimist', pessimist: 'Pessimist', realist: 'Realist' },
  viewLine: { optimist: (n) => `You pictured the world ${n} points better than it is.`, pessimist: (n) => `You pictured the world ${n} points worse than it is.`, realist: () => 'You see the world about as it is.' },
  yourScore: 'Your score', again: 'Play again', newRoom: 'Host your own room', explore: 'Explore the real data', exploreSub: 'every country · 12 basic needs', act: 'Start a solution', actSub: 'free · Global Solutions Lab',
  shareResult: 'Share my result', shareCopied: 'Result copied. Paste it anywhere.',
  shareLive: ({ name, rank, n, score, view, by, url }) => `${name}: ${nth(rank)} of ${n} with ${score} pts.${view ? ` ${en.viewShare[view](by)}` : ''}\nHow well do you know the world? ${url}`,
  shareSolo: ({ name, day, score, max, squares, view, by, url }) => `${name} · daily #${day}\n${squares} ${score}/${max}${view ? `\n${en.viewShare[view](by)}` : ''}\n${url}`,
  viewShare: { optimist: (n) => `I picture the world ${n} points better than it is.`, pessimist: (n) => `I picture the world ${n} points worse than it is.`, realist: () => 'I see the world about as it is.' },
  streak: (n) => (n === 1 ? '1 day in a row' : `${n} days in a row`), comeBack: 'A new five tomorrow.', soloLive: 'It’s better with people.',
  emailH: 'Keep your result', emailSub: 'One email with your score and a link to pick up where you left off. Nothing else.', emailPlaceholder: 'you@example.com', emailSend: 'Send it', emailSent: 'Sent. Check your inbox.', emailBad: 'That does not look like an email address.', emailFail: 'Could not send it. Try again in a moment.',
  // how to play
  howH: ['How to', 'play.'],
  howVideo: 'The whole game in five minutes',
  watch: 'Watch how to play', watchLen: '5 min',
  howSteps: [
    ['Guess', 'Each round asks about one country and one basic need. Drag to your best guess out of 100 and lock it in.'],
    ['See the truth', 'The real figure appears with everyone’s guesses around it. You lose 3 points for every point you are off; a perfect guess is 100.'],
    ['Head-to-head', 'Some rounds put two countries side by side. Pick the one doing better.'],
    ['The last round counts double', 'Then the podium, and what your guesses say about how you picture the world.'],
  ],
  howData: 'Every figure is the latest published by the World Bank’s World Development Indicators (CC BY 4.0), the same data behind Unmet. National averages, a year or two old.',
  howMap: 'The map is Buckminster Fuller’s Dymaxion projection. The Fuller Projection Map design is a trademark of the Buckminster Fuller Institute.',
  close: 'Close',
  groups: { people: 'people', births: 'births', infants: 'infants', children: 'primary-age children', adults: 'adults' },
  q: {
    electricity: { g: 'people', p: () => 'have electricity at home', d: 'Where do more people have electricity?' },
    cooking: { g: 'people', p: () => 'cook with clean fuel, not wood or charcoal', d: 'Where do more people cook with clean fuel?' },
    water: { g: 'people', p: () => 'have basic drinking water close to home', d: 'Where do more people have basic drinking water?' },
    sanitation: { g: 'people', p: () => 'have a decent toilet they do not share', d: 'Where do more people have a decent toilet?' },
    food: { g: 'people', p: () => 'do not get enough to eat', d: 'Where do more people get enough to eat?' },
    poverty: { g: 'people', p: (line) => `live on less than $${dollars(line)} a day`, d: (line) => `Where do more people live on more than $${dollars(line)} a day?` },
    survival: { g: 'children', p: () => '', d: 'Where do more children live to see their fifth birthday?' },
    birth: { g: 'births', p: () => 'are attended by a skilled health worker', d: 'Where are more births attended by a skilled health worker?' },
    vaccines: { g: 'infants', p: () => 'get their basic DTP vaccine', d: 'Where do more infants get their basic vaccines?' },
    school: { g: 'children', p: () => 'are out of school', d: 'Where are more children in primary school?' },
    internet: { g: 'people', p: () => 'use the internet', d: 'Where do more people use the internet?' },
    account: { g: 'adults', p: () => 'have a bank or mobile-money account', d: 'Where do more adults have a bank or mobile-money account?' },
  },
};

const fr = {
  tagline: 'Un jeu de devinettes en direct, sur des données réelles',
  h1: ['Connaissez-vous', 'vraiment', 'le monde ?'],
  lede: 'Sur 100 personnes, combien ont l’électricité ? L’eau potable ? Une école ? Devinez, puis découvrez la réalité. Jouez en direct entre amis ou avec toute une classe, ou seul en deux minutes.',
  joinLabel: 'Rejoindre une salle', codePlaceholder: 'CODE', join: 'Rejoindre', or: 'Ou',
  host: 'Créer une salle', hostSub: 'entre amis ou en classe',
  solo: 'Jouer les cinq du jour', soloSub: (n) => `partie du jour n° ${n} · 2 minutes`, soloDone: (score, max) => `aujourd’hui : ${score}/${max}`,
  resume: (code) => `Retour à la salle ${code}`,
  credit: 'Un projet du Global Solutions Lab', how: 'Comment jouer', sound: 'Son', gsl: 'Global Solutions Lab',
  footData: (c, n) => `${c} pays · ${n} besoins essentiels`, footSource: 'Données Banque mondiale · CC BY 4.0', loading: 'Chargement du monde…',
  failed: 'Le jeu n’a pas pu se charger. Vérifiez votre connexion et rechargez la page.',
  sample: 'Données d’exemple · ces chiffres sont inventés',
  roomLabel: (code) => `Salle ${code}`, nameH: ['Comment vous', 'appeler', '?'], namePlaceholder: 'Votre prénom', nameHint: 'Affiché sur le grand écran. Restez aimable.',
  enter: 'C’est parti', joining: 'Connexion…', opening: 'Ouverture de la salle…', back: 'Retour',
  hostNameH: ['Votre salle est', 'prête.', ''], hostPlays: 'Je joue aussi',
  err: {
    'not-found': 'Aucune salle avec ce code. Vérifiez-le et réessayez.', kicked: 'L’animateur vous a retiré de cette salle.', locked: 'Cette salle est verrouillée. Demandez à l’animateur de vous laisser entrer.',
    full: 'Cette salle est pleine.', name: 'Choisissez un autre nom, s’il vous plaît.', backend: 'Les salles en direct ne sont pas encore activées. Vous pouvez jouer seul.', offline: 'Impossible de joindre la salle. Vérifiez votre connexion et réessayez.',
    code: 'Un code de salle compte quatre lettres.',
  },
  joinAt: 'Rejoignez sur', codeIs: 'Code de la salle', scan: 'Ou scannez', copyLink: 'Copier le lien', invite: 'Inviter', copied: 'Lien copié', share: 'Partager',
  players: 'Joueurs', noPlayers: 'En attente du premier joueur…', youAreIn: ['Bienvenue,', ''], waitHost: 'En attente du lancement. Regardez le grand écran.',
  start: 'Lancer la partie', startNeed: 'Il faut au moins un joueur', startSub: (n, secs) => `${n} manches · ${secs} s chacune`,
  options: 'Options', rounds: 'Manches', timer: 'Secondes par manche', region: 'Où', topics: 'Thèmes', allTopics: 'Les douze', auto: 'Enchaîner automatiquement', lock: 'Verrouiller la salle', showQr: 'Afficher le QR code', askEmail: 'Proposer le suivi par e-mail',
  regions: { world: 'Le monde', africa: 'Afrique', asia: 'Asie et Pacifique', americas: 'Amériques', europe: 'Europe et Asie centrale', mena: 'Moyen-Orient et Afrique du Nord' },
  remove: 'Retirer', rename: 'Nouveau nom', you: 'vous', hostTag: 'animateur', away: 'absent', editName: 'Changer de nom', leave: 'Quitter', leaveAsk: 'Quitter cette salle ?',
  hostGone: 'L’animateur est déconnecté. Un instant…', removed: 'L’animateur vous a retiré de cette salle.', roomClosed: 'Cette salle est fermée.',
  round: (i, n) => `Manche ${i} sur ${n}`, double: 'Points doublés', final: 'Dernière manche',
  ask: (group, place, pred) => `<em>${place}</em> : sur 100 ${group}, combien ${pred} ?`,
  said: (n, group, pred) => `${n} ${group} sur 100 ${pred}.`,
  outOf: 'sur 100', lockIn: 'Valider', locked: 'Validé', drag: 'Faites glisser pour deviner', timeUp: 'Temps écoulé', noAnswer: 'Pas de réponse',
  inCount: (got, of) => `${got} sur ${of} ont validé`, waiting: 'En attente des autres…', revealNow: 'Révéler', sec: ' s',
  truth: 'La réalité', youGuessed: (v) => `Votre réponse : ${v}`, off: (n) => (n === 0 ? 'pile' : n === 1 ? '1 point d’écart' : `${n} points d’écart`), bullseye: 'Dans le mille', points: (n) => `+${n}`, pts: 'pts',
  roomAvg: (v) => `Moyenne de la salle : ${v}`, closest: 'Les plus proches', right: 'Bien vu', wrong: 'Pas cette fois', gotIt: (ok, n) => `${ok} sur ${n} ont trouvé`,
  of: (n, of) => `${n.toLocaleString('fr-FR')} sur ${of.toLocaleString('fr-FR')}`, source: (y) => `Banque mondiale · ${y}`, atPace: 'Au rythme actuel', seeUnmet: 'Voir le tableau complet sur Unmet',
  rank: (r, n) => `${nieme(r)} sur ${n}`, board: 'Classement', next: 'Suite', nextIn: (s) => `Suite dans ${s} s`, pause: 'Pause', resumeGame: 'Reprendre', paused: 'En pause', results: 'Voir les résultats', finishIn: (s) => `Résultats dans ${s} s`,
  wins: (name) => [name, 'l’emporte.'], tie: ['Égalité', 'parfaite.'], podium: 'Podium', awards: 'Distinctions',
  award: { sharp: 'La réponse la plus juste', optimist: 'L’optimiste', pessimist: 'Le pessimiste' },
  awardBy: { sharp: (n) => (n === 0 ? 'dans le mille' : `${n} points d’écart`), optimist: (n) => `voit le monde ${n} points meilleur qu’il ne l’est`, pessimist: (n) => `voit le monde ${n} points pire qu’il ne l’est` },
  roomView: { optimist: (n) => `Ensemble, vous imaginez le monde ${n} points meilleur qu’il ne l’est.`, pessimist: (n) => `Ensemble, vous imaginez le monde ${n} points pire qu’il ne l’est.`, realist: () => 'Ensemble, vous voyez le monde à peu près tel qu’il est.' },
  view: { optimist: 'Optimiste', pessimist: 'Pessimiste', realist: 'Réaliste' },
  viewLine: { optimist: (n) => `Vous imaginez le monde ${n} points meilleur qu’il ne l’est.`, pessimist: (n) => `Vous imaginez le monde ${n} points pire qu’il ne l’est.`, realist: () => 'Vous voyez le monde à peu près tel qu’il est.' },
  yourScore: 'Votre score', again: 'Rejouer', newRoom: 'Créer votre propre salle', explore: 'Explorer les vraies données', exploreSub: 'tous les pays · 12 besoins essentiels', act: 'Lancer une solution', actSub: 'gratuit · Global Solutions Lab',
  shareResult: 'Partager mon résultat', shareCopied: 'Résultat copié. Collez-le où vous voulez.',
  shareLive: ({ name, rank, n, score, view, by, url }) => `${name} : ${nieme(rank)} sur ${n} avec ${score} pts.${view ? ` ${fr.viewShare[view](by)}` : ''}\nConnaissez-vous vraiment le monde ? ${url}`,
  shareSolo: ({ name, day, score, max, squares, view, by, url }) => `${name} · partie du jour n° ${day}\n${squares} ${score}/${max}${view ? `\n${fr.viewShare[view](by)}` : ''}\n${url}`,
  viewShare: { optimist: (n) => `J’imagine le monde ${n} points meilleur qu’il ne l’est.`, pessimist: (n) => `J’imagine le monde ${n} points pire qu’il ne l’est.`, realist: () => 'Je vois le monde à peu près tel qu’il est.' },
  streak: (n) => (n === 1 ? '1 jour d’affilée' : `${n} jours d’affilée`), comeBack: 'Cinq nouvelles questions demain.', soloLive: 'C’est mieux à plusieurs.',
  emailH: 'Gardez votre résultat', emailSub: 'Un seul e-mail avec votre score et un lien pour continuer. Rien d’autre.', emailPlaceholder: 'vous@exemple.com', emailSend: 'Envoyer', emailSent: 'Envoyé. Consultez votre boîte de réception.', emailBad: 'Cette adresse e-mail ne semble pas valide.', emailFail: 'Envoi impossible. Réessayez dans un instant.',
  howH: ['Comment', 'jouer.'],
  howVideo: 'Tout le jeu en cinq minutes · en anglais',
  watch: 'Voir comment jouer', watchLen: '5 min · en anglais',
  howSteps: [
    ['Devinez', 'Chaque manche porte sur un pays et un besoin essentiel. Faites glisser jusqu’à votre meilleure estimation sur 100, puis validez.'],
    ['Découvrez la réalité', 'Le vrai chiffre apparaît, entouré des réponses de tous. Vous perdez 3 points par point d’écart ; une réponse parfaite vaut 100.'],
    ['Face-à-face', 'Certaines manches opposent deux pays. Choisissez celui qui s’en sort le mieux.'],
    ['La dernière manche compte double', 'Puis le podium, et ce que vos réponses disent de votre vision du monde.'],
  ],
  howData: 'Chaque chiffre est le dernier publié par les Indicateurs du développement dans le monde de la Banque mondiale (CC BY 4.0), les mêmes données qu’Unmet. Des moyennes nationales, vieilles d’un an ou deux.',
  howMap: 'La carte est la projection Dymaxion de Buckminster Fuller. Le dessin de la carte en projection de Fuller est une marque du Buckminster Fuller Institute.',
  close: 'Fermer',
  groups: { people: 'personnes', births: 'naissances', infants: 'nourrissons', children: 'enfants en âge du primaire', adults: 'adultes' },
  q: {
    electricity: { g: 'people', p: () => 'ont l’électricité à la maison', d: 'Où y a-t-il plus de gens qui ont l’électricité ?' },
    cooking: { g: 'people', p: () => 'cuisinent avec un combustible propre, sans bois ni charbon', d: 'Où cuisine-t-on davantage avec un combustible propre ?' },
    water: { g: 'people', p: () => 'ont de l’eau potable près de chez elles', d: 'Où y a-t-il plus de gens qui ont de l’eau potable ?' },
    sanitation: { g: 'people', p: () => 'ont des toilettes convenables, non partagées', d: 'Où y a-t-il plus de gens qui ont des toilettes convenables ?' },
    food: { g: 'people', p: () => 'ne mangent pas à leur faim', d: 'Où y a-t-il plus de gens qui mangent à leur faim ?' },
    poverty: { g: 'people', p: (line) => `vivent avec moins de ${dollars(line)} $ par jour`, d: (line) => `Où y a-t-il plus de gens qui vivent avec plus de ${dollars(line)} $ par jour ?` },
    survival: { g: 'children', p: () => '', d: 'Où y a-t-il plus d’enfants qui atteignent leur cinquième anniversaire ?' },
    birth: { g: 'births', p: () => 'sont assistées par du personnel de santé qualifié', d: 'Où y a-t-il plus de naissances assistées par du personnel qualifié ?' },
    vaccines: { g: 'infants', p: () => 'reçoivent le vaccin DTC de base', d: 'Où y a-t-il plus de nourrissons vaccinés ?' },
    school: { g: 'children', p: () => 'ne vont pas à l’école', d: 'Où y a-t-il plus d’enfants à l’école primaire ?' },
    internet: { g: 'people', p: () => 'utilisent Internet', d: 'Où y a-t-il plus de gens qui utilisent Internet ?' },
    account: { g: 'adults', p: () => 'ont un compte bancaire ou de monnaie mobile', d: 'Où y a-t-il plus d’adultes qui ont un compte bancaire ou de monnaie mobile ?' },
  },
};

export const LANGS = { en, fr };
export { countryName };
export const needName = (lang, needId) => UNMET[lang].needs[needId].name;

/** The question, as HTML with the country emphasised. `names` maps a country id to its display name (already escaped). */
export function questionHtml(lang, q, names, line) {
  const t = LANGS[lang], words = t.q[q.need];
  if (q.t === 'duel') return typeof words.d === 'function' ? words.d(line) : words.d;
  return t.ask(t.groups[words.g], names[q.a], words.p(line));
}
/** "21 out of 100 people have electricity at home." */
export function saidLine(lang, q, n, line) {
  const t = LANGS[lang], words = t.q[q.need];
  return t.said(n, t.groups[words.g], words.p(line));
}
/** "86 million people live without electricity", when the need can be counted in people. */
export function peopleLine(lang, q, count, line) {
  const u = UNMET[lang], words = u.needs[q.need];
  if (!count || count < 1000 || !words.lack || needById[q.need].base !== 'population') return '';
  return `${u.peopleUnit(fmtPeople(count, lang))} ${typeof words.lack === 'function' ? words.lack(line) : words.lack}.`;
}
/** Unmet's own wording for where a need is heading: "On pace for 2041", "Going backwards"… */
export function paceLine(lang, pace) {
  const say = pace && UNMET[lang].reason[pace.r];
  return say ? say(pace) : '';
}
