import { Component } from '@angular/core';

@Component({
  selector: 'app-solution-a-thon',
  templateUrl: './solution-a-thon.component.html',
  styleUrls: ['./solution-a-thon.component.css'],
})
export class SolutionAThonComponent {
  readonly facts = [
    { value: '20+', label: 'Years of GSL methodology' },
    { value: '300+', label: 'Student designers and participants' },
    { value: '40', label: 'Countries represented' },
    { value: '3', label: 'Published solution volumes' },
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
