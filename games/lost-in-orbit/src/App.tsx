// @refresh reset
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type PointerEvent,
} from "react";
import { Canvas } from "@react-three/fiber";
import { CONFIG as C } from "./config";
import { GameEngine, distance, type Snapshot } from "./engine";
import { InputController } from "./input";
import { AudioManager, readSaved, save } from "./audio";
import { Scene } from "./Scene";
import "./style.css";

const timeText = (time: number) =>
  `${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(time % 60)
    .toString()
    .padStart(2, "0")}`;

function Icon({
  name,
  size = 20,
}: {
  name:
    | "arrow"
    | "sound"
    | "mute"
    | "pause"
    | "play"
    | "boost"
    | "home"
    | "cell"
    | "close"
    | "help"
    | "orbit";
  size?: number;
}) {
  const paths: Record<typeof name, ReactNode> = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    sound: (
      <>
        <path d="m11 5-6 4H2v6h3l6 4V5Z" />
        <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </>
    ),
    mute: (
      <>
        <path d="m11 5-6 4H2v6h3l6 4V5Z" />
        <path d="m16 9 6 6m0-6-6 6" />
      </>
    ),
    pause: (
      <>
        <path d="M8 5v14M16 5v14" strokeWidth="3" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7V5Z" />,
    boost: <path d="m14 2-9 12h6l-1 8 9-12h-6l1-8Z" />,
    home: (
      <>
        <path d="m4 12 8-8 8 8M6 10v10h12V10M10 20v-6h4v6" />
      </>
    ),
    cell: (
      <>
        <path d="m12 2 7 10-7 10-7-10 7-10Zm-7 10h14" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1-1.5 2M12 17v.1" />
      </>
    ),
    orbit: (
      <>
        <circle cx="12" cy="12" r="4" />
        <ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-35 12 12)" />
        <circle cx="20" cy="5" r="1.5" fill="currentColor" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function useMedia(query: string) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function Modal({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current
      ?.querySelector<HTMLElement>("button, a")
      ?.focus({ preventScroll: true });
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = ref.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], [tabindex="0"]',
      );
      if (!elements?.length) return;
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}

function Help({ touch, close }: { touch: boolean; close: () => void }) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        event.stopImmediatePropagation();
        close();
      }
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [close]);
  return (
    <Modal label="How to play Lost in Orbit">
      <button
        className="icon-button modal-close"
        onClick={close}
        aria-label="Close controls"
      >
        <Icon name="close" />
      </button>
      <span className="eyebrow">YOUR QUICK FLIGHT GUIDE</span>
      <h2>
        A little nudge
        <br />
        goes a long way.
      </h2>
      <p>
        Thrust, drift, then brake. Collect glowing cells and bring them into
        your ship’s blue docking ring at 0m. Climb and dive to reach cells at
        different heights.
      </p>
      <div className="help-controls">
        <div>
          <span>Move</span>
          <b>{touch ? "Left thumb stick" : "W A S D / ↑ ← ↓ →"}</b>
        </div>
        <div>
          <span>Climb / dive</span>
          <b>{touch ? "Hold ↑ / ↓" : "Hold Q / C"}</b>
        </div>
        <div>
          <span>Brake</span>
          <b>{touch ? "Hold Brake" : "Hold Space"}</b>
        </div>
        <div>
          <span>Boost</span>
          <b>{touch ? "Tap Boost" : "Tap Shift"}</b>
        </div>
        <div>
          <span>Deposit cargo</span>
          <b>{touch ? "Tap Deposit near ship" : "Press E near ship"}</b>
        </div>
        <div>
          <span>Pause</span>
          <b>{touch ? "Pause button" : "Escape"}</b>
        </div>
      </div>
      <div className="help-note">
        <Icon name="cell" />
        <span>
          Carry up to two cells. Bumps can drop one, but you can always pick it
          back up. Orange lines warn of incoming asteroids: move off their path!
          Close dodges recharge your boost.
        </span>
      </div>
      <button className="primary" onClick={close}>
        Got it <Icon name="arrow" />
      </button>
    </Modal>
  );
}

function TouchJoystick({
  input,
  disabled,
}: {
  input: InputController;
  disabled: boolean;
}) {
  const pointer = useRef<number | null>(null),
    origin = useRef({ x: 0, y: 0 });
  const knob = useRef<HTMLSpanElement>(null);
  const update = (event: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    const dx = event.clientX - origin.current.x,
      dy = event.clientY - origin.current.y;
    const length = Math.hypot(dx, dy),
      divisor = Math.max(42, length);
    input.joystick.x = dx / divisor;
    input.joystick.z = dy / divisor;
    if (knob.current)
      knob.current.style.transform = `translate(${(dx / divisor) * 42}px, ${(dy / divisor) * 42}px)`;
  };
  const release = (event?: PointerEvent<HTMLDivElement>) => {
    if (event && event.pointerId !== pointer.current) return;
    pointer.current = null;
    input.joystick.x = 0;
    input.joystick.z = 0;
    if (knob.current) knob.current.style.transform = "";
  };
  useEffect(() => {
    if (disabled) release();
  }, [disabled]);
  return (
    <div className="joystick-wrap">
      <div
        className="joystick"
        role="group"
        aria-label="Movement joystick"
        onPointerDown={(event) => {
          if (disabled || pointer.current !== null) return;
          event.preventDefault();
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          const rect = event.currentTarget.getBoundingClientRect();
          origin.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
          update(event);
        }}
        onPointerMove={update}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <i />
        <span ref={knob}>
          <Icon name="orbit" size={26} />
        </span>
      </div>
      <span className="micro-label">THRUST & DRIFT</span>
    </div>
  );
}

function MiniMap({ engine }: { engine: GameEngine }) {
  return (
    <div className="minimap" aria-label="Rescue area map">
      <svg
        viewBox="-42 -32 84 64"
        role="img"
        aria-label="Your ship is at the center; diamonds are energy cells"
      >
        <ellipse
          rx="39"
          ry="29"
          fill="none"
          stroke="#9baec1"
          strokeOpacity=".15"
          strokeWidth=".6"
        />
        <path
          d="M-40 0h80M0-30v60"
          stroke="#9baec1"
          strokeOpacity=".1"
          strokeWidth=".5"
        />
        {engine.asteroids.map((a, i) => (
          <circle
            key={i}
            cx={a.x}
            cy={a.z}
            r={a.radius * 0.65}
            fill="#7f92a7"
            opacity=".38"
          />
        ))}
        {engine.meteors
          .filter((m) => m.active)
          .map((m, i) => (
            <circle key={`m${i}`} cx={m.x} cy={m.z} r="1.4" fill="#ff986a" />
          ))}
        <circle r="3" fill="none" stroke="#56ddf5" strokeWidth=".9" />
        {engine.cells
          .filter(
            (cell) => cell.state === "floating" || cell.state === "dropped",
          )
          .map((cell) => (
            <path
              key={cell.id}
              d={`M${cell.x} ${cell.z - 1.8}l1.4 1.8-1.4 1.8-1.4-1.8Z`}
              fill="#ffd166"
            />
          ))}
        <circle
          cx={engine.player.x}
          cy={engine.player.z}
          r="1.8"
          fill="#fff8e9"
        />
      </svg>
      <span>RESCUE AREA</span>
    </div>
  );
}

function objective(state: Snapshot, touch: boolean) {
  if (state.boundary) return "Return to the rescue area";
  if (state.docking && state.cargo)
    return touch
      ? "You’re home. Tap Deposit to power up."
      : "You’re home. Press E to power up.";
  if (state.notice) return state.notice;
  if (state.cargo === 2) return "Cargo full — return to your ship at 0m";
  if (state.tutorial === 0)
    return touch
      ? "Move the thumb stick to fire your jetpack"
      : "Use WASD or arrow keys to fire your jetpack";
  if (state.tutorial === 1)
    return touch ? "Hold Brake to slow your drift" : "Hold Space to brake";
  if (state.tutorial === 2)
    return touch
      ? "Use ↑ / ↓ to match a cell’s altitude"
      : "Q climbs · C dives. Match the cell’s altitude.";
  if (state.tutorial === 3 && state.cargo)
    return "Bring your energy cell back to the ship";
  if (state.tutorial === 4)
    return touch
      ? "Hold a direction and tap Boost"
      : "Hold a direction and tap Shift to boost";
  return state.cargo
    ? "Find one more spark, or head home"
    : `${5 - state.power} ${5 - state.power === 1 ? "spark" : "sparks"} still out there. Follow the gold.`;
}

class GameBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? <Failure /> : this.props.children;
  }
}
function Failure() {
  return (
    <div className="failure">
      <Icon name="orbit" size={50} />
      <h1>A small detour.</h1>
      <p>
        We couldn’t start the 3D scene. Try a recent browser with hardware
        acceleration enabled, then reload.
      </p>
      <button className="primary" onClick={() => location.reload()}>
        Try again <Icon name="arrow" />
      </button>
      <a href="/games">Back to Games</a>
    </div>
  );
}
function webGLSupported() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export default function App() {
  const [engine] = useState(() => new GameEngine());
  const [audio] = useState(() => new AudioManager());
  const [input] = useState(
    () =>
      new InputController(engine, () => {
        void audio.unlock();
      }),
  );
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const [ready, setReady] = useState(false),
    [help, setHelp] = useState(false),
    [muted, setMuted] = useState(audio.muted);
  const [best, setBest] = useState(() => {
    const value = Number(readSaved("best-3d"));
    return Number.isFinite(value) && value > 0 ? value : null;
  });
  const [supported] = useState(webGLSupported),
    [contextLost, setContextLost] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const coarsePointer = useMedia("(pointer: coarse)"),
    reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const [touchOverride, setTouchOverride] = useState(false);
  const touch = coarsePointer || touchOverride;
  const home = useRef<HTMLDivElement>(null),
    cell = useRef<HTMLDivElement>(null),
    dock = useRef<HTMLDivElement>(null),
    danger = useRef<HTMLDivElement>(null);
  const readyCallback = useCallback(() => setReady(true), []);
  const closeHelp = useCallback(() => setHelp(false), []);
  const gameArea = useRef<HTMLElement>(null);
  const title = state.phase === "title";
  const nextCell = engine.cells
    .filter((c) => c.state === "floating" || c.state === "dropped")
    .sort((a, b) => distance(engine.player, a) - distance(engine.player, b))[0];
  const targetHeight = state.cargo === 2 || !nextCell ? 0 : nextCell.y;
  const start = () => {
    input.clear();
    void audio.unlock();
    engine.reset("playing");
    gameArea.current?.focus({ preventScroll: true });
  };
  const resume = () => {
    if (document.hidden) return;
    input.clear();
    void audio.unlock();
    engine.resume();
    gameArea.current?.focus({ preventScroll: true });
  };
  const toggleSound = () => {
    const value = !audio.muted;
    audio.setMuted(value);
    setMuted(value);
  };

  useEffect(() => {
    const detach = input.attach();
    const visibility = () => {
      setHidden(document.hidden);
      if (document.hidden) audio.suspend();
    };
    document.addEventListener("visibilitychange", visibility);
    const off = engine.subscribe(() => {
      if (engine.phase === "paused") audio.suspend();
    });
    return () => {
      detach();
      off();
      document.removeEventListener("visibilitychange", visibility);
      audio.dispose();
    };
  }, [input, audio, engine]);
  useEffect(() => {
    if (state.phase !== "winning" && state.phase !== "results") return;
    if (!best || state.time < best) {
      setBest(state.time);
      save("best-3d", String(state.time));
    }
  }, [state.phase, state.time, best]);
  // Dev-only observation for deterministic browser QA; production exposes no engine or cheats.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const target = window as unknown as {
      __orbit?: { engine: GameEngine; input: InputController };
    };
    target.__orbit = { engine, input };
    return () => {
      delete target.__orbit;
    };
  }, [engine, input]);
  useEffect(() => {
    if (!import.meta.env.DEV || !new URLSearchParams(location.search).has("qa"))
      return;
    let dispose: (() => void) | undefined,
      cancelled = false;
    void import("../qa/browser-check").then(({ attachFlightCheck }) => {
      if (!cancelled) dispose = attachFlightCheck(engine, input);
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [engine, input]);

  if (!supported || contextLost) return <Failure />;
  return (
    <GameBoundary>
      <main
        ref={gameArea}
        className={`game ${title ? "is-title" : ""} ${touch ? "is-touch" : ""}`}
        tabIndex={-1}
        aria-label="Lost in Orbit space rescue game"
      >
        <div className="cosmos" aria-hidden="true" />
        <div className="nebula nebula-one" aria-hidden="true" />
        <div className="nebula nebula-two" aria-hidden="true" />
        <div className="scene" aria-hidden="true">
          <Canvas
            camera={{
              position: [0, 29, 19],
              fov: C.rendering.fov,
              near: 0.1,
              far: 350,
            }}
            dpr={[1, touch ? C.rendering.mobileDpr : C.rendering.maxDpr]}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
            }}
            frameloop={
              hidden ||
              state.phase === "paused" ||
              state.phase === "results" ||
              (title && reducedMotion)
                ? "demand"
                : "always"
            }
            onCreated={({ gl }) => {
              gl.domElement.addEventListener(
                "webglcontextlost",
                (event) => {
                  event.preventDefault();
                  engine.pause();
                  audio.suspend();
                  setContextLost(true);
                },
                { once: true },
              );
            }}
            fallback={<Failure />}
          >
            <Scene
              engine={engine}
              input={input}
              audio={audio}
              reducedMotion={reducedMotion}
              indicators={{ home, cell, dock, danger }}
              onReady={readyCallback}
            />
          </Canvas>
        </div>
        <div className="vignette" aria-hidden="true" />

        {title ? (
          <>
            <header className="title-top">
              <a className="back-link" href="/games">
                <span>←</span> ALL GAMES
              </a>
              <span className="studio">
                <Icon name="orbit" /> GLOBAL SOLUTIONS LAB{" "}
                <span className="studio-divider">/</span> PLAY
              </span>
              <span className="edition">MISSION 001</span>
            </header>
            <section className="title-content" aria-label="Start your rescue">
              <div className="eyebrow title-eyebrow">
                <span className="status-dot" /> A LITTLE SPACE ADVENTURE
              </div>
              <h1>
                Lost in
                <br />
                <em>Orbit.</em>
              </h1>
              <p className="title-premise">
                A little astronaut.
                <br /> A big way home.
              </p>
              <p className="title-description">
                Climb, dive, and dodge incoming asteroids. Recover{" "}
                <strong>5 energy cells</strong> and get home.
              </p>
              <button
                className="primary start-button"
                onClick={start}
                disabled={!ready}
              >
                {ready ? "Start Rescue" : "Preparing orbit…"}
                <Icon name="arrow" size={24} />
              </button>
              <div className="title-details">
                <span>3–5 MINUTES</span>
                <i />
                <span>NO WRONG TURNS. JUST LITTLE DETOURS.</span>
              </div>
            </section>
            <div className="astronaut-caption" aria-hidden="true">
              <span className="caption-line" />
              <span>
                EXPLORER 01
                <br />
                <b>Small, but going places.</b>
              </span>
            </div>
            <footer className="title-footer">
              <span className="flight-note">
                <span>01</span> FIND YOUR FEET. THEN LEAVE THE GROUND.
              </span>
              <div className="footer-actions">
                {!coarsePointer && (
                  <button
                    className="text-button touch-toggle"
                    onClick={() => setTouchOverride(!touchOverride)}
                    aria-pressed={touchOverride}
                  >
                    Touch controls {touchOverride ? "on" : "off"}
                  </button>
                )}
                <button
                  className="text-button"
                  onClick={toggleSound}
                  aria-pressed={!muted}
                >
                  <Icon name={muted ? "mute" : "sound"} /> Sound{" "}
                  {muted ? "off" : "on"}
                </button>
                <button className="text-button" onClick={() => setHelp(true)}>
                  <Icon name="help" /> How to play
                </button>
              </div>
            </footer>
          </>
        ) : (
          <>
            <header className="hud-top">
              <div className="mission-panel">
                <div className="mission-label">
                  <Icon name="orbit" size={19} />
                  <span>SHIP POWER</span>
                  <b>
                    {state.power}
                    <span> / 5</span>
                  </b>
                </div>
                <div className="power-segments" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i key={i} className={i < state.power ? "filled" : ""} />
                  ))}
                </div>
                <div className="cargo-label">
                  <span>Cargo</span>
                  <div>
                    {[0, 1].map((i) => (
                      <span
                        key={i}
                        className={
                          i < state.cargo ? "cargo-cell filled" : "cargo-cell"
                        }
                      >
                        <Icon name="cell" size={16} />
                      </span>
                    ))}
                  </div>
                  <span>{state.cargo} / 2</span>
                </div>
                <span className="sr-only">
                  Ship power: {state.power} / 5. Cargo: {state.cargo} / 2.
                </span>
              </div>
              <div className="objective" role="status" aria-live="polite">
                <span className="micro-label">
                  {state.phase === "winning"
                    ? "MISSION COMPLETE"
                    : "A LITTLE CLOSER TO HOME"}
                </span>
                <span>
                  {state.phase === "winning"
                    ? "All systems online. Next stop: home."
                    : objective(state, touch)}
                </span>
              </div>
              <div className="flight-controls">
                <div className="timer">
                  <span className="micro-label">FLIGHT TIME</span>
                  <time aria-label={`Elapsed time ${timeText(state.time)}`}>
                    {timeText(state.time)}
                  </time>
                </div>
                <button
                  className="icon-button"
                  onClick={toggleSound}
                  aria-label={muted ? "Unmute sound" : "Mute sound"}
                  aria-pressed={muted}
                >
                  <Icon name={muted ? "mute" : "sound"} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => engine.pause()}
                  aria-label="Pause game"
                >
                  <Icon name="pause" />
                </button>
              </div>
            </header>
            <div className="indicator home-indicator" ref={home}>
              <span className="direction-arrow">➜</span>
              <Icon name="home" size={16} />
              <span>HOME</span>
            </div>
            <div className="indicator cell-indicator" ref={cell}>
              <span className="direction-arrow">➜</span>
              <Icon name="cell" size={16} />
              <span data-energy-label>ENERGY</span>
            </div>
            <div className="indicator danger-indicator" ref={danger}>
              <span className="direction-arrow">➜</span>
              <span>INCOMING</span>
            </div>
            <div
              className={`threat-status ${state.incoming > 0 && !state.sheltered ? "is-warning" : ""}`}
            >
              <span className="threat-dot" />
              {state.sheltered
                ? "SHIP SHIELD · SAFE HARBOR"
                : state.incoming > 0
                  ? "INCOMING ASTEROIDS · DODGE THE ORANGE PATH"
                  : "SCANNING FOR INCOMING ASTEROIDS"}
              {state.dodges > 0 && (
                <b>
                  {state.dodges} CLOSE {state.dodges === 1 ? "DODGE" : "DODGES"}
                </b>
              )}
            </div>
            <div className="altitude-hud">
              <span className="micro-label">ALTITUDE</span>
              <strong>
                {state.altitude.toFixed(1)}
                <small> m</small>
              </strong>
              <span className="altitude-track">
                <i
                  style={{
                    bottom: `${((state.altitude - C.altitude.min) / (C.altitude.max - C.altitude.min)) * 100}%`,
                  }}
                />
              </span>
              <span className="altitude-target">
                {Math.abs(targetHeight - state.altitude) > 1.2
                  ? targetHeight > state.altitude
                    ? "↑ CLIMB"
                    : "↓ DIVE"
                  : "✓ LEVEL"}
                <small>
                  {state.cargo === 2 || !nextCell ? "SHIP" : "CELL"}{" "}
                  {targetHeight.toFixed(0)}m
                </small>
              </span>
            </div>
            <div className="dock-action" ref={dock}>
              <button className="deposit-button" onClick={input.deposit}>
                <Icon name="cell" />
                {touch ? "Deposit cargo" : "E · Deposit cargo"}
              </button>
            </div>
            <div className="hud-bottom">
              {touch ? (
                <TouchJoystick
                  input={input}
                  disabled={state.phase !== "playing"}
                />
              ) : (
                <div className="keyboard-guide">
                  <div>
                    <kbd>W A S D</kbd>
                    <span>thrust</span>
                    <kbd>Q / C</kbd>
                    <span>climb / dive</span>
                    <kbd>SPACE</kbd>
                    <span>brake</span>
                  </div>
                  <span className="micro-label">
                    DODGE THE ORANGE PATHS. CLOSE CALLS RECHARGE YOUR BOOST.
                  </span>
                </div>
              )}
              <MiniMap engine={engine} />
              <div className="action-controls">
                {touch && (
                  <div className="altitude-controls">
                    {[1, -1].map((direction) => (
                      <button
                        key={direction}
                        aria-label={
                          direction > 0 ? "Hold to climb" : "Hold to dive"
                        }
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                          input.altitude(event.pointerId, direction);
                        }}
                        onPointerUp={(event) =>
                          input.altitude(event.pointerId, 0)
                        }
                        onPointerCancel={(event) =>
                          input.altitude(event.pointerId, 0)
                        }
                        onLostPointerCapture={(event) =>
                          input.altitude(event.pointerId, 0)
                        }
                      >
                        <b>{direction > 0 ? "↑" : "↓"}</b>
                        <span>{direction > 0 ? "CLIMB" : "DIVE"}</span>
                      </button>
                    ))}
                  </div>
                )}
                {touch && (
                  <button
                    className="brake-button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      input.brake(event.pointerId, true);
                    }}
                    onPointerUp={(event) => input.brake(event.pointerId, false)}
                    onPointerCancel={(event) =>
                      input.brake(event.pointerId, false)
                    }
                    onLostPointerCapture={(event) =>
                      input.brake(event.pointerId, false)
                    }
                    aria-label="Hold to brake"
                  >
                    <Icon name="pause" />
                    <span>BRAKE</span>
                  </button>
                )}
                <button
                  className={`boost-button ${state.cooldown > 0 ? "recharging" : ""}`}
                  style={
                    {
                      "--charge": `${(1 - state.cooldown / C.movement.boostCooldown) * 100}%`,
                    } as React.CSSProperties
                  }
                  onClick={input.boost}
                  disabled={state.cooldown > 0 || state.phase !== "playing"}
                  aria-label={
                    state.cooldown > 0
                      ? `Boost recharging ${state.cooldown.toFixed(1)} seconds`
                      : "Activate boost"
                  }
                >
                  <span className="boost-core">
                    <Icon name="boost" size={26} />
                  </span>
                  <span>
                    {state.cooldown > 0
                      ? `${state.cooldown.toFixed(1)}s`
                      : "BOOST"}
                    <small>
                      {touch
                        ? state.cooldown > 0
                          ? "RECHARGING"
                          : "READY"
                        : "SHIFT"}
                    </small>
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
        {state.phase === "paused" && !help && (
          <Modal label="Rescue paused">
            <span className="modal-symbol">
              <Icon name="pause" size={30} />
            </span>
            <span className="eyebrow">TAKE YOUR TIME</span>
            <h2>Space can wait.</h2>
            <p>
              Your rescue is safely paused.
              <br />
              Pick up right where you left off.
            </p>
            <button className="primary" onClick={resume}>
              Resume Rescue <Icon name="play" />
            </button>
            <div className="modal-secondary">
              <button className="text-button" onClick={() => setHelp(true)}>
                <Icon name="help" /> Controls
              </button>
              <button className="text-button" onClick={toggleSound}>
                <Icon name={muted ? "mute" : "sound"} /> Sound{" "}
                {muted ? "off" : "on"}
              </button>
            </div>
            <button className="quiet-button" onClick={start}>
              Restart rescue
            </button>
            <a className="quiet-button" href="/games">
              Back to Games
            </a>
          </Modal>
        )}
        {state.phase === "results" && (
          <Modal label="Rescue complete">
            <span className="success-orbit">
              <Icon name="orbit" size={46} />
            </span>
            <span className="eyebrow">FIVE SPARKS. ONE WAY HOME.</span>
            <h2>
              You made
              <br />
              it home!
            </h2>
            <p>
              Through the asteroid storm, all the way home.
              <br />
              Thanks for bringing every spark back.
            </p>
            <div className="result-stats">
              <div>
                <span>YOUR TIME</span>
                <b>{timeText(state.time)}</b>
              </div>
              <div>
                <span>CLOSE DODGES</span>
                <b>{state.dodges}</b>
              </div>
              <div>
                <span>PERSONAL BEST</span>
                <b>{best ? timeText(best) : timeText(state.time)}</b>
              </div>
            </div>
            <button className="primary" onClick={start}>
              Play Again <Icon name="arrow" />
            </button>
            <button
              className="quiet-button"
              onClick={() => {
                input.clear();
                engine.reset("title");
              }}
            >
              Back to Title
            </button>
            <a className="quiet-button" href="/games">
              Explore more games
            </a>
          </Modal>
        )}
        {help && <Help touch={touch} close={closeHelp} />}
      </main>
    </GameBoundary>
  );
}
