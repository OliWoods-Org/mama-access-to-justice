/**
 * MAMA Access to Justice — Legal Aid Finder
 *
 * Locate free and low-cost legal aid organizations by location, income
 * level, and legal issue type. Uses LSC directory + state bar data.
 *
 * @module legal-aid-finder
 * @license GPL-3.0
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const LegalIssueCategory = z.enum([
  "housing",
  "family",
  "immigration",
  "employment",
  "consumer",
  "benefits",
  "criminal",
  "disability",
  "elder_law",
  "education",
  "health",
  "veterans",
]);

export const IncomeLevel = z.enum([
  "below_poverty",
  "100_150_fpl",
  "150_200_fpl",
  "200_250_fpl",
  "above_250_fpl",
]);

export const LegalAidSearchInput = z.object({
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Must be a valid US ZIP code"),
  state: z.string().length(2).toUpperCase(),
  issueCategory: LegalIssueCategory,
  householdSize: z.number().int().positive().max(20).default(1),
  annualIncome: z.number().nonnegative(),
  language: z.string().default("en"),
  urgency: z.enum(["emergency", "urgent", "standard"]).default("standard"),
});

export type LegalAidSearchInput = z.infer<typeof LegalAidSearchInput>;

export const LegalAidOrganization = z.object({
  name: z.string(),
  phone: z.string(),
  website: z.string().url().optional(),
  address: z.string(),
  servicesProvided: z.array(z.string()),
  eligibilityNotes: z.string(),
  languages: z.array(z.string()),
  acceptingNewClients: z.boolean(),
  waitTime: z.string().optional(),
  distance: z.string().optional(),
});

export type LegalAidOrganization = z.infer<typeof LegalAidOrganization>;

export const LegalAidSearchResult = z.object({
  organizations: z.array(LegalAidOrganization),
  hotlines: z.array(
    z.object({
      name: z.string(),
      phone: z.string(),
      hours: z.string(),
      description: z.string(),
    })
  ),
  alternativeResources: z.array(z.string()),
  incomeEligibility: z.object({
    fplPercentage: z.number(),
    likelyEligible: z.boolean(),
    explanation: z.string(),
  }),
  disclaimer: z.string(),
});

export type LegalAidSearchResult = z.infer<typeof LegalAidSearchResult>;

// ---------------------------------------------------------------------------
// Federal Poverty Level data (2024 — updated annually)
// ---------------------------------------------------------------------------

const FPL_2024: Record<number, number> = {
  1: 15060,
  2: 20440,
  3: 25820,
  4: 31200,
  5: 36580,
  6: 41960,
  7: 47340,
  8: 52720,
};

function getFPLForSize(size: number): number {
  if (size <= 8) return FPL_2024[size];
  return FPL_2024[8] + (size - 8) * 5380;
}

function calculateFPLPercentage(income: number, householdSize: number): number {
  const fpl = getFPLForSize(householdSize);
  return Math.round((income / fpl) * 100);
}

// ---------------------------------------------------------------------------
// Sample organization database (production uses LSC API)
// ---------------------------------------------------------------------------

const SAMPLE_ORGANIZATIONS: Record<string, LegalAidOrganization[]> = {
  CA: [
    {
      name: "Legal Aid Foundation of Los Angeles (LAFLA)",
      phone: "1-800-399-4529",
      website: "https://lafla.org",
      address: "1550 W 8th St, Los Angeles, CA 90017",
      servicesProvided: ["housing", "family", "immigration", "consumer", "benefits"],
      eligibilityNotes: "Serves individuals at or below 200% FPL in Los Angeles County.",
      languages: ["en", "es", "zh", "ko", "tl"],
      acceptingNewClients: true,
      waitTime: "1-2 weeks for non-emergency",
    },
    {
      name: "Bay Area Legal Aid",
      phone: "1-800-551-5554",
      website: "https://baylegal.org",
      address: "1735 Telegraph Ave, Oakland, CA 94612",
      servicesProvided: ["housing", "consumer", "family", "benefits", "health"],
      eligibilityNotes: "Serves 7-county Bay Area region at or below 200% FPL.",
      languages: ["en", "es", "zh", "vi"],
      acceptingNewClients: true,
      waitTime: "2-4 weeks",
    },
  ],
  NY: [
    {
      name: "Legal Aid Society of New York",
      phone: "1-212-577-3300",
      website: "https://www.legalaidnyc.org",
      address: "199 Water St, New York, NY 10038",
      servicesProvided: ["housing", "family", "immigration", "criminal", "employment", "benefits"],
      eligibilityNotes: "Serves all five boroughs. Income eligibility varies by program.",
      languages: ["en", "es", "zh", "ru", "ar", "fr", "ht"],
      acceptingNewClients: true,
      waitTime: "Same-day for emergencies; 1-3 weeks standard",
    },
  ],
  TX: [
    {
      name: "Lone Star Legal Aid",
      phone: "1-800-733-8394",
      website: "https://www.lonestarlegal.org",
      address: "1415 Fannin St, Houston, TX 77002",
      servicesProvided: ["housing", "family", "consumer", "benefits", "disaster"],
      eligibilityNotes: "Serves 72 counties in East/Southeast Texas at or below 200% FPL.",
      languages: ["en", "es"],
      acceptingNewClients: true,
      waitTime: "1-2 weeks",
    },
  ],
};

const NATIONAL_HOTLINES = [
  {
    name: "Legal Services Corporation (LSC) Referral",
    phone: "1-202-295-1500",
    hours: "Mon-Fri 9am-5pm ET",
    description: "National referral to your local LSC-funded legal aid office.",
  },
  {
    name: "LawHelp.org",
    phone: "N/A (website only)",
    hours: "24/7 online",
    description: "Find legal aid in your state at lawhelp.org.",
  },
  {
    name: "National Domestic Violence Hotline",
    phone: "1-800-799-7233",
    hours: "24/7",
    description: "For domestic violence victims needing legal protection orders.",
  },
  {
    name: "National Immigration Legal Services",
    phone: "1-800-354-0365",
    hours: "Mon-Fri 9am-5pm ET",
    description: "Free immigration legal help referral.",
  },
];

const DISCLAIMER =
  "IMPORTANT: This is general legal information, NOT legal advice. " +
  "Legal aid organizations provide free attorneys — they ARE legal advice once you\u2019re accepted as a client.";

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Search for legal aid organizations by location, income, and issue type.
 */
export async function findLegalAid(input: LegalAidSearchInput): Promise<LegalAidSearchResult> {
  const parsed = LegalAidSearchInput.parse(input);
  const fplPct = calculateFPLPercentage(parsed.annualIncome, parsed.householdSize);

  // Filter organizations by state and issue category
  const stateOrgs = SAMPLE_ORGANIZATIONS[parsed.state] ?? [];
  const matchingOrgs = stateOrgs.filter((org) =>
    org.servicesProvided.includes(parsed.issueCategory)
  );

  // Filter by language if not English
  const languageFiltered =
    parsed.language === "en"
      ? matchingOrgs
      : matchingOrgs.filter((org) => org.languages.includes(parsed.language));

  const orgs = languageFiltered.length > 0 ? languageFiltered : matchingOrgs;

  // Filter hotlines relevant to issue
  const hotlines = [...NATIONAL_HOTLINES];
  if (parsed.issueCategory === "immigration") {
    // Immigration hotline already included
  }

  const likelyEligible = fplPct <= 200;

  return {
    organizations: orgs,
    hotlines,
    alternativeResources: buildAlternativeResources(parsed),
    incomeEligibility: {
      fplPercentage: fplPct,
      likelyEligible,
      explanation: likelyEligible
        ? `At ${fplPct}% of the Federal Poverty Level, you likely qualify for free legal aid (most programs serve up to 200% FPL).`
        : `At ${fplPct}% FPL, you may not qualify for income-based legal aid. See alternative resources below, including law school clinics and pro bono programs.`,
    },
    disclaimer: DISCLAIMER,
  };
}

function buildAlternativeResources(input: LegalAidSearchInput): string[] {
  const resources = [
    "Law school clinics \u2014 free legal help from supervised law students. Search \u2018[your city] law school clinic\u2019.",
    "Bar association pro bono programs \u2014 contact your state or local bar association.",
    "Self-help centers \u2014 many courthouses have free self-help centers with forms and guidance.",
    "Lawyer referral services \u2014 state bar referral programs often offer a free or low-cost initial consultation.",
  ];

  if (input.issueCategory === "veterans") {
    resources.unshift("VA Legal Services: contact your local VA hospital\u2019s legal clinic.");
  }

  if (input.issueCategory === "elder_law") {
    resources.unshift("Eldercare Locator: 1-800-677-1116 \u2014 connects seniors to local legal services.");
  }

  if (input.urgency === "emergency") {
    resources.unshift("For immediate danger, call 911. For emergency legal help, call your state\u2019s legal aid hotline.");
  }

  return resources;
}

/**
 * Quick eligibility pre-screen based on income and household size.
 */
export function preScreenEligibility(annualIncome: number, householdSize: number): {
  fplPercentage: number;
  eligibleForLSC: boolean;
  eligibleForExpanded: boolean;
  summary: string;
} {
  const pct = calculateFPLPercentage(annualIncome, householdSize);
  return {
    fplPercentage: pct,
    eligibleForLSC: pct <= 125,
    eligibleForExpanded: pct <= 200,
    summary:
      pct <= 125
        ? "You likely qualify for LSC-funded legal aid (most generous eligibility)."
        : pct <= 200
          ? "You may qualify for expanded-eligibility programs. Apply \u2014 many programs are flexible."
          : "You may not meet income thresholds, but pro bono, law school clinics, and sliding-scale attorneys are available.",
  };
}
