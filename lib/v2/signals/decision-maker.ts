/**
 * The founder / concerned person and their LinkedIn, cheapest source first:
 *
 *   1. The company's own site (team / about / founders page) — the enricher already reads names
 *      and roles there. A named person with a decision role is the best answer and costs nothing.
 *   2. That name → their LinkedIn: one Exa search "<name> <company> linkedin"; a linkedin.com/in
 *      result whose title carries the company is kept.
 *   3. No name on the site → Exa people search "<company> <city> founder / director linkedin"
 *      (sources/person.ts); the profile title "Name - Role - Company | LinkedIn" must name the
 *      company. The company LinkedIn slug, when known, is added to the query to disambiguate.
 *
 * Not done, on purpose: logging in to LinkedIn or reading a company's "People" tab (needs an
 * account; against LinkedIn's terms). Saved as the `person` fact, so one lookup per company.
 */

import { exaSearch } from "../sources/exa";
import { parseLinkedinTitle, personViaExa } from "../sources/person";

export type DecisionMaker = { name: string; role: string | null; linkedin: string | null; via: "site" | "site+exa" | "exa"; confidence: number };

const DECIDER = /(founder|co-?founder|owner|proprietor|director|ceo|managing|partner|principal|president|\bmd\b|cto|coo|cmo|head|chief)/i;

export async function findDecisionMaker(input: {
  company: string; domain: string | null; city: string | null; companyLinkedin?: string | null;
  sitePerson?: { name: string; role: string | null } | null; entityKey: string; placeType: string | null;
}): Promise<DecisionMaker | null> {
  const sp = input.sitePerson;
  if (sp?.name) {
    const r = await exaSearch(`${sp.name} ${input.company} linkedin`, { numResults: 5 }).catch(() => null);
    const first = sp.name.toLowerCase().split(/\s+/)[0];
    const brand = (input.domain ?? input.company).toLowerCase().split(".")[0].replace(/[^a-z0-9]/g, "").slice(0, 6);
    const hit = (r?.results ?? []).find((x) => {
      if (!/linkedin\.com\/in\//i.test(x.url) || !x.title) return false;
      const p = parseLinkedinTitle(x.title);
      const hay = `${p?.company ?? ""} ${p?.role ?? ""} ${x.title}`.toLowerCase().replace(/[^a-z0-9 ]/g, "");
      return !!p && p.name.toLowerCase().includes(first) && (hay.replace(/ /g, "").includes(brand) || hay.includes(input.company.toLowerCase().split(/\s+/)[0]));
    });
    return { name: sp.name, role: sp.role, linkedin: hit ? hit.url.split("?")[0] : null, via: hit ? "site+exa" : "site", confidence: DECIDER.test(sp.role ?? "") ? 0.9 : 0.7 };
  }
  const slug = input.companyLinkedin?.match(/linkedin\.com\/company\/([^/?#]+)/i)?.[1]?.replace(/-/g, " ");
  const p = await personViaExa({ company: slug && slug.length > input.company.length ? slug : input.company, city: input.city, entityKey: input.entityKey, placeType: input.placeType }).catch(() => null);
  if (!p) return null;
  // With no name from the site, a search hit must say it's a decision-maker, and must be a person:
  // replays returned a namesake abroad ("steve b." for a Gurugram AC repairer) and the business's
  // own page posing as a profile ("The Studs Sports Bar").
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const isCompany = norm(p.name).includes(norm(input.company).slice(0, 8)) || /\b(pvt|ltd|llp|hotel|restaurant|bar|cafe|services|solutions|technologies|international)\b/i.test(p.name);
  if (isCompany || !DECIDER.test(p.role ?? "")) return null;
  return { name: p.name, role: p.role, linkedin: p.linkedin, via: "exa", confidence: p.confidence };
}
