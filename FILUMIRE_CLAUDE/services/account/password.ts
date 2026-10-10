import {
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

/*
 * Password hashing for built-in FILUMIRE accounts, using Node's
 * scrypt (memory-hard, no extra dependency). Stored format:
 *
 *   scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
 *
 * Parameters are stored with each hash so they can be raised
 * later without invalidating existing passwords.
 */
const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// 128 * N * r bytes; Node's default 32 MiB ceiling is exactly
// N=2^15, r=8, so allow headroom.
const MAX_MEMORY = 64 * 1024 * 1024;

export const PASSWORD_MAX_LENGTH = 128;

function derive(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      keyLength,
      { N: n, r, p, maxmem: MAX_MEMORY },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(
  password: string,
): Promise<string> {
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error("Password is too long.");
  }

  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(
    password,
    salt,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    KEY_LENGTH,
  );

  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return false;
  }

  const parts = stored.split("$");

  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");

  if (
    !Number.isInteger(n) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    salt.length === 0 ||
    expected.length === 0
  ) {
    return false;
  }

  const actual = await derive(
    password,
    salt,
    n,
    r,
    p,
    expected.length,
  );

  return timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | undefined;

/*
 * Spends the same work as a real check when the login does not
 * exist, so response timing does not reveal which usernames and
 * email addresses have accounts.
 */
export async function verifyAgainstDummy(
  password: string,
): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}
