import {
  PlaygroundQuestionLanguage,
  ResolvedPlaygroundQuestionTemplate,
} from '../models/challenge-question-template';

export const PLAYGROUND_QUESTION_SCHEMA_VERSION = 1 as const;

export const PLAYGROUND_QUESTION_KEYS: readonly (readonly string[])[] = [
  ['S1-A', 'S1-B', 'S1-C', 'S1-D'],
  ['S2-A', 'S2-B'],
  ['S3-A', 'S3-B', 'S3-C', 'S3-D', 'S3-E'],
  ['S4-A', 'S4-B', 'S4-C', 'S4-D', 'S4-E', 'S4-F', 'S4-G', 'S4-H', 'S4-I', 'S4-J', 'S4-K', 'S4-L', 'S4-M', 'S4-N'],
  ['S5'],
] as const;

export const PLAYGROUND_QUESTION_SECTIONS = [
  'Step 1 · Defining the Problem State',
  'Step 2 · Envisioning the Preferred State',
  'Step 3 · Developing Our Solution',
  'Step 4 · Implementation',
  'Strategy Review',
] as const;

const DEFAULT_QUESTIONS: Record<PlaygroundQuestionLanguage, readonly (readonly string[])[]> = {
  en: [
    [
      `What is the problem you have chosen and why is it important? 
(Answer these questions first from your personal knowledge. Then Ask Bucky.)`,
      `What are the symptoms of this problem? How do you measure it? (Answer these 2 questions first from your personal knowledge. Then Ask Bucky or answer from your knowledge: What are the causes of these symptoms? What underlying systems produce this outcome? What economic, social, technological, environmental, or cultural drivers are involved? Who are the major actors, organizations, agencies, or people involved with the problem? These additional questions can provide deeper insight into the problem.)`,
      `How many people does this problem impact in the world? Where is it most severe? (If you don't know, ask Bucky, or use the data sources provided when you click on the "?" .)`,
      `What will happen if nothing is done to deal with this problem? (Answer this first from your personal knowledge. Then Ask Bucky: "Who will bear the cost if nothing is done?")`,
    ],
    [
      `What is the preferred or ideal state that you want to reach with your solution? What is your goal? What will the world look like if this problem is solved? What will your ideal state look like in terms of equity and sustainability? (Answer these questions first from your personal knowledge. Then Ask Bucky.)`,
      `How will you measure success? How will you know when you reach the preferred state? (Answer this first from your personal knowledge. Then Ask Bucky.)`,
    ],
    [
      "What are some possible solutions? Think of 3 or more. Can they be combined? What is our solution to the problem? What does it do to reach the preferred state? How will it do it? What are the leverage points, where could small changes produce large effects? (If you don't have a solution, ask your teammates for their ideas. If you don't have teammates, check the Solutions Library to get some ideas, and/or Ask Bucky what he thinks is a solution that will get you from the Problem to the Preferred State.)",
      'What technology, programs, policies will it need?',
      'What resources does our solution need? Will it need community buy-in? If so, how will you get it?',
      'Is there a business opportunity in the solution? Is it possible to meet need/solve the problem through a business? If so, what is this business? What will it do or sell? (If this question is not relevant to your solution, ignore it.)',
      'How is our solution part of a circular, regenerative, more equitable economy?',
    ],
    [
      `Cost 1. How much will our strategy cost to test, for a proof-of-concept, in the country where we will test and first implement the solution?  (Answer this as best you can. Then ask Bucky. See `,
      'Cost 2. How much will our strategy cost to implement at scale?',
      'Where will we get the resources and funding or investment needed to implement our solution, to do the above?',
      'Who will implement our solution? Where will it be tested (and first implemented)? Who will be our in-country/on-the-ground partner?',
      'What actions are needed in the next 6-12 months to get our solution implemented? Who will do what, when, where?',
      'What does our implemented strategy look like, in more detail? (For this task ask one of our AI colleagues to describe what the strategy will look like when implemented).',
      'Results 1. Ask Bucky, and/or one of your AI Colleagues, "What are the results of implementing our strategy? What would be the results of providing everyone in a community ____________ (insert description of your strategy) on the local economy, jobs, environment, human health, and other social factors?"',
      'Results 2. Ask Bucky, and/or one of your AI Colleagues, "What would be the results of providing everyone in the world ____________ (insert description of your strategy) on the global economy, additional jobs, environment, human health, and other social factors?"',
      'Describe how your strategy achieves the Preferred State you developed.',
      'Describe how your strategy positively impacts the environment.',
      'Describe the best funding sources for your strategy’s implementation.',
      'Describe how your strategy is equitable and/or socially just.',
      'What would we do with $10,000 to advance the strategy towards implementation?',
      'What can you/your team do — starting now, with just the resources to which you have access, to move your strategy forward?',
    ],
    ['Review Your Entire Strategy, Preview it, Add what you think might be missing, add Title, Names of Team members, Format it for publication.'],
  ],
  fr: [
    [
      `Quel problème avez-vous choisi et pourquoi est-il important ?
(Répondez d'abord à ces questions selon vos propres connaissances. Puis demandez à Bucky.)`,
      `Quels sont les symptômes de ce problème ? Comment le mesurez-vous ? (Répondez d'abord à ces deux questions selon vos connaissances, puis demandez à Bucky — après ces questions, demandez à Bucky ou répondez selon vos connaissances : quelles sont les causes de ces symptômes ? Cela apporte un éclairage plus profond sur le problème.)`,
      `Combien de personnes ce problème touche-t-il dans le monde ? Où est-il le plus grave ? (Si vous ne le savez pas, demandez à Bucky ou utilisez les sources de données proposées lorsque vous cliquez sur le " ? ".)`,
      `Que se passera-t-il si rien n'est fait pour résoudre ce problème ? (Répondez d'abord selon vos propres connaissances. Puis demandez à Bucky.)`,
    ],
    [
      `Quel est l'état souhaité ou idéal que vous voulez atteindre avec votre solution ? Quel est votre objectif ? À quoi ressemblera le monde si ce problème est résolu ? (Répondez d'abord selon vos propres connaissances. Puis demandez à Bucky.)`,
      `Comment mesurerez-vous le succès ? Comment saurez-vous que vous avez atteint l'état souhaité ? (Répondez d'abord selon vos connaissances. Puis demandez à Bucky.)`,
    ],
    [
      `Que fait notre solution pour atteindre l'état souhaité ? Comment y parvient-elle ? (Si vous n'avez pas encore de solution, consultez la bibliothèque des solutions pour trouver des idées et/ou demandez à Bucky ce qu'il pense être une solution qui vous fera passer de l'état du problème à l'état souhaité.)`,
      `De quelles technologies, programmes ou politiques aura-t-elle besoin ?`,
      `De quelles ressources notre solution a-t-elle besoin ?`,
      `Existe-t-il une opportunité commerciale dans la solution ? Est-il possible de répondre au besoin/de résoudre le problème par une entreprise ? Si oui, quelle est cette entreprise ? Que fera-t-elle ou que vendra-t-elle ? (Si cette question n'est pas pertinente pour votre solution, ignorez-la.)`,
      `En quoi notre solution participe-t-elle à une économie circulaire, régénératrice et plus équitable ?`,
    ],
    [
      `Coût 1. Combien coûtera notre stratégie pour être testée, en preuve de concept, dans le pays où nous la testerons et la mettrons en œuvre pour la première fois ? (Répondez du mieux possible, puis demandez à Bucky. Voir `,
      `Coût 2. Combien coûtera notre stratégie pour être mise en œuvre à grande échelle ?`,
      `Où obtiendrons-nous les ressources et le financement ou l'investissement nécessaires pour mettre en œuvre notre solution, comme décrit ci-dessus ?`,
      `Qui mettra en œuvre notre solution ? Où sera-t-elle testée (et déployée en premier) ? Qui sera notre partenaire sur le terrain/dans le pays ?`,
      `Quelles actions sont nécessaires dans les 6 à 12 prochains mois pour mettre en œuvre notre solution ? Qui fera quoi, quand et où ?`,
      `À quoi ressemble, plus en détail, notre stratégie une fois mise en œuvre ? (Pour cette tâche, demandez à l'un de nos collègues IA de décrire à quoi ressemblera la stratégie une fois en place.)`,
      `Résultats 1. Demandez à Bucky ou à l'un de vos collègues IA : " Quels sont les résultats de la mise en œuvre de notre stratégie ? Quels seraient les effets de fournir à toute une communauté ____________ (décrivez votre stratégie) sur l'économie locale, l'emploi, l'environnement, la santé humaine et d'autres facteurs sociaux ? "`,
      `Résultats 2. Demandez à Bucky ou à l'un de vos collègues IA : " Quels seraient les effets de fournir à toute la planète ____________ (décrivez votre stratégie) sur l'économie mondiale, les emplois supplémentaires, l'environnement, la santé humaine et d'autres facteurs sociaux ? "`,
      `Décrivez comment votre stratégie atteint l'état souhaité que vous avez défini.`,
      `Décrivez comment votre stratégie a un impact positif sur l'environnement.`,
      `Décrivez les meilleures sources de financement pour la mise en œuvre de votre stratégie.`,
      `Décrivez en quoi votre stratégie est équitable et/ou socialement juste.`,
      `Que ferions-nous avec 10 000 $ pour faire avancer la stratégie vers la mise en œuvre ?`,
      `Que pouvez-vous/votre équipe faire — dès maintenant, avec les seules ressources auxquelles vous avez accès — pour faire progresser votre stratégie ?`,
    ],
    [`Relisez l'ensemble de votre stratégie, prévisualisez-la, ajoutez ce qui pourrait manquer, ajoutez un titre, les noms des membres de l'équipe, et mettez-la en forme pour la publication.`],
  ],
};

export const PLAYGROUND_QUESTION_KEYS_FLAT = PLAYGROUND_QUESTION_KEYS.flat();

export function getDefaultQuestionLocales(): Record<PlaygroundQuestionLanguage, Record<string, string>> {
  return {
    en: questionsToRecord(DEFAULT_QUESTIONS.en),
    fr: questionsToRecord(DEFAULT_QUESTIONS.fr),
  };
}

export function getDefaultQuestions(language: PlaygroundQuestionLanguage): string[][] {
  return DEFAULT_QUESTIONS[language].map((section) => [...section]);
}

export function questionRecordToGroups(values: Record<string, string>): string[][] {
  return PLAYGROUND_QUESTION_KEYS.map((section) => section.map((key) => values[key]));
}

export function resolveQuestionTemplate(
  challengePageId: string | null,
  template: {
    mode?: 'standard' | 'custom';
    revision?: number;
    locales?: Partial<Record<PlaygroundQuestionLanguage, Record<string, string>>>;
  } | null | undefined
): ResolvedPlaygroundQuestionTemplate {
  const defaults = getDefaultQuestionLocales();
  if (!template || template.mode !== 'custom') {
    return { challengePageId, mode: 'standard', revision: Number(template?.revision || 0), locales: defaults };
  }

  const locales = (['en', 'fr'] as PlaygroundQuestionLanguage[]).reduce((result, language) => {
    const incoming = template.locales?.[language] || {};
    result[language] = { ...defaults[language] };
    PLAYGROUND_QUESTION_KEYS_FLAT.forEach((key) => {
      const value = incoming[key];
      if (typeof value === 'string' && value.trim()) result[language][key] = value;
    });
    return result;
  }, {} as Record<PlaygroundQuestionLanguage, Record<string, string>>);

  return { challengePageId, mode: 'custom', revision: Number(template.revision || 0), locales };
}

function questionsToRecord(groups: readonly (readonly string[])[]): Record<string, string> {
  const result: Record<string, string> = {};
  PLAYGROUND_QUESTION_KEYS.forEach((keys, sectionIndex) => {
    keys.forEach((key, questionIndex) => {
      result[key] = groups[sectionIndex][questionIndex];
    });
  });
  return result;
}
