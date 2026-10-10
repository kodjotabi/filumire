import type {
  DiagnosticState,
  InterventionType,
} from "../../packages/domain";

/*
 * Parent-facing wording of the summary, in English and French.
 * Curriculum topic titles are the official English names and are
 * quoted, never translated. French addresses the parent as "vous".
 */
export type SummaryLanguage = "en" | "fr";

interface Guidance {
  title: string;
  guidance: string;
  boundary: string;
}

export interface SummaryMessages {
  diagnosticSupport: Partial<Record<DiagnosticState, string>>;
  interventionFocus: Record<InterventionType, string>;
  retention: Record<"retained" | "not_retained" | "pending", string>;
  transfer: Record<"demonstrated" | "not_demonstrated" | "pending", string>;
  topicFallback: string;
  quote: (topic: string) => string;
  home: {
    reviewEarlier: (topic: string) => Guidance;
    explainOwnWords: (topic: string) => Guidance;
    talkThroughSteps: Guidance;
    shortRefresh: (topic: string) => Guidance;
    everydayExample: (topic: string) => Guidance;
    keepSupportLight: Guidance;
    askWhatLearned: (topic: string) => Guidance;
    retentionRevisit: Guidance;
    transferExample: Guidance;
  };
  alerts: {
    ready: { title: string; message: string };
    retention: { title: string; message: string };
    transfer: { title: string; message: string };
    support: { title: string };
    teacherReview: { title: string; message: string };
  };
  strengths: {
    ready: string;
    retained: string;
    transferred: string;
  };
  supportAreas: {
    retention: string;
    transfer: string;
  };
}

export const SUMMARY_MESSAGES: Record<SummaryLanguage, SummaryMessages> = {
  en: {
    diagnosticSupport: {
      prerequisite_gap: "An earlier skill needs some more attention.",
      conceptual_misunderstanding: "The main idea needs some more explanation.",
      procedural_error: "The steps of the method need some more practice.",
      misconception: "There is a misunderstanding that needs to be cleared up.",
      forgotten_knowledge: "A refresher on this learning would help.",
      transfer_failure: "More practice using this learning in different situations would help.",
      persistent_difficulty: "This learning needs continued support and practice.",
    },
    interventionFocus: {
      diagnose: "FILUMIRE is checking what the learner already understands.",
      teach: "The learner is working on understanding this topic.",
      practice: "The learner is practising this skill.",
      scaffold: "The learner is working through this step by step.",
      remediate: "The learner is reviewing the idea in another way.",
      reassess: "FILUMIRE is checking understanding again.",
      retention_check: "FILUMIRE is checking what the learner still remembers.",
      transfer_check: "FILUMIRE is checking whether the learner can use this skill in a new situation.",
      teacher_review: "A teacher review is needed before this learning can be fully evaluated.",
    },
    retention: {
      retained: "This learning is being remembered well.",
      not_retained: "This learning needs more practice to help it stay remembered.",
      pending: "FILUMIRE is checking how well this learning is being remembered.",
    },
    transfer: {
      demonstrated: "The learner can use this learning in a new situation.",
      not_demonstrated: "The learner needs more practice using this learning in different situations.",
      pending: "FILUMIRE is checking whether this learning can be used in a new situation.",
    },
    topicFallback: "this learning",
    quote: (topic) => topic,
    home: {
      reviewEarlier: (topic) => ({
        title: "Review the foundation",
        guidance: `Ask the learner to explain an earlier idea connected to ${topic}. Keep it relaxed and let them show what they remember.`,
        boundary: "You do not need to teach or score the learner. FILUMIRE will decide what learning should come next.",
      }),
      explainOwnWords: (topic) => ({
        title: "Talk about the idea",
        guidance: `Ask the learner to explain ${topic} in their own words. Listen for their reasoning rather than giving them the answer immediately.`,
        boundary: "This conversation supports learning but does not determine mastery or progression.",
      }),
      talkThroughSteps: {
        title: "Talk through the steps",
        guidance: "Ask the learner to describe the steps they would use. Encourage them to slow down and explain one step at a time.",
        boundary: "FILUMIRE remains responsible for evaluating whether the skill has been mastered.",
      },
      shortRefresh: (topic) => ({
        title: "Try a short refresher",
        guidance: `Have a brief conversation about ${topic} and ask what the learner remembers without turning it into a test.`,
        boundary: "Home support is practice, not formal evidence of mastery.",
      }),
      everydayExample: (topic) => ({
        title: "Find an everyday example",
        guidance: `Look for a simple everyday situation where ${topic} could be used and ask the learner how they might apply it.`,
        boundary: "FILUMIRE will separately evaluate whether the learner can transfer the skill.",
      }),
      keepSupportLight: {
        title: "Keep support light",
        guidance: "Encourage one short attempt at a time. Avoid long practice sessions or pressure when the learner is already struggling.",
        boundary: "Persistent difficulty should be handled by FILUMIRE's adaptive system and, where needed, the teacher.",
      },
      askWhatLearned: (topic) => ({
        title: "Ask what they learned",
        guidance: `Invite the learner to tell you something they learned about ${topic}. Let them explain it in their own way.`,
        boundary: "There is no need to grade the answer. FILUMIRE handles formal learning decisions.",
      }),
      retentionRevisit: {
        title: "Revisit it briefly",
        guidance: "Return to this learning for a few minutes on another day rather than doing one long practice session.",
        boundary: "FILUMIRE will perform the formal retention check.",
      },
      transferExample: {
        title: "Use another example",
        guidance: "Ask where this skill might appear outside the original lesson. A familiar home or community example is enough.",
        boundary: "This activity supports transfer but does not itself prove transfer.",
      },
    },
    alerts: {
      ready: { title: "Good progress", message: "FILUMIRE currently considers this learning ready to move forward." },
      retention: { title: "A little revision would help", message: "The learner understood this before, but needs help keeping it remembered." },
      transfer: { title: "More real-world practice would help", message: "The learner needs more practice using this learning in a different situation." },
      support: { title: "Support is useful here" },
      teacherReview: { title: "Teacher review", message: "A teacher review is needed for this learning. No parent action is required." },
    },
    strengths: {
      ready: "Current learning is ready to progress.",
      retained: "The learner is remembering this learning well.",
      transferred: "The learner can use this learning in a new situation.",
    },
    supportAreas: {
      retention: "Remembering the learning over time.",
      transfer: "Using the learning in different situations.",
    },
  },
  fr: {
    diagnosticSupport: {
      prerequisite_gap: "Une notion vue plus tôt demande un peu plus d'attention.",
      conceptual_misunderstanding: "L'idée principale a besoin d'être un peu plus expliquée.",
      procedural_error: "Les étapes de la méthode demandent un peu plus d'entraînement.",
      misconception: "Une idée fausse doit être corrigée.",
      forgotten_knowledge: "Un petit rappel sur cet apprentissage serait utile.",
      transfer_failure: "Plus d'entraînement pour utiliser cet apprentissage dans des situations différentes serait utile.",
      persistent_difficulty: "Cet apprentissage demande un soutien et un entraînement réguliers.",
    },
    interventionFocus: {
      diagnose: "FILUMIRE vérifie ce que l'apprenant comprend déjà.",
      teach: "L'apprenant travaille à comprendre ce thème.",
      practice: "L'apprenant s'entraîne sur cette compétence.",
      scaffold: "L'apprenant avance étape par étape.",
      remediate: "L'apprenant revoit l'idée d'une autre manière.",
      reassess: "FILUMIRE vérifie de nouveau la compréhension.",
      retention_check: "FILUMIRE vérifie ce dont l'apprenant se souvient encore.",
      transfer_check: "FILUMIRE vérifie si l'apprenant sait utiliser cette compétence dans une situation nouvelle.",
      teacher_review: "Un examen par l'enseignant est nécessaire avant que cet apprentissage puisse être entièrement évalué.",
    },
    retention: {
      retained: "Cet apprentissage est bien retenu.",
      not_retained: "Cet apprentissage demande plus d'entraînement pour rester en mémoire.",
      pending: "FILUMIRE vérifie si cet apprentissage est bien retenu.",
    },
    transfer: {
      demonstrated: "L'apprenant sait utiliser cet apprentissage dans une situation nouvelle.",
      not_demonstrated: "L'apprenant a besoin de plus d'entraînement pour utiliser cet apprentissage dans des situations différentes.",
      pending: "FILUMIRE vérifie si cet apprentissage peut être utilisé dans une situation nouvelle.",
    },
    topicFallback: "cet apprentissage",
    quote: (topic) => `« ${topic} »`,
    home: {
      reviewEarlier: (topic) => ({
        title: "Revoir les bases",
        guidance: `Demandez à l'apprenant d'expliquer une notion vue plus tôt en lien avec ${topic}. Restez détendu et laissez-le montrer ce dont il se souvient.`,
        boundary: "Vous n'avez pas besoin d'enseigner ni de noter. FILUMIRE décidera de la suite de l'apprentissage.",
      }),
      explainOwnWords: (topic) => ({
        title: "Parler de l'idée",
        guidance: `Demandez à l'apprenant d'expliquer ${topic} avec ses propres mots. Écoutez son raisonnement plutôt que de donner tout de suite la réponse.`,
        boundary: "Cette conversation aide l'apprentissage mais ne décide ni de la maîtrise ni de la progression.",
      }),
      talkThroughSteps: {
        title: "Parler des étapes",
        guidance: "Demandez à l'apprenant de décrire les étapes qu'il suivrait. Encouragez-le à ralentir et à expliquer une étape à la fois.",
        boundary: "C'est FILUMIRE qui évalue si la compétence est maîtrisée.",
      },
      shortRefresh: (topic) => ({
        title: "Faire un petit rappel",
        guidance: `Discutez brièvement de ${topic} et demandez à l'apprenant ce dont il se souvient, sans en faire un contrôle.`,
        boundary: "Le soutien à la maison est un entraînement, pas une preuve officielle de maîtrise.",
      }),
      everydayExample: (topic) => ({
        title: "Trouver un exemple du quotidien",
        guidance: `Cherchez une situation simple de tous les jours où ${topic} pourrait servir et demandez à l'apprenant comment il l'utiliserait.`,
        boundary: "FILUMIRE évaluera séparément si l'apprenant sait transférer la compétence.",
      }),
      keepSupportLight: {
        title: "Garder un soutien léger",
        guidance: "Encouragez un court essai à la fois. Évitez les longues séances ou la pression quand l'apprenant a déjà des difficultés.",
        boundary: "Les difficultés persistantes sont prises en charge par le système adaptatif de FILUMIRE et, si besoin, par l'enseignant.",
      },
      askWhatLearned: (topic) => ({
        title: "Demander ce qu'il a appris",
        guidance: `Invitez l'apprenant à vous raconter quelque chose qu'il a appris sur ${topic}. Laissez-le l'expliquer à sa façon.`,
        boundary: "Inutile de noter la réponse. Les décisions d'apprentissage sont prises par FILUMIRE.",
      }),
      retentionRevisit: {
        title: "Y revenir brièvement",
        guidance: "Revenez sur cet apprentissage quelques minutes un autre jour plutôt que lors d'une seule longue séance.",
        boundary: "FILUMIRE effectuera la vérification officielle de la mémorisation.",
      },
      transferExample: {
        title: "Prendre un autre exemple",
        guidance: "Demandez où cette compétence pourrait servir en dehors de la leçon. Un exemple familier, à la maison ou dans le quartier, suffit.",
        boundary: "Cette activité aide le transfert mais ne le prouve pas à elle seule.",
      },
    },
    alerts: {
      ready: { title: "Bons progrès", message: "FILUMIRE considère actuellement que cet apprentissage est prêt pour la suite." },
      retention: { title: "Un peu de révision aiderait", message: "L'apprenant avait compris, mais a besoin d'aide pour s'en souvenir." },
      transfer: { title: "Plus d'entraînement concret aiderait", message: "L'apprenant a besoin de plus d'entraînement pour utiliser cet apprentissage dans une autre situation." },
      support: { title: "Un soutien est utile ici" },
      teacherReview: { title: "Examen par l'enseignant", message: "Un examen par l'enseignant est nécessaire pour cet apprentissage. Aucune action n'est demandée aux parents." },
    },
    strengths: {
      ready: "L'apprentissage en cours est prêt pour la suite.",
      retained: "L'apprenant retient bien cet apprentissage.",
      transferred: "L'apprenant sait utiliser cet apprentissage dans une situation nouvelle.",
    },
    supportAreas: {
      retention: "Se souvenir de l'apprentissage dans la durée.",
      transfer: "Utiliser l'apprentissage dans des situations différentes.",
    },
  },
};
