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
    workedExample: (_topic?: string) => "Look at the example step by step, then use the same idea in your task.",
    guidedPractice: (_topic?: string) => "Take it one step at a time and check each step.",
    questioning: (_topic?: string) => "What do you already know that could help here?",
    visual: (_topic?: string) => "Try drawing it before you answer.",
    concrete: (_topic?: string) => "Think of real objects you could use to show this.",
    analogy: (_topic?: string) => "Think of something familiar that works the same way.",
    demonstration: (_topic?: string) => "Watch how it is done, then try it yourself.",
    story: (_topic?: string) => "Picture this happening in everyday life.",
    stepByStep: (_topic?: string) => "Start with the first part. Finish it before moving on.",
    errorAnalysis: (_topic?: string) => "Look back at your last answer. Can you spot the error?",
    retrieval: (_topic?: string) => "Try to recall it before looking at an example.",
    mixed: (_topic?: string) => "Show what you know in a different way.",
    multipleChoice: "Choose the best answer.",
    shortAnswer: "Write a short answer in your own words.",
    constructed: "Write your answer and show your reasoning.",
    workedSolution: "Work it out step by step.",
    explain: "Explain how you got your answer.",
    errorIdentification: "Find the mistake and say how to fix it.",
    ordering: "Put the steps in the right order.",
    matching: "Match each item to its answer.",
    classification: "Put each item in the right group.",
    application: "Use what you know in this new situation.",
    oral: "Say your answer aloud and explain your thinking.",
    observed: "Demonstrate how you do it so your teacher can see.",
    diagnose: (_topic?: string) => "Let's find out what you already know.",
    scaffoldStart: (_topic?: string) => "Let's start with one small step.",
    reviewIdea: "Let's look at this again together.",
    correcting: (_topic?: string) => "Let's fix the tricky part together.",
    checkAgain: "Let's check again.",
    practice: (_topic?: string) => "Practice makes this easier.",
    fromMemory: "Answer from memory first.",
    transfer: "Use what you learned in a new situation.",
    advance: (_topic?: string) => "Great work. You are ready for the next step.",
    complete: "You have finished this learning path for now.",
  },
  fr: {
    workedExample: (_topic?: string) => "Regarde l’exemple étape par étape, puis utilise la même idée dans ta tâche.",
    guidedPractice: (_topic?: string) => "Avance une étape à la fois et vérifie chaque étape.",
    questioning: (_topic?: string) => "Que sais-tu déjà qui pourrait t’aider ici ?",
    visual: (_topic?: string) => "Essaie de faire un dessin avant de répondre.",
    concrete: (_topic?: string) => "Pense à de vrais objets pour montrer cela.",
    analogy: (_topic?: string) => "Pense à quelque chose de familier qui fonctionne de la même façon.",
    demonstration: (_topic?: string) => "Regarde comment on fait, puis essaie toi-même.",
    story: (_topic?: string) => "Imagine cette situation dans la vie de tous les jours.",
    stepByStep: (_topic?: string) => "Commence par la première partie. Termine-la avant de continuer.",
    errorAnalysis: (_topic?: string) => "Regarde ta dernière réponse. Qu’est-ce qui n’allait pas ?",
    retrieval: (_topic?: string) => "Essaie de t’en souvenir avant de regarder un exemple.",
    mixed: (_topic?: string) => "Montre ce que tu sais d’une autre façon.",
    multipleChoice: "Choisis la bonne réponse.",
    shortAnswer: "Écris une réponse courte avec tes propres mots.",
    constructed: "Écris ta réponse et montre ton raisonnement.",
    workedSolution: "Résous-le étape par étape.",
    explain: "Explique comment tu as trouvé ta réponse.",
    errorIdentification: "Trouve l’erreur et dis comment la corriger.",
    ordering: "Remets les étapes dans le bon ordre.",
    matching: "Relie chaque élément à sa réponse.",
    classification: "Place chaque élément dans le bon groupe.",
    application: "Utilise ce que tu sais dans cette nouvelle situation.",
    oral: "Dis ta réponse à voix haute et explique ton raisonnement.",
    observed: "Montre à ton enseignant comment tu fais.",
    diagnose: (_topic?: string) => "Voyons ce que tu sais déjà.",
    scaffoldStart: (_topic?: string) => "Commençons par une petite étape.",
    reviewIdea: "Revoyons cela ensemble.",
    correcting: (diagnostic: string) => DIAGNOSTIC_NAMES_FR[diagnostic] ? "Corrigeons ensemble la partie difficile." : "Revoyons cela ensemble.",
    checkAgain: "Vérifions encore une fois.",
    practice: (_topic?: string) => "En t’entraînant, ça devient plus facile.",
    fromMemory: "Réponds d’abord de mémoire.",
    transfer: "Utilise ce que tu as appris dans une nouvelle situation.",
    advance: (_topic?: string) => "Bravo. Tu es prêt ou prête pour la prochaine étape.",
    complete: "Tu as terminé ce parcours pour l’instant.",
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
