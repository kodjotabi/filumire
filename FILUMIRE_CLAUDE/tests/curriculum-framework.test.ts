import {
  GHANA_MATH_PILOT_CURRICULUM_ID,
  GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
} from "../packages/curriculum";
import {
  CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
  GRADE_GHANA_BASIC_4_ID,
  SUBJECT_GHANA_BASIC4_ENGLISH_ID,
  SUBJECT_GHANA_BASIC4_MATH_ID,
  SUBJECT_GHANA_BASIC4_SCIENCE_ID,
  getCompetencyMappingsForCompetency,
  getCompetencyRelationships,
  getCurriculumNodesForCompetency,
  getInitialCompetencyIdForResolvedContext,
  getSubjectCapability,
  resolveCurriculumContext,
} from "../packages/curriculum-framework";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

async function runCurriculumFrameworkTest(): Promise<void> {
  // 3. Valid curriculum/version/grade/subject resolution.
  const resolved = resolveCurriculumContext(
    CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
    GRADE_GHANA_BASIC_4_ID,
    SUBJECT_GHANA_BASIC4_MATH_ID,
  );

  assert(
    Boolean(resolved) &&
      resolved?.curriculum.id ===
        GHANA_MATH_PILOT_CURRICULUM_ID &&
      resolved?.country.name === "Ghana" &&
      resolved?.subject.name === "Mathematics",
    "a valid curriculum/version/grade/subject chain must resolve fully",
  );

  const initialCompetencyId =
    resolved &&
    getInitialCompetencyIdForResolvedContext(resolved);

  assert(
    initialCompetencyId ===
      GHANA_MATH_PILOT_INITIAL_COMPETENCY_ID,
    "the resolved context must yield the real Ghana pilot initial competency",
  );

  console.log({
    test: "valid curriculum/version/grade/subject resolution",
    result: "PASS",
  });

  // 4. Unknown curriculum (version) rejection.
  const unknownCurriculum = resolveCurriculumContext(
    "missing-curriculum-version",
    GRADE_GHANA_BASIC_4_ID,
    SUBJECT_GHANA_BASIC4_MATH_ID,
  );

  assert(
    unknownCurriculum === undefined,
    "an unknown curriculum version must fail resolution",
  );

  console.log({
    test: "unknown curriculum rejected",
    result: "PASS",
  });

  // 5. Unknown/inconsistent grade rejection.
  const unknownGrade = resolveCurriculumContext(
    CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
    "missing-grade",
    SUBJECT_GHANA_BASIC4_MATH_ID,
  );

  assert(
    unknownGrade === undefined,
    "an unknown grade must fail resolution",
  );

  console.log({
    test: "unknown/inconsistent grade rejected",
    result: "PASS",
  });

  // 6. Unknown/inconsistent subject rejection.
  const unknownSubject = resolveCurriculumContext(
    CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
    GRADE_GHANA_BASIC_4_ID,
    "missing-subject",
  );

  assert(
    unknownSubject === undefined,
    "an unknown subject must fail resolution",
  );

  console.log({
    test: "unknown/inconsistent subject rejected",
    result: "PASS",
  });

  // Subject capability: architecture supports Math/English/
  // Science without fabricating English/Science content.
  assert(
    getSubjectCapability(SUBJECT_GHANA_BASIC4_MATH_ID)
      ?.status === "partial",
    "Mathematics must remain the active supported subject with partial curriculum coverage",
  );
  assert(
    getSubjectCapability(
      SUBJECT_GHANA_BASIC4_ENGLISH_ID,
    )?.status === "partial",
    "English must report partial capability until richer evidence modes have production trusted evaluators",
  );
  assert(
    getSubjectCapability(
      SUBJECT_GHANA_BASIC4_SCIENCE_ID,
    )?.status === "full",
    "Science must be fully activated after complete adaptive coverage",
  );

  console.log({
    test: "subject capability reflects Math partial / English partial / Science full",
    result: "PASS",
  });

  // 11. Curriculum-to-competency mapping integrity.
  const GH_COMPETENCY_IDS = [
    "competency-gh-math-b4-number-patterns-001",
    "competency-gh-math-b4-number-patterns-002",
    "competency-gh-math-b4-number-patterns-003",
  ];

  for (const competencyId of GH_COMPETENCY_IDS) {
    const mappings =
      getCompetencyMappingsForCompetency(competencyId);
    const nodes =
      getCurriculumNodesForCompetency(competencyId);

    assert(
      mappings.length >= 1,
      `competency ${competencyId} must have at least one curriculum-node mapping`,
    );

    assert(
      mappings.some(
        (mapping) => mapping.relationship === "direct",
      ),
      `competency ${competencyId} must retain at least one direct curriculum-node mapping`,
    );

    assert(
      nodes.length >= 1 &&
        nodes.every(
          (node) =>
            node.subjectId ===
            SUBJECT_GHANA_BASIC4_MATH_ID,
        ),
      `competency ${competencyId} mappings must resolve to real curriculum nodes under Mathematics`,
    );

    assert(
      nodes.every((node) =>
        mappings.some(
          (mapping) =>
            mapping.curriculumNodeId === node.id,
        ),
      ),
      `competency ${competencyId} curriculum nodes must match its declared mappings`,
    );
  }

  console.log({
    test: "curriculum-to-competency mapping integrity",
    result: "PASS",
  });

  // 12. Competency relationship integrity (prerequisite chain
  // already implied by CompetencyDefinition, now explicit).
  const relationships002 = getCompetencyRelationships(
    "competency-gh-math-b4-number-patterns-002",
    "prerequisite",
  );

  assert(
    relationships002.some(
      (relationship) =>
        relationship.fromCompetencyId ===
          "competency-gh-math-b4-number-patterns-002" &&
        relationship.toCompetencyId ===
          "competency-gh-math-b4-number-patterns-001",
    ),
    "competency 002 must have an explicit prerequisite relationship to competency 001",
  );

  const relationships003 = getCompetencyRelationships(
    "competency-gh-math-b4-number-patterns-003",
    "prerequisite",
  );

  assert(
    relationships003.some(
      (relationship) =>
        relationship.fromCompetencyId ===
          "competency-gh-math-b4-number-patterns-003" &&
        relationship.toCompetencyId ===
          "competency-gh-math-b4-number-patterns-002",
    ),
    "competency 003 must have an explicit prerequisite relationship to competency 002",
  );

  console.log({
    test: "competency relationship integrity",
    result: "PASS",
  });

  console.log({ curriculumFrameworkTest: "PASS" });
}

runCurriculumFrameworkTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
