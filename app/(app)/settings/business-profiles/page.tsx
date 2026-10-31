import { auth } from "@/auth";
import { listProfiles } from "@/lib/v2/business-profiles";
import { SettingsPage } from "@/components/settings/SettingsShell";
import { BusinessProfiles } from "@/components/settings/BusinessProfiles";

export const metadata = { title: "Business profiles" };
export const dynamic = "force-dynamic";

/**
 * The businesses Mantis finds leads for — saved from a website read in chat or added here. A chat
 * asks which one a search is for and remembers it; the default is used where no chat chose one.
 */
export default async function BusinessProfilesPage() {
  const session = await auth();
  const email = session!.user!.email!;
  const profiles = await listProfiles(email);
  return (
    <SettingsPage
      title="Business profiles"
      sub="What each business sells and who it sells to. Mantis asks which one a search is for, then plans the leads around it."
    >
      <BusinessProfiles initial={profiles} />
    </SettingsPage>
  );
}
