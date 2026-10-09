/*
 * Money for FILUMIRE payments (Payments Phase 2, step 1).
 *
 * Amounts are ALWAYS integer minor units (pesewas for GHS). No payment
 * amount is ever held in, computed with or converted through a JavaScript
 * floating-point number. Major-unit input ("12.50") is accepted only as a
 * decimal STRING and parsed digit by digit.
 */

/* Currencies FILUMIRE accepts. Ghana cedi only for now. */
export const SUPPORTED_CURRENCIES = ["GHS"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/* Minor units per major unit (pesewas per cedi). */
const MINOR_DIGITS: Record<CurrencyCode, number> = { GHS: 2 };

export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export class MoneyError extends Error {}

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/* A non-negative safe integer number of minor units. */
export function assertMinorUnits(amountMinor: unknown, label = "amountMinor"): asserts amountMinor is number {
  if (typeof amountMinor !== "number" || !Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new MoneyError(`${label} must be a non-negative integer number of minor units (got ${String(amountMinor)}).`);
  }
}

export function money(amountMinor: number, currency: string): Money {
  assertMinorUnits(amountMinor);
  if (!isSupportedCurrency(currency)) {
    throw new MoneyError(`Unsupported currency "${currency}".`);
  }
  return Object.freeze({ amountMinor, currency });
}

/*
 * "12.50" -> 1250 pesewas. Accepts digits with an optional decimal point and
 * at most the currency's minor digits. Rejects numbers (not strings),
 * negatives, exponents, separators and excess precision.
 */
export function parseMajorAmount(text: string, currency: string): Money {
  if (typeof text !== "string") {
    throw new MoneyError("Major amounts must be given as decimal strings, never as numbers.");
  }
  if (!isSupportedCurrency(currency)) {
    throw new MoneyError(`Unsupported currency "${currency}".`);
  }
  const digits = MINOR_DIGITS[currency];
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (!match) {
    throw new MoneyError(`"${text}" is not a plain decimal amount.`);
  }
  const fraction = match[2] ?? "";
  if (fraction.length > digits) {
    throw new MoneyError(`"${text}" has more than ${digits} decimal places.`);
  }
  const minorText = match[1] + fraction.padEnd(digits, "0");
  const amountMinor = Number(minorText.replace(/^0+(?=\d)/, ""));
  return money(amountMinor, currency);
}

/* 1250 -> "12.50" (display only; built from integer digits). */
export function formatMajorAmount(value: Money): string {
  const digits = MINOR_DIGITS[value.currency];
  const text = String(value.amountMinor).padStart(digits + 1, "0");
  return `${text.slice(0, -digits)}.${text.slice(-digits)}`;
}

export function sameMoney(a: Money, b: Money): boolean {
  return a.amountMinor === b.amountMinor && a.currency === b.currency;
}
