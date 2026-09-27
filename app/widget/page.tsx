import { parseTheme } from "@/lib/widget/theme";
import { normaliseSlug } from "@/lib/widget/store";
import { WidgetApp } from "@/components/widget/WidgetApp";

/**
 * The widget, as its own page.
 *
 * It is a route rather than a component because the embed has to work on sites that are not this
 * app — a script tag drops an iframe pointing here, so the host page's CSS, framework and build
 * are all irrelevant. The same page is used inside the dashboard, which means the embedded build
 * is the one that gets exercised daily instead of a second code path nobody looks at.
 *
 * Rendered dynamically: the session decides whether the contact form is shown at all.
 */
export const dynamic = "force-dynamic";

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const flat = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? (v[0] ?? "") : v] as [string, string]]))
  );

  return (
    <WidgetApp
      site={normaliseSlug(flat.get("site"))}
      hostOrigin={flat.get("origin")}
      theme={parseTheme(flat)}
    />
  );
}
