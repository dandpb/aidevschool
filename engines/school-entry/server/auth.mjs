import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password, hash) {
  if (
    typeof password !== "string" ||
    password.length > 1024 ||
    !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash ?? "")
  )
    return false;
  const [, salt, key] = hash.split(":");
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(key, "hex"),
  );
}
export const token = () => randomBytes(32).toString("hex");
