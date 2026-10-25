import type { JhsAutomaticTopic } from './jhs-automatic-assessment';
import { JHS_PREVIEW_AUTOMATIC } from './jhs-automatic-items-preview';
import { JHS_B7_SCIENCE_AUTOMATIC_1 } from './jhs-automatic-items-b7-science-1';
import { JHS_B7_SCIENCE_AUTOMATIC_2 } from './jhs-automatic-items-b7-science-2';

/* Automatic questions for every Basic 7-9 topic in the private scope, by competency id. */
export const JHS_AUTOMATIC_TOPICS: Record<string, JhsAutomaticTopic> = {
  ...JHS_PREVIEW_AUTOMATIC,
  ...JHS_B7_SCIENCE_AUTOMATIC_1,
  ...JHS_B7_SCIENCE_AUTOMATIC_2,
};
