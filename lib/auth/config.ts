import mongoose from "mongoose";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { headers as nextHeaders } from "next/headers";
import { connect } from "@/lib/db/connection";

const REQUIRED_SECRET_LENGTH = 32;

function ensureSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < REQUIRED_SECRET_LENGTH) {
    throw new Error(
      `BETTER_AUTH_SECRET must be set (minimum ${REQUIRED_SECRET_LENGTH} characters). Generate one with: openssl rand -base64 32`,
    );
  }
  return secret;
}

let dbPromise: Promise<NonNullable<typeof mongoose.connection.db>> | null = null;

async function getDbClient(): Promise<NonNullable<typeof mongoose.connection.db>> {
  if (!dbPromise) {
    dbPromise = (async () => {
      await connect();
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Mongoose connection is not initialized");
      }
      return db;
    })();
  }
  return dbPromise;
}

type BetterAuthInstance = ReturnType<typeof betterAuth>;

declare global {
  // eslint-disable-next-line no-var
  var __betterAuth: BetterAuthInstance | undefined;
}

export async function getAuth(): Promise<BetterAuthInstance> {
  if (globalThis.__betterAuth) {
  return globalThis.__betterAuth!;
  }
  const secret = ensureSecret();
  const db = await getDbClient();

  // @ts-expect-error -- better-auth types incompatible with exactOptionalPropertyTypes
  globalThis.__betterAuth = betterAuth({
    secret,
    ...(process.env.BETTER_AUTH_URL ? { baseURL: process.env.BETTER_AUTH_URL } : {}),
    appName: "LASU CMS",
    database: mongodbAdapter(db),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    user: {
      modelName: "User",
      additionalFields: {
        role: {
          type: "string",
          required: false,
          input: false,
        },
        anonymousId: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    plugins: [nextCookies()],
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return globalThis.__betterAuth!;
}

export async function getSession() {
  const auth = await getAuth();
  return auth.api.getSession({ headers: await nextHeaders() });
}

export async function signInEmail(args: {
  body: { email: string; password: string };
}) {
  const auth = await getAuth();
  return auth.api.signInEmail({
    body: args.body,
    headers: await nextHeaders(),
  });
}

export async function signUpEmail(args: {
  body: { email: string; password: string; name: string };
}) {
  const auth = await getAuth();
  return auth.api.signUpEmail({
    body: args.body,
    headers: await nextHeaders(),
  });
}

export async function signOutFromSession() {
  const auth = await getAuth();
  return auth.api.signOut({ headers: await nextHeaders() });
}
