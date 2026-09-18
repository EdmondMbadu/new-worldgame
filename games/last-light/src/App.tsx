import { routePoint } from "./routes";
import {
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
  livesSaved,
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
import { beamMode, nightProfile } from "./night";

const base = import.meta.env.BASE_URL;
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
      aria-label="Route to the clinic"
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
      aria-label={label}
    >
      {label}
    </button>
  );
  return (
    <div className="touch-controls">
      <div
        className="steering-pad"
        role="slider"
        aria-label="Steering"
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
        <span>‹</span>
        <span className="steering-label">STEER</span>
        <span>›</span>
      </div>
      <div className="pedals">
        {engine &&
          (engine.canDeliver || engine.needsRecovery) &&
          button("action", engine.canDeliver ? "DELIVER" : "RECOVER")}
        {button("brake", "BRAKE")}
        {button("throttle", "DRIVE")}
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
        aria-label="Journey settings"
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
            <span className="eyebrow">MAKE YOURSELF AT HOME</span>
            <h2>Journey settings</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close settings"
            autoFocus
          >
            ×
          </button>
        </div>
        <label className="setting-row">
          Difficulty
          <select
            value={settings.mode}
            onChange={(e) =>
              onChange({
                ...settings,
                mode: e.target.value as Settings["mode"],
              })
            }
          >
            <option value="standard">Standard</option>
            <option value="relaxed">Relaxed · more time</option>
          </select>
        </label>
        <p className="setting-note">
          Difficulty changes apply to your next drive. Relaxed adds 35% more
          time and softens cargo damage.
        </p>
        <label className="setting-row">
          Graphics
          <select
            value={settings.quality}
            onChange={(e) =>
              onChange({
                ...settings,
                quality: e.target.value as Settings["quality"],
              })
            }
          >
            <option value="auto">Auto · adapts to this device</option>
            <option value="high">High</option>
            <option value="low">Low · lighter rendering</option>
          </select>
        </label>
        <p className="setting-note">
          Graphics changes apply to the next drive.
        </p>
        {(
          [
            ["sound", "Sound & music"],
            ["voice", "Radio voice"],
            ["subtitles", "Radio subtitles"],
            ["reducedMotion", "Reduced camera motion"],
            ["singlePress", "One-press delivery"],
            ["enhancedVisibility", "Enhanced night visibility"],
            ["reducedFlashes", "Reduce lightning flashes"],
          ] as const
        ).map(([key, label]) => (
          <label className="setting-row" key={key}>
            {label}
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={(e) =>
                onChange({ ...settings, [key]: e.target.checked })
              }
            />
          </label>
        ))}
        <label className="setting-row">
          Night brightness
          <input
            type="range"
            aria-label="Night brightness"
            min="0.8"
            max="1.4"
            step="0.05"
            value={settings.brightness}
            onChange={(e) =>
              onChange({ ...settings, brightness: Number(e.target.value) })
            }
          />
        </label>
        <label className="setting-row">
          Volume
          <input
            aria-label="Volume"
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
              {key}
              <kbd>
                {binding === key
                  ? "Press a key…"
                  : value.replace("Key", "").replace("Digit", "")}
              </kbd>
            </button>
          ))}
        </div>
        <p className="setting-note">
          Arrow keys also work. Controller: steer with the left stick, triggers
          to drive/brake, A / × to deliver. Recover a stuck truck with the
          contextual action or the on-screen button.
        </p>
        <button
          className="secondary"
          onClick={() => onChange(defaultSettings())}
        >
          Restore default settings
        </button>
      </section>
    </div>
  );
}

export default function App() {
  const [save, setSave] = useState(readSave),
    [selected, setSelected] = useState(0),
    [variant, setVariant] = useState(0),
    [inGame, setInGame] = useState(false),
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
    settingsOpenRef = useRef(false),
    settingsRef = useRef(save.settings),
    saveRef = useRef(save),
    pilotRef = useRef(false);
  const mission = MISSIONS[selected];
  settingsOpenRef.current = showSettings;
  const e = engine.current;
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
      if (!save.settings.sound || !save.settings.voice) sound.current.silence();
    }
    setStorageOk(writeSave(save));
  }, [save]);
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
    }
    setTick((t) => t + 1);
  };
  useEffect(() => {
    if (!inGame || !canvas.current) return;
    let cancelled = false,
      raf = 0,
      last = 0,
      hudTime = 0,
      committed = false;
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
        engine.current = instance;
        setLoading("Bringing the valley to life");
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
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
        const input = new Controls(settingsRef.current, (force = false) => {
          if (settingsOpenRef.current) {
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
        setReady(true);
        last = performance.now();
        let observedResume = instance.resumeRevision;
        const frame = (now: number) => {
          if (cancelled) return;
          const resumed = observedResume !== instance.resumeRevision;
          observedResume = instance.resumeRevision;
          const dt = resumed ? 0 : (now - last) / 1000;
          last = now;
          let state = input.sample();
          if (qa && pilotRef.current) state = driveInput(instance, false, true);
          const stepStart = performance.now();
          instance.advance(dt, state, settingsRef.current.singlePress);
          const physicsMs = performance.now() - stepStart;
          if (instance.result && !committed) {
            committed = true;
            setSave((s) => recordResult(s, instance.result!));
          }
          if (
            instance.phase !== "paused" &&
            document.visibilityState !== "hidden"
          ) {
            const renderStart = performance.now();
            view.render(Math.min(dt, 0.06), dt);
            view.recordFrame(dt, physicsMs, performance.now() - renderStart);
            if (!settingsOpenRef.current)
              sound.current?.update(instance, Math.min(dt, 0.06));
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
      engine.current?.pause(event?.type || "visibility");
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
  useEffect(() => () => sound.current?.dispose(), []);
  const start = (id = selected) => {
    sound.current?.dispose();
    sound.current = new Soundtrack(settingsRef.current);
    void sound.current.unlock();
    setSelected(id);
    setInGame(true);
    setRun((r) => r + 1);
    setShowSettings(false);
    pilotRef.current = false;
    setAutopilot(false);
  };
  const home = () => {
    sound.current?.dispose();
    sound.current = null;
    setInGame(false);
    setShowSettings(false);
    pilotRef.current = false;
    setAutopilot(false);
  };
  const settings = () => {
    if (engine.current?.phase !== "paused") engine.current?.pause();
    controls.current?.clear();
    sound.current?.silence();
    setShowSettings(true);
  };
  const returnHref = "/games";
  const totalLives = livesSaved(save);
  const result = e?.result;
  return (
    <main
      className={`last-light ${inGame ? "in-game" : "at-home"}`}
      data-phase={e?.phase || "menu"}
    >
      {!inGame && (
        <>
          <div
            className="key-art"
            style={{ backgroundImage: `url(${base}key-art.png)` }}
          />
          <div className="home-shade" />
          <header className="home-header">
            <a href={returnHref} target="_top" className="brand">
              <span className="brand-mark">✳</span> GLOBAL SOLUTIONS LAB{" "}
              <span className="muted">/ PLAY</span>
            </a>
            <div className="header-actions">
              <span className="edition">THE SECOND ADVENTURE</span>
              <button className="text-button" onClick={settings}>
                Settings ↗
              </button>
            </div>
          </header>
          <section className="hero">
            <div className="eyebrow">
              <span className="live-dot" /> A JOURNEY WORTH MAKING
            </div>
            <h1>
              LAST
              <br />
              <em>LIGHT</em>
              <span className="title-period">.</span>
            </h1>
            <p className="hero-tagline">
              The road is rough.
              <br />
              The reason is everything.
            </p>
            <p className="hero-description">
              Five nights. One reason to keep going.
              <br />
              Reach the clinic. Bring the light.
            </p>
            <button className="primary start-button" onClick={() => start()}>
              <span>
                {save.completed.includes(selected)
                  ? "Drive again"
                  : "Begin the journey"}
              </span>
              <span>↗</span>
            </button>
            <div
              className="road-edition"
              role="group"
              aria-label="Road conditions"
            >
              <button
                aria-pressed={variant === 0}
                onClick={() => setVariant(0)}
              >
                Valley run
              </button>
              <button
                aria-pressed={variant === 1}
                onClick={() => setVariant(1)}
              >
                Fresh tracks
              </button>
            </div>
            <div className="hero-meta">
              <span>3D DRIVING ADVENTURE</span>
              <i /> <span>5 CHAPTERS</span>
              <i />
              <span>KEYBOARD · TOUCH · CONTROLLER</span>
            </div>
          </section>
          <aside className="mission-preview">
            <span className="eyebrow">
              YOUR NEXT DELIVERY / {String(selected + 1).padStart(2, "0")}
            </span>
            <h2>{mission.title}</h2>
            <p>{mission.tagline}</p>
            <div className="preview-rule" />
            <span>{mission.place}</span>
            <span className="preview-distance">
              {(pathLength(mission) / 1000).toFixed(1)} km ·{" "}
              {nightProfile(mission).name.toLowerCase()}
            </span>
          </aside>
          <section className="campaign" aria-label="Choose a chapter">
            <div className="campaign-label">
              <span className="eyebrow">A CHAIN OF LIGHT</span>
              <span>
                {save.completed.length}/5 CLINICS POWERED
                {totalLives > 0 && ` · ${totalLives} LIVES SAVED`}
              </span>
            </div>
            <div className="chapters">
              {MISSIONS.map((m, i) => {
                const open = unlocked(save, i),
                  best = save.best[bestKey(i, save.settings.mode, variant)];
                return (
                  <button
                    key={i}
                    className={`chapter ${selected === i ? "selected" : ""} ${save.completed.includes(i) ? "complete" : ""}`}
                    disabled={!open}
                    onClick={() => setSelected(i)}
                    aria-pressed={selected === i}
                  >
                    <span className="chapter-number">
                      {String(i + 1).padStart(2, "0")}{" "}
                      <span>
                        {save.completed.includes(i) ? "✦" : open ? "↗" : "○"}
                      </span>
                    </span>
                    <strong>{m.title}</strong>
                    <span className="chapter-detail">
                      {best
                        ? `${"★".repeat(best.stars)} · ${best.score.toLocaleString()} pts`
                        : open
                          ? m.place
                          : "Complete the previous chapter"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          <footer className="home-footer">
            <a href="/games/lost-in-orbit/" target="_top">
              ← Adventure 01 · Lost in Orbit
            </a>
            <span>EVERY MINUTE MATTERS. EVERY LIGHT MATTERS.</span>
          </footer>
        </>
      )}
      {inGame && (
        <>
          <canvas
            key={run}
            ref={canvas}
            className="game-canvas"
            aria-label={`Last Light: drive to ${mission.place}`}
          />
          <div className="game-vignette" />
          {!ready && !error && (
            <div className="loading-screen">
              <span className="eyebrow">
                LAST LIGHT / CHAPTER {String(selected + 1).padStart(2, "0")}
              </span>
              <h2>{mission.title}</h2>
              <div className="loading-line" />
              <p>{loading}…</p>
              <small>
                Keep right, follow tail lights and pass when the road ahead is
                clear. The clinic clock starts with your first driving input.
              </small>
            </div>
          )}
          {ready && e && (
            <>
              <header className="drive-header">
                <div className="drive-identity">
                  <span className="eyebrow">
                    LAST LIGHT / {String(selected + 1).padStart(2, "0")}
                  </span>
                  <strong>{mission.title}</strong>
                </div>
                <div className={`reserve ${e.time < 40 ? "urgent" : ""}`}>
                  <span>CLINIC RESERVE</span>
                  <strong>{time(e.time)}</strong>
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
                      save.settings.sound ? "Mute sound" : "Enable sound"
                    }
                  >
                    {save.settings.sound ? "♪" : "♩"}
                  </button>
                  <button
                    className="icon-button"
                    onClick={pause}
                    aria-label="Pause game"
                  >
                    Ⅱ
                  </button>
                </div>
              </header>
              {["ready", "driving"].includes(e.phase) && (
                <>
                  <div className="destination">
                    <span className="destination-symbol">+</span>
                    <div>
                      <span className="eyebrow">
                        {e.distance < 40 ? "YOU ARE HERE" : "FOLLOW THE ROAD"}
                      </span>
                      <strong>{mission.place}</strong>
                      <span>{Math.round(e.distance)} m to delivery</span>
                    </div>
                  </div>
                  <div className="telemetry">
                    <div className="cargo-state">
                      <span>SOLAR KIT</span>
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
                        {e.integrity >= 70
                          ? "SECURE"
                          : e.integrity >= 35
                            ? "HANDLE WITH CARE"
                            : "AT RISK"}
                      </span>
                    </div>
                    <RouteMap engine={e} />
                  </div>
                  <div className="speedometer">
                    <strong>{Math.round(Math.abs(e.speed) * 3.6)}</strong>
                    <span>
                      KM/H{" "}
                      <b className="gear">{e.speed < -0.5 ? "R" : e.gear}</b>
                    </span>
                    <div className="rpm-track">
                      <i
                        style={{
                          width: `${Math.min(100, (e.rpm / 4900) * 100)}%`,
                        }}
                      />
                    </div>
                    <small>{e.surface.toUpperCase()}</small>
                    {e.trafficHint && (
                      <small className="traffic-status">{e.trafficHint}</small>
                    )}
                    <small className="beam-status">
                      ◌ {beamMode(e.mission, Math.abs(e.speed))}
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
                          {e.upcomingEncounter.state === "clear"
                            ? "ROAD CLEAR"
                            : e.upcomingEncounter.title}
                        </strong>
                        <span>{e.upcomingEncounter.instruction}</span>
                      </div>
                      <b>
                        {Math.max(
                          0,
                          Math.round(e.upcomingEncounter.z - e.progress),
                        )}{" "}
                        m
                      </b>
                    </div>
                  )}
                  {e.elapsed < e.rewardUntil && (
                    <div className="clean-cue">
                      ✓ CLEAN DRIVING <span>{e.totalClean} handled</span>
                    </div>
                  )}
                  {save.settings.subtitles && e.elapsed < e.notice.until && (
                    <div className="radio" role="status">
                      <span className="radio-icon">▥</span>
                      <div>
                        <span className="eyebrow">{e.notice.who}</span>
                        <p>{e.notice.text}</p>
                      </div>
                    </div>
                  )}
                  {e.phase === "ready" && (
                    <div className="ready-prompt">
                      <span className="eyebrow">
                        YOU ARE AMANI. THE CLINIC IS WAITING.
                      </span>
                      <h2>Bring them the light.</h2>
                      <p>
                        Protect the panels. Arrive before the reserve runs out.
                      </p>
                      <div className="control-hints">
                        <span>
                          <kbd>
                            {save.settings.keys.throttle.replace("Key", "")}
                          </kbd>{" "}
                          Drive
                        </span>
                        <span>
                          <kbd>
                            {save.settings.keys.left.replace("Key", "")}
                          </kbd>
                          <kbd>
                            {save.settings.keys.right.replace("Key", "")}
                          </kbd>{" "}
                          Steer
                        </span>
                        <span>
                          <kbd>
                            {save.settings.keys.brake.replace("Key", "")}
                          </kbd>{" "}
                          Brake
                        </span>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setTouch(!touch)}
                      >
                        {touch ? "Hide" : "Show"} touch controls
                      </button>
                    </div>
                  )}
                  {e.canDeliver && (
                    <div className="delivery-prompt">
                      <span>YOU MADE IT TO THE CLINIC</span>
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
                        {save.settings.singlePress ? "Press" : "Hold"}{" "}
                        {save.settings.keys.action.replace("Key", "")} · Deliver
                        solar kit
                      </button>
                      <div className="delivery-track">
                        <i
                          style={{ width: `${clamp(e.delivery, 0, 1) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {e.distance < 30 && !e.canDeliver && (
                    <div className="approach-prompt">
                      Park inside the marked bay and brake to a stop.
                    </div>
                  )}
                  {e.practice && (
                    <div className="approach-prompt">
                      Practice · records and unlocks stay unchanged
                    </div>
                  )}
                  {e.needsRecovery && (
                    <button
                      className="recover-button"
                      onClick={() => {
                        e.recover();
                        controls.current?.clear();
                      }}
                    >
                      Recover truck · −8 seconds
                    </button>
                  )}
                  {touch && (
                    <TouchControls controls={controls.current} engine={e} />
                  )}
                </>
              )}
              {e.phase === "restoring" && (
                <div className="restoration">
                  <div className="cinema-top" />
                  <div className="cinema-bottom">
                    <span className="eyebrow">
                      {e.restoreTime < 8
                        ? "DELIVERY RECEIVED"
                        : e.restoreTime < 12
                          ? "POWER IS RETURNING"
                          : "A BRIGHTER TOMORROW"}
                    </span>
                    <h2>
                      {e.restoreTime < 8
                        ? "You brought the light."
                        : e.restoreTime < 12
                          ? "One room. Then another."
                          : "Look what you made possible."}
                    </h2>
                    <p>
                      {e.restoreTime < 8
                        ? "The charged battery gives power now. Solar panels keep hope growing."
                        : e.restoreTime < 12
                          ? "The clinic is coming back to life."
                          : "The lights are back. The team can keep caring."}
                    </p>
                    {e.restoreTime >= 11 && (
                      <button className="text-button" onClick={() => e.skip()}>
                        Continue ↗
                      </button>
                    )}
                  </div>
                </div>
              )}
              {e.phase === "results" && result && (
                <div className="result-overlay">
                  <section className="result-card">
                    <span className="eyebrow">
                      {result.practice
                        ? "PRACTICE COMPLETE · NO RECORD SAVED"
                        : selected === 4
                          ? "THE REGION SHINES AGAIN"
                          : "DELIVERY COMPLETE"}
                    </span>
                    <div className="stars" aria-label={`${result.stars} stars`}>
                      {[1, 2, 3].map((n) => (
                        <span
                          key={n}
                          className={n <= result.stars ? "earned" : ""}
                        >
                          ✦
                        </span>
                      ))}
                    </div>
                    <h2>
                      {selected === 4
                        ? "A chain of light."
                        : "A brighter tomorrow."}
                    </h2>
                    <p>{mission.outcome}</p>
                    <div className="result-stats">
                      <div>
                        <strong>{result.score.toLocaleString()}</strong>
                        <span>POINTS</span>
                      </div>
                      <div>
                        <strong>{result.lives}</strong>
                        <span>LIVES SAVED</span>
                      </div>
                      <div>
                        <strong>{Math.round(result.integrity)}%</strong>
                        <span>KIT INTEGRITY</span>
                      </div>
                    </div>
                    <div className="result-caption">
                      {result.practice && "Practice only · "}
                      {time(result.remaining)} to spare ·{" "}
                      {result.mode === "relaxed" ? "Relaxed" : "Standard"} ·
                      {result.clean || 0}/{result.encounters || 0} clean passes
                      · With the clinic team
                    </div>
                    <p className="array-caption">
                      Later, the team commissions the solar array for lasting
                      power.
                    </p>
                    {selected === 4 && (
                      <div
                        className="finale-lights"
                        aria-label="Five clinics powered"
                      >
                        {MISSIONS.map((m) => (
                          <span key={m.id}>
                            ✦<small>{m.place.split(" ")[0]}</small>
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      className="primary"
                      onClick={() =>
                        result.practice
                          ? start(selected)
                          : selected < 4
                            ? start(selected + 1)
                            : home()
                      }
                    >
                      {result.practice
                        ? "Start a scored delivery"
                        : selected < 4
                          ? "The next clinic is waiting"
                          : "See the chain of light"}{" "}
                      <span>↗</span>
                    </button>
                    <div className="result-links">
                      <button className="text-button" onClick={() => start()}>
                        Drive again
                      </button>
                      <button className="text-button" onClick={home}>
                        Chapter map
                      </button>
                    </div>
                    <button
                      className="text-button arrival-replay"
                      onClick={() => {
                        e.restoreTime = 0;
                        e.phase = "restoring";
                      }}
                    >
                      Watch the lights return
                    </button>
                  </section>
                </div>
              )}
              {e.phase === "failed" && (
                <div className="modal-backdrop">
                  <section className="pause-card">
                    <span className="eyebrow">
                      THERE IS ANOTHER WAY THROUGH
                    </span>
                    <h2>A fresh start.</h2>
                    <p>{e.failure}</p>
                    <p className="muted">
                      Brake before rough ground. Take the firmer route. The team
                      is ready when you are.
                    </p>
                    <button className="primary" onClick={() => start()}>
                      Try the delivery again ↗
                    </button>
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
                    >
                      Try with more time
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        e.practiceFromCheckpoint();
                        controls.current?.clear();
                      }}
                    >
                      Practice from checkpoint · no score saved
                    </button>
                    <button className="text-button" onClick={home}>
                      Chapter map
                    </button>
                  </section>
                </div>
              )}
              {e.phase === "paused" && !showSettings && !error && (
                <div className="modal-backdrop">
                  <section className="pause-card">
                    <span className="eyebrow">THE ROAD WILL WAIT</span>
                    <h2>Take a breath.</h2>
                    <p>Your delivery and the clinic clock are paused.</p>
                    <button className="primary" onClick={pause} autoFocus>
                      Continue the journey ↗
                    </button>
                    <button className="secondary" onClick={settings}>
                      Settings & controls
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        e.practiceFromCheckpoint();
                        controls.current?.clear();
                      }}
                    >
                      Practice from checkpoint · no score saved
                    </button>
                    <button className="text-button" onClick={() => start()}>
                      Restart this delivery
                    </button>
                    <button className="text-button" onClick={home}>
                      Chapter map
                    </button>
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
                    {autopilot ? "Stop" : "Run"} driving QA
                  </button>
                  <output>
                    phase {e.phase} · z {e.progress.toFixed(0)} ·{" "}
                    {e.integrity.toFixed(0)}% · {tick} frames ·{" "}
                    {world.current?.renderer.info.render.calls} calls ·{" "}
                    {Math.round(
                      world.current?.renderer.info.render.triangles || 0,
                    )}{" "}
                    triangles · p95 {world.current?.performance.p95.toFixed(1)}{" "}
                    ms · p99 {world.current?.frames.stats.p99.toFixed(1)} ms ·
                    max {world.current?.frames.stats.max.toFixed(0)} ms ·
                    &gt;100ms {world.current?.frames.stats.over100} · &gt;250ms{" "}
                    {world.current?.frames.stats.over250}· CPU{" "}
                    {world.current?.frames.stats.physicsMs.toFixed(1)}/
                    {world.current?.frames.stats.renderMs.toFixed(1)} ms ·
                    dropped {e.droppedTime.toFixed(2)}s · pause {e.pauseEvents}{" "}
                    ({e.pauseReason}) · traffic {e.traffic.observed}/
                    {e.traffic.cars.length} · clean {e.traffic.clean}· brake{" "}
                    {e.brakeSource} {e.braking.toFixed(2)}
                  </output>
                  <output>
                    {Math.round(world.current?.frames.stats.fps || 0)} avg fps
                  </output>
                </div>
              )}
            </>
          )}
          {error && (
            <div className="modal-backdrop">
              <section className="pause-card">
                <span className="eyebrow">LET US GET YOU BACK ON THE ROAD</span>
                <h2>The scene needs a restart.</h2>
                <p>{error}</p>
                <button className="primary" onClick={() => start()}>
                  Restart drive ↗
                </button>
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
                >
                  Try low graphics
                </button>
                <button className="text-button" onClick={home}>
                  Back to chapters
                </button>
              </section>
            </div>
          )}
        </>
      )}
      {!storageOk && (
        <div className="storage-notice">
          Progress is saved for this session. Browser storage is unavailable.
        </div>
      )}
      {showSettings && (
        <SettingsPanel
          settings={save.settings}
          onChange={(s) => setSave((v) => ({ ...v, settings: s }))}
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}
