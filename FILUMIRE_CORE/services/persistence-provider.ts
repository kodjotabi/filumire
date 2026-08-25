import type { PersistenceStore } from "./persistence";

import { memoryPersistence } from "./persistence-memory";
import { postgresPersistence } from "./persistence-postgres";

const provider =
  process.env.FILUMIRE_PERSISTENCE ?? "memory";

export const persistenceStore: PersistenceStore =
  provider === "postgres"
    ? postgresPersistence
    : memoryPersistence;