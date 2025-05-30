// services/game.service.ts
import { Injectable } from '@angular/core';
import { GameScenario } from '../models/tournament';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';

export interface FeedbackEntry {
  feedbackId: string;
  email: string;
  uid: string | null;
  text: string;
  sentAt: string; // ISO
}
export interface GameResult {
  resultId: string;
  email: string;
  uid: string | null;
  totalScore: number;
  detailed: {
    sustainability: number;
    humanImpact: number;
    equity: number;
    innovation: number;
  };
  badges: string[];
  completedAt: string;
}

/* ── extend model locally with quote ── */
export interface WGScenario extends GameScenario {
  quote: string;
}

@Injectable({ providedIn: 'root' })
export class GameService {
  constructor(private afs: AngularFirestore, private auth: AuthService) {}

  async save(result: Omit<GameResult, 'resultId'>) {
    const id = this.afs.createId();
    await this.afs.doc<GameResult>(`miniScores/${id}`).set(
      {
        resultId: id,
        ...result,
      },
      { merge: true }
    );
    return id;
  }
  async saveFeedback(payload: Omit<FeedbackEntry, 'feedbackId'>) {
    const id = this.afs.createId();
    await this.afs
      .doc<FeedbackEntry>(`miniFeedback/${id}`)
      .set({ feedbackId: id, ...payload });
    return id;
  }

  /** OFFICIAL 4-scenario set (with exact wording) */
  loadScenarios(): WGScenario[] {
    return [
      /* ───────── SDG 6 ───────── */
      {
        id: 'sdg6',
        sdg: 'SDG 6',
        title: 'Water Wars or Water Wins?',
        region: 'Sub-Saharan Africa',
        crisis:
          'A massive drought has hit three nations, affecting 28 million people. Access to safe drinking water is dropping fast, and tensions are rising over shared river systems.',
        mission:
          'Your Mission: Choose how to spend $10 million in international aid to improve the water situation. You’re aiming for long-term impact, sustainability, and regional peace.',
        quote: 'Play the Future. Solve the World.',
        postChoiceInsight: 'Water equity prevents conflict.',
        badges: ['Local Hero'],
        choices: [
          {
            text: 'Build a massive dam to control river flow.',
            description: '🏗️ Infrastructure power move.',
            sustainability: 2,
            humanImpact: 3,
            equity: 1,
            innovation: 1,
            insight: 'Control the river, control the drought.',
            badge: 'Infrastructure Strategist',
          },
          {
            text: 'Fund decentralized solar-powered water purifiers in 200 villages.',
            description: '🌍 Local-first solution.',
            sustainability: 4,
            humanImpact: 4,
            equity: 4,
            innovation: 3,
            insight: 'Clean water, where it’s needed most.',
            badge: 'Water Warrior',
          },
          {
            text: 'Run a global social media campaign to raise awareness.',
            description: '📢 Influence move.',
            sustainability: 1,
            humanImpact: 1,
            equity: 2,
            innovation: 3,
            insight: 'Get the world talking—and donating.',
            badge: 'Awareness Advocate',
          },
          {
            text: 'Launch a cross-border water-sharing agreement with citizen-led oversight.',
            description: '🕊️ Peace-building diplomacy.',
            sustainability: 3,
            humanImpact: 3,
            equity: 4,
            innovation: 4,
            insight: 'Water isn’t a weapon. It’s a right.',
            badge: 'Diplomatic Innovator',
          },
        ],
      },

      /* ───────── SDG 2 ───────── */
      {
        id: 'sdg2',
        sdg: 'SDG 2',
        title: 'Feeding the Future',
        region: 'South Asia',
        crisis:
          'Farmers are facing record crop failures due to rising temperatures and erratic rainfall. Food prices are spiking, and malnutrition is rising, especially among children.',
        mission:
          'Your Mission: Use $8 million to reduce hunger and support local food systems.',
        quote:
          'A full plate for one should never mean an empty plate for another.',
        postChoiceInsight: 'Healthy soils feed healthy futures.',
        badges: ['Food Justice Fighter'],
        choices: [
          {
            text: 'Subsidize industrial farming and GMOs for high-yield crops.',
            description: 'Go big or go home. Feed more, faster.',
            sustainability: 2,
            humanImpact: 3,
            equity: 1,
            innovation: 2,
            insight:
              'Short-term bumper harvest, but soil health and small farmers suffer.',
            badge: 'Yield Maximiser',
          },
          {
            text: 'Launch permaculture training for 10,000 smallholder farmers.',
            description: 'Grow smart. Feed many. Heal the soil.',
            sustainability: 5,
            humanImpact: 4,
            equity: 4,
            innovation: 3,
            insight:
              'Farmers adopting regenerative techniques doubled yields within two seasons.',
            badge: 'Regeneration Guru',
          },
          {
            text: 'Create a school lunch program using local crops.',
            description: 'Nutrition today, brighter future tomorrow.',
            sustainability: 3,
            humanImpact: 4,
            equity: 4,
            innovation: 2,
            insight:
              'Child malnutrition falls; demand jump-starts village markets.',
            badge: 'Lunch Lifesaver',
          },
          {
            text: 'Import surplus grain from donor countries.',
            description: 'Feed now, think later.',
            sustainability: 1,
            humanImpact: 3,
            equity: 2,
            innovation: 1,
            insight:
              'Immediate relief, but undercuts local farmers and raises debt.',
            badge: 'Cargo Commander',
          },
        ],
      },

      /* ───────── SDG 7 ───────── */
      {
        id: 'sdg7',
        sdg: 'SDG 7',
        title: 'Power Shift',
        region: 'Caribbean Islands',
        crisis:
          'Hurricanes are destroying aging diesel power grids. Blackouts are common. Energy costs are soaring, especially for rural families.',
        mission:
          'Your Mission: Design a regional energy solution that works during disasters and reduces emissions.',
        quote: 'What powers your world? Oil or sunlight?',
        postChoiceInsight: 'Resilience runs on renewables.',
        badges: ['Sunlight Strategist'],
        choices: [
          {
            text: 'Rebuild diesel-powered energy infrastructure with upgrades.',
            description: 'Familiar tech, reliable fuel.',
            sustainability: 1,
            humanImpact: 2,
            equity: 1,
            innovation: 1,
            insight:
              'Power returns quickly but locks islands into fossil imports.',
            badge: 'Diesel Defender',
          },
          {
            text: 'Deploy microgrid solar systems to 150 rural communities.',
            description: 'Power to the people. Literally.',
            sustainability: 5,
            humanImpact: 4,
            equity: 4,
            innovation: 4,
            insight:
              'Solar microgrids restored power to 300 000 residents—even after storms.',
            badge: 'Grid Guardian',
          },
          {
            text: 'Launch a public-private partnership for wind farms + jobs.',
            description: 'Clean energy, green jobs.',
            sustainability: 4,
            humanImpact: 3,
            equity: 2,
            innovation: 4,
            insight:
              'Island grid 60 % renewable; job training favours coastal towns.',
            badge: 'Wind Workforce',
          },
          {
            text: 'Install home batteries in wealthy urban households.',
            description: 'Keep the lights on… if you can afford it.',
            sustainability: 2,
            humanImpact: 1,
            equity: 1,
            innovation: 3,
            insight: 'Blackout immunity for elites; inequality widens.',
            badge: 'Backup Baron',
          },
        ],
      },

      /* ───────── SDG 13 ───────── */
      {
        id: 'sdg13',
        sdg: 'SDG 13',
        title: 'Hot City, Cool Solutions',
        region: 'Latin American Mega-city',
        crisis:
          'A record heatwave is causing deaths and shutting down schools. Concrete-heavy city design traps heat, and low-income neighborhoods are hit hardest.',
        mission:
          'Your Mission: Help city leaders cool the city, save lives, and prepare for more climate extremes.',
        quote: 'This city is cooking. Can you turn down the heat?',
        postChoiceInsight: 'Shade saves lives.',
        badges: ['Climate Coolmaker'],
        choices: [
          {
            text: 'Install air conditioning in all public buildings.',
            description: 'Cool the buildings, cool the people.',
            sustainability: 1,
            humanImpact: 3,
            equity: 2,
            innovation: 1,
            insight:
              'Immediate relief, but energy demand spikes and grids strain.',
            badge: 'AC Aficionado',
          },
          {
            text: 'Launch a ‘Green Roofs for All’ program.',
            description: 'Plants fight heat—and poverty.',
            sustainability: 4,
            humanImpact: 3,
            equity: 3,
            innovation: 4,
            insight: 'Roofs 8 °C cooler; rooftop gardens create micro-jobs.',
            badge: 'Roof Reviver',
          },
          {
            text: 'Turn 50 city blocks into shaded, car-free green corridors.',
            description: 'Less asphalt. More life.',
            sustainability: 5,
            humanImpact: 4,
            equity: 4,
            innovation: 3,
            insight: 'Street temps fall 6 °C; asthma ER visits drop 12 %.',
            badge: 'Shade Shaper',
          },
          {
            text: 'Build underground cooling centers for heat emergencies.',
            description: 'Hide from the heat—but only if you’re nearby.',
            sustainability: 2,
            humanImpact: 3,
            equity: 2,
            innovation: 2,
            insight:
              'Life-saving shelters, but access gaps for outlying areas.',
            badge: 'Cool Shelter Chief',
          },
        ],
      },
    ];
  }
  /** full library—17 SDGs, four branched choices each */
  // loadScenarios(): GameScenario[] {
  //   return [
  //     /* ─────────────────────────── SDG 1 • No Poverty ─────────────────────────── */
  //     {
  //       id: 'sdg1',
  //       sdg: 'SDG 1',
  //       title: 'Pathways out of Poverty',
  //       region: 'Rural Mekong Delta, Viet Nam',
  //       crisis:
  //         'After two devastating typhoons, smallholder families have lost crops, homes and micro-businesses.',
  //       mission:
  //         'Allocate US $5 million to lift 50 000 villagers above the extreme-poverty line within three years.',
  //       postChoiceInsight:
  //         'True poverty reduction mixes immediate relief with long-term economic autonomy.',
  //       badges: ['Poverty Pathfinder'],
  //       choices: [
  //         {
  //           text: 'Cash-plus: direct transfer + skills training',
  //           description:
  //             'US$200 unconditional cash per household plus six-month entrepreneurship coaching.',
  //           sustainability: 3,
  //           humanImpact: 4,
  //           equity: 4,
  //           innovation: 3,
  //           insight:
  //             '90 % invest the cash in poultry, seeds or bicycles; median income doubles in 18 months.',
  //           badge: 'Catalyst Coach',
  //         },
  //         {
  //           text: 'Rebuild roads & bridges first',
  //           description:
  //             'Put the full budget into climate-resilient transport so farmers reach markets.',
  //           sustainability: 3,
  //           humanImpact: 2,
  //           equity: 2,
  //           innovation: 2,
  //           insight:
  //             'Market access rises, but poorest households still lack goods to sell—poverty gap narrows only 11 %.',
  //           badge: 'Infrastructure Fixer',
  //         },
  //         {
  //           text: 'Micro-finance cooperative fund',
  //           description:
  //             'Seed a member-owned credit union with 1 % per-month loans capped at US$500.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             'Loan repayment hits 96 %; women open 1 200 new enterprises, but ultra-poor without collateral are left out.',
  //           badge: 'Co-op Builder',
  //         },
  //         {
  //           text: 'Emergency subsidised rice program',
  //           description:
  //             'Two-year food subsidy so no family slips below 2 000 kcal/day.',
  //           sustainability: 1,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 1,
  //           insight:
  //             'Hunger disappears—but local farmers’ rice prices fall 18 %, threatening long-term livelihoods.',
  //           badge: 'Relief Responder',
  //         },
  //       ],
  //     },

  //     /* ─────────────────────────── SDG 2 • Zero Hunger ─────────────────────────── */
  //     {
  //       id: 'sdg2',
  //       sdg: 'SDG 2',
  //       title: 'Feeding the Future',
  //       region: 'Sindh Province, Pakistan',
  //       crisis:
  //         'Record flooding wiped out wheat crops; malnutrition among children under five has spiked to 42 %.',
  //       mission:
  //         'Invest US $8 million to stabilise food security before next planting season.',
  //       postChoiceInsight:
  //         'Effective food interventions blend climate-smart farming with strong social nets.',
  //       badges: ['Food Justice Fighter'],
  //       choices: [
  //         {
  //           text: 'Climate-smart seed grants',
  //           description:
  //             'Provide salt-tolerant, drought-resistant wheat & rice seeds to 25 000 farmers.',
  //           sustainability: 4,
  //           humanImpact: 4,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             'Yields rebound by 35 %; farmers form seed-sharing circles and cut dependency on imports.',
  //           badge: 'Seed Savior',
  //         },
  //         {
  //           text: 'Mobile nutrition clinics',
  //           description:
  //             'Deploy 20 vans delivering fortified porridge & micronutrients to remote villages.',
  //           sustainability: 2,
  //           humanImpact: 4,
  //           equity: 4,
  //           innovation: 2,
  //           insight:
  //             'Stunting drops 7 % in six months; operating costs remain high without lasting agri gains.',
  //           badge: 'Health Hustler',
  //         },
  //         {
  //           text: 'Refrigerated river barges',
  //           description:
  //             'Cold-chain boats move surplus vegetables from the north before spoilage.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 2,
  //           innovation: 4,
  //           insight:
  //             'Spoilage down 60 %; profits up, but carbon footprint rises unless barges switch to EV tech.',
  //           badge: 'Cool Cargo Captain',
  //         },
  //         {
  //           text: 'Radio food-price transparency',
  //           description:
  //             'Weekly broadcasts of fair market prices plus SMS alerts curb middle-man monopolies.',
  //           sustainability: 2,
  //           humanImpact: 2,
  //           equity: 4,
  //           innovation: 3,
  //           insight:
  //             'Farm-gate prices climb 18 %; women traders gain leverage, but info gaps persist off-grid.',
  //           badge: 'Info Equalizer',
  //         },
  //       ],
  //     },

  //     /* ─────────────────────────── SDG 3 • Good Health & Well-being ─────────────────────────── */
  //     {
  //       id: 'sdg3',
  //       sdg: 'SDG 3',
  //       title: 'Health on the Edge',
  //       region: 'Amazon Basin, Brazil',
  //       crisis:
  //         'Illegal mining and deforestation brought malaria & mercury poisoning to indigenous villages.',
  //       mission:
  //         'Use US $7 million to slash malaria cases by 70 % in two years.',
  //       postChoiceInsight:
  //         'Health equity depends on culturally-aligned care and ecosystem protection.',
  //       badges: ['Forest Healer'],
  //       choices: [
  //         {
  //           text: 'Drone-delivered diagnostics',
  //           description:
  //             'Autonomous drones fly blood-test kits and meds to 80 river-delta hamlets.',
  //           sustainability: 4,
  //           humanImpact: 4,
  //           equity: 4,
  //           innovation: 4,
  //           insight:
  //             'Sample-to-lab time falls from 4 days to 6 hours; malaria incidence halves in eight months.',
  //           badge: 'Sky-Medic',
  //         },
  //         {
  //           text: 'Mosquito-net mass drop',
  //           description:
  //             'Provide long-lasting insecticide nets to every household.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 1,
  //           insight:
  //             'Night-bites plummet, but mining pools keep breeding mosquitoes; nets wear out after two years.',
  //           badge: 'Shield Distributor',
  //         },
  //         {
  //           text: 'Community forest rangers',
  //           description:
  //             'Train youth to police illegal gold pits, earning wages & preserving habitat.',
  //           sustainability: 4,
  //           humanImpact: 2,
  //           equity: 3,
  //           innovation: 3,
  //           insight:
  //             'Deforestation slows 28 %; malaria vectors shrink, but ranger safety becomes an issue.',
  //           badge: 'Guardian Green',
  //         },
  //         {
  //           text: 'River-clinic hospital ship',
  //           description:
  //             'Convert a barge into a floating clinic with telehealth links to urban specialists.',
  //           sustainability: 3,
  //           humanImpact: 4,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             'Treated 12 000 patients in first year; cost per patient high unless states co-fund.',
  //           badge: 'Floating Doc',
  //         },
  //       ],
  //     },

  //     /* ─────────────────────────── SDG 4 • Quality Education ─────────────────────────── */
  //     {
  //       id: 'sdg4',
  //       sdg: 'SDG 4',
  //       title: 'Classrooms without Walls',
  //       region: 'Syrian refugee settlements, Jordan',
  //       crisis:
  //         '60 % of teenage refugees out of school; digital divide blocks remote learning.',
  //       mission:
  //         'Allocate US $6 million to raise secondary-school attendance to 80 % within 18 months.',
  //       postChoiceInsight:
  //         'Safe spaces, trained teachers and connectivity unlock future opportunities.',
  //       badges: ['Knowledge Keeper'],
  //       choices: [
  //         {
  //           text: 'Solar Wi-Fi learning hubs',
  //           description:
  //             'Install container classrooms powered by solar panels, each with 30 tablets.',
  //           sustainability: 4,
  //           humanImpact: 4,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             'Attendance hits 78 %; girls’ enrolment up 24 %, but tablet breakage strains budget.',
  //           badge: 'Sun-Tech Teacher',
  //         },
  //         {
  //           text: 'Conditional cash for caregivers',
  //           description:
  //             'Families get US$30/month if teens attend ≥90 % of classes.',
  //           sustainability: 2,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 2,
  //           insight:
  //             'Dropout rate halves; some families game the system by falsifying logs.',
  //           badge: 'Attendance Ally',
  //         },
  //         {
  //           text: 'Train peer educators',
  //           description:
  //             'Scholarship top students to teach STEM to younger kids.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 3,
  //           insight:
  //             'Peer-led classes close gender gaps in math scores; burnout risk after eight months.',
  //           badge: 'Mentor Maker',
  //         },
  //         {
  //           text: 'Arabic-first ed-tech platform',
  //           description:
  //             'Localise open-source curricula with offline video packs & voice search.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             'Students stream lessons at 120 Kbps; literacy jumps 15 % with minimal data costs.',
  //           badge: 'Language Lifeline',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 5 • Gender Equality ─────────── */
  //     {
  //       id: 'sdg5',
  //       sdg: 'SDG 5',
  //       title: 'Equal Futures',
  //       region: 'Nairobi informal settlements, Kenya',
  //       crisis:
  //         'Gender-based violence (GBV) reports surged 45 % post-pandemic; economic losses mount.',
  //       mission:
  //         'Spend US $4 million to halve GBV incidence and raise women-owned enterprise by 30 % in a year.',
  //       postChoiceInsight:
  //         'Empowerment thrives where safety, finance and voice go hand-in-hand.',
  //       badges: ['Equality Engineer'],
  //       choices: [
  //         {
  //           text: 'Safe-transit street-light grid',
  //           description:
  //             'Install 3 000 solar LEDs along paths to work & school.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 3,
  //           insight:
  //             'Night assaults fall 38 %; maintenance requires local tech teams.',
  //           badge: 'Light Guardian',
  //         },
  //         {
  //           text: 'Micro-equity fund for women',
  //           description: 'US$5000-15 000 grants for cooperatives run by women.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 4,
  //           insight:
  //             '800 new jobs created in six months; loan recovery 92 %, higher than national average.',
  //           badge: 'Capital Catalyst',
  //         },
  //         {
  //           text: 'GBV survivor hot-line + shelters',
  //           description:
  //             '24/7 helpline; convert two buildings into staffed safe houses.',
  //           sustainability: 2,
  //           humanImpact: 4,
  //           equity: 4,
  //           innovation: 2,
  //           insight:
  //             'Call volume 10 000/mo; courts see 3× convictions, but shelters near capacity.',
  //           badge: 'Haven Builder',
  //         },
  //         {
  //           text: 'Peer-led consent curriculum',
  //           description:
  //             'Male youth clubs run workshops on respect & consent; influencers reinforce online.',
  //           sustainability: 3,
  //           humanImpact: 2,
  //           equity: 4,
  //           innovation: 3,
  //           insight:
  //             'Attitude surveys improve; violence drops more slowly (–12 %). Behaviour change is long-haul.',
  //           badge: 'Mind-set Shifter',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 6 • Clean Water & Sanitation (your Water Wars) ─────────── */
  //     {
  //       id: 'sdg6',
  //       sdg: 'SDG 6',
  //       title: 'Water Wars or Water Wins?',
  //       region: 'Horn of Africa',
  //       crisis:
  //         'Severe drought imperils 28 million people; aquifers down 60 %.',
  //       mission: 'Deploy US $10 million to secure safe water quickly.',
  //       postChoiceInsight: 'Water equity prevents conflict.',
  //       badges: ['Water Warrior'],
  //       choices: [
  //         {
  //           text: 'Build a mega-dam',
  //           description: 'Control river flow with large-scale infrastructure.',
  //           sustainability: 2,
  //           humanImpact: 3,
  //           equity: 1,
  //           innovation: 1,
  //           insight:
  //             'Irrigation rises, but 8000 people displaced; neighbours protest.',
  //           badge: 'Infrastructure Strategist',
  //         },
  //         {
  //           text: 'Solar water purifiers',
  //           description: 'Localised clean water for 200 villages.',
  //           sustainability: 4,
  //           humanImpact: 4,
  //           equity: 4,
  //           innovation: 3,
  //           insight: '400 000 people gain safe water within eight weeks.',
  //           badge: 'Water Warrior',
  //         },
  //         {
  //           text: 'Global awareness campaign',
  //           description: 'Raise donations and visibility online.',
  //           sustainability: 1,
  //           humanImpact: 1,
  //           equity: 2,
  //           innovation: 3,
  //           insight:
  //             'Raised US $2 million; change slows without local hardware.',
  //           badge: 'Awareness Advocate',
  //         },
  //         {
  //           text: 'Water-sharing treaty',
  //           description: 'Mediate cross-border water-governance agreement.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 4,
  //           insight:
  //             'Reduced tensions; shared satellite data optimises usage for all.',
  //           badge: 'Diplomatic Innovator',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 7 • Affordable & Clean Energy (your Power Shift) ─────────── */
  //     {
  //       id: 'sdg7',
  //       sdg: 'SDG 7',
  //       title: 'Power Shift',
  //       region: 'Hurricane-prone Caribbean',
  //       crisis:
  //         'Diesel grids fail each storm; electricity costs 3× global average.',
  //       mission: 'Craft a resilient, zero-carbon energy plan.',
  //       postChoiceInsight: 'Resilience and renewables go hand-in-hand.',
  //       badges: ['Sunlight Strategist'],
  //       choices: [
  //         {
  //           text: 'Rooftop solar + micro-grids',
  //           description:
  //             'Finance 10 000 roofs with batteries; micro-grids islandable in emergencies.',
  //           sustainability: 4,
  //           humanImpact: 4,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             'Outages drop 80 %; diesel imports fall 40 % in two years.',
  //           badge: 'Grid Guardian',
  //         },
  //         {
  //           text: 'Hybrid wind-diesel farms',
  //           description:
  //             'Mix wind turbines with quick-start diesel for baseload.',
  //           sustainability: 2,
  //           humanImpact: 3,
  //           equity: 2,
  //           innovation: 2,
  //           insight:
  //             'Cheaper than full solar, but locks in fossil fuels past 2035.',
  //           badge: 'Hybrid Handler',
  //         },
  //         {
  //           text: 'Wave-energy pilot',
  //           description:
  //             'Test 5 MW oscillating-buoy farm backed by research university.',
  //           sustainability: 3,
  //           humanImpact: 2,
  //           equity: 2,
  //           innovation: 4,
  //           insight:
  //             'Promising tech; maintenance costs high, needs scale-up capital.',
  //           badge: 'Blue-Power Pioneer',
  //         },
  //         {
  //           text: 'Energy-efficiency retrofit loans',
  //           description:
  //             'Zero-interest loans for insulation & efficient appliances.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 3,
  //           insight: 'Demand falls 18 %; low-income families save US $20/mo.',
  //           badge: 'Demand-Side Dynamo',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 8 • Decent Work & Economic Growth ─────────── */
  //     {
  //       id: 'sdg8',
  //       sdg: 'SDG 8',
  //       title: 'Jobs for Tomorrow',
  //       region: 'Greater Accra, Ghana',
  //       crisis:
  //         'Youth unemployment at 34 %; informal e-waste sector exposes workers to toxics.',
  //       mission:
  //         'Invest US $9 million to create 12 000 decent jobs within two years.',
  //       postChoiceInsight:
  //         'Green circular economies can fuel inclusive prosperity.',
  //       badges: ['Job Generator'],
  //       choices: [
  //         {
  //           text: 'E-waste recycling hub',
  //           description:
  //             'Formalise the scrapyard with PPE, smelters and ISO safety.',
  //           sustainability: 4,
  //           humanImpact: 4,
  //           equity: 3,
  //           innovation: 4,
  //           insight: 'Recyclers’ pay rises 60 %; lead exposure drops 70 %.',
  //           badge: 'Circular Champion',
  //         },
  //         {
  //           text: 'Code-camp scholarships',
  //           description:
  //             'Train 1000 youth in web & mobile dev; partner with remote-work firms.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             '80 % job-placement; brain-drain risk as graduates emigrate.',
  //           badge: 'Digital Dreamer',
  //         },
  //         {
  //           text: 'Agro-processing cooperatives',
  //           description:
  //             'Value-add cassava & cocoa; provide low-interest machines.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 3,
  //           insight:
  //             'Farmers’ earnings up 25 %; women hold 55 % of co-op board seats.',
  //           badge: 'Value-Chain Builder',
  //         },
  //         {
  //           text: 'Tourism tax holiday',
  //           description:
  //             'Suspend VAT for eco-lodges to spur post-COVID recovery.',
  //           sustainability: 2,
  //           humanImpact: 2,
  //           equity: 2,
  //           innovation: 2,
  //           insight:
  //             'Visitor numbers up, but seasonal jobs with low wages dominate.',
  //           badge: 'Tourism Trigger',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 9 • Industry, Innovation & Infrastructure ─────────── */
  //     {
  //       id: 'sdg9',
  //       sdg: 'SDG 9',
  //       title: 'Smart Corridors',
  //       region: 'Northern Corridor, East Africa',
  //       crisis:
  //         'Road bottlenecks add 30 % cost to regional trade; truck emissions soar.',
  //       mission:
  //         'Channel US $12 million to slash freight time and carbon intensity by 40 %.',
  //       postChoiceInsight:
  //         'Digital & physical infrastructure must evolve together.',
  //       badges: ['Corridor Commander'],
  //       choices: [
  //         {
  //           text: 'Rail-freight revitalisation',
  //           description:
  //             'Refurbish 200 km narrow-gauge line and add solar-powered depots.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 3,
  //           insight:
  //             'Truck traffic falls 22 %; farmers gain quicker export routes.',
  //           badge: 'Rail Resurrector',
  //         },
  //         {
  //           text: 'IoT traffic optimisation',
  //           description:
  //             'Install weigh-in-motion sensors & AI traffic lights at choke points.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 2,
  //           innovation: 4,
  //           insight: 'Average city-crossing time drops from 90 min to 35 min.',
  //           badge: 'Signal Savant',
  //         },
  //         {
  //           text: 'Green truck loan-blitz',
  //           description:
  //             'Subsidise LNG/electric trucks and scrap old diesel rigs.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 3,
  //           insight:
  //             'CO₂ per ton-km down 30 %, but charging infrastructure lags.',
  //           badge: 'Fleet Freshener',
  //         },
  //         {
  //           text: 'Digital customs single-window',
  //           description: 'Cloud portal automates paperwork across 5 nations.',
  //           sustainability: 3,
  //           humanImpact: 2,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             'Border clearance slashed from 3 days to 6 hours; corruption complaints drop.',
  //           badge: 'Paperless Pioneer',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 10 • Reduced Inequalities ─────────── */
  //     {
  //       id: 'sdg10',
  //       sdg: 'SDG 10',
  //       title: 'Bridging the Gap',
  //       region: 'European Union',
  //       crisis:
  //         'Roma communities face 80 % unemployment; discrimination entrenched.',
  //       mission:
  //         'Commit €6 million to cut the employment gap in half within two years.',
  //       postChoiceInsight:
  //         'Inclusion demands systemic change—legal, social, economic.',
  //       badges: ['Inclusion Innovator'],
  //       choices: [
  //         {
  //           text: 'Anti-bias employer tax credit',
  //           description:
  //             'Firms earn tax break for each Roma worker hired ≥12 mo.',
  //           sustainability: 2,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 3,
  //           insight: '12 000 jobs created; some token hiring surfaces.',
  //           badge: 'Fiscal Equalizer',
  //         },
  //         {
  //           text: 'Roma-led business incubators',
  //           description:
  //             'Seed 100 startups with coaching, micro-equity & networks.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 4,
  //           insight:
  //             'Startups grow 150 new jobs; positive media shifts public opinion.',
  //           badge: 'Startup Shepherd',
  //         },
  //         {
  //           text: 'Community paralegal network',
  //           description:
  //             'Train Roma paralegals to litigate discrimination cases.',
  //           sustainability: 3,
  //           humanImpact: 2,
  //           equity: 4,
  //           innovation: 3,
  //           insight:
  //             'Court victories set precedents; legal aid costs remain high.',
  //           badge: 'Justice Journeyman',
  //         },
  //         {
  //           text: 'Cultural exchange arts fund',
  //           description:
  //             'Touring arts festival showcases Roma heritage across capitals.',
  //           sustainability: 2,
  //           humanImpact: 2,
  //           equity: 3,
  //           innovation: 2,
  //           insight:
  //             'Softens stereotypes, but jobs gap unchanged without economic levers.',
  //           badge: 'Culture Connector',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 11 • Sustainable Cities & Communities ─────────── */
  //     {
  //       id: 'sdg11',
  //       sdg: 'SDG 11',
  //       title: 'Green Streets',
  //       region: 'Jakarta, Indonesia',
  //       crisis:
  //         'Extreme flooding and air pollution threaten 10 million residents.',
  //       mission:
  //         'Invest US $11 million to make Jakarta safer, cooler and cleaner.',
  //       postChoiceInsight:
  //         'Resilient cities blend grey & green infrastructure.',
  //       badges: ['City Saviour'],
  //       choices: [
  //         {
  //           text: 'Mangrove sea-wall combo',
  //           description:
  //             'Hybrid dykes with restored mangroves along 20 km coast.',
  //           sustainability: 4,
  //           humanImpact: 4,
  //           equity: 3,
  //           innovation: 3,
  //           insight:
  //             'Surges cut by 65 %; fisheries rebound, but land requisition uproots 500 households.',
  //           badge: 'Coast Defender',
  //         },
  //         {
  //           text: 'Bus rapid-transit expansion',
  //           description: 'Add 120 electric BRT buses + dedicated lanes.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 3,
  //           insight: 'Commute time drops 20 %; PM₂.₅ down 12 %.',
  //           badge: 'Transit Transformer',
  //         },
  //         {
  //           text: 'Cool-roof retrofits',
  //           description: 'Reflective paint grants for 50 000 low-income roofs.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 3,
  //           insight: 'Indoor temps fall 4 °C; energy bills down 18 %.',
  //           badge: 'Roof Reviver',
  //         },
  //         {
  //           text: 'Flood-sensor citizen app',
  //           description:
  //             'IoT sensors + crowdsourcing warn of flash floods in real time.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             'Evac time gains 40 min; maintenance cost manageable with ads.',
  //           badge: 'Alert Architect',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 12 • Responsible Consumption & Production ─────────── */
  //     {
  //       id: 'sdg12',
  //       sdg: 'SDG 12',
  //       title: 'Waste Not, Want Not',
  //       region: 'Seoul, South Korea',
  //       crisis:
  //         'Household food waste tops 130 kg per person annually, costing US $2 billion.',
  //       mission: 'Use ₩10 billion to halve edible food waste in two years.',
  //       postChoiceInsight: 'Smart policy + tech can slash waste and emissions.',
  //       badges: ['Waste Warrior'],
  //       choices: [
  //         {
  //           text: 'Smart bin pay-as-you-throw',
  //           description: 'RFID bins bill households by kg of organic waste.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 2,
  //           innovation: 4,
  //           insight: 'Waste drops 47 %; privacy critics raise data concerns.',
  //           badge: 'Bin Brainiac',
  //         },
  //         {
  //           text: 'Up-cycle incubator grants',
  //           description:
  //             'Fund startups turning by-products into animal feed & cosmetics.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 4,
  //           insight: 'Creates 900 green jobs, diverts 20 000 t waste.',
  //           badge: 'Up-cycle Unicorn',
  //         },
  //         {
  //           text: 'National “clean-plate” campaign',
  //           description: 'Gamified app rewards diners for finishing meals.',
  //           sustainability: 2,
  //           humanImpact: 2,
  //           equity: 3,
  //           innovation: 2,
  //           insight:
  //             'Downloads high, but plate waste reduction modest (–12 %).',
  //           badge: 'Plate Promoter',
  //         },
  //         {
  //           text: 'Cold-chain subsidies for SMEs',
  //           description:
  //             'Loans for small grocers to install efficient fridges.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 3,
  //           insight:
  //             'Spoilage cut 30 %; energy demand rises unless solar offsets added.',
  //           badge: 'Chill Champion',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 13 • Climate Action (your Hot City) ─────────── */
  //     {
  //       id: 'sdg13',
  //       sdg: 'SDG 13',
  //       title: 'Hot City, Cool Solutions',
  //       region: 'São Paulo, Brazil',
  //       crisis:
  //         'Record heatwave; concrete jungle traps heat, poorest districts suffer.',
  //       mission: 'Lower urban heat-island by 2 °C in 24 months.',
  //       postChoiceInsight: 'Nature-based solutions save lives and energy.',
  //       badges: ['Climate Coolmaker'],
  //       choices: [
  //         {
  //           text: 'Urban forest corridors',
  //           description: 'Plant 200 000 native trees along commuter arteries.',
  //           sustainability: 4,
  //           humanImpact: 4,
  //           equity: 4,
  //           innovation: 3,
  //           insight: 'Ambient temps drop 1.3 °C; asthma ER visits down 9 %.',
  //           badge: 'Shade Shaper',
  //         },
  //         {
  //           text: 'Reflective asphalt pilot',
  //           description: 'Coat 50 km roads with high-albedo surface.',
  //           sustainability: 3,
  //           humanImpact: 2,
  //           equity: 2,
  //           innovation: 4,
  //           insight: 'Surface temps 8 °C cooler; glare complaints by drivers.',
  //           badge: 'Mirror-Street Maker',
  //         },
  //         {
  //           text: 'School cooling microgrids',
  //           description:
  //             'Solar + battery AC hubs open to public during heatwaves.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 4,
  //           insight:
  //             'Shelters host 40 000 residents; power payback in six years.',
  //           badge: 'Shelter Spark',
  //         },
  //         {
  //           text: 'Extreme-heat insurance',
  //           description:
  //             'Parametric policy pays city when temps exceed 40 °C for 3 days.',
  //           sustainability: 2,
  //           humanImpact: 2,
  //           equity: 2,
  //           innovation: 4,
  //           insight:
  //             'Frees cash for emergency water stations; critics fear moral hazard.',
  //           badge: 'Risk Wrangler',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 14 • Life Below Water ─────────── */
  //     {
  //       id: 'sdg14',
  //       sdg: 'SDG 14',
  //       title: 'Blue Rescue',
  //       region: 'Coral Triangle, Philippines',
  //       crisis:
  //         'Dynamite fishing scars reefs; fish stocks down 50 % in a decade.',
  //       mission:
  //         'Deploy US $6 million to restore biodiversity and secure fishers’ livelihoods.',
  //       postChoiceInsight:
  //         'Healthy oceans feed billions and buffer climate shocks.',
  //       badges: ['Ocean Guardian'],
  //       choices: [
  //         {
  //           text: 'Community no-take zones',
  //           description:
  //             'Fishers self-patrol marine reserves; government buys catch shortfall.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 3,
  //           insight: 'Reef fish biomass rebounds 200 % in four years.',
  //           badge: 'Reef Ranger',
  //         },
  //         {
  //           text: 'Artificial reef modules',
  //           description:
  //             'Drop 500 3-D-printed limestone structures seeded with coral.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 2,
  //           innovation: 4,
  //           insight: 'Coral cover +18 %; tourism divers generate new income.',
  //           badge: 'Coral Crafter',
  //         },
  //         {
  //           text: 'Satellite illegal-fishing watch',
  //           description:
  //             'Machine-learning flags dark vessels; alert coast guard in real-time.',
  //           sustainability: 4,
  //           humanImpact: 2,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             'Poaching fines finance program; enforcement gaps at night.',
  //           badge: 'Sky-Sea Sentinel',
  //         },
  //         {
  //           text: 'Seaweed women cooperatives',
  //           description: 'Train women to farm kelp, absorbing nutrients & CO₂.',
  //           sustainability: 4,
  //           humanImpact: 4,
  //           equity: 4,
  //           innovation: 3,
  //           insight: '2000 jobs created; seaweed exported for bioplastics.',
  //           badge: 'Kelp Keeper',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 15 • Life on Land ─────────── */
  //     {
  //       id: 'sdg15',
  //       sdg: 'SDG 15',
  //       title: 'Forest Frontlines',
  //       region: 'Congo Basin, DRC',
  //       crisis: 'Illegal logging accelerates; 500 000 ha lost annually.',
  //       mission:
  //         'Invest US $10 million to cut deforestation 50 % in five years.',
  //       postChoiceInsight: 'Standing forests are worth more alive than felled.',
  //       badges: ['Forest Defender'],
  //       choices: [
  //         {
  //           text: 'Carbon credit revenue-share',
  //           description: 'Community forests earn from REDD+ carbon offsets.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 4,
  //           insight: 'Villages earn US $35 / ha; forest loss slows 40 %.',
  //           badge: 'Carbon Custodian',
  //         },
  //         {
  //           text: 'Timber traceability blockchain',
  //           description: 'QR codes track logs from stump to port.',
  //           sustainability: 3,
  //           humanImpact: 2,
  //           equity: 2,
  //           innovation: 4,
  //           insight: 'Illegal shipments drop 25 %; smartphone coverage patchy.',
  //           badge: 'Ledger Logger',
  //         },
  //         {
  //           text: 'Agro-forestry swap loans',
  //           description:
  //             'Farmers transition 20 000 ha to cocoa-shade agro-forestry.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 3,
  //           insight: 'Income +30 %; biodiversity corridors reconnect wildlife.',
  //           badge: 'Shade Farmer',
  //         },
  //         {
  //           text: 'Drone LiDAR patrols',
  //           description: 'Weekly flyovers detect new clearings in 3 D.',
  //           sustainability: 3,
  //           humanImpact: 2,
  //           equity: 3,
  //           innovation: 4,
  //           insight: 'Response time to infractions shrinks to 24 h.',
  //           badge: 'Eye-in-Sky',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 16 • Peace, Justice & Strong Institutions ─────────── */
  //     {
  //       id: 'sdg16',
  //       sdg: 'SDG 16',
  //       title: 'Justice for All',
  //       region: 'Post-conflict Sierra Leone',
  //       crisis: 'Court backlog of 60 000 cases; trust in police at 22 %.',
  //       mission:
  //         'Spend US $5 million to double case-clearance and raise public trust to 50 %.',
  //       postChoiceInsight: 'Transparent systems underwrite lasting peace.',
  //       badges: ['Justice Architect'],
  //       choices: [
  //         {
  //           text: 'Mobile court caravans',
  //           description: 'Pop-up courthouses travel to rural chiefdoms.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 3,
  //           insight: 'Case time drops from 2 years to 5 months.',
  //           badge: 'Circuit Captain',
  //         },
  //         {
  //           text: 'e-Filing digitisation',
  //           description:
  //             'Scan & index all case files; AI triage minor offences.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 4,
  //           insight: 'Backlog cut 40 %; staff retrained, unions sceptical.',
  //           badge: 'Digital Docketeer',
  //         },
  //         {
  //           text: 'Community policing app',
  //           description:
  //             'Anonymous crime reporting with blockchain evidence seals.',
  //           sustainability: 3,
  //           humanImpact: 2,
  //           equity: 3,
  //           innovation: 4,
  //           insight: 'Crime tips up 300 %; misuse allegations surface.',
  //           badge: 'Trust Tracker',
  //         },
  //         {
  //           text: 'Restorative-justice circles',
  //           description:
  //             'Train mediators to resolve low-level disputes outside courts.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 4,
  //           innovation: 3,
  //           insight: 'Recidivism falls 18 %; women mediators boost acceptance.',
  //           badge: 'Peace Weaver',
  //         },
  //       ],
  //     },

  //     /* ─────────── SDG 17 • Partnerships for the Goals ─────────── */
  //     {
  //       id: 'sdg17',
  //       sdg: 'SDG 17',
  //       title: 'Power of Partnership',
  //       region: 'Global',
  //       crisis:
  //         'Fragmented donor projects duplicate efforts; only 54 % align with national plans.',
  //       mission:
  //         'Deploy US $3 million to unlock US $300 million of aligned finance within a year.',
  //       postChoiceInsight:
  //         'Collaboration multiplies impact far beyond any single actor.',
  //       badges: ['Partnership Pro'],
  //       choices: [
  //         {
  //           text: 'Shared SDG data dashboard',
  //           description:
  //             'Open-API platform tracks donor, NGO & gov projects in real time.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             'Overlapping projects cut 25 %; policymakers optimise gaps.',
  //           badge: 'Data Diplomat',
  //         },
  //         {
  //           text: 'Match-funding challenge',
  //           description:
  //             'Every private dollar matched 2:1 by multilateral bank.',
  //           sustainability: 3,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 3,
  //           insight:
  //             'Unlocks US $270 million, but smaller NGOs struggle to meet terms.',
  //           badge: 'Finance Multiplier',
  //         },
  //         {
  //           text: 'South-South peer academy',
  //           description:
  //             'Train 100 officials from 30 countries to co-design projects.',
  //           sustainability: 3,
  //           humanImpact: 2,
  //           equity: 3,
  //           innovation: 3,
  //           insight:
  //             'Creates networks, but outcomes delayed without funding links.',
  //           badge: 'Peer Partner',
  //         },
  //         {
  //           text: 'Global SDG bond index',
  //           description:
  //             'Rating tool steers investors to high-impact sovereign bonds.',
  //           sustainability: 4,
  //           humanImpact: 3,
  //           equity: 3,
  //           innovation: 4,
  //           insight:
  //             'Capital flows shift; interest rates drop 0.3 % for compliant countries.',
  //           badge: 'Bond Builder',
  //         },
  //       ],
  //     },
  //   ];
  // }
}
