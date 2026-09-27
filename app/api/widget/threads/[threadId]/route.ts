import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  appendMessage, markVisitorRead, messagesFor, threadOwnedBy, tooManyRecently, MAX_MESSAGE_CHARS,
} from "@/lib/widget/store";

/**
 * One conversation, from the visitor's side.
 *
 * Every call re-checks ownership rather than trusting the id in the URL. A thread id is a UUID in
 * a URL the browser has, which is not the same thing as proof — the token (or the signed-in email)
 * is what makes it theirs.
 */
async function identify(req: NextRequest) {
  const session = await auth();
  return { userEmail: session?.user?.email ?? null, token: req.headers.get("x-widget-token") };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const who = await identify(req);
  const thread = await threadOwnedBy(threadId, who);
  if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const messages = await messagesFor(threadId);

  // Opening the thread IS reading it. This is the single fact the whole notification design rests
  // on: an email about a reply is only sent to someone who has not already seen it here, so this
  // write is what cancels a pending notification rather than a separate "mark read" the client
  // might forget to call.
  await markVisitorRead(threadId);

  return NextResponse.json({ thread, messages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const who = await identify(req);
  const thread = await threadOwnedBy(threadId, who);
  if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (thread.status === "closed") return NextResponse.json({ error: "This conversation is closed." }, { status: 409 });

  const { message } = (await req.json()) as { message?: string };
  const body = (message ?? "").trim();
  if (!body) return NextResponse.json({ error: "Write a message first." }, { status: 400 });

  // Same guard as starting a conversation, but roomier: a real back-and-forth is many messages in
  // a few minutes, and throttling that would be throttling the thing we want to happen.
  if (who.token && (await tooManyRecently(thread.site_slug, who.token, 30, 10))) {
    return NextResponse.json({ error: "Slow down a moment — I'm reading." }, { status: 429 });
  }

  const saved = await appendMessage(threadId, "visitor", body.slice(0, MAX_MESSAGE_CHARS));
  return NextResponse.json({ message: saved });
}
