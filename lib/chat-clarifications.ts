/** The entire "ask when something's missing" system — a small, fixed lookup keyed by which
 * field the model flagged as missing, each with a short question and 2-4 concrete options
 * (matching this session's own multiple-choice question style: a question, then labeled
 * options with a one-line description each) instead of open-ended freeform back-and-forth.
 * Deliberately just a table, not a schema/registry system — add a case here, don't build a
 * new mechanism. */

export type ClarificationOption = { label: string; description: string };
export type Clarification = { question: string; options: ClarificationOption[] };

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
    options: [
      { label: "My last searched area", description: "Reuse the location from your most recent map search" },
      { label: "Type a city or neighborhood", description: "e.g. \"Gurugram\" or \"Sector 56\"" },
    ],
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
