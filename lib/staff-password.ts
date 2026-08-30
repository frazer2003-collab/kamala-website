import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const MIN_PASSWORD_LENGTH = 8;

export function isStaffPasswordValid(password: string) {
  return password.trim().length >= MIN_PASSWORD_LENGTH;
}

export function staffPasswordValidationMessage() {
  return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
}

export async function hashStaffPassword(password: string) {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(password, salt, KEY_BYTES)) as Buffer;
  return `scrypt:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

export async function verifyStaffPassword(password: string, storedHash: string) {
  if (!storedHash.startsWith("scrypt:")) {
    return false;
  }

  const [, saltPart, hashPart] = storedHash.split(":");
  if (!saltPart || !hashPart) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltPart, "base64url");
    expected = Buffer.from(hashPart, "base64url");
  } catch {
    return false;
  }

  if (expected.length !== KEY_BYTES) {
    return false;
  }

  const derived = (await scryptAsync(password, salt, KEY_BYTES)) as Buffer;
  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}
