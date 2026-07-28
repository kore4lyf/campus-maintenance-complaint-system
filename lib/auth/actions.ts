"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/config";
import { connect } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/user";

export type AuthOk = { ok: true };
export type AuthRedirect = { ok: true; redirectTo: string };
export type AuthFail = { ok: false; error: string };

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("invalid email or password") ||
      msg.includes("invalid_password") ||
      msg.includes("invalid email")
    ) {
      return "Invalid email or password";
    }
    if (msg.includes("user_already_exists") || msg.includes("duplicate")) {
      return "An account with this email already exists";
    }
    if (msg.includes("password")) {
      return "Password must be at least 8 characters";
    }
    return "Authentication failed. Please try again.";
  }
  return "Authentication failed. Please try again.";
}

function defaultLandingForRole(
  role: "reporter" | "dicht_admin" | "dicht_technician" | null,
): string {
  if (role === "dicht_admin") return "/admin/queue";
  if (role === "dicht_technician") return "/technician/queue";
  return "/complaints/mine";
}

export async function signInAction(formData: {
  email: string;
  password: string;
  redirect?: string;
}): Promise<AuthRedirect | AuthFail> {
  try {
    const auth = await getAuth();
    const result = await auth.api.signInEmail({
      body: { email: formData.email, password: formData.password },
      headers: await headers(),
    });
    if (!result?.user) {
      return { ok: false, error: "Invalid email or password" };
    }
    const role = resolveRole((result.user as Record<string, unknown>).role as string);
    const explicitRedirect = formData.redirect?.trim();
    const redirectTo =
      explicitRedirect && explicitRedirect.startsWith("/")
        ? explicitRedirect
        : defaultLandingForRole(role);
    return { ok: true, redirectTo };
  } catch (err) {
    return { ok: false, error: extractErrorMessage(err) };
  }
}

export async function signUpAction(formData: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthRedirect | AuthFail> {
  try {
    const auth = await getAuth();
    const result = await auth.api.signUpEmail({
      body: {
        email: formData.email,
        password: formData.password,
        name: formData.name,
      },
      headers: await headers(),
    });
    if (!result?.user) {
      return { ok: false, error: "Could not create account" };
    }
    await setRoleReporter(formData.email);
    return { ok: true, redirectTo: "/complaints/mine" };
  } catch (err) {
    return { ok: false, error: extractErrorMessage(err) };
  }
}

export async function signOutAction(): Promise<never> {
  try {
    const auth = await getAuth();
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Even on failure, redirect so the user is not stuck on the page.
  }
  redirect("/");
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

async function setRoleReporter(email: string): Promise<void> {
  await connect();
  await UserModel.findOneAndUpdate(
    { email },
    { $set: { role: "reporter" } },
  );
}
