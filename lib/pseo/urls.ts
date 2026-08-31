import { CITY_BY_SLUG } from "@/lib/pseo/locations";
import { COUNTRY_BY_CODE } from "@/lib/pseo/countries";

/**
 * Every lead-page URL is built here.
 *
 * Before this file the paths were assembled inline in fifteen places, which was survivable while
 * a URL was `/leads/<service>/<city>` and there was one country. It is not survivable now: the
 * country segment has to appear in all fifteen or the section links to its own 404s, and "did I
 * change all fifteen" is not a question worth answering more than once.
 *
 * The country is looked up from the registry rather than passed in, so a caller cannot get it
 * wrong and no existing call site has to learn about it.
 */

/** `in`, `gb`, … — the segment between the service and the city. */
export function countryOf(citySlug: string): string {
  return CITY_BY_SLUG.get(citySlug)?.countryCode ?? "in";
}

export function servicePath(serviceSlug: string): string {
  return `/leads/${serviceSlug}`;
}

export function cityPath(serviceSlug: string, citySlug: string): string {
  return `/leads/${serviceSlug}/${countryOf(citySlug)}/${citySlug}`;
}

export function cityIndexPath(serviceSlug: string, citySlug: string, sub: "areas" | "categories"): string {
  return `${cityPath(serviceSlug, citySlug)}/${sub}`;
}

export function areaPath(serviceSlug: string, citySlug: string, areaSlug: string): string {
  return `${cityPath(serviceSlug, citySlug)}/areas/${areaSlug}`;
}

export function categoryPath(serviceSlug: string, citySlug: string, categorySlug: string): string {
  return `${cityPath(serviceSlug, citySlug)}/categories/${categorySlug}`;
}

/** Page 2 onwards. Page 1 is the bare path — a `/page/1` that duplicates it is a canonical problem,
 *  not a convenience. */
export function paginated(basePath: string, n: number): string {
  return n <= 1 ? basePath : `${basePath}/page/${n}`;
}

/**
 * Validates the `[country]` segment against the city it precedes.
 *
 * The country is redundant with the city — slugs are globally unique — which is exactly why it has
 * to be checked. Without this, `/leads/website-development/us/mumbai` would render the Mumbai page
 * under a URL claiming it is American, and every such variant would be a duplicate of a real page
 * for anything that crawled it.
 */
export function cityForParams(countryCode: string, citySlug: string) {
  const city = CITY_BY_SLUG.get(citySlug);
  if (!city || city.countryCode !== countryCode) return null;
  if (!COUNTRY_BY_CODE.has(countryCode)) return null;
  return city;
}
