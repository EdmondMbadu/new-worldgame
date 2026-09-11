// @refresh reset
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as T from "three";
import { CONFIG as C } from "./config";
import { GameEngine, distance, type GameEvent } from "./engine";
import type { InputController } from "./input";
import type { AudioManager } from "./audio";
import { buildWorld } from "./models";

export type IndicatorRefs = {
  home: RefObject<HTMLDivElement | null>;
  cell: RefObject<HTMLDivElement | null>;
  dock: RefObject<HTMLDivElement | null>;
  danger: RefObject<HTMLDivElement | null>;
};
type Props = {
  engine: GameEngine;
  input: InputController;
  audio: AudioManager;
  reducedMotion: boolean;
  indicators: IndicatorRefs;
  onReady: () => void;
};

export function Scene({
  engine,
  input,
  audio,
  reducedMotion,
  indicators,
  onReady,
}: Props) {
  const world = useMemo(buildWorld, []);
  const { camera, scene, size, setDpr, gl } = useThree();
  const visualTime = useRef(0),
    lastRound = useRef(-1),
    frameCount = useRef(0),
    frameTime = useRef(0);
  const scratch = useMemo(
    () => ({
      target: new T.Vector3(),
      focus: new T.Vector3(),
      projected: new T.Vector3(),
      dummy: new T.Object3D(),
      color: new T.Color(),
      direction: new T.Vector3(),
      up: new T.Vector3(0, 1, 0),
    }),
    [],
  );
  const cameraFocus = useRef(new T.Vector3());
  const cursor = useRef(0),
    spawnClock = useRef(0),
    shake = useRef(0),
    slowTime = useRef(0);
  const particles = useMemo(
    () =>
      Array.from({ length: C.rendering.particles }, () => ({
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        color: "#56ddf5",
      })),
    [],
  );
  const depositedAt = useRef(
    new Map<number, { t: number; x: number; y: number; z: number }>(),
  );
  const lastCellStates = useRef<string[]>([]);

  function spawn(
    x: number,
    y: number,
    z: number,
    color: string,
    burst: number,
    speed = 2,
  ) {
    for (let i = 0; i < burst; i++) {
      const particle = particles[cursor.current++ % particles.length];
      const life = 0.35 + Math.random() * 0.5;
      Object.assign(particle, {
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.3) * speed,
        vz: (Math.random() - 0.5) * speed,
        life,
        maxLife: life,
        color,
      });
    }
  }

  useEffect(() => {
    scene.environment = world.environment;
    const off = engine.onEvent((event: GameEvent) => {
      audio.play(event);
      if (event.type === "reset") {
        particles.forEach((p) => (p.life = 0));
        depositedAt.current.clear();
        lastCellStates.current = [];
        shake.current = 0;
      }
      if (event.type === "impact") shake.current = 0.4;
      if (event.type === "pickup" || event.type === "deposit")
        spawn(
          event.x,
          event.y + 1.1,
          event.z,
          "#ffd166",
          reducedMotion ? 5 : 18,
          4,
        );
      if (event.type === "impact")
        spawn(
          event.x,
          event.y + 1,
          event.z,
          "#8ae9ff",
          reducedMotion ? 5 : 16,
          6,
        );
      if (event.type === "boost")
        spawn(
          event.x,
          event.y + 0.5,
          event.z,
          "#69e6ff",
          reducedMotion ? 3 : 12,
          3,
        );
    });
    onReady();
    return () => {
      off();
      scene.environment = null;
      world.dispose();
    };
    // Resources belong to this mounted canvas; preference changes update particles via the frame loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, engine, audio, scene, onReady]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, C.timing.maxDelta);
    engine.step(rawDelta, input.read());
    const title = engine.phase === "title";
    const active =
      engine.phase === "playing" || engine.phase === "winning" || title;
    if (active) visualTime.current += delta;
    const t = visualTime.current,
      p = engine.player;
    if (lastRound.current !== engine.round) {
      lastRound.current = engine.round;
      cameraFocus.current.set(
        title ? 0 : p.x,
        title ? 0 : p.y + 1,
        title ? 0 : p.z,
      );
      depositedAt.current.clear();
      lastCellStates.current = [];
    }
    const narrow = size.width / size.height < 0.85;
    // The orientation stays fixed: +X is screen-right and -Z is screen-up.
    // Portrait pulls back just enough to preserve a useful horizontal corridor.
    const framing = narrow
      ? Math.min(1.6, 0.95 / (size.width / size.height))
      : 1;
    const focus = scratch.focus.set(
      title ? 1 : p.x + p.vx * 0.7,
      title ? 0 : p.y + 1 + p.vy * 0.2,
      title ? 0 : p.z + p.vz * 0.7,
    );
    if (active) cameraFocus.current.lerp(focus, 1 - Math.exp(-delta * 3.8));
    const cameraOffset = title
      ? [0, 25, 19]
      : [0, C.rendering.cameraHeight, C.rendering.cameraDepth];
    camera.position
      .copy(cameraFocus.current)
      .add(
        scratch.target.set(
          cameraOffset[0],
          cameraOffset[1] * framing,
          cameraOffset[2] * framing,
        ),
      );
    shake.current = Math.max(0, shake.current - delta);
    if (!reducedMotion && engine.phase === "playing" && shake.current > 0)
      camera.position.x += Math.sin(t * 63) * shake.current * 0.17;
    if (camera instanceof T.PerspectiveCamera) {
      const targetFov = title
        ? 47
        : C.rendering.fov + (!reducedMotion && p.boosting > 0 ? 5 : 0);
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-delta * 4));
      camera.updateProjectionMatrix();
    }
    camera.lookAt(cameraFocus.current);
    camera.updateMatrixWorld();

    const bob = reducedMotion ? 0 : Math.sin(t * 1.6) * 0.1;
    if (title) {
      world.astronaut.position.set(
        narrow ? 2.7 : 8.8,
        2 + bob * 3,
        narrow ? (size.height < 740 ? -25 : -16) : 0.1,
      );
      world.astronaut.scale.setScalar(narrow ? 2.6 : 3.0);
      world.astronaut.rotation.set(
        -0.12,
        -0.35 + (reducedMotion ? 0 : Math.sin(t * 0.27) * 0.08),
        -0.12,
      );
    } else {
      world.astronaut.scale.setScalar(1);
      world.astronaut.position.set(p.x, p.y + 1.45 + bob, p.z);
      world.astronaut.rotation.set(
        -p.vy * 0.045 + p.thrust * 0.16,
        p.facing,
        reducedMotion ? 0 : -p.vx * 0.028 + Math.sin(t * 3) * 0.018 * p.thrust,
      );
    }
    if (
      engine.phase === "winning" ||
      (engine.phase === "paused" && engine.previousPhase === "winning") ||
      engine.phase === "results"
    ) {
      const progress = engine.launchTime;
      world.astronaut.visible = progress < 1.1;
      if (progress < 1.1)
        world.astronaut.scale.setScalar(Math.max(0.01, 1 - progress / 1.1));
      world.ship.position.y = Math.max(0, progress - 1.1) ** 2 * 4;
      world.ship.position.z = -(Math.max(0, progress - 1.1) ** 2) * 9;
    } else {
      world.astronaut.visible = true;
      world.ship.position.set(
        title && narrow ? -6 : 0,
        0,
        title && narrow ? -14 : 0,
      );
    }
    world.ship.scale.setScalar(title && narrow ? 0.85 : 1);
    world.ship.rotation.x = title ? -0.03 : 0;
    world.astronautHalo.position.set(p.x, p.y - 0.3, p.z);
    world.astronautHalo.visible = !title;
    world.arms.forEach(
      (arm, i) =>
        (arm.rotation.z =
          (i ? 1 : -1) * (title ? 0.28 : 0.17 + p.thrust * 0.2)),
    );
    world.flames.forEach((flame) => {
      flame.visible = title || p.thrust > 0.05 || p.boosting > 0 || p.braking;
      flame.scale.y =
        (title ? 0.7 : p.braking ? 0.22 : p.boosting > 0 ? 1.8 : 0.6) *
        (reducedMotion ? 1 : 0.85 + Math.sin(t * 35) * 0.15);
    });
    world.shield.visible = !title && p.immunity > 0;
    world.shieldMaterial.opacity = Math.min(0.24, p.immunity * 0.2);
    world.shield.rotation.y = reducedMotion ? 0 : t * 0.4;
    world.segments.forEach((segment, index) => {
      const material = segment.material as T.MeshStandardMaterial;
      material.color.set(index < engine.power ? "#a5f4e9" : "#294851");
      material.emissiveIntensity = index < engine.power ? 1.8 : 0.05;
    });
    world.engineFlames.forEach((flame) => {
      flame.visible = engine.launchTime > 1;
      flame.scale.y = 2.3 + Math.sin(t * 40) * 0.2;
    });
    world.dockMaterial.opacity = !title && engine.docking ? 0.8 : 0.24;
    world.dockingRing.scale.setScalar(
      engine.docking && !reducedMotion ? 1 + Math.sin(t * 3) * 0.015 : 1,
    );
    world.boundary.visible = !title && engine.boundary;
    world.asteroids.forEach((group, i) => {
      const a = engine.asteroids[i];
      group.position.set(a.x, a.y + 1.45, a.z);
      if (!reducedMotion)
        group.rotation.set(
          t * 0.024 + i,
          t * 0.032 + i * 2,
          Math.sin(t * 0.04 + i) * 0.1,
        );
    });
    world.shelter.visible = !title;
    world.shelterMaterial.opacity = engine.sheltered ? 0.07 : 0.025;
    world.meteors.forEach((visual, i) => {
      const meteor = engine.meteors[i];
      const visible = !title && meteor.active;
      visual.group.visible = visible;
      visual.path.visible = visible;
      visual.target.visible = visible && meteor.age < C.threats.warning + 2.8;
      if (!visible) return;
      const warning = meteor.age < C.threats.warning;
      scratch.direction.set(meteor.vx, meteor.vy, meteor.vz).normalize();
      visual.group.position.set(meteor.x, meteor.y + 1.45, meteor.z);
      visual.group.quaternion.setFromUnitVectors(scratch.up, scratch.direction);
      visual.rock.rotation.set(t * 1.7 + i, t * 0.9, i);
      visual.trail.visible = !warning;
      visual.hot.scale.setScalar(
        1 + (reducedMotion ? 0 : Math.sin(t * 9) * 0.05),
      );
      visual.pathMaterial.opacity = warning ? 0.45 : 0.12;
      const positions = visual.path.geometry.getAttribute(
        "position",
      ) as T.BufferAttribute;
      positions.setXYZ(0, meteor.x, meteor.y + 1.45, meteor.z);
      positions.setXYZ(
        1,
        meteor.target.x + meteor.vx * 1.2,
        meteor.target.y + 1.45 + meteor.vy * 1.2,
        meteor.target.z + meteor.vz * 1.2,
      );
      positions.needsUpdate = true;
      visual.path.computeLineDistances();
      visual.target.position.set(
        meteor.target.x,
        meteor.target.y + 1.45,
        meteor.target.z,
      );
      visual.target.quaternion.copy(camera.quaternion);
      visual.target.scale.setScalar(
        warning && !reducedMotion ? 1 + Math.sin(t * 7) * 0.08 : 1,
      );
    });
    let cargoSlot = 0;
    world.cells.forEach(({ group, groundRing }, i) => {
      const cell = engine.cells[i];
      if (cell.state === "deposited" && lastCellStates.current[i] === "carried")
        depositedAt.current.set(i, {
          t,
          x: group.position.x,
          y: group.position.y,
          z: group.position.z,
        });
      lastCellStates.current[i] = cell.state;
      const transit = depositedAt.current.get(i);
      group.visible =
        cell.state !== "deposited" || (!!transit && t - transit.t < 0.85);
      if (!group.visible) return;
      group.rotation.y = reducedMotion ? 0.4 : t * 1.1 + i;
      groundRing.visible =
        cell.state === "floating" || cell.state === "dropped";
      if (cell.state === "carried") {
        const side = cargoSlot++ === 0 ? -1 : 1;
        group.scale.setScalar(0.5);
        group.position.set(
          p.x - Math.sin(p.facing) * 0.9 + Math.cos(p.facing) * 0.62 * side,
          p.y + 1.9 + bob,
          p.z - Math.cos(p.facing) * 0.9 - Math.sin(p.facing) * 0.62 * side,
        );
      } else if (cell.state === "deposited" && transit) {
        const f = Math.min(1, (t - transit.t) / 0.85);
        group.scale.setScalar(0.5 * (1 - f));
        group.position.set(
          transit.x * (1 - f),
          transit.y + Math.sin(f * Math.PI) * 2,
          transit.z * (1 - f),
        );
      } else {
        group.scale.setScalar(cell.state === "dropped" ? 0.8 : 1);
        group.position.set(cell.x, cell.y + 0.6 + bob, cell.z);
      }
    });

    if (engine.phase === "playing") {
      audio.thrust(p.thrust + (p.braking ? 0.25 : 0), p.boosting > 0);
      spawnClock.current += delta;
      if (
        p.thrust > 0.05 &&
        spawnClock.current > (reducedMotion ? 0.15 : 0.035)
      ) {
        spawnClock.current = 0;
        spawn(
          p.x - Math.sin(p.facing) * 0.7,
          p.y + 0.6,
          p.z - Math.cos(p.facing) * 0.7,
          "#77dfff",
          p.boosting > 0 ? 3 : 1,
          0.6,
        );
      }
    } else audio.thrust(0, false);
    particles.forEach((particle, i) => {
      if (active && particle.life > 0) {
        particle.life -= delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.z += particle.vz * delta;
      }
      scratch.dummy.position.set(particle.x, particle.y, particle.z);
      scratch.dummy.scale.setScalar(
        particle.life > 0 ? (particle.life / particle.maxLife) * 1.3 : 0,
      );
      scratch.dummy.updateMatrix();
      world.particleMesh.setMatrixAt(i, scratch.dummy.matrix);
      scratch.color.set(particle.color);
      world.particleMesh.setColorAt(i, scratch.color);
    });
    world.particleMesh.instanceMatrix.needsUpdate = true;
    if (world.particleMesh.instanceColor)
      world.particleMesh.instanceColor.needsUpdate = true;

    const project = (
      element: HTMLDivElement | null,
      x: number,
      z: number,
      onlyOutside: boolean,
      y = 1,
    ) => {
      if (!element) return;
      if (engine.phase !== "playing") {
        element.style.display = "none";
        return;
      }
      scratch.projected.set(x, y, z).project(camera);
      const behind = scratch.projected.z > 1;
      const nx = scratch.projected.x * (behind ? -1 : 1),
        ny = scratch.projected.y * (behind ? -1 : 1);
      const outside =
        Math.abs(nx) > 0.79 || Math.abs(ny) > 0.73 || scratch.projected.z > 1;
      if (onlyOutside && !outside) {
        element.style.display = "none";
        return;
      }
      const marginX = size.width < 600 ? 100 : 144,
        marginY = size.width < 600 ? 190 : size.height < 500 ? 82 : 115;
      const cx = size.width / 2,
        cy = size.height / 2;
      const dx = nx * cx,
        dy = -ny * cy;
      const factor = outside
        ? Math.min(
            (cx - marginX) / Math.max(Math.abs(dx), 0.01),
            (cy - marginY) / Math.max(Math.abs(dy), 0.01),
            1,
          )
        : 1;
      element.style.display = "flex";
      element.style.left = `${cx + dx * factor}px`;
      element.style.top = `${cy + dy * factor}px`;
      element.style.setProperty("--angle", `${Math.atan2(dy, dx)}rad`);
    };
    project(indicators.home.current, 0, 0, true);
    const next =
      engine.cargo < 2
        ? engine.cells
            .filter((c) => c.state === "floating" || c.state === "dropped")
            .sort((a, b) => distance(p, a) - distance(p, b))[0]
        : undefined;
    if (next) {
      project(indicators.cell.current, next.x, next.z, true, next.y + 1.2);
      const label = indicators.cell.current?.querySelector(
        "[data-energy-label]",
      );
      if (label)
        label.textContent =
          Math.abs(next.y - p.y) > 1.2
            ? `ENERGY ${next.y > p.y ? "↑" : "↓"} ${Math.abs(next.y - p.y).toFixed(0)}m`
            : "ENERGY";
    } else if (indicators.cell.current)
      indicators.cell.current.style.display = "none";
    if (engine.docking && engine.cargo > 0)
      project(indicators.dock.current, 0, 4.7, false);
    else if (indicators.dock.current)
      indicators.dock.current.style.display = "none";

    const danger = engine.meteors
      .filter((m) => m.active)
      .sort((a, b) => distance(p, a) - distance(p, b))[0];
    if (danger)
      project(
        indicators.danger.current,
        danger.x,
        danger.z,
        true,
        danger.y + 1.45,
      );
    else if (indicators.danger.current)
      indicators.danger.current.style.display = "none";

    // Adapt only after sustained slow frames, never in response to a single load/resize spike.
    if (engine.phase === "playing") {
      frameTime.current += rawDelta;
      frameCount.current++;
      if (rawDelta > 1 / 32 && rawDelta < 0.15) slowTime.current += rawDelta;
      else slowTime.current = Math.max(0, slowTime.current - rawDelta * 0.25);
      if (slowTime.current > 3 && gl.getPixelRatio() > 1) {
        setDpr(1);
        slowTime.current = 0;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.8} color="#9db8d6" />
      <hemisphereLight args={["#c4deef", "#1e1639", 1.4]} />
      <directionalLight
        position={[-12, 18, 10]}
        intensity={3.2}
        color="#fff0d6"
      />
      <directionalLight
        position={[14, 5, -10]}
        intensity={2.5}
        color="#6abfe6"
      />
      <primitive object={world.root} dispose={null} />
    </>
  );
}
