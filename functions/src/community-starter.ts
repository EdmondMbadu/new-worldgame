import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as mail from '@sendgrid/mail';
import { createHash, randomBytes } from 'node:crypto';
import { generateValidStarterBrief, STARTER_BRIEF_SCHEMA } from './starter-brief-generation';
import { StarterBrief, assertBriefClaims, STARTER_BRIEF_SYSTEM, normalizeBriefAnswers, parseStarterBrief, briefPageHtml, escapeBriefHtml } from './shared/starter-brief';

// Existing rules deny client access to unlisted subcollections of solutions.
// All new records live here; the phantom parent is never created or published.
const ROOT = 'solutions/_communityStarter';
const PUBLIC_BASE = 'https://us-central1-new-worldgame.cloudfunctions.net/serveStarterBrief';
const DAY = 86400000;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const invalid = (message: string) => new functions.https.HttpsError('invalid-argument', message);
export interface StarterIdentity { uid: string; email: string; verified: boolean; }
export function starterIdentity(context: functions.https.CallableContext): StarterIdentity {
  const token = context.auth?.token;
  const provider = String(token?.firebase?.sign_in_provider || '');
  return { uid: context.auth?.uid || '', email: String(token?.email || '').trim().toLowerCase(), verified: token?.email_verified === true || ['google.com','apple.com','microsoft.com','facebook.com','twitter.com'].includes(provider) };
}
export function starterOrigin(value: unknown): string {
  if (typeof value !== 'string') return 'https://newworld-game.org';
  try { const url = new URL(value); return /^(https:\/\/(?:www\.)?(?:newworld-game\.org|globalsolutionlab\.com)|http:\/\/(?:localhost|127\.0\.0\.1):\d+)$/.test(url.origin) ? url.origin : 'https://newworld-game.org'; }
  catch { return 'https://newworld-game.org'; }
}
function verified(identity: StarterIdentity) {
  if (!identity.uid) throw new functions.https.HttpsError('unauthenticated', 'Sign in to continue.');
  if (!identity.verified || !identity.email) throw new functions.https.HttpsError('failed-precondition', 'Verify your email to continue.');
}
function identifier(input: unknown): string { if (typeof input !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(input)) throw invalid('Invalid solution.'); return input; }
function tokenHash(token: unknown): string { if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new functions.https.HttpsError('not-found','This link is unavailable.'); return hash(token); }

export class CommunityStarterBackend {
  constructor(private db: admin.firestore.Firestore,
    private generateText: (notes: Record<string,string>) => Promise<unknown>,
    private sendMail: (email: string, subject: string, text: string, html: string) => Promise<unknown>) {}
  private collection(name: string) { return this.db.collection(`${ROOT}/${name}`); }
  private async owner(solutionId: unknown, identity: StarterIdentity) {
    verified(identity);
    const id = identifier(solutionId);
    const snapshot = await this.db.doc(`solutions/${id}`).get();
    const solution = snapshot.data();
    if (!solution || (solution['ownerAccountId'] || solution['authorAccountId']) !== identity.uid || !solution['starterOrigin']) throw new functions.https.HttpsError('permission-denied','You do not own this starter workspace.');
    return { id, solution, ref: snapshot.ref };
  }
  async generate(input: any, identity: StarterIdentity, ip: string) {
    let notes;
    try { notes = normalizeBriefAnswers(input?.answers); } catch(error) { throw invalid((error as Error).message); }
    if (typeof input?.sessionId !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(input.sessionId)) throw invalid('Restart the brief request and try again.');
    const principal = identity.uid ? `user:${identity.uid}` : `guest:${input.sessionId}`;
    const key = hash(`v1:${principal}:${JSON.stringify(notes)}`);
    const ref = this.collection('briefCache').doc(key);
    const now = Date.now();
    const reservation = await this.db.runTransaction(async tx => {
      const previous = await tx.get(ref);
      const data = previous.data();
      if (data?.['brief'] && data['expiresAtMs'] > now) return data['brief'];
      if (data?.['pendingUntil'] > now) throw new functions.https.HttpsError('aborted','Bucky is already working on this brief. Try again in a moment.');
      const limits = [
        { id: hash(`session:${principal}:${Math.floor(now/3600000)}`), maximum: 8 },
        { id: hash(`ip:${ip || 'unknown'}:${Math.floor(now/3600000)}`), maximum: 40 },
        { id: hash(`global:${Math.floor(now/DAY)}`), maximum: 300 },
      ];
      const snapshots = await Promise.all(limits.map(limit => tx.get(this.collection('limits').doc(limit.id))));
      if (snapshots.some((snap,i) => Number(snap.get('count') || 0) >= limits[i].maximum)) throw new functions.https.HttpsError('resource-exhausted','Bucky has reached the brief limit for now. Your notes are safe; please try later.');
      snapshots.forEach((snap,i) => tx.set(snap.ref,{ count:Number(snap.get('count')||0)+1, expiresAtMs:now+2*DAY }));
      tx.set(ref,{pendingUntil:now+30000,expiresAtMs:now+7*DAY});
      return null;
    });
    if (reservation) return {brief:parseStarterBrief(reservation),cached:true};
    let phase = 'provider';
    let shape: Record<string, unknown> = {};
    try {
      const generated = await this.generateText(notes);
      phase = 'structure';
      try {
        const data = typeof generated === 'string' ? JSON.parse(generated) : generated;
        if (data && typeof data === 'object') shape = Object.fromEntries(Object.entries(data).map(([field,value]) => [field,typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : typeof value]));
      } catch { /* Shape diagnostics never contain author text. */ }
      const brief = parseStarterBrief(generated);
      phase = 'claims';
      assertBriefClaims(brief,notes);
      await ref.set({brief,pendingUntil:0,expiresAtMs:now+7*DAY});
      return {brief,cached:false};
    } catch(error: any) {
      console.warn('Starter brief generation failed', {phase,status:error?.status || error?.code || '',shape,reason:String(error?.message || 'unknown').replace(/https?:\/\/\S+/g,'[provider]').replace(/[A-Za-z0-9_-]{30,}/g,'[redacted]').slice(0,300)});
      await ref.set({pendingUntil:0,expiresAtMs:now+60000}).catch(()=>undefined);
      throw new functions.https.HttpsError('unavailable','Bucky couldn’t finish this brief yet. Your notes and previous brief are safe. Please retry.');
    }
  }
  async manage(input: any, identity: StarterIdentity) {
    const {id} = await this.owner(input?.solutionId,identity);
    const pointer = this.collection('owners').doc(hash(`${identity.uid}:${id}`));
    if (input?.action === 'status') {
      const state = (await pointer.get()).data();
      if (!state) return {url:null};
      const shared = (await this.collection('links').doc(hash(state['token'])).get()).data();
      return {url:shared?.['active'] ? `${PUBLIC_BASE}/${state['token']}` : null};
    }
    if (input?.action === 'revoke') {
      const state = (await pointer.get()).data();
      if (state?.['token']) await this.collection('links').doc(hash(state['token'])).update({active:false});
      return {url:null};
    }
    if (input?.action !== 'publish') throw invalid('Choose a sharing action.');
    let brief: StarterBrief;
    try { brief=parseStarterBrief(input.brief); } catch { throw invalid('Review a complete brief before sharing.'); }
    const origin=starterOrigin(input.appOrigin);
    const token=await this.db.runTransaction(async tx=>{
      const state=(await tx.get(pointer)).data();
      const next=state?.['token'] || randomBytes(32).toString('hex');
      tx.set(this.collection('links').doc(hash(next)),{kind:'share',ownerUid:identity.uid,solutionId:id,brief,active:true,appOrigin:origin,expiresAtMs:Date.now()+90*DAY});
      tx.set(pointer,{ownerUid:identity.uid,solutionId:id,token:next});
      return next;
    });
    return {url:`${PUBLIC_BASE}/${token}`};
  }
  async read(token: unknown): Promise<Record<string, any> & {brief:StarterBrief}> {
    const snapshot=await this.collection('links').doc(tokenHash(token)).get();
    const value=snapshot.data();
    if (!value || !value['active'] || value['expiresAtMs']<Date.now()) throw new functions.https.HttpsError('not-found','This brief link has expired or been turned off.');
    const solution=(await this.db.doc(`solutions/${identifier(value['solutionId'])}`).get()).data();
    if (!solution || (solution['ownerAccountId']||solution['authorAccountId'])!==value['ownerUid']) throw new functions.https.HttpsError('not-found','This brief is no longer available.');
    return {...value,brief:parseStarterBrief(value['brief'])};
  }
  async publicBrief(token: unknown) { const value=await this.read(token); return {brief:value.brief,kind:value['kind']}; }
  async team(input: any, identity: StarterIdentity) {
    verified(identity);
    if (input?.action === 'join') {
      const link=await this.read(input.token);
      const ref=this.db.doc(`solutions/${identifier(link['solutionId'])}`);
      const requestRef=this.collection('requests').doc(hash(`${link['solutionId']}:${identity.uid}`));
      const direct=link['kind']==='invite' && link['email']===identity.email;
      if (link['kind']==='invite' && !direct) throw new functions.https.HttpsError('permission-denied','Sign in with the email address this invitation was sent to.');
      return this.db.runTransaction(async tx=>{
        const current=(await tx.get(ref)).data();
        if (!current || (current['ownerAccountId']||current['authorAccountId'])!==link['ownerUid']) throw new functions.https.HttpsError('not-found','This team is unavailable.');
        const emails=Array.isArray(current['teamMemberEmails'])?current['teamMemberEmails']:[];
        if (emails.includes(identity.email)) return {state:'joined',solutionId:ref.id};
        if (direct) {
          tx.update(ref,{participants:admin.firestore.FieldValue.arrayUnion({name:identity.email}),teamMemberEmails:admin.firestore.FieldValue.arrayUnion(identity.email)});
          tx.set(requestRef,{solutionId:ref.id,ownerUid:link['ownerUid'],uid:identity.uid,email:identity.email,state:'joined'});
          return {state:'joined',solutionId:ref.id};
        }
        tx.set(requestRef,{solutionId:ref.id,ownerUid:link['ownerUid'],uid:identity.uid,email:identity.email,state:'pending',createdAtMs:Date.now()});
        return {state:'pending'};
      });
    }
    const {id,ref}=await this.owner(input?.solutionId,identity);
    if (input?.action==='list') {
      const [requests,invites]=await Promise.all([
        this.collection('requests').where('solutionId','==',id).limit(100).get(),
        this.collection('invites').where('solutionId','==',id).limit(100).get(),
      ]);
      return {requests:requests.docs.filter(doc=>doc.get('state')==='pending').map(doc=>({id:doc.id,email:doc.get('email')})),invites:invites.docs.map(doc=>({email:doc.get('email'),state:doc.get('state')}))};
    }
    if (input?.action==='approve') {
      const requestRef=this.collection('requests').doc(identifier(input.requestId));
      await this.db.runTransaction(async tx=>{
        const request=(await tx.get(requestRef)).data();
        const current=(await tx.get(ref)).data();
        if (!request || request['solutionId']!==id || request['ownerUid']!==identity.uid || !current || (current['ownerAccountId']||current['authorAccountId'])!==identity.uid) throw new functions.https.HttpsError('permission-denied','This request is not yours to approve.');
        if(request['state']==='joined') return;
        if(request['state']!=='pending') throw invalid('This request is no longer pending.');
        tx.update(ref,{participants:admin.firestore.FieldValue.arrayUnion({name:request['email']}),teamMemberEmails:admin.firestore.FieldValue.arrayUnion(request['email'])});
        tx.update(requestRef,{state:'joined'});
      });
      return {state:'joined'};
    }
    if (input?.action!=='invite') throw invalid('Choose a team action.');
    let brief:StarterBrief;
    try { brief=parseStarterBrief(input.brief); } catch { throw invalid('Review your brief before inviting friends.'); }
    if (!Array.isArray(input.emails) || input.emails.length<1 || input.emails.length>5) throw invalid('Invite up to five people at a time.');
    const emails=[...new Set<string>(input.emails.map((email:unknown)=> typeof email==='string'?email.trim().toLowerCase():''))];
    if(emails.some(email=>email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw invalid('Check the email addresses.');
    const outcome=[];
    for(const email of emails) {
      if(email===identity.email) {outcome.push({email,state:'already-member'});continue;}
      const inviteRef=this.collection('invites').doc(hash(`${id}:${email}`));
      const candidate=randomBytes(32).toString('hex');
      const record: Record<string, any> & {skip:boolean}=await this.db.runTransaction(async tx=>{
        const existing=(await tx.get(inviteRef)).data();
        if(existing?.['state']==='sent' && existing['expiresAtMs']>Date.now()) return {...existing,skip:true};
        if(existing?.['sendingUntil']>Date.now()) return {...existing,skip:true,state:'sending'};
        const limit=this.collection('limits').doc(hash(`invites:${identity.uid}:${Math.floor(Date.now()/DAY)}`));
        const count=Number((await tx.get(limit)).get('count')||0);
        if(count>=30) throw new functions.https.HttpsError('resource-exhausted','You have reached today’s invitation limit.');
        const token=existing?.['token']||candidate;
        const value={email,solutionId:id,ownerUid:identity.uid,token,state:'sending',sendingUntil:Date.now()+60000,expiresAtMs:Date.now()+14*DAY};
        tx.set(limit,{count:count+1,expiresAtMs:Date.now()+2*DAY});
        tx.set(inviteRef,value);
        tx.set(this.collection('links').doc(hash(token)),{kind:'invite',email,solutionId:id,ownerUid:identity.uid,brief,active:true,appOrigin:starterOrigin(input.appOrigin),expiresAtMs:value.expiresAtMs});
        return {...value,skip:false};
      });
      if(record.skip) {outcome.push({email,state:record['state']});continue;}
      const url=`${PUBLIC_BASE}/${record['token']}`;
      try {
        await this.sendMail(email,`Help build “${brief.title}”`,`${brief.invitation}\n\nRead the brief and join the team: ${url}\n\nThis invitation is for ${email}.`,
          `<div style="max-width:600px;margin:auto;padding:30px;font:16px/1.7 Arial;color:#142d4b"><p>GLOBAL SOLUTIONS LAB</p><h1>${escapeBriefHtml(brief.title)}</h1><p>${escapeBriefHtml(brief.summary)}</p><p>${escapeBriefHtml(brief.invitation)}</p><a href="${url}" style="display:inline-block;background:#b54e32;color:white;padding:12px 22px;border-radius:6px">Read the brief & join →</a><p style="font-size:12px">A community member invited ${escapeBriefHtml(email)} to collaborate. Membership starts only when you accept.</p></div>`);
        await inviteRef.update({state:'sent',sendingUntil:0});
        outcome.push({email,state:'sent'});
      }catch {await inviteRef.update({state:'failed',sendingUntil:0});outcome.push({email,state:'failed'});}
    }
    return {invites:outcome};
  }
}
function backend() {
  return new CommunityStarterBackend(admin.firestore(),async notes=>{
    const key=functions.config()['gemini']?.key;
    if(!key) throw new Error('Brief generation is not configured.');
    const model=new GoogleGenerativeAI(key).getGenerativeModel({model:'gemini-2.5-flash',systemInstruction:STARTER_BRIEF_SYSTEM,
      generationConfig:{temperature:0.3,maxOutputTokens:2500,responseMimeType:'application/json',responseSchema:STARTER_BRIEF_SCHEMA,thinkingConfig:{thinkingBudget:0}} as any});
    return generateValidStarterBrief(notes,async(prompt,timeout)=>(await model.generateContent(prompt,{timeout})).response.text());
  },async(email,subject,text,html)=>{
    const key=functions.config()['sendgrid']?.key;
    if(!key) throw new Error('Invitations are not configured.');
    mail.setApiKey(key);
    return mail.send({to:email,from:{email:'newworld@newworld-game.org',name:'Global Solutions Lab'},subject,text,html});
  });
}
export const generateStarterBrief=functions.runWith({timeoutSeconds:45,memory:'256MB',maxInstances:8}).https.onCall((input,context)=>backend().generate(input,starterIdentity(context),context.rawRequest.ip||''));
export const manageStarterBrief=functions.https.onCall((input,context)=>backend().manage(input,starterIdentity(context)));
export const getStarterBrief=functions.https.onCall(input=>backend().publicBrief(input?.token));
export const manageStarterTeam=functions.runWith({timeoutSeconds:60,memory:'256MB'}).https.onCall((input,context)=>backend().team(input,starterIdentity(context)));
export const serveStarterBrief=functions.https.onRequest(async(request,response)=>{
  response.set({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"});
  try{
    const token=request.path.split('/').filter(Boolean).pop()||'';
    const value=await backend().read(token);
    response.status(200).type('html').send(briefPageHtml(value.brief,`${starterOrigin(value['appOrigin'])}/community-brief/${token}`));
  }catch{response.status(404).type('html').send('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brief unavailable</title><body><h1>This brief is unavailable.</h1><p>Its owner may have turned off the link, or it may have expired.</p></body></html>');}
});
