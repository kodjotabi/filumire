/*
 * Product catalogue (Payments Phase 2, step 3). The ONLY source of a purchase
 * price: obligation creation takes a product code, never an amount.
 *
 * No commercial pricing is approved, so the production catalogue is empty and
 * live. A SandboxCatalogue holds fixtures that tests define themselves (none
 * are defined here); it accepts sandbox products with a "sandbox_" code only.
 */
import {
  PaymentError,
  SANDBOX_PRODUCT_PREFIX,
  validateCatalogueProduct,
  type CatalogueProduct,
  type PaymentMode,
} from "../../../packages/payments";

export interface ProductCatalogue {
  readonly mode: PaymentMode;
  resolve(code: string): CatalogueProduct | null;
}

/* Zero approved products. Any obligation request against it is refused. */
export const PRODUCTION_CATALOGUE: ProductCatalogue = Object.freeze({
  mode: "live" as const,
  resolve: () => null,
});

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

export class SandboxCatalogue implements ProductCatalogue {
  readonly mode = "sandbox" as const;
  private readonly products = new Map<string, CatalogueProduct>();

  constructor(products: readonly CatalogueProduct[]) {
    for (const product of products) {
      validateCatalogueProduct(product);
      if (product.mode !== "sandbox" || !product.code.startsWith(SANDBOX_PRODUCT_PREFIX)) {
        throw new PaymentError("SANDBOX_ONLY", `Sandbox catalogue accepts only sandbox products with a "${SANDBOX_PRODUCT_PREFIX}" code.`);
      }
      if (this.products.has(product.code)) {
        throw new PaymentError("INVALID_OBLIGATION", `Duplicate catalogue product "${product.code}".`);
      }
      this.products.set(product.code, deepFreeze(structuredClone(product)));
    }
  }

  resolve(code: string): CatalogueProduct | null {
    const found = this.products.get(code);
    return found ? structuredClone(found) : null;
  }
}
