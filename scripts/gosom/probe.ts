import { SSMClient, SendCommandCommand, GetCommandInvocationCommand, DescribeInstanceInformationCommand } from "@aws-sdk/client-ssm";
import { ensureRunning, instanceId } from "./instance";

const REGION = process.env.SCRAPER_REGION || "ap-south-1";
const ssm = new SSMClient({ region: REGION });

async function main() {
  const id = instanceId();
  console.log("instance:", id, "region:", REGION);
  console.log("ec2 state:", await ensureRunning());

  const info = await ssm.send(new DescribeInstanceInformationCommand({
    Filters: [{ Key: "InstanceIds", Values: [id] }],
  }));
  const list = info.InstanceInformationList ?? [];
  console.log("SSM-managed:", list.length > 0);
  if (list[0]) console.log("  agent:", list[0].AgentVersion, "| ping:", list[0].PingStatus, "| platform:", list[0].PlatformName, list[0].PlatformVersion);
  if (list.length === 0) {
    console.log("  -> the SSM agent is not reporting: either not installed, or the instance has no IAM role with AmazonSSMManagedInstanceCore.");
    return;
  }

  const sent = await ssm.send(new SendCommandCommand({
    InstanceIds: [id], DocumentName: "AWS-RunShellScript",
    Parameters: { commands: ["uname -m", "nproc", "docker --version 2>/dev/null || echo NO_DOCKER"] },
  }));
  const cid = sent.Command!.CommandId!;
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const inv = await ssm.send(new GetCommandInvocationCommand({ CommandId: cid, InstanceId: id }));
      if (["InProgress", "Pending", "Delayed"].includes(inv.Status ?? "")) continue;
      console.log("\nstatus:", inv.Status, "| code:", inv.ResponseCode);
      console.log("stdout:", (inv.StandardOutputContent ?? "").trim());
      console.log("stderr:", (inv.StandardErrorContent ?? "").trim().slice(0, 400));
      console.log("details:", inv.StatusDetails);
      return;
    } catch (e) { if (i > 4) console.log("poll err:", String(e).slice(0, 160)); }
  }
}
main().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
