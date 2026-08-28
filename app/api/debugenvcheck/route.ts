import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    clientId: process.env.GOOGLE_CLIENT_ID ?? null,
    authUrl: process.env.AUTH_URL ?? null,
  });
}
