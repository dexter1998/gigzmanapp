/**
 * Programmatic list pages (2026-10-24, Tarun: "bulk high intent pages"). Each entry is one page whose
 * every number is queried from our own data at render time — the maps lead index (`leads`) and our
 * own website reads (`scrape_domains.site_signals`). Nothing here is a typed-in figure.
 *
 * Three families, one engine (lib/lists/load.ts, components/lists/ListView.tsx):
 *   industry   /lists/<slug>                         "dentist email list", "hospital database"
 *   tech       /lists/<slug>                         "companies using shopify" — from OUR live reads
 *   service    /leads-for/<slug>                     "SEO leads" — businesses showing the buying signal
 *   nosite     /businesses-without-websites/<slug>   "restaurants without websites"
 *
 * Keyword volumes are OpenSEO measurements of 2026-10-24 (US / India per month), kept beside each
 * entry so the reason a page exists stays next to the page.
 *
 * Deliberately absent: "companies using hubspot/salesforce" — the only data we hold for those is a
 * ~2018 vendor snapshot, and presenting it as current would be false. Add when the site reader
 * detects those scripts itself.
 */

export type Signal =
  | "no_analytics" | "no_meta_pixel" | "no_google_ads" | "no_ad_pixel" | "no_booking" | "has_booking"
  | "no_https" | "no_mobile" | "old_copyright" | "has_whatsapp" | "has_careers" | "has_online_store";

export const SIGNAL_LABEL: Record<Signal, string> = {
  no_analytics: "No analytics",
  no_meta_pixel: "No Meta pixel",
  no_google_ads: "No Google Ads tag",
  no_ad_pixel: "No ad pixel",
  no_booking: "No online booking",
  has_booking: "Takes online bookings",
  no_https: "No HTTPS",
  no_mobile: "Not mobile-friendly",
  old_copyright: "Outdated site",
  has_whatsapp: "WhatsApp on site",
  has_careers: "Hiring",
  has_online_store: "Online store",
};

/** A predicate over site_signals: every group must hold; inside a group any signal may. */
export type SignalRule = { all: Signal[][] };

export type ListDef = {
  slug: string;
  kind: "industry" | "tech" | "service" | "nosite";
  /** The page's main search term, used in title/H1/first paragraph. */
  keyword: string;
  title: string;
  h1: string;
  /** Plural noun for the businesses on the page: "dental clinics". */
  noun: string;
  categories?: string[];
  country?: "in";
  rule?: SignalRule;
  cms?: string;
  /** Who this page is for, one line: what they sell to these businesses. */
  audience: string;
  /** Why these businesses buy / what the signal means — page-specific prose, 2-3 paragraphs. */
  angle: string[];
  image: string;
  imageAlt: string;
  related: string[];
  volume: string;
};

const T = (s: string) => `/resources/thumbs/${s}.webp`;

const HEALTH = ["dentist", "dental_clinic", "medical_clinic", "doctor", "skin_care_clinic", "physiotherapist", "chiropractor", "hospital", "medical_center", "wellness_center", "veterinary_care"];
const FOOD = ["restaurant", "cafe", "coffee_shop", "fast_food_restaurant", "indian_restaurant", "north_indian_restaurant", "south_indian_restaurant", "chinese_restaurant", "pizza_restaurant", "italian_restaurant", "vegetarian_restaurant", "family_restaurant", "fine_dining_restaurant", "bistro", "meal_takeaway", "breakfast_restaurant", "asian_restaurant", "american_restaurant", "mexican_restaurant", "thai_restaurant", "japanese_restaurant", "chicken_restaurant", "hamburger_restaurant", "sandwich_shop", "kebab_shop", "food_court"];
const BEAUTY = ["beauty_salon", "hair_salon", "nail_salon", "barber_shop", "spa", "massage_spa", "massage", "beautician", "makeup_artist", "skin_care_clinic"];
const FITNESS = ["gym", "fitness_center", "yoga_studio", "sports_club", "sports_complex"];
const STAY = ["hotel", "lodging", "guest_house", "bed_and_breakfast", "hostel", "private_guest_room"];
const RETAIL = ["clothing_store", "store", "convenience_store", "furniture_store", "gift_shop", "jewelry_store", "electronics_store", "cell_phone_store", "shoe_store", "home_goods_store", "book_store", "toy_store", "womens_clothing_store", "sporting_goods_store", "pet_store", "cosmetics_store", "sportswear_store", "department_store", "grocery_store", "supermarket"];
const SCHOOLS = ["school", "preschool", "primary_school", "secondary_school", "educational_institution", "university"];
const TRADES = ["electrician", "plumber", "painter", "locksmith", "roofing_contractor", "moving_company"];
const MAKERS = ["manufacturer", "supplier", "wholesaler"];
const EVENTS = ["banquet_hall", "event_venue", "wedding_venue", "catering_service"];
const LOGISTICS = ["courier_service", "shipping_service", "moving_company", "transportation_service", "storage"];
const BOOKABLE = [...BEAUTY, ...FITNESS, ...HEALTH.filter((c) => c !== "hospital"), "restaurant", "cafe", "car_repair", "car_wash", "tutor", "driving_school"];

type Ind = Omit<ListDef, "kind" | "title" | "h1"> & { title?: string; h1?: string };
const industry = (d: Ind): ListDef => ({ kind: "industry", title: d.title ?? `${cap(d.keyword)}: Verified Business Database`, h1: d.h1 ?? cap(d.keyword), ...d });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const LISTS: ListDef[] = [
  /* ───────── industry databases (global) ───────── */
  industry({ slug: "dentist-email-list", keyword: "dentist email list", title: "Dentist Email List & Database of Dental Clinics", h1: "Dentist email list and dental clinic database", noun: "dental clinics", categories: ["dentist", "dental_clinic"], volume: "590 US / 110 IN, KD 0",
    audience: "Agencies, dental-supply distributors, software and lab services selling to clinics.",
    angle: ["Dental clinics buy on trust and on chair-time: a practice that fills its chairs on referrals rarely shops for marketing, while a new clinic or one with an empty online booking slot often does.", "Every row here is a clinic with a live Google listing that we found and checked ourselves. Where the clinic has a website we read it, so the signals below — no online booking, no analytics, an outdated site — come from the clinic's own pages, not from a vendor's guess."],
    image: T("web-design-for-dentists-an-honest-look"), imageAlt: "Illustration of a dental clinic storefront beside a clinic website mock-up",
    related: ["web-design-for-dentists-an-honest-look", "bought-database-vs-live-search", "qualifying-a-local-lead-before-you-call"] }),
  industry({ slug: "clinic-database", keyword: "clinic database", title: "Clinic Database: Medical, Skin & Physio Clinics", h1: "Clinic database", noun: "clinics", categories: ["medical_clinic", "skin_care_clinic", "physiotherapist", "chiropractor", "medical_center", "wellness_center"], volume: "590 US / 260 IN",
    audience: "Healthcare SaaS, diagnostics partners, medical suppliers and healthcare marketers.",
    angle: ["Clinics are small, owner-run and local, which makes them reachable by phone and slow to respond to cold email from strangers. The signal that matters most is whether a clinic takes appointments online: one that does not is either content with walk-ins or losing patients to the clinic down the road that does.", "Skin, physiotherapy and wellness clinics run closer to retail than to medicine — they advertise, run offers and buy software — so they are separated out in the category breakdown below."],
    image: T("web-design-for-dentists-an-honest-look"), imageAlt: "Illustration of a clinic beside a website with appointment icons",
    related: ["web-design-for-dentists-an-honest-look", "qualifying-a-local-lead-before-you-call", "which-local-verticals-actually-pay-for-a-website"] }),
  industry({ slug: "doctor-database", keyword: "doctor database", title: "Doctor Database & Email List of Practising Doctors", h1: "Doctor database and email list", noun: "doctors' practices", categories: ["doctor"], volume: "590 US / 210 IN (+ 'doctor email list' 320 US)",
    audience: "Pharma and medical-device reps, healthcare software, diagnostic labs and medical marketers.",
    angle: ["These are individual doctors' practices with a public Google listing — the consultation rooms, not the hospitals. Most are one doctor and one receptionist, which is why the phone line is the channel that works and why we show how many have one.", "A doctor's own website, where one exists, usually says what they treat and whether they take appointments online; we read it and report both."],
    image: T("web-design-for-dentists-an-honest-look"), imageAlt: "Illustration of a medical practice and its website",
    related: ["web-design-for-dentists-an-honest-look", "qualifying-a-local-lead-before-you-call", "cold-call-script-selling-websites-local-businesses"] }),
  industry({ slug: "hospital-database", keyword: "hospital database", title: "Hospital Database & Email List with Websites Checked", h1: "Hospital database and email list", noun: "hospitals and medical centres", categories: ["hospital", "medical_center"], volume: "210 US / 320 IN (+ 'hospital email list' 210)",
    audience: "Medical equipment, hospital software (HIS), staffing, facility services and healthcare marketing.",
    angle: ["Hospitals buy through departments and procurement, so a hospital list is the start of account research rather than a call list: the useful facts are size, whether the hospital is hiring (a careers page is a reliable sign of growth), and which systems its website already runs.", "We list hospitals and medical centres with a live Google listing, read each website we can reach, and report what it shows."],
    image: T("web-design-for-dentists-an-honest-look"), imageAlt: "Illustration of a healthcare building and website",
    related: ["bought-database-vs-live-search", "why-apollo-and-zoominfo-miss-businesses-without-websites", "how-many-touches-before-a-local-business-buys"] }),
  industry({ slug: "pharmacy-database", keyword: "pharmacy database", title: "Pharmacy Database & Email List of Chemists", h1: "Pharmacy database", noun: "pharmacies and chemists", categories: ["pharmacy"], volume: "320 US / 210 IN",
    audience: "Pharma distributors, pharmacy software, payment and delivery partners.",
    angle: ["Independent pharmacies compete with chains and delivery apps on speed and trust. The ones with WhatsApp ordering on their site or listing are already selling remotely; the ones without are the gap delivery and software partners talk about.", "Every pharmacy here has a live Google listing; websites, where they exist, are read by us."],
    image: T("which-retail-shops-actually-need-a-website"), imageAlt: "Illustration of a retail shopfront and online storefront",
    related: ["which-retail-shops-actually-need-a-website", "whatsapp-outreach-local-business-india", "bought-database-vs-live-search"] }),
  industry({ slug: "restaurant-database", keyword: "restaurant database", title: "Restaurant Database & Email List of Restaurants", h1: "Restaurant database and email list", noun: "restaurants and cafés", categories: FOOD, volume: "140 US / 50 IN (+ 'restaurant email list' 170 US)",
    audience: "POS and restaurant software, food suppliers, delivery partners, marketing and design agencies.",
    angle: ["Restaurants are the largest single category in local commerce and the most crowded one to sell into. What separates a good prospect is visible from outside: a menu that lives only on a delivery app, no way to reserve a table on its own site, or no website at all.", "We count restaurants, cafés and takeaways with a live Google listing and read every website we can reach for a menu page, table booking, WhatsApp ordering and ad tracking."],
    image: T("how-to-sell-websites-to-restaurants"), imageAlt: "Illustration of a restaurant front with an online menu",
    related: ["how-to-sell-websites-to-restaurants", "how-to-sell-websites-to-bakeries-and-cafes", "which-local-verticals-actually-pay-for-a-website"] }),
  industry({ slug: "hotel-database", keyword: "hotel database", title: "Hotel Database & Email List: Hotels and Guest Houses", h1: "Hotel database and email list", noun: "hotels and guest houses", categories: STAY, volume: "140 US / 140 IN (+ 'hotel email list' 90)",
    audience: "Booking engines, channel managers, hospitality suppliers and travel marketers.",
    angle: ["Hotels split cleanly into two markets: chain and branded properties that buy centrally, and independent hotels and guest houses that are run by the owner and depend on OTAs for bookings. The second group is where direct-booking software and marketing sell.", "The test is simple and on the property's own website: can a guest book directly? We read each site and report it."],
    image: T("how-to-sell-websites-to-guest-houses"), imageAlt: "Illustration of a guest house and a direct booking page",
    related: ["how-to-sell-websites-to-guest-houses", "which-local-verticals-actually-pay-for-a-website", "the-lifetime-value-of-one-local-client"] }),
  industry({ slug: "retail-database", keyword: "retail database", title: "Retail Store Database & Email List of Local Shops", h1: "Retail store database", noun: "retail stores", categories: RETAIL, volume: "720 US / 110 IN",
    audience: "Retail POS and inventory software, wholesalers and brands, e-commerce builders and marketers.",
    angle: ["Independent retail is where most local businesses sit, and it buys the most varied things — stock, POS, delivery, marketing, a storefront online. An online store on the shop's own site is the dividing line: those with one are already selling remotely, those without are where e-commerce tools and agencies start.", "We count shops with a live Google listing across clothing, electronics, furniture, gifts, jewellery and more, and read their websites."],
    image: T("which-retail-shops-actually-need-a-website"), imageAlt: "Illustration of a retail shopfront and an online store",
    related: ["which-retail-shops-actually-need-a-website", "how-to-sell-websites-to-electronics-stores", "why-facebook-only-businesses-are-your-best-prospects"] }),
  industry({ slug: "real-estate-agent-database", keyword: "real estate agent database", title: "Real Estate Agent Database & Email List of Agencies", h1: "Real estate agent database and email list", noun: "real estate agencies", categories: ["real_estate_agency"], volume: "210 US / 70 IN (+ 'real estate agent email list' 590 US)",
    audience: "CRM and listing software, photographers and video, mortgage partners and property marketers.",
    angle: ["Agencies live on listings and leads, so they are among the few local businesses that already spend on marketing and software. The useful signals are tracking (an agency running ads without a pixel is wasting money it knows it spends) and whether the site is current.", "This is a list of agencies, not of home buyers — the people who sell to agents, not to their customers."],
    image: T("high-ticket-web-design-niches-in-india"), imageAlt: "Illustration of a property agency and listing site",
    related: ["high-ticket-web-design-niches-in-india", "the-lifetime-value-of-one-local-client", "bought-database-vs-live-search"] }),
  industry({ slug: "lawyer-database", keyword: "lawyer database", title: "Lawyer Database & Email List of Law Firms", h1: "Lawyer database and email list", noun: "lawyers and law firms", categories: ["lawyer"], volume: "70 US (+ 'lawyer email list' 320, 'lawyer leads' 480)",
    audience: "Legal software, legal marketing, document and research services.",
    angle: ["Law firms buy slowly and on referral, but they pay well and stay. The firms worth a first call are the ones whose website is out of date or missing — a firm that does not look current online is losing clients who check before they call.", "We list lawyers and law firms with a live Google listing and read their sites."],
    image: T("are-lawyers-and-accountants-a-good-web-design-niche"), imageAlt: "Illustration of a law office and professional website",
    related: ["are-lawyers-and-accountants-a-good-web-design-niche", "high-ticket-web-design-niches-in-india", "the-first-call-10-questions-that-qualify-a-lead"] }),
  industry({ slug: "accountant-database", keyword: "accountant database", title: "Accountant & CA Firm Database with Email List", h1: "Accountant and CA firm database", noun: "accounting and CA firms", categories: ["accounting"], volume: "'accounting customers' 390 US · 'list of chartered accountants' 260 IN",
    audience: "Accounting and tax software, fintech, practice-management tools and marketing for professionals.",
    angle: ["Accounting practices are small professional firms with recurring clients and recurring software spend. Season matters: the months before filing deadlines are when they buy tools, and the months after are when they have time to talk.", "Each firm here has a public Google listing; we read their websites for services, contact routes and hiring."],
    image: T("are-lawyers-and-accountants-a-good-web-design-niche"), imageAlt: "Illustration of a professional office and website",
    related: ["are-lawyers-and-accountants-a-good-web-design-niche", "the-lifetime-value-of-one-local-client", "credit-based-vs-seat-based-lead-tools"] }),
  industry({ slug: "salon-database", keyword: "salon database", title: "Salon Database & Email List: Salons, Spas, Barbers", h1: "Salon and spa database", noun: "salons, spas and barbers", categories: BEAUTY, volume: "110 US",
    audience: "Salon booking software, beauty product distributors, payment and marketing providers.",
    angle: ["Salons run on appointments and repeat visits, which makes online booking the clearest buying signal in the whole category: a busy salon without it is taking bookings by phone and losing the ones who will not call.", "We list salons, spas, nail studios and barbers with a live Google listing and check their websites for booking, WhatsApp and tracking."],
    image: T("how-to-sell-websites-to-salons-and-barbershops"), imageAlt: "Illustration of a salon front and booking page",
    related: ["how-to-sell-websites-to-salons-and-barbershops", "which-local-verticals-actually-pay-for-a-website", "whatsapp-outreach-local-business-india"] }),
  industry({ slug: "gym-database", keyword: "gym database", title: "Gym & Fitness Studio Database with Email List", h1: "Gym and fitness studio database", noun: "gyms and fitness studios", categories: FITNESS, volume: "gym leads cluster",
    audience: "Gym management software, equipment suppliers, supplement brands and fitness marketers.",
    angle: ["Gyms sell memberships against a monthly churn, so they spend on marketing every month — which makes ad tracking the tell: a gym advertising without a pixel cannot see what its spend returns.", "We list gyms, yoga studios and fitness centres with a live Google listing and read their sites for booking, membership pages and tracking."],
    image: T("how-to-sell-websites-to-gyms"), imageAlt: "Illustration of a gym and its membership website",
    related: ["how-to-sell-websites-to-gyms", "how-to-sell-websites-to-sports-academies", "which-local-verticals-actually-pay-for-a-website"] }),
  industry({ slug: "school-database", keyword: "school database", title: "School Database & Email List: Schools and Institutes", h1: "School and institute database", noun: "schools and institutes", categories: SCHOOLS, volume: "'list of schools in india' 140 IN",
    audience: "EdTech, school ERP and admissions software, uniforms, transport and education marketers.",
    angle: ["Schools and institutes buy in an annual cycle tied to admissions. A site with an admissions page is actively recruiting; one without is relying on word of mouth — both useful facts for whoever sells admissions tools or marketing.", "We list schools, pre-schools, colleges and institutes with a live Google listing and read their websites for admissions pages and enquiry forms."],
    image: T("how-to-sell-websites-to-coaching-centres"), imageAlt: "Illustration of a school building and admissions website",
    related: ["how-to-sell-websites-to-coaching-centres", "how-to-sell-websites-to-sports-academies", "which-local-verticals-actually-pay-for-a-website"] }),
  industry({ slug: "car-dealer-database", keyword: "car dealer database", title: "Car Dealer Database & Email List of Dealerships", h1: "Car dealer database", noun: "car dealers", categories: ["car_dealer"], volume: "'car dealer email list' 140 US, 'car dealer leads' 110",
    audience: "Dealer software, automotive marketing, finance and insurance partners.",
    angle: ["Dealerships advertise constantly and measure obsessively — or should. Missing ad tracking on a dealer's site is an unusually strong signal, because the dealer is almost certainly already paying for ads.", "We list car dealers with a live Google listing and read their sites."],
    image: T("how-to-sell-websites-to-car-repair-shops"), imageAlt: "Illustration of an automotive business and website",
    related: ["how-to-sell-websites-to-car-repair-shops", "how-to-sell-websites-to-car-washes", "the-lifetime-value-of-one-local-client"] }),
  industry({ slug: "auto-repair-shop-database", keyword: "auto repair shop database", title: "Auto Repair Shop Database: Garages and Car Services", h1: "Auto repair shop database", noun: "garages and car service businesses", categories: ["car_repair", "tire_shop", "car_wash", "auto_parts_store"], volume: "car repair is our largest category",
    audience: "Garage software, auto-parts distributors, booking tools and local marketers.",
    angle: ["Car repair is the largest category we track and one of the least online: garages win on location and word of mouth, and a large share have no website at all. Those that do rarely take bookings online.", "We list garages, tyre shops, car washes and parts stores with a live Google listing and read every site we can reach."],
    image: T("how-to-sell-websites-to-car-repair-shops"), imageAlt: "Illustration of a car repair garage and website",
    related: ["how-to-sell-websites-to-car-repair-shops", "how-to-sell-websites-to-car-washes", "which-business-types-least-likely-to-have-a-website"] }),
  industry({ slug: "contractor-database", keyword: "contractor database", title: "Contractor Database: Electricians, Plumbers, Painters", h1: "Contractor database", noun: "contractors and trades", categories: TRADES, volume: "'contractor email list' 170 US",
    audience: "Field-service software, building suppliers, insurance and trade marketers.",
    angle: ["Trades are booked by phone and recommended by word of mouth, so their phone numbers are the asset and their websites, where they exist, are thin. That makes them the businesses most often missing from bought B2B databases, which index companies by website.", "This is a list of tradespeople as businesses — not homeowner job leads."],
    image: T("web-design-for-contractors-where-the-leads-are"), imageAlt: "Illustration of a contractor's van and website",
    related: ["web-design-for-contractors-where-the-leads-are", "why-apollo-and-zoominfo-miss-businesses-without-websites", "does-cold-calling-still-work-for-web-design"] }),
  industry({ slug: "manufacturer-database", keyword: "manufacturer database", title: "Manufacturer Database: Manufacturers and Suppliers", h1: "Manufacturer and supplier database", noun: "manufacturers, suppliers and wholesalers", categories: MAKERS, volume: "210 US / 110 IN",
    audience: "Industrial suppliers, logistics, B2B marketplaces, ERP and export services.",
    angle: ["Small manufacturers and wholesalers are B2B businesses that mostly sell offline — through dealers, trade fairs and repeat orders — and many have websites that were built once and left. An old copyright year or a site with no enquiry form is common, and so is a careers page when the business is expanding.", "We list manufacturers, suppliers and wholesalers with a live Google listing and read their websites."],
    image: T("how-to-sell-websites-to-wholesalers"), imageAlt: "Illustration of a factory, a product website and a handshake",
    related: ["how-to-sell-websites-to-wholesalers", "justdial-indiamart-as-lead-sources", "bought-database-vs-live-search"] }),
  industry({ slug: "travel-agency-database", keyword: "travel agency database", title: "Travel Agency Database & Email List of Tour Operators", h1: "Travel agency database", noun: "travel agencies and tour operators", categories: ["travel_agency", "tour_agency"], volume: "travel agency cluster",
    audience: "Travel tech, booking engines, hospitality partners and travel marketers.",
    angle: ["Travel agencies sell packages that customers research online first, so an agency's website is its shop window. Missing tracking and missing booking are the common gaps.", "We list travel agencies and tour operators with a live Google listing and read their sites."],
    image: T("how-indian-agencies-win-uk-and-australian-clients"), imageAlt: "Illustration of travel and international clients",
    related: ["which-local-verticals-actually-pay-for-a-website", "the-lifetime-value-of-one-local-client", "bought-database-vs-live-search"] }),
  industry({ slug: "insurance-agency-database", keyword: "insurance agency database", title: "Insurance Agency Database & Email List of Agents", h1: "Insurance agency database", noun: "insurance agencies", categories: ["insurance_agency"], volume: "'insurance agents' cluster",
    audience: "Insurtech, CRM, lead-management software and marketing for agents.",
    angle: ["These are insurance agencies as businesses — the people who sell policies — not consumers looking for insurance. Agencies live on lead flow and follow-up, so CRM and marketing tools sell well to them.", "We list agencies with a live Google listing and read their sites."],
    image: T("are-lawyers-and-accountants-a-good-web-design-niche"), imageAlt: "Illustration of a professional services office",
    related: ["are-lawyers-and-accountants-a-good-web-design-niche", "the-lifetime-value-of-one-local-client", "how-many-touches-before-a-local-business-buys"] }),
  industry({ slug: "consultant-database", keyword: "consultant database", title: "Consultant Database: Consulting Firms and Advisors", h1: "Consultant and consulting firm database", noun: "consultants and consulting firms", categories: ["consultant"], volume: "consultant leads cluster",
    audience: "Professional-services software, co-working, finance and marketing for consultants.",
    angle: ["Consultants are small, high-value firms that sell expertise — and often present it poorly online. A consultant with no analytics on their site has no idea which page brings enquiries.", "We list consultants with a live Google listing and read their websites."],
    image: T("are-lawyers-and-accountants-a-good-web-design-niche"), imageAlt: "Illustration of a professional office and website",
    related: ["are-lawyers-and-accountants-a-good-web-design-niche", "high-ticket-web-design-niches-in-india", "the-first-call-10-questions-that-qualify-a-lead"] }),
  industry({ slug: "event-venue-database", keyword: "event venue database", title: "Event Venue & Caterer Database: Banquets, Weddings", h1: "Event venue and caterer database", noun: "event venues and caterers", categories: EVENTS, volume: "'catering leads' 110",
    audience: "Event software, décor and AV suppliers, wedding marketers and booking platforms.",
    angle: ["Venues and caterers sell high-ticket, date-bound events, and couples and companies compare them online. Galleries, packages and an enquiry or booking form are what a good venue site has; many do not.", "We list banquet halls, event and wedding venues and caterers with a live Google listing and read their sites."],
    image: T("how-to-sell-websites-to-caterers"), imageAlt: "Illustration of a catering and events business",
    related: ["how-to-sell-websites-to-caterers", "high-ticket-web-design-niches-in-india", "good-better-best-packaging-website-offers"] }),
  industry({ slug: "logistics-company-database", keyword: "logistics company database", title: "Logistics Company Database: Couriers, Movers, Freight", h1: "Logistics and courier company database", noun: "logistics and courier businesses", categories: LOGISTICS, volume: "'logistics leads' 110",
    audience: "Fleet and logistics software, packaging, fuel and fintech partners.",
    angle: ["Couriers, movers and transport firms are B2B and B2C at once, run on phone and WhatsApp, and grow by adding routes and vehicles — a careers page hiring drivers is the clearest growth signal.", "We list them with a live Google listing and read their websites."],
    image: T("how-to-sell-websites-to-wholesalers"), imageAlt: "Illustration of a warehouse and logistics",
    related: ["how-to-sell-websites-to-wholesalers", "whatsapp-outreach-local-business-india", "bought-database-vs-live-search"] }),
  industry({ slug: "hardware-store-database", keyword: "hardware store database", title: "Hardware Store Database: Building Supply Stores", h1: "Hardware and building supply store database", noun: "hardware and building supply stores", categories: ["hardware_store", "building_materials_store", "home_improvement_store"], volume: "hardware cluster",
    audience: "Building-material brands and distributors, POS, credit and delivery partners.",
    angle: ["Hardware and building-supply stores sell to contractors on credit and repeat orders — real money, and very little of it online. Half of them have no website.", "We list them with a live Google listing and read the sites that exist."],
    image: T("how-to-sell-websites-to-hardware-stores"), imageAlt: "Illustration of a hardware store",
    related: ["how-to-sell-websites-to-hardware-stores", "which-retail-shops-actually-need-a-website", "web-design-for-contractors-where-the-leads-are"] }),
  industry({ slug: "bakery-database", keyword: "bakery database", title: "Bakery & Cake Shop Database with Email List", h1: "Bakery and cake shop database", noun: "bakeries and cake shops", categories: ["bakery", "cake_shop", "pastry_shop", "confectionery", "dessert_shop"], volume: "bakery cluster",
    audience: "Food ingredient suppliers, packaging, ordering software and food marketers.",
    angle: ["Bakeries take custom orders — cakes for dates — by phone and WhatsApp. A bakery with WhatsApp on its site already sells remotely; one without online ordering is the opening for ordering tools.", "We list bakeries and cake shops with a live Google listing and read their sites."],
    image: T("how-to-sell-websites-to-bakeries-and-cafes"), imageAlt: "Illustration of a bakery and an online order page",
    related: ["how-to-sell-websites-to-bakeries-and-cafes", "how-to-sell-websites-to-restaurants", "whatsapp-outreach-local-business-india"] }),
  industry({ slug: "pet-business-database", keyword: "pet business database", title: "Pet Business Database: Vets, Pet Stores, Groomers", h1: "Pet business database", noun: "vets, pet stores and pet services", categories: ["veterinary_care", "pet_store", "pet_care"], volume: "pet cluster",
    audience: "Pet food and product brands, clinic software and pet-care marketers.",
    angle: ["Pet businesses run on repeat visits and loyalty — vet appointments, grooming, food. Booking and WhatsApp are the useful signals.", "We list vets, pet stores and pet-care services with a live Google listing and read their sites."],
    image: T("which-retail-shops-actually-need-a-website"), imageAlt: "Illustration of a local shopfront",
    related: ["which-retail-shops-actually-need-a-website", "which-local-verticals-actually-pay-for-a-website", "whatsapp-outreach-local-business-india"] }),

  /* ───────── India-specific "list of X in India" ───────── */
  industry({ slug: "list-of-hospitals-in-india", keyword: "list of hospitals in India", title: "List of Hospitals in India with Websites Checked", h1: "List of hospitals in India", noun: "hospitals and medical centres", categories: ["hospital", "medical_center"], country: "in", volume: "210 IN",
    audience: "Medical equipment, HIS software, staffing and healthcare services selling to Indian hospitals.",
    angle: ["Indian hospitals range from 10-bed nursing homes to multi-specialty chains, and they buy very differently. The listing tells you which city and locality; the website tells you which specialities, whether they are hiring, and how current they are online.", "Every hospital here has a live Google listing in an Indian city we cover, and every website we could reach has been read."],
    image: T("web-design-for-dentists-an-honest-look"), imageAlt: "Illustration of a healthcare building and website",
    related: ["tier-2-indian-cities-are-the-real-web-design-market", "which-indian-cities-have-the-biggest-website-gap", "bought-database-vs-live-search"] }),
  industry({ slug: "list-of-schools-in-india", keyword: "list of schools in India", title: "List of Schools in India: Schools and Institutes", h1: "List of schools in India", noun: "schools and institutes", categories: SCHOOLS, country: "in", volume: "140 IN",
    audience: "EdTech, school ERP, admissions marketing, uniforms and transport services in India.",
    angle: ["Indian schools buy around admissions season (roughly November to April). An admissions page on the school's own site shows it is recruiting online; many schools still rely on a board outside the gate.", "Every school and institute here has a live Google listing in an Indian city we cover."],
    image: T("how-to-sell-websites-to-coaching-centres"), imageAlt: "Illustration of a school and admissions page",
    related: ["how-to-sell-websites-to-coaching-centres", "tier-2-indian-cities-are-the-real-web-design-market", "selling-in-hindi-what-changes-in-a-sales-call"] }),
  industry({ slug: "list-of-hotels-in-india", keyword: "list of hotels in India", title: "List of Hotels in India: Hotels and Guest Houses", h1: "List of hotels in India", noun: "hotels and guest houses", categories: STAY, country: "in", volume: "110 IN",
    audience: "Booking engines, channel managers and hospitality suppliers selling to Indian properties.",
    angle: ["Most Indian hotels outside the chains depend on OTAs for bookings and pay commission on every one. A direct booking engine on the property's site is the dividing line we check.", "Every property here has a live Google listing in an Indian city we cover."],
    image: T("how-to-sell-websites-to-guest-houses"), imageAlt: "Illustration of a guest house and booking page",
    related: ["how-to-sell-websites-to-guest-houses", "tier-2-indian-cities-are-the-real-web-design-market", "india-vs-uk-vs-australia-website-adoption"] }),
  industry({ slug: "list-of-chartered-accountants-in-india", keyword: "list of chartered accountants in India", title: "List of Chartered Accountants in India: CA Firms", h1: "List of chartered accountants in India", noun: "CA and accounting firms", categories: ["accounting"], country: "in", volume: "260 IN",
    audience: "Tax and accounting software, fintech, and professional-services marketers in India.",
    angle: ["CA firms in India are small partnerships with recurring GST, audit and ITR work. The weeks after a filing deadline are when they have time to evaluate tools.", "Every firm here has a live Google listing in an Indian city we cover; websites are read where they exist."],
    image: T("are-lawyers-and-accountants-a-good-web-design-niche"), imageAlt: "Illustration of a professional office",
    related: ["are-lawyers-and-accountants-a-good-web-design-niche", "how-to-take-advance-payment-from-indian-clients", "tier-2-indian-cities-are-the-real-web-design-market"] }),
  industry({ slug: "list-of-doctors-in-india", keyword: "list of doctors in India", title: "List of Doctors in India: Clinics and Practices", h1: "List of doctors in India", noun: "doctors' practices and clinics", categories: ["doctor", "medical_clinic"], country: "in", volume: "70 IN",
    audience: "Pharma, diagnostics, clinic software and healthcare marketing in India.",
    angle: ["Indian doctors' practices are mostly single-doctor clinics, reachable by phone during OPD hours. Online appointments are still uncommon outside the metros.", "Every practice here has a live Google listing in an Indian city we cover."],
    image: T("web-design-for-dentists-an-honest-look"), imageAlt: "Illustration of a clinic and website",
    related: ["web-design-for-dentists-an-honest-look", "call-whatsapp-or-walk-in-indian-smbs", "selling-in-hindi-what-changes-in-a-sales-call"] }),
  industry({ slug: "list-of-restaurants-in-india", keyword: "list of restaurants in India", title: "List of Restaurants in India with Websites Checked", h1: "List of restaurants in India", noun: "restaurants and cafés", categories: FOOD, country: "in", volume: "40 IN",
    audience: "Restaurant POS, food suppliers, delivery and marketing for Indian restaurants.",
    angle: ["Indian restaurants lean on Zomato and Swiggy for discovery and pay for it in commission; a direct ordering page on their own site is still uncommon.", "Every restaurant here has a live Google listing in an Indian city we cover."],
    image: T("how-to-sell-websites-to-restaurants"), imageAlt: "Illustration of a restaurant and online menu",
    related: ["how-to-sell-websites-to-restaurants", "call-whatsapp-or-walk-in-indian-smbs", "tier-2-indian-cities-are-the-real-web-design-market"] }),
  industry({ slug: "list-of-manufacturers-in-india", keyword: "list of manufacturers in India", title: "List of Manufacturers in India: MSMEs and Suppliers", h1: "List of manufacturers in India", noun: "manufacturers, suppliers and wholesalers", categories: MAKERS, country: "in", volume: "50 IN",
    audience: "Industrial suppliers, export services, B2B marketplaces and ERP vendors in India.",
    angle: ["Indian MSME manufacturers sell through dealers, IndiaMART and trade relationships; their own websites are often a brochure built years ago. That gap is what export, marketplace and marketing services sell into.", "Every business here has a live Google listing in an Indian city we cover."],
    image: T("how-to-sell-websites-to-wholesalers"), imageAlt: "Illustration of a factory and product website",
    related: ["how-to-sell-websites-to-wholesalers", "justdial-indiamart-as-lead-sources", "tier-2-indian-cities-are-the-real-web-design-market"] }),

  /* ───────── tech (our own live reads) ───────── */
  ...([
    ["wordpress", "WordPress", "20 US"], ["shopify", "Shopify", "90 US"], ["wix", "Wix", "10 US"],
    ["squarespace", "Squarespace", "—"], ["webflow", "Webflow", "—"],
  ] as const).map(([cms, name, vol]): ListDef => ({
    slug: `companies-using-${cms}`, kind: "tech", keyword: `companies using ${name}`, cms,
    title: `Companies Using ${name}: Live-Checked List`, h1: `Companies using ${name}`, noun: `businesses on ${name}`, volume: vol,
    audience: `${name} developers, theme and plugin makers, migration and hosting providers, and agencies that specialise in ${name}.`,
    angle: [`A business's platform is the single best filter for a ${name} specialist: a developer who knows the platform can quote faster, fix more and pitch upgrades that a generalist cannot.`, `Every count here comes from our own reads of each business's website — we detect the platform from the page itself, so this is what the site runs now, not what a vendor recorded years ago.`],
    image: T("why-tech-stack-filtering-misses-your-best-prospects"), imageAlt: "Illustration of website platforms and a prospect list",
    related: ["why-tech-stack-filtering-misses-your-best-prospects", "how-to-price-a-website-redesign", "website-maintenance-plans-what-to-charge"],
  })),
];

/* ───────── service (ICP) pages: /leads-for/<slug> ───────── */
type Svc = Omit<ListDef, "kind">;
const svc = (d: Svc): ListDef => ({ kind: "service", ...d });
export const SERVICE_LISTS: ListDef[] = [
  svc({ slug: "seo-agencies", keyword: "SEO leads", title: "SEO Leads: Businesses With No Analytics on Their Site", h1: "SEO leads: businesses that can't see their own traffic", noun: "businesses with no analytics", rule: { all: [["no_analytics"]] }, volume: "'seo leads' 320 US / 110 IN, KD 0 · 'seo clients' 170",
    audience: "SEO agencies and freelancers looking for clients.",
    angle: ["A business with a website and no analytics has never looked at where its visitors come from — which means nobody has ever done SEO for it, and the first conversation is easy: you can tell them something about their own site they do not know.", "Every business here has a website we read ourselves, and none of those websites load Google Analytics, Tag Manager or any comparable tracker."],
    image: T("why-tech-stack-filtering-misses-your-best-prospects"), imageAlt: "Illustration of a website with missing analytics",
    related: ["qualifying-a-local-lead-before-you-call", "what-to-send-a-local-business-after-the-call", "how-many-touches-before-a-local-business-buys"] }),
  svc({ slug: "digital-marketing-agencies", keyword: "digital marketing leads", title: "Digital Marketing Leads: Businesses Not Tracking Ads", h1: "Digital marketing leads: businesses with no ad tracking", noun: "businesses with no Meta pixel and no Google Ads tag", rule: { all: [["no_meta_pixel"], ["no_google_ads"]] }, volume: "'digital marketing leads' 590 US / 590 IN, KD 0",
    audience: "Digital marketing and performance agencies looking for clients.",
    angle: ["A business with neither a Meta pixel nor a Google Ads tag on its site is either not advertising at all or advertising blind — and both are a digital marketing agency's opening line.", "We read every website ourselves and check for both tags; a business appears here only when both are missing."],
    image: T("cold-email-for-local-businesses-when-it-works"), imageAlt: "Illustration of an outreach campaign to local businesses",
    related: ["cold-email-for-local-businesses-when-it-works", "how-many-touches-before-a-local-business-buys", "good-better-best-packaging-website-offers"] }),
  svc({ slug: "website-redesign", keyword: "website redesign leads", title: "Website Redesign Leads: Outdated and Insecure Sites", h1: "Website redesign leads: businesses with an outdated site", noun: "businesses with an outdated, insecure or non-mobile site", rule: { all: [["old_copyright", "no_mobile", "no_https"]] }, volume: "'web design leads' 90 US / 70 IN · 'web development leads' 110 / 70",
    audience: "Web designers and developers selling redesigns.",
    angle: ["The easiest redesign to sell is one the owner can see is overdue: a copyright year from years ago, a site that breaks on a phone, or a browser warning that it is not secure. Each is a fact you can show them in ten seconds.", "We read every site and flag the three; a business appears here when at least one is true."],
    image: T("how-to-price-a-website-redesign"), imageAlt: "Illustration of an old website being redesigned",
    related: ["how-to-price-a-website-redesign", "what-to-say-to-a-business-with-no-website", "website-maintenance-plans-what-to-charge"] }),
  svc({ slug: "google-ads-agencies", keyword: "Google Ads leads", title: "Google Ads & PPC Leads: Businesses Not Running Ads", h1: "PPC leads: online stores and bookable businesses with no Google Ads tag", noun: "businesses that sell online with no Google Ads tag", rule: { all: [["no_google_ads"], ["has_online_store", "has_booking"]] }, volume: "'ppc leads' 170 US · 'google ads leads' 70 / 70",
    audience: "PPC and Google Ads specialists.",
    angle: ["A business that can take money online — a store or a booking page — but runs no Google Ads tag is leaving the most measurable channel unused. Selling search ads to it is selling something it can immediately see working.", "Both facts come from our own read of the website."],
    image: T("credit-based-vs-seat-based-lead-tools"), imageAlt: "Illustration of advertising and conversion tracking",
    related: ["good-better-best-packaging-website-offers", "the-lifetime-value-of-one-local-client", "qualifying-a-local-lead-before-you-call"] }),
  svc({ slug: "booking-software", keyword: "booking software leads", title: "Booking Software Leads: Appointment Businesses Without It", h1: "Booking software leads: appointment businesses with no online booking", noun: "appointment-based businesses with no online booking", categories: BOOKABLE, rule: { all: [["no_booking"]] }, volume: "appointment-software cluster",
    audience: "Booking and appointment software companies, and agencies that set it up.",
    angle: ["Salons, clinics, gyms and studios sell time slots. One without online booking on its site is taking every appointment by phone or WhatsApp, and loses the customers who will not call.", "We read each site for a booking widget or booking page; a business appears here only when there is none."],
    image: T("how-to-sell-websites-to-salons-and-barbershops"), imageAlt: "Illustration of a salon and booking page",
    related: ["how-to-sell-websites-to-salons-and-barbershops", "how-to-sell-websites-to-gyms", "web-design-for-dentists-an-honest-look"] }),
  svc({ slug: "whatsapp-marketing", keyword: "WhatsApp marketing leads", title: "WhatsApp Marketing Leads: Businesses Selling on WhatsApp", h1: "WhatsApp marketing leads: businesses already selling on WhatsApp", noun: "businesses with WhatsApp on their website", rule: { all: [["has_whatsapp"]] }, volume: "WhatsApp API cluster",
    audience: "WhatsApp Business API providers, chatbot builders and WhatsApp marketing agencies.",
    angle: ["A business that puts a WhatsApp button on its own website already sells through WhatsApp — it is not a new channel to convince them of, it is one they are running by hand. Automation, catalogues and broadcast are the upgrade.", "We detect WhatsApp links on the website itself."],
    image: T("whatsapp-outreach-local-business-india"), imageAlt: "Illustration of WhatsApp outreach to local businesses",
    related: ["whatsapp-outreach-local-business-india", "call-whatsapp-or-walk-in-indian-smbs", "what-to-send-a-local-business-after-the-call"] }),
  svc({ slug: "recruitment-agencies", keyword: "recruitment leads", title: "Recruitment Leads: Local Businesses That Are Hiring", h1: "Recruitment leads: businesses that are hiring now", noun: "businesses with a careers page", rule: { all: [["has_careers"]] }, volume: "'recruitment leads' 50 / 40 · 'staffing leads' 90",
    audience: "Recruitment and staffing agencies, HR software and job platforms.",
    angle: ["A careers page on a small business's own website means it is hiring often enough to have built one — the clearest sign it will pay someone to fill roles faster.", "We detect careers and jobs pages on each website we read."],
    image: T("building-a-weekly-prospecting-routine"), imageAlt: "Illustration of a weekly prospecting routine",
    related: ["building-a-weekly-prospecting-routine", "how-many-businesses-should-be-in-your-pipeline", "territory-planning-splitting-a-city-between-reps"] }),
];

/* ───────── no-website category pages: /businesses-without-websites/<slug> ───────── */
const ns = (slug: string, name: string, categories: string[], image: string, related: string[], volume = "", extra = ""): ListDef => ({
  slug, kind: "nosite", keyword: `${name.toLowerCase()} without websites`, categories,
  title: `${name} Without Websites: Verified List`, h1: `${name} without websites`, noun: `${name.toLowerCase()} with no website`, volume,
  audience: "Web designers, agencies and website builders looking for clients.",
  angle: [`Every business on this page has an active Google listing and no website of its own — checked by us, not self-reported. ${extra}`.trim(), "A listing with reviews and opening hours but no website is a business that customers already find and that has nowhere to send them: the most direct website sale there is."],
  image: T(image), imageAlt: `Illustration for ${name.toLowerCase()} without websites`, related,
});
export const NOSITE_LISTS: ListDef[] = [
  ns("restaurants", "Restaurants", FOOD, "how-to-sell-websites-to-restaurants", ["how-to-sell-websites-to-restaurants", "how-to-sell-websites-to-bakeries-and-cafes", "what-to-say-to-a-business-with-no-website"], "390 US / 140 IN, KD 0", "Many keep their menu only on a delivery app."),
  ns("salons", "Salons", BEAUTY, "how-to-sell-websites-to-salons-and-barbershops", ["how-to-sell-websites-to-salons-and-barbershops", "why-facebook-only-businesses-are-your-best-prospects", "what-to-say-to-a-business-with-no-website"]),
  ns("clinics", "Clinics and doctors", ["medical_clinic", "doctor", "skin_care_clinic", "physiotherapist", "dentist", "dental_clinic"], "web-design-for-dentists-an-honest-look", ["web-design-for-dentists-an-honest-look", "which-local-verticals-actually-pay-for-a-website", "what-to-say-to-a-business-with-no-website"]),
  ns("gyms", "Gyms", FITNESS, "how-to-sell-websites-to-gyms", ["how-to-sell-websites-to-gyms", "how-to-sell-websites-to-sports-academies", "what-to-say-to-a-business-with-no-website"]),
  ns("hotels", "Hotels and guest houses", STAY, "how-to-sell-websites-to-guest-houses", ["how-to-sell-websites-to-guest-houses", "which-local-verticals-actually-pay-for-a-website", "the-lifetime-value-of-one-local-client"]),
  ns("car-repair-shops", "Car repair shops", ["car_repair", "tire_shop", "car_wash", "auto_parts_store"], "how-to-sell-websites-to-car-repair-shops", ["how-to-sell-websites-to-car-repair-shops", "how-to-sell-websites-to-car-washes", "which-business-types-least-likely-to-have-a-website"]),
  ns("contractors", "Contractors", TRADES, "web-design-for-contractors-where-the-leads-are", ["web-design-for-contractors-where-the-leads-are", "why-apollo-and-zoominfo-miss-businesses-without-websites", "does-cold-calling-still-work-for-web-design"]),
  ns("retail-stores", "Retail stores", RETAIL, "which-retail-shops-actually-need-a-website", ["which-retail-shops-actually-need-a-website", "how-to-sell-websites-to-electronics-stores", "why-facebook-only-businesses-are-your-best-prospects"]),
  ns("bakeries", "Bakeries", ["bakery", "cake_shop", "pastry_shop"], "how-to-sell-websites-to-bakeries-and-cafes", ["how-to-sell-websites-to-bakeries-and-cafes", "how-to-sell-websites-to-restaurants", "what-to-say-to-a-business-with-no-website"]),
  ns("real-estate-agents", "Real estate agents", ["real_estate_agency"], "high-ticket-web-design-niches-in-india", ["high-ticket-web-design-niches-in-india", "the-lifetime-value-of-one-local-client", "what-to-say-to-a-business-with-no-website"]),
  ns("lawyers", "Lawyers", ["lawyer"], "are-lawyers-and-accountants-a-good-web-design-niche", ["are-lawyers-and-accountants-a-good-web-design-niche", "high-ticket-web-design-niches-in-india", "what-to-say-to-a-business-with-no-website"]),
  ns("schools", "Schools and institutes", SCHOOLS, "how-to-sell-websites-to-coaching-centres", ["how-to-sell-websites-to-coaching-centres", "how-to-sell-websites-to-sports-academies", "what-to-say-to-a-business-with-no-website"]),
  ns("tailors", "Tailors", ["tailor"], "how-to-sell-websites-to-tailors", ["how-to-sell-websites-to-tailors", "which-business-types-least-likely-to-have-a-website", "why-well-do-it-cheaper-is-a-losing-position"]),
  ns("hardware-stores", "Hardware stores", ["hardware_store", "building_materials_store"], "how-to-sell-websites-to-hardware-stores", ["how-to-sell-websites-to-hardware-stores", "which-retail-shops-actually-need-a-website", "web-design-for-contractors-where-the-leads-are"]),
  ns("laundries", "Laundries", ["laundry"], "how-to-sell-websites-to-laundries", ["how-to-sell-websites-to-laundries", "which-business-types-least-likely-to-have-a-website", "what-to-say-to-a-business-with-no-website"]),
  ns("caterers", "Caterers and event venues", EVENTS, "how-to-sell-websites-to-caterers", ["how-to-sell-websites-to-caterers", "high-ticket-web-design-niches-in-india", "good-better-best-packaging-website-offers"]),
  ns("manufacturers", "Manufacturers and wholesalers", MAKERS, "how-to-sell-websites-to-wholesalers", ["how-to-sell-websites-to-wholesalers", "justdial-indiamart-as-lead-sources", "what-to-say-to-a-business-with-no-website"]),
  ns("coaching-centres", "Coaching centres", ["educational_institution", "sports_school"], "how-to-sell-websites-to-coaching-centres", ["how-to-sell-websites-to-coaching-centres", "how-to-sell-websites-to-sports-academies", "tier-2-indian-cities-are-the-real-web-design-market"]),
];

export const LIST_BY_SLUG = new Map(LISTS.map((d) => [d.slug, d]));
export const SERVICE_LIST_BY_SLUG = new Map(SERVICE_LISTS.map((d) => [d.slug, d]));
export const NOSITE_BY_SLUG = new Map(NOSITE_LISTS.map((d) => [d.slug, d]));
/** Minimum real rows for a page to be indexable (Tarun's single gate, same as /leads). */
export const LIST_MIN_ROWS = 25;
