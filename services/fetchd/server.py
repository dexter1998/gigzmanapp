"""
fetchd — the hard-page fetcher behind Mantis's website enricher (Scrapling).

The enricher fetches with plain HTTP first. Only pages that come back as a Cloudflare challenge
or an empty JavaScript shell are sent here:
  mode "http"    Scrapling Fetcher: browser TLS fingerprint + headers, no browser (fast)
  mode "stealth" StealthyFetcher: real browser, solves Cloudflare Turnstile/interstitial, renders JS

POST /fetch {"url": "...", "mode": "http"|"stealth", "markdown": bool}
  -> {"ok", "status", "url", "html", "markdown"?, "mode", "ms"}
Listens on 127.0.0.1 only, and requires the X-Fetchd-Token header when FETCHD_TOKEN is set.
The caller (the Node app) has already refused private addresses; this service is not exposed.

run: services/fetchd/.venv/bin/python services/fetchd/server.py
"""
import json, os, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from scrapling.fetchers import Fetcher, StealthyFetcher

TOKEN = os.environ.get("FETCHD_TOKEN", "")
PORT = int(os.environ.get("FETCHD_PORT", "8765"))
MAX_HTML = 1_500_000
# One browser at a time: stealth fetches are heavy, and a laptop/box can wedge under parallel browsers.
BROWSER_LOCK = threading.Semaphore(int(os.environ.get("FETCHD_BROWSERS", "2")))


def fetch(url: str, mode: str, want_md: bool) -> dict:
    t0 = time.time()
    if mode == "stealth":
        with BROWSER_LOCK:
            page = StealthyFetcher.fetch(url, headless=True, solve_cloudflare=True, network_idle=True,
                                         timeout=45000, block_webrtc=True, disable_resources=False)
    else:
        page = Fetcher.get(url, timeout=15, stealthy_headers=True, follow_redirects=True)
    html = (page.html_content or "")[:MAX_HTML]
    out = {"ok": 200 <= int(page.status) < 400, "status": int(page.status), "url": str(page.url), "html": html,
           "mode": mode, "ms": int((time.time() - t0) * 1000)}
    if want_md:
        try:
            out["markdown"] = str(page.markdown)[:200_000]
        except Exception:
            pass
    return out


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):  # quiet
        pass

    def _send(self, code: int, body: dict):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, {"ok": True})
        self._send(404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/fetch":
            return self._send(404, {"error": "not_found"})
        if TOKEN and self.headers.get("x-fetchd-token") != TOKEN:
            return self._send(401, {"error": "unauthorized"})
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("content-length", "0"))) or b"{}")
            url = str(body.get("url", ""))
            if not url.startswith(("http://", "https://")):
                return self._send(400, {"error": "bad_url"})
            mode = body.get("mode", "http")
            if mode not in ("http", "stealth"):
                return self._send(400, {"error": "bad_mode"})
            self._send(200, fetch(url, mode, bool(body.get("markdown"))))
        except Exception as e:  # a failed fetch is a result, not a crash
            self._send(200, {"ok": False, "status": 0, "error": str(e)[:300]})


if __name__ == "__main__":
    print(f"fetchd on 127.0.0.1:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
