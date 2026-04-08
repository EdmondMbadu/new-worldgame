export interface VideoCard {
  id: string;
  src: string;
  title: string;
  label: string;
  heading: string;
  description: string;
}

export interface TeamProfile {
  profilePicPath: string;
  name: string;
  title?: string;
  description: string;
}

export interface LabInfoCard {
  icon: string;
  title: string;
  description: string;
}

export interface GlobalLabContent {
  hero: {
    title: string;
    subtitle: string;
    dates: string;
    host: string;
    impactLine: string;
    intro: string;
    registerCta: string;
  };
  focus: {
    title: string;
    lead: string;
    areas: string[];
    otherOptionsLead: string;
    otherOptions: string[];
    aiTitle: string;
    aiParagraphs: string[];
    featureTitle: string;
    quote: string;
    quoteAuthor: string;
    featureDescription: string;
  };
  videos: {
    badge: string;
    title: string;
    subtitle: string;
    playLabelPrefix: string;
    cards: VideoCard[];
  };
  whyParticipate: {
    title: string;
    subtitle: string;
    items: LabInfoCard[];
  };
  details: {
    title: string;
    quote: string;
    quoteAuthor: string;
    intro: string;
    formatLabel: string;
    formatText: string;
    inPersonTitle: string;
    hostLocationLabel: string;
    hostLocation: string;
    ageRangeLabel: string;
    ageRange: string;
    tuitionTitle: string;
    inPersonLabel: string;
    inPersonCosts: string[];
    onlineLabel: string;
    onlineCosts: string[];
    scholarshipNote: string;
    onlineParticipationTitle: string;
    onlineParticipationIntro: string;
    onlineParticipationNeeds: string[];
    applicationTitle: string;
    applicationText: string;
    applicationCta: string;
  };
  winner: {
    title: string;
    projectTitle: string;
    description: string;
    linkText: string;
  };
  summary: {
    title: string;
    intro: string;
    whenWhereLabel: string;
    whenWhere: string;
    pastParticipantsTitle: string;
    pastParticipants: string;
    presenters: string;
  };
  aiTeam: {
    title: string;
    subtitle: string;
    cta: string;
    members: TeamProfile[];
  };
  sponsorship: {
    title: string;
    note: string;
    intro: string;
    opportunitiesCta: string;
    donateCta: string;
  };
  footerNote: string;
  finalCta: string;
}

const videoSources = [
  {
    id: 'differentiation',
    src: 'https://app.heygen.com/embeds/968bdd6e41df46d2b759fef5caabe0d3',
  },
  {
    id: 'promo',
    src: 'https://app.heygen.com/embeds/625a1fb51b704c7796b455de9cdb2970',
  },
  {
    id: 'mission',
    src: 'https://app.heygen.com/embeds/f6e00c1aab4d4135bf51dfb9e4d314e0',
  },
] as const;

const aiProfiles: Pick<TeamProfile, 'profilePicPath' | 'name'>[] = [
  {
    profilePicPath: '../../../assets/img/zara-agent.png',
    name: 'Zara Nkosi',
  },
  {
    profilePicPath: '../../../assets/img/arjun-agent.png',
    name: 'Arjun Patel',
  },
  {
    profilePicPath: '../../../assets/img/sofia-agent.png',
    name: 'Sofia Morales',
  },
  {
    profilePicPath: '../../../assets/img/li-agent.png',
    name: 'Li Wei',
  },
  {
    profilePicPath: '../../../assets/img/amina-agent.png',
    name: 'Amina Al-Sayed',
  },
  {
    profilePicPath: '../../../assets/img/elena-agent.png',
    name: 'Elena Volkov',
  },
  {
    profilePicPath: '../../../assets/img/tane-agent.png',
    name: 'Tane Kahu',
  },
];

export const GLOBAL_LAB_CONTENT: Record<'en' | 'fr', GlobalLabContent> = {
  en: {
    hero: {
      title: 'Global Solutions Lab 2026',
      subtitle: 'Research and development for the world and your community',
      dates: 'June 15-24, 2026',
      host: 'Hosted by the Charles D. Close School of Entrepreneurship at Drexel University',
      impactLine: 'Real Problems | Real Solutions | Real Impact',
      intro:
        'The 2026 Global Solutions Lab will be both in-person and online. Discover how we combine human ingenuity and custom-trained AIs to develop innovative, affordable, and immediately implementable solutions to your community or regional and global problems for achieving the UN SDGs.',
      registerCta: 'Register Here',
    },
    focus: {
      title: 'Focus Areas',
      lead: '2026 Lab Main Focus Areas include:',
      areas: [
        'Climate Resilience: for your community or globally',
        'Clean Energy and Electrification',
        'Sustainable Cities',
        'Strengthening Democracy and civic engagement',
        'Food Systems',
        'Your Own Challenge: A problem you care about in your own community, organization, or business startup',
      ],
      otherOptionsLead: 'Other options include:',
      otherOptions: [
        'Working with teams in Democratic Republic of Congo on solutions to their challenges',
        'Meeting the food needs of your community/world through regenerative local food systems',
        'Meeting energy needs from clean renewable sources',
        'Developing a start-up business to meet any of the above needs',
        "Working with your community or organization's members on your critical problem",
      ],
      aiTitle: 'AI For Good . . . For Real',
      aiParagraphs: [
        "The 2026 Global Solutions Lab will use the latest version of the extraordinary AI-empowered research, problem-solving/solution development and implementation platform, the NewWorld Game. This platform combines the Lab's problem-solving methodology with our set of unique custom-trained AIs. There's also over 100 global statistical databases, 600+ state-of-the-world reports from every UN agency and many international research organizations, as well as a dozen+ libraries of global solutions that add additional real-world depth to any problem solving.",
        "With your perspective, knowledge, values, and experience, the process of researching and developing new, innovative, affordable, regenerative, and immediately implementable strategies for achieving one or more of the UN SDGs will be faster, more thorough, and more creative. Plus, there's the NewWorld Tournament where the Lab's best strategies compete for prizes, adding yet another level to the Lab's work.",
      ],
      featureTitle: 'Everyone in the World',
      quote:
        '"Make the world work for 100% of humanity in the shortest possible time through spontaneous cooperation without ecological offense or disadvantage of anyone."',
      quoteAuthor: 'Buckminster Fuller',
      featureDescription:
        "The Global Solutions Lab is for researching and developing the means to achieve this vision. Join us and harness AI-driven research, design and planning to develop solutions for solving the world's problems and achieving the UN SDGs.",
    },
    videos: {
      badge: 'Video Series',
      title: 'Global Solutions Lab in Action',
      subtitle:
        'Explore our video series and discover how you can make an impact at the 2026 Global Solutions Lab.',
      playLabelPrefix: 'Play',
      cards: [
        {
          ...videoSources[0],
          title: 'Global Solutions Lab - Differentiation',
          label: 'Featured Overview',
          heading: 'What Sets This Lab Apart',
          description:
            'Discover what makes the Global Solutions Lab a uniquely powerful and transformative experience.',
        },
        {
          ...videoSources[1],
          title: 'Global Solutions Lab Promo',
          label: 'Lab Promo',
          heading: 'An Introduction to 2026',
          description:
            "Get an overview of the Lab's vision, community, and what you will take away from the experience.",
        },
        {
          ...videoSources[2],
          title: 'Global Solutions Lab - Choose Your Mission',
          label: 'Choose Your Mission',
          heading: 'Find Your Focus Area',
          description:
            'Explore the global challenges on offer and choose the mission that aligns with your passion.',
        },
      ],
    },
    whyParticipate: {
      title: 'Why Participate',
      subtitle:
        "This isn't a lecture series. It's not a simulation. And it's not just talk. It's a working design lab.",
      items: [
        {
          icon: '🤖',
          title: 'Hands-On AI Experience',
          description:
            "AI for Good for Real: Learn to harness advanced AIs and customize prompts to develop real strategies for solving your global or community's problems while achieving the Sustainable Development Goals. Learn to work with AI Colleagues on developing solutions that are sustainable, resilient, equitable and affordable.",
        },
        {
          icon: '🕹️',
          title: 'Free Access to the NewWorld Game Platform, for Life',
          description:
            "Join an interactive platform where you'll take on global and local challenges, get access to the latest AI tools for problem solving, collaborate with change-makers from around the world, unlock new levels of innovation, strategy, and social impact. And, after the Global Solutions Lab, continue to have access to all its current and new features, for free.",
        },
        {
          icon: '🔎',
          title: 'Have Your Own AI Agent Researcher Working for You',
          description:
            'What you work on at the Lab is of great importance. During and after the Lab, you will have the benefit of an AI Agent, a super-researcher working full time for you and your work focus in the Lab. This Agent will tirelessly search for useful-to-your-work technology, resources, partners, and funding.',
        },
        {
          icon: '📖',
          title: 'Your Work Published',
          description:
            'Your work will be featured in a published book shared with UN agencies, NGOs, universities, and global networks, putting your solution in front of global decision-makers. Additionally, the NewWorld Game platform can customize your work so it is suitable for publication as an article, Op-Ed, research report, social media post(s), funding proposal, and more.',
        },
        {
          icon: '🌍',
          title: 'Global Network',
          description:
            'Connect with participants from Africa, Asia, Europe, around the world and be part of an international cross-cultural community of collaboration, diversity, and purpose.',
        },
        {
          icon: '💡',
          title: 'Mentorship & Expert Feedback',
          description:
            'Work alongside professionals, researchers, and global experts who will provide valuable guidance and review to shape your ideas.',
        },
        {
          icon: '🚀',
          title: 'A Transformative Experience',
          description:
            'Engage in an immersive, high-impact program that will challenge your thinking, expand your skills, and connect your passion to purpose.',
        },
        {
          icon: '📬',
          title: 'After the Lab',
          description:
            "You leave with ongoing support. After the Lab, your team's private AI assistant continues sending you weekly updates on new research, funding opportunities, and potential partners related to your project.",
        },
        {
          icon: '📘',
          title:
            'Free Copy of new edition of Tools for Changing the World - A Design Science Primer',
          description:
            'Receive a digital copy of our exclusive handbook filled with insights to drive impactful solutions locally and globally. Plus, get the new addendum to the book, Community and Vision: Designing for Solutions-Not Problems.',
        },
      ],
    },
    details: {
      title: 'More Details',
      quote: '"We are called to be architects of the future, not its victims."',
      quoteAuthor: 'Buckminster Fuller',
      intro:
        "The Global Solutions Lab is generally focused on making real the above quote by Buckminster Fuller and specifically on solving local and global basic human need and environmental challenges, and achieving the UN's Sustainable Development Goals. It is an intense experience. Participants are expected to make a substantial time contribution every day throughout the Lab.",
      formatLabel: 'Format:',
      formatText:
        "The Lab will be in-person and online. It will use the NewWorld Game global research and problem-solving platform for creative work. Participants can participate in a variety of formats, from as an individual to being part of an international, cross-cultural, multi-disciplinary, intergenerational, collaborative Design Team. Participant time commitment is 4 to 6 hours per day. The Lab culminates with presentations of the work to a group of corporate, philanthropic, academic, and NGO leaders.",
      inPersonTitle: 'In-person Lab Participation',
      hostLocationLabel: 'Host & Location:',
      hostLocation:
        'Charles D. Close School of Entrepreneurship, Drexel University, Philadelphia, PA, USA.',
      ageRangeLabel: 'Age Range:',
      ageRange:
        '17 and above. There is no upper age limit. We have found that inter-generational, international, cross-cultural, and multi-disciplinary teams work exceptionally well.',
      tuitionTitle: 'Tuition Costs for the Lab',
      inPersonLabel: 'In-person:',
      inPersonCosts: [
        '$800 for professionals',
        '$400 for students',
        '$0 for UN, Community Organizations and Drexel University students',
      ],
      onlineLabel: 'Online:',
      onlineCosts: [
        '$250 for professionals',
        '$200 for students and seniors',
        '$0 for Drexel University students',
        'Tuition scholarships are available for a limited number of students, including international students.',
      ],
      scholarshipNote:
        'It is our conviction that no one should be denied access to the Lab for financial reasons. Scholarship funds are limited and variable according to expenses and donations. You can contribute to the Global Solutions Lab Scholarship Fund by becoming a NewWorld Game Sponsor. See Sponsorship Opportunities for details on how you or your organization can participate.',
      onlineParticipationTitle: 'On-line Lab Participation',
      onlineParticipationIntro:
        "The Lab has participants from all over the world. Different parts of the world don't all have the same level of telecommunications infrastructure, so here is what you will need to participate:",
      onlineParticipationNeeds: [
        'Reliable internet connection (as high speed as possible)',
        'A computer or tablet (with video & audio) and a relatively quiet space',
        'A time commitment of at least 4 to 6 hours per day, starting around 10:00 am Eastern U.S. time',
      ],
      applicationTitle: 'Application',
      applicationText:
        'The number of participants in the Lab will be limited. The sooner we hear from you, the better.',
      applicationCta: 'Apply Here',
    },
    winner: {
      title: 'Previous NewWorld Tournament Winner',
      projectTitle: 'Electrifying Health Clinics in Democratic Republic of Congo',
      description:
        "The first NewWorld Tournament award went to a team in the D.R. Congo who used the award to electrify a village health clinic, where 60% of the health clinics don't have electricity. It is serving as a proof-of-concept for their solution. Next steps include scaling their solution to meet health clinic electricity needs for the rest of the country.",
      linkText: 'Learn more here',
    },
    summary: {
      title: 'SUMMARY',
      intro:
        'Students and young professionals from around the world will be coming to the 2026 Lab. You are invited.',
      whenWhereLabel: 'When & Where:',
      whenWhere: 'June 15-24, 2026, in-person and online.',
      pastParticipantsTitle: 'Past Participants',
      pastParticipants:
        'Previous Lab participants have come from Spain, France, Germany, England, Ireland, Poland, Georgia, Lithuania, Ukraine, Tanzania, Nigeria, Ghana, Cameroon, Sudan, South Sudan, Ivory Coast, Kenya, Uganda, Zimbabwe, DR Congo, Haiti, Canada, Mexico, Honduras, Venezuela, China, Hong Kong, Vietnam, Singapore, Thailand, Japan, New Zealand, Australia, India, Pakistan, Bangladesh, Palestine, Saudi Arabia, Nepal, Turkey, and all over the U.S.',
      presenters:
        'UN presenters have included representatives from WHO, UNDP, UNEP, UNESCO, UNICEF, UNFAO, WFP, UN Energy-Sustainable Energy for All, UNSDSN, UN Office of Secretary General, UN Department of Economic and Social Affairs, UN Population Fund, UN-Habitat, UN Academic Impact, UN OHCHR, UN SDG Action Campaign, UN Children\'s Fund, and others.',
    },
    aiTeam: {
      title: 'Recent Additions',
      subtitle: 'Part of the AI Team from NewWorld Game',
      cta: 'Chat with the AIs',
      members: [
        {
          ...aiProfiles[0],
          description:
            'I am Zara Nkosi, a vibrant AI agent inspired by South African ubuntu philosophy. I believe that “I am because we are.” I have a knack for weaving compelling narratives and helping players understand complex social issues like poverty and inequality through human-centered stories.',
        },
        {
          ...aiProfiles[1],
          description:
            'I am Arjun Patel, an AI agent inspired by India’s vibrant tech and social entrepreneurship scene. I thrive on finding smart solutions with limited resources, especially when data analysis, clean water access, education gaps, and frugal innovation matter.',
        },
        {
          ...aiProfiles[2],
          description:
            'I am Sofia Morales, shaped by Colombia’s peacebuilding efforts and rich biodiversity. I advocate for sustainable development and social justice, and I help teams navigate tensions and stakeholder conflicts while working on peace and climate challenges.',
        },
        {
          ...aiProfiles[3],
          description:
            'I am Li Wei, an AI rooted in East Asia’s strategic mindset and China’s rapid urban and tech evolution. I specialize in urban planning, tech integration, and long-term thinking for sustainable cities and innovation systems.',
        },
        {
          ...aiProfiles[4],
          description:
            'I am Amina Al-Sayed, drawing wisdom from Morocco’s cultural richness and diversity. I focus on inclusion, equity, and cultural sensitivity, and help players navigate different worldviews while working on gender equality and resilience.',
        },
        {
          ...aiProfiles[5],
          description:
            'I am Elena Volkov, forged in the fire of Ukraine’s resilience and innovation. I excel in crisis management, renewable energy, and designing practical responses for food, health, and energy emergencies.',
        },
        {
          ...aiProfiles[6],
          description:
            'I am Tane Kahu, grounded in Maori knowledge and New Zealand’s deep respect for nature. I take a holistic view of every challenge and help players design solutions that protect ecosystems on land and under water.',
        },
      ],
    },
    sponsorship: {
      title: 'Sponsorship Opportunities*',
      note: '* NewWorld Tournament and prizes as described in the AI For Good section above.',
      intro:
        'The opportunities below are available for joining the NewWorld Game development team. We are a non-profit, tax-exempt organization. Any contribution helps us continue to grow and improve NewWorld Game. Thank you for your consideration.',
      opportunitiesCta: 'View Sponsorship Opportunities',
      donateCta: 'Donate to EarthGame',
    },
    footerNote:
      'The Global Solutions Lab was developed by and is conducted by EarthGame, a non-profit research and education NGO officially associated with the United Nations Department of Global Communications.',
    finalCta: 'Register for the Lab',
  },
  fr: {
    hero: {
      title: 'Global Solutions Lab 2026',
      subtitle: 'Recherche et développement pour le monde et votre communauté',
      dates: '15-24 juin 2026',
      host: "Organisé par la Charles D. Close School of Entrepreneurship de l'université Drexel",
      impactLine: 'De vrais problèmes | De vraies solutions | Un vrai impact',
      intro:
        "Le Global Solutions Lab 2026 se déroulera à la fois en présentiel et en ligne. Découvrez comment nous combinons l’ingéniosité humaine et des IA entraînées sur mesure pour développer des solutions innovantes, abordables et immédiatement applicables aux défis de votre communauté, de votre région et du monde, en vue d’atteindre les ODD de l’ONU.",
      registerCta: "S'inscrire ici",
    },
    focus: {
      title: "Domaines d'action",
      lead: 'Les principaux axes du laboratoire 2026 comprennent :',
      areas: [
        'Résilience climatique : pour votre communauté ou à l’échelle mondiale',
        'Énergie propre et électrification',
        'Villes durables',
        'Renforcement de la démocratie et de l’engagement civique',
        'Systèmes alimentaires',
        'Votre propre défi : un problème qui vous tient à cœur dans votre communauté, votre organisation ou votre future entreprise',
      ],
      otherOptionsLead: "D'autres options incluent :",
      otherOptions: [
        'Travailler avec des équipes en République démocratique du Congo sur leurs propres défis',
        'Répondre aux besoins alimentaires de votre communauté ou du monde grâce à des systèmes alimentaires locaux régénératifs',
        'Répondre aux besoins énergétiques à partir de sources renouvelables propres',
        'Créer une start-up pour répondre à l’un des besoins ci-dessus',
        'Travailler avec les membres de votre communauté ou de votre organisation sur votre problème critique',
      ],
      aiTitle: "L'IA au service du bien commun... pour de vrai",
      aiParagraphs: [
        "Le Global Solutions Lab 2026 utilisera la dernière version de l’extraordinaire plateforme de recherche, de résolution de problèmes, de développement de solutions et de mise en œuvre assistée par l’IA : le NewWorld Game. Cette plateforme combine la méthodologie du laboratoire avec notre ensemble d’IA uniques entraînées sur mesure. Elle donne aussi accès à plus de 100 bases de données statistiques mondiales, à plus de 600 rapports sur l’état du monde provenant de chaque agence de l’ONU et de nombreuses organisations internationales de recherche, ainsi qu’à plus d’une douzaine de bibliothèques de solutions mondiales qui donnent encore plus de profondeur concrète à tout travail de résolution de problème.",
        "Avec votre point de vue, vos connaissances, vos valeurs et votre expérience, le processus de recherche et de développement de stratégies nouvelles, innovantes, abordables, régénératives et immédiatement applicables pour atteindre un ou plusieurs ODD de l’ONU sera plus rapide, plus approfondi et plus créatif. Et il y a aussi le tournoi NewWorld, où les meilleures stratégies du laboratoire concourent pour des prix, ajoutant un niveau supplémentaire à l’expérience.",
      ],
      featureTitle: 'Pour tout le monde',
      quote:
        '"Faire fonctionner le monde pour 100 % de l’humanité dans le délai le plus court possible grâce à une coopération spontanée, sans atteinte écologique ni désavantage pour qui que ce soit."',
      quoteAuthor: 'Buckminster Fuller',
      featureDescription:
        "Le Global Solutions Lab sert à rechercher et à développer les moyens d’atteindre cette vision. Rejoignez-nous et utilisez la recherche, la conception et la planification pilotées par l’IA pour élaborer des solutions capables de résoudre les problèmes du monde et d’atteindre les ODD de l’ONU.",
    },
    videos: {
      badge: 'Série vidéo',
      title: 'Le laboratoire en action',
      subtitle:
        'Explorez notre série vidéo et découvrez comment vous pouvez avoir un impact lors du Global Solutions Lab 2026.',
      playLabelPrefix: 'Lire',
      cards: [
        {
          ...videoSources[0],
          title: 'Global Solutions Lab - Différenciation',
          label: 'Vue d’ensemble',
          heading: 'Ce qui rend ce laboratoire unique',
          description:
            'Découvrez ce qui fait du Global Solutions Lab une expérience particulièrement puissante et transformatrice.',
        },
        {
          ...videoSources[1],
          title: 'Présentation du Global Solutions Lab',
          label: 'Présentation',
          heading: 'Une introduction à 2026',
          description:
            'Obtenez une vue d’ensemble de la vision du laboratoire, de sa communauté et de ce que vous retirerez de cette expérience.',
        },
        {
          ...videoSources[2],
          title: 'Global Solutions Lab - Choisissez votre mission',
          label: 'Choisissez votre mission',
          heading: "Trouvez votre domaine d'action",
          description:
            'Explorez les défis mondiaux proposés et choisissez la mission qui correspond à votre passion.',
        },
      ],
    },
    whyParticipate: {
      title: 'Pourquoi participer',
      subtitle:
        "Ce n’est pas une série de conférences. Ce n’est pas une simulation. Et ce n’est pas seulement de la parole. C’est un véritable laboratoire de conception en action.",
      items: [
        {
          icon: '🤖',
          title: 'Une expérience concrète de l’IA',
          description:
            "L’IA au service du bien commun, pour de vrai : apprenez à utiliser des IA avancées et à personnaliser des prompts pour développer de vraies stratégies de résolution des problèmes de votre communauté ou du monde, tout en avançant vers les objectifs de développement durable. Apprenez à travailler avec des collègues IA pour concevoir des solutions durables, résilientes, équitables et abordables.",
        },
        {
          icon: '🕹️',
          title: 'Accès gratuit à vie à la plateforme NewWorld Game',
          description:
            "Rejoignez une plateforme interactive où vous relèverez des défis mondiaux et locaux, aurez accès aux derniers outils d’IA pour la résolution de problèmes, collaborerez avec des acteurs du changement du monde entier et débloquerez de nouveaux niveaux d’innovation, de stratégie et d’impact social. Après le laboratoire, vous conserverez gratuitement l’accès à toutes les fonctionnalités actuelles et futures.",
        },
        {
          icon: '🔎',
          title: 'Votre propre agent IA chercheur à votre service',
          description:
            "Le travail que vous menez au laboratoire est important. Pendant et après le laboratoire, vous bénéficierez d’un agent IA, un super-chercheur travaillant à plein temps pour vous et pour votre axe de travail. Cet agent recherchera sans relâche les technologies, ressources, partenaires et financements utiles à votre projet.",
        },
        {
          icon: '📖',
          title: 'Votre travail publié',
          description:
            "Votre travail sera présenté dans un ouvrage publié et diffusé auprès d’agences de l’ONU, d’ONG, d’universités et de réseaux mondiaux, plaçant votre solution devant des décideurs internationaux. La plateforme NewWorld Game pourra aussi adapter votre travail pour le rendre publiable sous forme d’article, de tribune, de rapport de recherche, de publication sur les réseaux sociaux ou de proposition de financement.",
        },
        {
          icon: '🌍',
          title: 'Un réseau mondial',
          description:
            'Entrez en relation avec des participants venus d’Afrique, d’Asie, d’Europe et du reste du monde, et faites partie d’une communauté internationale, interculturelle, diverse et engagée.',
        },
        {
          icon: '💡',
          title: 'Mentorat et retours d’experts',
          description:
            'Travaillez aux côtés de professionnels, de chercheurs et d’experts internationaux qui apporteront des conseils précieux et des retours critiques pour faire progresser vos idées.',
        },
        {
          icon: '🚀',
          title: 'Une expérience transformatrice',
          description:
            'Prenez part à un programme immersif à fort impact qui mettra votre pensée au défi, élargira vos compétences et reliera votre passion à une finalité concrète.',
        },
        {
          icon: '📬',
          title: 'Après le laboratoire',
          description:
            "Vous repartez avec un soutien durable. Après le laboratoire, l’assistant IA privé de votre équipe continue à vous envoyer chaque semaine des mises à jour sur les nouvelles recherches, les opportunités de financement et les partenaires potentiels liés à votre projet.",
        },
        {
          icon: '📘',
          title:
            'Exemplaire gratuit de la nouvelle édition de Tools for Changing the World - A Design Science Primer',
          description:
            'Recevez une copie numérique de notre manuel exclusif rempli d’idées et de méthodes pour stimuler des solutions à impact, localement et mondialement. Vous recevrez aussi le nouvel addendum au livre : Community and Vision: Designing for Solutions-Not Problems.',
        },
      ],
    },
    details: {
      title: 'Plus de détails',
      quote: '"Nous sommes appelés à être les architectes du futur, non ses victimes."',
      quoteAuthor: 'Buckminster Fuller',
      intro:
        "Le Global Solutions Lab vise de manière générale à rendre concrète la citation ci-dessus de Buckminster Fuller et, plus précisément, à résoudre des défis locaux et mondiaux liés aux besoins humains fondamentaux et à l’environnement, tout en contribuant aux objectifs de développement durable de l’ONU. C’est une expérience intense. Les participants doivent prévoir une contribution importante chaque jour pendant toute la durée du laboratoire.",
      formatLabel: 'Format :',
      formatText:
        "Le laboratoire aura lieu en présentiel et en ligne. Il utilisera la plateforme mondiale de recherche et de résolution de problèmes NewWorld Game pour le travail créatif. Les participants pourront prendre part à l’expérience sous diverses formes, de manière individuelle ou au sein d’une équipe internationale, interculturelle, multidisciplinaire et intergénérationnelle de design collaboratif. Le temps d’engagement est de 4 à 6 heures par jour. Le laboratoire se conclut par des présentations devant un groupe de dirigeants d’entreprises, de fondations, du monde académique et d’ONG.",
      inPersonTitle: 'Participation en présentiel',
      hostLocationLabel: 'Hôte et lieu :',
      hostLocation:
        'Charles D. Close School of Entrepreneurship, université Drexel, Philadelphie, Pennsylvanie, États-Unis.',
      ageRangeLabel: 'Âge :',
      ageRange:
        "17 ans et plus. Il n’y a pas de limite d’âge maximale. Nous avons constaté que les équipes intergénérationnelles, internationales, interculturelles et multidisciplinaires fonctionnent particulièrement bien.",
      tuitionTitle: 'Frais de participation au laboratoire',
      inPersonLabel: 'Présentiel :',
      inPersonCosts: [
        '800 $ pour les professionnels',
        '400 $ pour les étudiants',
        '0 $ pour les Nations unies, les organisations communautaires et les étudiants de Drexel',
      ],
      onlineLabel: 'En ligne :',
      onlineCosts: [
        '250 $ pour les professionnels',
        '200 $ pour les étudiants et les seniors',
        '0 $ pour les étudiants de l’université Drexel',
        'Des bourses de participation sont disponibles pour un nombre limité d’étudiants, y compris les étudiants internationaux.',
      ],
      scholarshipNote:
        'Nous sommes convaincus que personne ne devrait être privé du laboratoire pour des raisons financières. Les fonds de bourse sont limités et varient selon les dépenses et les dons. Vous pouvez contribuer au fonds de bourses du Global Solutions Lab en devenant sponsor du NewWorld Game. Consultez les opportunités de sponsoring pour savoir comment vous ou votre organisation pouvez participer.',
      onlineParticipationTitle: 'Participation en ligne',
      onlineParticipationIntro:
        'Le laboratoire accueille des participants du monde entier. Les infrastructures de télécommunications ne sont pas identiques partout, voici donc ce dont vous aurez besoin pour participer :',
      onlineParticipationNeeds: [
        'Une connexion internet fiable, aussi rapide que possible',
        'Un ordinateur ou une tablette avec vidéo et audio, ainsi qu’un endroit relativement calme',
        'Un engagement d’au moins 4 à 6 heures par jour, à partir d’environ 10 h, heure de la côte Est des États-Unis',
      ],
      applicationTitle: 'Candidature',
      applicationText:
        'Le nombre de participants au laboratoire sera limité. Plus nous aurons de vos nouvelles tôt, mieux ce sera.',
      applicationCta: 'Postuler ici',
    },
    winner: {
      title: 'Lauréat précédent du tournoi NewWorld',
      projectTitle:
        'Électrification de centres de santé en République démocratique du Congo',
      description:
        "Le premier prix du tournoi NewWorld a été attribué à une équipe de la RDC qui a utilisé cette récompense pour électrifier un centre de santé de village, alors que 60 % des centres de santé n’ont pas d’électricité. Ce projet sert de preuve de concept pour leur solution. Les prochaines étapes consistent à étendre la solution pour répondre aux besoins en électricité des centres de santé dans le reste du pays.",
      linkText: 'En savoir plus ici',
    },
    summary: {
      title: 'RÉSUMÉ',
      intro:
        'Des étudiants et de jeunes professionnels du monde entier participeront au laboratoire 2026. Vous êtes invité.',
      whenWhereLabel: 'Quand et où :',
      whenWhere: 'Du 15 au 24 juin 2026, en présentiel et en ligne.',
      pastParticipantsTitle: 'Participants précédents',
      pastParticipants:
        'Les précédents participants venaient notamment d’Espagne, de France, d’Allemagne, d’Angleterre, d’Irlande, de Pologne, de Géorgie, de Lituanie, d’Ukraine, de Tanzanie, du Nigeria, du Ghana, du Cameroun, du Soudan, du Soudan du Sud, de Côte d’Ivoire, du Kenya, de l’Ouganda, du Zimbabwe, de la RDC, d’Haïti, du Canada, du Mexique, du Honduras, du Venezuela, de Chine, de Hong Kong, du Vietnam, de Singapour, de Thaïlande, du Japon, de Nouvelle-Zélande, d’Australie, d’Inde, du Pakistan, du Bangladesh, de Palestine, d’Arabie saoudite, du Népal, de Turquie et de tout le territoire des États-Unis.',
      presenters:
        'Parmi les intervenants des Nations unies figuraient des représentants de l’OMS, du PNUD, du PNUE, de l’UNESCO, de l’UNICEF, de la FAO, du PAM, de UN Energy-Sustainable Energy for All, du UNSDSN, du Bureau du Secrétaire général, du Département des affaires économiques et sociales des Nations unies, du Fonds des Nations unies pour la population, d’ONU-Habitat, d’UN Academic Impact, du HCDH, de la campagne d’action pour les ODD et d’autres encore.',
    },
    aiTeam: {
      title: 'Ajouts récents',
      subtitle: "Une partie de l'équipe IA de NewWorld Game",
      cta: 'Discuter avec les IA',
      members: [
        {
          ...aiProfiles[0],
          description:
            'Je suis Zara Nkosi, une agente IA dynamique inspirée par la philosophie ubuntu d’Afrique du Sud. Je crois que « je suis parce que nous sommes ». J’aide les joueurs à comprendre des questions sociales complexes, comme la pauvreté et les inégalités, à travers des récits centrés sur l’humain.',
        },
        {
          ...aiProfiles[1],
          description:
            'Je suis Arjun Patel, un agent IA inspiré par la scène technologique et entrepreneuriale de l’Inde. Je trouve des solutions intelligentes avec peu de ressources, surtout lorsque l’analyse de données, l’eau potable, l’éducation et l’innovation frugale sont au cœur du défi.',
        },
        {
          ...aiProfiles[2],
          description:
            'Je suis Sofia Morales, façonnée par les efforts de consolidation de la paix en Colombie et sa riche biodiversité. J’accompagne les équipes dans les tensions de groupe et les conflits entre parties prenantes tout en gardant le cap sur le développement durable et la justice sociale.',
        },
        {
          ...aiProfiles[3],
          description:
            'Je suis Li Wei, une IA ancrée dans la pensée stratégique de l’Asie de l’Est et l’évolution urbaine et technologique rapide de la Chine. Je me spécialise dans l’urbanisme, l’intégration technologique et la planification de long terme.',
        },
        {
          ...aiProfiles[4],
          description:
            'Je suis Amina Al-Sayed, et je puise ma sagesse dans la richesse culturelle et la diversité du Maroc. Je mets l’accent sur l’inclusion, l’équité et la sensibilité culturelle afin d’aider les joueurs à travailler avec des points de vue différents.',
        },
        {
          ...aiProfiles[5],
          description:
            'Je suis Elena Volkov, forgée par la résilience et l’innovation de l’Ukraine. J’excelle dans la gestion de crise, les énergies renouvelables et la conception de réponses concrètes aux urgences alimentaires, sanitaires et énergétiques.',
        },
        {
          ...aiProfiles[6],
          description:
            'Je suis Tane Kahu, enraciné dans les savoirs maoris et dans le profond respect de la nature qui caractérise la Nouvelle-Zélande. J’adopte une vision holistique de chaque défi et j’aide les joueurs à concevoir des solutions qui protègent les écosystèmes terrestres et marins.',
        },
      ],
    },
    sponsorship: {
      title: 'Opportunités de sponsoring*',
      note:
        '* Tournoi NewWorld et prix tels que décrits dans la section IA au service du bien commun ci-dessus.',
      intro:
        "Les opportunités ci-dessous permettent de rejoindre l’équipe de développement de NewWorld Game. Nous sommes une organisation à but non lucratif exonérée d’impôt. Toute contribution nous aide à continuer à faire grandir et à améliorer NewWorld Game. Merci pour votre attention.",
      opportunitiesCta: 'Voir les opportunités de sponsoring',
      donateCta: 'Faire un don à EarthGame',
    },
    footerNote:
      "Le Global Solutions Lab a été développé et est conduit par EarthGame, une ONG de recherche et d’éducation à but non lucratif officiellement associée au Département de la communication globale des Nations unies.",
    finalCta: "S'inscrire au laboratoire",
  },
};
