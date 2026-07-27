import { Component } from '@angular/core';

@Component({
    selector: 'app-solution-a-thon',
    templateUrl: './solution-a-thon.component.html',
    styleUrls: ['./solution-a-thon.component.css'],
    standalone: false
})
export class SolutionAThonComponent {
  readonly challenges = [
    'Food systems and hunger',
    'Health access and affordability',
    'Clean energy and climate resilience',
    'Housing access and affordability',
    'Public safety, crime, and gun violence',
    'Education equity and access',
    'Water and infrastructure',
    'Social inequalities, discrimination, and racism',
    'Environmental and safety concerns',
  ];

  readonly schedule = [
    {
      time: '9:00 AM',
      title: 'Problem State',
      body:
        'Teams define the real-world problem, its symptoms and causes, the people and places affected, current constraints, and what happens if nothing is done. Bucky helps expand the breadth, depth, and speed of research.',
    },
    {
      time: '9:30 AM',
      title: 'Preferred State',
      body:
        'Teams envision a future without the problem, what that future looks like, and its impacts. Bucky helps extend the team’s vision and explore second-order effects.',
    },
    {
      time: '10:00 AM',
      title: 'Solution Architecture',
      body:
        'Teams design the intervention—what is done and how—along with the stakeholders, resources, costs, and intended impacts.',
    },
    {
      time: '1:00 PM',
      title: 'Solution Implementation',
      body:
        'Teams build an implementation strategy covering partners, funders, responsibilities, timing, location, obstacles, resilience, backup plans, and measures of success.',
    },
    {
      time: '1:45 PM',
      title: 'Submit Solution Brief',
      body:
        'Solution Briefs are submitted for evaluation, and teams prepare a concise five-minute final pitch.',
    },
    {
      time: '2:00 PM',
      title: 'Present the Solution',
      body:
        'Teams present their solution pitch. The host can schedule judging and an optional awards livestream after the presentations.',
    },
  ];

  readonly criteria = [
    { weight: '15%', label: 'Near-term real-world impact' },
    { weight: '25%', label: 'Comprehensive solution design and implementation strategy' },
    { weight: '20%', label: 'Feasibility and affordability' },
    { weight: '20%', label: 'Addresses equity and justice' },
    { weight: '15%', label: 'Builds community' },
    { weight: '5%', label: 'Clarity, communication, and pitch' },
  ];

  readonly hostPreparation = [
    'Choose one or more community problems.',
    'Identify and invite participants from the community.',
    'Prepare the space and catering for a brief lunch.',
    'Invite local solution evaluators.',
    'Provide reliable Wi-Fi, A/V, and room for teams of 3-5.',
  ];

  readonly typicalSchedule = [
    '9:00 AM · Morning session begins',
    '12:00 PM · Lunch',
    '12:30 PM · Afternoon session begins',
    '1:45 PM · Solution Briefs submitted and team presentations begin',
    '2:00 PM or later · Winner announced and optional prizes awarded',
  ];

  readonly solutionStructure = [
    'Define the problem.',
    'Envision a preferred future.',
    'Develop the solution: how it works, impacts, resources, and costs.',
    'Develop the implementation strategy: responsibilities, partners, funders, and next steps.',
  ];

  readonly hostBenefits = [
    'A Global/Local Community Solutions Lab platform customized for your local situation, with specialized AI colleagues for sprint coaching and research.',
    'A structured systems-thinking and design-science methodology that turns vague or intractable problems into fundable, community-building prototypes.',
    'A lower-cost, higher-creativity alternative to consultants, innovation workshops, commissioned research studies, or continued inaction.',
    'A solution and implementation brief created by your organization—a practical foundation for funding proposals, partnerships, membership recruitment, and public outreach.',
    'An engaging event that brings your organization and community together around a shared challenge.',
  ];

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
