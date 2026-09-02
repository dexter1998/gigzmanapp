/**
 * The curated place registry behind the public lead pages.
 *
 * Curated, never auto-generated. `leads.address` is Google's free-text `formattedAddress`, and the
 * token sitting in its "city" position is frequently not a city: production contains "Region",
 * villages like Sarhol and Bandhwari that are really inside Gurgaon, a Devanagari spelling of
 * Gurugram, and 206 New York addresses. Registering whatever appears there is exactly how a
 * programmatic system starts publishing pages about nothing.
 *
 * So the rule is: an address token only resolves if it is listed here. **Unmatched means excluded,
 * never guessed.**
 *
 * Slug choice is also a judgement this file exists to hold. "Gurgaon" and "Gurugram" are both
 * correct; Google's address format says Gurugram, but Gurgaon is what people search. An algorithm
 * reading the data would have picked the wrong one.
 */

export type City = {
  /** Globally unique, not unique-per-country: `leads.city_slug` is a bare column and the key of
   *  every pSEO aggregate, so two cities sharing a slug would silently merge into one page. Where a
   *  name is ambiguous worldwide the slug carries a qualifier — `london` is Greater London, and a
   *  London, Ontario has to arrive as `london-on`. pseo-validate-locations.ts enforces this. */
  slug: string;
  /** ISO 3166-1 alpha-2, lowercase — see lib/pseo/countries.ts. */
  countryCode: string;
  /** Display name, and the spelling used in page copy and titles. */
  name: string;
  /** Other spellings that appear in addresses. Never used in URLs. */
  aliases: string[];
  state: string;
  centroid: { lat: number; lng: number };
  /** [minLat, minLng, maxLat, maxLng] — the integrity check in address.ts rejects any lead whose
   *  coordinates fall outside the city it parsed to. Drawn generously around the real municipal
   *  area, but never far enough to touch a neighbouring city we also cover. */
  bbox: [number, number, number, number];
  /** draft = registered and resolvable, but never published. */
  status: "active" | "draft";
};

export type Area = {
  slug: string;
  name: string;
  citySlug: string;
  countryCode: string;
  aliases: string[];
};

/**
 * Gurgaon's bbox is drawn from the real data — leads with "Gurugram" in the address occupy
 * lat 28.455–28.509, lng 28.976–77.105 between the 1st and 99th percentile — then widened to cover
 * the wider district. The northern edge deliberately stops short of Delhi (28.6+).
 */
export const CITIES: City[] = [
  {
    slug: "gurgaon",
    countryCode: "in",
    name: "Gurgaon",
    aliases: ["gurugram", "gurgaon", "गुरुग्राम", "gurgaon haryana", "gurugram haryana"],
    state: "Haryana",
    centroid: { lat: 28.4896, lng: 77.0534 },
    bbox: [28.36, 76.85, 28.56, 77.15],
    status: "active",
  },
  {
    // New Delhi is merged in rather than given its own slug: split, both pages are thin.
    slug: "delhi",
    countryCode: "in",
    name: "Delhi",
    aliases: ["delhi", "new delhi", "नई दिल्ली", "दिल्ली"],
    state: "Delhi",
    centroid: { lat: 28.6448, lng: 77.2167 },
    bbox: [28.4, 76.83, 28.89, 77.35],
    status: "active",
  },
  {
    slug: "faridabad",
    countryCode: "in",
    name: "Faridabad",
    aliases: ["faridabad", "फरीदाबाद"],
    state: "Haryana",
    centroid: { lat: 28.4089, lng: 77.3178 },
    bbox: [28.28, 77.22, 28.53, 77.42],
    status: "active",
  },
  {
    slug: "morena",
    countryCode: "in",
    name: "Morena",
    aliases: ["morena", "मुरैना"],
    state: "Madhya Pradesh",
    centroid: { lat: 26.4954, lng: 78.0009 },
    bbox: [26.38, 77.87, 26.62, 78.13],
    status: "active",
  },
  {
    slug: "kota",
    countryCode: "in",
    name: "Kota",
    aliases: ["kota", "कोटा"],
    state: "Rajasthan",
    centroid: { lat: 25.2138, lng: 75.8648 },
    bbox: [25.09, 75.74, 25.34, 75.99],
    status: "active",
  },

  // Added 2026-08-31 for the multi-country scan. Every centroid and bbox below came from the
  // Geocoding API's own viewport for the place (scripts/pseo-geocode-cities.ts), not from memory:
  // the bbox is the integrity check each resolved lead is tested against, and a guessed one either
  // drops real businesses or swallows a neighbour's. All start `draft` — registered and
  // resolvable, never published — because none of them has been scanned yet.
  {
    slug: "mumbai",
    countryCode: "in",
    name: "Mumbai",
    aliases: ["mumbai"],
    state: "Maharashtra",
    centroid: { lat: 18.9582, lng: 72.832 },
    bbox: [18.8934, 72.7756, 19.2696, 72.9811],
    status: "active",
  },
  {
    slug: "bangalore",
    countryCode: "in",
    name: "Bangalore",
    aliases: ["bangalore"],
    state: "Karnataka",
    centroid: { lat: 12.9629, lng: 77.5775 },
    bbox: [12.779, 77.4599, 13.1425, 78.0375],
    status: "active",
  },
  {
    slug: "hyderabad",
    countryCode: "in",
    name: "Hyderabad",
    aliases: ["hyderabad"],
    state: "Telangana",
    centroid: { lat: 17.4065, lng: 78.4772 },
    bbox: [17.2169, 77.6154, 17.6812, 78.6832],
    status: "active",
  },
  {
    slug: "chennai",
    countryCode: "in",
    name: "Chennai",
    aliases: ["chennai"],
    state: "Tamil Nadu",
    centroid: { lat: 13.0571, lng: 80.2098 },
    bbox: [12.6999, 79.9676, 13.3574, 80.3356],
    status: "active",
  },
  {
    slug: "pune",
    countryCode: "in",
    name: "Pune",
    aliases: ["pune"],
    state: "Maharashtra",
    centroid: { lat: 18.5246, lng: 73.8786 },
    bbox: [18.3852, 73.7302, 18.6219, 74.0191],
    status: "active",
  },
  {
    slug: "ahmedabad",
    countryCode: "in",
    name: "Ahmedabad",
    aliases: ["ahmedabad"],
    state: "Gujarat",
    centroid: { lat: 23.0225, lng: 72.5713 },
    bbox: [22.8541, 72.3899, 23.1864, 72.7696],
    status: "active",
  },
  {
    slug: "kolkata",
    countryCode: "in",
    name: "Kolkata",
    aliases: ["kolkata"],
    state: "West Bengal",
    centroid: { lat: 22.5744, lng: 88.3629 },
    bbox: [22.452, 88.2336, 22.7231, 88.4786],
    status: "active",
  },
  {
    slug: "jaipur",
    countryCode: "in",
    name: "Jaipur",
    aliases: ["jaipur"],
    state: "Rajasthan",
    centroid: { lat: 26.9124, lng: 75.7873 },
    bbox: [26.7497, 75.6399, 27.0207, 75.9412],
    status: "active",
  },
  {
    slug: "surat",
    countryCode: "in",
    name: "Surat",
    aliases: ["surat"],
    state: "Gujarat",
    centroid: { lat: 21.1981, lng: 72.8298 },
    bbox: [21.0478, 72.7014, 21.2706, 72.9432],
    status: "active",
  },
  {
    slug: "lucknow",
    countryCode: "in",
    name: "Lucknow",
    aliases: ["lucknow"],
    state: "Uttar Pradesh",
    centroid: { lat: 26.8467, lng: 80.9462 },
    bbox: [26.7333, 80.8305, 26.9641, 81.0545],
    status: "active",
  },
  {
    slug: "indore",
    countryCode: "in",
    name: "Indore",
    aliases: ["indore"],
    state: "Madhya Pradesh",
    centroid: { lat: 22.7196, lng: 75.8577 },
    bbox: [22.6131, 75.7657, 22.8349, 75.962],
    status: "active",
  },
  {
    slug: "noida",
    countryCode: "in",
    name: "Noida",
    aliases: ["noida"],
    state: "Uttar Pradesh",
    centroid: { lat: 28.5355, lng: 77.391 },
    bbox: [28.4085, 77.2971, 28.6359, 77.5066],
    status: "active",
  },
  {
    slug: "chandigarh",
    countryCode: "in",
    name: "Chandigarh",
    aliases: ["chandigarh"],
    state: "Chandigarh",
    centroid: { lat: 30.7333, lng: 76.7794 },
    bbox: [30.67, 76.7052, 30.7945, 76.8362],
    status: "active",
  },
  {
    slug: "coimbatore",
    countryCode: "in",
    name: "Coimbatore",
    aliases: ["coimbatore"],
    state: "Tamil Nadu",
    centroid: { lat: 10.9974, lng: 76.9589 },
    bbox: [10.9151, 76.8567, 11.1047, 77.0878],
    status: "active",
  },
  {
    slug: "austin",
    countryCode: "us",
    name: "Austin",
    aliases: ["austin"],
    state: "Texas",
    centroid: { lat: 30.2672, lng: -97.7431 },
    bbox: [30.0756, -97.9384, 30.5167, -97.5276],
    status: "active",
  },
  {
    slug: "phoenix",
    countryCode: "us",
    name: "Phoenix",
    aliases: ["phoenix"],
    state: "Arizona",
    centroid: { lat: 33.4483, lng: -112.0725 },
    bbox: [33.2903, -112.3241, 33.9184, -111.9255],
    status: "draft",
  },
  {
    slug: "charlotte",
    countryCode: "us",
    name: "Charlotte",
    aliases: ["charlotte"],
    state: "North Carolina",
    centroid: { lat: 35.2271, lng: -80.8409 },
    bbox: [35.0105, -81.0096, 35.4002, -80.6348],
    status: "draft",
  },
  {
    slug: "nashville",
    countryCode: "us",
    name: "Nashville",
    aliases: ["nashville"],
    state: "Tennessee",
    centroid: { lat: 36.1627, lng: -86.7816 },
    bbox: [35.9678, -87.0547, 36.4055, -86.5156],
    status: "draft",
  },
  {
    slug: "tampa",
    countryCode: "us",
    name: "Tampa",
    aliases: ["tampa"],
    state: "Florida",
    centroid: { lat: 27.9517, lng: -82.4588 },
    bbox: [27.8126, -82.6488, 28.1715, -82.2597],
    status: "draft",
  },
  {
    slug: "denver",
    countryCode: "us",
    name: "Denver",
    aliases: ["denver"],
    state: "Colorado",
    centroid: { lat: 39.7392, lng: -104.9903 },
    bbox: [39.6143, -105.1099, 39.9142, -104.5996],
    status: "draft",
  },
  {
    slug: "san-antonio",
    countryCode: "us",
    name: "San Antonio",
    aliases: ["san antonio"],
    state: "Texas",
    centroid: { lat: 29.4252, lng: -98.4946 },
    bbox: [29.1853, -98.8135, 29.7311, -98.2227],
    status: "draft",
  },
  {
    slug: "kansas-city",
    countryCode: "us",
    name: "Kansas City",
    aliases: ["kansas city"],
    state: "Missouri",
    centroid: { lat: 39.0997, lng: -94.5786 },
    bbox: [38.8243, -94.7656, 39.3562, -94.3854],
    status: "draft",
  },
  {
    slug: "sydney",
    countryCode: "au",
    name: "Sydney",
    aliases: ["sydney"],
    state: "New South Wales",
    centroid: { lat: -33.8623, lng: 151.2077 },
    bbox: [-34.1183, 150.5209, -33.5781, 151.343],
    status: "active",
  },
  {
    slug: "melbourne",
    countryCode: "au",
    name: "Melbourne",
    aliases: ["melbourne"],
    state: "Victoria",
    centroid: { lat: -37.8136, lng: 144.9631 },
    bbox: [-38.4339, 144.5937, -37.5113, 145.5125],
    status: "active",
  },
  {
    slug: "brisbane",
    countryCode: "au",
    name: "Brisbane",
    aliases: ["brisbane"],
    state: "Queensland",
    centroid: { lat: -27.4705, lng: 153.026 },
    bbox: [-27.7674, 152.6685, -26.9968, 153.3179],
    status: "draft",
  },
  {
    slug: "london",
    countryCode: "gb",
    name: "London",
    aliases: ["london"],
    state: "England",
    centroid: { lat: 51.5072, lng: -0.1276 },
    bbox: [51.3849, -0.3515, 51.6723, 0.1483],
    status: "active",
  },
  {
    slug: "manchester",
    countryCode: "gb",
    name: "Manchester",
    aliases: ["manchester"],
    state: "England",
    centroid: { lat: 53.4808, lng: -2.2426 },
    bbox: [53.3657, -2.3001, 53.5446, -2.1468],
    status: "active",
  },
  {
    slug: "birmingham",
    countryCode: "gb",
    name: "Birmingham",
    aliases: ["birmingham"],
    state: "England",
    centroid: { lat: 52.4823, lng: -1.89 },
    bbox: [52.386, -2.0174, 52.6087, -1.7098],
    status: "active",
  },
  {
    slug: "toronto",
    countryCode: "ca",
    name: "Toronto",
    aliases: ["toronto"],
    state: "Ontario",
    centroid: { lat: 43.6548, lng: -79.3884 },
    bbox: [43.5842, -79.6392, 43.8555, -79.1161],
    status: "active",
  },
  {
    slug: "vancouver",
    countryCode: "ca",
    name: "Vancouver",
    aliases: ["vancouver"],
    state: "British Columbia",
    centroid: { lat: 49.2827, lng: -123.1207 },
    bbox: [49.1982, -123.2247, 49.3173, -123.0231],
    status: "draft",
  },
  {
    slug: "calgary",
    countryCode: "ca",
    name: "Calgary",
    aliases: ["calgary"],
    state: "Alberta",
    centroid: { lat: 51.0447, lng: -114.0719 },
    bbox: [50.8428, -114.3158, 51.2124, -113.8599],
    status: "draft",
  },
  {
    slug: "leeds",
    countryCode: "gb",
    name: "Leeds",
    aliases: ["leeds"],
    state: "England",
    centroid: { lat: 53.8008, lng: -1.5491 },
    bbox: [53.7308, -1.6741, 53.8812, -1.3974],
    status: "active",
  },
  {
    slug: "glasgow",
    countryCode: "gb",
    name: "Glasgow",
    aliases: ["glasgow"],
    state: "Scotland",
    centroid: { lat: 55.8617, lng: -4.2583 },
    bbox: [55.7813, -4.3932, 55.9296, -4.0717],
    status: "active",
  },
  {
    slug: "liverpool",
    countryCode: "gb",
    name: "Liverpool",
    aliases: ["liverpool"],
    state: "England",
    centroid: { lat: 53.4084, lng: -2.9916 },
    bbox: [53.3115, -3.0192, 53.4862, -2.818],
    status: "active",
  },
  {
    slug: "bristol",
    countryCode: "gb",
    name: "Bristol",
    aliases: ["bristol"],
    state: "England",
    centroid: { lat: 51.4545, lng: -2.5879 },
    bbox: [51.3925, -2.7305, 51.5444, -2.4509],
    status: "active",
  },

  // Batch 2 (2026-09-01): highest-business-count cities across India, USA, Australia, Europe,
  // Germany and UAE, per real registration/count data (MSME/GST for India, Census small-business
  // counts for the US, ABS business register for Australia, Handelsregister for Germany, DED
  // license counts for the UAE). All draft -- none of these has been scanned. Bboxes are Geocoding
  // viewports, same as every other city here; never guessed.
  {
    slug: "nagpur",
    countryCode: "in",
    name: "Nagpur",
    aliases: ["nagpur"],
    state: "Maharashtra",
    centroid: { lat: 21.1458, lng: 79.0882 },
    bbox: [21.0531, 78.9745, 21.2309, 79.1788],
    status: "active",
  },
  {
    slug: "vadodara",
    countryCode: "in",
    name: "Vadodara",
    aliases: ["vadodara"],
    state: "Gujarat",
    centroid: { lat: 22.3002, lng: 73.2105 },
    bbox: [22.2185, 73.0732, 22.4219, 73.273],
    status: "active",
  },
  {
    slug: "rajkot",
    countryCode: "in",
    name: "Rajkot",
    aliases: ["rajkot"],
    state: "Gujarat",
    centroid: { lat: 22.3039, lng: 70.8022 },
    bbox: [22.1935, 70.6944, 22.3535, 70.9482],
    status: "active",
  },
  {
    slug: "kanpur",
    countryCode: "in",
    name: "Kanpur",
    aliases: ["kanpur"],
    state: "Uttar Pradesh",
    centroid: { lat: 26.4499, lng: 80.3319 },
    bbox: [26.3513, 80.2088, 26.5431, 80.468],
    status: "active",
  },
  {
    slug: "patna",
    countryCode: "in",
    name: "Patna",
    aliases: ["patna"],
    state: "Bihar",
    centroid: { lat: 25.5941, lng: 85.1376 },
    bbox: [25.5596, 85.0174, 25.6564, 85.2687],
    status: "active",
  },
  {
    slug: "bhopal",
    countryCode: "in",
    name: "Bhopal",
    aliases: ["bhopal"],
    state: "Madhya Pradesh",
    centroid: { lat: 23.2599, lng: 77.4126 },
    bbox: [23.0661, 77.237, 23.3327, 77.5748],
    status: "active",
  },
  {
    slug: "new-york",
    countryCode: "us",
    name: "New York",
    aliases: ["new york"],
    state: "New York",
    centroid: { lat: 40.7128, lng: -74.006 },
    bbox: [40.4766, -74.2588, 40.9177, -73.7002],
    status: "active",
  },
  {
    slug: "los-angeles",
    countryCode: "us",
    name: "Los Angeles",
    aliases: ["los angeles"],
    state: "California",
    centroid: { lat: 34.0549, lng: -118.2426 },
    bbox: [33.7037, -118.6682, 34.3373, -118.1553],
    status: "active",
  },
  {
    slug: "chicago",
    countryCode: "us",
    name: "Chicago",
    aliases: ["chicago"],
    state: "Illinois",
    centroid: { lat: 41.8832, lng: -87.6324 },
    bbox: [41.6443, -87.9401, 42.0231, -87.5237],
    status: "active",
  },
  {
    slug: "miami",
    countryCode: "us",
    name: "Miami",
    aliases: ["miami"],
    state: "Florida",
    centroid: { lat: 25.7617, lng: -80.1918 },
    bbox: [25.709, -80.3186, 25.9213, -80.1229],
    status: "active",
  },
  {
    slug: "dallas",
    countryCode: "us",
    name: "Dallas",
    aliases: ["dallas"],
    state: "Texas",
    centroid: { lat: 32.7767, lng: -96.797 },
    bbox: [32.6132, -97.0005, 33.0238, -96.4637],
    status: "active",
  },
  {
    slug: "houston",
    countryCode: "us",
    name: "Houston",
    aliases: ["houston"],
    state: "Texas",
    centroid: { lat: 29.7601, lng: -95.3701 },
    bbox: [29.5163, -95.9097, 30.1559, -95.0126],
    status: "active",
  },
  {
    slug: "atlanta",
    countryCode: "us",
    name: "Atlanta",
    aliases: ["atlanta"],
    state: "Georgia",
    centroid: { lat: 33.7501, lng: -84.3885 },
    bbox: [33.6479, -84.5509, 33.8868, -84.2896],
    status: "active",
  },
  {
    slug: "san-francisco",
    countryCode: "us",
    name: "San Francisco",
    aliases: ["san francisco"],
    state: "California",
    centroid: { lat: 37.7749, lng: -122.4194 },
    bbox: [37.7034, -122.527, 37.812, -122.3482],
    status: "active",
  },
  {
    slug: "san-jose",
    countryCode: "us",
    name: "San Jose",
    aliases: ["san jose"],
    state: "California",
    centroid: { lat: 37.3387, lng: -121.8853 },
    bbox: [37.1231, -122.0457, 37.4692, -121.5859],
    status: "active",
  },
  {
    slug: "boston",
    countryCode: "us",
    name: "Boston",
    aliases: ["boston"],
    state: "Massachusetts",
    centroid: { lat: 42.3555, lng: -71.0565 },
    bbox: [42.2279, -71.1912, 42.4008, -70.7488],
    status: "active",
  },
  {
    slug: "washington-dc",
    countryCode: "us",
    name: "Washington, D.C.",
    aliases: ["washington, d.c."],
    state: "District of Columbia",
    centroid: { lat: 38.9073, lng: -77.0369 },
    bbox: [38.7916, -77.1198, 38.996, -76.9091],
    status: "active",
  },
  {
    slug: "seattle",
    countryCode: "us",
    name: "Seattle",
    aliases: ["seattle"],
    state: "Washington",
    centroid: { lat: 47.6061, lng: -122.3328 },
    bbox: [47.4821, -122.4598, 47.7353, -122.2198],
    status: "active",
  },
  {
    slug: "philadelphia",
    countryCode: "us",
    name: "Philadelphia",
    aliases: ["philadelphia"],
    state: "Pennsylvania",
    centroid: { lat: 39.9526, lng: -75.1652 },
    bbox: [39.867, -75.2803, 40.138, -74.9558],
    status: "active",
  },
  {
    slug: "san-diego",
    countryCode: "us",
    name: "San Diego",
    aliases: ["san diego"],
    state: "California",
    centroid: { lat: 32.7157, lng: -117.1611 },
    bbox: [32.5348, -117.3098, 33.1142, -116.9057],
    status: "active",
  },
  {
    slug: "orlando",
    countryCode: "us",
    name: "Orlando",
    aliases: ["orlando"],
    state: "Florida",
    centroid: { lat: 28.5384, lng: -81.3789 },
    bbox: [28.348, -81.5077, 28.6144, -81.1778],
    status: "active",
  },
  {
    slug: "minneapolis",
    countryCode: "us",
    name: "Minneapolis",
    aliases: ["minneapolis"],
    state: "Minnesota",
    centroid: { lat: 44.9778, lng: -93.265 },
    bbox: [44.8898, -93.3292, 45.0513, -93.194],
    status: "active",
  },
  {
    slug: "detroit",
    countryCode: "us",
    name: "Detroit",
    aliases: ["detroit"],
    state: "Michigan",
    centroid: { lat: 42.3297, lng: -83.0425 },
    bbox: [42.255, -83.2878, 42.4502, -82.9104],
    status: "active",
  },
  {
    slug: "portland",
    countryCode: "us",
    name: "Portland",
    aliases: ["portland"],
    state: "Oregon",
    centroid: { lat: 45.5152, lng: -122.6784 },
    bbox: [45.4325, -122.8368, 45.6529, -122.472],
    status: "active",
  },
  {
    slug: "las-vegas",
    countryCode: "us",
    name: "Las Vegas",
    aliases: ["las vegas"],
    state: "Nevada",
    centroid: { lat: 36.1716, lng: -115.1391 },
    bbox: [35.95, -115.4, 36.3, -114.95],
    status: "active",
  },
  {
    slug: "perth",
    countryCode: "au",
    name: "Perth",
    aliases: ["perth"],
    state: "Western Australia",
    centroid: { lat: -31.9514, lng: 115.8617 },
    bbox: [-32.4556, 115.684, -31.6245, 116.239],
    status: "active",
  },
  {
    slug: "adelaide",
    countryCode: "au",
    name: "Adelaide",
    aliases: ["adelaide"],
    state: "South Australia",
    centroid: { lat: -34.9285, lng: 138.6007 },
    bbox: [-35.349, 138.4421, -34.6526, 138.7802],
    status: "active",
  },
  {
    slug: "gold-coast",
    countryCode: "au",
    name: "Gold Coast",
    aliases: ["gold coast"],
    state: "Queensland",
    centroid: { lat: -27.9769, lng: 153.3809 },
    bbox: [-28.2003, 153.1866, -27.7081, 153.5522],
    status: "active",
  },
  {
    slug: "newcastle-au",
    countryCode: "au",
    name: "Newcastle",
    aliases: ["newcastle"],
    state: "New South Wales",
    centroid: { lat: -32.9283, lng: 151.7817 },
    bbox: [-33.1205, 151.555, -32.8329, 151.8244],
    status: "active",
  },
  {
    slug: "canberra",
    countryCode: "au",
    name: "Canberra",
    aliases: ["canberra"],
    state: "Australian Capital Territory",
    centroid: { lat: -35.2802, lng: 149.131 },
    bbox: [-35.4803, 148.9959, -35.1477, 149.2636],
    status: "active",
  },
  {
    slug: "wollongong",
    countryCode: "au",
    name: "Wollongong",
    aliases: ["wollongong"],
    state: "New South Wales",
    centroid: { lat: -34.4248, lng: 150.8931 },
    bbox: [-34.443, 150.8751, -34.4135, 150.911],
    status: "active",
  },
  {
    slug: "geelong",
    countryCode: "au",
    name: "Geelong",
    aliases: ["geelong"],
    state: "Victoria",
    centroid: { lat: -38.1493, lng: 144.3598 },
    bbox: [-38.164, 144.3509, -38.1323, 144.3749],
    status: "active",
  },
  {
    slug: "hobart",
    countryCode: "au",
    name: "Hobart",
    aliases: ["hobart"],
    state: "Tasmania",
    centroid: { lat: -42.8826, lng: 147.3257 },
    bbox: [-42.8916, 147.3156, -42.873, 147.3415],
    status: "active",
  },
  {
    slug: "paris",
    countryCode: "fr",
    name: "Paris",
    aliases: ["paris"],
    state: "Île-de-France",
    centroid: { lat: 48.8575, lng: 2.3514 },
    bbox: [48.8156, 2.2242, 48.9021, 2.4699],
    status: "active",
  },
  {
    slug: "amsterdam",
    countryCode: "nl",
    name: "Amsterdam",
    aliases: ["amsterdam"],
    state: "North Holland",
    centroid: { lat: 52.3676, lng: 4.9041 },
    bbox: [52.2782, 4.5866, 52.4625, 5.0792],
    status: "active",
  },
  {
    slug: "madrid",
    countryCode: "es",
    name: "Madrid",
    aliases: ["madrid"],
    state: "Community of Madrid",
    centroid: { lat: 40.4167, lng: -3.7033 },
    bbox: [40.3121, -3.8342, 40.5638, -3.5249],
    status: "active",
  },
  {
    slug: "barcelona",
    countryCode: "es",
    name: "Barcelona",
    aliases: ["barcelona"],
    state: "Catalonia",
    centroid: { lat: 41.3874, lng: 2.1686 },
    bbox: [41.317, 2.0523, 41.4683, 2.228],
    status: "active",
  },
  {
    slug: "milan",
    countryCode: "it",
    name: "Milan",
    aliases: ["milan"],
    state: "Lombardy",
    centroid: { lat: 45.4685, lng: 9.1824 },
    bbox: [45.3898, 8.2281, 45.5357, 9.2903],
    status: "active",
  },
  {
    slug: "rome",
    countryCode: "it",
    name: "Rome",
    aliases: ["rome"],
    state: "Lazio",
    centroid: { lat: 41.8967, lng: 12.4822 },
    bbox: [41.7696, 12.3417, 42.0505, 12.7303],
    status: "active",
  },
  {
    slug: "warsaw",
    countryCode: "pl",
    name: "Warsaw",
    aliases: ["warsaw"],
    state: "Masovian Voivodeship",
    centroid: { lat: 52.2297, lng: 21.0122 },
    bbox: [52.0978, 20.8517, 52.3682, 21.2712],
    status: "active",
  },
  {
    slug: "vienna",
    countryCode: "at",
    name: "Vienna",
    aliases: ["vienna"],
    state: "Vienna",
    centroid: { lat: 48.2081, lng: 16.3713 },
    bbox: [48.1179, 16.1818, 48.3226, 16.5775],
    status: "active",
  },
  {
    slug: "brussels",
    countryCode: "be",
    name: "brussels",
    aliases: ["brussels"],
    state: "Brussels",
    centroid: { lat: 50.826, lng: 4.3802 },
    bbox: [50.7637, 4.2438, 50.9139, 4.4823],
    status: "active",
  },
  {
    slug: "dublin",
    countryCode: "ie",
    name: "Dublin",
    aliases: ["dublin"],
    state: "County Dublin",
    centroid: { lat: 53.3498, lng: -6.2603 },
    bbox: [53.2234, -6.4475, 53.4252, -6.0439],
    status: "active",
  },
  {
    slug: "lisbon",
    countryCode: "pt",
    name: "Lisbon",
    aliases: ["lisbon"],
    state: "Lisbon",
    centroid: { lat: 38.7223, lng: -9.1393 },
    bbox: [38.6914, -9.2298, 38.7968, -9.0896],
    status: "active",
  },
  {
    slug: "stockholm",
    countryCode: "se",
    name: "Stockholm",
    aliases: ["stockholm"],
    state: "Stockholm County",
    centroid: { lat: 59.3327, lng: 18.0656 },
    bbox: [59.2319, 17.8988, 59.4026, 18.1961],
    status: "active",
  },
  {
    slug: "copenhagen",
    countryCode: "dk",
    name: "Copenhagen",
    aliases: ["copenhagen"],
    state: "Denmark",
    centroid: { lat: 55.6761, lng: 12.5683 },
    bbox: [55.6155, 12.453, 55.7327, 12.6507],
    status: "active",
  },
  {
    slug: "zurich",
    countryCode: "ch",
    name: "Zürich",
    aliases: ["zürich"],
    state: "Zurich",
    centroid: { lat: 47.3769, lng: 8.5417 },
    bbox: [47.3202, 8.448, 47.4347, 8.6255],
    status: "active",
  },
  {
    slug: "prague",
    countryCode: "cz",
    name: "Prague",
    aliases: ["prague"],
    state: "Prague",
    centroid: { lat: 50.0755, lng: 14.4378 },
    bbox: [49.942, 14.2245, 50.1775, 14.7069],
    status: "active",
  },
  {
    slug: "budapest",
    countryCode: "hu",
    name: "Budapest",
    aliases: ["budapest"],
    state: "Hungary",
    centroid: { lat: 47.4979, lng: 19.0402 },
    bbox: [47.3494, 18.9261, 47.613, 19.3345],
    status: "active",
  },
  {
    slug: "athens",
    countryCode: "gr",
    name: "Athens",
    aliases: ["athens"],
    state: "Greece",
    centroid: { lat: 37.9838, lng: 23.7275 },
    bbox: [37.9488, 23.687, 38.0329, 23.7897],
    status: "active",
  },
  {
    slug: "munich",
    countryCode: "de",
    name: "Munich",
    aliases: ["munich"],
    state: "Bavaria",
    centroid: { lat: 48.1351, lng: 11.582 },
    bbox: [48.0616, 11.3607, 48.2482, 11.7229],
    status: "active",
  },
  {
    slug: "berlin",
    countryCode: "de",
    name: "Berlin",
    aliases: ["berlin"],
    state: "Berlin",
    centroid: { lat: 52.52, lng: 13.405 },
    bbox: [52.3382, 13.0883, 52.6755, 13.7612],
    status: "active",
  },
  {
    slug: "hamburg",
    countryCode: "de",
    name: "Hamburg",
    aliases: ["hamburg"],
    state: "Hamburg",
    centroid: { lat: 53.5488, lng: 9.9872 },
    bbox: [53.4, 9.7322, 53.7171, 10.1235],
    status: "active",
  },
  {
    slug: "cologne",
    countryCode: "de",
    name: "Cologne",
    aliases: ["cologne"],
    state: "North Rhine-Westphalia",
    centroid: { lat: 50.9375, lng: 6.9603 },
    bbox: [50.8304, 6.7726, 51.085, 7.162],
    status: "active",
  },
  {
    slug: "frankfurt",
    countryCode: "de",
    name: "Frankfurt am Main",
    aliases: ["frankfurt am main"],
    state: "Hessen",
    centroid: { lat: 50.1109, lng: 8.6821 },
    bbox: [50.0153, 8.4727, 50.2272, 8.8004],
    status: "active",
  },
  {
    slug: "stuttgart",
    countryCode: "de",
    name: "Stuttgart",
    aliases: ["stuttgart"],
    state: "Baden-Württemberg",
    centroid: { lat: 48.7758, lng: 9.1829 },
    bbox: [48.692, 9.0386, 48.8664, 9.3158],
    status: "active",
  },
  {
    slug: "dusseldorf",
    countryCode: "de",
    name: "Düsseldorf",
    aliases: ["düsseldorf"],
    state: "North Rhine-Westphalia",
    centroid: { lat: 51.223, lng: 6.7825 },
    bbox: [51.1244, 6.6887, 51.3525, 6.9399],
    status: "active",
  },
  {
    slug: "hannover",
    countryCode: "de",
    name: "Hanover",
    aliases: ["hanover"],
    state: "Lower Saxony",
    centroid: { lat: 52.3759, lng: 9.732 },
    bbox: [52.3049, 9.6044, 52.4544, 9.9185],
    status: "active",
  },
  {
    slug: "leipzig",
    countryCode: "de",
    name: "Leipzig",
    aliases: ["leipzig"],
    state: "Saxony",
    centroid: { lat: 51.3397, lng: 12.3731 },
    bbox: [51.2381, 12.2366, 51.448, 12.5425],
    status: "active",
  },
  {
    slug: "dortmund",
    countryCode: "de",
    name: "Dortmund",
    aliases: ["dortmund"],
    state: "North Rhine-Westphalia",
    centroid: { lat: 51.5136, lng: 7.4653 },
    bbox: [51.4157, 7.3024, 51.6, 7.6381],
    status: "active",
  },
  {
    slug: "essen",
    countryCode: "de",
    name: "Essen",
    aliases: ["essen"],
    state: "North Rhine-Westphalia",
    centroid: { lat: 51.4576, lng: 7.0225 },
    bbox: [51.3476, 6.8943, 51.5342, 7.1377],
    status: "active",
  },
  {
    slug: "nuremberg",
    countryCode: "de",
    name: "Nuremberg",
    aliases: ["nuremberg"],
    state: "Bavaria",
    centroid: { lat: 49.4543, lng: 11.0746 },
    bbox: [49.3314, 10.9887, 49.5408, 11.2826],
    status: "active",
  },
  {
    slug: "dubai",
    countryCode: "ae",
    name: "Dubai",
    aliases: ["dubai"],
    state: "Dubai",
    centroid: { lat: 25.2048, lng: 55.2708 },
    bbox: [24.7935, 54.8905, 25.3586, 55.5645],
    status: "active",
  },
  {
    slug: "abu-dhabi",
    countryCode: "ae",
    name: "Abu Dhabi",
    aliases: ["abu dhabi"],
    state: "Abu Dhabi",
    centroid: { lat: 24.4539, lng: 54.3773 },
    bbox: [24.1518, 54.2663, 24.6219, 54.851],
    status: "active",
  },
  {
    slug: "sharjah",
    countryCode: "ae",
    name: "Sharjah",
    aliases: ["sharjah"],
    state: "Sharjah",
    centroid: { lat: 25.3562, lng: 55.4272 },
    bbox: [25.2073, 55.3491, 25.4326, 55.7435],
    status: "active",
  },
  {
    slug: "ajman",
    countryCode: "ae",
    name: "Ajman",
    aliases: ["ajman"],
    state: "Ajman",
    centroid: { lat: 25.4052, lng: 55.5136 },
    bbox: [25.356, 55.4218, 25.4507, 55.6301],
    status: "active",
  },
  {
    slug: "ras-al-khaimah",
    countryCode: "ae",
    name: "Ras Al-Khaimah",
    aliases: ["ras al-khaimah"],
    state: "Ras Al Khaimah",
    centroid: { lat: 25.8007, lng: 55.9762 },
    bbox: [25.5404, 55.8638, 25.9124, 56.0728],
    status: "active",
  },
  {
    slug: "fujairah",
    countryCode: "ae",
    name: "Fujairah",
    aliases: ["fujairah"],
    state: "Fujairah",
    centroid: { lat: 25.1221, lng: 56.3345 },
    bbox: [25.0988, 56.2847, 25.1884, 56.3691],
    status: "active",
  },
];

/** Named areas and localities. Villages that Google puts in the city slot (Sarhol, Bandhwari,
 *  Tikampur, Shahpur) are areas of Gurgaon, not cities — that is what stops them becoming pages. */
export const AREAS: Area[] = [
  { slug: "dlf-phase-1", name: "DLF Phase 1", countryCode: "in", citySlug: "gurgaon", aliases: ["dlf phase 1", "dlf qutab enclave phase 1"] },
  { slug: "dlf-phase-2", name: "DLF Phase 2", countryCode: "in", citySlug: "gurgaon", aliases: ["dlf phase 2"] },
  { slug: "dlf-phase-3", name: "DLF Phase 3", countryCode: "in", citySlug: "gurgaon", aliases: ["dlf phase 3"] },
  { slug: "dlf-phase-4", name: "DLF Phase 4", countryCode: "in", citySlug: "gurgaon", aliases: ["dlf phase 4"] },
  { slug: "dlf-phase-5", name: "DLF Phase 5", countryCode: "in", citySlug: "gurgaon", aliases: ["dlf phase 5"] },
  { slug: "udyog-vihar", name: "Udyog Vihar", countryCode: "in", citySlug: "gurgaon", aliases: ["udyog vihar"] },
  { slug: "cyber-city", name: "Cyber City", countryCode: "in", citySlug: "gurgaon", aliases: ["cyber city", "dlf cyber city", "cybercity"] },
  { slug: "palam-vihar", name: "Palam Vihar", countryCode: "in", citySlug: "gurgaon", aliases: ["palam vihar"] },
  { slug: "sushant-lok", name: "Sushant Lok", countryCode: "in", citySlug: "gurgaon", aliases: ["sushant lok", "sushant lok phase 1", "sushant lok 1"] },
  { slug: "golf-course-road", name: "Golf Course Road", countryCode: "in", citySlug: "gurgaon", aliases: ["golf course road", "golf course extn road", "golf course extension road"] },
  { slug: "mg-road", name: "MG Road", countryCode: "in", citySlug: "gurgaon", aliases: ["mg road", "m g road", "mehrauli gurgaon road"] },
  { slug: "sohna-road", name: "Sohna Road", countryCode: "in", citySlug: "gurgaon", aliases: ["sohna road"] },
  // Villages/localities Google reports in the city position — folded into Gurgaon.
  { slug: "sarhol", name: "Sarhol", countryCode: "in", citySlug: "gurgaon", aliases: ["sarhol", "sarhaul"] },
  { slug: "bandhwari", name: "Bandhwari", countryCode: "in", citySlug: "gurgaon", aliases: ["bandhwari"] },
  { slug: "tikampur", name: "Tikampur", countryCode: "in", citySlug: "gurgaon", aliases: ["tikampur"] },
  { slug: "shahpur", name: "Shahpur", countryCode: "in", citySlug: "gurgaon", aliases: ["shahpur"] },
  { slug: "badsa", name: "Badsa", countryCode: "in", citySlug: "gurgaon", aliases: ["badsa"] },
  { slug: "sikanderpur-ghosi", name: "Sikanderpur Ghosi", countryCode: "in", citySlug: "gurgaon", aliases: ["sikanderpur ghosi", "sikanderpur"] },
  { slug: "pawala-khasrupur", name: "Pawala Khasrupur", countryCode: "in", citySlug: "gurgaon", aliases: ["pawala khasrupur"] },

  // Derived from the 141,863-place scan's own addressComponents (scripts/pseo-area-candidates.ts),
  // then reviewed before landing here. Only localities with at least 25 qualifying leads appear —
  // that is the publish threshold, so every entry below is one that can actually carry a page
  // rather than one that merely exists. The comment after each is qualifying/total.
  //
  // Gurgaon's entries above stay hand-written: its sector slugs come from resolveSectorAlias, and
  // "Gurgaon" over "Gurugram" is a search judgement no frequency count would have made correctly.
// Ahmedabad, Gujarat — 16 areas with >= 25 qualifying leads
  { slug: "old-city", name: "Old City", citySlug: "ahmedabad", countryCode: "in", aliases: ["old city"] },  // 103/158
  { slug: "navrangpura", name: "Navrangpura", citySlug: "ahmedabad", countryCode: "in", aliases: ["navrangpura"] },  // 73/277
  { slug: "satellite", name: "Satellite", citySlug: "ahmedabad", countryCode: "in", aliases: ["satellite"] },  // 62/205
  { slug: "thaltej", name: "Thaltej", citySlug: "ahmedabad", countryCode: "in", aliases: ["thaltej"] },  // 60/221
  { slug: "chandkheda", name: "Chandkheda", citySlug: "ahmedabad", countryCode: "in", aliases: ["chandkheda"] },  // 60/121
  { slug: "bodakdev", name: "Bodakdev", citySlug: "ahmedabad", countryCode: "in", aliases: ["bodakdev"] },  // 57/212
  { slug: "memnagar", name: "Memnagar", citySlug: "ahmedabad", countryCode: "in", aliases: ["memnagar"] },  // 51/106
  { slug: "gota", name: "Gota", citySlug: "ahmedabad", countryCode: "in", aliases: ["gota"] },  // 51/146
  { slug: "nikol", name: "Nikol", citySlug: "ahmedabad", countryCode: "in", aliases: ["nikol"] },  // 51/119
  { slug: "bopal", name: "Bopal", citySlug: "ahmedabad", countryCode: "in", aliases: ["bopal"] },  // 44/126
  { slug: "vastrapur", name: "Vastrapur", citySlug: "ahmedabad", countryCode: "in", aliases: ["vastrapur"] },  // 41/145
  { slug: "sola", name: "Sola", citySlug: "ahmedabad", countryCode: "in", aliases: ["sola"] },  // 37/122
  { slug: "jodhpur-village", name: "Jodhpur Village", citySlug: "ahmedabad", countryCode: "in", aliases: ["jodhpur village"] },  // 34/74
  { slug: "ellisbridge", name: "Ellisbridge", citySlug: "ahmedabad", countryCode: "in", aliases: ["ellisbridge"] },  // 32/127
  { slug: "naranpura", name: "Naranpura", citySlug: "ahmedabad", countryCode: "in", aliases: ["naranpura"] },  // 30/80
  { slug: "ambawadi", name: "Ambawadi", citySlug: "ahmedabad", countryCode: "in", aliases: ["ambawadi"] },  // 27/99

  // Bangalore, Karnataka — 6 areas with >= 25 qualifying leads
  { slug: "indiranagar", name: "Indiranagar", citySlug: "bangalore", countryCode: "in", aliases: ["indiranagar"] },  // 39/231
  { slug: "shivaji-nagar", name: "Shivaji Nagar", citySlug: "bangalore", countryCode: "in", aliases: ["shivaji nagar"] },  // 38/104
  { slug: "basavanagudi", name: "Basavanagudi", citySlug: "bangalore", countryCode: "in", aliases: ["basavanagudi"] },  // 35/72
  { slug: "koramangala", name: "Koramangala", citySlug: "bangalore", countryCode: "in", aliases: ["koramangala"] },  // 31/162
  { slug: "ashok-nagar", name: "Ashok Nagar", citySlug: "bangalore", countryCode: "in", aliases: ["ashok nagar"] },  // 31/206
  { slug: "jayanagar", name: "Jayanagar", citySlug: "bangalore", countryCode: "in", aliases: ["jayanagar"] },  // 26/161

  // Birmingham, England — 2 areas with >= 25 qualifying leads
  { slug: "small-heath", name: "Small Heath", citySlug: "birmingham", countryCode: "gb", aliases: ["small heath"] },  // 26/68
  { slug: "balsall-heath", name: "Balsall Heath", citySlug: "birmingham", countryCode: "gb", aliases: ["balsall heath"] },  // 25/79

  // Chandigarh, Chandigarh — 17 areas with >= 25 qualifying leads
  { slug: "sector-22", name: "Sector 22", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 22"] },  // 113/239
  { slug: "burail", name: "Burail", citySlug: "chandigarh", countryCode: "in", aliases: ["burail"] },  // 78/135
  { slug: "industrial-area-phase-i", name: "Industrial Area Phase I", citySlug: "chandigarh", countryCode: "in", aliases: ["industrial area phase i"] },  // 62/223
  { slug: "sector-35", name: "Sector 35", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 35"] },  // 57/155
  { slug: "sector-34", name: "Sector 34", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 34"] },  // 48/147
  { slug: "sector-7", name: "Sector 7", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 7"] },  // 39/99
  { slug: "shopping-plaza", name: "Shopping Plaza", citySlug: "chandigarh", countryCode: "in", aliases: ["shopping plaza"] },  // 35/101
  { slug: "sector-20", name: "Sector 20", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 20"] },  // 32/65
  { slug: "sector-15", name: "Sector 15", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 15"] },  // 31/57
  { slug: "industrial-area-phase-ii", name: "Industrial Area Phase II", citySlug: "chandigarh", countryCode: "in", aliases: ["industrial area phase ii"] },  // 31/87
  { slug: "sector-38", name: "Sector 38", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 38"] },  // 30/73
  { slug: "sector-27", name: "Sector 27", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 27"] },  // 30/52
  { slug: "sector-26", name: "Sector 26", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 26"] },  // 29/75
  { slug: "sector-13", name: "Sector 13", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 13"] },  // 28/42
  { slug: "sector-8", name: "Sector 8", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 8"] },  // 27/87
  { slug: "sector-37", name: "Sector 37", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 37"] },  // 26/51
  { slug: "sector-9", name: "Sector 9", citySlug: "chandigarh", countryCode: "in", aliases: ["sector 9"] },  // 25/73

  // Chennai, Tamil Nadu — 10 areas with >= 25 qualifying leads
  { slug: "george-town", name: "George Town", citySlug: "chennai", countryCode: "in", aliases: ["george town"] },  // 72/134
  { slug: "t-nagar", name: "T. Nagar", citySlug: "chennai", countryCode: "in", aliases: ["t. nagar"] },  // 65/277
  { slug: "anna-nagar", name: "Anna Nagar", citySlug: "chennai", countryCode: "in", aliases: ["anna nagar"] },  // 37/161
  { slug: "velachery", name: "Velachery", citySlug: "chennai", countryCode: "in", aliases: ["velachery"] },  // 37/116
  { slug: "ramapuram", name: "Ramapuram", citySlug: "chennai", countryCode: "in", aliases: ["ramapuram"] },  // 34/96
  { slug: "adyar", name: "Adyar", citySlug: "chennai", countryCode: "in", aliases: ["adyar"] },  // 32/119
  { slug: "porur", name: "Porur", citySlug: "chennai", countryCode: "in", aliases: ["porur"] },  // 29/91
  { slug: "triplicane", name: "Triplicane", citySlug: "chennai", countryCode: "in", aliases: ["triplicane"] },  // 29/65
  { slug: "mylapore", name: "Mylapore", citySlug: "chennai", countryCode: "in", aliases: ["mylapore"] },  // 27/82
  { slug: "egmore", name: "Egmore", citySlug: "chennai", countryCode: "in", aliases: ["egmore"] },  // 26/68

  // Coimbatore, Tamil Nadu — 10 areas with >= 25 qualifying leads
  { slug: "r-s-puram", name: "R.S. Puram", citySlug: "coimbatore", countryCode: "in", aliases: ["r.s. puram"] },  // 127/373
  { slug: "saravanampatti", name: "Saravanampatti", citySlug: "coimbatore", countryCode: "in", aliases: ["saravanampatti"] },  // 92/215
  { slug: "town-hall", name: "Town Hall", citySlug: "coimbatore", countryCode: "in", aliases: ["town hall"] },  // 73/114
  { slug: "peelamedu", name: "Peelamedu", citySlug: "coimbatore", countryCode: "in", aliases: ["peelamedu"] },  // 73/217
  { slug: "saibaba-colony", name: "Saibaba Colony", citySlug: "coimbatore", countryCode: "in", aliases: ["saibaba colony"] },  // 48/173
  { slug: "ganapathy", name: "Ganapathy", citySlug: "coimbatore", countryCode: "in", aliases: ["ganapathy"] },  // 42/127
  { slug: "tatabad", name: "Tatabad", citySlug: "coimbatore", countryCode: "in", aliases: ["tatabad"] },  // 32/113
  { slug: "ram-nagar", name: "Ram Nagar", citySlug: "coimbatore", countryCode: "in", aliases: ["ram nagar"] },  // 31/92
  { slug: "siddhapudur", name: "Siddhapudur", citySlug: "coimbatore", countryCode: "in", aliases: ["siddhapudur"] },  // 27/68
  { slug: "periyar-nagar", name: "Periyar Nagar", citySlug: "coimbatore", countryCode: "in", aliases: ["periyar nagar"] },  // 25/63

  // Delhi, Delhi — 3 areas with >= 25 qualifying leads
  { slug: "rohini", name: "Rohini", citySlug: "delhi", countryCode: "in", aliases: ["rohini"] },  // 58/168
  { slug: "dwarka", name: "Dwarka", citySlug: "delhi", countryCode: "in", aliases: ["dwarka"] },  // 43/135
  { slug: "paharganj", name: "Paharganj", citySlug: "delhi", countryCode: "in", aliases: ["paharganj"] },  // 40/92

  // Faridabad, Haryana — 20 areas with >= 25 qualifying leads
  { slug: "new-industrial-township", name: "New Industrial Township", citySlug: "faridabad", countryCode: "in", aliases: ["new industrial township"] },  // 302/625
  { slug: "old-faridabad", name: "Old Faridabad", citySlug: "faridabad", countryCode: "in", aliases: ["old faridabad"] },  // 78/123
  { slug: "neharpar-faridabad", name: "Neharpar Faridabad", citySlug: "faridabad", countryCode: "in", aliases: ["neharpar faridabad"] },  // 74/135
  { slug: "ballabhgarh", name: "Ballabhgarh", citySlug: "faridabad", countryCode: "in", aliases: ["ballabhgarh"] },  // 64/132
  { slug: "sector-16", name: "Sector 16", citySlug: "faridabad", countryCode: "in", aliases: ["sector 16"] },  // 62/117
  { slug: "sector-79", name: "Sector 79", citySlug: "faridabad", countryCode: "in", aliases: ["sector 79"] },  // 55/125
  { slug: "sector-86", name: "Sector 86", citySlug: "faridabad", countryCode: "in", aliases: ["sector 86"] },  // 53/97
  { slug: "huda-market", name: "Huda Market", citySlug: "faridabad", countryCode: "in", aliases: ["huda market"] },  // 43/84
  { slug: "sector-85", name: "Sector 85", citySlug: "faridabad", countryCode: "in", aliases: ["sector 85"] },  // 36/65
  { slug: "sector-15-faridabad", name: "Sector 15", citySlug: "faridabad", countryCode: "in", aliases: ["sector 15"] },  // 35/80
  { slug: "sector-82", name: "Sector 82", citySlug: "faridabad", countryCode: "in", aliases: ["sector 82"] },  // 34/64
  { slug: "sector-81", name: "Sector 81", citySlug: "faridabad", countryCode: "in", aliases: ["sector 81"] },  // 34/83
  { slug: "sector-12", name: "Sector 12", citySlug: "faridabad", countryCode: "in", aliases: ["sector 12"] },  // 29/83
  { slug: "sector-88", name: "Sector 88", citySlug: "faridabad", countryCode: "in", aliases: ["sector 88"] },  // 28/60
  { slug: "jawahar-colony", name: "Jawahar Colony", citySlug: "faridabad", countryCode: "in", aliases: ["jawahar colony"] },  // 28/48
  { slug: "sector-29", name: "Sector 29", citySlug: "faridabad", countryCode: "in", aliases: ["sector 29"] },  // 27/54
  { slug: "sector-17", name: "Sector 17", citySlug: "faridabad", countryCode: "in", aliases: ["sector 17"] },  // 26/55
  { slug: "sector-49", name: "Sector 49", citySlug: "faridabad", countryCode: "in", aliases: ["sector 49"] },  // 26/42
  { slug: "sector-7-faridabad", name: "Sector 7", citySlug: "faridabad", countryCode: "in", aliases: ["sector 7"] },  // 25/48
  { slug: "sector-48", name: "Sector 48", citySlug: "faridabad", countryCode: "in", aliases: ["sector 48"] },  // 25/41

  // Glasgow, Scotland — 1 areas with >= 25 qualifying leads
  { slug: "kinning-park", name: "Kinning Park", citySlug: "glasgow", countryCode: "gb", aliases: ["kinning park"] },  // 25/124

  // Gurgaon, Haryana — 20 areas with >= 25 qualifying leads
  { slug: "sector-12-gurgaon", name: "Sector 12", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 12"] },  // 68/118
  { slug: "sector-11", name: "Sector 11", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 11"] },  // 49/113
  { slug: "sector-52", name: "Sector 52", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 52"] },  // 48/130
  { slug: "sector-40", name: "Sector 40", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 40"] },  // 44/111
  { slug: "sector-38-gurgaon", name: "Sector 38", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 38"] },  // 44/113
  { slug: "sector-46", name: "Sector 46", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 46"] },  // 41/137
  { slug: "sector-43", name: "Sector 43", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 43"] },  // 38/183
  { slug: "sector-45", name: "Sector 45", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 45"] },  // 35/120
  { slug: "sector-28", name: "Sector 28", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 28"] },  // 35/153
  { slug: "sector-31", name: "Sector 31", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 31"] },  // 33/92
  { slug: "sector-7-gurgaon", name: "Sector 7", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 7"] },  // 32/70
  { slug: "sector-41", name: "Sector 41", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 41"] },  // 31/74
  { slug: "sector-14", name: "Sector 14", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 14"] },  // 30/109
  { slug: "sector-57", name: "Sector 57", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 57"] },  // 29/92
  { slug: "sector-39", name: "Sector 39", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 39"] },  // 28/92
  { slug: "sector-49-gurgaon", name: "Sector 49", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 49"] },  // 27/98
  { slug: "sector-15-gurgaon", name: "Sector 15", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 15"] },  // 27/73
  { slug: "jharsa", name: "Jharsa", citySlug: "gurgaon", countryCode: "in", aliases: ["jharsa"] },  // 26/50
  { slug: "sector-8-gurgaon", name: "Sector 8", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 8"] },  // 26/51
  { slug: "sector-50", name: "Sector 50", citySlug: "gurgaon", countryCode: "in", aliases: ["sector 50"] },  // 25/84

  // Hyderabad, Telangana — 11 areas with >= 25 qualifying leads
  { slug: "gachibowli", name: "Gachibowli", citySlug: "hyderabad", countryCode: "in", aliases: ["gachibowli"] },  // 60/199
  { slug: "jubilee-hills", name: "Jubilee Hills", citySlug: "hyderabad", countryCode: "in", aliases: ["jubilee hills"] },  // 55/251
  { slug: "madhapur", name: "Madhapur", citySlug: "hyderabad", countryCode: "in", aliases: ["madhapur"] },  // 54/188
  { slug: "banjara-hills", name: "Banjara Hills", citySlug: "hyderabad", countryCode: "in", aliases: ["banjara hills"] },  // 50/278
  { slug: "kukatpally-housing-board-colony", name: "Kukatpally Housing Board Colony", citySlug: "hyderabad", countryCode: "in", aliases: ["kukatpally housing board colony"] },  // 43/144
  { slug: "abids", name: "Abids", citySlug: "hyderabad", countryCode: "in", aliases: ["abids"] },  // 37/70
  { slug: "himayatnagar", name: "Himayatnagar", citySlug: "hyderabad", countryCode: "in", aliases: ["himayatnagar"] },  // 35/136
  { slug: "kondapur", name: "Kondapur", citySlug: "hyderabad", countryCode: "in", aliases: ["kondapur"] },  // 34/162
  { slug: "kukatpally", name: "Kukatpally", citySlug: "hyderabad", countryCode: "in", aliases: ["kukatpally"] },  // 33/99
  { slug: "toli-chowki", name: "Toli Chowki", citySlug: "hyderabad", countryCode: "in", aliases: ["toli chowki"] },  // 26/44
  { slug: "koti", name: "Koti", citySlug: "hyderabad", countryCode: "in", aliases: ["koti"] },  // 26/38

  // Indore, Madhya Pradesh — 7 areas with >= 25 qualifying leads
  { slug: "scheme-no-54", name: "Scheme No 54", citySlug: "indore", countryCode: "in", aliases: ["scheme no 54"] },  // 59/147
  { slug: "mahalaxmi-nagar", name: "Mahalaxmi Nagar", citySlug: "indore", countryCode: "in", aliases: ["mahalaxmi nagar"] },  // 37/79
  { slug: "new-palasia", name: "New Palasia", citySlug: "indore", countryCode: "in", aliases: ["new palasia"] },  // 34/93
  { slug: "south-tukoganj", name: "South Tukoganj", citySlug: "indore", countryCode: "in", aliases: ["south tukoganj"] },  // 32/107
  { slug: "sukhliya", name: "Sukhliya", citySlug: "indore", countryCode: "in", aliases: ["sukhliya"] },  // 30/68
  { slug: "sudama-nagar", name: "Sudama Nagar", citySlug: "indore", countryCode: "in", aliases: ["sudama nagar"] },  // 29/50
  { slug: "nipania", name: "Nipania", citySlug: "indore", countryCode: "in", aliases: ["nipania"] },  // 26/71

  // Jaipur, Rajasthan — 9 areas with >= 25 qualifying leads
  { slug: "mansarovar", name: "Mansarovar", citySlug: "jaipur", countryCode: "in", aliases: ["mansarovar"] },  // 84/165
  { slug: "malviya-nagar", name: "Malviya Nagar", citySlug: "jaipur", countryCode: "in", aliases: ["malviya nagar"] },  // 63/206
  { slug: "vaishali-nagar", name: "Vaishali Nagar", citySlug: "jaipur", countryCode: "in", aliases: ["vaishali nagar"] },  // 60/201
  { slug: "ashok-nagar-jaipur", name: "Ashok Nagar", citySlug: "jaipur", countryCode: "in", aliases: ["ashok nagar"] },  // 57/189
  { slug: "raja-park", name: "Raja Park", citySlug: "jaipur", countryCode: "in", aliases: ["raja park"] },  // 52/126
  { slug: "pratap-nagar", name: "Pratap Nagar", citySlug: "jaipur", countryCode: "in", aliases: ["pratap nagar"] },  // 37/85
  { slug: "jagatpura", name: "Jagatpura", citySlug: "jaipur", countryCode: "in", aliases: ["jagatpura"] },  // 31/71
  { slug: "sector-2", name: "Sector 2", citySlug: "jaipur", countryCode: "in", aliases: ["sector 2"] },  // 26/79
  { slug: "sanganer", name: "Sanganer", citySlug: "jaipur", countryCode: "in", aliases: ["sanganer"] },  // 25/42

  // Kolkata, West Bengal — 11 areas with >= 25 qualifying leads
  { slug: "bidhannagar", name: "Bidhannagar", citySlug: "kolkata", countryCode: "in", aliases: ["bidhannagar"] },  // 99/372
  { slug: "taltala", name: "Taltala", citySlug: "kolkata", countryCode: "in", aliases: ["taltala"] },  // 79/213
  { slug: "ballygunge", name: "Ballygunge", citySlug: "kolkata", countryCode: "in", aliases: ["ballygunge"] },  // 63/200
  { slug: "bhowanipore", name: "Bhowanipore", citySlug: "kolkata", countryCode: "in", aliases: ["bhowanipore"] },  // 59/168
  { slug: "park-street-area", name: "Park Street area", citySlug: "kolkata", countryCode: "in", aliases: ["park street area"] },  // 42/147
  { slug: "kalighat", name: "Kalighat", citySlug: "kolkata", countryCode: "in", aliases: ["kalighat"] },  // 42/131
  { slug: "behala", name: "Behala", citySlug: "kolkata", countryCode: "in", aliases: ["behala"] },  // 33/85
  { slug: "garia", name: "Garia", citySlug: "kolkata", countryCode: "in", aliases: ["garia"] },  // 31/76
  { slug: "elgin", name: "Elgin", citySlug: "kolkata", countryCode: "in", aliases: ["elgin"] },  // 27/100
  { slug: "tollygunge", name: "Tollygunge", citySlug: "kolkata", countryCode: "in", aliases: ["tollygunge"] },  // 26/73
  { slug: "beleghata", name: "Beleghata", citySlug: "kolkata", countryCode: "in", aliases: ["beleghata"] },  // 25/50

  // Kota, Rajasthan — 20 areas with >= 25 qualifying leads
  { slug: "gumanpura", name: "Gumanpura", citySlug: "kota", countryCode: "in", aliases: ["gumanpura"] },  // 251/420
  { slug: "talwandi", name: "Talwandi", citySlug: "kota", countryCode: "in", aliases: ["talwandi"] },  // 179/287
  { slug: "dadabari", name: "Dadabari", citySlug: "kota", countryCode: "in", aliases: ["dadabari"] },  // 114/183
  { slug: "mahaveer-nagar", name: "Mahaveer Nagar", citySlug: "kota", countryCode: "in", aliases: ["mahaveer nagar"] },  // 111/166
  { slug: "vigyan-nagar", name: "Vigyan Nagar", citySlug: "kota", countryCode: "in", aliases: ["vigyan nagar"] },  // 103/154
  { slug: "borkhera", name: "Borkhera", citySlug: "kota", countryCode: "in", aliases: ["borkhera"] },  // 93/128
  { slug: "electricity-board-area", name: "Electricity Board Area", citySlug: "kota", countryCode: "in", aliases: ["electricity board area"] },  // 90/137
  { slug: "dhanmandi", name: "Dhanmandi", citySlug: "kota", countryCode: "in", aliases: ["dhanmandi"] },  // 63/108
  { slug: "shrinath-puram", name: "Shrinath Puram", citySlug: "kota", countryCode: "in", aliases: ["shrinath puram"] },  // 62/101
  { slug: "rampura", name: "Rampura", citySlug: "kota", countryCode: "in", aliases: ["rampura"] },  // 53/79
  { slug: "bhimganj-mandi", name: "Bhimganj Mandi", citySlug: "kota", countryCode: "in", aliases: ["bhimganj mandi"] },  // 51/76
  { slug: "rangbari", name: "Rangbari", citySlug: "kota", countryCode: "in", aliases: ["rangbari"] },  // 50/71
  { slug: "indraprastha-industrial-area", name: "Indraprastha Industrial Area", citySlug: "kota", countryCode: "in", aliases: ["indraprastha industrial area"] },  // 48/110
  { slug: "nayapura", name: "Nayapura", citySlug: "kota", countryCode: "in", aliases: ["nayapura"] },  // 46/65
  { slug: "new-colony", name: "New colony", citySlug: "kota", countryCode: "in", aliases: ["new colony"] },  // 43/69
  { slug: "kota-industrial-area", name: "Kota Industrial Area", citySlug: "kota", countryCode: "in", aliases: ["kota industrial area"] },  // 41/54
  { slug: "new-rajeev-gandhi-nagar", name: "New Rajeev Gandhi Nagar", citySlug: "kota", countryCode: "in", aliases: ["new rajeev gandhi nagar"] },  // 38/67
  { slug: "railway-station-area", name: "Railway Station Area", citySlug: "kota", countryCode: "in", aliases: ["railway station area"] },  // 38/46
  { slug: "swami-vivekananda-nagar", name: "Swami Vivekananda Nagar", citySlug: "kota", countryCode: "in", aliases: ["swami vivekananda nagar"] },  // 28/42
  { slug: "chawani", name: "Chawani", citySlug: "kota", countryCode: "in", aliases: ["chawani"] },  // 27/44

  // Leeds, England — 2 areas with >= 25 qualifying leads
  { slug: "harehills", name: "Harehills", citySlug: "leeds", countryCode: "gb", aliases: ["harehills"] },  // 54/163
  { slug: "woodhouse", name: "Woodhouse", citySlug: "leeds", countryCode: "gb", aliases: ["woodhouse"] },  // 32/125

  // Lucknow, Uttar Pradesh — 9 areas with >= 25 qualifying leads
  { slug: "gomti-nagar", name: "Gomti Nagar", citySlug: "lucknow", countryCode: "in", aliases: ["gomti nagar"] },  // 206/679
  { slug: "indira-nagar", name: "Indira Nagar", citySlug: "lucknow", countryCode: "in", aliases: ["indira nagar"] },  // 73/199
  { slug: "hazratganj", name: "Hazratganj", citySlug: "lucknow", countryCode: "in", aliases: ["hazratganj"] },  // 57/144
  { slug: "alambagh", name: "Alambagh", citySlug: "lucknow", countryCode: "in", aliases: ["alambagh"] },  // 40/89
  { slug: "lda-colony", name: "LDA Colony", citySlug: "lucknow", countryCode: "in", aliases: ["lda colony"] },  // 40/88
  { slug: "rajajipuram", name: "Rajajipuram", citySlug: "lucknow", countryCode: "in", aliases: ["rajajipuram"] },  // 38/65
  { slug: "aliganj", name: "Aliganj", citySlug: "lucknow", countryCode: "in", aliases: ["aliganj"] },  // 36/92
  { slug: "golf-city", name: "Golf City", citySlug: "lucknow", countryCode: "in", aliases: ["golf city"] },  // 30/114
  { slug: "jankipuram", name: "Jankipuram", citySlug: "lucknow", countryCode: "in", aliases: ["jankipuram"] },  // 27/63

  // Manchester, England — 2 areas with >= 25 qualifying leads
  { slug: "cheetham-hill", name: "Cheetham Hill", citySlug: "manchester", countryCode: "gb", aliases: ["cheetham hill"] },  // 47/216
  { slug: "longsight", name: "Longsight", citySlug: "manchester", countryCode: "gb", aliases: ["longsight"] },  // 29/84

  // Morena, Madhya Pradesh — 12 areas with >= 25 qualifying leads
  { slug: "jiwaji-ganj", name: "Jiwaji Ganj", citySlug: "morena", countryCode: "in", aliases: ["jiwaji ganj"] },  // 228/301
  { slug: "h-b-colony", name: "H B Colony", citySlug: "morena", countryCode: "in", aliases: ["h b colony"] },  // 82/104
  { slug: "ganeshpura", name: "Ganeshpura", citySlug: "morena", countryCode: "in", aliases: ["ganeshpura"] },  // 67/78
  { slug: "gopal-pura", name: "Gopal Pura", citySlug: "morena", countryCode: "in", aliases: ["gopal pura"] },  // 53/66
  { slug: "galetha", name: "Galetha", citySlug: "morena", countryCode: "in", aliases: ["galetha"] },  // 53/59
  { slug: "housing-board-colony", name: "Housing Board Colony", citySlug: "morena", countryCode: "in", aliases: ["housing board colony"] },  // 47/63
  { slug: "sidhi-nagar", name: "Sidhi Nagar", citySlug: "morena", countryCode: "in", aliases: ["sidhi nagar"] },  // 42/49
  { slug: "police-line", name: "Police Line", citySlug: "morena", countryCode: "in", aliases: ["police line"] },  // 40/45
  { slug: "ramnagar", name: "Ramnagar", citySlug: "morena", countryCode: "in", aliases: ["ramnagar"] },  // 39/52
  { slug: "bagachini", name: "Bagachini", citySlug: "morena", countryCode: "in", aliases: ["bagachini"] },  // 35/47
  { slug: "keshav-colony", name: "Keshav Colony", citySlug: "morena", countryCode: "in", aliases: ["keshav colony"] },  // 28/37
  { slug: "sanjay-colony", name: "Sanjay Colony", citySlug: "morena", countryCode: "in", aliases: ["sanjay colony"] },  // 26/34

  // Mumbai, Maharashtra — 11 areas with >= 25 qualifying leads
  { slug: "andheri-west", name: "Andheri West", citySlug: "mumbai", countryCode: "in", aliases: ["andheri west"] },  // 85/363
  { slug: "andheri-east", name: "Andheri East", citySlug: "mumbai", countryCode: "in", aliases: ["andheri east"] },  // 73/288
  { slug: "malad", name: "Malad", citySlug: "mumbai", countryCode: "in", aliases: ["malad"] },  // 55/196
  { slug: "kandivali", name: "Kandivali", citySlug: "mumbai", countryCode: "in", aliases: ["kandivali"] },  // 49/151
  { slug: "bandra-west", name: "Bandra West", citySlug: "mumbai", countryCode: "in", aliases: ["bandra west"] },  // 40/199
  { slug: "fort", name: "Fort", citySlug: "mumbai", countryCode: "in", aliases: ["fort"] },  // 35/145
  { slug: "goregaon-west", name: "Goregaon West", citySlug: "mumbai", countryCode: "in", aliases: ["goregaon west"] },  // 31/103
  { slug: "chembur", name: "Chembur", citySlug: "mumbai", countryCode: "in", aliases: ["chembur"] },  // 30/107
  { slug: "powai", name: "Powai", citySlug: "mumbai", countryCode: "in", aliases: ["powai"] },  // 30/109
  { slug: "kurla", name: "Kurla", citySlug: "mumbai", countryCode: "in", aliases: ["kurla"] },  // 28/94
  { slug: "charni-road-east", name: "Charni Road East", citySlug: "mumbai", countryCode: "in", aliases: ["charni road east"] },  // 25/68

  // Noida, Uttar Pradesh — 10 areas with >= 25 qualifying leads
  { slug: "sector-75", name: "Sector 75", citySlug: "noida", countryCode: "in", aliases: ["sector 75"] },  // 35/107
  { slug: "sector-51", name: "Sector 51", citySlug: "noida", countryCode: "in", aliases: ["sector 51"] },  // 33/114
  { slug: "sector-76", name: "Sector 76", citySlug: "noida", countryCode: "in", aliases: ["sector 76"] },  // 33/71
  { slug: "bhangel", name: "Bhangel", citySlug: "noida", countryCode: "in", aliases: ["bhangel"] },  // 31/49
  { slug: "sector-18", name: "Sector 18", citySlug: "noida", countryCode: "in", aliases: ["sector 18"] },  // 30/251
  { slug: "sector-45-noida", name: "Sector-45", citySlug: "noida", countryCode: "in", aliases: ["sector-45"] },  // 29/68
  { slug: "sector-63", name: "Sector 63", citySlug: "noida", countryCode: "in", aliases: ["sector 63"] },  // 29/156
  { slug: "sector-10", name: "Sector 10", citySlug: "noida", countryCode: "in", aliases: ["sector 10"] },  // 28/88
  { slug: "sector-9-noida", name: "Sector 9", citySlug: "noida", countryCode: "in", aliases: ["sector 9"] },  // 28/54
  { slug: "sector-62", name: "Sector 62", citySlug: "noida", countryCode: "in", aliases: ["sector 62"] },  // 25/82

  // Pune, Maharashtra — 13 areas with >= 25 qualifying leads
  { slug: "camp", name: "Camp", citySlug: "pune", countryCode: "in", aliases: ["camp"] },  // 66/169
  { slug: "kothrud", name: "Kothrud", citySlug: "pune", countryCode: "in", aliases: ["kothrud"] },  // 62/161
  { slug: "shivajinagar", name: "Shivajinagar", citySlug: "pune", countryCode: "in", aliases: ["shivajinagar"] },  // 60/204
  { slug: "hadapsar", name: "Hadapsar", citySlug: "pune", countryCode: "in", aliases: ["hadapsar"] },  // 47/181
  { slug: "kharadi", name: "Kharadi", citySlug: "pune", countryCode: "in", aliases: ["kharadi"] },  // 45/145
  { slug: "viman-nagar", name: "Viman Nagar", citySlug: "pune", countryCode: "in", aliases: ["viman nagar"] },  // 42/184
  { slug: "baner", name: "Baner", citySlug: "pune", countryCode: "in", aliases: ["baner"] },  // 41/201
  { slug: "koregaon-park", name: "Koregaon Park", citySlug: "pune", countryCode: "in", aliases: ["koregaon park"] },  // 36/113
  { slug: "wakad", name: "Wakad", citySlug: "pune", countryCode: "in", aliases: ["wakad"] },  // 34/122
  { slug: "kondhwa", name: "Kondhwa", citySlug: "pune", countryCode: "in", aliases: ["kondhwa"] },  // 34/93
  { slug: "aundh", name: "Aundh", citySlug: "pune", countryCode: "in", aliases: ["aundh"] },  // 31/103
  { slug: "sangamvadi", name: "Sangamvadi", citySlug: "pune", countryCode: "in", aliases: ["sangamvadi"] },  // 25/86
  { slug: "sadashiv-peth", name: "Sadashiv Peth", citySlug: "pune", countryCode: "in", aliases: ["sadashiv peth"] },  // 25/61

  // Surat, Gujarat — 15 areas with >= 25 qualifying leads
  { slug: "vesu", name: "Vesu", citySlug: "surat", countryCode: "in", aliases: ["vesu"] },  // 160/444
  { slug: "adajan", name: "Adajan", citySlug: "surat", countryCode: "in", aliases: ["adajan"] },  // 143/331
  { slug: "athwa", name: "Athwa", citySlug: "surat", countryCode: "in", aliases: ["athwa"] },  // 134/313
  { slug: "pal-gam", name: "Pal Gam", citySlug: "surat", countryCode: "in", aliases: ["pal gam"] },  // 61/154
  { slug: "varachha", name: "Varachha", citySlug: "surat", countryCode: "in", aliases: ["varachha"] },  // 60/113
  { slug: "udhana", name: "Udhana", citySlug: "surat", countryCode: "in", aliases: ["udhana"] },  // 50/103
  { slug: "piplod", name: "Piplod", citySlug: "surat", countryCode: "in", aliases: ["piplod"] },  // 43/114
  { slug: "mota-varachha", name: "Mota Varachha", citySlug: "surat", countryCode: "in", aliases: ["mota varachha"] },  // 43/91
  { slug: "dindoli", name: "Dindoli", citySlug: "surat", countryCode: "in", aliases: ["dindoli"] },  // 41/60
  { slug: "althan", name: "Althan", citySlug: "surat", countryCode: "in", aliases: ["althan"] },  // 39/83
  { slug: "katargam", name: "Katargam", citySlug: "surat", countryCode: "in", aliases: ["katargam"] },  // 39/83
  { slug: "nana-varachha", name: "Nana Varachha", citySlug: "surat", countryCode: "in", aliases: ["nana varachha"] },  // 38/74
  { slug: "palanpur", name: "Palanpur", citySlug: "surat", countryCode: "in", aliases: ["palanpur"] },  // 38/72
  { slug: "nanpura", name: "Nanpura", citySlug: "surat", countryCode: "in", aliases: ["nanpura"] },  // 37/78
  { slug: "parvat-patiya", name: "Parvat Patiya", citySlug: "surat", countryCode: "in", aliases: ["parvat patiya"] },  // 29/45

  // Toronto, Ontario — 1 areas with >= 25 qualifying leads
  { slug: "old-toronto", name: "Old Toronto", citySlug: "toronto", countryCode: "ca", aliases: ["old toronto"] },  // 50/1063

  // Britain, Australia, the United States and Canada. Derived the same way, but from each
  // country's own address component (see AREA_STRATEGY): American addresses name a neighbourhood,
  // Australia's `locality` IS the suburb, and Britain fills `sublocality` only a quarter of the
  // time — so its entries mix real names (Small Heath, Handsworth) with postcode districts (B5,
  // M15), which is what is actually on the address and what people actually search.
  //
  // London is deliberately absent: no London locality clears the threshold, because the city is
  // large enough that 4,839 places spread across it leave nothing concentrated. It stays draft
  // rather than being given a page with nothing beneath it.
// Austin, Texas — 2 areas with >= 10 qualifying leads
  { slug: "downtown-austin", name: "Downtown Austin", citySlug: "austin", countryCode: "us", aliases: ["downtown austin"] },  // 10/281
  { slug: "south-austin", name: "South Austin", citySlug: "austin", countryCode: "us", aliases: ["south austin"] },  // 10/212

  // Birmingham, England — 12 areas with >= 15 qualifying leads
  { slug: "small-heath-birmingham", name: "Small Heath", citySlug: "birmingham", countryCode: "gb", aliases: ["small heath"] },  // 26/68
  { slug: "balsall-heath-birmingham", name: "Balsall Heath", citySlug: "birmingham", countryCode: "gb", aliases: ["balsall heath"] },  // 25/79
  { slug: "handsworth", name: "Handsworth", citySlug: "birmingham", countryCode: "gb", aliases: ["handsworth"] },  // 20/62
  { slug: "sparkbrook", name: "Sparkbrook", citySlug: "birmingham", countryCode: "gb", aliases: ["sparkbrook"] },  // 20/45

  // Bristol, England — 3 areas with >= 15 qualifying leads
  { slug: "clifton", name: "Clifton", citySlug: "bristol", countryCode: "gb", aliases: ["clifton"] },  // 17/257

  // Glasgow, Scotland — 13 areas with >= 15 qualifying leads
  { slug: "kinning-park-glasgow", name: "Kinning Park", citySlug: "glasgow", countryCode: "gb", aliases: ["kinning park"] },  // 25/124
  { slug: "govanhill", name: "Govanhill", citySlug: "glasgow", countryCode: "gb", aliases: ["govanhill"] },  // 24/93

  // Leeds, England — 10 areas with >= 15 qualifying leads
  { slug: "harehills-leeds", name: "Harehills", citySlug: "leeds", countryCode: "gb", aliases: ["harehills"] },  // 54/163
  { slug: "woodhouse-leeds", name: "Woodhouse", citySlug: "leeds", countryCode: "gb", aliases: ["woodhouse"] },  // 32/125
  { slug: "burley", name: "Burley", citySlug: "leeds", countryCode: "gb", aliases: ["burley"] },  // 17/105
  { slug: "armley", name: "Armley", citySlug: "leeds", countryCode: "gb", aliases: ["armley"] },  // 16/76

  // Liverpool, England — 12 areas with >= 15 qualifying leads
  { slug: "old-swan", name: "Old Swan", citySlug: "liverpool", countryCode: "gb", aliases: ["old swan"] },  // 22/100
  { slug: "anfield", name: "Anfield", citySlug: "liverpool", countryCode: "gb", aliases: ["anfield"] },  // 22/60

  // London, England — 1 areas with >= 15 qualifying leads

  // Manchester, England — 9 areas with >= 15 qualifying leads
  { slug: "cheetham-hill-manchester", name: "Cheetham Hill", citySlug: "manchester", countryCode: "gb", aliases: ["cheetham hill"] },  // 47/216
  { slug: "longsight-manchester", name: "Longsight", citySlug: "manchester", countryCode: "gb", aliases: ["longsight"] },  // 29/84

  // Melbourne, Victoria — 1 areas with >= 10 qualifying leads
  { slug: "south-melbourne", name: "South Melbourne", citySlug: "melbourne", countryCode: "au", aliases: ["south melbourne"] },  // 14/233

  // Sydney, New South Wales — 1 areas with >= 10 qualifying leads
  { slug: "haymarket", name: "Haymarket", citySlug: "sydney", countryCode: "au", aliases: ["haymarket"] },  // 17/102

  // Toronto, Ontario — 2 areas with >= 10 qualifying leads
  { slug: "north-york", name: "North York", citySlug: "toronto", countryCode: "ca", aliases: ["north york"] },  // 10/256
];

export const CITY_BY_SLUG = new Map(CITIES.map((c) => [c.slug, c]));
export const AREA_BY_SLUG = new Map(AREAS.map((a) => [a.slug, a]));

export type AliasHit = { citySlug: string; areaSlug?: string };

/**
 * Address token -> what it resolves to, **scoped by country**.
 *
 * Scoping is the whole point. Place names are not globally unique — Birmingham, Cambridge, Perth,
 * Hyderabad, Victoria and Richmond all name real cities in more than one of the countries this
 * registry now covers. A single flat map would resolve a Birmingham, Alabama address to Birmingham,
 * England, pass the text check, and only be caught by the bounding box — which is a coincidence,
 * not a design. Keyed by country, the question is asked correctly: *within this country*, what is
 * this token?
 */
export const ALIAS_MAP: Map<string, AliasHit> = (() => {
  const m = new Map<string, AliasHit>();
  for (const city of CITIES) {
    for (const alias of [city.name, ...city.aliases]) {
      m.set(`${city.countryCode}:${normalizeToken(alias)}`, { citySlug: city.slug });
    }
  }
  for (const area of AREAS) {
    for (const alias of [area.name, ...area.aliases]) {
      m.set(`${area.countryCode}:${normalizeToken(alias)}`, { citySlug: area.citySlug, areaSlug: area.slug });
    }
  }
  return m;
})();

/** Look a token up inside one country. */
export function lookupAlias(countryCode: string, token: string): AliasHit | undefined {
  return ALIAS_MAP.get(`${countryCode}:${normalizeToken(token)}`);
}

/**
 * The same table without a country, for sources that do not supply one.
 *
 * Places returns structured `addressComponents` with an explicit country; the gosom scraper returns
 * only a free-text address, and pulling a country out of that reliably across five address formats
 * is exactly the guesswork this file refuses to do. So a token that names a place in two registered
 * countries resolves to `"ambiguous"` and the lead is excluded, rather than being assigned to
 * whichever country happened to be inserted first.
 */
export const GLOBAL_ALIAS_MAP: Map<string, AliasHit | "ambiguous"> = (() => {
  const m = new Map<string, AliasHit | "ambiguous">();
  const owner = new Map<string, string>();
  const add = (token: string, hit: AliasHit, countryCode: string) => {
    const t = normalizeToken(token);
    const prev = owner.get(t);
    if (prev && prev !== countryCode) { m.set(t, "ambiguous"); return; }
    if (m.get(t) === "ambiguous") return;
    owner.set(t, countryCode);
    m.set(t, hit);
  };
  for (const city of CITIES) {
    for (const alias of [city.name, ...city.aliases]) add(alias, { citySlug: city.slug }, city.countryCode);
  }
  for (const area of AREAS) {
    for (const alias of [area.name, ...area.aliases]) {
      add(alias, { citySlug: area.citySlug, areaSlug: area.slug }, area.countryCode);
    }
  }
  return m;
})();

/**
 * Cities whose bounding box contains a point, nearest centroid first.
 *
 * The coordinate fallback for when the text says nothing usable — a lead whose address names only
 * a road, or a country whose format the parser reads badly. It never overrides a text match; it
 * only recovers leads that would otherwise be dropped entirely, which in a five-country dataset is
 * a large and growing number.
 *
 * Boxes do overlap (Delhi's contains part of Noida's, and Gurgaon sits inside Delhi's), so
 * "nearest centroid" is the tie-break rather than "first match" — which would depend on array
 * order, i.e. on nothing.
 */
export function citiesContaining(lat: number, lng: number): City[] {
  return CITIES.filter((c) => isInBbox(c, lat, lng)).sort(
    (a, b) => distanceKm(a.centroid, { lat, lng }) - distanceKm(b.centroid, { lat, lng })
  );
}

/** Lowercase, strip diacritics and punctuation, collapse whitespace. Devanagari survives NFKD
 *  intact and is matched by the explicit aliases above rather than by transliteration. */
export function normalizeToken(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Sector 104", "sector-3a", "SECTOR 12 A" -> "sector-104" / "sector-3a" / "sector-12a".
 *  Sectors are generated rather than listed: Gurgaon has 115 of them and listing each by hand
 *  would be a maintenance trap for no benefit. */
export function resolveSectorAlias(token: string): string | null {
  const m = /^sector[\s-]*(\d{1,3})\s*([a-z])?$/.exec(normalizeToken(token));
  if (!m) return null;
  const num = Number(m[1]);
  if (num < 1 || num > 115) return null;
  return `sector-${num}${m[2] ?? ""}`;
}

/**
 * "SE1" / "78704" / "M5B" -> a slug, for the countries whose neighbourhood unit is postal.
 *
 * Generated rather than listed, for exactly the reason the sector helper above is: Britain alone
 * has about 3,000 outward codes and America 41,000 ZIPs, and hand-registering the ones that happen
 * to clear a threshold today is a maintenance step in front of every scrape. The publish gate
 * already decides which of them deserves a page; the registry does not need to pre-agree.
 *
 * Shape is validated per country, so a street number or a house name can never become an area.
 */
const FIVE_DIGIT_EUROPE = new Set(["de", "fr", "es", "it"]);
const FOUR_DIGIT_EUROPE = new Set(["at", "be", "dk", "ch", "hu"]);

export function resolvePostalDistrictAlias(countryCode: string, token: string): string | null {
  const t = token.trim().toUpperCase();
  if (countryCode === "gb") return /^[A-Z]{1,2}\d[A-Z\d]?$/.test(t) ? t.toLowerCase() : null;
  if (countryCode === "ca") return /^[A-Z]\d[A-Z]$/.test(t) ? t.toLowerCase() : null;
  if (countryCode === "us") return /^\d{5}$/.test(t) ? t : null;
  // The whole code becomes the slug for every continental European format below -- these are
  // already granular units on their own (a German PLZ or a Polish two-part code names a small
  // area), the same reasoning as the US ZIP just above. Slugs keep whatever punctuation the format
  // needs to stay unambiguous (Poland's dash, Sweden's space collapsed to none) since area slugs
  // are opaque identifiers, not meant to be typed by hand.
  if (FIVE_DIGIT_EUROPE.has(countryCode)) return /^\d{5}$/.test(t) ? t : null;
  if (FOUR_DIGIT_EUROPE.has(countryCode)) return /^\d{4}$/.test(t) ? t : null;
  if (countryCode === "gr") return /^\d{3}\s?\d{2}$/.test(t) ? t.replace(/\s+/g, "") : null;
  // The remaining five formats are compound codes whose second half addresses a single street or
  // building, not a neighbourhood -- confirmed live (2026-09-02): using the whole code produced
  // 1,250 distinct "areas" for Amsterdam alone, 0 of which held enough leads to matter, and
  // dragged the daily refresh from ~40s to a 5-minute timeout evaluating them all. Truncating to
  // the first half is the same move as GB's outward code, just for a country where the code is
  // split by a literal character instead of a length convention. The full code is unaffected --
  // it still lands on leads.postal_code -- only the AREA unit gets coarser.
  if (countryCode === "nl") { const m = /^(\d{4})\s?[A-Z]{2}$/.exec(t); return m ? m[1] : null; }
  if (countryCode === "pl") { const m = /^(\d{2})-\d{3}$/.exec(t); return m ? m[1] : null; }
  if (countryCode === "pt") { const m = /^(\d{4})-\d{3}$/.exec(t); return m ? m[1] : null; }
  if (countryCode === "se" || countryCode === "cz") {
    const m = /^(\d{3})\s?\d{2}$/.exec(t);
    return m ? m[1] : null;
  }
  return null;
}

/** Display name for an area slug. Named areas come from the registry; sector slugs are generated,
 *  so they have no entry to look up and would otherwise render as "sector-104". */
export function areaDisplayName(slug: string): string {
  const named = AREA_BY_SLUG.get(slug);
  if (named) return named.name;
  // Postal districts are generated, so they have no registry entry to look up and would otherwise
  // render as their slug.
  if (/^[a-z]{1,2}\d[a-z\d]?$/.test(slug)) return slug.toUpperCase();
  if (/^\d{5}$/.test(slug)) return slug;
  const m = /^sector-(\d{1,3})([a-z])?$/.exec(slug);
  if (m) return `Sector ${m[1]}${m[2] ? m[2].toUpperCase() : ""}`;
  // Australia's auto-generated suburb slugs (see areaFromText in lib/pseo/address.ts) are the
  // suburb's own words lowercased and hyphenated -- "north-perth" for "North Perth" -- so the
  // display form is just undoing that, not looking anything up.
  if (/^[a-z]+(-[a-z]+)+$/.test(slug)) return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  return slug;
}

export function isInBbox(city: City, lat: number, lng: number): boolean {
  const [minLat, minLng, maxLat, maxLng] = city.bbox;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/** Great-circle distance in km — used to rank "nearby" locations, which are computed from whatever
 *  we actually publish rather than from a hand-written neighbour list. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
