import {
  GHANA_B4_ENGLISH_STRAND1_ADAPTIVE_SPECS,
  type GhanaB4EnglishAdaptiveSpec,
} from "./ghana-b4-english-adaptive";

import {
  GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS,
  type GhanaB4EnglishStrand2Spec,
} from "./ghana-b4-english-strand2-adaptive";

import {
  GHANA_B4_ENGLISH_STRAND3_ADAPTIVE_SPECS,
  type GhanaB4EnglishStrand3Spec,
} from "./ghana-b4-english-strand3-adaptive";

import {
  GHANA_B4_ENGLISH_STRAND4_ADAPTIVE_SPECS,
  type GhanaB4EnglishStrand4Spec,
} from "./ghana-b4-english-strand4-adaptive";

import {
  GHANA_B4_ENGLISH_STRAND5_ADAPTIVE_SPECS,
  type GhanaB4EnglishStrand5Spec,
} from "./ghana-b4-english-strand5-adaptive";

import {
  GHANA_B4_ENGLISH_STRAND6_ADAPTIVE_SPECS,
  type GhanaB4EnglishStrand6Spec,
} from "./ghana-b4-english-strand6-adaptive";

export type GhanaB4EnglishProductionSpec =
  | GhanaB4EnglishAdaptiveSpec
  | GhanaB4EnglishStrand2Spec
  | GhanaB4EnglishStrand3Spec
  | GhanaB4EnglishStrand4Spec
  | GhanaB4EnglishStrand5Spec
  | GhanaB4EnglishStrand6Spec;

export const GHANA_B4_ENGLISH_PRODUCTION_SPECS:
  GhanaB4EnglishProductionSpec[] = [
  ...GHANA_B4_ENGLISH_STRAND1_ADAPTIVE_SPECS,
  ...GHANA_B4_ENGLISH_STRAND2_ADAPTIVE_SPECS,
  ...GHANA_B4_ENGLISH_STRAND3_ADAPTIVE_SPECS,
  ...GHANA_B4_ENGLISH_STRAND4_ADAPTIVE_SPECS,
  ...GHANA_B4_ENGLISH_STRAND5_ADAPTIVE_SPECS,
  ...GHANA_B4_ENGLISH_STRAND6_ADAPTIVE_SPECS,
];

if (
  GHANA_B4_ENGLISH_PRODUCTION_SPECS.length !== 131
) {
  throw new Error(
    `Expected 131 Ghana B4 English production specifications, found ${GHANA_B4_ENGLISH_PRODUCTION_SPECS.length}.`,
  );
}