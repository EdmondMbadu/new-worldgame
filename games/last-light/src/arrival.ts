/**
 * The arrival cinematic: one timeline shared by the renderer, the soundscape
 * and the caption overlay. Times are seconds of `engine.restoreTime`.
 */
export const ARRIVAL = {
  /** The team walks out and meets the truck. */
  arrive: 0,
  /** Tailgate down; the kit is carried to the power cabinet. */
  unload: 4.5,
  tailgateOpen: 4.8,
  lift: 5.8,
  setDown: 10,
  /** The battery is connected; the inverter lamp turns green. */
  connect: 10,
  connected: 12.4,
  /** A time-lapse of the roof array going up. */
  panels: 13.6,
  panelStep: 0.34,
  /** Inside the care room: the tube light, then the monitor and the fridge. */
  firstLight: 18,
  lightsOn: 19,
  devices: 20.1,
  /** The rest of the compound follows. */
  compound: 20.6,
  /** Back out through the door to the whole clinic, and the real-world fact. */
  pullBack: 24.5,
  /** The real-world fact takes over once the camera is outside. */
  fact: 27.4,
  end: 32,
} as const;

export type ArrivalShot = 'arrive' | 'unload' | 'connect' | 'panels' | 'inside' | 'pullback';

export const arrivalShot = (t: number): ArrivalShot =>
  t < ARRIVAL.unload ? 'arrive'
    : t < ARRIVAL.connect ? 'unload'
      : t < ARRIVAL.panels ? 'connect'
        : t < ARRIVAL.firstLight ? 'panels'
          : t < ARRIVAL.pullBack ? 'inside'
            : 'pullback';

/** Reduced motion keeps three calm, still frames instead of camera moves. */
export const stillShot = (t: number): ArrivalShot =>
  t < ARRIVAL.firstLight ? 'arrive' : t < ARRIVAL.pullBack ? 'inside' : 'pullback';

export const ARRIVAL_CAPTIONS: Record<ArrivalShot, { eyebrow: string; title: string; detail: string; note?: string }> = {
  arrive: { eyebrow: 'ARRIVAL', title: 'You made it.', detail: 'The team comes out to meet the truck.' },
  unload: { eyebrow: 'THE HANDOVER', title: 'Careful hands for tonight’s power.', detail: 'The solar panels are handed over. The charged battery goes straight to the power cabinet.' },
  connect: { eyebrow: 'CONNECTED', title: 'The battery takes the load.', detail: 'The inverter lamp turns green. Solar panels will recharge the battery for the days ahead.' },
  panels: { eyebrow: 'THE PANELS', title: 'Sunlight for the days ahead.', detail: 'The solar panels on the roof will recharge the battery every day.', note: 'Time-lapse · a real installation takes a trained team several days' },
  inside: { eyebrow: 'FIRST LIGHT', title: 'The care room comes back to life.', detail: 'Light for the night shift. A cold fridge for vaccines. A monitor that works.' },
  pullback: { eyebrow: 'A BRIGHTER NIGHT', title: 'The clinic is awake.', detail: 'Tonight’s care continues on its own power.' },
};

/** Smooth 0→1 between two times. */
export const ease = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
