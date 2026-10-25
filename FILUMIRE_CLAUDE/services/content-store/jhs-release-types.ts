import type {CompetencyDefinition} from '../../packages/curriculum';
import type {LearningContent} from '../../packages/content';
export type CurriculumApproval={role:'subject_educator'|'french_reviewer';reviewerId:string;evidenceSha256:string;reviewedBundleSha256:string};
export type ApprovedJhsUnit={competency:CompetencyDefinition;content:LearningContent[];candidateSha256:string;fingerprint:string;approvals:CurriculumApproval[]};
export type ApprovedJhsRelease={schemaVersion:1;version:string;units:ApprovedJhsUnit[]};
