"use client";

import { useSyncExternalStore } from "react";

/**
 * `false` while rendering on the server and during hydration, `true` once mounted in the browser.
 *
 * Popups are client-only by nature: eligibility reads localStorage and the meme is drawn at random,
 * neither of which the server can produce the same answer for. Rendering nothing until mount is
 * what keeps that from being a hydration mismatch.
 *
 * A store with a no-op subscription rather than setState-in-an-effect: the value never changes
 * after mount, so there is nothing to subscribe to and no cascading render to pay for, and
 * useSyncExternalStore's server snapshot is the sanctioned way to differ between the two passes.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
