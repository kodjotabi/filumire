import { getCompetency, getLearningIndicator, getStrand, getSubject } from '../../packages/curriculum';
import { getFrameworkSubject } from '../../packages/curriculum-framework';
import { CCP_SOURCE_REGISTRATIONS } from '../../packages/curriculum/ghana-ccp-runtime';
import manifest from '../../packages/curriculum/jhs-private-manifest.json';

export interface JhsSequenceLink {
  from: string;
  to: string;
  kind: 'content-standard-order' | 'sub-strand-order' | 'grade-continuation' | 'b6-bridge';
  fromCode: string;
  toCode: string;
  justification: string;
  sourceFiles: string[];
}
const code = (value: string) => value.replace(/\s/g, '');
const scope = new Set(manifest.map(row => row.competencyId));
const rows = CCP_SOURCE_REGISTRATIONS.filter(row => scope.has(row.id));
const ccpFiles = ['packages/curriculum-framework/ghana-b7-ccp-data.json', 'packages/curriculum-framework/ghana-b89-ccp-data.json'];
const discipline = (row: typeof rows[number]) => getFrameworkSubject(row.subjectId)!.discipline;
const grade = (row: typeof rows[number]) => Number(code(row.officialCode).match(/^B(\d+)/)![1]);
const key = (row: typeof rows[number]) => [discipline(row), ...code(row.officialCode).split('.').slice(1, 3)].join(':');
const links: JhsSequenceLink[] = [];
for (const row of rows) {
  const peers = rows.filter(peer => peer.gradeId === row.gradeId && peer.hierarchy.subStrandId === row.hierarchy.subStrandId);
  const index = peers.findIndex(peer => peer.id === row.id);
  if (index > 0) {
    const previous = peers[index - 1];
    const sameStandard = previous.hierarchy.contentStandardId === row.hierarchy.contentStandardId;
    links.push({ from: previous.id, to: row.id, kind: sameStandard ? 'content-standard-order' : 'sub-strand-order',
      fromCode: previous.officialCode, toCode: row.officialCode,
      justification: `CCP source order within ${row.hierarchy.subStrandId}; ${previous.officialCode} precedes ${row.officialCode}.`,
      sourceFiles: ccpFiles });
  } else {
    const earlier = rows.filter(peer => grade(peer) === grade(row) - 1 && key(peer) === key(row));
    const previous = earlier.at(-1);
    if (previous) links.push({ from: previous.id, to: row.id, kind: 'grade-continuation',
      fromCode: previous.officialCode, toCode: row.officialCode,
      justification: `Consecutive CCP grades in the same subject, strand and sub-strand (${key(row)}); class placement remains guardian-controlled.`,
      sourceFiles: ccpFiles });
  }
}

// Explicit concept continuations, not a "last topic in a similarly named strand" heuristic.
// No source-backed cell, animal-production, digestion or farming bridge is asserted.
const bridges: [string, string, string, string][] = [
  ['computing', 'B7.1.1.1.1', 'competency-gh-computing-b6-1-1-1-5', 'Second-generation computer characteristics precede comparing fourth-generation computers.'],
  ['mathematics', 'B7.1.1.1.3', 'competency-gh-math-b6-1-1-1-5', 'Rounding whole numbers precedes rounding quantities above one billion.'],
  ['english', 'B7.1.1.1.1', 'competency-gh-english-b6-1-6-3-1', 'Speaking to an unfamiliar audience precedes selecting formal/informal register for an audience.'],
  ['science', 'B7.1.1.1.1', 'competency-gh-science-b6-1-2-1-1', 'Recognising properties of solid metal materials supports classifying physical states of materials.'],
  ['science', 'B7.2.1.1.1', 'competency-gh-science-b6-2-1-2-1', 'Rain formation from clouds continues into the repeated water cycle.'],
  ['science', 'B7.2.2.1.1', 'competency-gh-science-b6-2-2-1-2', 'Recognising an organism life cycle supports comparing the stages of a housefly life cycle.'],
  ['science', 'B7.2.3.1.1', 'competency-gh-science-b6-2-2-1-1', 'Plant survival requirements continue into nutrient sources for crop growth.'],
  ['science', 'B7.3.2.1.1', 'competency-gh-science-b6-3-2-1-1', 'Distinguishing a star, planet and satellite precedes identifying inner planets.'],
  ['science', 'B7.3.3.1.1', 'competency-gh-science-b6-3-3-1-1', 'Ecosystem interactions continue into analysing ecosystem components and interactions.'],
  ['science', 'B7.4.1.1.1', 'competency-gh-science-b6-4-1-1-1', 'Identifying renewable and non-renewable energy sources supports identifying forms and transfers of energy.'],
  ['science', 'B7.4.1.2.1', 'competency-gh-science-b6-4-1-2-1', 'Measuring temperature precedes comparing heat transfer through media.'],
  ['science', 'B7.4.2.1.1', 'competency-gh-science-b6-4-1-1-1', 'Renewable and non-renewable energy sources continue into forms of electricity generation.'],
];
for (const [subject, targetCode, from, justification] of bridges) {
  const target = rows.find(row => discipline(row) === subject && code(row.officialCode) === targetCode);
  const primary = getCompetency(from);
  if (!target || !primary) throw Error('Missing live bridge endpoint: ' + from);
  const fromCode = getLearningIndicator(primary.learningIndicatorId)?.id.match(/B6[.\d]+/)?.[0];
  const primaryStrand = getStrand(primary.strandId)!.name.toLowerCase().replace(/[^a-z]/g, '');
  const jhsStrand = getStrand(target.hierarchy.strandId)!.name.toLowerCase().replace(/\(.*\)/, '').replace(/[^a-z]/g, '');
  if (!fromCode || primaryStrand !== jhsStrand || getSubject(primary.subjectId)!.name !== getFrameworkSubject(target.subjectId)!.name)
    throw Error('Bridge must retain the source subject and strand: ' + from);
  links.push({ from, to: target.id, kind: 'b6-bridge', fromCode, toCode: target.officialCode, justification,
    sourceFiles: [...ccpFiles, `packages/curriculum/ghana-b6-${subject}-adaptive.ts`, `packages/curriculum/ghana-b6-${subject}-runtime.ts`] });
}
export const JHS_SEQUENCE_LINKS: readonly JhsSequenceLink[] = links;
export function jhsSequence(competencyId: string) {
  return {
    prerequisites: links.filter(link => link.to === competencyId).map(link => link.from),
    // Primary definitions are never changed, even while JHS mode is on.
    successors: links.filter(link => link.from === competencyId && scope.has(link.from)).map(link => link.to),
  };
}
