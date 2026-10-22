import { JHS_PREVIEW_COMPETENCIES, JHS_PREVIEW_SOURCES } from "../services/content-store/jhs-representative-preview";
import { installRepresentativePreview } from "./fixtures/jhs-representative-preview";
import { runJhsJourneys } from "./fixtures/jhs-journey-runner";
await runJhsJourneys({competencies:JHS_PREVIEW_COMPETENCIES,sources:JHS_PREVIEW_SOURCES,install:installRepresentativePreview,output:"docs/jhs-development/representative-journeys.json"});
