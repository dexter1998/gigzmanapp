import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

declare global {
  var __gigzmanBedrock: BedrockRuntimeClient | undefined;
}

// Nova Pro has no in-region (or Geo cross-region) Bedrock endpoint in ap-south-1 — the
// region every other AWS call in this repo (EC2/SSM for the gosom scraper) uses — so
// this client deliberately points at us-east-1 instead, independent of that region.
// Confirmed live: a Converse call against amazon.nova-pro-v1:0 succeeds in us-east-1
// and fails with a ValidationException in ap-south-1 asking for an inference profile.
const REGION = process.env.BEDROCK_REGION || "us-east-1";

export const bedrock =
  global.__gigzmanBedrock ?? new BedrockRuntimeClient({ region: REGION });

if (process.env.NODE_ENV !== "production") {
  global.__gigzmanBedrock = bedrock;
}

// Native Amazon Nova, not Anthropic-on-Bedrock — Anthropic models on Bedrock are
// third-party, AWS Marketplace-billed (a subscription-activation step per account);
// Nova is first-party with no such gate. Env-configurable so a future model swap
// doesn't need a code change.
export const CHAT_MODEL_ID = process.env.BEDROCK_MODEL_ID || "amazon.nova-pro-v1:0";
