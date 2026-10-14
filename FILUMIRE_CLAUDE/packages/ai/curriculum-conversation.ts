import type { ConversationLanguage, ConversationPractice, ConversationProvider, ConversationTurn } from "./conversation";
import { conversationSafety, normalizedQuestion, safetyReply } from "./conversation-safety";
import { generalEducationReply } from "./general-education";

const stopWords = new Set(("a an the this that these those with from have what why how does do can you me my your about please explain help understand more again lesson topic want know is are and or of to in it be as for on by at which when where tell give i am not oui une un le la les des du de et ce cette ces avec dans pour sur comment pourquoi quoi quel quelle moi mon ma mes ton ta je tu il elle est sont explique aide comprendre encore exemple indice peux voudrais que qui same amount chaque meme fois number nombres rule regle next suivant think pense answer reponse practice entrainer question help aide" ).split(/\s+/));
const terms = (text: string) => normalizedQuestion(text).match(/[a-z]{3,}/g)?.filter(word => !stopWords.has(word)) ?? [];
const sentences = (text: string) => text.replace(/\r/g, "").split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
type Intent = "explain" | "hint" | "example" | "simpler" | "next" | "practice" | "summary" | "unknown";
export function conversationIntent(question: string): Intent {
  const q = normalizedQuestion(question);
  if (/\b(practi[sc]e|quiz|test me|exercise|exercice|entrain\w*|essaie|try one|challenge)\b/.test(q)) return "practice";
  if (/\b(hint|clue|indice|piste|petit coup de pouce)\b/.test(q)) return "hint";
  if (/\b(example|exemple|demonstrat\w*)\b/.test(q)) return "example";
  if (/\b(simpl\w*|easier|confus\w*|stuck|don't understand|do not understand|understand|comprend\w*|comprends|difficile|perdu\w*)\b/.test(q)) return "simpler";
  if (/\b(next|continue|more|another|suivant\w*|continu\w*|encore|autre|suite)\b/.test(q)) return "next";
  if (/\b(summary|summari\w*|recap|resume|resumer|retenir)\b/.test(q)) return "summary";
  if (/\b(explain|what|why|how|meaning|define|expliqu\w*|pourquoi|comment|signifi\w*|definition|quel\w*)\b/.test(q)) return "explain";
  return "unknown";
}

const copy = {
  en: {
    missing: "I do not have approved teaching for this topic in English yet. I will not guess. Ask your teacher, or return to the lesson.",
    unrelated: "I can help with the current lesson using its teaching materials. I could not find that topic in this lesson. Try “Explain this”, “Give me a hint”, “Show an example” or “Let me practise”.",
    intro: "Let's look at your lesson together.", follow: "Let's continue with your lesson.", small: "Let's take one small step.",
    hint: "Here is a clue from your lesson:", example: "Here is an example from your lesson:", noExample: "This lesson has no separate worked example yet. Let's look at its explanation:",
    summary: "The main ideas in your lesson:", reflect: "How would you explain that in your own words?", next: "What is the first thing you would do?", ready: "Try explaining why it works, then ask me for practice.",
    practice: "Practice only — this does not change your marks or progress.", fill: "Complete the missing word from your lesson:", pattern: "Continue this practice pattern:",
    correct: "You found it!", hintAnswer: "Let's try again. The answer begins with", numberHint: "Find the change between neighbouring numbers, then use the same change once more.",
    reveal: "Let's review it together:", retry: "Have another try, or ask for an explanation.", unavailable: "I cannot make a useful practice question from this teaching yet. Ask for an explanation, or practise in your lesson.",
  },
  fr: {
    missing: "Je n'ai pas encore de contenu pédagogique validé en français pour ce sujet. Je ne vais pas deviner. Demande à ton enseignant ou retourne à la leçon.",
    unrelated: "Je peux t'aider sur la leçon actuelle avec son contenu pédagogique. Je n'ai pas trouvé ce sujet dans cette leçon. Essaie « Explique-moi », « Donne-moi un indice », « Montre un exemple » ou « Je veux m'entraîner ».",
    intro: "Regardons ensemble ta leçon.", follow: "Continuons avec ta leçon.", small: "Avançons une petite étape à la fois.",
    hint: "Voici un indice tiré de ta leçon :", example: "Voici un exemple tiré de ta leçon :", noExample: "Cette leçon n'a pas encore d'exemple résolu séparé. Regardons son explication :",
    summary: "Les idées principales de ta leçon :", reflect: "Comment expliquerais-tu cela avec tes propres mots ?", next: "Quelle serait ta première étape ?", ready: "Explique pourquoi cela fonctionne, puis demande un exercice.",
    practice: "Entraînement seulement — cela ne change ni tes notes ni ta progression.", fill: "Complète le mot manquant dans ta leçon :", pattern: "Continue cette suite d'entraînement :",
    correct: "Tu as trouvé !", hintAnswer: "Réessayons. La réponse commence par", numberHint: "Trouve le changement entre deux nombres voisins, puis applique le même changement encore une fois.",
    reveal: "Revoyons cela ensemble :", retry: "Essaie encore, ou demande une explication.", unavailable: "Je ne peux pas encore créer un exercice utile avec ce contenu. Demande une explication ou entraîne-toi dans ta leçon.",
  },
};

function bounded(parts: string[]): string { return parts.filter(Boolean).join("\n\n").slice(0, 1950); }

/** Real, local curriculum retrieval and guided practice. No model or network call. */
export class CurriculumConversationProvider implements ConversationProvider {
  readonly id = "curriculum" as const;
  async respond(input: Parameters<ConversationProvider["respond"]>[0]): Promise<ConversationTurn> {
    input.signal.throwIfAborted();
    const { context, language, history } = input;
    const t = copy[language];
    const safety = conversationSafety(input.question);
    if (safety) return { reply: safetyReply(safety, language) };
    // The loader never falls back to another language. Defend that boundary here too.
    if (context.language && context.language !== language) return { reply: t.missing };
    const general = generalEducationReply(input.question, language, history);
    if (general) return { reply: general };
    const teaching = context.teaching.filter(item => item.text.trim() && !conversationSafety(item.text));
    if (!teaching.length) return { reply: t.missing };
    const q = normalizedQuestion(input.question);
    const intent = conversationIntent(q);
    const practice = input.practice?.language === language ? input.practice : undefined;
    const answer = q.replace(/^(?:the answer is|it is|i think|c'est|je pense que|la reponse est)\s+/, "").replace(/[.!?]+$/, "");
    if (practice && (intent === "unknown" || answer === normalizedQuestion(practice.answer))) {
      if (answer === normalizedQuestion(practice.answer)) return { reply: bounded([t.correct, practice.explanation, t.practice, t.reflect]) };
      if (practice.attempts >= 2) return { reply: bounded([t.reveal, practice.explanation, t.practice, t.reflect]) };
      return { reply: bounded([/^\d+$/.test(practice.answer) ? t.numberHint : `${t.hintAnswer} « ${practice.answer.slice(0, 1)} » (${practice.answer.length}).`, t.retry]), practice: { ...practice, attempts: practice.attempts + 1 } };
    }
    if (practice && intent === "hint") return { reply: /^\d+$/.test(practice.answer) ? t.numberHint : `${t.hintAnswer} « ${practice.answer.slice(0, 1)} » (${practice.answer.length}).`, practice };
    const needsSupport = context.mastery < .55 || context.confidence < .5 || context.difficulties.length > 0 || context.recommendation === "remediate";
    const turns = history.filter(m => m.role === "assistant").length;
    if (intent === "practice") {
      let exercise: ConversationPractice | undefined;
      if (/pattern|suite|number-pattern/.test(context.competencyId)) {
        const first = 2 + (turns % 9) * 7;
        const change = needsSupport ? 2 : 4;
        const values = [first, first + change, first + 2 * change];
        const answer = String(first + 3 * change);
        exercise = { language, prompt: `${t.pattern} ${values.join(", ")}, __`, answer,
          explanation: language === "fr" ? `On ajoute ${change} à chaque étape. ${values[2]} + ${change} = ${answer}.` : `Add ${change} at each step. ${values[2]} + ${change} = ${answer}.`, attempts: 0 };
      } else {
        const options = teaching.filter(item => item.type === "explanation" || item.type === "remediation").flatMap(item => sentences(item.text)).filter(s => s.length >= 35 && s.length <= 240);
        const sentence = options[turns % Math.max(1, options.length)];
        const words = sentence?.match(/[\p{L}]{5,}/gu)?.filter(word => !stopWords.has(normalizedQuestion(word)) && !/^[A-ZÀ-Ö]/.test(word));
        const answer = words?.sort((a,b) => b.length-a.length)[0];
        if (sentence && answer) exercise = { language, prompt: `${t.fill}\n${sentence.replace(answer, "____")}`, answer, explanation: sentence, attempts: 0 };
      }
      return exercise ? { reply: bounded([t.practice, exercise.prompt, t.next]), practice: exercise } : { reply: t.unavailable };
    }
    const requested = terms(q);
    const generic = /^(?:explain (?:this|this step|the lesson)|why|how|what does (?:this|it) mean|explique(?:-moi)?(?: cette etape| ceci| la lecon)?|pourquoi|comment)\??$/.test(q);
    const scored = teaching.flatMap(item => sentences(item.text).map(text => ({ text, type: item.type,
      score: requested.filter(word => terms(text).includes(word)).length,
    })));
    const matches = scored.filter(item => item.score > 0).sort((a,b) => b.score-a.score);
    if ((intent === "unknown" || intent === "explain" && !generic && requested.length > 0) && !matches.length) return { reply: t.unrelated };
    let chosen = intent === "example" ? scored.filter(item => item.type === "worked_example")
      : intent === "hint" || intent === "simpler" ? scored.filter(item => ["hint", "remediation"].includes(item.type)) : matches.length ? matches : scored.filter(item => item.type === "explanation");
    const hasExample = chosen.length > 0;
    if (!chosen.length) chosen = scored;
    const previous = history.filter(item => item.role === "assistant" && item.language === language);
    const last = previous.at(-1)?.text ?? "";
    const fresh = intent === "next" ? chosen.filter(item => !previous.some(message => message.text.includes(item.text)))
      : intent === "simpler" ? chosen.filter(item => !last.includes(item.text)) : chosen;
    if (fresh.length) chosen = fresh;
    const count = intent === "summary" ? 3 : intent === "example" ? 4 : needsSupport || intent === "hint" || intent === "simpler" ? 1 : 2;
    const text = chosen.slice(0,count).map(item => item.text).join(" ");
    const intro = intent === "hint" ? t.hint : intent === "example" ? hasExample ? t.example : t.noExample : intent === "summary" ? t.summary : needsSupport ? t.small : turns ? t.follow : t.intro;
    return { reply: bounded([intro, text, needsSupport ? t.next : context.mastery >= .8 ? t.ready : t.reflect]) };
  }
}
