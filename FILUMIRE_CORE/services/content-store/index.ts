import type { LearningContent } from "../../packages/content";

const contentStore = new Map<string, LearningContent>();

export function saveContent(content: LearningContent): void {
  contentStore.set(content.id, content);
}

export function getContent(
  contentId: string,
): LearningContent | undefined {
  return contentStore.get(contentId);
}

export function getContentForCompetency(
  competencyId: string,
): LearningContent[] {
  return Array.from(contentStore.values()).filter(
    (content) => content.competencyId === competencyId,
  );
}

export function getAllContent(): LearningContent[] {
  return Array.from(contentStore.values());
}