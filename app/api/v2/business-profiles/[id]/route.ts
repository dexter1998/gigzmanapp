import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isV2Email } from "@/lib/v2";
import { cleanFields, deleteProfile, getProfile, setDefault, updateProfile } from "@/lib/v2/business-profiles";

async function me() {
  const session = await auth();
  const email = session?.user?.email;
  return email && isV2Email(email) ? email : null;
}

/** Edit fields, or `{ isDefault: true }` to make it the default business. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await me();
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.isDefault === true && !(await setDefault(email, id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const f = cleanFields(body);
  const profile = Object.keys(f).length ? await updateProfile(email, id, f) : await getProfile(email, id);
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ profile });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await me();
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await deleteProfile(email, id))) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
