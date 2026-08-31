import { auth } from "@/auth";
import { notFound } from "next/navigation";

/**
 * The admin gate. An env-var allowlist rather than a role column: there is exactly one admin
 * today, the list changes by deploy (deliberate friction), and no user-facing surface should
 * even know an admin concept exists.
 *
 * Outsiders get 404, not 403 — a 403 confirms there is something here to be denied.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "tarun@gigzman.com")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function requireAdmin(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) notFound();
  return email;
}
