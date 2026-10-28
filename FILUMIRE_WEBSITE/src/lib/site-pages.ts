/*
 * FILUMIRE public website page copy (EN/FR). Claims here describe what
 * the learner app does today; keep them in step with the product.
 * Scope wording (owner decision, 27 Oct 2026): "Built for learners from
 * Basic 4 through JHS 3"; where availability matters, "Learning experiences
 * for Basic 4–6, with JHS 1–3 being prepared for full release".
 * French is written for Francophone readers, not translated word for word.
 */
import type { Bilingual } from "./site";

type Item = { title: string; text: string };

export const HOME_COPY = {
  en: {
    eyebrow: "Made for Africa",
    headline: ["Learning that ", "understands", " every child."],
    lead: "FILUMIRE is a personal tutor that follows Ghana’s curriculum, adapts to every answer and works in the browser on a phone, tablet or computer.",
    primary: "Start learning",
    secondary: "Parent or teacher log in",
    facts: ["Basic 4 through JHS 3", "English and French", "Guided by FILU"],
    countriesTitle: "Where FILUMIRE is available",
    howEyebrow: "How it works",
    howTitle: "Three steps to learning that lasts",
    steps: [
      { title: "Start in the right place", text: "Choose your class and subject. FILUMIRE begins with the lessons for that class." },
      { title: "A path that adapts", text: "When an answer shows a gap, FILUMIRE explains again, revisits earlier learning or gives guided practice before moving on." },
      { title: "Mastery, not just completion", text: "A goal counts as mastered when your child succeeds on their own, and FILUMIRE checks again later so learning lasts." },
    ] as Item[],
    howLink: "See how FILUMIRE works",
    subjectsEyebrow: "Subjects",
    subjectsTitle: "Four subjects today, the whole curriculum in view",
    subjectsLead: "Learning experiences in English, Mathematics, Science and Computing for Basic 4–6, with JHS 1–3 being prepared for full release. The other JHS subjects are in Curriculum Review.",
    reviewHeading: "Also in the Ghana JHS curriculum",
    subjectsLink: "Explore the subjects",
    filuEyebrow: "Meet FILU",
    filuTitle: "A friendly guide inside every lesson",
    filuText: "FILU explains, encourages and celebrates. When something is hard, your child can ask FILU for another explanation without leaving the lesson.",
    filuPoints: ["Explains ideas in small, clear steps", "Reads lessons aloud", "Celebrates progress with stars and challenges"],
    filuSays: "Let’s work through this step by step!",
    audienceEyebrow: "For everyone who helps a child learn",
    audienceTitle: "One learning journey, three ways in",
    audiences: [
      { title: "Learners", text: "Short lessons, stars and challenges, and help from FILU whenever you need it.", cta: "For Learners", href: "/learners" },
      { title: "Parents", text: "See which goals your child has mastered and where a little support will help.", cta: "For Parents", href: "/parents" },
      { title: "Teachers and schools", text: "See which learners may need help and which earlier learning to revisit with them.", cta: "For Schools", href: "/schools" },
    ],
    trustEyebrow: "Built on the curriculum",
    trustTitle: "Rooted in Ghana’s national curriculum",
    trust: [
      { title: "Follows the national standards", text: "Lessons follow Ghana’s Standards-Based Curriculum for Basic 4–6. JHS 1–3 lessons, built on the Common Core Programme, are being prepared for full release." },
      { title: "Checked before release", text: "A subject opens to learners only after curriculum review." },
      { title: "Familiar to children", text: "Examples use names, places and Ghana cedis that children recognise." },
      { title: "English and French", text: "Learners and families can use FILUMIRE in English or French." },
    ] as Item[],
    finalTitle: "Ready to start learning?",
    finalText: "Open FILUMIRE in your browser and pick up where you left off.",
    finalSecondary: "Talk to us",
  },
  fr: {
    eyebrow: "Pensé pour l’Afrique",
    headline: ["Un apprentissage qui ", "comprend", " chaque enfant."],
    lead: "FILUMIRE est un tuteur personnel qui suit le programme scolaire du Ghana, s’adapte à chaque réponse et s’utilise dans le navigateur, sur téléphone, tablette ou ordinateur.",
    primary: "Commencer",
    secondary: "Connexion parent ou enseignant",
    facts: ["De Basic 4 à JHS 3", "En anglais et en français", "Avec FILU pour guide"],
    countriesTitle: "FILUMIRE dans votre pays",
    howEyebrow: "Comment ça marche",
    howTitle: "Trois étapes pour des acquis durables",
    steps: [
      { title: "Commencer au bon niveau", text: "Choisissez la classe et la matière : FILUMIRE propose d’abord les leçons de cette classe." },
      { title: "Un parcours qui s’adapte", text: "Lorsqu’une réponse révèle une difficulté, FILUMIRE réexplique, revient sur une notion antérieure ou propose un exercice guidé avant de poursuivre." },
      { title: "Maîtriser, pas seulement terminer", text: "Un objectif est considéré comme maîtrisé lorsque votre enfant réussit seul. FILUMIRE le vérifie de nouveau plus tard pour que les acquis durent." },
    ] as Item[],
    howLink: "Découvrir notre approche",
    subjectsEyebrow: "Matières",
    subjectsTitle: "Quatre matières pour commencer, tout le programme en perspective",
    subjectsLead: "Anglais, mathématiques, sciences et informatique : des parcours d’apprentissage pour Basic 4 à 6, tandis que le JHS 1 à 3 se prépare à une ouverture complète. Les autres matières du JHS sont en préparation.",
    reviewHeading: "Également au programme du JHS au Ghana",
    subjectsLink: "Voir toutes les matières",
    filuEyebrow: "Faites connaissance avec FILU",
    filuTitle: "Un guide bienveillant dans chaque leçon",
    filuText: "FILU explique, encourage et félicite. Face à une difficulté, votre enfant peut lui demander une autre explication sans quitter la leçon.",
    filuPoints: ["Explique pas à pas, simplement", "Lit les leçons à voix haute", "Récompense les progrès par des étoiles et des défis"],
    filuSays: "Allons-y étape par étape !",
    audienceEyebrow: "Pour tous ceux qui accompagnent un enfant",
    audienceTitle: "Un même parcours, trois points d’entrée",
    audiences: [
      { title: "Élèves", text: "Des leçons courtes, des étoiles, des défis, et FILU pour t’aider dès que tu en as besoin.", cta: "Pour les élèves", href: "/learners" },
      { title: "Parents", text: "Voyez les objectifs que votre enfant maîtrise et là où un coup de pouce l’aidera.", cta: "Pour les parents", href: "/parents" },
      { title: "Enseignants et écoles", text: "Repérez les élèves qui ont besoin d’aide et les notions antérieures à retravailler avec eux.", cta: "Pour les écoles", href: "/schools" },
    ],
    trustEyebrow: "Fondé sur le programme officiel",
    trustTitle: "Ancré dans le programme national du Ghana",
    trust: [
      { title: "Conforme aux normes nationales", text: "Les leçons de Basic 4 à 6 suivent le programme national du Ghana fondé sur les normes. Celles du JHS 1 à 3, conçues à partir du Common Core Programme, se préparent à une ouverture complète." },
      { title: "Vérifié avant ouverture", text: "Une matière n’est ouverte aux élèves qu’après l’examen de son programme." },
      { title: "Des repères familiers", text: "Les exemples s’appuient sur des prénoms, des lieux et des montants en cedis que les enfants connaissent." },
      { title: "En anglais ou en français", text: "Élèves et familles peuvent utiliser FILUMIRE en anglais ou en français." },
    ] as Item[],
    finalTitle: "Prêts à commencer ?",
    finalText: "Ouvrez FILUMIRE dans votre navigateur et reprenez là où vous en étiez.",
    finalSecondary: "Nous contacter",
  },
} satisfies Bilingual<Record<string, unknown>>;

export const LEARNERS_COPY = {
  en: {
    eyebrow: "For Learners",
    title: "Learning made just for you",
    lead: "Short lessons, friendly help from FILU and a path that moves at your pace.",
    featuresTitle: "What you can do in FILUMIRE",
    features: [
      { title: "Learn in short steps", text: "Each lesson explains one idea with examples, then lets you try it yourself." },
      { title: "Ask FILU", text: "Stuck? Ask FILU to explain it another way, right inside the lesson." },
      { title: "Listen as you read", text: "Have the lesson read aloud while you follow along." },
      { title: "Earn stars and take challenges", text: "Celebrate what you have learned and try today’s challenge." },
      { title: "See your progress", text: "Watch your goals fill up in each subject as you master them." },
      { title: "English or French", text: "Learn in the language you choose." },
    ] as Item[],
    startTitle: "How to get started",
    startSteps: [
      { title: "Ask your parent or guardian", text: "They create your FILUMIRE account and give you your username." },
      { title: "Log in", text: "Use your username and password to sign in." },
      { title: "Pick a subject", text: "Continue where you left off, or start something new." },
    ] as Item[],
    primary: "Start learning",
    secondary: "Log in",
  },
  fr: {
    eyebrow: "Pour les élèves",
    title: "Un apprentissage fait pour toi",
    lead: "Des leçons courtes, l’aide de FILU et un parcours qui avance à ton rythme.",
    featuresTitle: "Ce que tu peux faire avec FILUMIRE",
    features: [
      { title: "Apprendre pas à pas", text: "Chaque leçon explique une idée avec des exemples, puis c’est à toi d’essayer." },
      { title: "Demander à FILU", text: "Tu bloques ? Demande à FILU de t’expliquer autrement, sans quitter la leçon." },
      { title: "Écouter la leçon", text: "Fais-toi lire la leçon à voix haute en suivant le texte." },
      { title: "Gagner des étoiles, relever des défis", text: "Fête ce que tu as appris et tente le défi du jour." },
      { title: "Suivre tes progrès", text: "Regarde tes objectifs se remplir dans chaque matière, au fur et à mesure que tu les maîtrises." },
      { title: "En anglais ou en français", text: "Apprends dans la langue de ton choix." },
    ] as Item[],
    startTitle: "Pour commencer",
    startSteps: [
      { title: "Demande à ton parent ou à ton tuteur", text: "C’est lui qui crée ton compte FILUMIRE et te donne ton identifiant." },
      { title: "Connecte-toi", text: "Saisis ton identifiant et ton mot de passe." },
      { title: "Choisis une matière", text: "Reprends ta leçon en cours ou commence quelque chose de nouveau." },
    ] as Item[],
    primary: "Commencer",
    secondary: "Se connecter",
  },
} satisfies Bilingual<Record<string, unknown>>;

export const PARENTS_COPY = {
  en: {
    eyebrow: "For Parents",
    title: "See real progress, not just time spent",
    lead: "FILUMIRE shows which goals your child has mastered, what to revisit and how you can help, without needing to be a subject expert.",
    featuresTitle: "What your family account gives you",
    features: [
      { title: "Add your children", text: "Create a learner account for each child, with a username they use to sign in." },
      { title: "Goals mastered in each subject", text: "Follow progress subject by subject, measured by what your child can do on their own." },
      { title: "Know where to help", text: "See which earlier learning is worth revisiting together." },
      { title: "Connect a teacher", text: "Create a code so your child’s teacher can follow their learning too." },
      { title: "Their language, their pace", text: "Each child can learn in English or French, at their own pace." },
      { title: "Learning records you can trust", text: "A child’s learning record reflects their learning and is never changed by account or billing status." },
    ] as Item[],
    safetyTitle: "Safety and privacy",
    safetyText: "Children sign in with a username your family creates, and adults stay in charge of their accounts. FILUMIRE does not show advertising to learners.",
    primary: "Parent log in",
    secondary: "Ask a question",
  },
  fr: {
    eyebrow: "Pour les parents",
    title: "Des progrès réels, pas seulement du temps passé",
    lead: "FILUMIRE vous montre les objectifs que votre enfant maîtrise, ce qu’il faut revoir et comment l’aider, sans avoir à être spécialiste de la matière.",
    featuresTitle: "Ce que vous permet votre compte famille",
    features: [
      { title: "Ajoutez vos enfants", text: "Créez un compte élève pour chaque enfant, avec son propre identifiant de connexion." },
      { title: "Les objectifs maîtrisés, matière par matière", text: "Suivez les progrès dans chaque matière, mesurés à ce que votre enfant sait faire seul." },
      { title: "Savoir où l’aider", text: "Repérez les notions antérieures qu’il vaut la peine de revoir ensemble." },
      { title: "Associer son enseignant", text: "Créez un code pour que l’enseignant de votre enfant puisse, lui aussi, suivre ses apprentissages." },
      { title: "Sa langue, son rythme", text: "Chaque enfant apprend en anglais ou en français, à son rythme." },
      { title: "Un suivi fiable", text: "Le parcours de votre enfant reflète ses apprentissages et ne dépend jamais de l’état de votre compte ou de votre abonnement." },
    ] as Item[],
    safetyTitle: "Sécurité et confidentialité",
    safetyText: "Les enfants se connectent avec un identifiant créé par leur famille, et ce sont les adultes qui gèrent les comptes. FILUMIRE n’affiche aucune publicité aux élèves.",
    primary: "Connexion parent",
    secondary: "Poser une question",
  },
} satisfies Bilingual<Record<string, unknown>>;

export const SCHOOLS_COPY = {
  en: {
    eyebrow: "For Schools",
    title: "Support every learner in your class",
    lead: "FILUMIRE helps teachers see who may need help and why, with practice that follows the national curriculum. Teacher judgement stays at the centre.",
    featuresTitle: "What teachers can do",
    features: [
      { title: "Link your learners", text: "Families share a code that links their child to your teacher account." },
      { title: "See who may need help", text: "Spot learners who may need support, subject by subject." },
      { title: "Know what to revisit", text: "See the earlier learning behind a difficulty, so you can plan focused teaching." },
      { title: "Add your own observations", text: "Record notes and observations alongside each learner’s progress." },
      { title: "Curriculum-aligned practice", text: "Learners practise the national curriculum at their own pace, in or out of class." },
      { title: "Your judgement first", text: "FILUMIRE supports your teaching; it does not replace it." },
    ] as Item[],
    schoolTitle: "Bringing FILUMIRE to your school",
    schoolText: "Tell us about your school, your classes and your connectivity, and we will plan the right way to start together.",
    primary: "Teacher log in",
    secondary: "Talk to us about your school",
  },
  fr: {
    eyebrow: "Pour les écoles",
    title: "Accompagner chaque élève de votre classe",
    lead: "FILUMIRE aide les enseignants à repérer les élèves en difficulté et à en comprendre la cause, avec des exercices conformes au programme national. Le jugement de l’enseignant reste central.",
    featuresTitle: "Ce que FILUMIRE permet aux enseignants",
    features: [
      { title: "Associer vos élèves", text: "Les familles vous transmettent un code qui relie leur enfant à votre compte enseignant." },
      { title: "Repérer qui a besoin d’aide", text: "Identifiez, matière par matière, les élèves qui ont besoin de soutien." },
      { title: "Savoir quoi retravailler", text: "Voyez la notion antérieure à l’origine d’une difficulté pour mieux cibler votre enseignement." },
      { title: "Ajouter vos observations", text: "Consignez vos remarques et observations à côté des progrès de chaque élève." },
      { title: "Des exercices conformes au programme", text: "Les élèves s’exercent sur le programme national à leur rythme, en classe comme à la maison." },
      { title: "Votre jugement d’abord", text: "FILUMIRE appuie votre enseignement ; il ne le remplace pas." },
    ] as Item[],
    schoolTitle: "Déployer FILUMIRE dans votre école",
    schoolText: "Parlez-nous de votre école, de vos classes et de votre connexion Internet : nous définirons ensemble la meilleure façon de démarrer.",
    primary: "Connexion enseignant",
    secondary: "Parlez-nous de votre école",
  },
} satisfies Bilingual<Record<string, unknown>>;

export const SUBJECTS_COPY = {
  en: {
    eyebrow: "Subjects",
    title: "Subjects and curriculum",
    lead: "Built for learners from Basic 4 through JHS 3, following Ghana’s national curriculum. Learning experiences for Basic 4–6, with JHS 1–3 being prepared for full release.",
    primaryTitle: "Basic 4–6",
    primaryNote: "Ghana Standards-Based Curriculum (NaCCA, 2019)",
    jhsTitle: "JHS 1–3 (Basic 7–9)",
    jhsNote: "Ghana Common Core Programme (NaCCA) · Being prepared for full release",
    reviewHeading: "Also in the JHS curriculum",
    reviewTitle: "What “Curriculum Review” means",
    sourcesTitle: "Curriculum documents (Basic 4–6)",
    sources: ["English Language", "Mathematics", "Science", "Computing"],
    primary: "Start learning",
  },
  fr: {
    eyebrow: "Matières",
    title: "Matières et programme",
    lead: "Conçu pour les élèves de Basic 4 à JHS 3, selon le programme national du Ghana. Des parcours d’apprentissage pour Basic 4 à 6 ; le JHS 1 à 3 se prépare à une ouverture complète.",
    primaryTitle: "Basic 4–6",
    primaryNote: "Programme national du Ghana fondé sur les normes (NaCCA, 2019)",
    jhsTitle: "JHS 1–3 (Basic 7–9)",
    jhsNote: "Common Core Programme du Ghana (NaCCA) · En préparation pour une ouverture complète",
    reviewHeading: "Également au programme du JHS",
    reviewTitle: "Que signifie « Programme en préparation » ?",
    sourcesTitle: "Documents officiels du programme (Basic 4–6, en anglais)",
    sources: ["Anglais", "Mathématiques", "Sciences", "Informatique"],
    primary: "Commencer",
  },
} satisfies Bilingual<Record<string, unknown>>;

export const HOW_COPY = {
  en: {
    eyebrow: "How it works",
    title: "How FILUMIRE helps children learn",
    lead: "FILUMIRE connects the curriculum, what a child’s answers show and guided teaching, so each learner gets the next step that helps most.",
    steps: [
      { title: "Choose a class and subject", text: "A parent sets up the learner’s class. FILUMIRE opens the subjects and lessons for that class." },
      { title: "Learn one idea at a time", text: "Each lesson introduces an idea with explanations and examples, then invites the learner to try." },
      { title: "Check understanding", text: "Questions show what the learner can do, including whether they needed a hint." },
      { title: "Understand mistakes", text: "FILUMIRE tells a careless slip apart from a missing earlier skill or a misunderstood idea, and responds to the cause." },
      { title: "Repair and move forward", text: "It may explain again, revisit earlier learning or offer guided practice, then move on when the learner is ready." },
      { title: "Make learning last", text: "Mastery needs success without help. Later revision checks confirm the learner still remembers." },
    ] as Item[],
    filuTitle: "FILU, the learning guide",
    filuText: "FILU appears throughout FILUMIRE to explain, encourage and celebrate. Learners can ask FILU for another explanation at any point in a lesson, and have lessons read aloud.",
    adultsTitle: "Adults stay informed",
    adultsText: "Parents see goals mastered and what to revisit. Teachers see who may need help and can add their own observations.",
    primary: "Start learning",
    secondary: "Explore the subjects",
  },
  fr: {
    eyebrow: "Comment ça marche",
    title: "Comment FILUMIRE aide les enfants à apprendre",
    lead: "FILUMIRE s’appuie sur le programme, sur ce que révèlent les réponses de l’enfant et sur un accompagnement guidé, afin de proposer à chaque élève l’étape la plus utile.",
    steps: [
      { title: "Choisir une classe et une matière", text: "Un parent indique la classe de l’élève ; FILUMIRE ouvre les matières et les leçons correspondantes." },
      { title: "Une notion à la fois", text: "Chaque leçon présente une notion, avec des explications et des exemples, puis invite l’élève à s’exercer." },
      { title: "Vérifier la compréhension", text: "Les questions montrent ce que l’élève sait faire, et s’il a eu besoin d’un indice." },
      { title: "Comprendre les erreurs", text: "FILUMIRE distingue une simple étourderie d’une notion antérieure non acquise ou d’une idée mal comprise, et agit sur la cause." },
      { title: "Consolider, puis avancer", text: "Il peut réexpliquer, revenir sur une notion antérieure ou proposer un exercice guidé, puis passer à la suite quand l’élève est prêt." },
      { title: "Des acquis qui durent", text: "Un objectif n’est maîtrisé que lorsque l’élève réussit sans aide. Des révisions ultérieures vérifient qu’il s’en souvient." },
    ] as Item[],
    filuTitle: "FILU, le guide d’apprentissage",
    filuText: "FILU accompagne l’élève tout au long de FILUMIRE : il explique, encourage et félicite. À tout moment de la leçon, l’élève peut lui demander une autre explication ou se faire lire la leçon à voix haute.",
    adultsTitle: "Les adultes restent informés",
    adultsText: "Les parents voient les objectifs maîtrisés et les notions à revoir. Les enseignants repèrent les élèves qui ont besoin d’aide et peuvent ajouter leurs observations.",
    primary: "Commencer",
    secondary: "Voir les matières",
  },
} satisfies Bilingual<Record<string, unknown>>;

export const ABOUT_COPY = {
  en: {
    eyebrow: "About FILUMIRE",
    title: "Every African child deserves learning that understands them",
    lead: "FILUMIRE is a personal learning companion for children in Africa. It starts with Ghana’s national curriculum and builds understanding that a child can use on their own.",
    whyTitle: "Why FILUMIRE exists",
    whyText: "Children need different amounts of explanation and practice. When an earlier idea is unclear, later lessons become harder. FILUMIRE looks for why a child is stuck, repairs that gap with familiar examples, and checks that the learning lasts.",
    principlesTitle: "What we stand for",
    principles: [
      { title: "The curriculum comes first", text: "National standards decide what is taught." },
      { title: "Evidence, not assumptions", text: "Understanding is judged from what a learner actually does." },
      { title: "Mastery means independence", text: "Success with hints is not the same as success alone." },
      { title: "Help that fits the need", text: "Support targets the real cause of a difficulty, not more of the same." },
      { title: "Teachers stay in charge", text: "FILUMIRE supports teacher judgement and classroom priorities." },
      { title: "Learning records stay true", text: "Account or billing status never changes a child’s learning record." },
    ] as Item[],
    africaTitle: "Made for African learners",
    africaText: "FILUMIRE uses familiar names, places and everyday examples such as Ghana cedis, and works in English and French. Ghana is the first country; Côte d’Ivoire and Nigeria are coming.",
    privacyTitle: "Safety and privacy",
    privacyText: "Child safety, privacy and adult oversight shape every part of FILUMIRE. Families create their children’s accounts and stay in charge of them. Please do not send children’s personal details through the website’s contact form.",
    privacyLink: "Website privacy",
    workTitle: "Work with us",
    workText: "We welcome educators, curriculum specialists and organisations who share our mission. Tell us how you would like to contribute.",
    workCta: "Get in touch",
  },
  fr: {
    eyebrow: "À propos de FILUMIRE",
    title: "Chaque enfant africain mérite un apprentissage qui le comprend",
    lead: "FILUMIRE est un compagnon d’apprentissage personnalisé pour les enfants d’Afrique. Il part du programme national du Ghana pour construire des acquis que l’enfant sait mobiliser seul.",
    whyTitle: "Pourquoi FILUMIRE",
    whyText: "Chaque enfant a besoin de plus ou moins d’explications et d’entraînement. Quand une notion antérieure reste floue, les leçons suivantes deviennent plus difficiles. FILUMIRE cherche pourquoi un enfant bloque, comble la lacune avec des exemples familiers et vérifie que les acquis durent.",
    principlesTitle: "Nos engagements",
    principles: [
      { title: "Le programme d’abord", text: "Ce sont les normes nationales qui définissent ce qui est enseigné." },
      { title: "Des faits, pas des suppositions", text: "La compréhension s’évalue à partir de ce que l’élève fait réellement." },
      { title: "Maîtriser, c’est réussir seul", text: "Réussir avec des indices n’équivaut pas à réussir seul." },
      { title: "Une aide ciblée", text: "Le soutien s’attaque à la véritable cause d’une difficulté, plutôt que de répéter le même exercice." },
      { title: "L’enseignant garde la main", text: "FILUMIRE soutient le jugement de l’enseignant et les priorités de la classe." },
      { title: "Un parcours fidèle", text: "L’état du compte ou de l’abonnement ne modifie jamais le parcours d’un enfant." },
    ] as Item[],
    africaTitle: "Conçu pour les élèves africains",
    africaText: "FILUMIRE s’appuie sur des prénoms, des lieux et des exemples du quotidien familiers, comme les cedis ghanéens, et fonctionne en anglais comme en français. Le Ghana ouvre la voie ; la Côte d’Ivoire et le Nigeria suivront.",
    privacyTitle: "Sécurité et confidentialité",
    privacyText: "La sécurité des enfants, la confidentialité et l’encadrement par les adultes guident chaque aspect de FILUMIRE. Les familles créent les comptes de leurs enfants et en gardent la maîtrise. Merci de ne transmettre aucune donnée personnelle d’enfant par le formulaire de contact du site.",
    privacyLink: "Confidentialité du site",
    workTitle: "Travailler avec nous",
    workText: "Enseignants, spécialistes des programmes, organisations : si vous partagez notre mission, dites-nous comment vous aimeriez contribuer.",
    workCta: "Nous écrire",
  },
} satisfies Bilingual<Record<string, unknown>>;

export const GHANA_COPY = {
  en: {
    eyebrow: "Ghana",
    title: "FILUMIRE in Ghana",
    lead: "Built for learners from Basic 4 through JHS 3, following the NaCCA national curriculum. Learning experiences for Basic 4–6, with JHS 1–3 being prepared for full release.",
    startTitle: "Getting started",
    start: [
      { title: "Families", text: "Create a family account, add your children and choose each child’s class." },
      { title: "Learners", text: "Sign in with the username your family created and start your first lesson." },
      { title: "Teachers", text: "Ask families for their teacher code to follow your learners’ progress." },
    ] as Item[],
    primary: "Start learning",
    secondary: "For Schools",
  },
  fr: {
    eyebrow: "Ghana",
    title: "FILUMIRE au Ghana",
    lead: "Conçu pour les élèves de Basic 4 à JHS 3, conformément au programme national de la NaCCA. Des parcours d’apprentissage pour Basic 4 à 6 ; le JHS 1 à 3 se prépare à une ouverture complète.",
    startTitle: "Pour commencer",
    start: [
      { title: "Familles", text: "Créez un compte famille, ajoutez vos enfants et indiquez la classe de chacun." },
      { title: "Élèves", text: "Connecte-toi avec l’identifiant créé par ta famille et commence ta première leçon." },
      { title: "Enseignants", text: "Demandez aux familles leur code enseignant pour suivre les progrès de vos élèves." },
    ] as Item[],
    primary: "Commencer",
    secondary: "Pour les écoles",
  },
} satisfies Bilingual<Record<string, unknown>>;

export const SOON_COPY = {
  en: {
    eyebrow: "Coming soon",
    title: (country: string) => `FILUMIRE in ${country}`,
    text: (country: string) => `We are preparing FILUMIRE for ${country}, with lessons built on its national curriculum. Lessons and learner accounts for ${country} are not available yet.`,
    back: "Choose another country",
    contact: "Stay in touch",
  },
  fr: {
    eyebrow: "Bientôt disponible",
    title: (country: string) => `FILUMIRE ${country === "Nigeria" ? "au" : "en"} ${country}`,
    text: (country: string) => {
      const the = country === "Nigeria" ? "le Nigeria" : "la " + country;
      const forIt = country === "Nigeria" ? "au Nigeria" : "en " + country;
      return `Nous préparons FILUMIRE pour ${the}, avec des leçons fondées sur son programme national. Les leçons et les comptes élèves ne sont pas encore disponibles ${forIt}.`;
    },
    back: "Choisir un autre pays",
    contact: "Restons en contact",
  },
};

export const HELP_COPY = {
  en: {
    eyebrow: "Help & contact",
    title: "How can we help?",
    lead: "Find out how to sign in, or send us a message.",
    cards: [
      { id: "learner", title: "Learners", text: "Sign in with the username and password your parent or guardian created. Forgotten your password? Ask them to set a new one from their family page.", cta: "Learner log in" },
      { id: "parent", title: "Parents and guardians", text: "Sign in with your email address to add children, follow their progress and create a teacher code.", cta: "Parent log in" },
      { id: "teacher", title: "Teachers", text: "Sign in with your email address. Ask families for a teacher code to link their child to your account.", cta: "Teacher log in" },
    ],
    formTitle: "Send us a message",
    formLead: "Questions about FILUMIRE, your family or your school are welcome. Please do not include children’s personal details.",
  },
  fr: {
    eyebrow: "Aide et contact",
    title: "Comment pouvons-nous vous aider ?",
    lead: "Découvrez comment vous connecter ou envoyez-nous un message.",
    cards: [
      { id: "learner", title: "Élèves", text: "Connecte-toi avec l’identifiant et le mot de passe créés par ton parent ou ton tuteur. Mot de passe oublié ? Demande-lui d’en définir un nouveau depuis sa page famille.", cta: "Connexion élève" },
      { id: "parent", title: "Parents et tuteurs", text: "Connectez-vous avec votre adresse e-mail pour ajouter vos enfants, suivre leurs progrès et créer un code enseignant.", cta: "Connexion parent" },
      { id: "teacher", title: "Enseignants", text: "Connectez-vous avec votre adresse e-mail. Demandez aux familles un code enseignant pour associer leur enfant à votre compte.", cta: "Connexion enseignant" },
    ],
    formTitle: "Envoyez-nous un message",
    formLead: "Une question sur FILUMIRE, votre famille ou votre école ? Écrivez-nous. Merci de ne pas indiquer de données personnelles concernant des enfants.",
  },
} satisfies Bilingual<Record<string, unknown>>;

/* Page titles and descriptions for metadata (EN, FR). */
export const PAGE_META: Record<string, Bilingual<{ title: string; description: string }>> = {
  "/": {
    en: { title: "Personal learning for every child", description: "FILUMIRE is a personal tutor built for learners from Basic 4 through JHS 3. It follows Ghana’s curriculum, adapts to every answer and is guided by FILU." },
    fr: { title: "Un apprentissage personnalisé pour chaque enfant", description: "FILUMIRE est un tuteur personnel conçu pour les élèves de Basic 4 à JHS 3. Il suit le programme du Ghana, s’adapte à chaque réponse et est guidé par FILU." },
  },
  "/how-it-works": {
    en: { title: "How it works", description: "How FILUMIRE checks understanding, responds to mistakes and makes learning last." },
    fr: { title: "Comment ça marche", description: "Comment FILUMIRE vérifie la compréhension, agit sur les erreurs et rend les acquis durables." },
  },
  "/subjects": {
    en: { title: "Subjects and curriculum", description: "English, Mathematics, Science and Computing for Basic 4–6, with JHS 1–3 being prepared for full release, and the subjects in Curriculum Review." },
    fr: { title: "Matières et programme", description: "Anglais, mathématiques, sciences et informatique pour Basic 4 à 6, le JHS 1 à 3 en préparation pour une ouverture complète, et les matières en préparation." },
  },
  "/learners": {
    en: { title: "For Learners", description: "Short lessons, help from FILU, stars and challenges: learning made for you." },
    fr: { title: "Pour les élèves", description: "Des leçons courtes, l’aide de FILU, des étoiles et des défis : un apprentissage fait pour toi." },
  },
  "/parents": {
    en: { title: "For Parents", description: "Follow the goals your child has mastered, see what to revisit and connect their teacher." },
    fr: { title: "Pour les parents", description: "Suivez les objectifs que votre enfant maîtrise, repérez ce qu’il faut revoir et associez son enseignant." },
  },
  "/schools": {
    en: { title: "For Schools", description: "See which learners may need help and what to revisit, with practice that follows the national curriculum." },
    fr: { title: "Pour les écoles", description: "Repérez les élèves qui ont besoin d’aide et les notions à retravailler, avec des exercices conformes au programme national." },
  },
  "/about": {
    en: { title: "About FILUMIRE", description: "The mission, commitments and safety principles behind FILUMIRE." },
    fr: { title: "À propos de FILUMIRE", description: "La mission, les engagements et les principes de sécurité de FILUMIRE." },
  },
  "/contact": {
    en: { title: "Help & contact", description: "How to sign in to FILUMIRE, and how to send us a message." },
    fr: { title: "Aide et contact", description: "Comment se connecter à FILUMIRE et comment nous écrire." },
  },
  "/privacy": {
    en: { title: "Website privacy", description: "How the FILUMIRE public website handles messages and links to the learning app." },
    fr: { title: "Confidentialité du site", description: "Comment le site public de FILUMIRE traite les messages et les liens vers l’application d’apprentissage." },
  },
  "/ghana": {
    en: { title: "FILUMIRE in Ghana", description: "Built for learners from Basic 4 through JHS 3, following the NaCCA national curriculum." },
    fr: { title: "FILUMIRE au Ghana", description: "Conçu pour les élèves de Basic 4 à JHS 3, conformément au programme national de la NaCCA." },
  },
  "/cote-divoire": {
    en: { title: "Côte d’Ivoire: coming soon", description: "FILUMIRE is preparing lessons for Côte d’Ivoire." },
    fr: { title: "Côte d’Ivoire : bientôt disponible", description: "FILUMIRE prépare ses leçons pour la Côte d’Ivoire." },
  },
  "/nigeria": {
    en: { title: "Nigeria: coming soon", description: "FILUMIRE is preparing lessons for Nigeria." },
    fr: { title: "Nigeria : bientôt disponible", description: "FILUMIRE prépare ses leçons pour le Nigeria." },
  },
  "/pricing": {
    en: { title: "Subscriptions", description: "FILUMIRE subscription plans." },
    fr: { title: "Abonnements", description: "Offres d’abonnement FILUMIRE." },
  },
  "/account": {
    en: { title: "Parent account", description: "Parent account." },
    fr: { title: "Compte parent", description: "Compte parent." },
  },
  "/account/subscription": {
    en: { title: "Subscription management", description: "Subscription management." },
    fr: { title: "Gestion de l’abonnement", description: "Gestion de l’abonnement." },
  },
};
