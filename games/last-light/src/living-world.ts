import * as T from 'three';
import {
  batch,
  box,
  cylinder,
  sphere,
  material,
  mesh,
  label,
  createPerson,
  geometries,
  materials,
} from './art';
import { encounterPose, type Encounter } from './encounters';
import { heightAt, roadX, smooth, type Mission } from './missions';
import type { GameEngine } from './engine';
import { buildRoadEncounter } from './road-art';

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
  }[] = [];
  private villagers: {
    person: ReturnType<typeof createPerson>;
    x: number;
    z: number;
    phase: number;
  }[] = [];
  private flags: T.Mesh[] = [];
  constructor(
    private mission: Mission,
    events: Encounter[],
    low: boolean,
  ) {
    const stone = material('#676e62', 0.96),
      wood = material('#625943');
    for (const event of events) {
      buildRoadEncounter(this.group, mission, event, this.time);
      if (event.kind === 'washout' || event.kind === 'flood') continue;
      const g = new T.Group(),
        fixed = new T.Group();
      g.add(fixed);
      const lamps = material('#ffc879', 0.2);
      lamps.emissive.set('#ffb253');
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
            lamps,
            side * 0.85,
            0.83,
            -len / 2 - 0.03,
            0.17,
            0.2,
            0.04,
            0.018,
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
      if (event.kind !== 'tree') {
        const beam = new T.SpotLight('#fff1ca', 85, 90, 0.48, 0.6, 1.3);
        beam.position.set(0, 1, 2.6);
        beam.target.position.set(0, 0, 30);
        g.add(beam, beam.target);
      }
      this.group.add(g);
      this.actors.push({ event, group: g, wheels, lamps });
      const signZ = event.z - 110,
        sx = roadX(mission, signZ) + 7,
        sy = heightAt(mission, sx, signZ);
      const sign = new T.Group();
      cylinder(sign, wood, sx, sy + 1, signZ, 0.05, 0.06, 2);
      const board = box(
        sign,
        label(
          event.kind === 'minibus'
            ? 'STOPPED VEHICLE'
            : event.kind === 'bridge'
              ? 'SINGLE LANE · WAIT'
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
      this.group.add(batch(sign));
    }
    // Small roadside places give scale and human activity without blocking the driving corridor.
    for (const z of [85, mission.length * 0.57]) {
      const side = z < 100 ? -1 : 1,
        x = roadX(mission, z) + side * 18,
        y = heightAt(mission, x, z);
      const village = new T.Group();
      village.position.set(x, y, z);
      const plaster = material(mission.id % 2 ? '#bba786' : '#c3b596'),
        roof = material('#70817a', 0.55, 0.4),
        trim = material('#376e61');
      box(village, plaster, 0, 1.7, 0, 5, 3.4, 4, 0.05);
      for (const s of [-1, 1]) {
        const r = box(village, roof, 0, 3.65, s * 1.05, 5.7, 0.12, 2.5);
        r.rotation.x = s * 0.27;
      }
      box(village, trim, 0, 1.1, -2.04, 1.1, 2.2, 0.06);
      for (const xx of [-1.7, 1.7]) {
        box(village, trim, xx, 1.95, -2.04, 0.9, 0.9, 0.06);
        box(village, wood, xx, 0.9, -3.5, 0.9, 0.13, 0.7);
      }
      box(village, wood, 0, 0.92, -3.5, 2, 0.14, 0.8);
      for (let i = 0; i < 5; i++)
        sphere(
          village,
          material(i % 2 ? '#b78d40' : '#738a43'),
          (i - 2) * 0.25,
          1.08,
          -3.5,
          0.13,
        );
      cylinder(village, wood, -3, 2, -1, 0.055, 0.075, 4);
      cylinder(village, wood, 3, 2, -1, 0.055, 0.075, 4);
      box(village, wood, 0, 3.2, -1, 6, 0.017, 0.017);
      this.group.add(batch(village));
      for (let i = 0; i < 3; i++) {
        const mat = material(['#c7c0a1', '#6c9b92', '#b77c54'][i]);
        mat.side = T.DoubleSide;
        windMaterial(mat, this.time, 0.09);
        const cloth = mesh(
          new T.PlaneGeometry(0.8, 1.1, 6, 5),
          mat,
          this.group,
          x + (i - 1) * 1.35,
          y + 2.7,
          z - 1,
        );
        this.flags.push(cloth);
      }
      for (let i = 0; i < (low ? 1 : 2); i++) {
        const person = createPerson(i ? '#b99665' : '#7d9b8e');
        const px = x + (i ? 3 : -3),
          pz = z - 4;
        person.group.position.set(px, heightAt(mission, px, pz), pz);
        this.group.add(person.group);
        this.villagers.push({ person, x: px, z: pz, phase: i * 2 });
      }
    }
  }
  update(e: GameEngine, clock: number) {
    this.time.value = clock;
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
      actor.lamps.emissiveIntensity =
        actor.event.kind === 'minibus'
          ? Math.sin(clock * 7) > 0
            ? 3
            : 0.15
          : 1.3;
      for (const wheel of actor.wheels)
        if (actor.event.kind === 'bridge' && actor.event.state !== 'clear')
          wheel.rotation.x = actor.event.elapsed * 7;
    }
    for (const v of this.villagers) {
      const near = Math.abs(e.position.z - v.z) < 38;
      v.person.group.visible = Math.abs(e.position.z - v.z) < 180;
      v.person.group.position.x = v.x + Math.sin(clock * 0.4 + v.phase) * 0.45;
      v.person.group.rotation.y = Math.atan2(
        e.position.x - v.x,
        e.position.z - v.z,
      );
      v.person.head.rotation.y = Math.sin(clock * 0.5 + v.phase) * 0.13;
      v.person.limbs[0].rotation.z = near
        ? 1.5 + Math.sin(clock * 5) * 0.18
        : 0.12;
      v.person.forearms[0].rotation.x = near ? -0.5 : -0.1;
      v.person.limbs[2].rotation.x = Math.sin(clock * 2 + v.phase) * 0.07;
      v.person.limbs[3].rotation.x = -v.person.limbs[2].rotation.x;
    }
  }
  dispose() {
    for (const v of this.villagers) v.person.skin.skeleton.dispose();
  }
}
