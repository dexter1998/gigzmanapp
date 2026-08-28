"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function googleSignIn() {
  await signIn("google", { redirectTo: "/home" });
}

// Credentials sign-in throws an AuthError (not a redirect) on failure — caught here so the
// client gets a plain error string instead of an unhandled server-action exception. A
// successful call still redirects via the thrown NEXT_REDIRECT, which must be re-thrown as-is.
export async function emailPasswordSignIn(email: string, password: string): Promise<string | undefined> {
  try {
    await signIn("email-password", { email, password, redirectTo: "/home" });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Incorrect email or password, or the account isn't verified yet.";
    }
    throw error;
  }
}
