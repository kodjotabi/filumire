export interface EduTutorRequest {
  learnerId: string;
  sessionId: string;
  competencyId: string;
  action: string;
  instructionalContext: string;
}

export type InstructionalElementType =
  | "explanation"
  | "worked_example"
  | "learner_task"
  | "hint"
  | "remediation"
  | "corrective_feedback"
  | "next_prompt";

export interface GovernedInstructionalElement {
  type: InstructionalElementType;
  text: string;
}

export interface GovernedInstructionalRequest {
  learnerId: string;
  sessionId: string;
  competency: {
    id: string;
    title: string;
    description: string;
    prerequisiteCompetencyIds: string[];
    misconceptions: string[];
  };
  decision: {
    id: string;
    action: string;
    reasonCode: string;
    competencyId: string;
    interventionId?: string;
    instructionalStrategy?: string;
    responseMode?: string;
  };
  learnerProfile: {
    masteryEstimate: number;
    confidence: number;
    diagnosticState: string;
    diagnosticConfidence: number;
    errorPatterns: string[];
  };
  content?: {
    id: string;
    competencyId: string;
    type: string;
    title: string;
    body: string;
    assessmentItemId?: string;
    /* True when the item is answered by choosing one of its options. */
    presentsOptions?: boolean;
  };
  instructionalContext: string;
  /*
   * The learner's language. Defaults to English. The engine's own
   * guidance is phrased in this language; curriculum titles (the
   * official English names) are never translated, so French
   * phrasing refers to "ce thème" rather than quoting them.
   */
  language?: InstructionLanguage;
}

export type InstructionLanguage = "en" | "fr";

const DIAGNOSTIC_NAMES_FR: Record<string, string> = {
  prerequisite_gap: "une notion préalable à revoir",
  conceptual_misunderstanding: "une idée principale mal comprise",
  procedural_error: "une erreur dans les étapes de la méthode",
  misconception: "une idée fausse",
  forgotten_knowledge: "une notion oubliée",
  transfer_failure: "une difficulté à utiliser la notion dans une situation nouvelle",
  persistent_difficulty: "une difficulté persistante",
};

/*
 * Every sentence the engine writes itself, per language. Lesson
 * bodies and titles come from the content store in the learner's
 * language and are passed through unchanged.
 */
const PHRASES = {
  en: {
    workedExample: (title: string) => `Study ${title} carefully. Follow the idea step by step, then use the same reasoning in the task.`,
    guidedPractice: (topic: string) => `Work through ${topic} one step at a time. Check each step before continuing.`,
    questioning: (topic: string) => `Think about ${topic}. What do you already know that can help you solve this?`,
    visual: (topic: string) => `Represent the important parts of ${topic} visually before answering.`,
    concrete: (topic: string) => `Use familiar objects or a real example to make ${topic} concrete.`,
    analogy: (topic: string) => `Connect ${topic} to something familiar, then use that connection to understand the task.`,
    demonstration: (topic: string) => `Watch how the idea in ${topic} is applied, then repeat the process yourself.`,
    story: (topic: string) => `Place ${topic} in a familiar everyday situation and use that situation to reason through the task.`,
    stepByStep: (topic: string) => `Begin with the first part of ${topic}. Complete that part before moving to the next.`,
    errorAnalysis: (topic: string) => `Look carefully at the earlier error in ${topic}. Identify what went wrong before trying again.`,
    retrieval: (topic: string) => `Recall what you know about ${topic} without checking an example first.`,
    mixed: (topic: string) => `Show your understanding of ${topic} in another form or situation.`,
    multipleChoice: "Choose the best answer.",
    shortAnswer: "Give a short answer in your own words.",
    constructed: "Build your answer and show your reasoning.",
    workedSolution: "Work through the solution step by step.",
    explain: "Explain how you reached your answer.",
    errorIdentification: "Identify the error and explain what should change.",
    ordering: "Put the steps in the correct order.",
    matching: "Match each item with the correct answer.",
    classification: "Place each item in the correct group.",
    application: "Apply what you know to this new situation.",
    oral: "Say your answer aloud and explain your thinking.",
    observed: "Demonstrate the task so your performance can be observed.",
    diagnose: (topic: string) => `Let us check your understanding of ${topic}.`,
    scaffoldStart: (topic: string) => `Start with one small step in ${topic}.`,
    reviewIdea: "Review the idea carefully before trying again.",
    correcting: (diagnostic: string) => `We are correcting the difficulty identified as ${diagnostic.replace(/_/g, " ")}.`,
    checkAgain: "Let us check your understanding again.",
    practice: (topic: string) => `Practice will strengthen your understanding of ${topic}.`,
    fromMemory: "Answer from memory before checking an example.",
    transfer: "Use what you learned in this changed situation.",
    advance: (topic: string) => `You are ready to continue with ${topic}.`,
    complete: "This learning path is complete for now.",
  },
  fr: {
    workedExample: (title: string) => `Étudie « ${title} » attentivement. Suis l’idée étape par étape, puis utilise le même raisonnement dans l’exercice.`,
    guidedPractice: () => "Avance dans ce thème une étape à la fois. Vérifie chaque étape avant de continuer.",
    questioning: () => "Réfléchis à ce thème. Que sais-tu déjà qui peut t’aider à résoudre cet exercice ?",
    visual: () => "Représente les éléments importants de ce thème par un dessin ou un schéma avant de répondre.",
    concrete: () => "Utilise des objets familiers ou un exemple réel pour rendre ce thème concret.",
    analogy: () => "Relie ce thème à quelque chose que tu connais, puis sers-toi de ce lien pour comprendre l’exercice.",
    demonstration: () => "Regarde comment l’idée de ce thème est appliquée, puis refais la démarche toi-même.",
    story: () => "Imagine ce thème dans une situation familière de tous les jours et sers-toi de cette situation pour raisonner.",
    stepByStep: () => "Commence par la première partie de ce thème. Termine-la avant de passer à la suivante.",
    errorAnalysis: () => "Regarde attentivement l’erreur précédente. Trouve ce qui n’allait pas avant de réessayer.",
    retrieval: () => "Rappelle-toi ce que tu sais sur ce thème sans regarder d’exemple d’abord.",
    mixed: () => "Montre ce que tu as compris de ce thème sous une autre forme ou dans une autre situation.",
    multipleChoice: "Choisis la meilleure réponse.",
    shortAnswer: "Donne une réponse courte avec tes propres mots.",
    constructed: "Construis ta réponse et montre ton raisonnement.",
    workedSolution: "Résous l’exercice étape par étape.",
    explain: "Explique comment tu as trouvé ta réponse.",
    errorIdentification: "Trouve l’erreur et explique ce qu’il faut changer.",
    ordering: "Remets les étapes dans le bon ordre.",
    matching: "Associe chaque élément à la bonne réponse.",
    classification: "Range chaque élément dans le bon groupe.",
    application: "Applique ce que tu sais à cette situation nouvelle.",
    oral: "Dis ta réponse à voix haute et explique ton raisonnement.",
    observed: "Réalise la tâche pour que l’on puisse observer ce que tu fais.",
    diagnose: () => "Vérifions ce que tu comprends de ce thème.",
    scaffoldStart: () => "Commence par une petite étape de ce thème.",
    reviewIdea: "Revois l’idée attentivement avant de réessayer.",
    correcting: (diagnostic: string) => `Nous travaillons sur la difficulté repérée : ${DIAGNOSTIC_NAMES_FR[diagnostic] ?? "une difficulté à corriger"}.`,
    checkAgain: "Vérifions encore une fois ce que tu as compris.",
    practice: () => "S’entraîner va renforcer ta compréhension de ce thème.",
    fromMemory: "Réponds de mémoire avant de regarder un exemple.",
    transfer: "Utilise ce que tu as appris dans cette situation différente.",
    advance: () => "Tu es prêt ou prête à continuer avec la suite.",
    complete: "Ce parcours d’apprentissage est terminé pour le moment.",
  },
};

function phrasesFor(request: GovernedInstructionalRequest) {
  return PHRASES[request.language === "fr" ? "fr" : "en"];
}

export interface EduTutorResponse {
  content: string;
  modelId: string;
  generatedAt: string;
  structured?: {
    competencyId: string;
    decisionId: string;
    action: string;
    reasonCode: string;
    groundedContentId?: string;
    elements: GovernedInstructionalElement[];
    authority: {
      mayChangeIdentity: false;
      mayChangeAuthorization: false;
      mayChangeCompetency: false;
      mayChangeMastery: false;
      mayOverrideAdaptivePolicy: false;
    };
  };
}

export interface EduTutorModel {
  generate(request: EduTutorRequest): Promise<EduTutorResponse>;
}

export interface InstructionalEngine {
  generate(
    request: GovernedInstructionalRequest,
  ): Promise<EduTutorResponse>;
}

function composeContent(
  elements: GovernedInstructionalElement[],
): string {
  return elements.map((element) => element.text).join("\n\n");
}

function ensureGovernedRequest(
  request: GovernedInstructionalRequest,
): void {
  if (request.decision.competencyId !== request.competency.id) {
    throw new Error(
      "Instructional context does not match adaptive decision competency.",
    );
  }

  if (
    request.content &&
    request.content.competencyId !== request.competency.id
  ) {
    throw new Error(
      "Instructional content does not match adaptive decision competency.",
    );
  }

  if (
    !request.competency.title.trim() ||
    !request.competency.description.trim() ||
    !request.instructionalContext.trim()
  ) {
    throw new Error(
      "Instructional context is required for this adaptive decision.",
    );
  }
}

function strategyElement(
  request: GovernedInstructionalRequest,
): GovernedInstructionalElement | undefined {
  const title = request.content?.title ?? request.competency.title;
  const body = request.content?.body ?? request.competency.description;
  const topic = request.competency.title;
  const p = phrasesFor(request);

  switch (request.decision.instructionalStrategy) {
    case "direct_explanation":
      return { type: "explanation", text: body };

    case "worked_example":
      return { type: "worked_example", text: p.workedExample(title) };

    case "guided_practice":
      return { type: "hint", text: p.guidedPractice(topic) };

    case "questioning":
      return { type: "learner_task", text: p.questioning(topic) };

    case "visual_representation":
      return { type: "hint", text: p.visual(topic) };

    case "concrete_representation":
      return { type: "hint", text: p.concrete(topic) };

    case "analogy":
      return { type: "explanation", text: p.analogy(topic) };

    case "demonstration":
      return { type: "worked_example", text: p.demonstration(topic) };

    case "story_context":
      return { type: "explanation", text: p.story(topic) };

    case "step_by_step_scaffold":
      return { type: "hint", text: p.stepByStep(topic) };

    case "error_analysis":
      return { type: "corrective_feedback", text: p.errorAnalysis(topic) };

    case "retrieval_practice":
      return { type: "learner_task", text: p.retrieval(topic) };

    case "mixed_representation":
      return { type: "learner_task", text: p.mixed(topic) };

    default:
      return undefined;
  }
}

const FREE_RESPONSE_MODES = new Set([
  "short_answer",
  "constructed_response",
  "worked_solution",
  "explanation",
  "oral_response",
  "observed_performance",
]);

function responsePrompt(
  request: GovernedInstructionalRequest,
): GovernedInstructionalElement | undefined {
  const p = phrasesFor(request);
  const text = {
    multiple_choice: p.multipleChoice,
    short_answer: p.shortAnswer,
    constructed_response: p.constructed,
    worked_solution: p.workedSolution,
    explanation: p.explain,
    error_identification: p.errorIdentification,
    sequence_ordering: p.ordering,
    matching: p.matching,
    classification: p.classification,
    application: p.application,
    oral_response: p.oral,
    observed_performance: p.observed,
  }[request.decision.responseMode ?? ""];

  /*
   * The engine chooses a response mode from its evidence, but the item
   * delivered decides what the learner can do. A free-response prompt
   * ("Give a short answer in your own words") above answer options
   * contradicts the screen, so such items are asked to choose instead.
   */
  if (request.content?.presentsOptions && FREE_RESPONSE_MODES.has(request.decision.responseMode ?? "")) {
    return { type: "next_prompt", text: p.multipleChoice };
  }

  return text ? { type: "next_prompt", text } : undefined;
}

function buildElements(
  request: GovernedInstructionalRequest,
): GovernedInstructionalElement[] {
  const body =
    request.content?.body ?? request.competency.description;
  const diagnostic = request.learnerProfile.diagnosticState;
  const strategy = strategyElement(request);
  const response = responsePrompt(request);
  const p = phrasesFor(request);
  const topic = request.competency.title;

  let elements: GovernedInstructionalElement[];

  switch (request.decision.action) {
    case "diagnose":
      elements = [
        {
          type: "explanation",
          text: p.diagnose(topic),
        },
        { type: "learner_task", text: body },
      ];
      break;

    case "teach":
      elements = [
        { type: "explanation", text: body },
        ...(strategy ? [strategy] : []),
      ];
      break;

    case "scaffold":
      elements = [
        ...(strategy ? [strategy] : [{
          type: "hint" as const,
          text: p.scaffoldStart(topic),
        }]),
        { type: "learner_task", text: body },
      ];
      break;

    case "remediate":
      elements = [
        { type: "remediation", text: body },
        {
          type: "corrective_feedback",
          text: diagnostic === "unknown"
            ? p.reviewIdea
            : p.correcting(diagnostic),
        },
        ...(strategy ? [strategy] : []),
      ];
      break;

    case "reassess":
      elements = [
        {
          type: "corrective_feedback",
          text: p.checkAgain,
        },
        { type: "learner_task", text: body },
      ];
      break;

    case "practice":
      elements = [
        ...(strategy ? [strategy] : [{
          type: "explanation" as const,
          text: p.practice(topic),
        }]),
        { type: "learner_task", text: body },
      ];
      break;

    case "retention_check":
      elements = [
        { type: "learner_task", text: body },
        {
          type: "hint",
          text: p.fromMemory,
        },
      ];
      break;

    case "transfer_check":
      elements = [
        {
          type: "explanation",
          text: p.transfer,
        },
        { type: "learner_task", text: body },
      ];
      break;

    case "advance":
      elements = [
        {
          type: "next_prompt",
          text: p.advance(topic),
        },
      ];
      break;

    case "complete":
      elements = [
        {
          type: "next_prompt",
          text: p.complete,
        },
      ];
      break;

    default:
      elements = [{ type: "learner_task", text: body }];
  }

  if (
    response &&
    request.decision.action !== "advance" &&
    request.decision.action !== "complete"
  ) {
    elements.push(response);
  }

  return elements;
}

export class DeterministicGovernedInstructionalEngine
  implements InstructionalEngine
{
  async generate(
    request: GovernedInstructionalRequest,
  ): Promise<EduTutorResponse> {
    ensureGovernedRequest(request);

    const elements = buildElements(request);

    return {
      content: composeContent(elements),
      modelId: "filu-governed-instructional-engine-v1",
      generatedAt: new Date().toISOString(),
      structured: {
        competencyId: request.competency.id,
        decisionId: request.decision.id,
        action: request.decision.action,
        reasonCode: request.decision.reasonCode,
        groundedContentId: request.content?.id,
        elements,
        authority: {
          mayChangeIdentity: false,
          mayChangeAuthorization: false,
          mayChangeCompetency: false,
          mayChangeMastery: false,
          mayOverrideAdaptivePolicy: false,
        },
      },
    };
  }
}

export class MockEduTutor implements EduTutorModel {
  async generate(request: EduTutorRequest): Promise<EduTutorResponse> {
    return {
      content: [
        `FILUMIRE instructional response for ${request.action} on competency ${request.competencyId}.`,
        "",
        request.instructionalContext,
      ].join("\n"),
      modelId: "mock-edututor-0.1",
      generatedAt: new Date().toISOString(),
    };
  }
}
