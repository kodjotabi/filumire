import {
  createTeacherProfessionalNote,
  getTeacherProfessionalNotes,
} from "../services/teacher-professional-notes";

import {
  getLearnerState,
} from "../services/learner-state";

const learnerId =
  `teacher-notes-test-${Date.now()}`;

const competencyId =
  "B4-MATH-NUM-001";

const teacherId =
  "teacher-notes-test-principal";

async function main() {
  const before = await getLearnerState(
    learnerId,
    competencyId,
  );

  const first =
    await createTeacherProfessionalNote({
      learnerId,
      competencyId,
      authorPrincipalId: teacherId,
      noteType: "professional_feedback",
      text:
        "Learner explains the method clearly but needs more confidence working independently.",
      clientRequestId: "request-1",
    });

  const duplicate =
    await createTeacherProfessionalNote({
      learnerId,
      competencyId,
      authorPrincipalId: teacherId,
      noteType: "professional_feedback",
      text:
        "Learner explains the method clearly but needs more confidence working independently.",
      clientRequestId: "request-1",
    });

  const notes =
    await getTeacherProfessionalNotes(
      learnerId,
    );

  const after = await getLearnerState(
    learnerId,
    competencyId,
  );

  if (first.duplicate) {
    throw new Error(
      "First teacher note was incorrectly marked duplicate.",
    );
  }

  if (!duplicate.duplicate) {
    throw new Error(
      "Duplicate teacher note was not protected.",
    );
  }

  if (notes.length !== 1) {
    throw new Error(
      `Expected 1 teacher note, received ${notes.length}.`,
    );
  }

  const note = notes[0];

  if (
    note.noteType !== "professional_feedback" ||
    note.authorPrincipalId !== teacherId ||
    note.competencyId !== competencyId
  ) {
    throw new Error(
      "Teacher professional note fields were not preserved.",
    );
  }

  if (
    before !== undefined ||
    after !== undefined
  ) {
    throw new Error(
      "Teacher professional note mutated learner state.",
    );
  }

  console.log({
    teacherProfessionalNotesV1: "PASS",
    persisted: notes.length,
    duplicateProtected:
      duplicate.duplicate,
    learnerStateMutated:
      after !== undefined,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
