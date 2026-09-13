import { bendStatic } from './route-art';
import * as T from 'three';
import { batch, box, cylinder, label, material, mesh } from './art';
import { heightAt, roadX, roadY, type Mission } from './missions';
import type { Encounter } from './encounters';

export function buildRoadEncounter(
  parent: T.Group,
  m: Mission,
  e: Encounter,
  time: { value: number },
) {
  const group = new T.Group(),
    timber = material('#604c37'),
    pale = material('#c4c0a0'),
    orange = material('#cf8240');
  const reflector = material('#f2ce7d');
  reflector.emissive.set('#bb954e');
  reflector.emissiveIntensity = 0.7;
  const marker = (x: number, z: number) => {
    const y = heightAt(m, x, z);
    cylinder(group, timber, x, y + 0.7, z, 0.045, 0.06, 1.4, 6);
    box(group, reflector, x, y + 1.18, z, 0.18, 0.22, 0.08);
  };
  if (e.kind === 'washout' || e.kind === 'flood') {
    const warningZ = e.z - 135,
      warningX = roadX(m, warningZ) + 6.1,
      warningY = heightAt(m, warningX, warningZ);
    for (const dx of [-1.3, 1.3])
      cylinder(
        group,
        timber,
        warningX + dx,
        warningY + 1.3,
        warningZ,
        0.055,
        0.065,
        2.6,
        6,
      );
    const sign = box(
      group,
      label(
        e.kind === 'washout' ? 'WASHOUT · 135 m' : 'FLOOD · 135 m',
        '#efdbab',
        '#253f38',
      ),
      warningX,
      warningY + 2.1,
      warningZ,
      3.4,
      0.75,
      0.09,
    );
    sign.rotation.y = Math.PI;
    for (let z = e.z - e.length / 2 - 5; z <= e.z + e.length / 2 + 5; z += 5) {
      marker(roadX(m, z) + e.side * 1.6, z);
      marker(roadX(m, z) + e.side * 4.9, z);
    }
    const x = roadX(m, e.z - 30) - e.side * 2.4,
      y = heightAt(m, x, e.z - 30);
    for (const dx of [-0.75, 0.75])
      cylinder(group, timber, x + dx, y + 0.7, e.z - 30, 0.07, 0.07, 1.4, 6);
    box(group, orange, x, y + 1, e.z - 30, 2.7, 0.22, 0.14);
    box(group, pale, x, y + 0.63, e.z - 30, 2.7, 0.22, 0.14);
    if (e.kind === 'flood') {
      const water = material('#3c656b', 0.15, 0.2);
      water.transparent = true;
      water.opacity = 0.83;
      water.onBeforeCompile = (shader) => {
        shader.uniforms.flowTime = time;
        shader.uniforms.waterLevel = {
          get value() {
            return e.waterLevel;
          },
        };
        shader.vertexShader =
          'uniform float waterLevel; varying vec2 flowPosition;\n' +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\ntransformed.y+=waterLevel;\nflowPosition=(modelMatrix*vec4(transformed,1.0)).xz;',
        );
        shader.fragmentShader =
          'uniform float flowTime;\nvarying vec2 flowPosition;\n' +
          shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          float ripple=sin(flowPosition.x*6.0+flowPosition.y*2.0+flowTime*2.5)*0.07;
          normal=normalize(normal+vec3(ripple,cos(flowPosition.y*9.0-flowTime*3.0)*0.045,0.0));`,
        );
      };
      water.customProgramCacheKey = () => 'crossing-ripples';
      const positions: number[] = [],
        indices: number[] = [];
      for (let j = 0; j <= e.length; j++) {
        const z = e.z - e.length / 2 + j;
        positions.push(
          roadX(m, z) - 5.6,
          roadY(m, z) - 0.09,
          z,
          roadX(m, z) + 5.6,
          roadY(m, z) - 0.09,
          z,
        );
        if (j < e.length) {
          const a = j * 2;
          indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      const surface = mesh(g, water, group);
      surface.castShadow = false;
    }
  }
  if (e.kind === 'bridge') {
    const z = e.z - e.length / 2 - 23;
    for (const s of [-1, 1]) marker(roadX(m, z) + s * 3, z);
    const strip = box(
      group,
      reflector,
      roadX(m, z),
      roadY(m, z) + 0.14,
      z,
      5,
      0.025,
      0.3,
    );
    strip.castShadow = false;
    const board = box(
      group,
      label('WAIT HERE · SINGLE LANE', '#efdbab', '#253f38'),
      roadX(m, z) + 5,
      roadY(m, z) + 1.7,
      z,
      3.2,
      0.7,
      0.08,
    );
    board.rotation.y = Math.PI;
    for (let zz = z - 12; zz < z + 8; zz += 4)
      marker(roadX(m, zz) - e.side * 6, zz);
  }
  if (e.kind === 'minibus' || e.kind === 'tree') {
    for (let zz = e.z - 15; zz <= e.z + 15; zz += 7.5) {
      const x = roadX(m, zz) + e.side * 4.6;
      const cone = cylinder(
        group,
        orange,
        x,
        heightAt(m, x, zz) + 0.28,
        zz,
        0.04,
        0.2,
        0.56,
        10,
      );
      box(group, reflector, x, cone.position.y + 0.08, zz, 0.17, 0.08, 0.17);
    }
  }
  if (e.kind === 'herd') {
    const z = e.z - 25;
    for (const side of [-1, 1]) marker(roadX(m, z) + side * 4.3, z);
    const strip = box(
      group,
      pale,
      roadX(m, z),
      heightAt(m, roadX(m, z), z) + 0.08,
      z,
      8,
      0.03,
      0.35,
    );
    strip.castShadow = false;
    const sign = box(
      group,
      label('LANTERN CROSSING · WAIT', '#f1ddb4', '#4d5741', 512, 96),
      roadX(m, z) + 6.5,
      roadY(m, z) + 1.8,
      z,
      3.5,
      0.7,
      0.07,
    );
    sign.rotation.y = Math.PI;
    cylinder(
      group,
      timber,
      roadX(m, z) + 6.5,
      roadY(m, z) + 0.9,
      z,
      0.05,
      0.055,
      1.8,
      6,
    );
  }
  batch(group);
  bendStatic(group, m);
  parent.add(group);
}
