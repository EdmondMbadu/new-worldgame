import { t, getLocale, getLanguage, useLanguage, LanguageSwitch, campaignHref } from './locale';
import { Leaderboard, LeaderboardDialog, PlayerControls, RealProjectCard, InviteFriends } from './CommunityPanel';
import { GameDialog } from './GameDialog';
import { SupportActions } from './SupportActions';
import { clinicAccess, AccountRequiredError } from './account-access';
import { beginRun, beginPractice, finishRun, useCommunity, syncProgress, publishPending, saveDriveCheckpoint, continueJourney, currentJourneyId, abandonDrive, saveLanguagePreference, guestJourneyConflict, adoptGuestJourney } from './community';
import { readCheckpoint, invitation, checkpointHref, mergeProgress, load, persist } from './journey';
import { readActive, type ActiveJourney } from './records';
import { routePoint } from "./routes";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  MISSIONS,
  clamp,
  pathLength,
  roadX,
  routeX,
  missionVariant,
} from "./missions";
import {
  defaultSettings,
  bestKey,
  readSave,
  recordResult,
  unlocked,
  writeSave,
  type Settings,
} from "./save";
import type { GameEngine, Input } from "./engine";
import type { GameWorld } from "./world";
import type { Controls } from "./input";
import { Soundtrack } from "./audio";
import { driveInput } from "./qa-driver";
import { branchSections } from "./road-sections";
import { beamMode, chapterLook } from "./night";
import { CLINICS } from "./clinic-stories";
import { ClinicStoryView } from "./ClinicStory";
import { OPENING_DURATION } from "./OpeningBriefing";
import { ArrivalOverlay } from "./ArrivalOverlay";
import { RESTORE_DURATION } from "./vehicle";
import { DriveCoach } from "./DriveCoach";
import { keyLabel } from "./DrivingGuide";

const base = import.meta.env.BASE_URL;
/** Phones get a smaller menu image; larger screens the full artwork. */
const KEY_ART =
  typeof innerWidth !== 'undefined' &&
  innerWidth * Math.min(devicePixelRatio || 1, 2) > 1100
    ? 'let-there-be-light.webp'
    : 'let-there-be-light-small.webp';
const time = (n: number) => {
  const seconds = Math.ceil(Math.max(0, n));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
};
function RouteMap({ engine: e }: { engine: GameEngine }) {
  const m = e.mission;
  const main = Array.from({ length: 240 }, (_, i) => {
    const z = (i * m.length) / 239;
    const point = routePoint(m, z);
    return `${50 - point.x * 0.4},${112 - (point.z / m.length) * 100}`;
  }).join(" ");
  const alternatives = branchSections(m).map(([from, to]) =>
    Array.from({ length: 35 }, (_, i) => {
      const z = from + ((to - from) * i) / 34;
      const point = routePoint(m, z, true);
      return `${50 - point.x * 0.4},${112 - (point.z / m.length) * 100}`;
    }).join(" "),
  );
  return (
    <svg
      className="route-map"
      viewBox="0 0 105 130"
      aria-label={t("Route to the clinic")}
    >
      <polyline points={main} className="route-line" />
      {alternatives.map((points, i) => (
        <polyline key={i} points={points} className="route-alt" />
      ))}
      <circle cx="50" cy="12" r="4" className="map-clinic" />
      <path d="M47 12h6m-3-3v6" stroke="#153e36" strokeWidth="1.5" />
      <circle
        cx={50 - e.position.x * 0.4}
        cy={112 - (e.position.z / m.length) * 100}
        r="4"
        className="map-truck"
      />
    </svg>
  );
}
function TouchControls({
  controls,
  engine,
}: {
  controls: Controls | null;
  engine: GameEngine | null;
}) {
  const steerPointer = useRef<number | null>(null);
  const update = (e: ReactPointerEvent) => {
    if (!controls) return;
    const r = e.currentTarget.getBoundingClientRect();
    controls.touch.steer = clamp(
      ((e.clientX - r.left) / r.width - 0.5) * 2.6,
      -1,
      1,
    );
  };
  const button = (key: "throttle" | "brake" | "action", label: string) => (
    <button
      className={`pedal ${key}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        if (controls) {
          if (key === "action") controls.touch.action = true;
          else controls.touch[key] = 1;
        }
      }}
      onPointerUp={() => {
        if (controls) {
          if (key === "action") controls.touch.action = false;
          else controls.touch[key] = 0;
        }
      }}
      onPointerCancel={() => {
        if (controls) {
          if (key === "action") controls.touch.action = false;
          else controls.touch[key] = 0;
        }
      }}
      onLostPointerCapture={() => {
        if (controls) {
          if (key === "action") controls.touch.action = false;
          else controls.touch[key] = 0;
        }
      }}
      aria-label={t(label)}
    >
      {t(label)}
    </button>
  );
  return (
    <div className="touch-controls">
      <div
        className="steering-pad"
        role="slider"
        aria-label={t("Steering")}
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={controls?.touch.steer || 0}
        tabIndex={0}
        onPointerDown={(e) => {
          steerPointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e);
        }}
        onPointerMove={(e) => {
          if (steerPointer.current === e.pointerId) update(e);
        }}
        onPointerUp={() => {
          steerPointer.current = null;
          if (controls) controls.touch.steer = 0;
        }}
        onPointerCancel={() => {
          steerPointer.current = null;
          if (controls) controls.touch.steer = 0;
        }}
        onLostPointerCapture={() => {
          steerPointer.current = null;
          if (controls) controls.touch.steer = 0;
        }}
      >
        <span>←</span>
        <span className="steering-label">{t("STEER")}</span>
        <span>→</span>
      </div>
      <div className="pedals">
        {engine &&
          (engine.canDeliver || engine.needsRecovery) &&
          button("action", engine.canDeliver ? "DELIVER" : "RECOVER")}
        {button("brake", "↓ BRAKE")}
        {button("throttle", "↑ DRIVE")}
      </div>
    </div>
  );
}
function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}) {
  const [binding, setBinding] = useState<string | null>(null);
  useEffect(() => {
    if (!binding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code === "Escape") {
        setBinding(null);
        return;
      }
      if (!/^(Key[A-Z]|Digit[0-9])$/.test(e.code)) return;
      const other = Object.entries(settings.keys).find(
        ([k, v]) => k !== binding && v === e.code,
      )?.[0];
      const keys = { ...settings.keys, [binding]: e.code };
      if (other) keys[other] = settings.keys[binding];
      onChange({ ...settings, keys });
      setBinding(null);
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [binding, settings, onChange]);
  return (
    <div className="modal-backdrop">
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("Journey settings")}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
          if (event.key === "Tab") {
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
              ),
            );
            const first = items[0],
              last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="panel-heading">
          <div>
            <span className="eyebrow">{t("MAKE YOURSELF AT HOME")}</span>
            <h2>{t("Journey settings")}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t("Close settings")}
            autoFocus
          >
            ×
          </button>
        </div>
        <LanguageSwitch onChange={language => void saveLanguagePreference(language)} />
        <label className="setting-row">{t(" Difficulty ")}<select
            value={settings.mode}
            onChange={(e) =>
              onChange({
                ...settings,
                mode: e.target.value as Settings["mode"],
              })
            }
          >
            <option value="standard">{t("Standard")}</option>
            <option value="relaxed">{t("Relaxed · more time")}</option>
          </select>
        </label>
        <p className="setting-note">{t(" Difficulty changes apply to your next drive. Relaxed adds 35% more time and softens cargo damage. ")}</p>
        <label className="setting-row">{t(" Graphics ")}<select
            value={settings.quality}
            onChange={(e) =>
              onChange({
                ...settings,
                quality: e.target.value as Settings["quality"],
              })
            }
          >
            <option value="auto">{t("Auto · adapts to this device")}</option>
            <option value="high">{t("High")}</option>
            <option value="medium">{t("Balanced")}</option>
            <option value="low">{t("Light · older phones and slow graphics")}</option>
          </select>
        </label>
        <p className="setting-note">{t(" Graphics changes apply to the next drive. Auto starts from what this device can do and lowers resolution, then detail, if the drive stutters. ")}</p>
        {(
          [
            ["sound", "Sound & music"],
            ["voice", "Story voice · opening & ending"],
            ["subtitles", "Story transcript"],
            ["roadSounds", "Road & vehicle sounds"],
            ["reducedMotion", "Reduced camera motion"],
            ["singlePress", "One-press delivery"],
            ["enhancedVisibility", "Enhanced night visibility"],
            ["reducedFlashes", "Reduce lightning flashes"],
          ] as const
        ).map(([key, label]) => (
          <label className="setting-row" key={key}>
            {t(label)}
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={(e) =>
                onChange({ ...settings, [key]: e.target.checked })
              }
            />
          </label>
        ))}
        <div className="setting-leaderboard">
          <span className="setting-label">{t("Public leaderboard")}</span>
          <PlayerControls />
        </div>
        <label className="setting-row">{t(" Night brightness ")}<input
            type="range"
            aria-label={t("Night brightness")}
            min="0.8"
            max="1.4"
            step="0.05"
            value={settings.brightness}
            onChange={(e) =>
              onChange({ ...settings, brightness: Number(e.target.value) })
            }
          />
        </label>
        <label className="setting-row">{t(" Volume ")}<input
            aria-label={t("Volume")}
            type="range"
            min="0"
            max="1"
            step=".05"
            value={settings.volume}
            onChange={(e) =>
              onChange({ ...settings, volume: Number(e.target.value) })
            }
          />
        </label>
        <div className="bindings">
          {Object.entries(settings.keys).map(([key, value]) => (
            <button key={key} onClick={() => setBinding(key)}>
              {t(key)}
              <kbd>
                {t(binding === key
                  ? "Press a key…"
                  : value.replace("Key", "").replace("Digit", ""))}
              </kbd>
            </button>
          ))}
        </div>
        <p className="setting-note">{t(" Arrow keys: hold ↑ to drive, ← → to steer, ↓ to slow or stop. Keep holding ↓ after stopping to reverse. The letter keys above also work. Controller: steer with the left stick, triggers to drive/brake, A / × to deliver. Recover a stuck truck with the contextual action or the on-screen button. You can always pause (Escape / controller Menu) and choose Recover truck during a drive. Recovery returns you to the last safe checkpoint and uses 8 seconds. ")}</p>
        <button
          className="secondary"
          onClick={() => onChange(defaultSettings())}
        >{t(" Restore default settings ")}</button>
      </section>
    </div>
  );
}

function RestartJourneyDialog({ onKeep, onRestart }: { onKeep: () => void; onRestart: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; dialog.current?.showModal(); return () => previous?.focus?.(); }, []);
  return <dialog ref={dialog} className="restart-dialog" role="alertdialog" aria-labelledby="restart-title" aria-describedby="restart-description" onCancel={e => { e.preventDefault(); onKeep(); }}>
    <h2 id="restart-title">{t("Start a new drive?")}</h2><p id="restart-description">{t("This replaces your unfinished journey. Your past drives, best scores and unlocked clinics stay saved.")}</p>
    <button className="primary" autoFocus onClick={onKeep}>{t("Keep my journey")}</button><button className="secondary" onClick={onRestart}>{t("Start again")}</button>
  </dialog>;
}

export default function App() {
  const language = useLanguage();
  useEffect(() => { document.documentElement.lang = language; sound.current?.changeLanguage(); }, [language]);
  const [checkpoint] = useState(() => readCheckpoint());
  const [challenge] = useState(() => invitation());
  const restore = useRef(checkpoint);
  const restoreDrive = useRef<ActiveJourney | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [restartChoice, setRestartChoice] = useState<{ id: number; journeyId?: string } | null>(null);
  const [sharedBoard, setSharedBoard] = useState(() => new URLSearchParams(location.search).get('leaderboard') === '1');
  const community = useCommunity();
  const [handoffError, setHandoffError] = useState(() => new URLSearchParams(location.search).has('resume') && !checkpoint ? 'This return point is not available in this browser. Open the original game tab, or choose a chapter here. Signed-in progress will load when connected.' : '');
  const connectedOwner = useRef<string | null | undefined>(undefined);
  const claimedCheckpoint = useRef(false);
  const checkpointOpened = useRef(false);
  const [accountGate, setAccountGate] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [verificationDelayed] = useState(() => { try { return sessionStorage.getItem('last-light.verification-notice') === 'pending'; } catch { return false; } });
  const [journeyChoiceDismissed, setJourneyChoiceDismissed] = useState('');
  const synced = useRef('');
  const [save, setSave] = useState(() => {
    const initial = readSave();
    if (checkpoint) initial.settings = { ...checkpoint.save.settings };
    initial.settings.mode = checkpoint?.mode || challenge?.mode || initial.settings.mode;
    return initial;
  }),
    [selected, setSelected] = useState(checkpoint?.mission ?? challenge?.mission ?? 0),
    [variant, setVariant] = useState(checkpoint?.variant ?? challenge?.variant ?? 0),
    [inGame, setInGame] = useState(false),
    [opening, setOpening] = useState(false),
    [previewPaused, setPreviewPaused] = useState(false),
    [run, setRun] = useState(0),
    [ready, setReady] = useState(false),
    [loading, setLoading] = useState("Preparing the road"),
    [error, setError] = useState(""),
    [showSettings, setShowSettings] = useState(false),
    [touch, setTouch] = useState(() => matchMedia("(pointer:coarse)").matches),
    [storageOk, setStorageOk] = useState(true),
    [tick, setTick] = useState(0),
    [autopilot, setAutopilot] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    engine = useRef<GameEngine | null>(null),
    world = useRef<GameWorld | null>(null),
    controls = useRef<Controls | null>(null),
    sound = useRef<Soundtrack | null>(null),
    openingRef = useRef(false),
    previewPausedRef = useRef(false),
    closingPlayed = useRef(false),
    arrivalMusic = useRef(false),
    settingsOpenRef = useRef(false),
    settingsRef = useRef(save.settings),
    saveRef = useRef(save),
    pilotRef = useRef(false);
  const mission = MISSIONS[selected];
  const clinic = CLINICS[selected];
  settingsOpenRef.current = showSettings;
  previewPausedRef.current = previewPaused;
  const e = engine.current;
  const savedJourney = readActive(community.player?.uid || null);
  const canContinue = savedJourney && ['driving','between'].includes(savedJourney.status);
  const guestConflict = guestJourneyConflict();
  const conflictKey = guestConflict ? `${community.player?.uid}:${guestConflict.journeyId}` : '';
  const dismissedConflict = journeyChoiceDismissed === conflictKey || load<string>(`last-light.journey-choice.${community.player?.uid}`, '') === conflictKey;
  const dismissConflict = () => { persist(`last-light.journey-choice.${community.player?.uid}`, conflictKey); setJourneyChoiceDismissed(conflictKey); };
  useEffect(() => { const changed = () => setTick(t => t+1); window.addEventListener('last-light:records', changed); return () => window.removeEventListener('last-light:records', changed); }, []);
  const qa =
    import.meta.env.DEV &&
    new URLSearchParams(location.search).get("qa") === "1";
  useEffect(() => {
    saveRef.current = save;
    settingsRef.current = save.settings;
    if (controls.current) controls.current.settings = save.settings;
    if (world.current) world.current.settings = save.settings;
    if (sound.current) {
      sound.current.settings = save.settings;
      if (!save.settings.sound) sound.current.silence();
    }
    setStorageOk(writeSave(save));
  }, [save]);
  useEffect(() => {
    if (community.status === 'loading' || community.status === 'unavailable') return;
    const uid = community.player?.uid || null;
    if (connectedOwner.current !== uid) {
      if (connectedOwner.current !== undefined && connectedOwner.current !== uid && engine.current) { engine.current.pause(); setInGame(false); restoreDrive.current = null; }
      connectedOwner.current = uid;
      checkpointOpened.current = false;
      synced.current = '';
      setSave(previous => ({...readSave(uid || undefined), settings:previous.settings}));
    }
    if (checkpoint && !claimedCheckpoint.current) {
      if (checkpoint.owner && checkpoint.owner !== uid) {
        if (uid) { restore.current = null; setInGame(false); setHandoffError('This saved chapter belongs to another account. Its scores have not been copied.'); }
      } else if (uid) {
        if (!checkpointOpened.current) { checkpointOpened.current = true; setInGame(true); }
        const claimedBy = load<string | null>('last-light.guest-claimed', null);
        if (checkpoint.owner === uid || !claimedBy || claimedBy === uid) {
          persist('last-light.guest-claimed', uid);
          setSave(previous => mergeProgress(previous, Object.values(checkpoint.save.story.best)));
        }
        claimedCheckpoint.current = true;
        void publishPending();
      } else {
        if (!checkpointOpened.current) {
          checkpointOpened.current = true;
          if (clinicAccess(community.status, checkpoint.mission) === 'allowed') setInGame(true);
          else setAccountGate(true);
        }
        setSave(previous => mergeProgress(previous, Object.values(checkpoint.save.story.best)));
      }
    }
    if (community.player) setSave(previous => mergeProgress(previous,Object.values(community.player!.best)));
  }, [community.status, community.player?.uid, community.player?.best, checkpoint]);
  useEffect(() => {
    if (!community.player || save.owner !== community.player.uid) return;
    const signature = JSON.stringify(save.story.best);
    if (signature === synced.current) return;
    const timer = setTimeout(() => { synced.current = signature; void syncProgress(Object.values(save.story.best)).catch(() => { synced.current = ''; }); }, 800);
    return () => clearTimeout(timer);
  }, [save.story.best, save.owner, community.player?.uid]);
  useEffect(() => {
    const retry = () => { void publishPending(); synced.current = ''; setSave(s => ({...s,story:{...s.story,best:{...s.story.best}}})); };
    window.addEventListener('online',retry);
    return () => window.removeEventListener('online',retry);
  }, []);
  useEffect(() => {
    const denied = () => { engine.current?.pause(); sound.current?.silence(); setInGame(false); setAccountGate(true); };
    window.addEventListener('last-light:account-required', denied);
    return () => window.removeEventListener('last-light:account-required', denied);
  }, []);
  // While the menu is open, fetch what the first drive needs, so pressing
  // Begin on a slow connection does not start from zero. Data saver skips it.
  useEffect(() => {
    if (inGame) return;
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData;
    if (saver) return;
    const timer = setTimeout(() => {
      void import("./engine").then((m) => m.initPhysics()).catch(() => {});
      void import("./world").catch(() => {});
      void import("./surfaces").then((m) => m.loadSurfaces()).catch(() => {});
      void import("./staff").then((m) => m.loadStaff()).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [inGame]);
  const checkpointOf = (instance: GameEngine | null) => {
    try { return instance?.checkpoint() || null; }
    catch {
      setStorageOk(false);
      setHandoffError('This checkpoint could not be saved. Keep this tab open; completed deliveries are still recorded.');
      return null;
    }
  };
  const pause = () => {
    const x = engine.current;
    if (!x) return;
    if (x.phase === "paused") {
      controls.current?.clear();
      x.resume();
      void sound.current?.unlock();
    } else {
      x.pause();
      controls.current?.clear();
      sound.current?.silence();
      const snapshot = checkpointOf(x); if (snapshot) setStorageOk(saveDriveCheckpoint(snapshot, true));
    }
    setTick((t) => t + 1);
  };
  const recover = () => {
    engine.current?.recover();
    controls.current?.clear();
    void sound.current?.unlock();
    canvas.current?.focus({ preventScroll: true });
    setTick((t) => t + 1);
  };
  useEffect(() => {
    if (!inGame || !canvas.current) return;
    let cancelled = false,
      raf = 0,
      last = 0,
      hudTime = 0,
      committed = false, failedCommitted = false, checkpointAt = 0;
    setReady(false);
    setError("");
    setLoading("Preparing the road");
    const load = async () => {
      try {
        const [
          { GameEngine, initPhysics },
          { GameWorld },
          { Controls },
          { loadSurfaces },
          { loadStaff },
          { loadClinic },
        ] = await Promise.all([
          import("./engine"),
          import("./world"),
          import("./input"),
          import("./surfaces"),
          import("./staff"),
          import("./clinic-assets"),
        ]);
        if (cancelled) return;
        setLoading("Checking the truck");
        await Promise.all([
          initPhysics(),
          loadSurfaces(),
          loadStaff(),
          loadClinic(selected),
        ]);
        if (cancelled) return;
        const instance = new GameEngine(
          missionVariant(MISSIONS[selected], variant),
          settingsRef.current.mode,
        );
        if (restoreDrive.current?.snapshot) {
          instance.restoreDrive(restoreDrive.current.snapshot);
          if (!sound.current) sound.current = new Soundtrack(settingsRef.current, CLINICS[selected]);
          restoreDrive.current = null;
        } else if (restore.current) {
          const saved = restore.current;
          if (!sound.current) sound.current = new Soundtrack(settingsRef.current,CLINICS[selected]);
          if (saved.result) {
            const point = routePoint(instance.mission,instance.mission.length);
            instance.body.setTranslation({...point,y:point.y+1.05},true);
            instance.position = {...point,y:point.y+1.05};
            instance.previousPosition = {...point,y:point.y+1.05};
            instance.roadPosition = {x:0,z:instance.mission.length};
            instance.progress = instance.mission.length;
            instance.distance = 0;
            instance.time = saved.result.remaining;
            instance.integrity = saved.result.integrity;
            instance.result = saved.result;
            instance.restoreTime = RESTORE_DURATION;
            instance.phase = 'results';
          } else { instance.phase = 'failed'; instance.failure = saved.failure || 'Try this delivery again.';
            instance.safeZ = Number.isFinite(saved.safeZ) ? Math.max(8,Math.min(instance.mission.length,saved.safeZ!)) : 8; instance.safeAlt = saved.safeAlt === true; failedCommitted = true; }
          committed = true;
        }
        engine.current = instance;
        setLoading("Bringing the valley to life");
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        if (cancelled) {
          instance.dispose();
          engine.current = null;
          return;
        }
        const view = new GameWorld(
          canvas.current!,
          instance,
          settingsRef.current,
        );
        world.current = view;
        setLoading("Lighting the road");
        await view.prepare();
        if (instance.phase === 'paused') view.render(0, 0);
        if (cancelled) return;
        const input = new Controls(settingsRef.current, (force = false) => {
          if (settingsOpenRef.current || openingRef.current || ['restoring', 'results', 'failed'].includes(instance.phase)) {
            input.clear();
            return;
          }
          if (instance.phase === "paused" && !force) {
            instance.resume();
            void sound.current?.unlock();
          } else {
            instance.pause(force ? "controller-disconnected" : "manual");
            sound.current?.silence();
          }
          input.clear();
        });
        controls.current = input;
        input.enabled = !openingRef.current;
        setReady(true);
        last = performance.now();
        let observedResume = instance.resumeRevision;
        const frame = (now: number) => {
          if (cancelled) return;
          const resumed = observedResume !== instance.resumeRevision;
          observedResume = instance.resumeRevision;
          const dt = resumed ? 0 : (now - last) / 1000;
          last = now;
          input.enabled = !openingRef.current && !settingsOpenRef.current && ['ready', 'driving', 'paused'].includes(instance.phase);
          let state = input.sample();
          if (qa && pilotRef.current) state = driveInput(instance, false, true);
          const stepStart = performance.now();
          if (!openingRef.current) instance.advance(dt, state, settingsRef.current.singlePress);
          const physicsMs = performance.now() - stepStart;
          if (!openingRef.current && now - checkpointAt > 5000) {
            checkpointAt = now;
            const snapshot = checkpointOf(instance);
            if (snapshot) setStorageOk(saveDriveCheckpoint(snapshot));
          }
          if (instance.result && !committed) {
            committed = true;
            const owner = finishRun(instance.result!);
            const next = recordResult(owner === (saveRef.current.owner || null) ? saveRef.current : readSave(owner || undefined),instance.result!);
            writeSave(next);
            setSave(s => owner === (s.owner || null) ? recordResult(s,instance.result!) : s);
            if (!instance.result!.practice) {
              const href = checkpointHref({mission:selected,variant,mode:instance?.mode || save.settings.mode,result:instance.result!,owner:owner || null,save:next});
              if(href) history.replaceState(null,'',href + (qa ? '&qa=1' : ''));
            }
          }
          if (instance.phase === 'failed' && !failedCommitted) {
            failedCommitted = true;
            abandonDrive();
            const href = checkpointHref({mission:selected,variant,mode:instance?.mode || save.settings.mode,failure:instance.failure,safeZ:instance.safeZ,safeAlt:instance.safeAlt,owner:saveRef.current.owner||null,save:saveRef.current});
            if(href) history.replaceState(null,'',href + (qa ? '&qa=1' : ''));
          }
          const preview = openingRef.current && !settingsRef.current.reducedMotion;
          const visible = document.visibilityState !== 'hidden' && document.hasFocus();
          if (preview && visible && !settingsOpenRef.current && !previewPausedRef.current) {
            view.openingTime = Math.min(OPENING_DURATION, (view.openingTime || 0) + Math.min(dt, .06));
            view.render(Math.min(dt, .06), dt);
          } else if (!openingRef.current && instance.phase !== "paused" && visible) {
            const renderStart = performance.now();
            view.render(Math.min(dt, 0.06), dt);
            view.recordFrame(dt, physicsMs, performance.now() - renderStart);
          }
          hudTime += dt;
          if (hudTime > 0.08) {
            setTick((t) => t + 1);
            hudTime = 0;
          }
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "The 3D scene could not start.",
          );
          setLoading("");
        }
      }
    };
    void load();
    const interrupt = (event?: Event) => {
      if (!openingRef.current) engine.current?.pause(event?.type || "visibility");
      const snapshot = checkpointOf(engine.current); if (snapshot) setStorageOk(saveDriveCheckpoint(snapshot, true));
      controls.current?.clear();
      sound.current?.silence();
      setTick((t) => t + 1);
    };
    const hidden = () => {
      if (document.hidden) interrupt();
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      interrupt(event);
      setError(
        "The graphics connection was interrupted. Restart this drive to restore the scene. Your completed clinics are saved.",
      );
    };
    window.addEventListener("blur", interrupt);
    window.addEventListener("pagehide", interrupt);
    window.addEventListener("pageshow", interrupt);
    document.addEventListener("visibilitychange", hidden);
    const node = canvas.current;
    node.addEventListener("webglcontextlost", contextLost);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      controls.current?.dispose();
      controls.current = null;
      world.current?.dispose();
      world.current = null;
      engine.current?.dispose();
      engine.current = null;
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("pagehide", interrupt);
      window.removeEventListener("pageshow", interrupt);
      document.removeEventListener("visibilitychange", hidden);
      node.removeEventListener("webglcontextlost", contextLost);
    };
  }, [inGame, selected, run]);
  // Story audio starts while the scene loads, and remains owned by this run.
  useEffect(() => {
    if (!inGame) return;
    let raf = 0, last = performance.now(), hud = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.06, Math.max(0, (now - last) / 1000));
      last = now;
      const audio = sound.current, instance = engine.current;
      if (audio) {
        if (settingsOpenRef.current || document.hidden || !document.hasFocus()) audio.silence();
        else if (openingRef.current) { audio.setStory('opening'); audio.updateStory(dt); }
        else if (instance) {
          if (instance.phase === 'results') {
            audio.setStory('closing', !closingPlayed.current);
            closingPlayed.current = true;
          } else audio.setStory(null);
          if ((instance.phase === 'restoring' || instance.phase === 'results') && !arrivalMusic.current) {
            audio.arrival();
            arrivalMusic.current = true;
          }
          audio.update(instance, dt);
        }
      }
      hud += dt;
      if (hud > .12) { setTick(t => t + 1); hud = 0; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [inGame, run]);
  useEffect(() => () => sound.current?.dispose(), []);
  const skipArrival = useCallback(() => {
    engine.current?.skip();
    setTick((t) => t + 1);
  }, []);
  const guardClinic = (id: number) => {
    const access = clinicAccess(community.status, id);
    if (access === 'account-required') { setAccountGate(true); return false; }
    if (access === 'pending') { setHandoffError('Account connection is still being checked. Your saved progress is safe. Please try again.'); return false; }
    return true;
  };
  const start = (id = selected, journeyId?: string, confirmed = false) => {
    if (!guardClinic(id)) return;
    const unfinished = readActive(community.player?.uid || null);
    if (!confirmed && !journeyId && unfinished && ['driving','between'].includes(unfinished.status)) {
      engine.current?.pause(); setRestartChoice({ id }); return;
    }
    restoreDrive.current = null;
    restore.current = null;
    setHandoffError('');
    history.replaceState(null,'',location.pathname + (qa ? '?qa=1' : ''));
    try { beginRun(id,settingsRef.current.mode,variant,journeyId); }
    catch (err) { setHandoffError(err instanceof Error ? err.message : 'Unable to start this delivery.'); return; }
    if (sound.current) sound.current.beginChapter(CLINICS[id]);
    else sound.current = new Soundtrack(settingsRef.current, CLINICS[id]);
    openingRef.current = true;
    closingPlayed.current = false;
    arrivalMusic.current = false;
    controls.current?.clear();
    if (controls.current) controls.current.enabled = false;
    setOpening(true);
    setPreviewPaused(false);
    setReady(false);
    setLoading('Preparing the road');
    void sound.current.unlock();
    setSelected(id);
    setInGame(true);
    setRun((r) => r + 1);
    setShowSettings(false);
    pilotRef.current = false;
    setAutopilot(false);
  };
  const resumeSaved = async () => {
    if (continuing) return;
    const local = readActive(community.player?.uid || null);
    if (local && !guardClinic(local.mission)) return;
    setContinuing(true); setHandoffError('');
    // Let the restoring overlay paint before loading the saved journey.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const saved = await continueJourney();
      settingsRef.current = { ...settingsRef.current, mode: saved.mode };
      setSave(s => ({ ...s, settings: settingsRef.current }));
      setSelected(saved.mission); setVariant(saved.variant);
      if (saved.status === 'between') {
        // State setters settle before starting the next road, which may use a
        // different variant from the chapter-map selection.
        nextLeg.current = saved;
      } else {
        restore.current = null; restoreDrive.current = saved;
        openingRef.current = false; setOpening(false); setReady(false); setInGame(true); setShowSettings(false); setRun(r => r+1);
        history.replaceState(null,'',location.pathname + (qa ? '?qa=1' : ''));
      }
    } catch (err) { if (err instanceof AccountRequiredError) setAccountGate(true); else setHandoffError(err instanceof Error ? err.message : 'Unable to restore this journey. Your scores are safe.'); }
    finally { setContinuing(false); }
  };
  const nextLeg = useRef<ActiveJourney | null>(null);
  useEffect(() => {
    if (nextLeg.current && selected === nextLeg.current.mission && variant === nextLeg.current.variant) {
      const next = nextLeg.current; nextLeg.current = null; start(next.mission, next.journeyId, true);
    }
  }, [selected, variant, continuing]);
  const home = () => {
    const snapshot = checkpointOf(engine.current); if (snapshot) setStorageOk(saveDriveCheckpoint(snapshot, true));
    restore.current = null;
    history.replaceState(null,'',location.pathname + (qa ? '?qa=1' : ''));
    sound.current?.dispose();
    sound.current = null;
    openingRef.current = false;
    setOpening(false);
    setInGame(false);
    setShowSettings(false);
    pilotRef.current = false;
    setAutopilot(false);
  };
  const settings = () => {
    if (!openingRef.current && engine.current?.phase !== "paused") engine.current?.pause();
    controls.current?.clear();
    sound.current?.silence();
    setShowSettings(true);
  };
  const authHandoff = (page:'login'|'signup'|'verify-email', reauthenticate = false) => {
    const instance = engine.current;
    const snapshot = checkpointOf(instance);
    if (snapshot && !saveDriveCheckpoint(snapshot, true)) {
      setHandoffError('Your browser cannot save a return point. Keep this game open and continue as a guest; enable browser storage before signing in.');
      return;
    }
    // Result/failure handoffs restore the exact scene. An unfinished drive is
    // already stored as an active journey and resumes from the chapter map.
    const sceneHandoff = inGame && (instance?.result || instance?.phase === 'failed');
    const href = !sceneHandoff ? `/games/last-light/?${new URLSearchParams({ ...(!inGame ? Object.fromEntries(new URLSearchParams(location.search)) : {}), lang: getLanguage() })}` : checkpointHref({mission:selected,variant,mode:instance?.mode || save.settings.mode,
      result:instance?.result || undefined, failure:instance?.phase === 'failed' ? instance.failure : undefined,
      safeZ:instance?.safeZ,safeAlt:instance?.safeAlt,owner:saveRef.current.owner || null,save:saveRef.current});
    if (!href || !writeSave(saveRef.current)) {
      setHandoffError('Your browser cannot save a return point. Keep this game open and continue as a guest; enable browser storage before signing in.');
      return;
    }
    sound.current?.silence();
    try { sessionStorage.setItem('redirectTo',href); } catch { /* The URL carries the same destination. */ }
    const target = `/${page}?lang=${getLanguage()}&redirectTo=${encodeURIComponent(href)}${reauthenticate ? '&reauth=1' : ''}`;
    if (window.top && window.top !== window) window.top.location.assign(target);
    else window.location.assign(target);
  };
  const returnHref = "/games";
  const result = e?.result;
  const beginDrive = () => {
    if (!ready || !engine.current || error) return;
    world.current?.finishOpening();
    sound.current?.setStory(null);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    controls.current?.clear();
    if (engine.current.phase === 'paused') engine.current.resume();
    openingRef.current = false;
    setOpening(false);
    void sound.current?.unlock();
    canvas.current?.focus({ preventScroll: true });
  };
  const storyVoice = () => {
    const current = settingsRef.current;
    if (!current.sound || !current.voice || current.volume === 0) {
      const next = { ...current, sound: true, voice: true, volume: current.volume || .65 };
      settingsRef.current = next;
      if (sound.current) sound.current.settings = next;
      setSave(s => ({ ...s, settings: next }));
      sound.current?.resumeNarration();
    } else sound.current?.toggleNarration();
    void sound.current?.unlock();
  };
  return (
    <main
      className={`last-light ${inGame ? "in-game" : "at-home"}`}
      data-phase={inGame ? opening ? 'opening' : e?.phase || 'loading' : 'menu'}
    >
      {guestConflict && !dismissedConflict && <GameDialog title={t('Which journey would you like to continue?')} onClose={dismissConflict}>
        <p>{t('Your guest delivery has been saved. Your account also has an unfinished journey. Choose which one to continue; your best scores are kept.')}</p>
        <div className="account-gate-actions"><button className="completion-primary" onClick={() => { dismissConflict(); home(); }}>{t('Keep my account journey')}</button>
          <button className="completion-secondary" onClick={() => { if (adoptGuestJourney()) { dismissConflict(); home(); } else setHandoffError('Guest progress could not be copied. Enable browser storage and retry.'); }}>{t('Continue this guest journey')}</button></div>
        {handoffError && <p role="alert">{t(handoffError)}</p>}
      </GameDialog>}
      {accountGate && <GameDialog title={t('Keep bringing the light.')} eyebrow="YOUR JOURNEY CONTINUES" onClose={() => setAccountGate(false)}>
        <p>{t(community.player ? 'Your account session needs to be refreshed. Log in again to continue. Your saved progress is safe.' : 'Play the first delivery as a guest. Create a free account to save your score and continue to the other four clinics.')}</p>
        <div className="account-gate-actions"><button className="completion-primary" onClick={() => authHandoff(community.player ? 'login' : 'signup', !!community.player)}>{t(community.player ? 'Log in again' : 'Create account and continue')} →</button>{!community.player && <button className="completion-secondary" onClick={() => authHandoff('login')}>{t('Already have an account? Log in')}</button>}
          <button className="completion-link" onClick={() => { setAccountGate(false); setSelected(0); start(0); }}>{t('Play the first delivery as a guest')}</button></div>
        {handoffError && <p role="alert">{t(handoffError)}</p>}
        <SupportActions onShare={() => { setAccountGate(false); setSharing(true); }} />
      </GameDialog>}
      {sharing && <GameDialog title={t('Invite 10 friends')} onClose={() => setSharing(false)}><InviteFriends mission={selected} mode={save.settings.mode} variant={variant} score={result?.practice ? undefined : result?.score ?? save.story.best[bestKey(selected,save.settings.mode,variant)]?.score} compact /></GameDialog>}
      {continuing && !inGame && <div className="journey-restoring" role="status" aria-live="polite" aria-busy="true">
        <span className="eyebrow">{t('LET THERE BE LIGHT')}</span>
        <h2>{t('Restoring journey…')}</h2>
        <div className="loading-line" />
        <p>{t('Your saved progress is safe. Checking your checkpoint and preparing the road…')}</p>
      </div>}
      {!inGame && (
        <>
          <div
            className="key-art"
            style={{ backgroundImage: `url(${base}${KEY_ART})` }}
          />
          <div className="home-shade" />
          <header className="home-header">
            <a href={returnHref} target="_top" className="brand">
              <span className="brand-mark">✳</span>{t(" GLOBAL SOLUTIONS LAB")}{t(" ")}
              <span className="muted">{t("/ PLAY")}</span>
            </a>
            <div className="header-actions">
              <LanguageSwitch onChange={language => void saveLanguagePreference(language)} />
              <span className="edition">{t("THE SECOND ADVENTURE")}</span>
              <button className="text-button" onClick={settings}>{t(" Settings ↗ ")}</button>
            </div>
          </header>
          <section className="hero">
            <div className="eyebrow">
              <span className="live-dot" />{t(" A JOURNEY WORTH MAKING ")}</div>
            <h1 aria-label="Let There Be Light">
              <span className="title-prelude">LET THERE BE</span>
              <em>light</em><span className="title-period">.</span>
            </h1>
            <p className="hero-tagline">{t(" The road is rough. ")}<br />{t(" The reason is everything. ")}</p>
            <p className="hero-description">{t(" Five nights. One reason to keep going. ")}<br />{t(" Reach the clinic. Bring the light. ")}</p>
            {canContinue && <div className="journey-continue">
              <button className="primary start-button" disabled={continuing || community.status === 'loading'} onClick={() => void resumeSaved()}><span>{t(continuing ? 'Restoring journey…' : 'Continue journey')}</span><span>↗</span></button>
              <p>{t("Clinic ")}{savedJourney.mission + 1} · {t(CLINICS[savedJourney.mission]?.shortName)}<br/>{t(savedJourney.snapshot ? `${time(savedJourney.snapshot.remaining)} reserve · ${Math.round(savedJourney.snapshot.integrity)}% kit · safe checkpoint` : 'Your next delivery is ready.')}</p>
              <small>{t(savedJourney.dirty ? 'Latest save on this device' : community.player ? 'Saved to your account' : 'Saved on this device')} · {t(new Date(savedJourney.savedAt).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }))}</small>
            </div>}
            {guestConflict && dismissedConflict && <button className="text-button" onClick={() => { persist(`last-light.journey-choice.${community.player?.uid}`, ''); setJourneyChoiceDismissed(''); }}>{t('Choose which journey to continue')}</button>}
            <button className={canContinue ? 'secondary start-button' : 'primary start-button'} disabled={continuing || community.status === 'loading'} onClick={() => start(canContinue ? 0 : selected)}>
              <span>{t(canContinue ? 'Start new journey' : save.story.completed.includes(selected) ? 'Drive again' : community.player ? 'Begin the journey' : 'Play as guest')}</span><span>↗</span>
            </button>
            {!community.player && <div className="entry-account-actions">
              <button onClick={() => authHandoff('signup')}>{t('Create an account')}</button>
              <span aria-hidden="true">·</span><button onClick={() => authHandoff('login')}>{t('Log in')}</button>
              <p>{t('Play the first delivery as a guest. Create a free account to save your score and continue to the other four clinics.')}</p>
            </div>}
            {community.status === 'unavailable' && <p className="entry-verification" role="status">{t(community.message)} <button className="text-button" onClick={() => location.reload()}>{t('Retry connection')}</button></p>}
            {community.player && !community.player.verified && <p className="entry-verification" role="status">{t(verificationDelayed ? 'Your account is ready. Verification email is delayed. Keep playing, or resend it for leaderboard access.' : 'Keep playing. Verify your email to join the leaderboard.')} <button className="text-button" onClick={() => authHandoff('verify-email')}>{t('Verify email')}</button></p>}
            <SupportActions onShare={() => setSharing(true)} />
            <div
              className="road-edition"
              role="group"
              aria-label={t("Road conditions")}
            >
              <button
                aria-pressed={variant === 0}
                onClick={() => setVariant(0)}
              >{t(" Valley run ")}</button>
              <button
                aria-pressed={variant === 1}
                onClick={() => setVariant(1)}
              >{t(" Fresh tracks ")}</button>
            </div>
            <div className="hero-meta">
              <span>{t("3D DRIVING ADVENTURE")}</span>
              <i /> <span>{t("5 CHAPTERS")}</span>
              <i />
              <span>{t("KEYBOARD · TOUCH · CONTROLLER")}</span>
            </div>
          </section>
          <aside className="mission-preview">
            <span className="eyebrow">{t(" YOUR NEXT DELIVERY / ")}{t(String(selected + 1).padStart(2, "0"))}
            </span>
            <h2>{t(mission.title)}</h2>
            <p>{t(mission.tagline)}</p>
            <div className="preview-rule" />
            <span>{t(mission.place)}</span>
            <span className="preview-distance">
              {t((pathLength(mission) / 1000).toLocaleString(getLocale(), { maximumFractionDigits: 1 }))}{t(" km ·")}{t(" ")}
              {t(chapterLook(mission).name.toLowerCase())}
            </span>
            <span className="preview-region">{t(mission.region)}</span>
            <span className="preview-signature">{t(mission.signature)}</span>
          </aside>
          <section className="campaign" aria-label={t("Choose a chapter")}>
            <div className="campaign-label">
              <span className="eyebrow">{t("A CHAIN OF LIGHT")}</span>
              <span>
                {save.story.completed.length}{t("/5 CHAPTERS COMPLETE ")}</span>
            </div>
            <div className="chapters">
              {MISSIONS.map((m, i) => {
                const open = unlocked(save, i) || challenge?.mission === i || checkpoint?.mission === i,
                  best = save.story.best[bestKey(i, save.settings.mode, variant)];
                return (
                  <button
                    key={i}
                    className={`chapter ${selected === i ? "selected" : ""} ${save.story.completed.includes(i) ? "complete" : ""} ${community.status === 'guest' && i > 0 ? 'account-locked' : ''}`}
                    disabled={!open && community.status !== 'guest'}
                    onClick={() => { if (guardClinic(i)) setSelected(i); }}
                    aria-pressed={selected === i}
                  >
                    <span className="chapter-number">
                      {t(String(i + 1).padStart(2, "0"))}{t(" ")}
                      <span>
                        {t(community.status === 'guest' && i > 0 ? "○" : save.story.completed.includes(i) ? "✦" : open ? "↗" : "○")}
                      </span>
                    </span>
                    <strong>{t(m.title)}</strong>
                    <span className="chapter-detail">
                      {t(community.status === 'guest' && i > 0 ? 'Free account required' : best
                        ? `${"★".repeat(best.stars)} · ${best.score.toLocaleString(getLocale())} pts`
                        : open
                          ? m.place
                          : "Complete the previous chapter")}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          {t(handoffError && <p className="challenge-welcome" role="status">{t(handoffError)}</p>)}
          {challenge && <aside className="challenge-welcome"><strong>{t("You’re invited to chapter ")}{challenge.mission+1}: {t(CLINICS[challenge.mission].shortName)}.</strong><p>{t(community.status === 'guest' && challenge.mission > 0 ? 'Create an account or log in to play this challenge. You can also try the first delivery as a guest.' : 'This invitation opens this chapter; earlier chapters still count only when you complete them.')}</p>{community.status === 'guest' && challenge.mission > 0 && <button className="secondary" onClick={() => { setSelected(0); start(0); }}>{t('Play the first delivery as a guest')}</button>}</aside>}
          <section className="home-community" aria-label={t("The players and the real project")}><Leaderboard mission={selected} mode={save.settings.mode} variant={variant}/><RealProjectCard/></section>
          <footer className="home-footer">
            <a href="/games/lost-in-orbit/" target="_top">{t(" ← Adventure 01 · Lost in Orbit ")}</a>
            <span>{t("EVERY MINUTE MATTERS. EVERY LIGHT MATTERS.")}</span>
          </footer>
        </>
      )}
      {inGame && (
        <>
          <canvas
            key={run}
            ref={canvas}
            className="game-canvas"
            tabIndex={-1}
            aria-label={t(`Let There Be Light: drive to ${mission.place}`)}
          />
          <div className="game-vignette" />
          {!error && (opening || (ready && e?.phase === 'results' && result)) && (
            <ClinicStoryView
              key={`${selected}:${run}:${opening ? 'opening' : 'closing'}`}
              clinic={clinic} chapter={selected} scene={opening ? 'opening' : 'closing'}
              mission={e?.mission || mission} previewTime={world.current?.openingTime || 0}
              previewPaused={previewPaused || showSettings} onPreviewPause={() => setPreviewPaused(v => !v)}
              settings={save.settings} narration={sound.current?.narration || { status: 'idle', progress: 0, scene: null }}
              onVoice={storyVoice} onSettings={settings} onHome={home}
              onContinue={opening ? beginDrive : () => result?.practice ? start(selected) : selected < 4 ? start(selected + 1, currentJourneyId() || readActive(community.player?.uid || null)?.journeyId) : home()}
              onReplay={() => {
                if (!e) return;
                sound.current?.setStory(null);
                controls.current?.clear();
                e.restoreTime = 0; e.phase = 'restoring';
                setTick(t => t + 1);
              }}
              onTouch={() => setTouch(!touch)} touch={touch} ready={ready} loading={loading}
              completed={save.story.completed} result={opening ? undefined : result || undefined}
              onAuth={authHandoff} handoffError={handoffError}
              accountStatus={community.status} emailVerified={community.player?.verified}
              onGuestReplay={() => start(0)}
            />
          )}
          {!ready && !error && !opening && (
            <div className="loading-screen">
              <span className="eyebrow">{t(" LET THERE BE LIGHT / CHAPTER ")}{t(String(selected + 1).padStart(2, "0"))}
              </span>
              <h2>{t(mission.title)}</h2>
              <div className="loading-line" />
              <p>{t(loading)}…</p>
              <small>{t(" Keep right, follow tail lights and pass when the road ahead is clear. The clinic clock starts with your first driving input. ")}</small>
            </div>
          )}
          {ready && e && !opening && (
            <>
              {!['restoring', 'results'].includes(e.phase) && <header className="drive-header">
                <div className="drive-identity">
                  <span className="eyebrow">{t(" LET THERE BE LIGHT / ")}{t(String(selected + 1).padStart(2, "0"))}
                  </span>
                  <strong>{t(clinic.shortName)}</strong>
                </div>
                <div className={`reserve ${e.time < 40 ? "urgent" : ""}`}>
                  <span>{t("CLINIC RESERVE")}</span>
                  <strong>{t(time(e.time))}</strong>
                  <div className="reserve-track">
                    <i style={{ width: `${(e.time / e.initial) * 100}%` }} />
                  </div>
                </div>
                <div className="drive-actions">
                  <button
                    className="icon-button"
                    onClick={() => {
                      if (!save.settings.sound) void sound.current?.unlock();
                      setSave((s) => ({
                        ...s,
                        settings: { ...s.settings, sound: !s.settings.sound },
                      }));
                    }}
                    aria-label={
                      t(save.settings.sound ? "Mute sound" : "Enable sound")
                    }
                  >
                    {t(save.settings.sound ? "♪" : "♩")}
                  </button>
                  <button
                    className="icon-button"
                    onClick={pause}
                    aria-label={t("Pause game")}
                  >
                    Ⅱ
                  </button>
                </div>
              </header>}
              <DriveCoach key={`${selected}:${run}`} engine={e} touch={touch} controller={controls.current?.device === 'controller'} />
              {["ready", "driving"].includes(e.phase) && (
                <>
                  <div className="destination">
                    <span className="destination-symbol">+</span>
                    <div>
                      <span className="eyebrow">
                        {t(e.distance < 40 ? "YOU ARE HERE" : "FOLLOW THE ROAD")}
                      </span>
                      <strong>{t(mission.place)}</strong>
                      <span>{Math.round(e.distance)}{t(" m to delivery")}</span>
                    </div>
                  </div>
                  <div className="telemetry">
                    <div className="cargo-state">
                      <span>{t("SOLAR KIT")}</span>
                      <strong>
                        {Math.round(e.integrity)}
                        <small>%</small>
                      </strong>
                      <div className="cargo-track">
                        <i
                          style={{
                            width: `${e.integrity}%`,
                            background:
                              e.integrity < 35 ? "#ef9566" : undefined,
                          }}
                        />
                      </div>
                      <span>
                        {t(e.integrity >= 70
                          ? "SECURE"
                          : e.integrity >= 35
                            ? "HANDLE WITH CARE"
                            : "AT RISK")}
                      </span>
                    </div>
                    <RouteMap engine={e} />
                  </div>
                  <div className="speedometer">
                    <strong>{Math.round(Math.abs(e.speed) * 3.6)}</strong>
                    <span>{t(" KM/H")}{t(" ")}
                      <b className="gear">{t(e.speed < -0.5 ? "R" : e.gear)}</b>
                    </span>
                    <div className="rpm-track">
                      <i
                        style={{
                          width: `${Math.min(100, (e.rpm / 4900) * 100)}%`,
                        }}
                      />
                    </div>
                    <small>{t(e.surface.toUpperCase())}</small>
                    {t(e.trafficHint && (
                      <small className="traffic-status">{t(e.trafficHint)}</small>
                    ))}
                    <small className="beam-status">
                      ◌ {t(beamMode(e.mission, Math.abs(e.speed), e.progress))}
                    </small>
                  </div>
                  {e.upcomingEncounter && (
                    <div
                      className="encounter-cue"
                      data-clear={e.upcomingEncounter.state === "clear"}
                      role="status"
                    >
                      <span className="encounter-mark">!</span>
                      <div>
                        <strong>
                          {t(e.upcomingEncounter.state === "clear"
                            ? "ROAD CLEAR"
                            : e.upcomingEncounter.title)}
                        </strong>
                        <span>{t(e.upcomingEncounter.state === 'clear' ? 'PASSAGE OPEN' : 'CAUTION AHEAD')}</span>
                      </div>
                      <b>
                        {Math.max(
                          0,
                          Math.round(e.upcomingEncounter.z - e.progress),
                        )}{t(" ")}{t(" m ")}</b>
                    </div>
                  )}
                  {e.elapsed < e.rewardUntil && (
                    <div className="clean-cue">{t(" ✓ CLEAN DRIVING ")}<span>{e.totalClean}{t(" handled")}</span>
                    </div>
                  )}
                  {e.canDeliver && (
                    <div className="delivery-prompt">
                      <span>{t("YOU MADE IT TO THE CLINIC")}</span>
                      <button
                        className="primary"
                        onPointerDown={(event) => {
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                          if (controls.current)
                            controls.current.touch.action = true;
                        }}
                        onPointerUp={() => {
                          if (controls.current)
                            controls.current.touch.action = false;
                        }}
                        onPointerCancel={() => {
                          if (controls.current)
                            controls.current.touch.action = false;
                        }}
                        onLostPointerCapture={() => {
                          if (controls.current)
                            controls.current.touch.action = false;
                        }}
                        onKeyDown={(event) => {
                          if (
                            (event.code === "Enter" ||
                              event.code === "Space") &&
                            controls.current
                          )
                            controls.current.touch.action = true;
                        }}
                        onKeyUp={() => {
                          if (controls.current)
                            controls.current.touch.action = false;
                        }}
                      >
                        {t(save.settings.singlePress ? 'Deliver kit' : 'Hold to deliver kit')}
                        {!touch && <small className="delivery-key">{t(controls.current?.device === 'controller' ? 'A / ×' : keyLabel(save.settings, 'action'))}</small>}
                      </button>
                      <div className="delivery-track">
                        <i
                          style={{ width: `${clamp(e.delivery, 0, 1) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {e.distance < 30 && !e.canDeliver && (
                    <div className="approach-prompt">{t(" Park inside the marked bay and brake to a stop. ")}</div>
                  )}
                  {e.practice && (
                    <div className="approach-prompt">{t(" Practice · records and unlocks stay unchanged ")}</div>
                  )}
                  {e.needsRecovery && (
                    <button
                      className="recover-button"
                      onClick={recover}
                      title={t("Return to the last safe checkpoint. Uses 8 seconds of clinic reserve.")}
                    >{t(" Recover truck · −8 seconds ")}</button>
                  )}
                  {touch && (
                    <TouchControls controls={controls.current} engine={e} />
                  )}
                </>
              )}
              {e.phase === "restoring" && (
                <ArrivalOverlay time={e.restoreTime} clinic={clinic} still={!!save.settings.reducedMotion} onSkip={skipArrival} />
              )}
              {e.phase === "failed" && (
                <div className="modal-backdrop">
                  <section className="pause-card">
                    <span className="eyebrow">{t(" THERE IS ANOTHER WAY THROUGH ")}</span>
                    <h2>{t("A fresh start.")}</h2>
                    <p>{t(e.failure)}</p>
                    <p className="muted">{t(" Brake before rough ground. Take the firmer route. The team is ready when you are. ")}</p>
                    <button className="primary" onClick={() => start()}>{t(" Try the delivery again ↗ ")}</button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setSave((s) => ({
                          ...s,
                          settings: { ...s.settings, mode: "relaxed" },
                        }));
                        settingsRef.current = {
                          ...settingsRef.current,
                          mode: "relaxed",
                        };
                        start();
                      }}
                    >{t(" Try with more time ")}</button>
                    <button
                      className="secondary"
                      onClick={() => {
                        if (!guardClinic(selected)) return;
                        beginPractice(selected);
                        e.practiceFromCheckpoint();
                        controls.current?.clear();
                      }}
                    >{t(" Practice from checkpoint · unranked ")}</button>
                    {!community.player && <button className="text-button" onClick={() => authHandoff('login')}>{t("Save your journey · log in")}</button>}
                    {t(handoffError && <p role="alert">{t(handoffError)}</p>)}
                    <button className="text-button" onClick={home}>{t(" Chapter map ")}</button>
                  </section>
                </div>
              )}
              {e.phase === "paused" && !showSettings && !error && (
                <div className="modal-backdrop">
                  <section className="pause-card">
                    <span className="eyebrow">{t("THE ROAD WILL WAIT")}</span>
                    <h2>{t("Take a breath.")}</h2>
                    <p>{t("Your delivery and the clinic clock are paused.")}</p><p className="checkpoint-status" role="status">{t(community.checkpointMessage || "Your next checkpoint will save automatically.")}</p>
                    <button className="primary" onClick={pause} autoFocus>{t(" Continue the journey ↗ ")}</button>
                    {e.previous === "driving" && (
                      <>
                        <button className="secondary" onClick={recover}>{t(" Recover truck · −8 seconds ")}</button>
                        <p>{t("Stuck? Return to the last safe checkpoint and continue this delivery.")}</p>
                      </>
                    )}
                    <button className="secondary" onClick={settings}>{t(" Settings & controls ")}</button>
                    <button
                      className="text-button"
                      onClick={() => {
                        if (!guardClinic(selected)) return;
                        beginPractice(selected);
                        e.practiceFromCheckpoint();
                        controls.current?.clear();
                      }}
                    >{t(" Practice from checkpoint · unranked ")}</button>
                    <button className="text-button" onClick={() => start()}>{t(" Restart this delivery ")}</button>
                    <button className="text-button" onClick={home}>{t(" Save & return to chapter map ")}</button>
                  </section>
                </div>
              )}
              {qa && (
                <div className="qa-panel">
                  <button
                    onClick={() => {
                      pilotRef.current = !pilotRef.current;
                      setAutopilot(pilotRef.current);
                      if (e.phase === "paused") e.resume();
                    }}
                  >
                    {t(autopilot ? "Stop" : "Run")}{t(" driving QA ")}</button>
                  <button onClick={async () => {
                    // Development-only regression aid: request the same adaptive
                    // graphics changes as slow frames, even with manual quality.
                    // This affects this QA drive only; saved settings stay intact.
                    const { FrameGovernor } = await import('./quality');
                    const view = world.current;
                    if (!view) return;
                    view.governor = new FrameGovernor(view.tier, true);
                    for (let i = 0; i < 300; i++) view.recordFrame(.04, 2, 35);
                  }}>{t("Stress graphics QA")}</button>
                  <output>{t(" tier ")}{t(world.current ? ["light", "balanced", "high"][world.current.tier] : "-")}{t(" · res ")}{world.current ? Math.round(world.current.governor.scale * 100) : 100}% ·{t(" ")}{t(" phase ")}{t(e.phase)}{t(" · z ")}{t(e.progress.toFixed(0))} ·{t(" ")}
                    {t(e.integrity.toFixed(0))}% · {tick}{t(" frames ·")}{t(" ")}
                    {world.current?.renderer.info.render.calls}{t(" calls ·")}{t(" ")}
                    {Math.round(
                      world.current?.renderer.info.render.triangles || 0,
                    )}{t(" ")}{t(" triangles · p95 ")}{t(world.current?.performance.p95.toFixed(1))}{t(" ")}{t(" ms · p99 ")}{t(world.current?.frames.stats.p99.toFixed(1))}{t(" ms · max ")}{t(world.current?.frames.stats.max.toFixed(0))}{t(" ms · &gt;100ms ")}{world.current?.frames.stats.over100}{t(" · &gt;250ms")}{t(" ")}
                    {world.current?.frames.stats.over250}{t("· CPU")}{t(" ")}
                    {t(world.current?.frames.stats.physicsMs.toFixed(1))}/
                    {t(world.current?.frames.stats.renderMs.toFixed(1))}{t(" ms · dropped ")}{t(e.droppedTime.toFixed(2))}{t("s · pause ")}{e.pauseEvents}{t(" ")}
                    ({t(e.pauseReason)}{t(") · traffic ")}{e.traffic.observed}/
                    {e.traffic.cars.length}{t(" · clean ")}{e.traffic.clean}{t("· brake")}{t(" ")}
                    {t(e.brakeSource)} {t(e.braking.toFixed(2))}
                  </output>
                  <output>
                    {Math.round(world.current?.frames.stats.fps || 0)}{t(" avg fps ")}</output>
                </div>
              )}
            </>
          )}
          {t(error && (
            <div className="modal-backdrop">
              <section className="pause-card">
                <span className="eyebrow">{t("LET US GET YOU BACK ON THE ROAD")}</span>
                <h2>{t("The scene needs a restart.")}</h2>
                <p>{t(error)}</p>
                <button className="primary" onClick={() => start()}>{t(" Restart drive ↗ ")}</button>
                <button
                  className="secondary"
                  onClick={() => {
                    settingsRef.current = {
                      ...settingsRef.current,
                      quality: "low",
                    };
                    setSave((s) => ({ ...s, settings: settingsRef.current }));
                    start();
                  }}
                >{t(" Try low graphics ")}</button>
                <button className="text-button" onClick={home}>{t(" Back to chapters ")}</button>
              </section>
            </div>
          ))}
        </>
      )}
      {!storageOk && (
        <div className="storage-notice">{t(" Progress is saved for this session. Browser storage is unavailable. ")}</div>
      )}
      {showSettings && (
        <SettingsPanel
          settings={save.settings}
          onChange={(s) => setSave((v) => ({ ...v, settings: s }))}
          onClose={() => setShowSettings(false)}
        />
      )}
      {restartChoice && <RestartJourneyDialog onKeep={() => setRestartChoice(null)} onRestart={() => { const choice = restartChoice; setRestartChoice(null); start(choice.id, choice.journeyId, true); }} />}
      {sharedBoard && <LeaderboardDialog initial={{ mission: /^[0-4]$/.test(new URLSearchParams(location.search).get('chapter') || '') ? Number(new URLSearchParams(location.search).get('chapter')) : 'all', mode: ['standard','relaxed'].includes(new URLSearchParams(location.search).get('mode') || '') ? new URLSearchParams(location.search).get('mode')! : save.settings.mode, variant: new URLSearchParams(location.search).get('variant') === '1' ? 1 : 0 }} onClose={() => setSharedBoard(false)} />}
    </main>
  );
}
