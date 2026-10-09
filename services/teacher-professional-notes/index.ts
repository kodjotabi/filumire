import { createHash } from "node:crypto";

import type {
  TeacherProfessionalNoteRecord,
  TeacherProfessionalNoteType,
} from "../persistence";

import { persistenceStore } from "../persistence-provider";

export const TEACHER_PROFESSIONAL_NOTES_VERSION =
  "teacher-professional-notes-v1";

export interface CreateTeacherProfessionalNoteInput {
  learnerId: string;
  competencyId?: string;
  authorPrincipalId: string;
  noteType: TeacherProfessionalNoteType;
  text: string;
  clientRequestId: string;
}

function createNoteId(
  input: CreateTeacherProfessionalNoteInput,
): string {
  return `teacher-note-${createHash("sha256")
    .update([
      input.authorPrincipalId,
      input.learnerId,
      input.competencyId ?? "",
      input.clientRequestId,
    ].join("|"))
    .digest("hex")
    .slice(0, 32)}`;
}

export async function createTeacherProfessionalNote(
  input: CreateTeacherProfessionalNoteInput,
): Promise<{
  note: TeacherProfessionalNoteRecord;
  duplicate: boolean;
}> {
  const text = input.text.trim();

  if (!text) {
    throw new Error(
      "Teacher professional note text is required.",
    );
  }

  const note: TeacherProfessionalNoteRecord = {
    id: createNoteId(input),
    learnerId: input.learnerId,
    competencyId: input.competencyId,
    authorPrincipalId: input.authorPrincipalId,
    noteType: input.noteType,
    text,
    createdAt: new Date().toISOString(),
  };

  const inserted =
    await persistenceStore.saveTeacherProfessionalNote(
      note,
    );

  return {
    note,
    duplicate: !inserted,
  };
}

export async function getTeacherProfessionalNotes(
  learnerId: string,
): Promise<TeacherProfessionalNoteRecord[]> {
  return persistenceStore.getTeacherProfessionalNotes(
    learnerId,
  );
}
