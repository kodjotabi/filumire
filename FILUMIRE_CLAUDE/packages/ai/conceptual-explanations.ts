import type { ConversationLanguage } from "./conversation";
import { normalizedQuestion } from "./conversation-safety";

// Whole-question matches only: appending an assessment, a proposed answer or
// instructions must never turn an answer request into an approved explanation.
const explanations = [
  {
    id: "half-meaning",
    question: /^(?:is (?:one half|a half|1\s*\/\s*2) (?:the same as|another word for) (?:a )?half|(?:what (?:is|does)|explain) (?:a |one )?half(?: mean)?|(?:est-ce que |est-ce qu')?(?:un demi|1\s*\/\s*2)(?:,? c'est| est| signifie)(?: la meme chose que)? (?:la |une )?moitie|(?:qu'est-ce qu'un demi|que veut dire un demi|explique (?:un demi|la moitie)))$/,
    en: 'Yes. "One half" and "half" mean the same amount: 1/2, or one of two equal parts of a whole. For example, cut a bread roll into two equal pieces. Each piece is half, or one half, of the roll. The two pieces must be equal in size.',
    fr: 'Oui. « Un demi » et « la moitié » représentent la même quantité : 1/2, soit une des deux parts égales d’un tout. Par exemple, coupe un petit pain en deux parts égales. Chaque part est un demi du pain, ou la moitié du pain. Les deux parts doivent avoir la même taille.',
  },
  {
    id: "unit-fraction-meaning",
    question: /^(?:what is a unit fraction|what does (?:a )?unit fraction mean|explain (?:a |the )?unit fractions?|qu'est-ce qu'une fraction unitaire|que signifie une fraction unitaire|explique (?:une fraction unitaire|les fractions unitaires))$/,
    en: 'A unit fraction is one equal part of a whole. It has 1 on top. For example, cut a bread roll into four equal pieces. One piece is 1/4 of the roll. The 4 tells us how many equal pieces make the whole; the 1 tells us we have one piece.',
    fr: 'Une fraction unitaire est une seule part égale d’un tout. Elle a 1 en haut. Par exemple, coupe un petit pain en quatre parts égales. Une part représente 1/4 du pain. Le 4 indique combien de parts égales forment le tout ; le 1 indique que nous avons une seule part.',
  },
  {
    id: "denominator-meaning",
    question: /^(?:what is (?:a |the )?denominator|what does (?:the )?denominator mean|explain (?:the )?denominator|qu'est-ce qu'un denominateur|que signifie le denominateur|explique le denominateur)$/,
    en: 'The denominator is the bottom number in a fraction. It tells us how many equal parts make the whole. For example, in 1/4, the denominator is 4: a bread roll is divided into four equal pieces. Each piece must be the same size.',
    fr: 'Le dénominateur est le nombre du bas dans une fraction. Il indique en combien de parts égales le tout est partagé. Par exemple, dans 1/4, le dénominateur est 4 : un petit pain est partagé en quatre parts égales. Chaque part doit avoir la même taille.',
  },
] as const;

export function conceptualExplanation(question: string, language: ConversationLanguage) {
  const q = normalizedQuestion(question).replace(/[.!?]+$/, "").trim();
  const item = explanations.find(item => item.question.test(q));
  return item ? { id: item.id, reply: item[language] } : undefined;
}

/** Server-only conservative exclusion for this bounded set of fraction facts.
 * Fraction/ratio/percentage/partition tasks can depend on these explanations.
 * Check every possible authored assessment, in both languages, not just a key.
 */
export function independentConceptualExplanations(assessmentTexts: readonly string[]): string[] {
  const related = /\b(fraction\w*|numerat\w*|denominat\w*|denomin\w*|half|halves|quarter\w*|third\w*|demi\w*|moiti\w*|tiers|quart\w*|equal\w*|egal\w*|part\w*|piece\w*|slice\w*|ratio\w*|rapport\w*|proportion\w*|percent\w*|pourcent\w*|decimal\w*|decim\w*|divid\w*|divis\w*|shar\w*|cut|coupe\w*|morceau\w*|repart\w*)\b|\d\s*[\/⁄:%]|\d[.,]\d/;
  if (!assessmentTexts.length || assessmentTexts.some(text => !text.trim() || related.test(normalizedQuestion(text)))) return [];
  return explanations.map(item => item.id);
}
