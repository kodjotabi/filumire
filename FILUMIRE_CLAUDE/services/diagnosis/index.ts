import type {
  DiagnosticState,
  EvidenceErrorClass,
  LearnerCompetencyState,
  LearningEvidence,
} from "../../packages/domain";

export const DIAGNOSIS_ENGINE_VERSION = "diagnosis-v1";

export type DiagnosisReasonCode =
  | "TRANSFER_FAILURE"
  | "RETENTION_FAILURE"
  | "EXPLICIT_EVIDENCE_DIAGNOSIS"
  | "PROBABLE_MASTERY"
  | "CORRECT_EVIDENCE_NO_CHANGE"
  | "INSTRUCTION_EFFECTIVE"
  | "PARTIAL_CONCEPTUAL_SIGNAL"
  | "CARELESS_EXECUTION_SIGNAL"
  | "PREREQUISITE_SIGNAL"
  | "MISCONCEPTION_SIGNAL"
  | "PROCEDURAL_SIGNAL"
  | "APPLICATION_SIGNAL"
  | "LANGUAGE_COMPREHENSION_SIGNAL"
  | "PERSISTENT_DIFFICULTY_SIGNAL"
  | "INSUFFICIENT_EVIDENCE"
  | "NO_DIAGNOSTIC_CHANGE";

export type DiagnosisHypothesisSource =
  | "intervention_result"
  | "explicit_evidence"
  | "structured_error_class"
  | "prerequisite_signal"
  | "misconception_signal"
  | "error_pattern"
  | "learner_history"
  | "response_outcome";

export interface DiagnosisHypothesis {
  diagnosticState: DiagnosticState;
  confidence: number;
  reasonCode: DiagnosisReasonCode;
  source: DiagnosisHypothesisSource;
  evidenceIds: string[];
  prerequisiteCompetencyId?: string;
  misconceptionId?: string;
  errorPattern?: string;
}

export interface DiagnosisResult {
  diagnosticState: DiagnosticState;
  confidence: number;
  reasonCode: DiagnosisReasonCode;
  evidenceIds: string[];
  hypotheses: DiagnosisHypothesis[];
  version: typeof DIAGNOSIS_ENGINE_VERSION;
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function fallbackSignalConfidence(
  evidence: LearningEvidence,
  fallbackConfidence: number,
): number {
  if (evidence.diagnosticConfidence !== undefined) {
    return clampConfidence(
      evidence.diagnosticConfidence,
    );
  }

  if (evidence.strength === "strong") {
    return Math.max(fallbackConfidence, 0.8);
  }

  if (evidence.strength === "moderate") {
    return Math.max(fallbackConfidence, 0.65);
  }

  if (evidence.strength === "weak") {
    return Math.min(
      Math.max(fallbackConfidence, 0.35),
      0.55,
    );
  }

  return clampConfidence(fallbackConfidence);
}

function addHypothesis(
  hypotheses: DiagnosisHypothesis[],
  hypothesis: DiagnosisHypothesis,
): void {
  const existingIndex = hypotheses.findIndex(
    (item) =>
      item.diagnosticState ===
      hypothesis.diagnosticState,
  );

  if (existingIndex < 0) {
    hypotheses.push(hypothesis);
    return;
  }

  const existing = hypotheses[existingIndex];

  if (hypothesis.confidence > existing.confidence) {
    hypotheses[existingIndex] = {
      ...hypothesis,
      evidenceIds: [
        ...new Set([
          ...existing.evidenceIds,
          ...hypothesis.evidenceIds,
        ]),
      ],
    };
    return;
  }

  hypotheses[existingIndex] = {
    ...existing,
    evidenceIds: [
      ...new Set([
        ...existing.evidenceIds,
        ...hypothesis.evidenceIds,
      ]),
    ],
  };
}

function diagnosticStateForErrorClass(
  errorClass: EvidenceErrorClass,
): DiagnosticState | undefined {
  switch (errorClass) {
    case "prerequisite_gap":
      return "prerequisite_gap";

    case "misconception":
      return "misconception";

    case "procedural_error":
      return "procedural_error";

    case "application_error":
      return "persistent_difficulty";

    case "language_comprehension":
      return "persistent_difficulty";

    case "careless_execution":
      return "careless_execution";

    case "retention_failure":
      return "forgotten_knowledge";

    case "transfer_failure":
      return "transfer_failure";

    case "knowledge_gap":
      return "conceptual_misunderstanding";

    case "unknown":
      return undefined;
  }
}

function reasonCodeForErrorClass(
  errorClass: EvidenceErrorClass,
): DiagnosisReasonCode {
  switch (errorClass) {
    case "prerequisite_gap":
      return "PREREQUISITE_SIGNAL";

    case "misconception":
      return "MISCONCEPTION_SIGNAL";

    case "procedural_error":
      return "PROCEDURAL_SIGNAL";

    case "application_error":
      return "APPLICATION_SIGNAL";

    case "language_comprehension":
      return "LANGUAGE_COMPREHENSION_SIGNAL";

    case "careless_execution":
      return "CARELESS_EXECUTION_SIGNAL";

    case "retention_failure":
      return "RETENTION_FAILURE";

    case "transfer_failure":
      return "TRANSFER_FAILURE";

    case "knowledge_gap":
      return "PARTIAL_CONCEPTUAL_SIGNAL";

    case "unknown":
      return "INSUFFICIENT_EVIDENCE";
  }
}

function generateHypotheses(
  evidence: LearningEvidence,
  existing: LearnerCompetencyState,
  fallbackConfidence: number,
): DiagnosisHypothesis[] {
  const hypotheses: DiagnosisHypothesis[] = [];
  const signalConfidence =
    fallbackSignalConfidence(
      evidence,
      fallbackConfidence,
    );

  if (
    evidence.interventionType === "transfer_check" &&
    evidence.outcome !== "correct"
  ) {
    addHypothesis(hypotheses, {
      diagnosticState: "transfer_failure",
      confidence: Math.max(
        signalConfidence,
        0.8,
      ),
      reasonCode: "TRANSFER_FAILURE",
      source: "intervention_result",
      evidenceIds: [evidence.id],
      errorPattern: evidence.errorPattern,
    });
  }

  if (
    evidence.interventionType === "retention_check" &&
    evidence.outcome !== "correct"
  ) {
    addHypothesis(hypotheses, {
      diagnosticState: "forgotten_knowledge",
      confidence: Math.max(
        signalConfidence,
        0.8,
      ),
      reasonCode: "RETENTION_FAILURE",
      source: "intervention_result",
      evidenceIds: [evidence.id],
      errorPattern: evidence.errorPattern,
    });
  }

  if (
    evidence.diagnosticState &&
    evidence.diagnosticState !== "unknown" &&
    evidence.diagnosticState !==
      "insufficient_evidence"
  ) {
    addHypothesis(hypotheses, {
      diagnosticState: evidence.diagnosticState,
      confidence: signalConfidence,
      reasonCode:
        "EXPLICIT_EVIDENCE_DIAGNOSIS",
      source: "explicit_evidence",
      evidenceIds: [evidence.id],
      prerequisiteCompetencyId:
        evidence.prerequisiteCompetencyId,
      misconceptionId: evidence.misconceptionId,
      errorPattern: evidence.errorPattern,
    });
  }

  if (
    evidence.errorClass &&
    evidence.errorClass !== "unknown"
  ) {
    const state =
      diagnosticStateForErrorClass(
        evidence.errorClass,
      );

    if (state) {
      addHypothesis(hypotheses, {
        diagnosticState: state,
        confidence: signalConfidence,
        reasonCode:
          reasonCodeForErrorClass(
            evidence.errorClass,
          ),
        source: "structured_error_class",
        evidenceIds: [evidence.id],
        prerequisiteCompetencyId:
          evidence.prerequisiteCompetencyId,
        misconceptionId:
          evidence.misconceptionId,
        errorPattern: evidence.errorPattern,
      });
    }
  }

  if (evidence.prerequisiteCompetencyId) {
    addHypothesis(hypotheses, {
      diagnosticState: "prerequisite_gap",
      confidence: Math.max(
        signalConfidence,
        0.75,
      ),
      reasonCode: "PREREQUISITE_SIGNAL",
      source: "prerequisite_signal",
      evidenceIds: [evidence.id],
      prerequisiteCompetencyId:
        evidence.prerequisiteCompetencyId,
      errorPattern: evidence.errorPattern,
    });
  }

  if (evidence.misconceptionId) {
    addHypothesis(hypotheses, {
      diagnosticState: "misconception",
      confidence: Math.max(
        signalConfidence,
        0.75,
      ),
      reasonCode: "MISCONCEPTION_SIGNAL",
      source: "misconception_signal",
      evidenceIds: [evidence.id],
      misconceptionId:
        evidence.misconceptionId,
      errorPattern: evidence.errorPattern,
    });
  }

  if (
    evidence.errorPattern?.includes(
      "prerequisite",
    )
  ) {
    addHypothesis(hypotheses, {
      diagnosticState: "prerequisite_gap",
      confidence: Math.max(
        signalConfidence,
        0.65,
      ),
      reasonCode: "PREREQUISITE_SIGNAL",
      source: "error_pattern",
      evidenceIds: [evidence.id],
      errorPattern: evidence.errorPattern,
    });
  } else if (
    evidence.errorPattern &&
    evidence.outcome === "incorrect"
  ) {
    addHypothesis(hypotheses, {
      diagnosticState: "misconception",
      confidence: Math.max(
        signalConfidence,
        0.6,
      ),
      reasonCode: "MISCONCEPTION_SIGNAL",
      source: "error_pattern",
      evidenceIds: [evidence.id],
      errorPattern: evidence.errorPattern,
    });
  }

  if (
    evidence.outcome === "incorrect" &&
    existing.masteryEstimate >= 0.8 &&
    existing.confidence >= 0.8
  ) {
    addHypothesis(hypotheses, {
      diagnosticState: "careless_execution",
      confidence: Math.max(
        signalConfidence,
        0.65,
      ),
      reasonCode:
        "CARELESS_EXECUTION_SIGNAL",
      source: "learner_history",
      evidenceIds: [evidence.id],
      errorPattern: evidence.errorPattern,
    });
  }

  if (
    evidence.outcome === "partial" &&
    hypotheses.length === 0
  ) {
    addHypothesis(hypotheses, {
      diagnosticState:
        "conceptual_misunderstanding",
      confidence: Math.max(
        signalConfidence,
        0.5,
      ),
      reasonCode:
        "PARTIAL_CONCEPTUAL_SIGNAL",
      source: "response_outcome",
      evidenceIds: [evidence.id],
      errorPattern: evidence.errorPattern,
    });
  }

  if (
    evidence.outcome === "incorrect" &&
    hypotheses.length === 0 &&
    existing.evidenceCount >= 2
  ) {
    addHypothesis(hypotheses, {
      diagnosticState:
        "persistent_difficulty",
      confidence: Math.max(
        signalConfidence,
        0.5,
      ),
      reasonCode:
        "PERSISTENT_DIFFICULTY_SIGNAL",
      source: "learner_history",
      evidenceIds: [evidence.id],
    });
  }

  return hypotheses.sort(
    (a, b) => b.confidence - a.confidence,
  );
}

export function diagnoseEvidence(
  evidence: LearningEvidence,
  existing: LearnerCompetencyState,
  fallbackConfidence: number,
): DiagnosisResult {
  if (evidence.outcome === "correct") {
    /*
     * Tranche 4B: a correct answer under teaching, scaffolding or
     * remediation shows the instruction worked, so the difficulty
     * it addressed is no longer the current diagnosis. Further
     * evidence decides what comes next.
     */
    if (
      existing.evidenceCount < 3 &&
      (
        evidence.interventionType === "teach" ||
        evidence.interventionType === "scaffold" ||
        evidence.interventionType === "remediate"
      )
    ) {
      return {
        diagnosticState: "insufficient_evidence",
        confidence: clampConfidence(
          evidence.diagnosticConfidence ??
            fallbackConfidence,
        ),
        reasonCode: "INSTRUCTION_EFFECTIVE",
        evidenceIds: [evidence.id],
        hypotheses: [],
        version: DIAGNOSIS_ENGINE_VERSION,
      };
    }

    if (existing.evidenceCount >= 3) {
      return {
        diagnosticState: "probable_mastery",
        confidence: clampConfidence(
          evidence.diagnosticConfidence ??
            fallbackConfidence,
        ),
        reasonCode: "PROBABLE_MASTERY",
        evidenceIds: [evidence.id],
        hypotheses: [],
        version: DIAGNOSIS_ENGINE_VERSION,
      };
    }

    return {
      diagnosticState:
        existing.diagnosticState,
      confidence: clampConfidence(
        evidence.diagnosticConfidence ??
          fallbackConfidence,
      ),
      reasonCode:
        "CORRECT_EVIDENCE_NO_CHANGE",
      evidenceIds: [evidence.id],
      hypotheses: [],
      version: DIAGNOSIS_ENGINE_VERSION,
    };
  }

  const hypotheses = generateHypotheses(
    evidence,
    existing,
    fallbackConfidence,
  );

  const selected = hypotheses[0];

  if (selected) {
    return {
      diagnosticState:
        selected.diagnosticState,
      confidence: selected.confidence,
      reasonCode: selected.reasonCode,
      evidenceIds: [
        ...new Set(
          hypotheses.flatMap(
            (hypothesis) =>
              hypothesis.evidenceIds,
          ),
        ),
      ],
      hypotheses,
      version: DIAGNOSIS_ENGINE_VERSION,
    };
  }

  if (evidence.outcome === "incorrect") {
    return {
      diagnosticState:
        "insufficient_evidence",
      confidence: clampConfidence(
        fallbackConfidence,
      ),
      reasonCode:
        "INSUFFICIENT_EVIDENCE",
      evidenceIds: [evidence.id],
      hypotheses: [],
      version: DIAGNOSIS_ENGINE_VERSION,
    };
  }

  return {
    diagnosticState:
      existing.diagnosticState,
    confidence: clampConfidence(
      fallbackConfidence,
    ),
    reasonCode: "NO_DIAGNOSTIC_CHANGE",
    evidenceIds: [evidence.id],
    hypotheses: [],
    version: DIAGNOSIS_ENGINE_VERSION,
  };
}
