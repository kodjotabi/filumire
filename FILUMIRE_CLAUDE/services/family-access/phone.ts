/** Ghana mobile syntax, not proof of assignment, ownership or a carrier. */
export function normaliseGhanaMobile(value: unknown): string {
  if (typeof value !== "string" || value.length > 32 || !/^[+0-9 ()-]+$/.test(value)) {
    throw new Error("invalid_phone");
  }
  let number = value.replace(/[ ()-]/g, "");
  if (number.startsWith("00233")) number = `+233${number.slice(5)}`;
  else if (/^0\d{9}$/.test(number)) number = `+233${number.slice(1)}`;
  else if (/^233\d{9}$/.test(number)) number = `+${number}`;
  // Broad mobile syntax ranges; not an allocation/carrier registry or ownership check.
  if (!/^\+233[25]\d{8}$/.test(number)) throw new Error("invalid_phone");
  return number;
}
