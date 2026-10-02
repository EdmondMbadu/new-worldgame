import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import openingVoices from '../../../docs/design/last-light/opening-voice-provenance.json';
import { renderToStaticMarkup } from 'react-dom/server';
import { setLanguage, t, resolveLanguage, formatText, campaignHref, LANGUAGE_KEY } from '../../../content/last-light-locale';
import frenchStories from '../../../content/drc-clinic-stories.fr.json';
import { CLINICS, storyClip } from '../src/clinic-stories';
import { ClinicStoryView } from '../src/ClinicStory';
import { InviteFriends } from '../src/CommunityPanel';
import { defaultSettings } from '../src/save';
import { shareChallenge } from '../src/sharing';
import { lastLightReturn } from '../../../functions/src/last-light-return';

beforeEach(() => {
  const data = new Map<string,string>();
  vi.stubGlobal('localStorage', { getItem: (k:string)=>data.get(k)||null, setItem:(k:string,v:string)=>data.set(k,v) });
  vi.stubGlobal('location', { origin:'https://game.example', pathname:'/games/last-light/', search:'?resume=private-checkpoint&player=private-player&lang=fr' });
  setLanguage('fr');
});
afterEach(()=>{setLanguage('en');vi.unstubAllGlobals();});

describe('complete French deliveries',()=>{
  it('uses lumière for illumination and keeps the graphics setting distinct',()=>{
    expect(t('Light')).toBe('Lumière');
    expect(t('Lights')).toBe('Lumières');
    expect(t('Light · older phones and slow graphics')).toContain('Mode allégé');
  });
  it('ships the revised opening audio paired with every current English and French script',()=>{
    expect(openingVoices.recordings).toHaveLength(10);
    for (const recording of openingVoices.recordings) {
      const clinics = recording.language === 'fr' ? frenchStories.clinics : CLINICS;
      const script = clinics.find(c=>c.id===recording.clinic)!.opening;
      expect(createHash('sha256').update(script).digest('hex')).toBe(recording.scriptSha256);
      const file = new URL(`../../../${recording.file}`, import.meta.url);
      expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(recording.audioSha256);
      setLanguage(recording.language as 'en'|'fr');
      expect(storyClip(CLINICS.find(c=>c.id===recording.clinic)!, 'opening')).toContain('?v=20261001');
    }
  });
  it.each(CLINICS.map((clinic,chapter)=>({clinic,chapter})))('translates both scenes and ships both recordings for $clinic.id',({clinic,chapter})=>{
    const translated=frenchStories.clinics[chapter];
    expect(t(clinic.opening)).toBe(translated.opening);
    expect(t(clinic.closing)).toBe(translated.closing);
    expect(t(clinic.projectNote)).toBe(translated.projectNote);
    const props={clinic,chapter,settings:defaultSettings(),onVoice(){},onContinue(){},onHome(){},onSettings(){},touch:false,ready:true,loading:'',completed:[chapter]};
    for(const scene of ['opening','closing'] as const){
      const clip=storyClip(clinic,scene);
      expect(clip).toContain(`/audio/story/fr/${clinic.id}-${scene}.mp3`);
      const file=new URL(`../public/audio/story/fr/${clinic.id}-${scene}.mp3`,import.meta.url);
      expect(statSync(file).size).toBeGreaterThan(10_000);
      expect(statSync(file).size).toBeLessThan(200_000);
      const bytes=readFileSync(file);expect(bytes[0]===0xff||bytes.toString('ascii',0,3)==='ID3').toBe(true);
      const html=renderToStaticMarkup(<ClinicStoryView {...props} scene={scene} narration={{scene,status:'playing',progress:.5}}/>);
      expect(html).toContain('Soignant fictif');expect(html).toContain(translated[scene]);
      expect(html).not.toContain(clinic[scene]);expect(html).not.toContain('Settings');
      expect(html).not.toContain('Take a moment');expect(html).toContain('LET THERE BE LIGHT');
      if(scene==='closing')expect(html).toContain('Contribuer 10 $ US');
    }
    setLanguage('en');expect(storyClip(clinic,'opening')).not.toContain('/fr/');expect(t(clinic.opening)).toBe(clinic.opening);
  });
  it('prefers an explicit choice to an invitation or browser language and preserves names',()=>{
    expect(resolveLanguage('en','fr','fr-CA')).toBe('en');expect(resolveLanguage(null,'fr','en')).toBe('fr');expect(resolveLanguage(null,null,'fr-CA')).toBe('fr');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('fr');
    expect(formatText('Your delivery, {0}.','Light')).toBe('Votre livraison, Light.');
    expect(new URL(campaignHref(),'https://game.example').searchParams.get('amount')).toBe('10');
    expect(campaignHref()).toContain('lang=fr#donate');
  });
});
describe('private progress and public invitations',()=>{
  it('shares only challenge settings and language, with properly encoded social links',()=>{
    const s=shareChallenge(3,'relaxed',1,1510), url=new URL(s.url);
    expect([...url.searchParams.keys()].sort()).toEqual(['challenge','chapter','lang','mode','revision','variant']);
    expect(url.searchParams.get('chapter')).toBe('4');expect(url.searchParams.get('lang')).toBe('fr');
    expect(s.text).toContain('1\u202f510');expect(s.text).not.toContain('I scored');
    expect(new URL(s.links.Facebook).searchParams.get('u')).toBe(s.url);
    expect(new URL(s.links.X).searchParams.get('text')).toBe(s.xText);
    for(const link of Object.values(s.links))expect(decodeURIComponent(link)).not.toContain('private-');
    const html=renderToStaticMarkup(<InviteFriends mission={3} mode="relaxed" variant={1} score={1510}/>);
    for(const platform of ['WhatsApp','Facebook','Instagram','TikTok','LinkedIn'])expect(html).toContain(platform);
    expect(html).toContain('Invitez 10 amis');expect(html).not.toContain('5–10');
  });
  it('allows French signup returns while rejecting external, malformed and duplicate destinations',()=>{
    for(const url of ['/games/last-light/?lang=fr','/games/last-light/?resume=0081bdaa-6dce-4ac5-9fac-c33976f1251b&lang=fr','/games/last-light/?challenge=1&chapter=2&mode=standard&variant=0&revision=6&lang=fr'])expect(lastLightReturn(url)).toBe(url);
    for(const bad of ['https://evil.example/','//evil.example','/games/last-light/?redirect=https://evil.example','/games/last-light/?lang=fr&lang=en','/games/last-light/?chapter=9','/games/last-light/../../login','/games/last-light/#evil'])expect(lastLightReturn(bad)).toBeNull();
  });
});
