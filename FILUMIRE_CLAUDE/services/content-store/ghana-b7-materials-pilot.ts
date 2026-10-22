import { buildTopic, type Lesson, type Question } from "./authored-builder";
import { GHANA_B7_CCP_REGISTRY } from "../../packages/curriculum-framework/ghana-b7-ccp";
import type { CompetencyDefinition } from "../../packages/curriculum";
import type { LearningContent } from "../../packages/content";

// Deliberately absent from production curriculum registration and content seeding.
// Only the guarded Phase 8E harness installs this authored pilot.
export const source = GHANA_B7_CCP_REGISTRY.competencies.find(
  (entry) => entry.sourceEntryId === "science:pdf39:row1",
)!;
export const competency: CompetencyDefinition = {
  id: source.id,
  curriculumFrameworkId: "curriculum-gh-math-pilot",
  educationSystemId: "education-system-gh-basic-pilot",
  learningLevelId: source.gradeId,
  subjectId: source.subjectId,
  strandId: source.hierarchy.strandId,
  subStrandId: source.hierarchy.subStrandId,
  contentStandardId: source.hierarchy.contentStandardId,
  learningIndicatorId: source.curriculumNodeId,
  title: source.title,
  description: "Observe familiar materials, classify their states, and explain differences using shape and volume.",
  prerequisiteCompetencyIds: [], successorCompetencyIds: [], relatedCompetencyIds: [],
  subskills: ["observe-materials", "classify-states", "compare-properties"],
  misconceptions: ["liquids-have-fixed-shape", "invisible-air-is-not-matter", "pourable-means-liquid"],
  difficulty: 2,
  masteryRequirements: { masteryThreshold: 0.8, confidenceThreshold: 0.8 },
  retentionRequirements: { required: true, confidenceThreshold: 0.8 },
  transferRequirements: { required: true, confidenceThreshold: 0.8 },
};

const text = (en: string, fr: string) => ({ en, fr });
const lessons: Lesson[] = [
  { key: "lesson", type: "lesson", strategy: "direct_explanation",
    title: text("Materials around us", "Les matières autour de nous"),
    body: text(
      "Goal: classify familiar materials as solids, liquids or gases and explain your choice. A solid keeps its own shape and volume. A liquid keeps its volume but takes the shape of its container. A gas spreads to fill the available space. Air is matter even though we usually cannot see it. At room temperature, a stone is solid, water is liquid and air is gas. Colour alone does not tell us the state. Observe a stone, water in a clear closed container and an air-filled balloon. Make a table with material, texture, appearance, colour and shape. Record only what you observe; write 'not observed' when appropriate. Group the materials by state and discuss how their shapes differ. Keep this table for teacher review; quiz completion does not replace the observation activity.",
      "Objectif : classer des matières familières en solides, liquides ou gaz et expliquer son choix. Un solide garde sa forme et son volume. Un liquide garde son volume mais prend la forme de son récipient. Un gaz se répartit dans tout l'espace disponible. L'air est de la matière même si on ne le voit généralement pas. À température ambiante, une pierre est solide, l'eau est liquide et l'air est gazeux. La couleur seule ne donne pas l'état. Observe une pierre, de l'eau dans un récipient transparent fermé et un ballon rempli d'air. Fais un tableau : matière, texture, aspect, couleur et forme. Note uniquement tes observations ; écris « non observé » si nécessaire. Classe les matières par état et discute des différences de forme. Garde ce tableau pour l'enseignant ; le quiz ne remplace pas cette activité."), },
  { key: "example", type: "example", strategy: "worked_example",
    title: text("Stone, water and air: three worked examples", "Pierre, eau et air : trois exemples résolus"),
    body: text(
      "Stone: grey, rough, visible, irregular shape. Moving it to a different dish does not change its shape: solid. Water: clear, colourless in this sample, a level surface, container-shaped. Pouring the same water into a different cup changes its shape, not its amount: liquid. Air inside a balloon: not directly visible; the balloon shows that it occupies space. Air fills the space available: gas. The balloon skin is a solid; the air inside is a gas. Try it: point to one solid, one liquid and evidence of a gas nearby. Explain each classification using properties, not colour.",
      "Pierre : grise, rugueuse, visible, de forme irrégulière. La déplacer dans un autre plat ne change pas sa forme : solide. Eau : transparente, incolore dans cet échantillon, surface horizontale, forme du récipient. La même eau versée dans une autre tasse change de forme, mais pas de quantité : liquide. Air dans un ballon : invisible directement ; le ballon montre qu'il occupe de l'espace. L'air remplit l'espace disponible : gaz. L'enveloppe du ballon est solide ; l'air à l'intérieur est gazeux. À toi : indique un solide, un liquide et un indice de gaz autour de toi. Explique avec les propriétés, pas la couleur."), },
  { key: "scaffold", type: "scaffold", strategy: "step_by_step_scaffold",
    title: text("Use a property checklist", "Utilise une liste de propriétés"),
    body: text("First name the material, not just its container. Does it keep its own shape? Think solid. Does it take the container's shape while keeping its volume? Think liquid. Does it spread to fill the available space? Think gas. Compare a stone, water and air. Now explain your choice before choosing an answer.", "Nomme d'abord la matière, pas seulement le récipient. Garde-t-elle sa forme ? Pense à un solide. Prend-elle la forme du récipient en gardant son volume ? Pense à un liquide. Remplit-elle l'espace disponible ? Pense à un gaz. Compare pierre, eau et air. Explique ton choix avant de répondre."), },
  { key: "remediation", type: "remediation", strategy: "error_analysis",
    title: text("Check the property, not the appearance", "Vérifie la propriété, pas seulement l'aspect"),
    body: text("Being invisible does not mean something is not matter: air occupies space. Being pourable does not always mean liquid: dry sand consists of solid grains, each keeping its shape. A liquid changes shape as a whole. Water in a bottle is liquid; the bottle can be solid. Name the material, compare shape and volume, then classify it again.", "Une matière invisible existe quand même : l'air occupe de l'espace. Ce qui se verse n'est pas toujours liquide : le sable sec est constitué de grains solides qui gardent leur forme. Un liquide change de forme dans son ensemble. L'eau d'une bouteille est liquide ; la bouteille peut être solide. Nomme la matière, compare forme et volume, puis classe-la à nouveau."), },
];

function question(key: string, en: string, fr: string, optionsEn: string[], optionsFr: string[], answer: number, purpose: Question["purpose"] = "diagnostic"): Question {
  return { key, title: text("Classify and explain", "Classe et explique"), body: text(en, fr),
    options: { en: optionsEn, fr: optionsFr }, answer, purpose,
    rules: Object.fromEntries(optionsEn.map((_, i) => [i, ["compare-shape-and-volume", "conceptual_misunderstanding"] as const]).filter(([i]) => i !== answer)),
    code: source.officialCode, subskills: ["classify-states", "compare-properties"],
    criteria: ["Identify the material's state using observed properties"], contexts: [key.includes("transfer") ? "new-material" : "familiar-materials"], };
}
const statesEn = ["Solid", "Liquid", "Gas"], statesFr = ["Solide", "Liquide", "Gaz"];
const questions: Question[] = [
  question("stone", "A stone keeps its own shape in a bowl and on a table. What state is it?", "Une pierre garde sa forme dans un bol et sur une table. Quel est son état ?", statesEn, statesFr, 0),
  question("water", "The same water changes shape between cups but keeps its volume. What state is it?", "La même eau change de forme entre deux tasses mais garde son volume. Quel est son état ?", statesEn, statesFr, 1),
  question("air", "Air spreads through the available space inside a balloon. What state is the air?", "L'air se répartit dans l'espace disponible dans un ballon. Quel est l'état de l'air ?", statesEn, statesFr, 2),
  question("table", "Observation table: material X keeps its shape; Y takes its container's shape with fixed volume; Z fills available space. Classify X, Y, Z.", "Tableau : X garde sa forme ; Y prend la forme du récipient avec un volume fixe ; Z remplit l'espace disponible. Classe X, Y, Z.", ["Solid, liquid, gas", "Liquid, gas, solid", "Gas, solid, liquid"], ["Solide, liquide, gaz", "Liquide, gaz, solide", "Gaz, solide, liquide"], 0),
  question("bottle", "Which statement correctly separates the material from its container?", "Quelle phrase distingue correctement la matière de son récipient ?", ["Both water and the bottle must be solid", "Water is liquid; the rigid bottle is solid", "Water is gas because it can move"], ["L'eau et la bouteille sont forcément solides", "L'eau est liquide ; la bouteille rigide est solide", "L'eau est gazeuse parce qu'elle bouge"], 1),
  question("invisible", "Why is air classified as a gas rather than 'nothing'?", "Pourquoi l'air est-il un gaz plutôt que « rien » ?", ["All invisible things are gases", "Air has a fixed shape", "Air occupies space and spreads to fill available space"], ["Tout ce qui est invisible est gazeux", "L'air a une forme fixe", "L'air occupe et remplit l'espace disponible"], 2),
  question("recheck", "Oil keeps its volume but takes a jar's shape. What state is it?", "L'huile garde son volume mais prend la forme du bocal. Quel est son état ?", statesEn, statesFr, 1, "reassessment"),
  question("recheck-air", "Air moved to a larger container spreads through it. What state is it?", "L'air placé dans un récipient plus grand s'y répartit. Quel est son état ?", statesEn, statesFr, 2, "reassessment"),
  question("retention", "Without looking back: which property identifies a liquid?", "Sans relire : quelle propriété caractérise un liquide ?", ["Fixed shape", "Fixed volume but container-shaped", "Fills any available space"], ["Forme fixe", "Volume fixe mais forme du récipient", "Remplit tout l'espace disponible"], 1, "retention"),
  question("retention-classify", "On revision, classify the air in an empty-looking cup.", "En révision, classe l'air dans une tasse qui semble vide.", statesEn, statesFr, 2, "retention"),
  question("transfer", "Dry sand can be poured. Each grain keeps its shape. How should the grains be classified?", "Le sable sec peut se verser. Chaque grain garde sa forme. Comment classer les grains ?", ["Solid: each grain keeps its shape", "Liquid: everything pourable is liquid", "Gas: the grains spread out"], ["Solides : chaque grain garde sa forme", "Liquides : tout ce qui se verse est liquide", "Gaz : les grains se dispersent"], 0, "transfer"),
  question("transfer-metal", "A metal spoon and juice are put in different containers. Which prediction uses their states correctly?", "Une cuillère métallique et du jus sont placés dans d'autres récipients. Quelle prévision utilise correctement leurs états ?", ["Both keep a fixed shape", "The spoon keeps its shape; juice takes the container's shape", "Both expand to fill all available space"], ["Les deux gardent une forme fixe", "La cuillère garde sa forme ; le jus prend celle du récipient", "Les deux remplissent tout l'espace disponible"], 1, "transfer"),
];
const practice = question("practice", "Use the checklist: water takes a cup's shape but keeps its volume. What state is it?", "Utilise la liste : l'eau prend la forme d'une tasse mais garde son volume. Quel est son état ?", statesEn, statesFr, 1);
delete practice.purpose; // The existing selector uses the guided-practice pool, not diagnostic.

export const pilotContent: Array<LearningContent & { metadata: Record<string, string> }> = buildTopic({ competencyId: source.id, slug: "materials-states-pilot", level: "b7", version: "phase8e-1", source: `${source.source.url}#page=39 (printed page 2); ${source.officialCode}`, defaultCode: source.officialCode }, lessons, practice, questions).map((item) => ({
  ...item, metadata: { ...item.metadata, sourceDocumentSha256: source.source.sha256, sourcePdfPage: "39", authoringStatus: "isolated-pilot-not-published", evidenceRepresentation: item.id.includes("table") ? "visual" : "verbal" },
}));

// A separate practical artefact: never exact-match a free-text observation as mastery.
export const observationContent = (["en", "fr"] as const).map((language) => ({
  ...pilotContent.find((item) => item.language === language && item.type === "assessment")!,
  id: `content-b7-materials-observation-${language}`, assessmentItemId: `item-b7-materials-observation-${language}`,
  title: language === "en" ? "Observation table and discussion" : "Tableau d'observation et discussion",
  body: lessons[0].body[language], assessmentStrategy: "short_answer" as const,
  metadata: { curriculumSource: `${source.source.url}#page=39`, curriculumNodeCode: source.officialCode,
    evaluationMethod: "trusted_rubric_evaluation", expectedResponse: "rubric_evaluated_performance", responseMode: "short_answer",
    assessmentPurpose: "diagnostic", rubricCriteria: JSON.stringify([
      "Records texture, appearance, colour and shape honestly, identifying unobserved properties",
      "Groups observed materials into solids, liquids and gases",
      "Discusses differences and gives environmental examples",
    ]), },
}));
