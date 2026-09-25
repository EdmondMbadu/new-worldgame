import * as T from 'three';
import { batch, box, createPerson, material } from './art';

/** A small, fictional care bay, kept in the clinic scene for the actual arrival too. */
export function createClinicCare(chapter: number) {
  const root = new T.Group(), furniture = new T.Group();
  const metal = material('#657c78'), linen = material('#ddd9bd'), wood = material('#756348');
  // A resting patient, a shaded waiting bench, and the team's supply trolley.
  for (const x of [-2.08, -1.32]) for (const z of [-.9, .95]) box(furniture, metal, x, .37, z, .05, .74, .05);
  box(furniture, metal, -1.7, .68, 0, .92, .08, 2.08);
  box(furniture, linen, -1.7, .77, 0, .86, .13, 2);
  box(furniture, linen, -1.7, .88, -.73, .57, .13, .34, .05);
  for (const x of [1.02, 2.98]) box(furniture, metal, x, .23, 0, .08, .46, .42);
  box(furniture, wood, 2, .48, 0, 2.4, .1, .5, .025);
  box(furniture, wood, 2, .86, -.26, 2.4, .5, .055, .02);
  box(furniture, metal, -.25, .78, -.95, .6, .06, .5);
  box(furniture, metal, -.25, .4, -.95, .06, .76, .06);
  box(furniture, linen, -.25, .88, -.95, .45, .15, .34, .02);
  const lampMat = material('#f7d89a'); lampMat.emissive.set('#ffc47a'); lampMat.emissiveIntensity = 1.2;
  box(furniture, metal, -.25, 1.07, -.95, .18, .06, .16);
  box(furniture, lampMat, -.25, 1.18, -.95, .12, .18, .12, .02);
  root.add(batch(furniture));
  // This lamp belongs to the reserve, independent of the post-delivery solar lights.
  const lamp = new T.PointLight('#ffd6a0', 9, 7, 2);
  lamp.position.set(-.25, 1.45, -.6); root.add(lamp);
  const resting = createPerson('#c5b39a', '#745039');
  resting.group.rotation.x = -Math.PI / 2;
  resting.group.position.set(-1.7, .92, .82);
  const blanket = box(root, material(chapter === 4 ? '#738ba3' : '#72938a'), -1.7, 1.01, .22, .76, .13, 1.17, .06);
  const waiting = createPerson('#c09564', '#704933');
  const companion = createPerson('#aa7654', '#835a3f');
  [waiting, companion].forEach((person, i) => {
    person.group.position.set(1.5 + i * 1.1, -.34, 0);
    person.limbs[2].rotation.x = person.limbs[3].rotation.x = -Math.PI / 2;
    person.calves.forEach(leg => { leg.rotation.x = Math.PI / 2; });
    person.limbs[0].rotation.x = person.limbs[1].rotation.x = -.35;
    person.forearms.forEach(arm => { arm.rotation.x = -.95; });
  });
  if (chapter === 1 || chapter === 2) {
    box(resting.head, linen, 0, .025, .12, .18, .055, .025, .01);
    waiting.head.rotation.x = .14;
  }
  const clinician = createPerson('#b8d6cc', '#61412c');
  clinician.group.position.set(-.82, 0, .3);
  clinician.group.rotation.y = -Math.PI / 2;
  const runner = createPerson('#699496', '#79523b');
  const tray = box(runner.group, metal, 0, .97, .38, .48, .055, .32);
  box(tray, linen, 0, .055, 0, .3, .08, .23);
  const people = [resting, waiting, companion, clinician, runner];
  people.forEach(person => root.add(person.group));
  return {
    root,
    update(time: number, still: boolean) {
      const t = still ? 0 : time;
      // Quiet breathing and a bedside check convey care without distress effects.
      blanket.scale.y = 1 + Math.sin(t * 1.7) * .035;
      resting.head.rotation.y = Math.sin(t * .55) * .04;
      waiting.head.rotation.x = .13 + Math.sin(t * .9) * .045;
      waiting.head.rotation.y = Math.sin(t * .35) * .11;
      companion.head.rotation.y = -.25 + Math.sin(t * .5) * .06;
      clinician.group.rotation.z = -.08 - Math.sin(t * 1.1) * .025;
      clinician.limbs[0].rotation.x = -.72 + Math.sin(t * 1.2) * .12;
      clinician.limbs[1].rotation.x = -.95;
      clinician.forearms[0].rotation.x = -.7;
      clinician.forearms[1].rotation.x = -.6 + Math.sin(t * .8) * .1;
      const walk = (t % 12) / 12, returning = walk > .5;
      runner.group.position.set(T.MathUtils.lerp(-3.6, 3.6, returning ? 2 - walk * 2 : walk * 2), 0, -1.6);
      runner.group.rotation.y = returning ? -Math.PI / 2 : Math.PI / 2;
      runner.limbs[0].rotation.x = runner.limbs[1].rotation.x = -.7;
      runner.forearms.forEach(arm => { arm.rotation.x = -.85; });
      runner.limbs[2].rotation.x = still ? 0 : Math.sin(t * 6) * .28;
      runner.limbs[3].rotation.x = -runner.limbs[2].rotation.x;
    },
    dispose() { people.forEach(person => person.skin.skeleton.dispose()); },
  };
}
