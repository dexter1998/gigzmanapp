import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { componentScores, pipelineScores } from "@/lib/v2/confidence";

/**
 * Every component's and pipeline's confidence, for choosing and for review. Staff only: the rows
 * name the internal sources and their per-call cost, which no customer account may read.
 */
export async function GET() {
  await requireAdmin();
  return NextResponse.json({ components: await componentScores(), pipelines: await pipelineScores() });
}
