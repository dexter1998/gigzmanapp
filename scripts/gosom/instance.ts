import { EC2Client, DescribeInstancesCommand, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { SSMClient, SendCommandCommand, GetCommandInvocationCommand } from "@aws-sdk/client-ssm";

/**
 * Thin driver for the gosom EC2 box.
 *
 * This lives in scripts, not in the app: the product no longer talks to EC2 at all — lead detail
 * comes from Place Details in one call — and dragging the AWS SDK back into the serverless bundle
 * for a bulk job that runs from a laptop would be paying for it on every request.
 *
 * NOT process.env.AWS_REGION. Vercel sets that to whatever region a lambda happens to run in, so
 * SCRAPER_REGION exists to say which region the instance is actually in.
 */
const REGION = process.env.SCRAPER_REGION || "ap-south-1";
const INSTANCE_ID = process.env.GOSOM_EC2_INSTANCE_ID;

const ec2 = new EC2Client({ region: REGION });
const ssm = new SSMClient({ region: REGION });

export function instanceId(): string {
  if (!INSTANCE_ID) throw new Error("GOSOM_EC2_INSTANCE_ID is not set");
  return INSTANCE_ID;
}

export async function ensureRunning(): Promise<string> {
  const id = instanceId();
  for (let i = 0; i < 30; i++) {
    const desc = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [id] }));
    const state = desc.Reservations?.[0]?.Instances?.[0]?.State?.Name;
    if (state === "running") return state;
    if (state === "stopped") await ec2.send(new StartInstancesCommand({ InstanceIds: [id] }));
    process.stdout.write(`  instance ${state}…\n`);
    await new Promise((r) => setTimeout(r, 10_000));
  }
  throw new Error("instance did not reach running state");
}

/** Runs shell on the instance and waits for it. Each array element is its own shell line — SSM does
 *  not join them, which is what broke an earlier version that split one docker invocation across
 *  several elements. */
export async function run(commands: string[], timeoutSeconds = 3600): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  const id = instanceId();
  const sent = await ssm.send(
    new SendCommandCommand({
      InstanceIds: [id],
      DocumentName: "AWS-RunShellScript",
      Parameters: { commands },
      TimeoutSeconds: Math.min(timeoutSeconds, 172800),
    })
  );
  const commandId = sent.Command?.CommandId;
  if (!commandId) throw new Error("SSM returned no command id");

  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5_000));
    let inv;
    try {
      inv = await ssm.send(new GetCommandInvocationCommand({ CommandId: commandId, InstanceId: id }));
    } catch {
      continue; // InvocationDoesNotExist for a moment right after SendCommand
    }
    if (inv.Status === "InProgress" || inv.Status === "Pending" || inv.Status === "Delayed") continue;
    return {
      ok: inv.Status === "Success",
      stdout: inv.StandardOutputContent ?? "",
      stderr: inv.StandardErrorContent ?? "",
    };
  }
  throw new Error("SSM command timed out");
}
