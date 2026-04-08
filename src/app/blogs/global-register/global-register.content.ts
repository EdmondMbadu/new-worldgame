export interface RegisterBenefit {
  icon: string;
  title: string;
  description: string;
}

export interface RegisterTargetGroupOption {
  value: 'professional' | 'student' | 'senior';
  label: string;
}

export interface GlobalRegisterContent {
  hero: {
    standardTitle: string;
    drexelTitle: string;
    standardSubtitle: string;
    drexelSubtitle: string;
    countdownTitle: string;
    countdownLabels: {
      days: string;
      hours: string;
      minutes: string;
      seconds: string;
    };
    deadlineNotice: string;
    inPersonLabel: string;
    onlineLabel: string;
  };
  modes: {
    inPerson: string;
    online: string;
  };
  online: {
    processTitle: string;
    intro: string;
    steps: string[];
    tuitionTitle: string;
    drexelTuitionTitle: string;
    freeForDrexel: string;
    tuitionItems: string[];
    scholarshipNote: string;
    footerNote: string;
    donateCta: string;
    formTitle: string;
    drexelFormTitle: string;
  };
  inPerson: {
    processTitle: string;
    intro: string;
    tuitionTitle: string;
    drexelTuitionTitle: string;
    freeForDrexel: string;
    tuitionItems: string[];
    scholarshipNote: string;
    footerNote: string;
    donateCta: string;
    formTitle: string;
    drexelFormTitle: string;
  };
  form: {
    nameLabel: string;
    firstPlaceholder: string;
    lastPlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    addressLabel: string;
    addressPlaceholder: string;
    cityLabel: string;
    cityPlaceholder: string;
    stateProvinceLabel: string;
    stateProvincePlaceholder: string;
    countryLabel: string;
    countryPlaceholder: string;
    ageLabel: string;
    organizationLabel: string;
    organizationPlaceholder: string;
    occupationLabel: string;
    whyAttendLabel: string;
    focusTopicLabel: string;
    visaLabel: string;
    visaIntro: string;
    visaItems: string[];
    targetGroupLabel: string;
    onlineTargetGroupOptions: RegisterTargetGroupOption[];
    inPersonTargetGroupOptions: RegisterTargetGroupOption[];
    payLaterNotice: string;
    scholarshipPrefix: string;
    scholarshipSuffix: string;
    teamDiscountNotice: string;
    priceLabel: string;
    payAndRegisterLabel: string;
    registerNowPayLaterLabel: string;
    registerLabel: string;
  };
  benefits: {
    title: string;
    items: RegisterBenefit[];
  };
  spinner: {
    srOnly: string;
    text: string;
  };
  alerts: {
    firstLastName: string;
    invalidEmail: string;
    ageInPerson: string;
    organization: string;
    phone: string;
    address: string;
    city: string;
    stateProvince: string;
    country: string;
    occupation: string;
    whyAttend: string;
    focusTopic: string;
    targetGroup: string;
    submissionError: string;
  };
  countdown: {
    started: string;
  };
}

export const GLOBAL_REGISTER_CONTENT: Record<'en' | 'fr', GlobalRegisterContent> = {
  en: {
    hero: {
      standardTitle: '2026 Global Solutions Lab Registration',
      drexelTitle: '2026 Global Solutions Lab Drexel Student Registration',
      standardSubtitle: 'Secure your spot today!',
      drexelSubtitle: 'Register for free today!',
      countdownTitle: 'Let the countdown begin',
      countdownLabels: {
        days: 'Days',
        hours: 'Hours',
        minutes: 'Minutes',
        seconds: 'Seconds',
      },
      deadlineNotice:
        'Important: The deadline for In-Person registration and payment is June 1st. For Online, it is June 9th.',
      inPersonLabel: 'In-Person',
      onlineLabel: 'Online',
    },
    modes: {
      inPerson: 'In Person',
      online: 'Online',
    },
    online: {
      processTitle: 'REGISTRATION PROCESS (Online)',
      intro:
        'It is simple to sign up for the 2026 Global Solutions Lab (Online):',
      steps: [
        'Fill out the registration form on this page.',
        'We will send you a response. Tuition is due by June 1, 2026.',
        'You will receive further information about program specifics starting in April 2026.',
      ],
      tuitionTitle: 'TUITION (Online)',
      drexelTuitionTitle: 'DREXEL STUDENT REGISTRATION (Online)',
      freeForDrexel: 'Participation is free for Drexel University students.',
      tuitionItems: [
        '$250 for professionals',
        '$200 for students and seniors',
        '$0 for Drexel University students',
        'Partial tuition scholarships available for players from developing countries*',
      ],
      scholarshipNote:
        'For players from developing countries, email us at {email} to request partial to full tuition scholarship depending on the case. All other expenses need to be covered by the participant.',
      footerNote:
        'EarthGame is a 501(c)(3) nonprofit organization. Donations are tax-deductible. ©2025 EarthGame. All rights reserved.',
      donateCta: 'Donate To EarthGame',
      formTitle: '2026 GSL (Online) Registration Form',
      drexelFormTitle: '2026 GSL Drexel Student (Online) Registration Form',
    },
    inPerson: {
      processTitle: 'REGISTRATION PROCESS (In-Person)',
      intro:
        'Join us in person at the Charles D. Close School of Entrepreneurship, Drexel University, Philadelphia, PA USA.',
      tuitionTitle: 'TUITION (In Person)',
      drexelTuitionTitle: 'DREXEL STUDENT REGISTRATION (In Person)',
      freeForDrexel: 'Participation is free for Drexel University students.',
      tuitionItems: [
        '$800 for professionals',
        '$400 for students',
        '$0 for UN, Community Organizations and Drexel University students',
        'Partial tuition scholarships available for players from developing countries*',
      ],
      scholarshipNote:
        'For players from developing countries, email us at {email} to request partial to full tuition scholarship depending on the case. All other expenses (transportation, housing) need to be covered by participant.',
      footerNote:
        'EarthGame is a 501(c)(3) nonprofit organization. Donations are tax-deductible. ©2025 EarthGame. All rights reserved.',
      donateCta: 'Donate To EarthGame',
      formTitle: '2026 GSL (In-Person) Registration Form',
      drexelFormTitle: '2026 GSL Drexel Student (In-Person) Registration Form',
    },
    form: {
      nameLabel: 'Name (Required)',
      firstPlaceholder: 'First',
      lastPlaceholder: 'Last',
      emailLabel: 'Email (Required)',
      emailPlaceholder: 'you@example.com',
      phoneLabel: 'Phone',
      phonePlaceholder: '(123) 456-7890',
      addressLabel: 'Address (Required)',
      addressPlaceholder: 'Street Address',
      cityLabel: 'City (Required)',
      cityPlaceholder: 'Philadelphia',
      stateProvinceLabel: 'State/Province (Required)',
      stateProvincePlaceholder: 'PA',
      countryLabel: 'Country (Required)',
      countryPlaceholder: 'United States',
      ageLabel: 'Age (Required)',
      organizationLabel: 'Organization, School, or Employer (Required)',
      organizationPlaceholder: 'Your institution/employer',
      occupationLabel: 'What do you do? (Required)',
      whyAttendLabel: 'Why do you want to attend the Lab? (Required)',
      focusTopicLabel:
        'What specific topic(s) do you want to focus on at the Lab this year? (Required)',
      visaLabel: 'Letter of Invitation needed for Visa?',
      visaIntro:
        'Those seeking a letter of invitation for obtaining a visa to the US to participate in the Lab need to send the following information to',
      visaItems: [
        'Participant Name: _____________',
        'Resident of: __________________',
        'Date of Birth: _________________',
        'Passport Number: _____________',
        'Issued: _______________________',
        'Valid until: ____________________',
      ],
      targetGroupLabel: 'You are? (Required)',
      onlineTargetGroupOptions: [
        { value: 'professional', label: 'Professional ($250)' },
        { value: 'student', label: 'Student ($200)' },
        { value: 'senior', label: 'Senior ($200)' },
      ],
      inPersonTargetGroupOptions: [
        { value: 'professional', label: 'Professional ($800)' },
        { value: 'student', label: 'Student ($400)' },
        { value: 'senior', label: 'Senior ($400)' },
      ],
      payLaterNotice:
        'If you prefer to register now and pay later, click the button below.',
      scholarshipPrefix:
        'If you need partial tuition assistance email us at',
      scholarshipSuffix: 'to request a scholarship.',
      teamDiscountNotice:
        'Discount available for teams. Contact us if you have 3 or more people to register or to become a sponsor. Email us at {email}.',
      priceLabel: 'You will pay:',
      payAndRegisterLabel: 'Pay {price} & Register',
      registerNowPayLaterLabel: 'Register Now (Pay Later)',
      registerLabel: 'Register',
    },
    benefits: {
      title: 'What You Will Get',
      items: [
        {
          icon: '📖',
          title: 'Your Work Published in a Global Book',
          description:
            'Be featured in a professionally published book shared with UN agencies, NGOs, universities, and global networks, putting your solution in front of global decision-makers.',
        },
        {
          icon: '🎓',
          title: 'Certificate of Achievement',
          description:
            'Receive a formal certificate recognizing you as a Global Solution Solver, a credential to showcase your contribution to real-world problem solving.',
        },
        {
          icon: '🌍',
          title: 'A Truly Global Network',
          description:
            'Connect with participants from Africa, Asia, Europe, the Americas, and more, forming an international community of collaboration, diversity, and purpose.',
        },
        {
          icon: '🤖',
          title: 'Hands-On AI Experience',
          description:
            'Learn to harness advanced AIs and global datasets to develop real, scalable strategies aligned with the UN Sustainable Development Goals.',
        },
        {
          icon: '💡',
          title: 'Mentorship & Expert Feedback',
          description:
            'Work alongside UN professionals, researchers, and global experts who will provide valuable guidance and review to shape your ideas.',
        },
        {
          icon: '🏆',
          title: 'Eligibility for a Cash Prize',
          description:
            'Submit your project to the NewWorld Tournament and compete for a cash award to help bring your idea to life.',
        },
        {
          icon: '🚀',
          title: 'A Transformative Experience',
          description:
            'Engage in an immersive, high-impact program that will challenge your thinking, expand your skills, and connect your passion to purpose.',
        },
        {
          icon: '📘',
          title:
            'Free Copy of the Tools for Changing the World - A Design Science Primer',
          description:
            'Receive a digital copy of our exclusive handbook filled with insights to drive impactful solutions locally and globally.',
        },
        {
          icon: '🕹️',
          title: 'Access to the NewWorld Game Platform',
          description:
            'Join an interactive platform where you will take on global missions, collaborate with changemakers, and unlock new levels of innovation, strategy, and social impact.',
        },
      ],
    },
    spinner: {
      srOnly: 'Loading...',
      text: 'Processing your request...',
    },
    alerts: {
      firstLastName: 'Enter your first and last name.',
      invalidEmail: 'Enter a valid email.',
      ageInPerson:
        'You should be at least 18 years old to participate in the In Person Lab.',
      organization: 'Enter your organization, school, or employer.',
      phone: 'Enter your phone number.',
      address: 'Enter your address.',
      city: 'Enter your city.',
      stateProvince: 'Enter your state or province.',
      country: 'Enter your country.',
      occupation: 'Enter what you do.',
      whyAttend: 'Enter why you want to attend the Lab.',
      focusTopic: 'Enter a specific topic you want to focus on.',
      targetGroup: 'Enter your target group. (Professionals, Students, etc.)',
      submissionError:
        'There was an error during the registration process. Please try again.',
    },
    countdown: {
      started: 'The event has started!',
    },
  },
  fr: {
    hero: {
      standardTitle: "Inscription au Global Solutions Lab 2026",
      drexelTitle:
        "Inscription des étudiants de Drexel au Global Solutions Lab 2026",
      standardSubtitle: 'Réservez votre place dès aujourd’hui !',
      drexelSubtitle: 'Inscrivez-vous gratuitement dès aujourd’hui !',
      countdownTitle: 'Le compte à rebours commence',
      countdownLabels: {
        days: 'Jours',
        hours: 'Heures',
        minutes: 'Minutes',
        seconds: 'Secondes',
      },
      deadlineNotice:
        "Important : la date limite d'inscription et de paiement pour la participation en présentiel est le 1er juin. Pour la participation en ligne, c’est le 9 juin.",
      inPersonLabel: 'Présentiel',
      onlineLabel: 'En ligne',
    },
    modes: {
      inPerson: 'Présentiel',
      online: 'En ligne',
    },
    online: {
      processTitle: "PROCESSUS D'INSCRIPTION (En ligne)",
      intro:
        "Il est simple de s'inscrire au Global Solutions Lab 2026 (en ligne) :",
      steps: [
        "Remplissez le formulaire d'inscription sur cette page.",
        "Nous vous enverrons une réponse. Les frais doivent être réglés avant le 1er juin 2026.",
        "Vous recevrez des informations complémentaires sur le programme à partir d'avril 2026.",
      ],
      tuitionTitle: 'FRAIS DE PARTICIPATION (En ligne)',
      drexelTuitionTitle: "INSCRIPTION DES ÉTUDIANTS DE DREXEL (En ligne)",
      freeForDrexel: "La participation est gratuite pour les étudiants de l'université Drexel.",
      tuitionItems: [
        '250 $ pour les professionnels',
        '200 $ pour les étudiants et les seniors',
        "0 $ pour les étudiants de l'université Drexel",
        'Des bourses partielles sont disponibles pour les participants venant de pays en développement*',
      ],
      scholarshipNote:
        'Pour les participants venant de pays en développement, écrivez-nous à {email} pour demander une bourse partielle ou totale selon votre situation. Toutes les autres dépenses doivent être couvertes par le participant.',
      footerNote:
        "EarthGame est une organisation à but non lucratif 501(c)(3). Les dons sont déductibles d'impôt. ©2025 EarthGame. Tous droits réservés.",
      donateCta: 'Faire un don à EarthGame',
      formTitle: "Formulaire d'inscription GSL 2026 (En ligne)",
      drexelFormTitle:
        "Formulaire d'inscription GSL 2026 pour les étudiants Drexel (En ligne)",
    },
    inPerson: {
      processTitle: "PROCESSUS D'INSCRIPTION (Présentiel)",
      intro:
        'Rejoignez-nous en personne à la Charles D. Close School of Entrepreneurship, université Drexel, Philadelphie, Pennsylvanie, États-Unis.',
      tuitionTitle: 'FRAIS DE PARTICIPATION (Présentiel)',
      drexelTuitionTitle: "INSCRIPTION DES ÉTUDIANTS DE DREXEL (Présentiel)",
      freeForDrexel: "La participation est gratuite pour les étudiants de l'université Drexel.",
      tuitionItems: [
        '800 $ pour les professionnels',
        '400 $ pour les étudiants',
        '0 $ pour les Nations unies, les organisations communautaires et les étudiants de Drexel',
        'Des bourses partielles sont disponibles pour les participants venant de pays en développement*',
      ],
      scholarshipNote:
        'Pour les participants venant de pays en développement, écrivez-nous à {email} pour demander une bourse partielle ou totale selon votre situation. Toutes les autres dépenses, y compris le transport et le logement, doivent être couvertes par le participant.',
      footerNote:
        "EarthGame est une organisation à but non lucratif 501(c)(3). Les dons sont déductibles d'impôt. ©2025 EarthGame. Tous droits réservés.",
      donateCta: 'Faire un don à EarthGame',
      formTitle: "Formulaire d'inscription GSL 2026 (Présentiel)",
      drexelFormTitle:
        "Formulaire d'inscription GSL 2026 pour les étudiants Drexel (Présentiel)",
    },
    form: {
      nameLabel: 'Nom (obligatoire)',
      firstPlaceholder: 'Prénom',
      lastPlaceholder: 'Nom',
      emailLabel: 'E-mail (obligatoire)',
      emailPlaceholder: 'vous@exemple.com',
      phoneLabel: 'Téléphone',
      phonePlaceholder: '(123) 456-7890',
      addressLabel: 'Adresse (obligatoire)',
      addressPlaceholder: 'Adresse postale',
      cityLabel: 'Ville (obligatoire)',
      cityPlaceholder: 'Philadelphie',
      stateProvinceLabel: 'État/Province (obligatoire)',
      stateProvincePlaceholder: 'PA',
      countryLabel: 'Pays (obligatoire)',
      countryPlaceholder: 'États-Unis',
      ageLabel: 'Âge (obligatoire)',
      organizationLabel: 'Organisation, école ou employeur (obligatoire)',
      organizationPlaceholder: 'Votre institution/employeur',
      occupationLabel: 'Que faites-vous ? (obligatoire)',
      whyAttendLabel:
        'Pourquoi souhaitez-vous participer au laboratoire ? (obligatoire)',
      focusTopicLabel:
        'Sur quel(s) sujet(s) précis souhaitez-vous vous concentrer cette année au laboratoire ? (obligatoire)',
      visaLabel: "Avez-vous besoin d'une lettre d'invitation pour le visa ?",
      visaIntro:
        "Les personnes qui ont besoin d'une lettre d'invitation pour obtenir un visa pour les États-Unis afin de participer au laboratoire doivent envoyer les informations suivantes à",
      visaItems: [
        'Nom du participant : _____________',
        'Résident de : __________________',
        'Date de naissance : _________________',
        'Numéro de passeport : _____________',
        'Délivré le : _______________________',
        "Valable jusqu'au : ____________________",
      ],
      targetGroupLabel: 'Vous êtes ? (obligatoire)',
      onlineTargetGroupOptions: [
        { value: 'professional', label: 'Professionnel (250 $)' },
        { value: 'student', label: 'Étudiant (200 $)' },
        { value: 'senior', label: 'Senior (200 $)' },
      ],
      inPersonTargetGroupOptions: [
        { value: 'professional', label: 'Professionnel (800 $)' },
        { value: 'student', label: 'Étudiant (400 $)' },
        { value: 'senior', label: 'Senior (400 $)' },
      ],
      payLaterNotice:
        "Si vous préférez vous inscrire maintenant et payer plus tard, cliquez sur le bouton ci-dessous.",
      scholarshipPrefix:
        "Si vous avez besoin d'une aide partielle pour les frais, écrivez-nous à",
      scholarshipSuffix: 'pour demander une bourse.',
      teamDiscountNotice:
        "Une réduction est disponible pour les équipes. Contactez-nous si vous avez 3 personnes ou plus à inscrire, ou si vous souhaitez devenir sponsor. Écrivez-nous à {email}.",
      priceLabel: 'Montant à payer :',
      payAndRegisterLabel: 'Payer {price} et s’inscrire',
      registerNowPayLaterLabel: "S'inscrire maintenant (payer plus tard)",
      registerLabel: "S'inscrire",
    },
    benefits: {
      title: 'Ce que vous recevrez',
      items: [
        {
          icon: '📖',
          title: 'Votre travail publié dans un ouvrage mondial',
          description:
            'Votre contribution pourra figurer dans un livre publié professionnellement et diffusé auprès des agences de l’ONU, des ONG, des universités et de réseaux mondiaux, plaçant votre solution devant des décideurs internationaux.',
        },
        {
          icon: '🎓',
          title: 'Certificat de réussite',
          description:
            "Recevez un certificat officiel vous reconnaissant comme Global Solution Solver, un titre qui valorise votre contribution à la résolution de problèmes concrets.",
        },
        {
          icon: '🌍',
          title: 'Un réseau réellement mondial',
          description:
            'Entrez en relation avec des participants venus d’Afrique, d’Asie, d’Europe, des Amériques et d’ailleurs pour former une communauté internationale de collaboration, de diversité et de sens.',
        },
        {
          icon: '🤖',
          title: 'Une expérience concrète de l’IA',
          description:
            'Apprenez à utiliser des IA avancées et des jeux de données mondiaux pour développer des stratégies concrètes et évolutives alignées sur les objectifs de développement durable de l’ONU.',
        },
        {
          icon: '💡',
          title: 'Mentorat et retours d’experts',
          description:
            'Travaillez aux côtés de professionnels des Nations unies, de chercheurs et d’experts internationaux qui vous apporteront des conseils précieux et des retours pour affiner vos idées.',
        },
        {
          icon: '🏆',
          title: 'Éligibilité à un prix en argent',
          description:
            'Soumettez votre projet au tournoi NewWorld et concourez pour un prix en espèces qui peut aider à concrétiser votre idée.',
        },
        {
          icon: '🚀',
          title: 'Une expérience transformatrice',
          description:
            'Participez à un programme immersif à fort impact qui mettra votre pensée au défi, élargira vos compétences et reliera votre passion à une finalité concrète.',
        },
        {
          icon: '📘',
          title:
            'Exemplaire gratuit de Tools for Changing the World - A Design Science Primer',
          description:
            'Recevez une copie numérique de notre manuel exclusif rempli d’idées utiles pour stimuler des solutions à impact au niveau local comme mondial.',
        },
        {
          icon: '🕹️',
          title: 'Accès à la plateforme NewWorld Game',
          description:
            'Rejoignez une plateforme interactive où vous relèverez des missions mondiales, collaborerez avec des acteurs du changement et débloquerez de nouveaux niveaux d’innovation, de stratégie et d’impact social.',
        },
      ],
    },
    spinner: {
      srOnly: 'Chargement...',
      text: 'Traitement de votre demande...',
    },
    alerts: {
      firstLastName: 'Veuillez saisir votre prénom et votre nom.',
      invalidEmail: 'Veuillez saisir une adresse e-mail valide.',
      ageInPerson:
        'Vous devez avoir au moins 18 ans pour participer au laboratoire en présentiel.',
      organization:
        'Veuillez saisir votre organisation, votre école ou votre employeur.',
      phone: 'Veuillez saisir votre numéro de téléphone.',
      address: 'Veuillez saisir votre adresse.',
      city: 'Veuillez saisir votre ville.',
      stateProvince: 'Veuillez saisir votre État ou votre province.',
      country: 'Veuillez saisir votre pays.',
      occupation: 'Veuillez indiquer ce que vous faites.',
      whyAttend:
        'Veuillez indiquer pourquoi vous souhaitez participer au laboratoire.',
      focusTopic:
        'Veuillez indiquer un sujet précis sur lequel vous souhaitez vous concentrer.',
      targetGroup:
        'Veuillez indiquer votre catégorie. (Professionnels, étudiants, etc.)',
      submissionError:
        "Une erreur s'est produite pendant le processus d'inscription. Veuillez réessayer.",
    },
    countdown: {
      started: "L'événement a commencé !",
    },
  },
};
