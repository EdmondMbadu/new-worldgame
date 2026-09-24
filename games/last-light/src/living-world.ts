import { VillageLife } from './village';
import { HerdArt } from './herd-art';
import { bendStatic } from './route-art';
import * as T from 'three';
import {
  batch,
  box,
  cylinder,
  sphere,
  material,
  mesh,
  label,
  geometries,
  materials,
} from './art';
import { encounterPose, type Encounter } from './encounters';
import { heightAt, roadX, smooth, type Mission } from './missions';
import type { GameEngine } from './engine';
import { buildRoadEncounter } from './road-art';
import { SetPieceArt } from './set-piece-art';

export function windMaterial(
  mat: T.MeshStandardMaterial,
  time: { value: number },
  strength: number,
) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = time;
    shader.vertexShader = 'uniform float windTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec3 windOrigin=vec3(0.);
      #ifdef USE_INSTANCING
      windOrigin=instanceMatrix[3].xyz;
      #endif
      float sway=sin(windTime*1.7+windOrigin.x*.19+windOrigin.z*.12)+.35*sin(windTime*3.1+windOrigin.z*.37);
      transformed.x+=sway*${strength.toFixed(3)}*max(0.,position.y+.7);
      transformed.z+=cos(windTime*1.1+windOrigin.x*.3)*${(strength * 0.4).toFixed(3)}*max(0.,position.y+.7);`,
    );
  };
  mat.customProgramCacheKey = () => `wind-${strength}`;
}

export class LivingWorld {
  group = new T.Group();
  time = { value: 0 };
  private actors: {
    event: Encounter;
    group: T.Group;
    wheels: T.Object3D[];
    lamps: T.MeshStandardMaterial;
    brakes: T.MeshStandardMaterial;
    indicators: T.MeshStandardMaterial[];
  }[] = [];
  private flags: T.Mesh[] = [];
  private herds: HerdArt[] = [];
  private village: VillageLife;
  constructor(
    private mission: Mission,
    events: Encounter[],
    low: boolean,
  ) {
    const wood = material('#625943');
    for (const event of events) {
      buildRoadEncounter(this.group, mission, event, this.time);
      if (event.kind === 'herd') {
        const herd = new HerdArt(mission, event);
        this.group.add(herd.group);
        this.herds.push(herd);
        continue;
      }
      if (
        [
          'washout',
          'flood',
          'ridge',
          'market',
          'lorry',
          'planks',
          'breakdown',
          'landslide',
        ].includes(event.kind)
      )
        continue;
      const g = new T.Group(),
        fixed = new T.Group();
      g.add(fixed);
      const lamps = material('#ffc879', 0.2);
      lamps.emissive.set('#ffebc0');
      const brakes = material('#ae3327', 0.3);
      brakes.emissive.set('#ed3928');
      const indicators = [-1, 1].map(() => {
        const mat = material('#f2a23f');
        mat.emissive.set('#ffa431');
        return mat;
      });
      const wheels: T.Object3D[] = [];
      if (event.kind === 'gust') {
        const x = roadX(mission, event.z) + 8,
          y = heightAt(mission, x, event.z);
        cylinder(this.group, wood, x, y + 2, event.z, 0.045, 0.055, 4);
        const mat = material('#bb6e42');
        mat.side = T.DoubleSide;
        windMaterial(mat, this.time, 0.18);
        const flag = mesh(
          new T.PlaneGeometry(1.4, 0.65, 8, 3),
          mat,
          this.group,
          x + 0.7,
          y + 3.6,
          event.z,
        );
        this.flags.push(flag);
        continue;
      }
      if (event.kind === 'tree') {
        const bark = material('#67503b', 0.95);
        const trunk = cylinder(fixed, bark, 0, 0, 0, 0.32, 0.4, 5.1, 14);
        trunk.rotation.x = Math.PI / 2;
        for (let i = 0; i < 4; i++) {
          const branch = cylinder(
            fixed,
            bark,
            0.35,
            0.25,
            (i - 1.5) * 0.8,
            0.07,
            0.13,
            1.4,
            8,
          );
          branch.rotation.z = -0.7;
          branch.rotation.x = 0.4 * i;
        }
        const cut = cylinder(
          fixed,
          material('#b9a17a'),
          0,
          0,
          2.57,
          0.31,
          0.31,
          0.02,
          16,
        );
        cut.rotation.x = Math.PI / 2;
      } else {
        const body = material(
            event.kind === 'minibus' ? '#d8be88' : '#788f82',
            0.43,
            0.25,
          ),
          glass = material('#263e42', 0.16, 0.48),
          black = material('#26312b', 0.9),
          metal = material('#8c988c', 0.3, 0.7);
        const len = event.kind === 'minibus' ? 4.95 : 4.2;
        box(fixed, black, 0, 0.25, 0, 1.86, 0.25, len);
        box(fixed, body, 0, 1.2, 0, 2, 1.58, len, 0.19);
        box(fixed, glass, 0, 1.58, len / 2 + 0.01, 1.7, 0.7, 0.025, 0.055);
        box(fixed, glass, 0, 1.58, -len / 2 - 0.01, 1.7, 0.65, 0.025, 0.055);
        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++)
            box(
              fixed,
              glass,
              side * 1.012,
              1.59,
              (i - 1) * 1.12,
              0.025,
              0.65,
              0.99,
              0.045,
            );
          box(
            fixed,
            material('#397e73'),
            side * 1.021,
            0.89,
            0,
            0.02,
            0.21,
            len - 0.3,
          );
          box(
            fixed,
            lamps,
            side * 0.77,
            0.95,
            len / 2 + 0.03,
            0.28,
            0.18,
            0.04,
            0.018,
          );
          box(
            fixed,
            brakes,
            side * 0.85,
            0.83,
            -len / 2 - 0.03,
            0.17,
            0.2,
            0.04,
            0.018,
          );
          for (const end of [-1, 1])
            box(
              fixed,
              indicators[side > 0 ? 1 : 0],
              side * 0.94,
              0.99,
              end * (len / 2 + 0.055),
              0.08,
              0.15,
              0.025,
            );
          box(
            fixed,
            metal,
            side * 1.12,
            1.49,
            len / 2 - 0.2,
            0.24,
            0.13,
            0.15,
            0.035,
          );
        }
        box(fixed, metal, 0, 0.5, len / 2 + 0.1, 2.1, 0.14, 0.16, 0.04);
        box(fixed, metal, 0, 0.5, -len / 2 - 0.1, 2.1, 0.14, 0.16, 0.04);
        if (event.kind === 'minibus')
          box(
            fixed,
            label('MAWINGU • COMMUNITY', '#283e37', '#d3c8a0', 512, 80),
            0,
            1.99,
            -len / 2 - 0.02,
            1.7,
            0.2,
            0.03,
          );
        for (const z of [-len * 0.31, len * 0.31])
          for (const x of [-1.01, 1.01]) {
            const wheel = cylinder(g, black, x, 0.43, z, 0.41, 0.41, 0.24, 24);
            wheel.rotation.z = Math.PI / 2;
            wheels.push(wheel);
            const hub = cylinder(
              fixed,
              metal,
              x * 1.13,
              0.43,
              z,
              0.2,
              0.2,
              0.025,
              12,
            );
            hub.rotation.z = Math.PI / 2;
          }
      }
      batch(fixed);
      this.group.add(g);
      this.actors.push({ event, group: g, wheels, lamps, brakes, indicators });
      const signZ = event.z - 110,
        sx = roadX(mission, signZ) + 7,
        sy = heightAt(mission, sx, signZ);
      const sign = new T.Group();
      cylinder(sign, wood, sx, sy + 1, signZ, 0.05, 0.06, 2);
      const board = box(
        sign,
        label(
          event.kind === 'minibus'
            ? 'MINIBUS STOP · SLOW'
            : event.kind === 'bridge'
              ? 'SINGLE LANE · WAIT'
              : event.kind === 'traffic'
                ? 'ONCOMING TRAFFIC'
                : 'TREE · SLOW PASSAGE',
          '#f1ddb4',
          '#5b5237',
          768,
          160,
        ),
        sx,
        sy + 2,
        signZ,
        3.5,
        0.7,
        0.08,
      );
      board.rotation.y = Math.PI;
      batch(sign);
      bendStatic(sign, mission);
      this.group.add(sign);
    }
    this.village = new VillageLife(mission, low);
    this.group.add(this.village.group);
    this.setPieces = new SetPieceArt(mission, events, low, this.time);
    this.group.add(this.setPieces.group);
    // One headlight beam serves whichever road vehicle is nearest. A fixed
    // number of lights means no shader recompiles as vehicles come and go.
    this.beam.position.set(0, -500, 0);
    this.group.add(this.beam, this.beam.target);
  }
  private beam = new T.SpotLight('#fff1ca', 0, 90, 0.48, 0.6, 1.3);
  private beamOffset = new T.Vector3();
  private setPieces: SetPieceArt;

  private lastClock = 0;
  update(e: GameEngine, clock: number) {
    this.time.value = clock;
    let nearest = 220,
      lit: T.Group | null = null;
    for (const actor of this.actors) {
      const p = encounterPose(this.mission, actor.event);
      actor.group.position.set(
        p.x,
        p.y + (actor.event.kind === 'tree' ? 0.4 : 0),
        p.z,
      );
      actor.group.quaternion.set(
        p.rotation.x,
        p.rotation.y,
        p.rotation.z,
        p.rotation.w,
      );
      actor.group.visible = Math.abs(e.position.z - p.z) < 320;
      const distance = Math.hypot(e.position.x - p.x, e.position.z - p.z);
      if (actor.event.kind !== 'tree' && actor.group.visible && distance < nearest) {
        nearest = distance;
        lit = actor.group;
      }
      actor.lamps.emissiveIntensity = 1.3;
      actor.brakes.emissiveIntensity = actor.event.brakeLights ? 3 : 0.55;
      actor.indicators.forEach(
        (mat, i) =>
          (mat.emissiveIntensity =
            actor.event.indicator === (i ? 1 : -1) && Math.sin(clock * 6) > 0
              ? 2.7
              : 0.03),
      );
      for (const wheel of actor.wheels)
        wheel.rotation.x +=
          (actor.event.actorSpeed * (clock - this.lastClock)) / 0.41;
    }
    if (lit) {
      lit.updateMatrixWorld();
      this.beam.position.copy(this.beamOffset.set(0, 1, 2.6).applyMatrix4(lit.matrixWorld));
      this.beam.target.position.copy(this.beamOffset.set(0, 0, 30).applyMatrix4(lit.matrixWorld));
      this.beam.target.updateMatrixWorld();
    }
    this.beam.intensity = lit ? 85 : 0;
    this.herds.forEach((herd) => {
      herd.update(clock);
    });
    this.village.update(clock, e.position);
    this.setPieces.update(
      { ...e.position, station: e.progress, speed: e.speed },
      clock,
    );
    this.lastClock = clock;
  }

  dispose() {
    this.herds.forEach((herd) => herd.dispose());
    this.village.dispose();
    this.setPieces.dispose();
  }
}
