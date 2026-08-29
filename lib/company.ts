/**
 * One source of truth for the company's name, address and contact details.
 *
 * Everything that renders an address or emits Organization/LocalBusiness structured data reads it
 * from here. NAP (name, address, phone) consistency is the point: search engines match a business
 * across the web by comparing these strings, so the moment the same address is typed by hand in
 * two places with different wording, they stop reinforcing each other and start competing.
 *
 * ADDRESS is copied from the Google Business Profile verbatim, component by component, rather than
 * rewritten to read nicely -- the profile is the canonical record search engines reconcile against.
 * Profile: "Gigzman | Website Designing & Software Development Company" (place id below).
 */
export const COMPANY = {
  /** Registered legal entity that operates Mantis. */
  legalName: "Reverblunt Private Limited",
  /** Product/brand name used in page copy and titles. */
  brand: "Mantis",
  brandLong: "Mantis AI",
  email: "tarun@gigzman.com",
  // The Google Business Profile carries no public phone number, so none is published here either.
  // Inventing one, or publishing a different number from the profile, is precisely the NAP
  // mismatch this file exists to avoid. Add it to the profile first, then mirror it here.
  phone: null as string | null,

  address: {
    street: "Shop No. 70, Dwarka Expy, On Main Road, Gali Number 2",
    locality: "Tech Chand Nagar, Sector 104",
    city: "Gurugram",
    region: "Haryana",
    postalCode: "122006",
    country: "IN",
    countryName: "India",
  },

  geo: { lat: 28.4807208, lng: 76.9895831 },

  /** The Google Business Profile these details mirror. */
  gbp: {
    name: "Gigzman | Website Designing & Software Development Company",
    placeId: "ChIJPeu0koAXDTkR-SqEjgIrq_0",
    mapsUrl: "https://maps.google.com/?cid=18278750802594245369",
    /** Embeddable map centred on the profile. No API key needed for this embed form. */
    embedUrl:
      "https://www.google.com/maps?q=Gigzman+Website+Designing+%26+Software+Development+Company,+Sector+104,+Gurugram&output=embed",
    rating: 5,
    reviewCount: 5,
    hours: "Open 24 hours, 7 days a week",
  },

  site: "https://mantisai.in",
  agencySite: "https://www.gigzman.com/",
} as const;

/** Single-line postal address, e.g. for a footer or a contact card. */
export function addressOneLine(): string {
  const a = COMPANY.address;
  return `${a.street}, ${a.locality}, ${a.city}, ${a.region} ${a.postalCode}, ${a.countryName}`;
}

/**
 * Organization + LocalBusiness structured data for the site.
 *
 * `sameAs` points at the Google Business Profile and the agency site so the two identities are
 * explicitly linked rather than looking like unrelated businesses that happen to share an address.
 */
export function organizationJsonLd() {
  const a = COMPANY.address;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${COMPANY.site}/#organization`,
    name: COMPANY.legalName,
    alternateName: [COMPANY.brandLong, COMPANY.gbp.name],
    url: COMPANY.site,
    email: COMPANY.email,
    ...(COMPANY.phone ? { telephone: COMPANY.phone } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: `${a.street}, ${a.locality}`,
      addressLocality: a.city,
      addressRegion: a.region,
      postalCode: a.postalCode,
      addressCountry: a.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: COMPANY.geo.lat,
      longitude: COMPANY.geo.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: COMPANY.gbp.rating,
      reviewCount: COMPANY.gbp.reviewCount,
    },
    sameAs: [COMPANY.gbp.mapsUrl, COMPANY.agencySite],
  };
}
