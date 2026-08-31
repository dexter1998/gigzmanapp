/** The entire "ask when something's missing" system — a small, fixed lookup keyed by which
 * field the model flagged as missing, each with a short question and 2-4 concrete options
 * (matching this session's own multiple-choice question style: a question, then labeled
 * options with a one-line description each) instead of open-ended freeform back-and-forth.
 * Deliberately just a table, not a schema/registry system — add a case here, don't build a
 * new mechanism. */

// `value` is what actually gets sent as the next message when set — lets an option's display
// label read naturally while the real payload underneath is a sentinel the server resolves
// specially (e.g. USE_LAST_MAP_AREA below), instead of relying on the model to interpret the
// label text itself.
export type ClarificationOption = { label: string; description: string; value?: string };
export type Clarification = { question: string; options: ClarificationOption[] };

export const USE_LAST_MAP_AREA = "__USE_LAST_MAP_AREA__";

// Client-side sentinel: the option is an affordance, not an answer — tapping it opens the
// inline input instead of sending its label as a message (which the planner could never
// resolve into a location; that was the "neighbourhood chip does nothing" bug).
export const FOCUS_COMPOSER = "__FOCUS_COMPOSER__";

export const CLARIFICATIONS: Record<string, Clarification> = {
  category: {
    question: "What kind of business should I look for?",
    options: [
      { label: "Restaurants & cafes", description: "Food & Drink" },
      { label: "Salons & spas", description: "Personal Care & Local Services" },
      { label: "Clinics & health", description: "Health & Wellness" },
      { label: "Something else", description: "Type in your own category" },
    ],
  },
  location: {
    question: "Which area should I search?",
    // "My last searched area" is appended dynamically in the messages route, only when the
    // user actually has a recent map search to reuse — an option that promises something and
    // does nothing when clicked is worse than not offering it.
    options: [{ label: "Type a city or neighborhood", description: "e.g. \"Gurugram\" or \"Sector 56\"", value: FOCUS_COMPOSER }],
  },
  count: {
    question: "How many leads should I look for?",
    options: [
      { label: "25", description: "A quick, focused batch" },
      { label: "50", description: "A standard-sized search" },
      { label: "100", description: "A larger sweep of the area" },
    ],
  },
};
