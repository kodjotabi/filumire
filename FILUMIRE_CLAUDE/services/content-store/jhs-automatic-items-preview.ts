import type { JhsAutoItem, JhsAutomaticTopic, JhsWrongOption } from './jhs-automatic-assessment';

/*
 * Automatic questions for the 11 representative Basic 7-9 topics
 * (English, Mathematics, Computing, Basic 8-9 Science). The first option
 * of each question is correct; options are shuffled per learner when
 * shown. Each wrong option names the misconception it reveals.
 * English Language options stay in English in both languages: the
 * target language is English, French only supports the question.
 */
const M = 'misconception' as const, C = 'conceptual_misunderstanding' as const, P = 'procedural_error' as const;
const q = (en: string, fr: string, right: readonly [string, string], ...wrong: JhsWrongOption[]): JhsAutoItem => ({ q: { en, fr }, right, wrong });
/* English Language: the same English option text in both languages. */
const e = (en: string, fr: string, right: string, ...wrong: (readonly [string, string, typeof M | typeof C | typeof P])[]): JhsAutoItem =>
  ({ q: { en, fr }, right: [right, right], wrong: wrong.map(([text, id, state]) => [text, text, id, state] as const) });

const REGISTER_FORMAL = 'uses-informal-register-in-formal-setting';
const REGISTER_RUDE = 'treats-informal-register-as-always-wrong';
const REGISTER_FACTORS = 'ignores-audience-and-purpose';
const REGISTER_CLARITY = 'confuses-formality-with-unclear-wording';

function register(grade: 7 | 8 | 9): JhsAutomaticTopic {
  const setting = grade === 7 ? ['the school office', 'le secrétariat de l’école'] : grade === 8 ? ['a district education officer', 'un responsable de l’éducation du district'] : ['the headteacher', 'la direction'];
  return {
    scope: 'understanding_only',
    practice: e('Ama greets her best friend at break time. Which greeting suits this informal situation?', 'Ama salue sa meilleure amie à la récréation. Quelle salutation convient à cette situation informelle ?',
      'Hi Efua, how was your morning?', ['Good morning, Madam. I wish to make a formal enquiry.', REGISTER_RUDE, C], ['Give me your book now.', REGISTER_FACTORS, M]),
    diagnostic: [
      e(`You need help from ${setting[0]}. Which request suits this formal setting?`, `Tu as besoin de l’aide de ${setting[1]}. Quelle demande convient à ce cadre formel ?`,
        'Good morning. Could you help me with the timetable, please?', ['Hey, sort out my timetable.', REGISTER_FORMAL, M], ['Timetable. Now.', REGISTER_CLARITY, C], ['Yo, what’s up with the timetable?', REGISTER_FORMAL, M]),
      e('Which three things help you choose the right register?', 'Quels trois éléments t’aident à choisir le bon registre ?',
        'Who you are speaking to, why, and where', ['How long your sentences are', REGISTER_FACTORS, C], ['How loudly you speak', REGISTER_FACTORS, C], ['Whether you use big words', REGISTER_CLARITY, M]),
    ],
    reassessment: [
      e('Kojo is chatting with his cousin about a football match. Which line suits the register of this conversation?', 'Kojo discute d’un match de football avec son cousin. Quelle phrase convient au registre de cette conversation ?',
        'That goal in the second half was amazing!', ['I wish to formally commend the second-half goal.', REGISTER_RUDE, C], ['Kindly confirm the score in writing.', REGISTER_RUDE, C]),
      e('Which statement about informal register is correct?', 'Quelle affirmation sur le registre informel est correcte ?',
        'Informal register is right among friends but not for an official request', ['Informal register is always wrong', REGISTER_RUDE, M], ['Informal register is right everywhere', REGISTER_FORMAL, M], ['Register only matters in writing', REGISTER_FACTORS, C]),
    ],
    retention: [
      e('A learner writes to the headteacher: “Hi, gimme a day off.” What is the problem?', 'Un élève écrit à la direction : « Hi, gimme a day off. » Quel est le problème ?',
        'The register is too informal for the audience', ['The message is too long', REGISTER_FACTORS, C], ['There is no problem', REGISTER_FORMAL, M]),
      e('Which reply to a visiting official is polite and clear?', 'Quelle réponse à un responsable en visite est polie et claire ?',
        'Welcome to our school. May I show you to the classroom?', ['Welcome, you can go anywhere, whatever.', REGISTER_FORMAL, M], ['Classroom is there.', REGISTER_CLARITY, C]),
    ],
    transfer: [
      e('At a market, you ask an older stall keeper for the price of yam. Which question suits the situation?', 'Au marché, tu demandes le prix de l’igname à une vendeuse âgée. Quelle question convient ?',
        'Good afternoon, Auntie. How much is this yam, please?', ['Oi, yam price?', REGISTER_FORMAL, M], ['I hereby request the official price list.', REGISTER_RUDE, C]),
      e('You phone a radio station to give your name for a quiz. Which opening suits this public setting?', 'Tu appelles une station de radio pour t’inscrire à un quiz. Quelle formule convient à ce cadre public ?',
        'Good evening. My name is Esi and I would like to join the quiz.', ['Hey, it’s me, put me on.', REGISTER_FORMAL, M], ['Quiz. Esi. Go.', REGISTER_CLARITY, C]),
    ],
  };
}

const OUT_TOUCH = 'confuses-tactile-output-with-flat-print';
const OUT_HEAT = 'confuses-printing-technologies';
const OUT_INPUT = 'confuses-input-with-output-device';
const PERC_SENSOR = 'treats-sensor-as-understanding-intention';
const PERC_PERFECT = 'assumes-recognition-never-fails';
const PERC_PRIVACY = 'ignores-consent-for-personal-data';
const ATOM_Z = 'confuses-atomic-number-with-mass-number';
const ATOM_CHARGE = 'misassigns-sub-atomic-charges';
const ATOM_NEUTRON = 'miscounts-neutrons';
const BIN_ATOMS = 'counts-atoms-instead-of-elements';
const BIN_MIX = 'confuses-compound-with-mixture';
const BIN_IONIC = 'treats-ionic-lattice-as-molecules';
const PV_FACE = 'uses-face-value-instead-of-place-value';
const PV_GROUP = 'misgroups-digits';
const PV_ZERO = 'drops-zero-placeholders';
const SF_DP = 'confuses-significant-figures-with-decimal-places';
const SF_MAG = 'drops-place-holder-zeros';
const SF_ROUND = 'rounds-in-the-wrong-direction';
const GEN_IO = 'confuses-processor-with-input-or-output';
const GEN_ERA = 'confuses-computer-generations';
const GEN_STORE = 'confuses-processor-with-storage';
const RND_DIR = 'confuses-rounding-up-down-and-off';
const RND_PLACE = 'rounds-to-the-wrong-place';
const RND_TRUNC = 'deletes-places-instead-of-zeros';

export const JHS_PREVIEW_AUTOMATIC: Record<string, JhsAutomaticTopic> = {
  'competency-gh-english-b7-nacca2020-p038-r01': register(7),
  'competency-gh-english-b8-nacca2020-p074-r01': register(8),
  'competency-gh-english-b9-nacca2020-p106-r01': register(9),

  'competency-gh-computing-b8-nacca2020-p054-r01': {
    practice: q('Which printer builds a solid object layer by layer?', 'Quelle imprimante construit un objet solide couche par couche ?',
      ['A 3D printer', 'Une imprimante 3D'], ['An inkjet printer', 'Une imprimante à jet d’encre', OUT_HEAT, C], ['A thermal printer', 'Une imprimante thermique', OUT_HEAT, C]),
    diagnostic: [
      q('A Braille reader needs a page they can read by touch. Which output device should the school use?', 'Une personne qui lit le braille a besoin d’une page lisible au toucher. Quel périphérique l’école doit-elle utiliser ?',
        ['A Braille embosser', 'Une embosseuse braille'], ['An inkjet printout of dot pictures', 'Une impression jet d’encre d’images de points', OUT_TOUCH, M], ['A keyboard', 'Un clavier', OUT_INPUT, C]),
      q('Which printer uses heat on special paper, as on many shop receipts?', 'Quelle imprimante utilise la chaleur sur un papier spécial, comme pour beaucoup de tickets de caisse ?',
        ['A thermal printer', 'Une imprimante thermique'], ['A 3D printer', 'Une imprimante 3D', OUT_HEAT, C], ['A Braille embosser', 'Une embosseuse braille', OUT_HEAT, C]),
    ],
    reassessment: [
      q('Which printer strikes a ribbon against the paper to make marks?', 'Quelle imprimante frappe un ruban contre le papier pour faire des marques ?',
        ['An impact printer', 'Une imprimante à impact'], ['An inkjet printer', 'Une imprimante à jet d’encre', OUT_HEAT, C], ['A scanner', 'Un scanner', OUT_INPUT, C]),
      q('Why is a flat ink picture of Braille dots not real Braille?', 'Pourquoi une image plate de points braille n’est-elle pas du vrai braille ?',
        ['The dots are not raised, so they cannot be felt', 'Les points ne sont pas en relief, on ne peut pas les sentir'], ['Braille must always be printed in colour', 'Le braille doit toujours être imprimé en couleur', OUT_TOUCH, M], ['Only a keyboard can make Braille', 'Seul un clavier peut produire du braille', OUT_INPUT, C]),
    ],
    retention: [
      q('Which device sprays tiny droplets of ink onto paper?', 'Quel appareil projette de petites gouttes d’encre sur le papier ?',
        ['An inkjet printer', 'Une imprimante à jet d’encre'], ['A thermal printer', 'Une imprimante thermique', OUT_HEAT, C], ['A microphone', 'Un microphone', OUT_INPUT, C]),
      q('Which of these is an output device?', 'Lequel de ces appareils est un périphérique de sortie ?',
        ['A wax (solid-ink) printer', 'Une imprimante à cire (encre solide)'], ['A mouse', 'Une souris', OUT_INPUT, C], ['A webcam', 'Une webcam', OUT_INPUT, C]),
    ],
    transfer: [
      q('A clinic wants to print a plastic model of a bone for teaching. Which device fits best?', 'Un centre de santé veut imprimer un modèle d’os en plastique pour l’enseignement. Quel appareil convient le mieux ?',
        ['A 3D printer', 'Une imprimante 3D'], ['A thermal receipt printer', 'Une imprimante thermique à tickets', OUT_HEAT, C], ['A Braille embosser', 'Une embosseuse braille', OUT_TOUCH, M]),
      q('A market stall needs quick, small receipts without ink cartridges. Which printer suits it?', 'Un stand de marché a besoin de petits tickets rapides sans cartouche d’encre. Quelle imprimante convient ?',
        ['A thermal printer', 'Une imprimante thermique'], ['A 3D printer', 'Une imprimante 3D', OUT_HEAT, C], ['A keyboard', 'Un clavier', OUT_INPUT, C]),
    ],
  },

  'competency-gh-computing-b9-nacca2020-p070-r02': {
    practice: q('In a voice-controlled light, what does the microphone do?', 'Dans une lampe commandée à la voix, que fait le microphone ?',
      ['It captures the sound', 'Il capte le son'], ['It decides what the person wants', 'Il décide ce que veut la personne', PERC_SENSOR, M], ['It switches on the light by itself', 'Il allume la lampe tout seul', PERC_SENSOR, M]),
    diagnostic: [
      q('Which part of a perceptual computing system interprets a gesture?', 'Quelle partie d’un système d’informatique perceptuelle interprète un geste ?',
        ['Recognition software', 'Le logiciel de reconnaissance'], ['The camera on its own', 'La caméra toute seule', PERC_SENSOR, M], ['The screen', 'L’écran', PERC_SENSOR, C]),
      q('Why might a voice command be misunderstood?', 'Pourquoi une commande vocale peut-elle être mal comprise ?',
        ['Background noise or a different accent can confuse recognition', 'Le bruit ou un accent différent peuvent tromper la reconnaissance'], ['Recognition software never makes mistakes', 'Le logiciel de reconnaissance ne se trompe jamais', PERC_PERFECT, M], ['Microphones understand every language', 'Les microphones comprennent toutes les langues', PERC_SENSOR, M]),
    ],
    reassessment: [
      q('Put the steps in order for a gesture-controlled game.', 'Mets les étapes dans l’ordre pour un jeu commandé par gestes.',
        ['Camera captures, software recognises, game responds', 'La caméra capte, le logiciel reconnaît, le jeu réagit'], ['Game responds, then camera captures', 'Le jeu réagit, puis la caméra capte', PERC_SENSOR, P], ['Software recognises before anything is captured', 'Le logiciel reconnaît avant toute capture', PERC_SENSOR, P]),
      q('What is a good design choice when voice recognition can fail?', 'Quel est un bon choix de conception quand la reconnaissance vocale peut échouer ?',
        ['Show a confirmation and keep a manual control', 'Afficher une confirmation et garder une commande manuelle'], ['Remove all manual buttons', 'Supprimer tous les boutons manuels', PERC_PERFECT, M], ['Record everyone all day', 'Enregistrer tout le monde toute la journée', PERC_PRIVACY, M]),
    ],
    retention: [
      q('What is perceptual computing?', 'Qu’est-ce que l’informatique perceptuelle ?',
        ['Computers using sensed human actions, such as voice or gestures, to interact', 'Des ordinateurs qui utilisent des actions humaines captées, comme la voix ou les gestes, pour interagir'], ['Computers that read people’s minds', 'Des ordinateurs qui lisent dans les pensées', PERC_SENSOR, M], ['Printing with heat', 'Imprimer avec de la chaleur', PERC_SENSOR, C]),
      q('Before a school records learners’ faces for a system, what is needed?', 'Avant qu’une école enregistre le visage des élèves pour un système, que faut-il ?',
        ['Permission and a clear, fair purpose', 'Une autorisation et un but clair et juste'], ['Nothing, faces are public', 'Rien, les visages sont publics', PERC_PRIVACY, M], ['Only a faster camera', 'Seulement une caméra plus rapide', PERC_PRIVACY, C]),
    ],
    transfer: [
      q('A phone unlocks when it recognises its owner’s face. Which part decides whether the face matches?', 'Un téléphone se déverrouille quand il reconnaît le visage de son propriétaire. Quelle partie décide si le visage correspond ?',
        ['The recognition software', 'Le logiciel de reconnaissance'], ['The camera lens alone', 'L’objectif de la caméra seul', PERC_SENSOR, M], ['The phone case', 'La coque du téléphone', PERC_SENSOR, C]),
      q('A voice assistant mishears “call Ama” as “call Amma” in a noisy bus. What does this show?', 'Un assistant vocal comprend « appelle Ama » comme « appelle Amma » dans un bus bruyant. Que montre cela ?',
        ['Recognition can fail because of noise', 'La reconnaissance peut échouer à cause du bruit'], ['The microphone is broken', 'Le microphone est cassé', PERC_SENSOR, C], ['Voice assistants are always correct', 'Les assistants vocaux ont toujours raison', PERC_PERFECT, M]),
    ],
  },

  'competency-gh-science-b8-nacca2020-p091-r01': {
    practice: q('Which particle has a negative charge?', 'Quelle particule a une charge négative ?',
      ['The electron', 'L’électron'], ['The proton', 'Le proton', ATOM_CHARGE, C], ['The neutron', 'Le neutron', ATOM_CHARGE, C]),
    diagnostic: [
      q('An atom has atomic number Z = 8. How many protons does it have?', 'Un atome a un numéro atomique Z = 8. Combien de protons a-t-il ?',
        ['8', '8'], ['16', '16', ATOM_Z, C], ['0', '0', ATOM_CHARGE, C]),
      q('A neutral atom has Z = 11 and mass number A = 23. How many neutrons does it have?', 'Un atome neutre a Z = 11 et un nombre de masse A = 23. Combien de neutrons a-t-il ?',
        ['12', '12'], ['23', '23', ATOM_NEUTRON, P], ['34', '34', ATOM_NEUTRON, P]),
    ],
    reassessment: [
      q('Where are the protons and neutrons found?', 'Où se trouvent les protons et les neutrons ?',
        ['In the nucleus', 'Dans le noyau'], ['Orbiting outside the nucleus', 'Autour du noyau, à l’extérieur', ATOM_CHARGE, C], ['Only in the electrons', 'Seulement dans les électrons', ATOM_CHARGE, C]),
      q('A neutral atom has 17 protons. How many electrons does it have?', 'Un atome neutre a 17 protons. Combien d’électrons a-t-il ?',
        ['17', '17'], ['18', '18', ATOM_NEUTRON, P], ['0', '0', ATOM_CHARGE, C]),
    ],
    retention: [
      q('What is the charge of a neutron?', 'Quelle est la charge d’un neutron ?',
        ['No net charge', 'Aucune charge nette'], ['Positive', 'Positive', ATOM_CHARGE, C], ['Negative', 'Négative', ATOM_CHARGE, C]),
      q('What does the mass number A count?', 'Que compte le nombre de masse A ?',
        ['Protons plus neutrons', 'Les protons plus les neutrons'], ['Protons only', 'Seulement les protons', ATOM_Z, C], ['Electrons only', 'Seulement les électrons', ATOM_Z, C]),
    ],
    transfer: [
      q('An oxygen atom has Z = 8 and A = 16. How many neutrons does it have?', 'Un atome d’oxygène a Z = 8 et A = 16. Combien de neutrons a-t-il ?',
        ['8', '8'], ['16', '16', ATOM_NEUTRON, P], ['24', '24', ATOM_NEUTRON, P]),
      q('Two atoms both have 6 protons but different numbers of neutrons. What is true?', 'Deux atomes ont tous deux 6 protons mais un nombre de neutrons différent. Qu’est-ce qui est vrai ?',
        ['They are atoms of the same element', 'Ce sont des atomes du même élément'], ['They are different elements', 'Ce sont des éléments différents', ATOM_Z, M], ['They have no electrons', 'Ils n’ont pas d’électrons', ATOM_CHARGE, C]),
    ],
  },

  'competency-gh-science-b9-nacca2020-p124-r02': {
    practice: q('How many different elements are in carbon dioxide, CO₂?', 'Combien d’éléments différents y a-t-il dans le dioxyde de carbone, CO₂ ?',
      ['2', '2'], ['3', '3', BIN_ATOMS, M], ['1', '1', BIN_ATOMS, C]),
    diagnostic: [
      q('Which substance is a binary compound?', 'Quelle substance est un composé binaire ?',
        ['Sodium chloride, NaCl', 'Le chlorure de sodium, NaCl'], ['Oxygen gas, O₂', 'Le dioxygène, O₂', BIN_ATOMS, M], ['A mixture of iron filings and sand', 'Un mélange de limaille de fer et de sable', BIN_MIX, C]),
      q('How is sodium chloride held together?', 'Comment le chlorure de sodium est-il maintenu ensemble ?',
        ['As a lattice of oppositely charged ions', 'Sous forme d’un réseau d’ions de charges opposées'], ['As separate NaCl molecules', 'Sous forme de molécules NaCl séparées', BIN_IONIC, M], ['As an unbonded mixture of gases', 'Comme un mélange de gaz non liés', BIN_MIX, C]),
    ],
    reassessment: [
      q('Why is ammonia, NH₃, a binary compound even though it has four atoms?', 'Pourquoi l’ammoniac, NH₃, est-il un composé binaire alors qu’il a quatre atomes ?',
        ['It contains exactly two elements', 'Il contient exactement deux éléments'], ['It has exactly two atoms', 'Il a exactement deux atomes', BIN_ATOMS, M], ['It is a mixture', 'C’est un mélange', BIN_MIX, C]),
      q('In water, H₂O, how are the atoms joined?', 'Dans l’eau, H₂O, comment les atomes sont-ils liés ?',
        ['By sharing electrons in covalent bonds', 'En partageant des électrons par des liaisons covalentes'], ['They are not joined at all', 'Ils ne sont pas liés du tout', BIN_MIX, C], ['As a lattice of ions', 'Sous forme d’un réseau d’ions', BIN_IONIC, C]),
    ],
    retention: [
      q('Which description correctly defines an ion?', 'Qu’est-ce qu’un ion ?',
        ['A charged atom or group of atoms', 'Un atome ou un groupe d’atomes chargé'], ['Any molecule', 'N’importe quelle molécule', BIN_IONIC, C], ['A mixture of two elements', 'Un mélange de deux éléments', BIN_MIX, C]),
      q('Magnesium (Mg²⁺) and oxygen (O²⁻) form a compound. What is its formula?', 'Le magnésium (Mg²⁺) et l’oxygène (O²⁻) forment un composé. Quelle est sa formule ?',
        ['MgO', 'MgO'], ['Mg₂O', 'Mg₂O', BIN_IONIC, P], ['MgO₂', 'MgO₂', BIN_IONIC, P]),
    ],
    transfer: [
      q('Which of these is NOT a binary compound?', 'Lequel de ces corps n’est PAS un composé binaire ?',
        ['Glucose, C₆H₁₂O₆', 'Le glucose, C₆H₁₂O₆'], ['Hydrogen chloride, HCl', 'Le chlorure d’hydrogène, HCl', BIN_ATOMS, M], ['Water, H₂O', 'L’eau, H₂O', BIN_ATOMS, M]),
      q('A learner mixes salt and sand in a cup. Is this a binary compound?', 'Un élève mélange du sel et du sable dans un gobelet. Est-ce un composé binaire ?',
        ['No, it is a mixture, not two chemically combined elements', 'Non, c’est un mélange, pas deux éléments combinés chimiquement'], ['Yes, because there are two substances', 'Oui, car il y a deux substances', BIN_MIX, M], ['Yes, because sand has two atoms', 'Oui, car le sable a deux atomes', BIN_ATOMS, M]),
    ],
  },

  'competency-gh-mathematics-b8-nacca2020-p120-r01': {
    practice: q('In 3,520,000,000, which digit is in the billions place?', 'Dans 3 520 000 000, quel chiffre est à la place des milliards ?',
      ['3', '3'], ['5', '5', PV_GROUP, P], ['2', '2', PV_GROUP, P]),
    diagnostic: [
      q('What is the value of the digit 6 in 4,061,230,000?', 'Quelle est la valeur du chiffre 6 dans 4 061 230 000 ?',
        ['60,000,000', '60 000 000'], ['6', '6', PV_FACE, M], ['6,000,000', '6 000 000', PV_GROUP, P]),
      q('Which numeral is “two billion, five million and forty”?', 'Quel nombre s’écrit « deux milliards cinq millions quarante » ?',
        ['2,005,000,040', '2 005 000 040'], ['2,540', '2 540', PV_ZERO, P], ['2,500,040', '2 500 040', PV_ZERO, P]),
    ],
    reassessment: [
      q('Which is the correct way to read 1,302,000,015?', 'Quelle est la bonne lecture de 1 302 000 015 ?',
        ['One billion, three hundred and two million and fifteen', 'Un milliard trois cent deux millions quinze'], ['One billion, thirty-two million and fifteen', 'Un milliard trente-deux millions quinze', PV_ZERO, P], ['Thirteen million and fifteen', 'Treize millions quinze', PV_GROUP, P]),
      q('What is the value of the 9 in 7,900,000,000?', 'Quelle est la valeur du 9 dans 7 900 000 000 ?',
        ['900,000,000', '900 000 000'], ['9', '9', PV_FACE, M], ['90,000,000', '90 000 000', PV_GROUP, P]),
    ],
    retention: [
      q('How are the digits of a large number grouped to read it?', 'Comment regroupe-t-on les chiffres d’un grand nombre pour le lire ?',
        ['In threes from the right', 'Par trois en partant de la droite'], ['In twos from the left', 'Par deux en partant de la gauche', PV_GROUP, P], ['They are not grouped', 'On ne les regroupe pas', PV_GROUP, C]),
      q('In French, what is 1,000,000,000 called?', 'En français, comment appelle-t-on 1 000 000 000 ?',
        ['Un milliard', 'Un milliard'], ['Un million', 'Un million', PV_GROUP, C], ['Un billion (in the same sense as English billion)', 'Un billion (au sens anglais de billion)', PV_GROUP, M]),
    ],
    transfer: [
      q('A country’s budget is GH₵ 3,045,600,000. What is the value of the 4?', 'Le budget d’un pays est de 3 045 600 000 GH₵. Quelle est la valeur du 4 ?',
        ['40,000,000', '40 000 000'], ['4', '4', PV_FACE, M], ['400,000,000', '400 000 000', PV_GROUP, P]),
      q('A news report says “one billion and seven thousand people”. Which numeral is correct?', 'Un reportage dit « un milliard sept mille personnes ». Quel nombre est correct ?',
        ['1,000,007,000', '1 000 007 000'], ['1,007,000', '1 007 000', PV_ZERO, P], ['1,700,000,000', '1 700 000 000', PV_GROUP, P]),
    ],
  },

  'competency-gh-mathematics-b9-nacca2020-p195-r01': {
    practice: q('Round 4,682 to two significant figures.', 'Arrondis 4 682 à deux chiffres significatifs.',
      ['4,700', '4 700'], ['47', '47', SF_MAG, P], ['4,600', '4 600', SF_ROUND, P]),
    diagnostic: [
      q('Round 527,819 to three significant figures.', 'Arrondis 527 819 à trois chiffres significatifs.',
        ['528,000', '528 000'], ['527,000', '527 000', SF_ROUND, P], ['528', '528', SF_MAG, P]),
      q('Round 12.3456 to two decimal places.', 'Arrondis 12,3456 à deux décimales.',
        ['12.35', '12,35'], ['12', '12', SF_DP, C], ['12.34', '12,34', SF_ROUND, P]),
    ],
    reassessment: [
      q('Round 63,048,215 to two significant figures.', 'Arrondis 63 048 215 à deux chiffres significatifs.',
        ['63,000,000', '63 000 000'], ['63', '63', SF_MAG, P], ['64,000,000', '64 000 000', SF_ROUND, P]),
      q('Round 7.996 to two decimal places.', 'Arrondis 7,996 à deux décimales.',
        ['8.00', '8,00'], ['7.99', '7,99', SF_ROUND, P], ['8', '8', SF_DP, C]),
    ],
    retention: [
      q('Where do you start counting significant figures?', 'Où commence-t-on à compter les chiffres significatifs ?',
        ['At the first non-zero digit', 'Au premier chiffre non nul'], ['At the decimal point', 'À la virgule', SF_DP, C], ['At the last digit', 'Au dernier chiffre', SF_DP, C]),
      q('Why do we write zeros after rounding 857,386,321 to 857,000,000?', 'Pourquoi écrit-on des zéros après avoir arrondi 857 386 321 à 857 000 000 ?',
        ['To keep the size of the number', 'Pour garder la grandeur du nombre'], ['Zeros are not needed', 'Les zéros ne sont pas nécessaires', SF_MAG, M], ['To show decimal places', 'Pour montrer les décimales', SF_DP, C]),
    ],
    transfer: [
      q('A town has 248,563 people. A report gives the number to two significant figures. What does it say?', 'Une ville compte 248 563 habitants. Un rapport donne ce nombre à deux chiffres significatifs. Que dit-il ?',
        ['250,000', '250 000'], ['25', '25', SF_MAG, P], ['240,000', '240 000', SF_ROUND, P]),
      q('A length is 3.14159 m. Give it to three decimal places.', 'Une longueur mesure 3,14159 m. Donne-la à trois décimales.',
        ['3.142 m', '3,142 m'], ['3.14 m', '3,14 m', SF_DP, C], ['3.141 m', '3,141 m', SF_ROUND, P]),
    ],
  },

  'competency-gh-computing-b7-nacca2020-p031-r01': {
    practice: q('Which component is the “brain” that carries out instructions in a computer?', 'Quel composant est le « cerveau » qui exécute les instructions dans un ordinateur ?',
      ['The microprocessor', 'Le microprocesseur'], ['The monitor', 'Le moniteur', GEN_IO, C], ['The hard disk', 'Le disque dur', GEN_STORE, C]),
    diagnostic: [
      q('Fourth-generation computers are mainly associated with which technology?', 'Les ordinateurs de quatrième génération sont surtout associés à quelle technologie ?',
        ['The microprocessor', 'Le microprocesseur'], ['Vacuum tubes', 'Les tubes à vide', GEN_ERA, C], ['Punched cards only', 'Seulement les cartes perforées', GEN_ERA, C]),
      q('When you type 18 + 24 and see 42, which part calculates the answer?', 'Quand tu tapes 18 + 24 et vois 42, quelle partie calcule la réponse ?',
        ['The processor', 'Le processeur'], ['The keyboard', 'Le clavier', GEN_IO, M], ['The screen', 'L’écran', GEN_IO, M]),
    ],
    reassessment: [
      q('Which part of the processor performs arithmetic and logic operations?', 'Quelle partie du processeur effectue les opérations arithmétiques et logiques ?',
        ['The arithmetic and logic unit (ALU)', 'L’unité arithmétique et logique (UAL)'], ['The keyboard', 'Le clavier', GEN_IO, C], ['The printer', 'L’imprimante', GEN_IO, C]),
      q('What do registers do in the simple processor model?', 'Que font les registres dans le modèle simple du processeur ?',
        ['Hold small amounts of working data for a short time', 'Garder de petites quantités de données de travail pendant peu de temps'], ['Store files permanently', 'Stocker les fichiers de façon permanente', GEN_STORE, M], ['Display results', 'Afficher les résultats', GEN_IO, C]),
    ],
    retention: [
      q('Which part coordinates the instructions inside the processor?', 'Quelle partie coordonne les instructions à l’intérieur du processeur ?',
        ['The control unit', 'L’unité de contrôle'], ['The mouse', 'La souris', GEN_IO, C], ['The hard disk', 'Le disque dur', GEN_STORE, C]),
      q('What made personal computers common in the fourth generation?', 'Qu’est-ce qui a rendu les ordinateurs personnels courants à la quatrième génération ?',
        ['Putting the processor on a single chip', 'Mettre le processeur sur une seule puce'], ['Larger vacuum tubes', 'Des tubes à vide plus grands', GEN_ERA, C], ['Removing all input devices', 'Supprimer tous les périphériques d’entrée', GEN_IO, C]),
    ],
    transfer: [
      q('A mobile phone runs apps and calculates quickly. Which component does this work?', 'Un téléphone portable fait tourner des applications et calcule vite. Quel composant fait ce travail ?',
        ['Its processor (microprocessor)', 'Son processeur (microprocesseur)'], ['Its touchscreen glass', 'La vitre de son écran tactile', GEN_IO, M], ['Its charger', 'Son chargeur', GEN_IO, C]),
      q('A learner says: “The monitor is the computer’s processor.” What is the correction?', 'Un élève dit : « Le moniteur est le processeur de l’ordinateur. » Quelle est la correction ?',
        ['The monitor shows output; the processor executes instructions', 'Le moniteur affiche la sortie ; le processeur exécute les instructions'], ['The learner is correct', 'L’élève a raison', GEN_IO, M], ['The processor is the hard disk', 'Le processeur est le disque dur', GEN_STORE, M]),
    ],
  },

  'competency-gh-mathematics-b7-nacca2020-p034-r01': {
    practice: q('Round 2,345,678,912 to the nearest thousand.', 'Arrondis 2 345 678 912 au millier le plus proche.',
      ['2,345,679,000', '2 345 679 000'], ['2,345,678,000', '2 345 678 000', RND_DIR, P], ['2,345,679', '2 345 679', RND_TRUNC, P]),
    diagnostic: [
      q('Round 1,456,782,340 to the nearest ten thousand.', 'Arrondis 1 456 782 340 à la dizaine de milliers la plus proche.',
        ['1,456,780,000', '1 456 780 000'], ['1,456,790,000', '1 456 790 000', RND_DIR, P], ['1,456,800,000', '1 456 800 000', RND_PLACE, P]),
      q('Round 3,000,250,061 DOWN to the nearest hundred.', 'Arrondis 3 000 250 061 par défaut à la centaine.',
        ['3,000,250,000', '3 000 250 000'], ['3,000,250,100', '3 000 250 100', RND_DIR, C], ['3,000,250', '3 000 250', RND_TRUNC, P]),
    ],
    reassessment: [
      q('Round 5,672,341,005 UP to the nearest hundred thousand.', 'Arrondis 5 672 341 005 par excès à la centaine de milliers.',
        ['5,672,400,000', '5 672 400 000'], ['5,672,300,000', '5 672 300 000', RND_DIR, C], ['5,672,341,100', '5 672 341 100', RND_PLACE, P]),
      q('Round 7,812,345,675 to the nearest ten.', 'Arrondis 7 812 345 675 à la dizaine la plus proche.',
        ['7,812,345,680', '7 812 345 680'], ['7,812,345,670', '7 812 345 670', RND_DIR, P], ['7,812,345,700', '7 812 345 700', RND_PLACE, P]),
    ],
    retention: [
      q('When rounding OFF, which neighbour do you choose?', 'Quand on arrondit au plus proche, quel voisin choisit-on ?',
        ['The nearer multiple; at halfway, the upper one', 'Le multiple le plus proche ; à mi-chemin, le supérieur'], ['Always the lower multiple', 'Toujours le multiple inférieur', RND_DIR, C], ['Always the upper multiple', 'Toujours le multiple supérieur', RND_DIR, C]),
      q('After rounding to the nearest thousand, what happens to the last three digits?', 'Après un arrondi au millier, que deviennent les trois derniers chiffres ?',
        ['They become zeros', 'Ils deviennent des zéros'], ['They are deleted, making the number shorter', 'On les supprime et le nombre devient plus court', RND_TRUNC, M], ['They stay the same', 'Ils restent les mêmes', RND_PLACE, C]),
    ],
    transfer: [
      q('A stadium sold 1,250,486,500 tickets over many years. A poster rounds this to the nearest hundred thousand. What does it show?', 'Un stade a vendu 1 250 486 500 billets en plusieurs années. Une affiche arrondit à la centaine de milliers. Qu’affiche-t-elle ?',
        ['1,250,500,000', '1 250 500 000'], ['1,250,400,000', '1 250 400 000', RND_DIR, P], ['1,250,486,000', '1 250 486 000', RND_PLACE, P]),
      q('A company must order enough bags for 2,000,004,301 grains, packed in hundreds. Should it round up or down to the nearest hundred, and to what?', 'Une entreprise doit commander assez de sacs pour 2 000 004 301 grains, emballés par centaines. Doit-elle arrondir par excès ou par défaut à la centaine, et à combien ?',
        ['Up, to 2,000,004,400', 'Par excès, à 2 000 004 400'], ['Down, to 2,000,004,300', 'Par défaut, à 2 000 004 300', RND_DIR, C], ['Off, to 2,000,000,000', 'Au plus proche, à 2 000 000 000', RND_PLACE, P]),
    ],
  },
};
