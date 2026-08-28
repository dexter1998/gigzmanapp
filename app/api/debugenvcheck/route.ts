import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    clientIdLen: process.env.GOOGLE_CLIENT_ID?.length ?? 0,
    clientSecretLen: process.env.GOOGLE_CLIENT_SECRET?.length ?? 0,
    authUrl: process.env.AUTH_URL ?? null,
  });
}
