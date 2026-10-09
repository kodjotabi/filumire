import type { LearningContent } from "../../packages/content";

export type Lang = "en" | "fr";
export type Purpose = "diagnostic" | "reassessment" | "retention" | "transfer";
export type State =
  | "conceptual_misunderstanding"
  | "procedural_error"
  | "misconception";
export type Rule = readonly [string, State];
export type Text = { en: string; fr: string };

export type Question = {
  key: string;
  purpose?: Purpose;
  title: Text;
  body: Text;
  options: { en: string[]; fr: string[] };
  answer: number;
  rules: Record<number, Rule>;
  code: string;
  subskills: string[];
  criteria: string[];
  contexts: string[];
};

export type Lesson = {
  key: string;
  type: "lesson" | "example" | "scaffold" | "remediation";
  strategy:
    | "direct_explanation"
    | "worked_example"
    | "step_by_step_scaffold"
    | "error_analysis";
  title: Text;
  body: Text;
};

export type Topic = {
  competencyId: string;
  slug: string;
  version: string;
  source: string;
  defaultCode: string;

  /* Ghana level the topic belongs to, such as "b4" or "b5". Defaults to "b4". */
  level?: string;
};

const LANGS: Lang[] = ["en", "fr"];

export function buildTopic(
  topic: Topic,
  lessons: Lesson[],
  practice: Question,
  questions: Question[],
): LearningContent[] {
  const now = new Date().toISOString();
  const level = topic.level ?? "b4";

  const contentId = (key: string, lang: Lang) =>
    `content-gh-${level}-${topic.slug}-${key}-${lang}`;

  function meta(code: string, contexts: string[]) {
    return {
      curriculumNodeCode: code,
      curriculumSource: topic.source,
      contextTags: JSON.stringify(contexts),
    };
  }

  function lessonItem(item: Lesson, lang: Lang): LearningContent {
    return {
      id: contentId(item.key, lang),
      competencyId: topic.competencyId,
      type: item.type,
      title: item.title[lang],
      body: item.body[lang],
      language: lang,
      teachingStrategy: item.strategy,
      translationOfContentId:
        lang === "fr" ? contentId(item.key, "en") : undefined,
      metadata: meta(topic.defaultCode, ["abstract"]),
      version: topic.version,
      createdAt: now,
      updatedAt: now,
    };
  }

  function questionItem(
    q: Question,
    lang: Lang,
    type: "assessment" | "practice",
  ): LearningContent {
    const options = q.options[lang];
    const diagnosticRules: Record<
      string,
      {
        errorPattern: string;
        diagnosticState: State;
        diagnosticConfidence: number;
      }
    > = {};

    for (const [index, rule] of Object.entries(q.rules)) {
      diagnosticRules[options[Number(index)]] = {
        errorPattern: rule[0],
        diagnosticState: rule[1],
        diagnosticConfidence: 0.8,
      };
    }

    const metadata: Record<string, string> = {
      ...meta(q.code, q.contexts),
      options: JSON.stringify(options),
      expectedResponse: options[q.answer],
      diagnosticRules: JSON.stringify(diagnosticRules),
      evidenceProfile: "conceptual_understanding",
      successCriteria: JSON.stringify(q.criteria),
      targetSubskills: JSON.stringify(q.subskills),
    };

    if (q.purpose) {
      metadata.assessmentPurpose = q.purpose;
    }

    return {
      id: contentId(q.key, lang),
      competencyId: topic.competencyId,
      type,
      title: q.title[lang],
      body: q.body[lang],
      language: lang,
      teachingStrategy: type === "practice" ? "guided_practice" : undefined,
      assessmentStrategy: "multiple_choice",
      assessmentItemId: `item-gh-${level}-${topic.slug}-${q.key}-${lang}`,
      translationOfContentId:
        lang === "fr" ? contentId(q.key, "en") : undefined,
      prerequisiteContentIds:
        type === "practice" ? [contentId("lesson", lang)] : undefined,
      metadata,
      version: topic.version,
      createdAt: now,
      updatedAt: now,
    };
  }

  return LANGS.flatMap((lang) => [
    ...lessons.map((item) => lessonItem(item, lang)),
    questionItem(practice, lang, "practice"),
    ...questions.map((q) => questionItem(q, lang, "assessment")),
  ]);
}