import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { ogImageMeta } from "@/lib/og";
import { CREDIT_COST, CREDIT_PACKS, FREE_SIGNUP_CREDITS, formatINR } from "@/lib/credits/pricing";
import { CALL_WINDOW, EST_MINUTES_PER_CALL, MIN_MINUTES_BALANCE, VOICE_SKILLS } from "@/lib/v2/outreach/voiceShared";
import { MarketingCta } from "@/components/marketing/MarketingPieces";
import {
  Band, Cards, CompareTable, Copy, Limits, PricingSummary, RelatedReading, Shot, Split, Steps, ToolFaq, ToolHero, ToolJsonLd, ToolLinks, ToolStats,
} from "@/components/marketing/ToolPagePieces";

const PATH = "/ai-cold-calling" as const;
const TITLE = "AI Cold Calling Agent in English, Hindi, Hinglish";
const PER_MIN = CREDIT_COST.voice_minute;
const DESCRIPTION = `Run AI cold calls that pitch your offer, qualify leads and book meetings in English, Hindi or Hinglish. ${PER_MIN} credits per connected minute. Try a test call.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${COMPANY.site}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${COMPANY.site}${PATH}`,
    images: ogImageMeta({ v: "contact", eyebrow: "AI cold calling", t1: "An AI caller that", t2: "speaks Hinglish.", cta: "Try a test call →", url: "mantisai.in/ai-cold-calling" }),
  },
  twitter: { card: "summary_large_image" },
};

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const days = `${DAY[CALL_WINDOW.days[0]]}–${DAY[CALL_WINDOW.days[CALL_WINDOW.days.length - 1]]}`;
const perCallCredits = EST_MINUTES_PER_CALL * PER_MIN;
// What one answered call costs on the entry plan, where a credit is exactly ₹1.
const entryRupeesPerCredit = CREDIT_PACKS[0].pricePaise / 100 / CREDIT_PACKS[0].credits;

const FAQS = [
  {
    q: "What is AI cold calling?",
    a: "An AI voice agent places outbound calls to a lead list, holds a natural spoken conversation, and works towards a goal you set: a pitch, a qualification, a booked meeting. In Mantis, the agent is part of a campaign: a call step sits in a sequence alongside emails, and every answered call comes back to your Inbox with a summary and an outcome.",
  },
  {
    q: "Which languages does the AI caller speak?",
    a: "English by default. It switches to Hindi or Hinglish when the person on the other end does, which is how most business calls in India already sound. Product words such as website, Google or WhatsApp stay in English; price, timing and benefit come across in Hindi.",
  },
  {
    q: "How much does an AI cold call cost?",
    a: `${PER_MIN} credits per connected minute, billed per started minute after the call ends. Unanswered, busy and failed calls are free. Campaign estimates assume about ${EST_MINUTES_PER_CALL} minutes per answered call, so roughly ${perCallCredits} credits. On the ${CREDIT_PACKS[0].label} plan (${formatINR(CREDIT_PACKS[0].pricePaise)} for ${CREDIT_PACKS[0].credits.toLocaleString("en-IN")} credits) that is about ₹${Math.round(perCallCredits * entryRupeesPerCredit)} per answered call.`,
  },
  {
    q: "Is AI cold calling legal in India?",
    a: "It is regulated. Promotional calls in India must come from a TRAI-registered 140-series number on the DLT platform, and numbers on the National Customer Preference Register (DND) must not receive promotional calls. Mantis keeps calls inside 10:00–19:30 IST, stricter than TRAI's 9:00–21:00, and the agent says who it is calling for and why. Use it for genuine business conversations with businesses you have a reason to contact, and only with lists you are allowed to call.",
  },
  {
    q: "Can I hear it before I run a campaign?",
    a: `Yes. Integrations, then Voice, lets you ring your own phone. The agent says it is a Mantis test call, chats and asks what you think. A test lasts up to three minutes and is charged like any call, so at most ${3 * PER_MIN} credits.`,
  },
  {
    q: "Does the AI pretend to be a human?",
    a: "No. It states who it is calling for and why, answers questions honestly, never invents facts about your business, and ends politely if the person is not interested.",
  },
  {
    q: "What happens after the call?",
    a: "The call's summary and outcome land in the Inbox. A meeting booked on a call stops that lead's sequence, so nobody gets a follow-up email after they have already said yes.",
  },
];

export default function AiColdCallingPage() {
  return (
    <>
      <ToolJsonLd path={PATH} name="AI cold calling" description={DESCRIPTION} />

      <ToolHero
        eyebrow="AI cold calling"
        title="AI cold calling that speaks"
        accent="the way your leads do."
        lede={
          <>
            Mantis’s voice agent calls your leads, pitches your business, answers questions and books meetings — in English,
            switching to Hindi or Hinglish with the person on the line. It runs as a step in a campaign, inside India’s calling
            rules, and you pay only for minutes that connect.
          </>
        }
        image={{ src: "/resources/thumbs/does-cold-calling-still-work-for-web-design.webp", width: 1600, height: 900, alt: "Illustration of a green telephone handset beside a sales dashboard with rising charts and three local shopfronts" }}
        primary={{ label: "Try a free test call", href: "/login" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
        note={`New accounts get ${FREE_SIGNUP_CREDITS} free credits — enough for a test call and a first small campaign.`}
      />

      <ToolStats
        stats={[
          { value: `${PER_MIN}`, label: "credits per connected minute" },
          { value: "₹0", label: "for unanswered, busy or failed calls" },
          { value: "3", label: "languages: English, Hindi, Hinglish" },
          { value: `${CALL_WINDOW.from}–${CALL_WINDOW.to}`, label: `IST calling window, ${days}` },
        ]}
        caption="Straight from the product's rate card and calling rules."
      />

      <Band title="Why calls still work" accent="for small businesses.">
        <Split
          aside={
            <Shot
              src="/resources/thumbs/selling-in-hindi-what-changes-in-a-sales-call.webp"
              width={1600}
              height={900}
              alt="Illustration of a shop owner and a caller talking on the phone in Hindi, with chat bubbles, a tick and a handshake"
              caption="Most local sales calls in India run in Hinglish. An agent that only speaks scripted English sounds imported."
            />
          }
        >
          <p>
            Published cold calling statistics are grim: pickup rates around 6–9% and success rates that roughly halved between
            2024 and 2026. Almost all of that describes calling individuals on their personal mobiles, where spam labels and
            screening do the damage.
          </p>
          <p>
            A business’s listed number is a different instrument. It is published so customers can call, and it gets answered.
            The real constraint is the handoff: whoever picks up is often not the owner. What helps is timing, a specific reason
            for the call, and a message short enough to survive being passed on.
          </p>
          <p>
            That is what Mantis’s agent is built around. Every lead it calls comes with the signal that made it a lead — no
            website, weak reviews, hiring, a new branch — so the opening line is a reason, not a script. And it speaks the way the
            person on the other end does. Read more in{" "}
            <Link href="/resources/does-cold-calling-still-work-for-web-design">does cold calling still work</Link>.
          </p>
        </Split>
      </Band>

      <Band title="How an AI call" accent="campaign runs." tone="white">
        <Steps
          steps={[
            { title: "Build a lead list", body: "Find the businesses with Mantis — by trade, area and signal — or work a list you already built there." },
            { title: "Add a call step", body: "The campaign planner drafts a sequence. Add a Call touch, pick its skill, and tell it what to offer and who follows up." },
            { title: "Test on your own phone", body: "Ring yourself first. Up to three minutes, charged like any call, so you hear exactly what your leads will hear." },
            { title: "Approve and schedule", body: `Calls go out one at a time within ${CALL_WINDOW.from}–${CALL_WINDOW.to} IST, ${days}. Calls due outside the window wait for the next slot.` },
            { title: "Read the outcomes", body: "Each answered call lands in the Inbox with a summary and outcome. A booked meeting stops that lead's sequence." },
          ]}
        />
      </Band>

      <Band title="Skills: what" accent="each call is for." sub="Each call step follows one skill. The skill sets the goal; the agent handles the conversation.">
        <Cards items={VOICE_SKILLS.map((s) => ({ title: s.label, body: s.desc }))} />
      </Band>

      <Band title="AI caller versus" accent="the alternatives." tone="white">
        <CompareTable
          head={["", "Mantis AI voice agent", "Human calling team", "Generic AI calling platform"]}
          rows={[
            ["Language", "English, switching to Hindi or Hinglish", "Whatever your callers speak", "Often English-first; Indian languages vary"],
            ["Lead list", "Built in Mantis, each lead with a reason to call", "Yours to source", "Yours to source and import"],
            ["Cost model", `${PER_MIN} credits per connected minute; unanswered calls free`, "Salaries, whether calls connect or not", "Usually per minute plus a platform fee"],
            ["Handling objections", "Good at common ones; follows the skill", "Best — people read nuance better", "Depends on how much you configure"],
            ["Volume", "One call at a time per account, inside the window", "Limited by headcount", "Often high concurrency"],
            ["Follow-up", "Part of a sequence with email; booking stops the sequence", "Manual, or a separate CRM", "Usually a separate tool"],
            ["India calling rules", "Window, disclosure and DND guidance built in", "Your responsibility", "Your responsibility"],
          ]}
          note="An experienced human closer will out-sell any AI agent on a hard conversation. The agent's job is the first conversation, at a volume and cost a person cannot match."
        />
      </Band>

      <Band title="Who it" accent="is for.">
        <Cards
          items={[
            { title: "Agencies selling to local businesses", body: "Call the businesses with no website or weak reviews and book the ones who want to talk to you." },
            { title: "Distributors and suppliers", body: "Use the vendor-finding or partnership skills to open conversations with retailers and resellers in a territory." },
            { title: "Founders without a sales team", body: "Let the agent take first calls while you take the meetings it books." },
            { title: "Teams adding calls to email", body: "Many small business owners never read cold email. A call step reaches the ones who answer the phone instead." },
          ]}
        />
      </Band>

      <Band title="Limits, stated" accent="plainly." tone="white">
        <Limits
          items={[
            { title: "One call at a time", body: "Calls run sequentially per account, within the calling window. This is not a high-concurrency dialler." },
            { title: `A minimum balance of ${MIN_MINUTES_BALANCE * PER_MIN} credits`, body: `A call is only placed if your balance covers ${MIN_MINUTES_BALANCE} minutes; otherwise it waits until you top up.` },
            { title: "A plan is needed to run campaigns", body: "Test calls work on free credits; launching bulk AI calls needs an active monthly plan." },
            { title: "Your list, your responsibility", body: "Promotional calls in India need DLT registration, and DND numbers must not get them. Use the agent for genuine business conversations only." },
          ]}
        />
      </Band>

      <Band title="What it" accent="costs.">
        <Copy>
          <p>
            A connected minute is {PER_MIN} credits. With about {EST_MINUTES_PER_CALL} minutes per answered call, a call costs
            around {perCallCredits} credits — roughly ₹{Math.round(perCallCredits * entryRupeesPerCredit)} on the{" "}
            {CREDIT_PACKS[0].label} plan, where one credit is ₹{entryRupeesPerCredit.toFixed(2)}. Calls nobody answers cost nothing.
          </p>
        </Copy>
        <div style={{ marginTop: 22 }}>
          <PricingSummary focus="voice" />
        </div>
      </Band>

      <Band title="AI cold calling" accent="questions." tone="white">
        <ToolFaq faqs={FAQS} />
      </Band>

      <Band title="Related" accent="guides.">
        <RelatedReading
          posts={[
            { slug: "does-cold-calling-still-work-for-web-design", title: "Does Cold Calling Still Work in 2026?", blurb: "What the collapse in pickup rates does and does not apply to." },
            { slug: "selling-in-hindi-what-changes-in-a-sales-call", title: "Selling in Hindi: What Changes in a Sales Call", blurb: "Which words stay English, and what switching languages signals." },
            { slug: "cold-call-script-selling-websites-local-businesses", title: "A Cold Call Script for Selling Websites", blurb: "The opening, the reason and the ask, for local businesses." },
          ]}
        />
        <ToolLinks current={PATH} />
      </Band>

      <MarketingCta
        title="Hear it on"
        accent="your own phone."
        sub="Sign up, open Integrations → Voice, and the agent rings you. Then decide."
        primary={{ label: "Get Free Access", href: "/login" }}
        secondary={{ label: "Talk to Sales", href: "/contact" }}
      />
    </>
  );
}
