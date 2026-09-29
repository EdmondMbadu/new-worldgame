/** Disposable fixtures for the local demo emulators; refuses every other project. */
import {createRequire} from 'node:module';
import {randomUUID,createHash} from 'node:crypto';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8186';
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9106';
const admin=require('firebase-admin');
const {validateDrive,mergeBest,boardsFor}=require('../functions/lib/last-light-core.js');
admin.initializeApp({projectId:'demo-last-light'});
const db=admin.firestore(), email='ui-player@last-light.test';
let account;
try{account=await admin.auth().getUserByEmail(email);}catch{account=await admin.auth().createUser({email,password:'Emulator-only-pass-42',emailVerified:true});}
await db.doc(`users/${account.uid}`).set({firstName:'River',lastName:'Driver'});
const names=['Amani','Claire','Patrick','Grace','Jean','Mado','Aline','Joseph','David','Nadine','Mireille','River Driver','Daniel','Luc','Sophie','Paul','Florence','Marie','André','Alex','Joy','Thomas','Nora','Hugo','Esther','Camille'];
const seconds=[235,255,270,285,300], lives=[3,5,6,8,12];
for(let i=0;i<names.length;i++){
  const uid=i===11?account.uid:`demo-player-${i}`, publicId=createHash('sha256').update(uid).digest('hex').slice(0,24), journeyId=randomUUID();
  let best={};
  for(let mission=0;mission<5;mission++){
    const integrity=100-i, remaining=seconds[mission]*.5, clean=5, encounters=5;
    const score=1000+200+Math.floor(4*integrity)+200,stars=integrity>=90?3:integrity>=70?2:1;
    const result=validateDrive({mission,mode:'standard',variant:0,revision:6,score,stars,integrity,remaining,clean,encounters,lives:lives[mission]});
    best=mergeBest(best,[result]);
    if(i===11){const id=randomUUID(),completedAt=Date.now()-(6-mission)*3600000;await db.doc(`lastLightPlayers/${uid}/drives/${id}`).set({id,result,completedAt,sortKey:`${String(9999999999999-completedAt).padStart(13,'0')}:${id}`,eligible:true,journeyId});}
  }
  await db.doc(`lastLightPlayers/${uid}`).set({name:names[i],...(i===11?{nameSource:'account',accountName:'River Driver'}:{}),best,published:best,hidden:false,rankingEnabled:true,bestJourneys:{'r6-v0-standard-all':{id:journeyId,score:Object.values(best).reduce((s,r)=>s+r.score,0),completedAt:Date.now()-3600000}}});
  const boards=boardsFor(best);
  for(const row of [...boards.chapters.map(({board,drive})=>({board,score:drive.score,chapters:1})),...boards.overall]){
    await db.doc(`lastLightBoards/${row.board}/players/${publicId}`).set({id:publicId,name:names[i],searchName:names[i].toLowerCase(),score:row.score,chapters:row.chapters,rankKey:`${String(10000-row.score).padStart(5,'0')}:${publicId}`});
  }
}
console.log('Demo leaderboard seeded: 26 fictional players; River Driver is #12.');
await admin.app().delete();
