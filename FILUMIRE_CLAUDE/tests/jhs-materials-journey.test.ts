import { MATERIALS_COMPETENCIES, MATERIALS_SOURCES } from "../services/content-store/ghana-b7-science-materials-batch";
import { installMaterialsBatch } from "./fixtures/jhs-materials-batch";
import { runJhsJourneys } from "./fixtures/jhs-journey-runner";
await runJhsJourneys({competencies:MATERIALS_COMPETENCIES,sources:MATERIALS_SOURCES,install:installMaterialsBatch,output:"docs/jhs-development/batch01-journeys.json"});
