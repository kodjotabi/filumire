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
  };
  instructionalContext: string;
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

  switch (request.decision.instructionalStrategy) {
    case "direct_explanation":
      return { type: "explanation", text: body };

    case "worked_example":
      return {
        type: "worked_example",
        text: `Study ${title} carefully. Follow the idea step by step, then use the same reasoning in the task.`,
      };

    case "guided_practice":
      return {
        type: "hint",
        text: `Work through ${request.competency.title} one step at a time. Check each step before continuing.`,
      };

    case "questioning":
      return {
        type: "learner_task",
        text: `Think about ${request.competency.title}. What do you already know that can help you solve this?`,
      };

    case "visual_representation":
      return {
        type: "hint",
        text: `Represent the important parts of ${request.competency.title} visually before answering.`,
      };

    case "concrete_representation":
      return {
        type: "hint",
        text: `Use familiar objects or a real example to make ${request.competency.title} concrete.`,
      };

    case "analogy":
      return {
        type: "explanation",
        text: `Connect ${request.competency.title} to something familiar, then use that connection to understand the task.`,
      };

    case "demonstration":
      return {
        type: "worked_example",
        text: `Watch how the idea in ${request.competency.title} is applied, then repeat the process yourself.`,
      };

    case "story_context":
      return {
        type: "explanation",
        text: `Place ${request.competency.title} in a familiar everyday situation and use that situation to reason through the task.`,
      };

    case "step_by_step_scaffold":
      return {
        type: "hint",
        text: `Begin with the first part of ${request.competency.title}. Complete that part before moving to the next.`,
      };

    case "error_analysis":
      return {
        type: "corrective_feedback",
        text: `Look carefully at the earlier error in ${request.competency.title}. Identify what went wrong before trying again.`,
      };

    case "retrieval_practice":
      return {
        type: "learner_task",
        text: `Recall what you know about ${request.competency.title} without checking an example first.`,
      };

    case "mixed_representation":
      return {
        type: "learner_task",
        text: `Show your understanding of ${request.competency.title} in another form or situation.`,
      };

    default:
      return undefined;
  }
}

function responsePrompt(
  responseMode: string | undefined,
): GovernedInstructionalElement | undefined {
  switch (responseMode) {
    case "multiple_choice":
      return {
        type: "next_prompt",
        text: "Choose the best answer.",
      };
    case "short_answer":
      return {
        type: "next_prompt",
        text: "Give a short answer in your own words.",
      };
    case "constructed_response":
      return {
        type: "next_prompt",
        text: "Build your answer and show your reasoning.",
      };
    case "worked_solution":
      return {
        type: "next_prompt",
        text: "Work through the solution step by step.",
      };
    case "explanation":
      return {
        type: "next_prompt",
        text: "Explain how you reached your answer.",
      };
    case "error_identification":
      return {
        type: "next_prompt",
        text: "Identify the error and explain what should change.",
      };
    case "sequence_ordering":
      return {
        type: "next_prompt",
        text: "Put the steps in the correct order.",
      };
    case "matching":
      return {
        type: "next_prompt",
        text: "Match each item with the correct answer.",
      };
    case "classification":
      return {
        type: "next_prompt",
        text: "Place each item in the correct group.",
      };
    case "application":
      return {
        type: "next_prompt",
        text: "Apply what you know to this new situation.",
      };
    case "oral_response":
      return {
        type: "next_prompt",
        text: "Say your answer aloud and explain your thinking.",
      };
    case "observed_performance":
      return {
        type: "next_prompt",
        text: "Demonstrate the task so your performance can be observed.",
      };
    default:
      return undefined;
  }
}

function buildElements(
  request: GovernedInstructionalRequest,
): GovernedInstructionalElement[] {
  const body =
    request.content?.body ?? request.competency.description;
  const diagnostic = request.learnerProfile.diagnosticState;
  const strategy = strategyElement(request);
  const response = responsePrompt(request.decision.responseMode);

  let elements: GovernedInstructionalElement[];

  switch (request.decision.action) {
    case "diagnose":
      elements = [
        {
          type: "explanation",
          text: `Let us check your understanding of ${request.competency.title}.`,
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
          text: `Start with one small step in ${request.competency.title}.`,
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
            ? "Review the idea carefully before trying again."
            : `We are correcting the difficulty identified as ${diagnostic.replace(/_/g, " ")}.`,
        },
        ...(strategy ? [strategy] : []),
      ];
      break;

    case "reassess":
      elements = [
        {
          type: "corrective_feedback",
          text: "Let us check your understanding again.",
        },
        { type: "learner_task", text: body },
      ];
      break;

    case "practice":
      elements = [
        ...(strategy ? [strategy] : [{
          type: "explanation" as const,
          text: `Practice will strengthen your understanding of ${request.competency.title}.`,
        }]),
        { type: "learner_task", text: body },
      ];
      break;

    case "retention_check":
      elements = [
        { type: "learner_task", text: body },
        {
          type: "hint",
          text: "Answer from memory before checking an example.",
        },
      ];
      break;

    case "transfer_check":
      elements = [
        {
          type: "explanation",
          text: "Use what you learned in this changed situation.",
        },
        { type: "learner_task", text: body },
      ];
      break;

    case "advance":
      elements = [
        {
          type: "next_prompt",
          text: `You are ready to continue with ${request.competency.title}.`,
        },
      ];
      break;

    case "complete":
      elements = [
        {
          type: "next_prompt",
          text: "This learning path is complete for now.",
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
