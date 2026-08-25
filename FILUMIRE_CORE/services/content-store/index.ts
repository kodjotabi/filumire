import type {
  LearningContent,
  LearningLanguage,
} from "../../packages/content";

const contentStore =
  new Map<string, LearningContent>();

export function saveContent(
  content: LearningContent,
): void {
  contentStore.set(
    content.id,
    content,
  );
}

export function getContent(
  contentId: string,
): LearningContent | undefined {
  return contentStore.get(
    contentId,
  );
}

export function getContentForCompetency(
  competencyId: string,
  language?: LearningLanguage,
): LearningContent[] {
  return Array.from(
    contentStore.values(),
  ).filter(
    (content) =>
      content.competencyId ===
        competencyId &&
      (
        language === undefined ||
        content.language === language
      ),
  );
}

export function getContentForCompetencyInLanguage(
  competencyId: string,
  language: LearningLanguage,
): LearningContent[] {
  return getContentForCompetency(
    competencyId,
    language,
  );
}

export function getAllContent(): LearningContent[] {
  return Array.from(
    contentStore.values(),
  );
}

export function getAllContentInLanguage(
  language: LearningLanguage,
): LearningContent[] {
  return Array.from(
    contentStore.values(),
  ).filter(
    (content) =>
      content.language === language,
  );
}