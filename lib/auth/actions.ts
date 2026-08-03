"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/config";

export type AuthOk = { ok: true };
export type AuthRedirect = {
  ok: true;
  redirectTo: string;
  message?: string;
};
export type AuthFail = {
  ok: false;
  error: string;
  /**
   * Code from the better-auth error response. Optional, so the form can
   * surface an inline "sign in instead" affordance on USER_ALREADY_EXISTS
   * without re-parsing the message.
   */
  code?: string | undefined;
};

/*
 * Map better-auth error codes to messages that actually tell the user what
 * happened and what to do next. The codes are stable; the messages are
 * tuned for an LASU reporter who hits the form on their phone.
 */
const ERROR_COPY: Record<string, string> = {
  USER_ALREADY_EXISTS:
    "An account with this email already exists. Sign in instead, or use a different email.",
  EMAIL_ALREADY_EXISTS:
    "An account with this email already exists. Sign in instead, or use a different email.",
  USER_NOT_FOUND:
    "We couldn't find an account with that email. Double-check the spelling or sign up.",
  INVALID_EMAIL: "That email address doesn't look right. Check the format and try again.",
  INVALID_PASSWORD: "Password must be at least 8 characters.",
  INVALID_EMAIL_OR_PASSWORD:
    "That email or password didn't match. Try again, or reset your password.",
  FAILED_TO_CREATE_USER:
    "Couldn't create your account right now. Please try again in a moment.",
  TOO_MANY_REQUESTS:
    "Too many attempts. Wait a minute and try again, or contact DICT.",
  EMAIL_NOT_VERIFIED:
    "Please verify your email address before signing in.",
  CREDENTIALS_INVALID:
    "That email or password didn't match. Try again, or reset your password.",
};

/*
 * Duck-typed extraction of the APIError-shape fields without importing
 * a specific BetterAuth class so we tolerate version drift. With
 * `exactOptionalPropertyTypes: true` we have to omit undefined keys rather
 * than assign them explicitly.
 */
function asApiErrorLike(
  err: unknown,
): { code?: string; message?: string } {
  if (err && typeof err === "object") {
    const m = err as { code?: unknown; message?: unknown };
    return {
      ...(typeof m.code === "string" ? { code: m.code } : {}),
      ...(typeof m.message === "string" ? { message: m.message } : {}),
    };
  }
  return {};
}

function friendlyError(
  err: unknown,
  fallback: string,
): { error: string; code?: string } {
  const { code, message } = asApiErrorLike(err);
  if (code && ERROR_COPY[code]) {
    return { error: ERROR_COPY[code]!, code };
  }
  if (message) {
    return code !== undefined
      ? { error: message, code }
      : { error: message };
  }
  return { error: fallback };
}

function resolveRole(
  candidate: string | undefined | null,
): "reporter" | "dicht_admin" | "dicht_technician" | null {
  if (
    candidate === "reporter" ||
    candidate === "dicht_admin" ||
    candidate === "dicht_technician"
  ) {
    return candidate;
  }
  return null;
}

function defaultLandingForRole(
  role: "reporter" | "dicht_admin" | "dicht_technician" | null,
): string {
  if (role === "dicht_admin") return "/admin/queue";
  if (role === "dicht_technician") return "/technician/assignments";
  return "/complaints/mine";
}

export async function signInAction(formData: {
  email: string;
  password: string;
  redirect?: string;
}): Promise<AuthRedirect | AuthFail> {
  try {
    const auth = await getAuth();
    // No `asResponse: true`. better-auth's `nextCookies` plugin intercepts
    // call/response edges and writes the session cookie through
    // `next/headers` `cookies().set(...)` automatically. Manual response
    // parsing was duplicating (and breaking under Next 16's Response shape).
    const result = await auth.api.signInEmail({
      body: { email: formData.email, password: formData.password },
      headers: await headers(),
    });
    const user = result?.user ?? null;
    if (!user) {
      return { ok: false, error: ERROR_COPY.INVALID_EMAIL_OR_PASSWORD! };
    }

    const role = resolveRole((user as unknown as { role?: unknown }).role as string | undefined);
    const roleLabel =
      role === "dicht_admin"
        ? "DICT admin"
        : role === "dicht_technician"
          ? "DICT technician"
          : "reporter";

    const explicitRedirect = formData.redirect?.trim();
    const redirectTo =
      explicitRedirect && explicitRedirect.startsWith("/")
        ? explicitRedirect
        : defaultLandingForRole(role);

    return {
      ok: true,
      redirectTo,
      message: "Signed in",
    };
  } catch (err) {
    const { error, code } = friendlyError(
      err,
      "Sign-in failed",
    );
    return { ok: false, error, code };
  }
}

export async function signUpAction(formData: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthRedirect | AuthFail> {
  try {
    const auth = await getAuth();

    // With `autoSignIn: true` set in lib/auth/config.ts, signUpEmail runs
    // the internal session handshake and the nextCookies plugin writes the
    // session cookie through next/headers cookies().
    const signupResult = await auth.api.signUpEmail({
      body: {
        email: formData.email,
        password: formData.password,
        name: formData.name,
      },
      headers: await headers(),
    });

    if (!signupResult?.user) {
      const inlineError = (
        signupResult as unknown as {
          error?: { code?: string; message?: string };
        }
      )?.error;
      if (inlineError?.code) {
        return {
          ok: false,
          ...friendlyError(
            { code: inlineError.code, message: inlineError.message },
            "Could not create account. Please try again.",
          ),
        };
      }
      return {
        ok: false,
        error: "Could not create account",
      };
    }

    // First-user-is-admin: if this is the first user in the system,
    // promote them to dicht_admin (spec 0004 AC-1).
    const { connect: dbConnect } = await import("@/lib/db/connection");
    const { UserModel } = await import("@/lib/db/models/user");
    await dbConnect();
    const userCount = await UserModel.countDocuments();
    const isFirstUser = userCount <= 1; // <= 1 because BetterAuth just created this user

    let role: "reporter" | "dicht_admin" = "reporter";
    let redirectTo = "/complaints/mine";

    if (isFirstUser) {
      role = "dicht_admin";
      redirectTo = "/admin/queue";
      await UserModel.updateOne(
        { email: formData.email },
        { $set: { role: "dicht_admin" } },
      );
    }

    return {
      ok: true,
      redirectTo,
      message: "Account created",
    };
  } catch (err) {
    const { error, code } = friendlyError(
      err,
      "Could not create account",
    );
    return { ok: false, error, code };
  }
}

export async function signOutAction(): Promise<never> {
  try {
    const auth = await getAuth();
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Even on failure, redirect so the user isn't stuck on the page.
  }
  const cookieJar = await cookies();
  for (const name of [
    "better-auth.session_token",
    "better-auth.session",
    "session",
  ]) {
    if (cookieJar.has(name)) cookieJar.delete(name);
  }
  redirect("/");
}
