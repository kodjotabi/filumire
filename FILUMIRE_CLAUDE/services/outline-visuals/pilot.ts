import type { OutlineModel, VisualLanguage } from "../../packages/contracts/outline-visual";
type Copy = { title: string; description: string; model: OutlineModel };
export interface PilotReview {
  competencyId: string; digest: string; family: "fractions" | "sentences" | "plant" | "computer" | "printing";
  fractionPairs?: Record<string, readonly [number, number, number, number]>;
}
// Source review belongs to the curriculum adapter, never the SVG primitives.
// Digests cover ALL existing teaching and assessment variants, including EN/FR.
export const PILOT_REVIEWS: readonly PilotReview[] = [
  { competencyId: "competency-gh-math-b4-equivalent-fractions-001", digest: "b878ab2696fc5cdbdf9f42ea9d30eb3e01872428f678deb1cecb260692f7044e", family: "fractions", fractionPairs: { example: [2, 3, 4, 6], scaffold: [3, 4, 6, 8] } },
  { competencyId: "competency-gh-english-b4-4-2-1-2", digest: "6d7c883f3f3dbd09de0f22b62e8fc798c73689ae2936da701c702996a54c9e56", family: "sentences" },
  { competencyId: "competency-gh-science-b4-2-2-1-1", digest: "b9eec19bb04da54fc4abcc695c61aa5593d2d653e697584f90ce5e2e70c26daf", family: "plant" },
  { competencyId: "competency-gh-computing-b4-computer-parts-001", digest: "71675875914e9659d6484bcb3b3380371f8ff2dd7777e0280d6e4ac72de90b63", family: "computer" },
  { competencyId: "competency-gh-math-b5-1-3-1-1", digest: "769452f437741026b8eee0cf04a2afe0706ccebb6c70686e85edb0805b990e65", family: "fractions" },
  { competencyId: "competency-gh-computing-b6-6-3-1-5", digest: "acdd0154249132575ad3c47e0fdb9ac156eadf2455457968855a7b8946a9f526", family: "printing" },
];
export function pilotVisuals(review: PilotReview, type: string, lang: VisualLanguage): Copy[] {
  const fr = lang === "fr";
  switch (review.family) {
    case "fractions": {
      // These source-specific examples are reviewed bindings, not title inference.
      const pair = review.fractionPairs?.[type] ?? [1, 2, 2, 4];
      const [a, b, c, d] = pair;
      return [{ title: fr ? "La même quantité" : "The same amount", description: fr
        ? `${a}/${b} = ${c}/${d}. Les deux barres ont la même taille. Le même espace est colorié et hachuré ; seules les parts changent.`
        : `${a}/${b} = ${c}/${d}. Both bars have the same size. The same area is shaded and hatched; only the partitions change.`,
        model: { kind: "part-whole", relation: "equivalent", fractions: [{ numerator: a, denominator: b }, { numerator: c, denominator: d }] } },
      { title: fr ? "La position sur la droite graduée" : "Position on a number line", description: fr
        ? `La droite va de 0 à 1 en ${d} parts égales. Le point indique ${c}/${d}, la même quantité que ${a}/${b}.`
        : `The line goes from 0 to 1 in ${d} equal parts. The dot marks ${c}/${d}, the same amount as ${a}/${b}.`,
        model: { kind: "number-line", start: 0, end: 1, format: "fraction", divisions: d, marked: c } }];
    }
    case "sentences": return [{ title: fr ? "Une pensée complète" : "One complete thought", description: fr
      ? "Les mots anglais restent en anglais. Le sujet indique de qui on parle ; le prédicat indique ce que le sujet fait. Le point termine la phrase."
      : "The subject tells us who the sentence is about; the predicate tells us what the subject does. The full stop ends the sentence.",
      model: { kind: "sentence-strip", parts: [
        { text: type === "example" ? "My dog" : "Ama", label: fr ? "Sujet" : "Subject", language: "en" },
        { text: type === "example" ? "barks loudly." : "sings.", label: fr ? "Prédicat" : "Predicate", language: "en" },
      ] } }];
    case "plant": return [{ title: fr ? "Une plante à fleurs" : "A flowering plant", description: fr
      ? "Schéma simplifié, non à l’échelle. Suis les repères numérotés pour relier chaque partie à sa fonction."
      : "Simplified diagram, not to scale. Follow the numbered markers to connect each part to its function.",
      model: { kind: "labelled-diagram", shapes: [
        { kind: "line", x1: 120, y1: 220, x2: 480, y2: 220 },
        { kind: "line", x1: 300, y1: 60, x2: 300, y2: 255 },
        { kind: "polyline", points: [{ x: 250, y: 275 }, { x: 300, y: 230 }, { x: 350, y: 275 }] },
        { kind: "line", x1: 300, y1: 250, x2: 280, y2: 280 },
        { kind: "ellipse", cx: 260, cy: 140, rx: 40, ry: 16 },
        { kind: "ellipse", cx: 340, cy: 170, rx: 40, ry: 16 },
        { kind: "ellipse", cx: 300, cy: 40, rx: 12, ry: 22 },
        { kind: "ellipse", cx: 300, cy: 80, rx: 12, ry: 22 },
        { kind: "ellipse", cx: 280, cy: 60, rx: 22, ry: 12 },
        { kind: "ellipse", cx: 320, cy: 60, rx: 22, ry: 12 },
        { kind: "ellipse", cx: 300, cy: 60, rx: 12, ry: 12, accent: true },
      ], labels: [
        { x: 355, y: 260, text: fr ? "Racines : absorbent l’eau et ancrent la plante." : "Roots: take in water and anchor the plant." },
        { x: 310, y: 195, text: fr ? "Tige : soutient la plante et transporte l’eau." : "Stem: supports the plant and carries water." },
        { x: 220, y: 140, text: fr ? "Feuilles : utilisent la lumière pour fabriquer de la nourriture." : "Leaves: use light to make food." },
        { x: 345, y: 60, text: fr ? "Fleur : participe à la formation des graines." : "Flower: involved in forming seeds." },
      ] } }];
    case "computer": return [{ title: fr ? "Les parties travaillent ensemble" : "Parts work together", description: fr
      ? "Dessin d’un ordinateur de bureau, non à l’échelle. L’écran n’est pas tout l’ordinateur. Les lignes en pointillé montrent comment les périphériques sont reliés à l’unité centrale."
      : "Line drawing of a desktop computer, not to scale. The monitor is not the whole computer. The dashed lines show how the peripherals connect to the system unit.",
      model: { kind: "equipment", devices: [
        { device: "monitor", label: fr ? "Écran : affiche des informations." : "Monitor: displays information." },
        { device: "system-unit", label: fr ? "Unité centrale : contient le processeur, la mémoire et le stockage." : "System unit: contains the processor, memory and storage." },
        { device: "keyboard", label: fr ? "Clavier : permet de taper." : "Keyboard: used for typing." },
        { device: "mouse", label: fr ? "Souris : permet de pointer et de sélectionner." : "Mouse: used to point and select." },
        { device: "printer", label: fr ? "Imprimante : produit une copie sur papier." : "Printer: produces a paper copy." },
      ] } }];
    case "printing": return [{ title: fr ? "Préparer puis imprimer" : "Prepare, then print", description: fr
      ? "L’aperçu montre le résultat prévu ; il n’imprime rien. Schéma du processus, sans interaction avec une vraie imprimante."
      : "Preview shows the expected result; it does not print. This is a process diagram, not a connection to a real printer.",
      model: { kind: "process", steps: fr
        ? ["Ouvrir la page", "Ouvrir la fenêtre d’impression (Ctrl + P)", "Vérifier l’aperçu", "Choisir les pages, l’imprimante et les copies", "Cliquer sur Imprimer"]
        : ["Open the page", "Open the print window (Ctrl + P)", "Check the preview", "Choose pages, printer and copies", "Click Print"],
        icons: ["open-page", "print-shortcut", "print-preview", "print-settings", "printer-output"] } }];
  }
}
