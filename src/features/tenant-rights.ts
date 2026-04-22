/**
 * MAMA Access to Justice — Tenant Rights Module
 *
 * State-specific tenant rights lookup, statute citations, and template
 * letter generation for common landlord-tenant disputes.
 *
 * @module tenant-rights
 * @license GPL-3.0
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const StateCode = z
  .string()
  .length(2)
  .toUpperCase()
  .describe("Two-letter US state code (e.g. CA, NY, TX)");

export const TenantIssueType = z.enum([
  "repair_request",
  "illegal_eviction",
  "security_deposit",
  "habitability",
  "retaliation",
  "lease_violation",
  "rent_increase",
  "discrimination",
]);

export const TenantRightsQuery = z.object({
  state: StateCode,
  issueType: TenantIssueType,
  monthlyRent: z.number().positive().optional(),
  leaseType: z.enum(["month_to_month", "fixed_term", "no_lease"]).optional(),
});

export type TenantRightsQuery = z.infer<typeof TenantRightsQuery>;

export const StatuteReference = z.object({
  code: z.string().describe("Statutory code reference (e.g. Cal. Civ. Code SS 1942)"),
  title: z.string(),
  summary: z.string(),
  url: z.string().url().optional(),
});

export const TenantRightsResult = z.object({
  state: StateCode,
  issueType: TenantIssueType,
  rights: z.array(z.string()).describe("Plain-language rights summaries"),
  statutes: z.array(StatuteReference),
  templateLetter: z.string().describe("Ready-to-send letter template"),
  nextSteps: z.array(z.string()),
  disclaimer: z.string(),
});

export type TenantRightsResult = z.infer<typeof TenantRightsResult>;

// ---------------------------------------------------------------------------
// Static knowledge base (subset for illustration; production pulls from API)
// ---------------------------------------------------------------------------

const STATE_STATUTES: Record<string, Record<string, { code: string; title: string; summary: string; url?: string }[]>> = {
  CA: {
    repair_request: [
      {
        code: "Cal. Civ. Code \u00A7 1942",
        title: "Repair and Deduct Remedy",
        summary:
          "Tenants may repair dangerous conditions and deduct the cost from rent (up to one month\u2019s rent) after giving reasonable notice.",
        url: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1942",
      },
      {
        code: "Cal. Civ. Code \u00A7 1941",
        title: "Implied Warranty of Habitability",
        summary:
          "Landlords must maintain rental units in habitable condition including plumbing, heating, and structural integrity.",
      },
    ],
    security_deposit: [
      {
        code: "Cal. Civ. Code \u00A7 1950.5",
        title: "Security Deposit Limits and Return",
        summary:
          "Security deposits are limited to two months\u2019 rent (unfurnished) or three months\u2019 (furnished). Must be returned within 21 days of move-out with itemized statement.",
      },
    ],
    illegal_eviction: [
      {
        code: "Cal. Civ. Code \u00A7 789.3",
        title: "Lockouts and Utility Shutoffs",
        summary:
          "Landlords may not lock out tenants, remove doors/windows, or shut off utilities. Penalties of $100/day.",
      },
    ],
  },
  NY: {
    repair_request: [
      {
        code: "NY Real Prop. Law \u00A7 235-b",
        title: "Warranty of Habitability",
        summary:
          "Every residential lease in New York contains an implied warranty that the premises are fit for human habitation.",
      },
    ],
    security_deposit: [
      {
        code: "NY Gen. Oblig. Law \u00A7 7-108",
        title: "Security Deposit Protections",
        summary:
          "Security deposits limited to one month\u2019s rent. Must be returned within 14 days. Landlord must provide itemized statement of deductions.",
      },
    ],
  },
};

const DISCLAIMER =
  "IMPORTANT: This is general legal information, NOT legal advice. " +
  "For advice specific to your situation, consult a licensed attorney. " +
  "If you cannot afford an attorney, use our Legal Aid Finder to locate free legal services near you.";

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Look up tenant rights and applicable statutes for a given state + issue.
 */
export async function lookupTenantRights(query: TenantRightsQuery): Promise<TenantRightsResult> {
  const parsed = TenantRightsQuery.parse(query);
  const stateData = STATE_STATUTES[parsed.state];
  const statutes = stateData?.[parsed.issueType] ?? [];

  const rights = statutes.map((s) => s.summary);
  if (rights.length === 0) {
    rights.push(
      `We don\u2019t have pre-loaded statutes for ${parsed.state} / ${parsed.issueType} yet. ` +
        "Check your state attorney general\u2019s website or use our Legal Aid Finder."
    );
  }

  return TenantRightsResult.parse({
    state: parsed.state,
    issueType: parsed.issueType,
    rights,
    statutes: statutes.map((s) => StatuteReference.parse(s)),
    templateLetter: generateTemplateLetter(parsed),
    nextSteps: buildNextSteps(parsed),
    disclaimer: DISCLAIMER,
  });
}

/**
 * Generate a ready-to-send template letter for the tenant\u2019s issue type.
 */
function generateTemplateLetter(query: TenantRightsQuery): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const headers = `${date}\n\n[Your Name]\n[Your Address]\n[City, State ZIP]\n\n[Landlord Name]\n[Landlord Address]\n[City, State ZIP]\n\nRe: `;

  switch (query.issueType) {
    case "repair_request":
      return (
        headers +
        "Request for Repairs\n\nDear [Landlord],\n\n" +
        "I am writing to formally request repairs to the following conditions in my unit:\n\n" +
        "1. [Describe condition]\n2. [Describe condition]\n\n" +
        "These conditions affect the habitability of the unit. Under state law, landlords are required " +
        "to maintain rental properties in habitable condition.\n\n" +
        "Please complete repairs within [14/30] days. If repairs are not made, I may exercise my legal remedies.\n\n" +
        "Sincerely,\n[Your Name]"
      );
    case "security_deposit":
      return (
        headers +
        "Demand for Return of Security Deposit\n\nDear [Landlord],\n\n" +
        "My tenancy at [address] ended on [date]. I am writing to demand the return of my security deposit " +
        `of $${query.monthlyRent ? query.monthlyRent * 2 : "[amount]"}.\n\n` +
        "Under state law, you are required to return the deposit within the statutory timeframe with an " +
        "itemized statement of any deductions.\n\n" +
        "Please remit payment within [7/14/21] days to avoid further legal action.\n\n" +
        "Sincerely,\n[Your Name]"
      );
    default:
      return (
        headers +
        `${query.issueType.replace(/_/g, " ").toUpperCase()}\n\nDear [Landlord],\n\n` +
        "I am writing regarding a matter affecting my tenancy. [Describe the issue in detail.]\n\n" +
        "I am requesting that you [specific remedy sought] within [timeframe].\n\n" +
        "Sincerely,\n[Your Name]"
      );
  }
}

function buildNextSteps(query: TenantRightsQuery): string[] {
  const steps = [
    "Document everything in writing \u2014 keep copies of all correspondence.",
    "Take dated photos/videos of any issues.",
    `Search for free legal aid in ${query.state} using our Legal Aid Finder.`,
  ];

  if (query.issueType === "illegal_eviction") {
    steps.unshift("If you are currently locked out, call 911 \u2014 illegal lockouts are a crime in most states.");
  }

  if (query.issueType === "discrimination") {
    steps.push("File a complaint with HUD: 1-800-669-9777 or hud.gov/fairhousing.");
  }

  return steps;
}
