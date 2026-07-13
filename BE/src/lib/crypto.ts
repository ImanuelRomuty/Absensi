import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match?.[1] || !match[2]) {
    throw new Error(`Invalid duration: ${duration}`);
  }
  const value = Number(match[1]);
  const unit = match[2] as "s" | "m" | "h" | "d";
  const multipliers = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  } as const;
  return value * multipliers[unit];
}
