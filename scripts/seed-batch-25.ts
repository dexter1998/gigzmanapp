/**
 * Batch 25 — three verticals with genuinely different sales shapes.
 *
 * Food courts are the highest-gap category in the entire index at 70.6% of 347, and catering sits
 * alongside at 31.8% of 1,435 with a far larger ticket. Farms at 65.9% of 741 are the most unusual
 * entry in this corpus and nobody writes agency content for them. Gyms are the lowest gap of the
 * three at 21.8% and earn their place on seasonality and lifetime value rather than availability —
 * which the post says outright rather than pretending the gap is bigger than it is.
 *
 * SERP notes worth carrying: catering enquiry forms convert better in three steps (event, food,
 * contact); "gym near me" runs over 1.8 million searches a month and January is the signup season,
 * which makes November the selling month; farm sites divide into direct sales, agritourism bookings
 * and CSA subscriptions rather than being one product.
 */
import { sql } from "@/lib/db";
import type { Block } from "@/lib/blog/blocks";

type P = { slug: string; title: string; excerpt: string; meta: string; category: string;
  cluster: string; tags: string[]; hero: string; mins: number;
  body: Block[]; faqs: { q: string; a: string }[]; links: [string, string][] };

const posts: P[] = [
/* ───────────────────────────── 1 · catering */
{
  slug: "how-to-sell-websites-to-caterers",
  title: "How to Sell Websites to Caterers and Food Services",
  excerpt: "Food courts are the highest-gap category we measure at 70.6%. Caterers are lower and worth far more, because one enquiry is a wedding rather than a lunch.",
  meta: "How to sell websites to caterers and food services: gap figures across catering and food courts, why the quote form is the product, and what to charge.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Food & Beverage", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Food services split into two quite different sales, and the numbers make the split obvious. **Food courts run at 70.6% without a website — the highest gap of any category in our index — while catering services run at 31.8% of 1,435 checked.**",
      "The lower number is the better business, and it decides where selling websites to food services is worth the afternoon. A food court unit sells lunches; a caterer sells events, and a single enquiry can be a wedding.",
    ]},

    { type: "h2", id: "numbers", text: "The category, measured" },
    { type: "table", head: ["Category", "Checked", "No website", "Avg reviews"], rows: [
      ["Food court", "347", "70.6%", "266"],
      ["Meal takeaway", "374", "40.9%", "239"],
      ["Catering service", "1,435", "31.8%", "183"],
      ["Meal delivery", "87", "31.0%", "51"],
    ], note: "Food service businesses with a verified website check." },
    { type: "prose", text: [
      "Food courts at 70.6% look irresistible and mostly are not, for a structural reason: **a food court unit frequently does not control its own address.** It sits inside a mall or a complex, its footfall comes from the building, and the operator often has three units under different names. That is a business with a real gap and no reason to be findable independently.",
      "Catering is the opposite. The customer plans weeks ahead, compares, wants to see photographs of previous events, and needs a quote. Every part of that is a website's job.",
    ]},

    { type: "h2", id: "pitch", text: "Selling websites to caterers means selling the quote form" },
    { type: "prose", text: [
      "A caterer's entire business runs on enquiries that arrive as phone calls at bad moments, and every one of them starts with the same four questions: what date, how many people, what kind of food, what budget.",
      "Right now the caterer gets a call during a service, writes numbers on something, calls back late, and loses a share of them to whoever answered properly. **The website's job is to take that enquiry in the customer's own time and arrive complete.**",
      "The published guidance on catering enquiry forms is worth following exactly: a **three-step form — event details, food preferences, contact** — converts better than one long one, because it asks for the easy information first and the commitment last.",
      "Say that in the pitch as the deliverable rather than as a feature. \"A form that arrives on your phone with the date, headcount and menu already filled in\" is a thing a caterer can picture and value. \"A responsive website with a contact form\" is not.",
    ]},
    { type: "tip", title: "The photographs already exist",
      text: "Every caterer has hundreds of photographs of previous events on a phone, because that is how the trade sells itself informally. Organised by event type — weddings, corporate, birthdays — with headcount and a price band, that is most of the build and none of it needs creating." },

    { type: "h2", id: "seasonality", text: "Timing, which decides the sale" },
    { type: "prose", text: [
      "Catering is severely seasonal and the season differs by market — wedding seasons, festival months, corporate year-ends. That matters twice over.",
      "**Sell before the season, not during it.** A caterer in the middle of a wedding season will not answer the phone, and one in the off-season has time, cash from the last season, and a clear memory of the enquiries they mishandled.",
      "**The care plan is genuinely seasonal work.** New event photographs after each season, updated menus, festival packages. This is one of the few verticals where the monthly obviously earns itself, and where an owner will notice if it stops.",
    ]},

    { type: "h2", id: "objection", text: "\"All our work comes from word of mouth\"" },
    { type: "prose", text: [
      "Almost always true in catering, and almost always incomplete. Agree with it, then ask a narrower question: **what happens when somebody is recommended to them?**",
      "The answer is that the recommendation names the caterer, the person searches that name, and finds a phone number and eleven photographs on a listing. They then call, at a bad moment, and form an impression from a rushed conversation. Word of mouth got them to the door; there is nothing behind the door.",
      "That reframing works because it does not dispute the referral engine — it points at the gap between the referral and the booking, which is exactly where caterers lose events they had already won. Ask how many enquiries turn into bookings. Whatever the number, it is the number a properly answered enquiry improves.",
    ]},

    { type: "h2", id: "price", text: "What to charge" },
    { type: "table", head: ["Build", "Contents", "Quote"], rows: [
      ["Presence", "One page, services, coverage area, enquiry button", "₹10,000–16,000"],
      ["Standard", "Event-type pages, gallery, three-step quote form", "₹25,000–45,000"],
      ["Full", "Menus by package, per-event-type pages, testimonials, pricing bands", "₹45,000–80,000"],
      ["Care plan", "Post-season photographs, seasonal menus, packages", "₹2,000–4,000/month"],
    ], note: "Anchored on one recovered event rather than on the build." },
    { type: "prose", text: [
      "Ask what an average event is worth. The answer is usually in lakhs for weddings and tens of thousands for corporate work, which makes a ₹40,000 site one recovered booking. Caterers do this arithmetic faster than any other vertical in this corpus, because they already price per head and think in event margins.",
      "For food court and takeaway units, the same build is not appropriate. Those are ₹8,000–15,000 single-page jobs at best, and often not worth the visit — which is what the gap figure hides.",
    ]},

    { type: "leads", city: "hyderabad", heading: "Caterers with no website" },

    { type: "cta", variant: "map", title: "One enquiry is a wedding.",
      detail: "Catering and food services with no website — the highest-ticket food vertical there is.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of caterers have no website?", a: "31.8% of the 1,435 catering services in our index. Food courts run far higher at 70.6% of 347 — the highest gap of any category we measure — but they are a much weaker prospect because a unit inside a mall does not control its own footfall." },
    { q: "What should I pitch a catering business?", a: "The quote form as the product. Every enquiry starts with date, headcount, food type and budget, and right now those arrive as phone calls during a service. A three-step form — event details, food preferences, contact — converts better than one long one." },
    { q: "When should I approach a caterer?", a: "Before their season, never during it. A caterer mid-wedding-season will not answer; one in the off-season has time, cash from the last season, and a clear memory of the enquiries they mishandled." },
    { q: "What should I charge a caterer?", a: "₹10,000–16,000 for a presence page, ₹25,000–45,000 for event-type pages with a three-step quote form, and ₹45,000–80,000 for full menus and packages. Ask what an average event is worth — caterers do that arithmetic faster than any other vertical." },
    { q: "Are food courts worth approaching?", a: "Rarely, despite the 70.6% gap. A food court unit sits inside a building, takes its footfall from that building, and often operates under several names — a real gap with no reason to be independently findable." },
  ],
  links: [["/resources/how-to-sell-websites-to-restaurants", "the restaurant playbook"], ["/resources/how-to-sell-websites-to-bakeries-and-cafes", "the other food vertical"], ["/resources/which-local-verticals-actually-pay-for-a-website", "how this ranks"], ["/resources/website-maintenance-plans-what-to-charge", "the seasonal care plan"]],
},

/* ───────────────────────────── 2 · gyms */
{
  slug: "how-to-sell-websites-to-gyms",
  title: "How to Sell Websites to Gyms and Fitness Studios",
  excerpt: "A lower gap than most verticals here — 21.8% — and worth working anyway, for two reasons that have nothing to do with availability.",
  meta: "How to sell websites to gyms and fitness studios: why a 21.8% gap is still worth working, the January signup season, and what a gym site must answer.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Agency Playbook"],
  body: [
    { type: "prose", text: [
      "Gyms are the lowest-gap vertical in this corpus and it is worth saying so first: **21.8% of 2,995 gyms have no website**, with fitness centres at 23.2% and yoga studios at 15.6%. Compared to hardware at 50.2% or guest houses at 64.1%, this is a well-served category.",
      "So selling websites to gyms is not an availability play. Two things make it worth working anyway, and neither is the gap. **The category is enormous** — 2,995 gyms means roughly 650 prospects even at that rate — and **the lifetime value is unusually high**, because a gym sells recurring memberships and understands recurring revenue instinctively, which makes the care plan a much easier sale than anywhere else.",
    ]},

    { type: "h2", id: "vs-academies", text: "Gyms are not sports academies" },
    { type: "prose", text: [
      "Worth separating, because the two get treated as one category and sell completely differently.",
      "A **sports academy** sells to a parent choosing for a child. The decision is researched over weeks, turns on coach credentials and safety, and happens in an admission window. Those run at 31.9% without a website.",
      "A **gym** sells to an adult choosing for themselves. The decision is made in days, turns on location, price and whether the place looks reasonable, and can happen in any month — though most of it happens in one.",
      "Which is why gyms got online earlier and why the pitch is different. A parent needs reassurance; a gym member needs the four things below, immediately, on a phone.",
    ]},
    { type: "table", head: ["", "Gym", "Sports academy"], rows: [
      ["Buyer", "The member", "A parent"],
      ["Research depth", "Days", "Weeks"],
      ["Decides on", "Location, price, look", "Coach credentials, safety"],
      ["No website", "21.8%", "31.9%"],
      ["Revenue shape", "Recurring membership", "Annual admission"],
    ]},

    { type: "h2", id: "four", text: "The four questions a gym site must answer" },
    { type: "prose", text: [
      "Somebody deciding on a gym is on their phone, and the site has about ten seconds. The four things they need are the same everywhere:",
    ]},
    { type: "checklist", items: [
      { title: "What is here", detail: "Equipment, classes, trainers. Photographs of the actual floor, not stock images of a gym." },
      { title: "Where is it", detail: "Map and the nearest landmark. More people abandon on this than on price." },
      { title: "What does it cost", detail: "At minimum the membership options. A gym that hides pricing loses the comparison it did not know it was in." },
      { title: "How do I start", detail: "A trial, a class pass, or a tour booking. One action, prominent." },
    ]},
    { type: "prose", text: [
      "The pricing point is the one owners resist and the one worth pushing on. Most gyms omit prices deliberately, to force a phone call. The customer comparing three gyms on a phone at 11pm simply skips the one that will not say, and the owner never learns that it happened.",
    ]},

    { type: "h2", id: "season", text: "Sell in November" },
    { type: "prose", text: [
      "The single most useful operational fact about this vertical: **January and February are the signup season**, and the marketing for it starts in early December.",
      "Which makes **November the selling month.** A gym owner approached in November is thinking about the coming rush, has budget from the year, and has a deadline that is theirs rather than yours. The same owner in March is watching signups fall and has no reason to act.",
      "This is the same structure as the academy admission window, and it produces the same rule: approach six to eight weeks before the season, frame the build around being ready for it, and use the off-season as build time if you have missed the window.",
    ]},

    { type: "h2", id: "objection", text: "\"People just walk in off the street\"" },
    { type: "prose", text: [
      "The standard gym objection, and it is half right in a way worth conceding immediately.",
      "Proximity genuinely dominates this decision — almost nobody joins a gym they have to travel past two others to reach. What that argument misses is that **proximity narrows the choice to three or four gyms, and then something else decides between them.** The walk-in was going to happen at one of them; the question is which.",
      "So the pitch is not reach, it is the comparison. Somebody within two kilometres of four gyms will look at all four on a phone, and the one that cannot say what it costs or what classes it runs loses a decision it was in contention for. The owner never sees that loss, which is why it does not feel like a problem.",
      "The check that makes this concrete: search their category and area on your phone in front of them. Their nearest competitors will be there with prices and timetables. They will not.",
    ]},

    { type: "h2", id: "price", text: "What to charge, and the recurring angle" },
    { type: "table", head: ["Build", "Contents", "Quote"], rows: [
      ["Presence", "One page, facilities, timings, location, trial signup", "₹12,000–18,000"],
      ["Standard", "Classes and timetable, trainers, membership options, trial form", "₹25,000–45,000"],
      ["Full", "Class booking, membership signup, trainer profiles, member area", "₹50,000–1,00,000"],
      ["Care plan", "Timetable changes, new trainers, seasonal offers", "₹2,500–5,000/month"],
    ], note: "The care plan is the easy sale here — this owner already sells memberships and understands the model." },
    { type: "prose", text: [
      "The care plan conversation is genuinely easier in this vertical than in any other. A gym owner who charges ₹1,500 a month for a membership does not need the recurring model explained, and a ₹3,000 monthly reads to them as two members — which is exactly the arithmetic they use internally.",
      "Anchor the build the same way. One retained member for a year covers a large share of a standard site, and the owner knows their own retention numbers better than you do.",
    ]},

    { type: "leads", city: "pune", heading: "Gyms and studios with no website" },

    { type: "cta", variant: "map", title: "A big category, thinly worked.",
      detail: "Nearly 3,000 gyms checked and a fifth with nothing — plus the highest care-plan attach rate of any vertical.",
      action: "Search your city", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of gyms have no website?", a: "21.8% of the 2,995 gyms in our index, with fitness centres at 23.2% and yoga studios at 15.6%. It is the lowest-gap vertical in this corpus, but the category is large enough that a fifth of it is still around 650 prospects." },
    { q: "Why work gyms if the gap is low?", a: "Size and lifetime value. The category is enormous, and a gym owner sells recurring memberships so the care plan needs no explaining — a ₹3,000 monthly reads to them as two members, which is the arithmetic they already use." },
    { q: "When should I approach a gym?", a: "November. January and February are the signup season and marketing for it starts in early December, so a gym owner in November has budget, a rush coming and a deadline that is theirs. The same owner in March has no reason to act." },
    { q: "What must a gym website contain?", a: "Four things answered immediately on a phone: what is here, where it is, what it costs, and how to start. The pricing one is where owners resist — a customer comparing three gyms at 11pm skips the one that will not say." },
    { q: "How are gyms different from sports academies?", a: "The buyer. A gym sells to an adult deciding for themselves in days on location, price and look. An academy sells to a parent deciding for a child over weeks on coach credentials and safety — which is why academies run higher at 31.9%." },
  ],
  links: [["/resources/how-to-sell-websites-to-sports-academies", "the academy playbook and why it differs"], ["/resources/which-local-verticals-actually-pay-for-a-website", "how this ranks"], ["/resources/how-to-sell-maintenance-plans-after-the-build", "the easiest care-plan sale there is"], ["/resources/the-lifetime-value-of-one-local-client", "why a low gap can still pay"]],
},

/* ───────────────────────────── 3 · farms */
{
  slug: "how-to-sell-websites-to-farms",
  title: "How to Sell Websites to Farms and Agri Businesses",
  excerpt: "Two in three have no website and nobody has ever pitched them. The catch is that most farms genuinely do not need one — and the ones that do are doing something specific.",
  meta: "How to sell websites to farms and agri businesses: a 65.9% gap, which farms actually need one, and the three business models that justify it.",
  category: "Lead Generation", cluster: "playbooks", hero: "leads", mins: 9,
  tags: ["Vertical Playbook", "Agency Playbook", "India"],
  body: [
    { type: "prose", text: [
      "Farms are the most unusual vertical in this corpus. **65.9% of the 741 we have checked have no website**, they appear on no niche list anywhere, and essentially nobody in this industry has ever approached one.",
      "They are also the vertical where the honest answer is most often no. A farm selling its entire output to a mandi, a processor or a single buyer has no discoverability problem whatsoever, and a website changes nothing about its year. **The 65.9% is real and most of it is not addressable.**",
      "What matters is the subset that is — and selling websites to farms is entirely a question of identifying it before you drive out there.",
    ]},

    { type: "h2", id: "who", text: "Which farms actually need one" },
    { type: "prose", text: [
      "Three business models, and each one has a customer who searches.",
      "**Direct-to-consumer sales.** A farm selling produce, dairy, honey, eggs or preserves straight to households — through a farm shop, a subscription box, or WhatsApp orders that have got out of hand. The customer is a household choosing on freshness and trust, and they research.",
      "**Agritourism.** Farm stays, day visits, school trips, weekend experiences, wedding venues. This is a hospitality business attached to a farm, and it lives or dies on being findable and bookable in exactly the way a guest house does.",
      "**Specialist supply.** A farm supplying restaurants, hotels or specialist retailers with something particular — organic, heritage varieties, specific grades. The buyer is a chef or a purchasing manager who searches, compares and needs to verify.",
      "If a farm does none of these three, walk away and say why. A farm selling wholesale into a fixed chain does not need a website and telling them so is worth more than the sale you were not going to make.",
    ]},
    { type: "table", head: ["Farm type", "Customer", "Needs a website"], rows: [
      ["Wholesale to mandi or processor", "One buyer", "No"],
      ["Contract farming", "One buyer", "No"],
      ["Direct-to-consumer produce", "Households", "Yes"],
      ["Agritourism and farm stays", "Visitors", "Strongly"],
      ["Specialist supply to restaurants", "Chefs, buyers", "Yes"],
      ["Farm equipment or inputs", "Other farms", "Yes"],
    ]},

    { type: "h2", id: "pitch", text: "What to pitch each one" },
    { type: "prose", text: [
      "**For direct sales**, the website replaces a WhatsApp list that has stopped scaling. Most farms doing DTC started with twenty households in a broadcast group, and somewhere past a hundred it becomes unmanageable — orders get missed, the list is one phone away from being lost, and nobody can join without being added by hand. An ordering page with a delivery day and a produce list is not a marketing exercise, it is an operations fix.",
      "**For agritourism**, it is the same pitch as a guest house: photographs, what is included, how to get there, and a way to book that is not a phone call. The difference is that a farm stay is chosen from further away, so being findable matters more.",
      "**For specialist supply**, it is credibility for a buyer who has never visited. Certifications, what is grown, when it is available, and how to enquire. A chef sourcing heritage grain wants to verify a supplier exists and is serious before making a call.",
    ]},
    { type: "tip", title: "The seasonality is severe",
      text: "Farm cash is concentrated around harvest and sale, and a farm in the wrong month has no money regardless of the year it has had. Ask when their season ends before quoting — this vertical punishes bad timing harder than any other." },

    { type: "h2", id: "reality", text: "The practical difficulties" },
    { type: "prose", text: [
      "Worth being straight about, because this vertical is harder to work than the gap suggests.",
      "**They are not clustered.** Farms are spread across a district, which destroys the walk-in round economics that make every other vertical in this corpus efficient. A day might reach three.",
      "**The listings are thin.** Farms average 83 reviews, and many carry a name, a rough location and nothing else. The qualification signals used elsewhere barely work.",
      "**Connectivity and content are real constraints.** Photographs, product descriptions and prices take longer to arrive from a working farm than from a shop, and a content deadline in writing matters more here than anywhere.",
      "**But referrals are exceptional.** Farming communities are tightly connected, agricultural societies and producer groups meet regularly, and one good project inside a producer group can produce several. This is a vertical where the first client is worth far more than the first project.",
    ]},

    { type: "h2", id: "finding", text: "Finding the addressable ones" },
    { type: "prose", text: [
      "Since most of the 65.9% is not worth approaching, the qualification has to happen before you travel — and the signals are different from every other vertical here.",
      "**Read the listing name.** \"Organic Farm\", \"Farm Stay\", \"Nursery\", \"Dairy\" or a brand name rather than a family name usually indicates a business that sells to the public. A plain family name with no descriptor is more often a wholesale operation.",
      "**Check for photographs of a shop, a stay or a product.** A farm that has photographed produce in packaging, a farm gate shop or accommodation is already selling to end customers. Photographs of fields only is a farm that sells fields.",
      "**Look for an Instagram in the listing.** Direct-to-consumer farms are heavily represented on it, because that is where the first hundred customers came from. Its presence is the single strongest qualifying signal in this vertical.",
      "**Review count above about forty** means members of the public have been there, which for a farm is decisive information — wholesale operations do not accumulate public reviews.",
    ]},

    { type: "h2", id: "price", text: "What to charge" },
    { type: "table", head: ["Build", "Contents", "Quote"], rows: [
      ["Presence", "One page, what they grow, location, contact", "₹8,000–15,000"],
      ["Direct sales", "Produce list, delivery days, order form", "₹20,000–40,000"],
      ["Agritourism", "Stay or visit pages, gallery, directions, booking enquiry", "₹25,000–50,000"],
      ["Specialist supply", "Certifications, availability calendar, trade enquiry", "₹30,000–60,000"],
    ], note: "Quote against a season rather than a month, and expect payment timing to follow the harvest." },

    { type: "leads", city: "nagpur", heading: "Agri businesses with no website" },

    { type: "cta", variant: "map", title: "A vertical nobody has called.",
      detail: "Farms and agri businesses with no website — two in three, and no competition at all.",
      action: "Search your area", href: "/login" },
  ],
  faqs: [
    { q: "What percentage of farms have no website?", a: "65.9% of the 741 in our index — one of the highest gaps we measure. Most of it is not addressable, though: a farm selling its whole output to a mandi or a single buyer has no discoverability problem and a website changes nothing." },
    { q: "Which farms actually need a website?", a: "Three models: direct-to-consumer produce sales, agritourism such as farm stays and visits, and specialist supply to restaurants or retailers. Each has a customer who searches. Wholesale and contract farming do not." },
    { q: "What should I pitch a farm selling direct to households?", a: "An operations fix rather than marketing. Most started with a WhatsApp broadcast group and somewhere past a hundred households it stops scaling — orders get missed, the list is one phone away from being lost, and nobody can join without being added by hand." },
    { q: "Is farming a difficult vertical to prospect?", a: "Harder than the gap suggests. Farms are spread across a district rather than clustered, so a day might reach three; listings are thin at 83 average reviews; and content arrives slowly. But referrals are exceptional because producer groups meet regularly." },
    { q: "When should I approach a farm?", a: "After their season ends, when cash from the harvest exists. Farm income is concentrated and a farm in the wrong month has no money regardless of the year it has had — this vertical punishes bad timing harder than any other." },
  ],
  links: [["/resources/how-to-sell-websites-to-guest-houses", "the agritourism parallel"], ["/resources/how-to-sell-websites-to-wholesalers", "the specialist supply parallel"], ["/resources/which-local-verticals-actually-pay-for-a-website", "how this ranks"], ["/resources/handling-we-dont-need-a-website", "when the objection is correct"]],
},
];

async function main() {
  for (const p of posts) {
    await sql`
      INSERT INTO blog_posts (slug, title, excerpt, meta_description, category, cluster, tags,
        author_slug, hero_variant, read_minutes, body, faqs, status, featured, published_at)
      VALUES (${p.slug}, ${p.title}, ${p.excerpt}, ${p.meta}, ${p.category}, ${p.cluster},
        ${p.tags}, ${"tarun"}, ${p.hero}, ${p.mins},
        ${sql.json(p.body as unknown as Parameters<typeof sql.json>[0])},
        ${sql.json(p.faqs as unknown as Parameters<typeof sql.json>[0])},
        ${"published"}, ${false}, ${new Date(Date.now() - 120_000)})
      ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, excerpt=EXCLUDED.excerpt,
        meta_description=EXCLUDED.meta_description, category=EXCLUDED.category, cluster=EXCLUDED.cluster,
        tags=EXCLUDED.tags, hero_variant=EXCLUDED.hero_variant, read_minutes=EXCLUDED.read_minutes,
        body=EXCLUDED.body, faqs=EXCLUDED.faqs, updated_at=now()
    `;
    await sql`DELETE FROM blog_links WHERE from_slug = ${p.slug}`;
    for (const [i, [href, anchor]] of p.links.entries()) {
      await sql`INSERT INTO blog_links (from_slug, to_href, anchor, kind, position)
                VALUES (${p.slug}, ${href}, ${anchor}, ${href.startsWith("/leads") ? "lead_page" : "sibling"}, ${i})`;
    }
    console.log("  ✓", p.slug);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
