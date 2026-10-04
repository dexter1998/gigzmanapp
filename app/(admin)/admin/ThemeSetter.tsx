"use client";

import { useEffect } from "react";

/** Tabler's dark-mode CSS keys off `:root[data-bs-theme=dark]` — i.e. the attribute has to sit on
 * `<html>` itself, not any div inside body (custom-property inheritance doesn't help here because
 * the dark variable *redefinitions* are scoped to that exact selector, not just `[data-bs-theme=
 * dark]` anywhere). `<html>` is owned by the root layout (shared with the public site), so this
 * sets/clears the attribute imperatively instead of hardcoding it there. Pairs with the inline
 * script in layout.tsx: the script avoids a light-mode flash on first paint, this effect's cleanup
 * removes the attribute when navigating client-side out of /admin/* back to a public page. */
export function ThemeSetter() {
  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", "dark");
    // Also flags the document so <body> can take the console's canvas. The console's own wrapper
    // cannot paint it: Tabler's dark <body> sits behind and outside that element, and showed as a
    // navy band under the footer and past the end of a short page.
    document.documentElement.setAttribute("data-admin", "");
    return () => {
      document.documentElement.removeAttribute("data-bs-theme");
      document.documentElement.removeAttribute("data-admin");
    };
  }, []);
  return null;
}
