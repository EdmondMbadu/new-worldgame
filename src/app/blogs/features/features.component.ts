import { Component, OnInit } from '@angular/core';

interface HighlightStat {
  value: string;
  label: string;
  detail: string;
}

interface BriefSection {
  title: string;
  eyebrow: string;
  description: string;
  items: string[];
}

interface WorkflowStep {
  step: string;
  title: string;
  description: string;
}

interface FeatureItem {
  title: string;
  description: string;
}

interface FeatureCluster {
  title: string;
  description: string;
  items: string[];
}

@Component({
  selector: 'app-features',
  templateUrl: './features.component.html',
  styleUrl: './features.component.css',
})
export class FeaturesComponent implements OnInit {
  readonly highlightStats: HighlightStat[] = [
    {
      value: 'Weekly',
      label: 'AI intelligence brief',
      detail: 'A recurring report built around the exact solution you are developing.',
    },
    {
      value: 'Funding',
      label: 'opportunities surfaced',
      detail: 'Relevant grant makers, accelerators, and mission-aligned programs.',
    },
    {
      value: 'News',
      label: 'signals tracked',
      detail: 'Research, headlines, and new developments connected to your issue area.',
    },
    {
      value: 'Team',
      label: 'momentum prompts',
      detail: 'Clear reminders to invite collaborators, strengthen teams, and act.',
    },
  ];

  readonly briefSections: BriefSection[] = [
    {
      eyebrow: 'Why it matters',
      title: 'Your solution now has an AI agent working for it every week',
      description:
        'The Weekly Intelligence Report turns NewWorld Game from a one-time drafting tool into an ongoing intelligence system. It keeps scanning for what your team needs next so your work does not go stale after the first draft.',
      items: [
        'Connects new funding opportunities to the mission of your solution',
        'Surfaces relevant news, frameworks, and emerging developments',
        'Keeps your collaborators visible and encourages team growth',
        'Points you toward new projects and communities worth joining',
      ],
    },
    {
      eyebrow: 'What the brief includes',
      title: 'A practical report, not generic AI output',
      description:
        'Each brief is structured to help a real team move from insight to action. It can include mission-aligned organizations, news with relevance notes, current team members, open team opportunities, and direct prompts for next steps.',
      items: [
        'Funding Opportunities: aligned organizations and why they fit',
        'In the News: current headlines with explanation of relevance',
        'Your Team: visibility into the people building the solution',
        'Open Team Opportunities: related projects and collaboration pathways',
      ],
    },
    {
      eyebrow: 'What makes it special',
      title: 'This is platform intelligence tied to an actual problem-solving workflow',
      description:
        'Most AI tools answer a prompt and stop. NewWorld Game keeps supporting the solution after the initial build, using the context of the challenge, preferred state, strategy, and team to generate an ongoing stream of useful intelligence.',
      items: [
        'Grounded in your solution title, mission, and challenge area',
        'Useful for classrooms, communities, nonprofits, and local teams',
        'Supports both individual builders and collaborative groups',
        'Turns AI from chatbot novelty into sustained problem-solving support',
      ],
    },
  ];

  readonly workflowSteps: WorkflowStep[] = [
    {
      step: '01',
      title: 'Build your solution',
      description:
        'Use the 5-step NewWorld Game workflow to define the problem state, preferred future, strategy, resources, and review plan.',
    },
    {
      step: '02',
      title: 'Activate AI support',
      description:
        'Ask Bucky and the AI colleagues for help shaping the solution, filling gaps, clarifying assumptions, and strengthening the design.',
    },
    {
      step: '03',
      title: 'Receive weekly intelligence',
      description:
        'Get a recurring intelligence brief with new funding, relevant headlines, collaboration opportunities, and prompts to keep moving.',
    },
  ];

  readonly featureIndex: FeatureItem[] = [
    {
      title: 'Simple onboarding',
      description:
        'Quick account creation and sign-in so users can move directly into solution building.',
    },
    {
      title: 'Personalized dashboard',
      description:
        'A home base for navigating challenges, active work, and progress across the platform.',
    },
    {
      title: 'Launch your solution',
      description:
        'Create a custom or pre-built challenge with title, SDGs, image, team, and evaluators.',
    },
    {
      title: '5-step solution builder',
      description:
        'Define the problem state, preferred future, strategy, resources, and final review in a structured workflow.',
    },
    {
      title: 'Ask Bucky',
      description:
        'Get AI support for systems thinking, writing, framing, and solution development.',
    },
    {
      title: 'Specialized AI colleagues',
      description:
        'Work with multiple AI perspectives for storytelling, planning, inclusion, energy, and ecosystem thinking.',
    },
    {
      title: 'Auto-save progress',
      description:
        'Keep work safe as solutions evolve over time instead of losing momentum between sessions.',
    },
    {
      title: 'Team collaboration',
      description:
        'Invite collaborators, work asynchronously, and build solutions as a real team.',
    },
    {
      title: 'In-app video calling',
      description:
        'Meet directly inside the solution workspace for live reviews, planning, and coordination.',
    },
    {
      title: 'Submit and manage solutions',
      description:
        'Move from working draft to submitted solution, then continue to edit and manage it.',
    },
    {
      title: 'Peer evaluation',
      description:
        'Use structured evaluation to improve quality and support tournament readiness.',
    },
    {
      title: 'Tournament pathways',
      description:
        'Strong solutions can move into competitive visibility, recognition, and prize opportunities.',
    },
    {
      title: 'Rich content editor',
      description:
        'Add images and richer content so ideas are easier to communicate and present.',
    },
    {
      title: 'Broadcast and visibility',
      description:
        'Position solutions for wider discovery, collaboration, and public-facing storytelling.',
    },
  ];

  readonly platformClusters: FeatureCluster[] = [
    {
      title: 'Design the solution',
      description:
        'Structured tools for turning a vague problem into a defensible, workable strategy.',
      items: [
        'Simple onboarding and personalized dashboard',
        'Launch a custom or pre-built challenge',
        '5-step solution builder with prompts and references',
        'Auto-save, full editing, and rich content support',
      ],
    },
    {
      title: 'Work with AI',
      description:
        'AI support is embedded across the platform, from drafting and research to long-term follow-through.',
      items: [
        'Ask Bucky for strategy, writing, and systems thinking support',
        'Specialized AI colleagues for different domains and perspectives',
        'Weekly Intelligence Reports tied to your active solution',
        'Ongoing discovery of relevant news, ideas, and opportunities',
      ],
    },
    {
      title: 'Build the team',
      description:
        'NewWorld Game is designed for collaborative work, not solo documents sitting in folders.',
      items: [
        'Invite team members and evaluators into each solution',
        'Coordinate asynchronous collaboration from one workspace',
        'Use in-app video calling for live meetings and reviews',
        'See related teams and open opportunities across the platform',
      ],
    },
    {
      title: 'Advance and share',
      description:
        'Move from draft to evaluation, tournament participation, and wider exposure.',
      items: [
        'Submit completed work from the strategy review step',
        'View, update, and manage pending or submitted solutions',
        'Peer evaluation and tournament qualification pathways',
        'Broadcast-ready positioning for high-impact solution stories',
      ],
    },
  ];

  readonly sampleSections = [
    {
      title: 'Funding Opportunities',
      detail:
        'Mission-aligned organizations such as grant makers, accelerators, and academies, each paired with a short explanation of why they matter to the solution.',
    },
    {
      title: 'In the News',
      detail:
        'Current headlines connected to the team’s work, with notes on why each development matters for strategy, timing, or evidence.',
    },
    {
      title: 'Your Team',
      detail:
        'A snapshot of the people already connected to the solution so contributors stay visible and momentum stays social.',
    },
    {
      title: 'Open Team Opportunities',
      detail:
        'Other active projects people can explore or join, reinforcing the network effect of NewWorld Game.',
    },
    {
      title: 'Take Action',
      detail:
        'Direct prompts to schedule a call, invite collaborators, or give feedback on the brief so action follows insight.',
    },
  ];

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }
}
