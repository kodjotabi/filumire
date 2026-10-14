import type {ConversationLanguage,ConversationMessage} from './conversation';
import {normalizedQuestion} from './conversation-safety';

/** Bounded bilingual foundational facts. Called only after the server assessment guard. */
export function generalEducationReply(question:string,language:ConversationLanguage,history:readonly ConversationMessage[]):string|undefined {
  let q=normalizedQuestion(question).replace(/[.!?]+$/, '').trim();
  const followup=/^(?:can you |could you |peux-tu |peux tu )?(?:name them|list them|les nommer|les citer|nomme-les|nomme les)\??$/;
  if (followup.test(q)) {
    const previous=history.filter(message=>message.role==='user' && !followup.test(normalizedQuestion(message.text).replace(/[.!?]+$/, '').trim())).at(-1);
    if(previous)q=normalizedQuestion(previous.text).replace(/[.!?]+$/, '').trim();
  }
  if (/^(?:how many days (?:are there )?in (?:the |a )?week|combien de jours (?:y a-t-il |y a t il )?dans une semaine)\??$/.test(q))return language==='fr'
    ? 'Une semaine compte 7 jours : lundi, mardi, mercredi, jeudi, vendredi, samedi et dimanche.'
    : 'There are 7 days in a week: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday and Sunday.';
  if (/^(?:how many months (?:are there )?in (?:a |the )?year|combien de mois (?:y a-t-il |y a t il )?dans une annee)\??$/.test(q))return language==='fr'
    ? 'Une année compte 12 mois : janvier, février, mars, avril, mai, juin, juillet, août, septembre, octobre, novembre et décembre.'
    : 'There are 12 months in a year: January, February, March, April, May, June, July, August, September, October, November and December.';
  const addition=q.match(/^(?:what is|combien font) (\d{1,2}) \+ (\d{1,2})\??$/);
  if(addition){const a=Number(addition[1]),b=Number(addition[2]);return language==='fr'
    ? `${a} + ${b} = ${a+b}. Commence à ${a}, puis compte ${b} de plus.`
    : `${a} + ${b} = ${a+b}. Start at ${a}, then count ${b} more.`;}
  return undefined;
}
