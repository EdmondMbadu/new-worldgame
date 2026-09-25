// Development-only scene/asset fixture. Vite's production entry never imports this file.
// Real rendering and audio controllers; isolated settings and no storage writes.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ClinicStoryView } from '../src/ClinicStory';
import { CLINICS, storyClip, type StoryScene } from '../src/clinic-stories';
import { defaultSettings } from '../src/save';
import { GameEngine, initPhysics } from '../src/engine';
import { MISSIONS, roadY } from '../src/missions';
import { GameWorld } from '../src/world';
import { loadSurfaces } from '../src/surfaces';
import { loadStaff } from '../src/staff';
import { loadClinic } from '../src/clinic-assets';
import { Soundtrack } from '../src/audio';
import { OPENING_DURATION } from '../src/OpeningBriefing';
import '../src/style.css';

function StoryQA() {
  const [id, setId] = useState(0), [scene, setScene] = useState<StoryScene | null>(null), [ready, setReady] = useState(false), [, tick] = useState(0), [report, setReport] = useState('Not checked');
  const canvas = useRef<HTMLCanvasElement>(null), sound = useRef<Soundtrack | null>(null);
  const settings = useRef(defaultSettings());
  const previewTime = useRef(0), previewPaused = useRef(false);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    if (!scene || !canvas.current) return;
    let cancelled = false, raf = 0, engine: GameEngine | undefined, world: GameWorld | undefined;
    setReady(false);
    void (async () => {
      await Promise.all([initPhysics(), loadSurfaces(), loadStaff(), loadClinic(id)]);
      if (cancelled) return;
      engine = new GameEngine(MISSIONS[id]);
      if (scene === 'closing') {
        const position = { x: 0, y: roadY(engine.mission, engine.mission.length) + 1, z: engine.mission.length - 2 };
        engine.body.setTranslation(position, true);
        engine.position = { ...position };
        engine.previousPosition = { ...position };
        engine.progress = position.z;
        engine.roadPosition = { x: 0, z: position.z };
      }
      engine.phase = scene === 'closing' ? 'results' : 'ready';
      engine.restoreTime = 18;
      world = new GameWorld(canvas.current!, engine, settings.current);
      setReady(true);
      let last = performance.now();
      const frame = (now: number) => {
        if (cancelled || !world || !engine) return;
        const dt = Math.min(.06, (now - last) / 1000); last = now;
        if (scene === 'opening' && id === 0 && !settings.current.reducedMotion) {
          if (!previewPaused.current && !document.hidden) previewTime.current = Math.min(OPENING_DURATION, previewTime.current + dt);
          world.openingTime = previewTime.current;
        }
        if (!previewPaused.current) world.render(dt, dt);
        if (scene === 'opening') sound.current?.updateStory(dt);
        else sound.current?.update(engine, dt);
        tick(n => n + 1);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    })();
    return () => { cancelled = true; cancelAnimationFrame(raf); world?.dispose(); engine?.dispose(); };
  }, [scene, id]);
  const show = (next: StoryScene) => {
    previewTime.current = 0; previewPaused.current = false;
    sound.current?.dispose();
    sound.current = new Soundtrack(settings.current, CLINICS[id]);
    sound.current.setStory(next);
    void sound.current.unlock();
    if (next === 'closing') sound.current.arrival();
    setScene(next);
  };
  const home = () => { sound.current?.dispose(); sound.current = null; setScene(null); };
  const validate = async () => {
    const context = new AudioContext();
    const rows: string[] = [];
    try {
      for (const clinic of CLINICS) for (const scene of ['opening', 'closing'] as const) {
        const response = await fetch(storyClip(clinic, scene));
        if (!response.ok) throw new Error(`${clinic.id}/${scene}: HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        const byteLength = bytes.byteLength;
        const decoded = await context.decodeAudioData(bytes);
        let peak = 0, sum = 0;
        const channel = decoded.getChannelData(0);
        for (const sample of channel) { peak = Math.max(peak, Math.abs(sample)); sum += sample * sample; }
        if (decoded.duration < 5 || peak < .01) throw new Error(`${clinic.id}/${scene}: silent or incomplete`);
        rows.push(`${clinic.id} ${scene}: ${decoded.duration.toFixed(2)}s, peak ${peak.toFixed(3)}, RMS ${Math.sqrt(sum / channel.length).toFixed(3)}, ${(byteLength / 1024).toFixed(0)} KiB`);
        setReport(rows.join('\n'));
      }
      setReport(`PASS — all ten MP3s fetched, decoded and contain audio.\n${rows.join('\n')}`);
    } catch (error) { setReport(`FAIL — ${error}\n${rows.join('\n')}`); }
    finally { await context.close(); }
  };
  return scene ? <main className="last-light in-game"><canvas ref={canvas} className="game-canvas" /><ClinicStoryView clinic={CLINICS[id]} chapter={id} scene={scene} settings={settings.current} narration={sound.current?.narration || {scene:null,status:'idle',progress:0}} onVoice={() => {sound.current?.toggleNarration();void sound.current?.unlock();}} onHome={home} onSettings={home} onContinue={home} onReplay={home} touch={touch} onTouch={() => setTouch(v => !v)} ready={ready} loading="Preparing preview" previewTime={previewTime.current} previewPaused={previewPaused.current} onPreviewPause={() => {previewPaused.current = !previewPaused.current; tick(n => n + 1);}} completed={Array.from({length:id+1},(_,i)=>i)} result={scene==='closing' ? {mission:id,mode:'standard',score:1752,stars:3,integrity:100,remaining:74,lives:MISSIONS[id].lives,clean:9,encounters:10} : undefined} /></main> : <main style={{padding:30}}><h1>Story verification</h1><p>Development fixture · no saves written. Preview the real scene components and decode every local recording.</p><label>Clinic <select value={id} onChange={e=>setId(Number(e.target.value))}>{CLINICS.map((c,i)=><option key={c.id} value={i}>{c.name}</option>)}</select></label><p><label><input type="checkbox" checked={settings.current.reducedMotion} onChange={e => {settings.current.reducedMotion = e.target.checked; tick(n => n + 1);}} /> Reduced motion</label> <label><input type="checkbox" checked={!settings.current.sound} onChange={e => {settings.current.sound = !e.target.checked; tick(n => n + 1);}} /> Sound off</label> <label><input type="checkbox" checked={touch} onChange={e => setTouch(e.target.checked)} /> Touch controls</label></p><p><button onClick={()=>show('opening')}>Preview opening</button> <button onClick={()=>show('closing')}>Preview ending</button> <button onClick={()=>void validate()}>Validate all voice files</button></p><pre style={{whiteSpace:'pre-wrap'}}>{report}</pre></main>;
}
createRoot(document.getElementById('root')!).render(<StoryQA />);
