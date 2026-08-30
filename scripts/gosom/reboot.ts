import { EC2Client, RebootInstancesCommand } from "@aws-sdk/client-ec2";
import { instanceId } from "./instance";
const ec2 = new EC2Client({ region: process.env.SCRAPER_REGION || "ap-south-1" });
async function main() {
  const id = instanceId();
  await ec2.send(new RebootInstancesCommand({ InstanceIds: [id] }));
  console.log("reboot requested for", id);
}
main().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1); });
