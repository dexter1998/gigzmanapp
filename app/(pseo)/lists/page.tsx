import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";
import { LISTS } from "@/lib/lists/defs";
import { ListHub } from "@/components/lists/ListHub";

export const metadata: Metadata = {
  title: { absolute: "B2B Business Lists & Databases by Industry | Mantis" },
  description: "Industry databases built from live map data and our own website reads: dentists, clinics, restaurants, hotels, retailers, manufacturers and more — with real counts.",
  alternates: { canonical: `${COMPANY.site}/lists` },
};

export default function ListsHub() {
  return (
    <ListHub
      crumbs={[{ label: "Home", href: "/" }, { label: "Business lists" }]}
      eyebrow="Business lists"
      h1="Business lists and databases, by industry"
      lede="Every list here is counted from businesses we found on Google Maps and checked ourselves — whether they have a website, whether it is really theirs, and what it shows. Pick the businesses you sell to."
      groups={[
        { h2: "Industry databases", items: LISTS.filter((d) => d.kind === "industry" && !d.country) },
        { h2: "Lists for India", intro: "The same lists, limited to Indian cities we cover.", items: LISTS.filter((d) => d.country === "in") },
        { h2: "By website platform", intro: "Detected from each business's own website when we read it — what the site runs now.", items: LISTS.filter((d) => d.kind === "tech") },
      ]}
    />
  );
}
