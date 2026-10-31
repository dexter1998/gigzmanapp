/**
 * Neutral path for the billing return page's status check. The browser should never see which
 * gateway is behind a payment in a URL it calls; the handler is the gateway-specific one, unchanged.
 */
export { GET } from "../cashfree/status/route";
