/** gosom's ingest used to own this table; it now lives in lib/category-resolve.ts because chat
 *  needs exactly the same phrase→place-type resolution. Re-exported under the old name so the
 *  ingest reads as what it is. */
export { resolveCategoryPhrase as gosomCategoryToPlaceType, normalizeLabel } from "@/lib/category-resolve";
