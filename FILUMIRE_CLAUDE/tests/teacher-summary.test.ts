import { persistenceStore } from "../services/persistence-provider";
import { saveLearnerState } from "../services/learner-state-store";
import { buildTeacherLearnerSummary } from "../services/teacher-summary";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function makeState(
  learnerId: string,
  competencyId: string,
  masteryEstimate: number,
  confidence: number,
  diagnosticState:
    | "probable_mastery"
    | "misconception"
    | "prerequisite_gap"
    | "persistent_difficulty",
  retentionStatus:
    | "retained"
    | "not_retained",
  transferStatus:
    | "demonstrated"
    | "not_demonstrated",
  readyForAdvancement: boolean,
  includeIntervention = false,
) {
  const now = new Date().toISOString();

  return {
    learnerId,
    language: "en" as const,
    stateVersion: "cluster5-test-v1",
    updatedAt: now,
    competencies: [
      {
        learnerId,
        competencyId,
        masteryEstimate,
        evidenceCount: 3,
        confidence,
        diagnosticState,
        diagnosticConfidence: 0.8,
        errorPatterns:
          diagnosticState === "misconception"
            ? ["test_misconception"]
            : [],
        interventionHistory: includeIntervention
          ? [
              {
                interventionId: "intervention-test-001",
                competencyId,
                type: "remediate" as const,
                instructionalStrategy: "worked_example" as const,
                startedAt: "2026-09-20T10:00:00.000Z",
                completedAt: "2026-09-20T10:05:00.000Z",
                outcome: "effective" as const,
                evidenceIds: ["evidence-intervention-001"],
              },
            ]
          : [],
        currentInstructionalStrategy: "worked_example" as const,
        currentResponseMode: "worked_solution" as const,
        retentionState: {
          status: retentionStatus,
          confidence: 0.8,
          evidenceIds: [],
        },
        transferState: {
          status: transferStatus,
          confidence: 0.8,
          evidenceIds: [],
        },
        readinessState: {
          readyForAdvancement,
          confidence: 0.8,
          evaluatedAt: now,
        },
        lastUpdated: now,
        stateVersion: "cluster5-test-v1",
      },
    ],
  };
}

async function run(): Promise<void> {
  const learnerId =
    `learner-cluster5-${crypto.randomUUID()}`;

  await persistenceStore.ensureLearnerExists(
    learnerId,
  );

  const states = [
    makeState(
      learnerId,
      "competency-gh-math-b4-number-patterns-001",
      0.82,
      0.88,
      "probable_mastery",
      "retained",
      "demonstrated",
      true,
    ),

    makeState(
      learnerId,
      "competency-gh-science-b4-animal-classification-001",
      0.41,
      0.45,
      "misconception",
      "not_retained",
      "not_demonstrated",
      false,
      true,
    ),

    makeState(
      learnerId,
      "competency-gh-computing-b4-computer-parts-001",
      0.64,
      0.52,
      "prerequisite_gap",
      "retained",
      "demonstrated",
      false,
    ),

    makeState(
      learnerId,
      "competency-gh-english-b4-1-1-1-1",
      0.58,
      0.49,
      "persistent_difficulty",
      "retained",
      "not_demonstrated",
      false,
    ),
  ];

  for (const state of states) {
    await saveLearnerState(state);
  }

  const evidenceId =
    `evidence-teacher-view-${crypto.randomUUID()}`;

  await persistenceStore.saveEvidence({
    id: evidenceId,
    learnerId,
    competencyId:
      "competency-gh-math-b4-number-patterns-001",
    source: "assessment",
    outcome: "correct",
    timestamp: new Date().toISOString(),
    policyVersion: "teacher-evidence-test-v1",
    purpose: "mastery",
    independence: "independent",
    supportLevel: 0,
    difficulty: "standard",
    representation: "symbolic",
    strength: "strong",
    evaluatorType: "system_exact_match",
    evaluatorId: "teacher-evidence-test",
    evaluationPolicyVersion: "evidence-v1",
    interpretationVersion: "teacher-evidence-v1",
    exposureCount: 1,
  });

  const summary =
    await buildTeacherLearnerSummary(learnerId);

  assert(
    summary.subjects.length === 4,
    `expected 4 subjects, got ${summary.subjects.length}`,
  );

  const subjectNames =
    summary.subjects
      .map((subject) => subject.subjectName)
      .sort();

  assert(
    JSON.stringify(subjectNames) ===
      JSON.stringify([
        "Computing",
        "English Language",
        "Mathematics",
        "Science",
      ]),
    `unexpected subjects: ${subjectNames.join(", ")}`,
  );

  assert(
    summary.subjects.every(
      (subject) => subject.competencyCount === 1,
    ),
    "each test subject must contain exactly one competency",
  );

  assert(
    summary.attentionQueue.length === 3,
    `expected 3 competencies needing attention, got ${summary.attentionQueue.length}`,
  );

  const science =
    summary.attentionQueue.find(
      (item) => item.subjectName === "Science",
    );

  assert(
    Boolean(science) &&
      science!.attentionReasons.includes(
        "misconception",
      ) &&
      science!.attentionReasons.includes(
        "retention_failure",
      ) &&
      science!.attentionReasons.includes(
        "transfer_failure",
      ) &&
      science!.attentionReasons.includes(
        "low_confidence",
      ),
    "Science attention signals were not preserved",
  );

  const mathematics =
    summary.subjects.find(
      (subject) =>
        subject.subjectName === "Mathematics",
    );

  assert(
    mathematics?.competencies[0]
      ?.readyForAdvancement === true,
    "Mathematics readiness was not preserved",
  );

  assert(
    mathematics?.competencies[0]
      ?.attentionReasons.length === 0,
    "mastered Mathematics competency should not require attention",
  );

  const mathematicsEvidence =
    mathematics?.competencies[0]?.evidence ?? [];

  assert(
    mathematicsEvidence.length === 1,
    `expected 1 Mathematics evidence item, got ${mathematicsEvidence.length}`,
  );

  assert(
    mathematicsEvidence[0]?.id === evidenceId &&
      mathematicsEvidence[0]?.outcome === "correct" &&
      mathematicsEvidence[0]?.purpose === "mastery" &&
      mathematicsEvidence[0]?.independence === "independent" &&
      mathematicsEvidence[0]?.strength === "strong" &&
      mathematicsEvidence[0]?.evaluatorType === "system_exact_match",
    "Teacher Evidence fields were not preserved",
  );

  assert(
    summary.subjects
      .filter(
        (subject) =>
          subject.subjectName !== "Mathematics",
      )
      .every(
        (subject) =>
          subject.competencies.every(
            (competency) =>
              competency.evidence.length === 0,
          ),
      ),
    "Evidence leaked into another competency or subject",
  );

  const scienceDiagnosis =
    science?.diagnosisExplanation;

  assert(
    scienceDiagnosis?.diagnosticState ===
      "misconception" &&
      scienceDiagnosis.confidence > 0 &&
      Array.isArray(scienceDiagnosis.history) &&
      Array.isArray(
        scienceDiagnosis.supportingEvidenceIds,
      ) &&
      Array.isArray(
        scienceDiagnosis.prerequisiteCompetencyIds,
      ) &&
      Array.isArray(
        scienceDiagnosis.misconceptionIds,
      ) &&
      Array.isArray(scienceDiagnosis.errorPatterns),
    "Science diagnosis explanation was not preserved",
  );
const scienceAdaptive =
    science?.adaptiveExplanation;

  assert(
    scienceAdaptive?.instructionalStrategy ===
      "worked_example" &&
      scienceAdaptive.responseMode ===
        "worked_solution" &&
      scienceAdaptive.diagnosticState ===
        "misconception" &&
      scienceAdaptive.confidence === 0.45 &&
      scienceAdaptive.readyForAdvancement ===
        false &&
      Array.isArray(
        scienceAdaptive.relevantEvidenceIds,
      ),
    "Science adaptive explanation was not preserved",
  );
  const computing =
    summary.subjects.find(
      (subject) =>
        subject.subjectName === "Computing",
    );

  assert(
    computing?.competencies[0]
      ?.attentionReasons.includes(
        "prerequisite_gap",
      ) === true,
    "Computing prerequisite gap was not surfaced",
  );

  const english =
    summary.subjects.find(
      (subject) =>
        subject.subjectName === "English Language",
    );

  assert(
    english?.competencies[0]
      ?.attentionReasons.includes(
        "persistent_difficulty",
      ) === true &&
      english?.competencies[0]
        ?.attentionReasons.includes(
          "transfer_failure",
        ) === true,
    "English difficulty and transfer signals were not surfaced",
  );

  const mathSubject =
    summary.subjects.find(
      (subject) =>
        subject.subjectName === "Mathematics",
    );

  assert(
    science?.interventionHistory.length === 1 &&
      science.interventionHistory[0].interventionId ===
        "intervention-test-001" &&
      science.interventionHistory[0].type ===
        "remediate" &&
      science.interventionHistory[0].instructionalStrategy ===
        "worked_example" &&
      science.interventionHistory[0].outcome ===
        "effective" &&
      science.interventionHistory[0].evidenceIds.includes(
        "evidence-intervention-001",
      ) &&
      mathSubject?.competencies[0]?.interventionHistory.length === 0 &&
      computing?.competencies[0]?.interventionHistory.length === 0 &&
      english?.competencies[0]?.interventionHistory.length === 0,
    "Intervention history was not preserved and competency-isolated",
  );
  const mathProgress =
    mathSubject?.competencies[0]?.progressHistory ?? [];

  assert(
    mathProgress.length === 1 &&
      mathProgress[0].evidenceId === evidenceId &&
      mathProgress[0].outcome === "correct" &&
      mathProgress[0].purpose === "mastery" &&
      mathProgress[0].independence === "independent" &&
      mathProgress[0].difficulty === "standard" &&
      mathProgress[0].strength === "strong" &&
      science?.progressHistory.length === 0 &&
      computing?.competencies[0]?.progressHistory.length === 0 &&
      english?.competencies[0]?.progressHistory.length === 0,
    "Longitudinal progress was not preserved and competency-isolated",
  );
  assert(
    summary.attentionQueue.length === 3 &&
      summary.attentionQueue[0].attentionPriority === "critical" &&
      summary.attentionQueue[1].attentionPriority === "critical" &&
      summary.attentionQueue[2].attentionPriority === "high" &&
      summary.attentionQueue[2].subjectName === "English Language",
    "Teacher attention queue was not severity-prioritized",
  );
  console.log({
    cluster5TeacherSummary: "PASS",
    subjects: summary.subjects.map(
      (subject) => ({
        subject: subject.subjectName,
        competencies:
          subject.competencyCount,
        needingAttention:
          subject.competenciesNeedingAttention,
      }),
    ),
    attentionQueue:
      summary.attentionQueue.map(
        (item) => ({
          subject: item.subjectName,
          competency:
            item.competencyTitle,
          reasons:
            item.attentionReasons,
        }),
      ),
    persistence:
      process.env.FILUMIRE_PERSISTENCE ??
      "memory",
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});














