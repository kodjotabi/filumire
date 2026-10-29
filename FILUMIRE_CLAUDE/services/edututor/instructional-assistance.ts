import type {LearningContent} from '../../packages/content';
import type {ConversationLanguage} from '../../packages/ai/conversation';
import {normalizedQuestion} from '../../packages/ai/conversation-safety';
export type InstructionalAction='explain'|'example'|'hint'|'simpler'|'practice';
export type ProtectedHelp=Partial<Record<InstructionalAction,string>>;
// Whole-request recognition,not keyword intent inference. Appending a question,
// proposed answer,translation request or override never enters this safe path.
export function instructionalAction(question:string):InstructionalAction|undefined{
 const q=normalizedQuestion(question).replace(/[.!?]+$/,'').trim();
 const requests:Record<InstructionalAction,RegExp>={
  explain:/^(?:explain(?: this| the concept| the underlying concept| this lesson)?|explique-moi|explique moi|explique le concept|explique la notion|expliquer)$/,
  example:/^(?:show (?:an|me an|a different|an analogous) example|montre (?:un|moi un) exemple|montre un autre exemple|worked example|exemple resolu)$/,
  hint:/^(?:give me a hint|a hint please|donne-moi un indice|donne moi un indice|hint|indice)$/,
  simpler:/^(?:make it simpler|help me understand|explain more simply|explique plus simplement|aide-moi a comprendre|aide moi a comprendre|another approach|une autre approche)$/,
  practice:/^(?:let me practi[sc]e|give me more practice|je veux m'entrainer|je veux m’entrainer|un exercice d'entrainement|essaie|try this)$/,
 };
 return (Object.keys(requests) as InstructionalAction[]).find(k=>requests[k].test(q));
}
type Text={en:string;fr:string};
type Card={match:RegExp;concept:Text;example:Text;hint:Text;simple:Text;practice:Text};
const t=(en:string,fr:string):Text=>({en,fr});
// General teaching methods/analogies,not bank answers or newly registered topics.
// Each candidate response is screened against all protecting assessment keys.
const cards:Card[]=[
 {match:/fraction|numerat|denominat|percent|ratio|partage|moitie/,
  concept:t('A fraction describes selected equal parts of one whole. First decide what counts as the whole; then keep every piece the same size.','Une fraction décrit des parts égales choisies dans un tout. Détermine d’abord le tout, puis garde des parts de même taille.'),
  example:t('Different example: divide a paper strip into five equal sections and colour two. That is 2/5 of this strip. Changing the size of the whole changes the amount represented.','Autre exemple : partage une bande en cinq sections égales et colorie deux sections : 2/5 de cette bande. La quantité dépend aussi de la taille du tout.'),
  hint:t('Draw one whole before adding labels. Check that its pieces really are equal; then separate what you know from what you must find.','Dessine un tout avant les étiquettes. Vérifie l’égalité des parts, puis distingue données et quantité cherchée.'),
  simple:t('Think of one object shared fairly. Every piece has the same size; some pieces are selected. Show those parts in a drawing first.','Imagine un objet partagé équitablement. Les morceaux ont même taille ; certains sont choisis. Représente-les d’abord.'),
  practice:t('Separate practice, not scored: draw a new strip with seven equal parts and shade three. Write a fraction and explain what each number represents.','Entraînement séparé, non noté : dessine une autre bande en sept parts égales, colorie trois parts. Écris une fraction et explique chaque nombre.')},
 {match:/pattern|sequence|suite|relation/,
  concept:t('A number pattern follows a consistent relationship. Compare successive changes and check the same rule more than once.','Une suite suit une relation cohérente. Compare les variations successives et vérifie plusieurs fois la même règle.'),
  example:t('Different example: 5, 8, 11, 14. Each move adds three. Checking every neighbouring pair is stronger evidence than guessing from the last value.','Autre exemple : 5, 8, 11, 14. On ajoute trois à chaque étape. Vérifier chaque paire vaut mieux que deviner depuis le dernier terme.'),
  hint:t('Write the change between neighbouring entries. Test your proposed rule on an earlier pair before using it again.','Note l’écart entre voisins. Teste ta règle sur une paire antérieure avant de l’appliquer.'),
  simple:t('Look for the same move happening again. Say the move in words, then check it against the values already given.','Cherche le même changement répété. Dis-le en mots, puis vérifie avec les valeurs données.'),
  practice:t('Separate practice, not scored: make your own four-number increasing pattern. Hide its last term and explain the rule to a partner.','Entraînement séparé, non noté : crée une suite croissante de quatre termes. Cache le dernier et explique la règle.')},
 {match:/round|place.value|significant|decimal|arrondi|valeur.de.position/,
  concept:t('A digit’s position determines the size of its contribution. Rounding chooses a nearby value at a stated precision; it does not change every digit independently.','La position d’un chiffre détermine sa valeur. Arrondir choisit une valeur proche à une précision donnée ; on ne change pas chaque chiffre indépendamment.'),
  example:t('Different example: 3,670 lies between 3,600 and 3,700. It is nearer 3,700. A number line makes the comparison visible.','Autre exemple : 3 670 est entre 3 600 et 3 700, plus proche de 3 700. Une droite graduée rend cette comparaison visible.'),
  hint:t('Identify the requested place and bracket the number between two neighbouring values at that place. Compare the distances.','Repère le rang demandé et les deux valeurs voisines correspondantes. Compare les distances.'),
  simple:t('Each place is ten times the place to its right. Name the place you need before estimating or changing digits.','Chaque rang vaut dix fois celui à sa droite. Nomme le rang utile avant estimation ou modification.'),
  practice:t('Separate practice, not scored: choose your own four-digit quantity. Show it in expanded form and locate it between two consecutive hundreds.','Entraînement séparé, non noté : choisis un nombre de quatre chiffres, décompose-le et encadre-le par deux centaines consécutives.')},
 {match:/math|algebra|geometry|number|calcul/,
  concept:t('A mathematical model connects quantities and a question. State the known quantities, choose a representation, and check whether the result fits the situation.','Un modèle mathématique relie quantités et question. Identifie les données, choisis une représentation et vérifie la cohérence du résultat.'),
  example:t('Different example: three identical packs cost GH₵18 altogether. A bar split into three equal parts models finding the cost of one pack.','Autre exemple : trois paquets identiques coûtent 18 GH₵. Une barre divisée en trois parts égales représente la recherche du prix d’un paquet.'),
  hint:t('Draw or label the quantities first. Check units and ask whether your chosen operation matches the relationship, not just a keyword.','Dessine ou légende les quantités. Vérifie unités et relation plutôt que de choisir une opération sur un seul mot.'),
  simple:t('Show what is known in a picture. Work on one relationship at a time, and check your method with an easier case.','Représente ce qui est connu. Traite une relation à la fois et vérifie la méthode sur un cas plus simple.'),
  practice:t('Separate practice, not scored: create a new equal-groups story with your own numbers. Draw it and explain which operation would solve it.','Entraînement séparé, non noté : invente une situation de groupes égaux avec tes nombres. Dessine-la et explique l’opération adaptée.')},
 {match:/cell|organelle|atom|particle|compound|periodic|structure/,
  concept:t('A structure is understood by linking its parts to what the whole system does. A model shows selected relationships and always leaves out some detail.','On comprend une structure en reliant ses parties au fonctionnement du système. Un modèle montre certaines relations et omet des détails.'),
  example:t('Different analogy: a library has stations for borrowing, storing and checking records. Each has a role; the stations cooperate. This is a systems analogy, not a claim that a cell or atom is literally a library.','Autre analogie : une bibliothèque a postes de prêt, stockage et suivi. Chaque rôle contribue au système. Analogie de fonctionnement, non bibliothèque littérale dans cellule ou atome.'),
  hint:t('Link each visible feature to a function. Distinguish what the diagram actually shows from what you infer about how it works.','Relie chaque caractéristique à une fonction. Distingue ce que montre le schéma de ce que tu en déduis.'),
  simple:t('Ask what the parts are, how they relate, and what evidence supports the model. A diagram is a representation, not the actual object.','Demande quelles sont les parties, leurs relations et les preuves du modèle. Un schéma représente l’objet, sans être l’objet.'),
  practice:t('Separate practice, not scored: draw a familiar system such as a library. Label three parts and explain how removing one would affect the whole.','Entraînement séparé, non noté : dessine un système familier, trois parties et l’effet du retrait d’une partie.')},
 {match:/cycle|life|planet|motion|ecosystem|farm|animal|digestion|food/,
  concept:t('Processes can be represented with linked stages. Label what each arrow means; then distinguish a repeating cycle from a single sequence or a network.','Représente un processus par étapes reliées. Précise le sens des flèches, puis distingue cycle, séquence et réseau.'),
  example:t('Different analogy: a library book is borrowed, used, returned and lent again. The stages repeat, though different people may take part each time.','Autre analogie : un livre est emprunté, utilisé, rendu, puis prêté à nouveau. Les étapes se répètent même si les personnes changent.'),
  hint:t('Start with one observed stage and follow the next connection. Ask what moves or changes at each step and what remains unmeasured.','Pars d’une étape observée, suis la connexion, puis demande ce qui change et ce qui n’a pas été mesuré.'),
  simple:t('Say what happens first, next, and whether the process returns to an earlier stage. Use arrows with meanings, not decoration.','Dis première étape, suivante et éventuel retour. Les flèches doivent avoir un sens, pas seulement décorer.'),
  practice:t('Separate practice, not scored: draw the borrow–return cycle of a different shared object. Explain one condition needed for it to keep working.','Entraînement séparé, non noté : dessine le cycle emprunt–retour d’un autre objet partagé et une condition de son fonctionnement.')},
 {match:/energy|electric|heat|light|transfer/,
  concept:t('Follow inputs, outputs and changes in storage. A useful output is only part of the accounting; transfers to the surroundings still matter.','Suis entrées, sorties et variations des réserves. La sortie utile ne constitue qu’une partie du bilan ; les transferts vers l’environnement comptent.'),
  example:t('Different analogy: when water moves from a jug into cups, some may spill into a tray. Counting only the cups misses part of the transferred amount. This is an accounting analogy, not a physical model of electricity.','Autre analogie : de l’eau passe d’une carafe aux tasses, avec une partie dans un plateau. Compter seulement les tasses oublie une part transférée. Analogie de bilan, non modèle physique d’électricité.'),
  hint:t('Label the starting store, the useful change and other outputs. Check that your explanation accounts for the whole process.','Légende réserve initiale, changement utile et autres sorties. Vérifie que l’explication couvre tout le processus.'),
  simple:t('Track where something starts, where it goes, and what changes. Do not confuse a useful effect with the total input.','Suis départ, destination et changements. Ne confonds pas effet utile et entrée totale.'),
  practice:t('Separate practice, not scored: draw an input/output account for pouring from a jug, including possible spillage. Explain the limit of this analogy.','Entraînement séparé, non noté : bilan d’une carafe vers tasses avec pertes possibles. Explique une limite de l’analogie.')},
 {match:/science|material|liquid|solid|gas|nutrient|classif/,
  concept:t('Classification groups objects by stated properties. Observe a property, apply the same rule to every object, and distinguish observation from a guess about identity.','Classer regroupe selon propriétés explicites. Observe, applique la même règle à tous et distingue observation/hypothèse d’identité.'),
  example:t('Different example: sort buttons by two holes or four holes, then sort the same set by colour. The groups change because the chosen property changes.','Autre exemple : trie des boutons selon deux ou quatre trous, puis par couleur. Les groupes changent avec le critère.'),
  hint:t('Name the property your evidence actually supports. Check that all objects in a group satisfy the same criterion.','Nomme la propriété réellement étayée. Vérifie le même critère pour chaque objet du groupe.'),
  simple:t('Choose one observable feature and keep the sorting rule consistent. Appearance alone may not identify a substance.','Choisis un caractère observable et garde la règle constante. L’apparence seule ne suffit pas toujours à identifier une substance.'),
  practice:t('Separate practice, not scored: sort familiar stationery by two different observable properties. Explain why each set of groups differs.','Entraînement séparé, non noté : trie des fournitures selon deux propriétés observables et explique les groupes différents.')},
 {match:/comput|device|program|storage|network/,
  concept:t('A tool should be chosen for a defined task. Describe what enters, what is done, and what result is needed; compare capabilities rather than appearance.','Choisis un outil selon une tâche définie. Décris ce qui entre, le traitement et le résultat nécessaire ; compare fonctions, non apparences.'),
  example:t('Different analogy: a paper library form records a request, a clerk checks it, and a receipt communicates the outcome. These roles are distinct even when one person performs them all.','Autre analogie : fiche de demande, vérification par agent, reçu du résultat. Rôles distincts même réalisés par une personne.'),
  hint:t('Start from the user’s task. Compare two tools using a relevant capability and one limitation; avoid choosing only by brand or size.','Pars du besoin. Compare deux outils selon fonction utile et limite, non marque ou taille seules.'),
  simple:t('Ask what the person needs to do. Then ask which tool’s features make that possible and what it cannot do.','Demande le besoin, puis les fonctions qui y répondent et les limites de l’outil.'),
  practice:t('Separate practice, not scored: compare a paper notebook and a spreadsheet for recording a fictional club budget. Give a reason and a limitation for each.','Entraînement séparé, non noté : compare cahier et tableur pour budget fictif de club, avec raison et limite chacun.')},
 {match:/english|register|language|speaking|writing|grammar|reading/,
  concept:t('Language choices depend on purpose, audience and context. Compare what a sentence does and how its wording affects the listener, not only whether the words are correct.','Les choix de langue dépendent du but, du public et du contexte. Compare le rôle de la phrase et son effet, pas seulement la correction des mots.'),
  example:t('Different English example: to a friend, “Can you help me carry this?”; to an unfamiliar visitor, “Could you help me with this, please?” Compare the wording and relationship, without copying either into your activity.','Autre exemple anglais : ami, “Can you help me carry this?”; visiteur inconnu, “Could you help me with this, please?” Compare mots/relation, sans recopier dans l’activité.'),
  hint:t('Identify the audience and purpose first. Read your sentence aloud and explain why its wording suits that situation.','Identifie d’abord public et objectif. Lis ta phrase à voix haute et justifie les mots dans cette situation.'),
  simple:t('Think who will read or hear the words. Choose a clear message for that person and explain your choice.','Pense à qui lit ou écoute. Choisis un message clair pour cette personne, puis explique ton choix.'),
  practice:t('Separate practice, not scored: write two new English requests about a different everyday task, for two audiences. Explain one wording change.','Entraînement séparé, non noté : écris deux demandes anglaises nouvelles pour une autre tâche/deux publics. Explique un changement de formulation.')},
];
const fallback:Card={match:/.*/,concept:t('A model represents a relationship in a simpler form. State what each part means and where the comparison stops working.','Un modèle simplifie une relation. Précise le sens des parties et les limites de la comparaison.'),example:t('Different analogy: a map shows routes but does not contain the real roads. Its labels and scale let you reason about a journey.','Autre analogie : une carte montre les trajets sans être les routes réelles. Légendes et échelle aident à raisonner.'),hint:t('Restate the goal in your own words. Separate given information from what you need to find; choose one useful representation.','Reformule l’objectif. Sépare données et recherche, puis choisis une représentation utile.'),simple:t('Show the idea in a small picture. Explain one relationship at a time, then check what the picture leaves out.','Représente l’idée par un petit dessin. Explique une relation, puis ce que l’image omet.'),practice:t('Separate practice, not scored: draw a map of a fictional reading corner. Explain two features it shows and one thing it cannot show.','Entraînement séparé, non noté : carte d’un coin lecture fictif, deux éléments représentés et un absent.')};
const neutral:Card={match:/.*/,
 concept:t('Separate observations from conclusions. A representation helps explain relationships; check its assumptions before applying it.','Distingue observations et conclusions. Les représentations expliquent des relations ; vérifie leurs hypothèses avant application.'),
 example:t('Different analogy: a sketch of a reading corner can show positions without showing sounds or temperature. Explain both its usefulness and its limits.','Autre analogie : le croquis du coin lecture montre les positions, mais pas les sons ni la température. Explique son utilité et ses limites.'),
 hint:t('Restate the goal. List the information available and the information needed. Explain why your chosen method connects them.','Reformule le but. Liste les données disponibles et les informations recherchées. Justifie la méthode qui les relie.'),
 simple:t('Use a sketch to show the idea. Describe the relationship in everyday words, then check whether the description fits the situation.','Dessine pour représenter cette idée. Décris la relation avec des mots courants, puis vérifie si cela correspond à la situation.'),
 practice:t('Separate practice, not scored: sketch a fictional reading corner. Explain what the sketch communicates and what information it leaves out.','Entraînement séparé, non noté : dessine le croquis du coin lecture fictif. Explique ce que le dessin communique et les informations omises.')};
function canonical(text:string):string{
 const words:Record<string,string>={zero:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',eleven:'11',twelve:'12',thirteen:'13',fourteen:'14',fifteen:'15',sixteen:'16',seventeen:'17',eighteen:'18',nineteen:'19',twenty:'20',un:'1',une:'1',deux:'2',trois:'3',quatre:'4',cinq:'5',sept:'7',huit:'8',neuf:'9',dix:'10',onze:'11',douze:'12',treize:'13',quatorze:'14',quinze:'15',seize:'16',vingt:'20'};
 return normalizedQuestion(text).replace(/\b[a-z]+\b/g,w=>words[w]??w).replace(/\s*([/⁄])\s*/g,'/');
}
function keysFor(pool:readonly LearningContent[]):string[]{return pool.flatMap(c=>{
 const raw=c.metadata?.expectedResponse;if(!raw||raw==='rubric_evaluated_performance')return [];
 let values:unknown=raw;try{values=JSON.parse(raw);}catch{/* Literal authored answer. */}
 const flat=(v:unknown):string[]=>typeof v==='string'||typeof v==='number'?[canonical(String(v))]:Array.isArray(v)?v.flatMap(flat):v&&typeof v==='object'?Object.values(v).flatMap(flat):[];
 return flat(values).filter(k=>k.length>1||/^\d$/.test(k));
});}
export function buildProtectedHelp(topic:string,pool:readonly LearningContent[],language:ConversationLanguage):ProtectedHelp{
 if(!pool.length||pool.some(c=>!c.metadata?.expectedResponse))return {};
 const keys=keysFor(pool);if(!keys.length)return {};
 const safe=(s:string)=>{const text=canonical(s);return !keys.some(k=>new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^a-z0-9])`).test(text));};
 const q=normalizedQuestion(topic),ranked=[...cards.filter(c=>c.match.test(q)),fallback,neutral];
 const result:ProtectedHelp={};
 for(const action of ['explain','example','hint','simpler','practice'] as const){
  for(const c of ranked){const text=action==='explain'?c.concept[language]+'\n\n'+c.example[language]:action==='example'?c.example[language]:action==='hint'?c.hint[language]:action==='simpler'?c.simple[language]:c.practice[language];if(safe(text)){result[action]=text;break;}}
 }
 return result;
}
