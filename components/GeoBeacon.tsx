"use client";

import { useEffect } from "react";

/** Fires the one-time country capture (see /api/user/geo). sessionStorage guard so a session
 * pings at most once — the server bails anyway once country is set, this just saves the request. */
export function GeoBeacon() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("gz-geo-pinged")) return;
      sessionStorage.setItem("gz-geo-pinged", "1");
    } catch { /* private mode — ping anyway, server dedupes */ }
    fetch("/api/user/geo", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
