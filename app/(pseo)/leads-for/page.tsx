import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { SERVICE_LISTS } from "@/lib/lists/defs";
import { ListHub } from "@/components/lists/ListHub";

export const metadata: Metadata = {
  title: { absolute: "Leads by Service: Find Clients Showing a Buying Signal | Mantis" },
  description: "Leads for SEO, digital marketing, web design, PPC, booking software, WhatsApp marketing and recruitment — businesses whose own websites show they need what you sell.",
  alternates: { canonical: `${COMPANY.site}/leads-for` },
};

export default function LeadsForHub() {
  return (
    <ListHub
      crumbs={[{ label: "Home", href: "/" }, { label: "Leads by service" }]}
      eyebrow="Leads by buying signal"
      h1="Leads for your service, by buying signal"
      lede="A good lead is a business with a reason to buy what you sell. Mantis reads each business's website and finds that reason — no analytics for an SEO agency, no ad tracking for a performance marketer, no online booking for a booking app."
      groups={[{ h2: "Pick what you sell", items: SERVICE_LISTS }]}
    />
  );
}
