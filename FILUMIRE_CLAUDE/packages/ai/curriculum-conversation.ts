import type { ConversationLanguage, ConversationPractice, ConversationProvider, ConversationTurn } from "./conversation";
import { conversationSafety, normalizedQuestion, safetyReply } from "./conversation-safety";
import { generalEducationReply } from "./general-education";
import { conceptualExplanation } from "./conceptual-explanations";

const stopWords = new Set(("a an the this that these those with from have what why how does do did can could you me my your about please explain help understand more again lesson topic want know is are and or of to in it its be as for on by at which when where tell give i am not oui une un le la les des du de et ce cette ces avec dans pour sur comment pourquoi quoi quel quelle moi mon ma mes ton ta je tu il elle est sont explique aide comprendre encore exemple indice peux voudrais que qui same amount chaque meme fois number nombres rule regle next suivant think pense answer reponse practice entrainer question help aide mean means meaning say said word words thing things something important really very veut dire dit mot chose doit doivent dois faut sont pas une" ).split(/\s+/));
// The digit 0 and the word zero are the same idea to a learner.
const terms = (text: string) => normalizedQuestion(text).replace(/(?<![\d,.])\b0\b(?![\d,.])/g, " zero ")
  .match(/[a-z]{3,}/g)?.filter(word => !stopWords.has(word)) ?? [];
// Light stemming by shared prefix: drag/dragging, piece/pieces, click/clicks.
const sameTerm = (a: string, b: string) => a === b || Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a));
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
    lesson: "your lesson",
    notFound: (title: string) => `I could not find that topic in your current lesson “${title}”. I can only explain what this lesson teaches. Try “Explain this lesson”, “Show me an example”, “Give me a hint” or “Let me practise”.`,
    intros: {
      explanation: (title: string) => `From your lesson “${title}”:`,
      worked_example: (title: string) => `Here is a worked example from your lesson “${title}”:`,
      hint: () => "Let's go step by step:",
      remediation: () => "Here is a common mistake to avoid, and why:",
    } as Record<string, (title: string) => string>,
    onlyExample: "Your lesson has only this one worked example. Let's look at it again:",
    supportCloser: "Would you like me to go step by step, or show you an example?",
    allShown: "We have looked at everything in this lesson. Ask me for a practice question, or go back to your lesson and try it yourself.",
    closers: {
      explanation: "Would you like an example, a hint, or a practice question?",
      worked_example: "Would you like me to explain it another way, or try a practice question?",
      hint: "Try the next step yourself. If you are still stuck, ask me for an example.",
      remediation: "Does that make sense? Ask me for an example or a practice question.",
    } as Record<string, string>,
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
    lesson: "ta leçon",
    notFound: (title: string) => `Je n'ai pas trouvé ce sujet dans ta leçon actuelle « ${title} ». Je peux seulement expliquer ce que cette leçon enseigne. Essaie « Explique-moi la leçon », « Montre-moi un exemple », « Donne-moi un indice » ou « Je veux m'entraîner ».`,
    intros: {
      explanation: (title: string) => `Dans ta leçon « ${title} » :`,
      worked_example: (title: string) => `Voici un exemple résolu de ta leçon « ${title} » :`,
      hint: () => "Allons-y étape par étape :",
      remediation: () => "Voici une erreur fréquente à éviter, et pourquoi :",
    } as Record<string, (title: string) => string>,
    onlyExample: "Ta leçon n'a que cet exemple résolu. Regardons-le encore :",
    supportCloser: "Veux-tu que je t'explique étape par étape, ou que je te montre un exemple ?",
    allShown: "Nous avons vu tout le contenu de cette leçon. Demande-moi un exercice, ou retourne à ta leçon pour essayer toi-même.",
    closers: {
      explanation: "Veux-tu un exemple, un indice ou un exercice ?",
      worked_example: "Veux-tu une autre explication, ou essayer un exercice ?",
      hint: "Essaie l'étape suivante toi-même. Si tu bloques encore, demande-moi un exemple.",
      remediation: "Est-ce que c'est plus clair ? Demande-moi un exemple ou un exercice.",
    } as Record<string, string>,
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
    const concept = conceptualExplanation(input.question, language);
    if (concept) return { reply: concept.reply };
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
    // Answers are whole authored teaching blocks (or a self-contained part of
    // one), never a lone sentence whose "it" or "this" points at nothing.
    const title = context.teachingSource?.title ?? t.lesson;
    const order = ["explanation", "worked_example", "hint", "remediation"];
    const blocks = teaching.filter(item => order.includes(item.type)).map(item => ({ ...item, sentences: sentences(item.text) }));
    if (!blocks.length) return { reply: t.missing };
    const previous = history.filter(item => item.role === "assistant" && item.language === language);
    const shownIn = (block: (typeof blocks)[number], messages: readonly { text: string }[]) =>
      block.sentences.some(sentence => messages.some(message => message.text.includes(sentence)));
    const shown = (block: (typeof blocks)[number]) => shownIn(block, previous);
    const lastShown = (block: (typeof blocks)[number]) => shownIn(block, previous.slice(-1));
    const byType = (type: string) => blocks.filter(block => block.type === type);
    const firstUnshown = (types: string[]) => types.flatMap(byType).find(block => !shown(block));
    // The closing offer adapts to the learner: a struggling learner is offered
    // step-by-step help first, a confident one is asked to explain it back.
    const closer = (type: string) => type === "explanation" && needsSupport ? t.supportCloser
      : type === "explanation" && context.mastery >= .8 ? t.ready : t.closers[type] ?? t.closers.explanation;
    const reply = (block: (typeof blocks)[number], text = block.text, intro = t.intros[block.type]?.(title) ?? "") =>
      ({ reply: bounded([intro, text, closer(block.type)]) });
    // A self-contained window around the best sentence of a long block.
    const excerpt = (block: (typeof blocks)[number], focus: number) => {
      if (block.text.length <= 520) return block.text;
      let start = Math.max(0, focus - 1);
      while (start > 0 && /^(?:it|this|that|they|these|those|so|but|then|also|now|here|il|elle|ils|elles|cela|ce|ces|donc|mais|puis|ici)\b/i.test(block.sentences[start])) start--;
      if (start <= 2) start = 0;
      let end = Math.min(block.sentences.length, focus + 2);
      while (end < block.sentences.length && block.sentences.slice(start, end).join(" ").length < 280) end++;
      return block.sentences.slice(start, end).join(" ");
    };

    if (intent === "example" || intent === "next" && /\b(example|exemple)\b/.test(q)) {
      const examples = byType("worked_example");
      const fresh = examples.find(block => !shown(block));
      if (fresh) return reply(fresh);
      if (examples.length) return reply(examples[0], examples[0].text, t.onlyExample);
      return reply(byType("explanation")[0] ?? blocks[0], undefined, t.noExample);
    }
    if (intent === "hint") {
      const hint = byType("hint").find(block => !lastShown(block)) ?? byType("hint")[0];
      if (hint) return reply(hint);
    }
    if (intent === "simpler") {
      const simpler = ["hint", "worked_example", "remediation", "explanation"].flatMap(byType).find(block => !lastShown(block));
      if (simpler) return reply(simpler);
    }
    if (intent === "summary") {
      const explanation = byType("explanation")[0] ?? blocks[0];
      return reply(explanation, excerpt(explanation, 0), t.summary);
    }

    const requested = terms(q);
    if (!requested.length) {
      // "Explain this", "why?", "what does it mean?": with history, a follow-up
      // moves on to teaching not yet shown; "why" is answered by the
      // common-mistakes block, which explains the reasons.
      if (!previous.length) return reply(byType("explanation")[0] ?? blocks[0]);
      if (intent === "next") return firstUnshown(order) ? reply(firstUnshown(order)!) : { reply: t.allShown };
      const preferred = /\b(why|pourquoi)\b/.test(q) ? ["remediation", "hint", "worked_example", "explanation"] : ["hint", "worked_example", "remediation", "explanation"];
      const followUp = preferred.flatMap(byType).find(block => !lastShown(block)) ?? blocks[0];
      return reply(followUp);
    }
    const ranked = blocks.map(block => {
      const scores = block.sentences.map(sentence => { const words = terms(sentence); return requested.filter(word => words.some(other => sameTerm(word, other))).length; });
      const best = Math.max(...scores);
      return { block, best, focus: scores.indexOf(best), total: requested.filter(word => terms(block.text).some(other => sameTerm(word, other))).length };
    }).filter(item => item.total > 0);
    if (!ranked.length) return { reply: t.notFound(title) };
    const prefer = /\b(why|pourquoi)\b/.test(q) ? ["remediation", "explanation"] : ["explanation", "remediation", "worked_example", "hint"];
    ranked.sort((a, b) => b.total - a.total || b.best - a.best || prefer.indexOf(a.block.type) - prefer.indexOf(b.block.type)
      || Number(shown(a.block)) - Number(shown(b.block)));
    const top = intent === "next" ? ranked.find(item => !shown(item.block)) ?? ranked[0] : ranked[0];
    return reply(top.block, excerpt(top.block, top.focus));
  }
}
