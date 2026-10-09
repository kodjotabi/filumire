/*
 * Purchase snapshot hash (Payments Phase 2, step 3): sha256 of the canonical
 * purchase text (packages/payments/obligation.ts). The store recomputes it
 * when sealing an obligation and refuses a mismatch; the 0019 seal trigger
 * will recompute it in SQL. Tamper evidence only: it authorises nothing.
 */
import { createHash } from "node:crypto";
import { canonicalPurchaseText, type PurchaseSnapshotFields } from "../../../packages/payments";

export function purchaseSnapshotHash(fields: PurchaseSnapshotFields): string {
  return createHash("sha256").update(canonicalPurchaseText(fields), "utf8").digest("hex");
}
