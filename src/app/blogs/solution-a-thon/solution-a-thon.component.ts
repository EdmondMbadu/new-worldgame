import { Component } from '@angular/core';

@Component({
  selector: 'app-solution-a-thon',
  templateUrl: './solution-a-thon.component.html',
  styleUrls: ['./solution-a-thon.component.css'],
})
export class SolutionAThonComponent {
  readonly facts = [
    { value: 'Oct 24', label: 'Saturday, 2026' },
    { value: '$15K', label: 'Prize pool' },
    { value: '3-5', label: 'Students per team' },
    { value: '2', label: 'Student divisions' },
    { value: '5', label: 'SDG tracks' },
  ];

  readonly tracks = [
    'Food systems and hunger',
    'Health access and resilient communities',
    'Clean energy and climate',
    'Education and opportunity',
    'Water, cities, and infrastructure',
  ];

  readonly schedule = [
    ['11:00 AM', 'Problem State', 'Teams define the real-world problem, affected people, constraints, and what current systems fail to do.'],
    ['12:00 PM', 'Preferred State', 'Bucky reviews the framing, flags gaps, and teams describe what a better outcome would look like.'],
    ['1:00 PM', 'Solution Architecture', 'Teams design the intervention, stakeholders, implementation partners, resources, and first-year plan.'],
    ['3:00 PM', 'Stress Test', 'Teams examine second-order effects, scale risks, failure modes, and measurement.'],
    ['4:30 PM', 'Submit Brief', 'Solution Briefs are submitted for judging; teams prepare a concise final pitch.'],
    ['6:30 PM', 'Awards Livestream', 'Judges announce the winning solutions, track awards, AI-native award, and audience choice.'],
  ];

  readonly prizes = [
    { title: 'Grand Prize', value: '$5,000', detail: 'Best overall Solution Brief across both divisions.' },
    { title: 'SDG Track Winners', value: '5 awards', detail: 'One winning team in each challenge track.' },
    { title: 'Best AI-Native Solution', value: '$2,000', detail: 'For the team that uses AI most thoughtfully as a design partner.' },
    { title: "People's Choice", value: '$1,000', detail: 'Selected by the national audience during the awards livestream.' },
    { title: 'Solutions Fellow Badges', value: 'Recognition', detail: 'Awarded to outstanding students and teams for post-event momentum.' },
    { title: 'School Banner Award', value: 'Recognition', detail: 'For the hub with the strongest participation and solution quality.' },
  ];

  readonly formatMoves = [
    {
      number: '01',
      title: 'The 14-day Track Brief',
      timing: 'T - 14 days',
      body:
        'Each team receives a track-specific packet with the state of the world, canonical numbers, existing approaches, and the judging rubric before event day.',
    },
    {
      number: '02',
      title: 'Teams lock before the day begins',
      timing: 'Before Oct 24',
      body:
        'Teams register with their roster and track choice, then hold one pre-event meeting to write a short problem-framing statement.',
    },
    {
      number: '03',
      title: 'A structured Solution Brief',
      timing: 'Day of sprint',
      body:
        'Teams do not start from a blank page. The template requires Problem State, Preferred State, Stakeholder Map, Solution Architecture, Resources Needed, Feasibility, Second-Order Effects, and Measurement.',
    },
    {
      number: '04',
      title: 'Bucky as design-science coach',
      timing: 'All day',
      body:
        'Bucky prompts the Fuller-style questions teams might otherwise miss: who pushes back, what breaks at scale, what happens when funding dries up, and how impact is measured.',
    },
    {
      number: '05',
      title: 'Phase-boxed design time',
      timing: 'All day',
      body:
        'The clock maps to the Solution Brief sections so teams spend the day designing, stress-testing, and making their thinking visible.',
    },
  ];

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
