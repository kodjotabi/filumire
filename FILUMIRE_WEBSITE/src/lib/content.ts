/**
 * FILUMIRE Website Content & Internationalization Baseline
 * 
 * Structured to support full bilingual presentation (EN / FR).
 * Content strictly adheres to the FILUMIRE architectural canon:
 * - Differentiates FILUMIRE (the adaptive infrastructure) from FILU (the instructional companion)
 * - Uses validated educational pillars: Made for Africa, Personalised, Effective, Safety by design
 * - Represents real curriculum foundations (Ghana Basic 4-6, NaCCA standards)
 * - Avoids speculative claims or invented institutional endorsements
 */

export interface NavItem {
  label: string;
  href: string;
}

export interface FeaturePillar {
  icon: string;
  title: string;
  tagline: string;
  description: string;
}

export interface SubjectInfo {
  id: string;
  name: string;
  icon: string;
  badgeColor: string;
  description: string;
  strands: string[];
}

export interface LearningStep {
  step: number;
  nameEn: string;
  nameFr: string;
  title: string;
  description: string;
  roleOfFilu: string;
}

export const SITE_CONTENT = {
  en: {
    hero: {
      headline: "Learning that understands every child.",
      subhead: "FILUMIRE is an EduTutor and adaptive learning project for African learners, designed to understand learning gaps and support children, families and teachers.",
      primaryCta: "Explore Learner Access",
      secondaryCta: "Explore How It Works",
      taglineBadge: "Made for Africa • Ghana Primary B4–B6",
    },
    pillars: [
      {
        icon: "/illustrations/MadeforAfrica.svg",
        title: "Made for Africa",
        tagline: "Our learners. Our future.",
        description: "Designed around national curricula, relatable cultural contexts and the realities of African classrooms and homes.",
      },
      {
        icon: "/illustrations/Personalised.svg",
        title: "Personalised",
        tagline: "Adapts to how you learn.",
        description: "The educational approach uses evidence to understand why a child struggles and choose suitable explanations and practice.",
      },
      {
        icon: "/illustrations/Effective.svg",
        title: "Effective",
        tagline: "Build real understanding.",
        description: "The goal is independent understanding that children can remember and apply in new situations.",
      },
      {
        icon: "/illustrations/safe and secure icon.svg",
        title: "Safety by design",
        tagline: "Privacy and adult oversight matter.",
        description: "Child safety, learner privacy and adult oversight are core design principles. Ask about current platform safeguards before enrolment.",
      },
    ],
    filuExplainer: {
      title: "Meet FILU: The Learning Companion",
      subtitle: "FILU is the instructional companion in the FILUMIRE learning approach: a friendly guide intended to explain ideas, ask questions and encourage independent thinking.",
      badge: "Instructional Companion",
      points: [
        {
          title: "Guided Discovery, Not Just Answers",
          text: "FILU’s intended role is to ask purposeful questions, offer progressive hints and use worked examples that help learners do their own thinking.",
        },
        {
          title: "Bilingual Guidance",
          text: "English and French are part of the language direction. Confirm the languages available for a particular lesson or pilot with the team.",
        },
        {
          title: "Encouraging Independence",
          text: "The teaching design calls for support to fade as confidence grows, helping children practise without hints.",
        },
      ],
    },
    pedagogy: {
      title: "The 5-Step Learning Sequence",
      subtitle: "The proposed teaching rhythm moves from explanation and supported practice to independent checks and reflection.",
      steps: [
        {
          step: 1,
          nameEn: "Understand",
          nameFr: "Comprenons",
          title: "Conceptual Introduction",
          description: "Clear, structured explanations using relatable representations, interactive visuals, and familiar examples.",
          roleOfFilu: "Introduces ideas clearly without overwhelming technical jargon.",
        },
        {
          step: 2,
          nameEn: "Practise",
          nameFr: "Entraînons-nous",
          title: "Guided Application",
          description: "Scaffolded questions where learners test their understanding with immediate, constructive feedback.",
          roleOfFilu: "Provides hint ladders and remediation if a misconception is detected.",
        },
        {
          step: 3,
          nameEn: "Apply",
          nameFr: "Appliquons",
          title: "Contextual Problem Solving",
          description: "Putting knowledge to work in practical community and classroom scenarios.",
          roleOfFilu: "Encourages the learner to explain their reasoning step-by-step.",
        },
        {
          step: 4,
          nameEn: "Check",
          nameFr: "Vérifions",
          title: "Low-Stakes Diagnosis",
          description: "Unassisted verification that confirms independent capability without high-stakes test anxiety.",
          roleOfFilu: "Observes quietly to measure true learner independence.",
        },
        {
          step: 5,
          nameEn: "Reflect",
          nameFr: "Réfléchissons",
          title: "Retention & Synthesis",
          description: "Spaced retrieval and transfer checks scheduled to ensure knowledge stays sharp over time.",
          roleOfFilu: "Celebrates genuine milestones and reinforces growth mindset.",
        },
      ],
    },
    subjects: [
      {
        id: "mathematics",
        name: "Mathematics",
        icon: "/icons/icon-mathematics.png",
        badgeColor: "#12b350",
        description: "Number operations, fractions, place value, geometry, and data interpretation with practical application.",
        strands: ["Number and Operations", "Fractions and Decimals", "Geometry and Shapes", "Measurement and Data"],
      },
      {
        id: "english",
        name: "English Language",
        icon: "/icons/icon-english.png",
        badgeColor: "#0b7bff",
        description: "Grammar, syntax, vocabulary development, reading comprehension, and structured expression.",
        strands: ["Grammar and Usage", "Reading Comprehension", "Writing and Composition", "Vocabulary in Context"],
      },
      {
        id: "science",
        name: "Integrated Science",
        icon: "/icons/icon-science.png",
        badgeColor: "#f59a00",
        description: "Understanding living things, materials, earth systems, energy, and scientific observation.",
        strands: ["Diversity of Matter", "Cycles and Plants", "Systems in Nature", "Energy and Forces"],
      },
      {
        id: "computing",
        name: "Computing",
        icon: "/icons/icon-computing.png",
        badgeColor: "#8466dc",
        description: "Digital literacy, hardware parts, desktop navigation, data concepts, and responsible digital citizenship.",
        strands: ["Introduction to Computing", "Productivity Software", "Data Collection and Analysis", "Digital Safety"],
      },
    ],
    audiences: {
      families: {
        title: "For Families & Guardians",
        tagline: "Empowering parents to support their children with clarity, not confusion.",
        points: [
          "A focus on understanding what your child can do independently and where more practice would help.",
          "Practical home-learning ideas that do not require parents to be subject specialists.",
          "A calm learning approach that values encouragement, privacy and adult involvement.",
        ],
        cta: "Explore Family Support",
      },
      schools: {
        title: "For Teachers & School Leaders",
        tagline: "Teacher-in-the-loop: An assistant that multiplies your instructional impact.",
        points: [
          "An approach to identifying shared learning needs and supporting focused classroom teaching.",
          "Teachers remain central to interpreting evidence and choosing classroom priorities.",
          "Discuss device sharing, connectivity and the tools currently available before planning a pilot.",
        ],
        cta: "Explore School & Teacher Support",
      },
    },
    architecturePillars: {
      title: "Designed Around Real Classroom Needs",
      subtitle: "Connectivity, device access, curriculum and language needs shape the design. Confirm implementation details for your setting before rollout.",
      items: [
        {
          title: "Connectivity & Low-Bandwidth Needs",
          description: "Intermittent connectivity is a key design concern. Offline sessions and synchronization must be confirmed for the version used in your pilot; they are not promised by this website.",
        },
        {
          title: "Multi-Child & Shared Device Design",
          description: "Shared phones, tablets and school labs are important use cases. Discuss current account and device support when arranging access.",
        },
        {
          title: "Curriculum Alignment First",
          description: "Ghana’s NaCCA Standards-Based Curriculum (Basic 4–6) is the initial educational reference. Availability is confirmed at subject and lesson level.",
        },
        {
          title: "English & French Direction",
          description: "This public website is available in English and French. Ask which languages are supported by the learning platform for your lesson or pilot.",
        },
      ],
    },
    footer: {
      tagline: "Same learners. Brighter futures.",
      subtagline: "LEARN • GROW • CREATE",
      copyright: "© 2026 FILUMIRE. All rights reserved.",
      description: "FILUMIRE: guided learning and adaptive support for African children.",
      sections: {
        product: {
          title: "Product",
          links: [
            { label: "How It Works", href: "/how-it-works" },
            { label: "Curriculum", href: "/curriculum" },
            { label: "Meet FILU", href: "/how-it-works#meet-filu" },
            { label: "Learning Sequence", href: "/how-it-works#pedagogy" },
          ],
        },
        stakeholders: {
          title: "Solutions",
          links: [
            { label: "For Families", href: "/for-families" },
            { label: "For Schools & Teachers", href: "/for-schools" },
            { label: "Institutional Pilots", href: "/for-schools#pilot" },
          ],
        },
        organization: {
          title: "About",
          links: [
            { label: "Our Mission", href: "/about" },
            { label: "Constitutional Laws", href: "/about#laws" },
            { label: "Potential Partners", href: "/partners" },
            { label: "Contact Us", href: "/contact" },
          ],
        },
        portals: {
          title: "Portals",
          links: [
            { label: "Learner Access", href: "/access#learner" },
            { label: "Parent Access", href: "/access#parent" },
            { label: "Teacher Access", href: "/access#teacher" },
          ],
        },
      },
    },
  },
};

