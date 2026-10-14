import type { ConversationLanguage } from "./conversation";

export function normalizedQuestion(text: string): string {
  return text.normalize("NFKD").replace(/[\u0300-\u036f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, "")
    .toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}

export type SafetyReason = "privacy" | "distress" | "unsafe" | "instructions";
/** A bounded tutor never executes prompts, browses URLs, or generates arbitrary content. */
export function conversationSafety(question: string): SafetyReason | undefined {
  const q = normalizedQuestion(question);
  if (/\b(suicid\w*|self[- ]harm|kill myself|hurt myself|want to die|end my life|me tuer|me suicider|me faire du mal|veux mourir|abus\w*|molest\w*|rape[ds]?|viol(?:e|ee|er)|someone.*hurting me|quelqu'un.*me fait du mal)\b/.test(q)) return "distress";
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(q) || /(?:\+\d[\d ()-]{6,}\d|\b\d[\d ()-]{7,}\d\b)/.test(q) ||
      /\b(my (?:full name|address|phone number|password|school is)|i live at|mon (?:nom complet|adresse|numero|mot de passe)|j'habite|je m'appelle|ma (?:maison|famille habite|localisation)|my name is)\b/.test(q)) return "privacy";
  if (/\b(porn\w*|sex(?:ual)?\s+(?:video|image|photo|story)|nudes?|naked|nue?s?|sexe|sexuel\w*|(?:make|build).*\b(?:bomb|weapon)|fabriquer.*(?:bombe|arme)|kill (?:someone|a person)|tuer quelqu'un|buy.*drug|acheter.*drogue|bully|harass|hate.*(?:race|religion)|harceler)\b/.test(q)) return "unsafe";
  if (/\b(ignore.*(?:rules|instructions)|system prompt|hidden (?:rubric|answer|key)|developer message|reveal.*secret|execute.*code|change.*mastery|ignore.*consignes|instructions systeme|reponse cachee|augmente.*maitrise)\b/.test(q)) return "instructions";
  return undefined;
}

export function safetyReply(reason: SafetyReason, language: ConversationLanguage): string {
  const text = {
    en: {
      privacy: "Please keep your personal details private. Do not send names, addresses, passwords or contact details. Ask again using made-up details or just your lesson topic. I have left that message out of this conversation.",
      distress: "You deserve to feel safe. Please tell a trusted adult, such as a parent, guardian or teacher, now. If you are in immediate danger, ask an adult to contact local emergency help. FILU cannot contact anyone for you. You do not need to share personal details here.",
      unsafe: "I can help with your learning, but I cannot help make unsafe or hurtful content. If something has worried you, tell a trusted adult. We can return to your lesson when you are ready.",
      instructions: "I can explain your lesson and help you practise. I cannot reveal private information, change your marks or follow instructions that bypass learning rules. What part of your lesson would you like help with?",
    },
    fr: {
      privacy: "Garde tes informations personnelles privées. N'envoie pas de noms, d'adresses, de mots de passe ni de coordonnées. Pose ta question avec des détails inventés ou seulement le sujet de ta leçon. Ce message n'a pas été gardé dans cette conversation.",
      distress: "Tu mérites d'être en sécurité. Parle maintenant à un adulte de confiance, comme un parent, un responsable ou un enseignant. Si tu es en danger immédiat, demande à un adulte de contacter les secours locaux. FILU ne peut contacter personne pour toi. Tu n'as pas besoin de partager tes informations personnelles ici.",
      unsafe: "Je peux t'aider à apprendre, mais pas à créer du contenu dangereux ou blessant. Si quelque chose t'inquiète, parle à un adulte de confiance. Nous pouvons revenir à ta leçon quand tu es prêt.",
      instructions: "Je peux expliquer ta leçon et t'aider à t'entraîner. Je ne peux pas révéler des informations privées, changer tes notes ni contourner les règles d'apprentissage. Quelle partie de ta leçon veux-tu comprendre ?",
    },
  };
  return text[language][reason];
}

export function privateQuestionLabel(language: ConversationLanguage): string {
  return language === "fr" ? "[Message laissé de côté pour ta sécurité]" : "[Message left out for your safety]";
}
