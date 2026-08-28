// Deterministic placeholder identity for phone-only signups — user_profiles.email stays the
// PRIMARY KEY every other table and route is built around, so a phone-only account gets one of
// these instead of a real email. Derived from the (unique) phone number, so it's automatically
// unique too.
const SUFFIX = "@phone.gigzmanapp.internal";

export const syntheticEmailForPhone = (phoneE164: string) => `${phoneE164}${SUFFIX}`;
export const isSyntheticEmail = (email: string) => email.endsWith(SUFFIX);
