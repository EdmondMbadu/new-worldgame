/** Fictional stakes for each playable delivery, separate from documented project facts. */
export const OPENING_DURATION = 20;
export const openingBeat = (seconds: number) => seconds < 2 ? 0 : seconds < 8 ? 1 : seconds < 12 ? 2 : seconds < 16 ? 3 : 4;
export const OPENING_STORIES = [
  {
    lead: 'The clinic is on its', emphasis: 'last reserve.',
    objective: 'Bring a charged battery and solar panels to Ndingi. Reach the courtyard before the backup power runs out—and keep the kit safe.',
    careTitle: 'The night shift cannot wait for daylight.',
    careDetail: 'A patient rests under a blanket. A clinician keeps watch by a small reserve lamp. Your battery will help keep the care room lit.',
    roadTitle: 'One valley road. A team waiting.',
    roadDetail: 'Brake before the ruts, give others room, and choose the firmer left fork.',
  },
  {
    lead: 'The rain is closing in.', emphasis: 'Care must continue.',
    objective: 'Bring the charged battery and solar panels through the rain to Nganga–Tsanga. The eye-care team is waiting. Reach them before the reserve runs out.',
    careTitle: 'Eye care continues as the light fades.',
    careDetail: 'A patient rests after an eye examination. The clinician checks on them while another patient waits. Your delivery carries tonight’s power.',
    roadTitle: 'The rain changes every turn.',
    roadDetail: 'Slow for the fallen tree and muddy ground. Leave room for the lorry; the longer ridge road is firmer.',
  },
  {
    lead: 'Patients are waiting.', emphasis: 'The river lies ahead.',
    objective: 'Carry the charged battery and solar panels across to Nsioni. The eye-care team needs the reserve to last until you reach the courtyard. Cross carefully.',
    careTitle: 'Across the river, the team keeps caring.',
    careDetail: 'One patient rests while a clinician tends to them. Another waits beside a companion. Bring the power safely to their side of the river.',
    roadTitle: 'A narrow crossing. A careful choice.',
    roadDetail: 'Wait for crossing traffic. Stay centred below 20 km/h on the bridge, or take the longer ridge bypass.',
  },
  {
    lead: 'Night has fallen.', emphasis: 'The clinic is still awake.',
    objective: 'Follow the reflectors to Kiobo–Kwimba with the charged battery and solar panels. Reach the night team before their reserve runs out. Keep a steady, safe pace.',
    careTitle: 'Someone must keep watch through the night.',
    careDetail: 'A patient rests in the care bay. A clinician checks the bedside and a companion waits nearby. Your headlights are the arrival they are watching for.',
    roadTitle: 'Let the reflectors lead you home.',
    roadDetail: 'Fog hides the next bend. Brake early for broken ground and keep clear of the cliff edge.',
  },
  {
    lead: 'One last delivery.', emphasis: 'A hospital counting on you.',
    objective: 'Bring the final charged battery and solar panels to Mont Sinaï. The storm is building and the hospital’s reserve is running low. Protect the kit to the last bend.',
    careTitle: 'The hospital’s work carries on.',
    careDetail: 'A clinician tends to a resting patient while another team member brings supplies. This final kit is their next source of power in the story.',
    roadTitle: 'Read the water. Protect the final kit.',
    roadDetail: 'Slow before the landslide and flood markers. Take the firmer bypass when the low road looks difficult.',
  },
] as const;
