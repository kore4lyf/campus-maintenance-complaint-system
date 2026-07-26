import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

const ANONYMOUS_TOKEN_TTL_DAYS = 90;
const TOKEN_ALG = "HS256";

interface AnonymousTokenClaims {
  sub: string;
  sid: string;
  iat: number;
  exp: number;
}

function resolveSecret(): Uint8Array {
  const dedicated = process.env.ANONYMOUS_TOKEN_SECRET;
  const fallback = process.env.BETTER_AUTH_SECRET;
  const candidate = dedicated && dedicated.length > 0 ? dedicated : fallback;
  if (!candidate || candidate.length < 32) {
    throw new Error(
      "Anonymous token secret is missing. Set ANONYMOUS_TOKEN_SECRET (preferred) or BETTER_AUTH_SECRET with at least 32 characters.",
    );
  }
  if (!dedicated && fallback) {
    process.stderr.write(
      "ANONYMOUS_TOKEN_SECRET not set; falling back to BETTER_AUTH_SECRET. Set a dedicated secret for production deployments.\n",
    );
  }
  return new TextEncoder().encode(candidate);
}

function generateSid(): string {
  return globalThis.crypto.randomUUID();
}

async function signAnonymousToken(args: { userId: string }): Promise<string> {
  const secret = resolveSecret();
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = ANONYMOUS_TOKEN_TTL_DAYS * 24 * 60 * 60;
  const sid = generateSid();
  const token = await new SignJWT({ sid })
    .setProtectedHeader({ alg: TOKEN_ALG, typ: "JWT" })
    .setSubject(args.userId)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(secret);
  return token;
}

async function verifyAnonymousToken(args: {
  token: string;
}): Promise<AnonymousTokenClaims> {
  const secret = resolveSecret();
  try {
    const { payload } = await jwtVerify(args.token, secret, {
      algorithms: [TOKEN_ALG],
    });
    const sub = payload.sub;
    const sid = payload.sid;
    const iat = payload.iat;
    const exp = payload.exp;
    if (typeof sub !== "string" || sub.length === 0) {
      throw new Error("Anonymous token missing subject claim");
    }
    if (typeof sid !== "string" || sid.length === 0) {
      throw new Error("Anonymous token missing sid claim");
    }
    if (typeof iat !== "number" || typeof exp !== "number") {
      throw new Error("Anonymous token missing iat/exp claims");
    }
    return { sub, sid, iat, exp };
  } catch (err) {
    if (err instanceof joseErrors.JOSEError) {
      const code = err.code ?? "JWS_VERIFY_FAILED";
      const mapped = new Error(`Anonymous token invalid: ${code}`);
      (mapped as Error & { code?: string }).code = code;
      throw mapped;
    }
    throw err;
  }
}

export {
  signAnonymousToken,
  verifyAnonymousToken,
  ANONYMOUS_TOKEN_TTL_DAYS,
  TOKEN_ALG,
};
export type { AnonymousTokenClaims };
