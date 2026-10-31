/**
 * Neutral path for the popup checkout's signature check. The browser should never see which
 * gateway is behind a payment in a URL it calls; the handler is the gateway-specific one, unchanged.
 */
export { POST } from "../razorpay/verify/route";
