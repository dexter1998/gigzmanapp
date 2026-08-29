import { COMPANY } from "@/lib/company";

/**
 * IndexNow — tells Bing, Yandex, Naver, Seznam and Yep that a URL is new or changed.
 *
 * **Google does not support IndexNow** and has not adopted it despite testing since 2021, so this
 * does nothing for Google rankings. It is here because it is nearly free and it does shorten
 * discovery on the engines that do support it.
 *
 * Not to be confused with Google's Indexing API, which is scoped to JobPosting and BroadcastEvent
 * only — submitting ordinary pages there violates its terms and risks losing access. We don't use
 * it, and shouldn't.
 *
 * Pinged only when a page is genuinely newly published. Re-submitting unchanged URLs on a timer is
 * the same manufactured-activity signal as a restamped sitemap lastmod.
 */
const KEY = "7bff6f9fcaee493eca9820d1248f6582";

export async function submitToIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number }> {
  if (urls.length === 0) return { ok: true };
  const host = new URL(COMPANY.site).hostname;

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: KEY,
        keyLocation: `${COMPANY.site}/${KEY}.txt`,
        urlList: urls.slice(0, 10000),
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    // Discovery is a nice-to-have; it must never fail the refresh job that called it.
    console.error("IndexNow submit failed", err);
    return { ok: false };
  }
}
