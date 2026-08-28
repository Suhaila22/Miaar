import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

// ---------------------------------------------------------------------------
// Password hashing (scrypt, built into Node — no extra dependency needed).
// Stored format: "<saltHex>:<hashHex>"
// ---------------------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  let hashBuffer: Buffer;
  let candidate: Buffer;
  try {
    hashBuffer = Buffer.from(hash, "hex");
    candidate = scryptSync(password, salt, 64);
  } catch {
    return false;
  }
  if (candidate.length !== hashBuffer.length) return false;
  return timingSafeEqual(candidate, hashBuffer);
}

// ---------------------------------------------------------------------------
// Session tokens (JWT stored in an httpOnly cookie).
// ---------------------------------------------------------------------------

function getSessionSecret() {
  if (!ENV.cookieSecret) {
    throw new Error(
      "JWT_SECRET is not configured. Set it to a long random string (e.g. `openssl rand -hex 32`)."
    );
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createSessionToken(
  userId: number,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

export async function verifySessionToken(
  cookieValue: string | undefined | null
): Promise<{ userId: number } | null> {
  if (!cookieValue) return null;

  try {
    const { payload } = await jwtVerify(cookieValue, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    const { userId } = payload as Record<string, unknown>;
    if (typeof userId !== "number") return null;
    return { userId };
  } catch (error) {
    console.warn("[Auth] Session verification failed", String(error));
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) return new Map<string, string>();
  return new Map(Object.entries(parseCookieHeader(cookieHeader)));
}

/**
 * Resolves the signed-in user for an incoming request from either the
 * session cookie or a Bearer token (used as a fallback for browsers that
 * block third-party/iframe cookies).
 */
export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookies(req.headers.cookie);
  let sessionToken = cookies.get(COOKIE_NAME);

  if (!sessionToken) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      sessionToken = authHeader.slice(7);
    }
  }

  const session = await verifySessionToken(sessionToken);
  if (!session) {
    throw ForbiddenError("Invalid session");
  }

  const user = await db.getUserById(session.userId);
  if (!user) {
    throw ForbiddenError("User not found");
  }

  await db.touchLastSignedIn(user.id);

  return user;
}
