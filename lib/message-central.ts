// Message Central's VerifyNow OTP API — chosen over MSG91 specifically because it runs under
// Message Central's own pre-approved DLT entity for its OTP-only "verification" product, so a
// customer does NOT need to complete their own India DLT/TRAI registration before sending OTPs
// (unlike a normal custom-template SMS route, which does). This tradeoff — faster to go live,
// narrower/OTP-only scope — was an explicit choice; see the plan doc.
//
// Endpoint shapes below are the best publicly documented ones as of this integration (no
// official first-party docs page was fetchable — cert error on messagecentral.com — so these
// come from Message Central's own blog/GitHub examples and third-party write-ups). Re-confirm
// against the live Message Central dashboard once a real account exists, same caveat this repo
// already applies to any third-party API integration (see app/api/leads/find/route.ts's Places
// API comments for the same discipline).
import { recordApiFailure } from "@/lib/api-alerts";

const BASE = "https://cpaas.messagecentral.com";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function getAuthToken(): Promise<string> {
  const customerId = requireEnv("MESSAGE_CENTRAL_CUSTOMER_ID");
  const key = requireEnv("MESSAGE_CENTRAL_KEY"); // the base64-encoded password Message Central issues in its dashboard
  const url = `${BASE}/auth/v1/authentication/token?country=IN&customerId=${encodeURIComponent(customerId)}&key=${encodeURIComponent(key)}&scope=NEW`;
  const res = await fetch(url, { method: "GET", headers: { accept: "*/*" } });
  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    await recordApiFailure("message_central", "auth token request failed", { status: res.status });
    throw new Error("Message Central auth token request failed");
  }
  return data.token;
}

export async function sendPhoneOtp(phoneE164: string): Promise<{ verificationId: string }> {
  const token = await getAuthToken();
  const customerId = requireEnv("MESSAGE_CENTRAL_CUSTOMER_ID");
  const mobileNumber = phoneE164.replace(/^91/, ""); // Message Central takes countryCode and the bare number separately
  const url = `${BASE}/verification/v2/verification/send?countryCode=91&customerId=${encodeURIComponent(customerId)}&flowType=SMS&mobileNumber=${mobileNumber}&otpLength=6`;

  const res = await fetch(url, { method: "POST", headers: { authToken: token } });
  const data = (await res.json()) as { responseCode?: number; message?: string; data?: { verificationId?: string } };
  if (data.responseCode !== 200 || !data.data?.verificationId) {
    await recordApiFailure("message_central", data.message || "OTP send failed", { responseCode: data.responseCode });
    throw new Error(data.message || "Message Central OTP send failed");
  }
  return { verificationId: data.data.verificationId };
}

export async function verifyPhoneOtp(phoneE164: string, verificationId: string, code: string): Promise<boolean> {
  const token = await getAuthToken();
  const customerId = requireEnv("MESSAGE_CENTRAL_CUSTOMER_ID");
  const mobileNumber = phoneE164.replace(/^91/, "");
  const url = `${BASE}/verification/v2/verification/validateOtp?countryCode=91&mobileNumber=${mobileNumber}&verificationId=${encodeURIComponent(verificationId)}&customerId=${encodeURIComponent(customerId)}&code=${encodeURIComponent(code)}`;

  const res = await fetch(url, { method: "POST", headers: { authToken: token } });
  const data = (await res.json()) as { data?: { verificationStatus?: string } };
  return data.data?.verificationStatus === "VERIFICATION_COMPLETED";
}
