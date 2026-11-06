import { createHmac, timingSafeEqual } from "node:crypto";
import sharp, { type OverlayOptions } from "sharp";

/**
 * The little map in the lead-alert card (Bark puts a region map with a pin beside its lead). It is
 * served by /api/email/map/<token> rather than linked straight to a map provider, because a
 * provider URL in an email carries the API key to everyone who views source.
 *
 * The pin is the lead's location rounded to two decimals (~1 km), never the exact point: a pin on
 * the exact building plus the category in the subject would let anyone find the business without
 * unlocking it.
 *
 * Provider: OpenStreetMap tiles stitched here by default (with the attribution OSM requires), or
 * Google Static Maps when EMAIL_MAP_PROVIDER=google — that needs "Maps Static API" enabled on the
 * project behind MANTIS_GOOGLE_PLACES_API_KEY, which it was not on 2026-11-05.
 */

export const MAP_W = 480, MAP_H = 320;
// Region scale, like Bark's: neighbouring towns are named, so the pin reads as "where" at a glance.
const ZOOM = 9;
const TILE = 256;

const round = (n: number) => Math.round(n * 100) / 100;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(`email-map:${payload}`).digest("base64url").slice(0, 16);
}

/** URL-safe token for a location; the signature stops the endpoint being used as a free map proxy. */
export function mapToken(lat: number, lng: number): string {
  const payload = `${round(lat).toFixed(2)},${round(lng).toFixed(2)}`;
  return `${payload.replace(/,/g, "_")}.${sign(payload)}`;
}

export function parseMapToken(token: string): { lat: number; lng: number } | null {
  const m = token.replace(/\.png$/, "").match(/^(-?\d+\.\d{2})_(-?\d+\.\d{2})\.([\w-]{16})$/);
  if (!m) return null;
  const payload = `${m[1]},${m[2]}`;
  const want = Buffer.from(sign(payload)), got = Buffer.from(m[3]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}

const PIN = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
  <path d="M17 1C8.2 1 1 8.1 1 16.9 1 29 17 45 17 45s16-16 16-28.1C33 8.1 25.8 1 17 1z" fill="#111315" stroke="#ffffff" stroke-width="2"/>
  <circle cx="17" cy="16.5" r="6.5" fill="#b7e51d"/></svg>`);

function lngToX(lng: number, z: number) { return ((lng + 180) / 360) * TILE * 2 ** z; }
function latToY(lat: number, z: number) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TILE * 2 ** z;
}

async function fetchTile(z: number, x: number, y: number): Promise<Buffer> {
  const res = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
    // OSM's tile policy requires an identifying User-Agent with a contact.
    headers: { "User-Agent": "MantisAi-email-map/1.0 (+https://mantisai.in; tarun@mantisai.in)" },
  });
  if (!res.ok) throw new Error(`osm tile ${z}/${x}/${y}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function osmMap(lat: number, lng: number): Promise<Buffer> {
  const cx = lngToX(lng, ZOOM), cy = latToY(lat, ZOOM);
  const left = cx - MAP_W / 2, top = cy - MAP_H / 2;
  const x0 = Math.floor(left / TILE), x1 = Math.floor((left + MAP_W) / TILE);
  const y0 = Math.floor(top / TILE), y1 = Math.floor((top + MAP_H) / TILE);

  const tiles: OverlayOptions[] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      tiles.push({ input: await fetchTile(ZOOM, x, y), left: (x - x0) * TILE, top: (y - y0) * TILE });
    }
  }
  const stitched = await sharp({
    create: { width: (x1 - x0 + 1) * TILE, height: (y1 - y0 + 1) * TILE, channels: 3, background: "#e9e7e1" },
  }).composite(tiles).png().toBuffer();

  const crop = { left: Math.round(left - x0 * TILE), top: Math.round(top - y0 * TILE), width: MAP_W, height: MAP_H };
  const credit = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="150" height="16"><rect width="150" height="16" fill="#ffffff" fill-opacity="0.8"/><text x="4" y="12" font-family="Arial" font-size="10" fill="#333">© OpenStreetMap contributors</text></svg>`);
  return sharp(await sharp(stitched).extract(crop).png().toBuffer())
    .composite([
      { input: PIN, left: MAP_W / 2 - 17, top: MAP_H / 2 - 44 },
      { input: credit, left: MAP_W - 150, top: MAP_H - 16 },
    ])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

async function googleMap(lat: number, lng: number): Promise<Buffer> {
  const key = process.env.MANTIS_GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${ZOOM}&size=${MAP_W}x${MAP_H}&scale=1&markers=color:0x111315%7C${lat},${lng}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) throw new Error(`static maps: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function renderMap(lat: number, lng: number): Promise<Buffer> {
  const [rl, rg] = [round(lat), round(lng)];
  return process.env.EMAIL_MAP_PROVIDER === "google" ? googleMap(rl, rg) : osmMap(rl, rg);
}
