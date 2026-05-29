import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

const COOKIE_NAME = "sovereign_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function token(): string {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  if (!pw || !secret) {
    throw new Error("ADMIN_PASSWORD and SESSION_SECRET must be set");
  }
  return createHash("sha256").update(`${pw}::${secret}`).digest("hex");
}

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function isLoggedIn(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) return false;
  const c = await cookies();
  const v = c.get(COOKIE_NAME)?.value;
  if (!v) return false;
  try {
    return safeEq(v, token());
  } catch {
    return false;
  }
}

export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  if (!pw) return false;
  return safeEq(input, pw);
}

export async function login(): Promise<void> {
  const c = await cookies();
  c.set({
    name: COOKIE_NAME,
    value: token(),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function logout(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}
