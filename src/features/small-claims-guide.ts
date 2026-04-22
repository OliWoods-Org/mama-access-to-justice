/**
 * MAMA Access to Justice — Small Claims Court Guide
 *
 * Guides users through the small-claims process: eligibility check,
 * court lookup, fee calculator, filing checklist, and hearing prep.
 *
 * @module small-claims-guide
 * @license GPL-3.0
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const SmallClaimsInput = z.object({
  state: z.string().length(2).toUpperCase(),
  claimAmount: z.number().positive(),
  claimType: z.enum([
    "unpaid_debt",
    "property_damage",
    "security_deposit",
    "breach_of_contract",
    "defective_product",
    "auto_accident",
    "neighbor_dispute",
    "other",
  ]),
  county: z.string().min(1).optional(),
  hasEvidence: z.boolean().default(false),
});

export type SmallClaimsInput = z.infer<typeof SmallClaimsInput>;

export const CourtInfo = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string().optional(),
  filingFee: z.number(),
  maxClaimAmount: z.number(),
  url: z.string().url().optional(),
});

export const SmallClaimsEligibility = z.object({
  eligible: z.boolean(),
  reason: z.string(),
  maxAmount: z.number(),
  filingFee: z.number(),
  estimatedTimeline: z.string(),
  court: CourtInfo.optional(),
  filingChecklist: z.array(z.string()),
  hearingTips: z.array(z.string()),
  disclaimer: z.string(),
});

export type SmallClaimsEligibility = z.infer<typeof SmallClaimsEligibility>;

// ---------------------------------------------------------------------------
// State data (subset for illustration)
// ---------------------------------------------------------------------------

interface StateSmallClaimsConfig {
  maxAmount: number;
  baseFee: number;
  feeSchedule: { upTo: number; fee: number }[];
  timeline: string;
}

const STATE_CONFIG: Record<string, StateSmallClaimsConfig> = {
  CA: {
    maxAmount: 12500,
    baseFee: 30,
    feeSchedule: [
      { upTo: 1500, fee: 30 },
      { upTo: 5000, fee: 50 },
      { upTo: 10000, fee: 75 },
      { upTo: 12500, fee: 100 },
    ],
    timeline: "30-70 days from filing to hearing",
  },
  NY: {
    maxAmount: 10000,
    baseFee: 15,
    feeSchedule: [
      { upTo: 1000, fee: 15 },
      { upTo: 5000, fee: 20 },
      { upTo: 10000, fee: 25 },
    ],
    timeline: "30-60 days from filing to hearing",
  },
  TX: {
    maxAmount: 20000,
    baseFee: 35,
    feeSchedule: [
      { upTo: 2500, fee: 35 },
      { upTo: 5000, fee: 50 },
      { upTo: 10000, fee: 75 },
      { upTo: 20000, fee: 100 },
    ],
    timeline: "30-45 days from filing to hearing",
  },
  FL: {
    maxAmount: 8000,
    baseFee: 55,
    feeSchedule: [
      { upTo: 2500, fee: 55 },
      { upTo: 5000, fee: 170 },
      { upTo: 8000, fee: 300 },
    ],
    timeline: "30-60 days from filing to hearing",
  },
};

const DISCLAIMER =
  "IMPORTANT: This is general legal information, NOT legal advice. " +
  "Court rules vary by jurisdiction. Confirm all details with your local court clerk.";

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

function calculateFee(state: StateSmallClaimsConfig, amount: number): number {
  for (const tier of state.feeSchedule) {
    if (amount <= tier.upTo) return tier.fee;
  }
  return state.feeSchedule[state.feeSchedule.length - 1].fee;
}

/**
 * Evaluate whether a claim is eligible for small claims court and provide
 * a full filing guide.
 */
export async function evaluateSmallClaim(input: SmallClaimsInput): Promise<SmallClaimsEligibility> {
  const parsed = SmallClaimsInput.parse(input);
  const config = STATE_CONFIG[parsed.state];

  if (!config) {
    return {
      eligible: false,
      reason: `State ${parsed.state} data not yet available. Contact your local court clerk.`,
      maxAmount: 0,
      filingFee: 0,
      estimatedTimeline: "Unknown",
      filingChecklist: [],
      hearingTips: [],
      disclaimer: DISCLAIMER,
    };
  }

  const eligible = parsed.claimAmount <= config.maxAmount;
  const fee = calculateFee(config, parsed.claimAmount);

  return {
    eligible,
    reason: eligible
      ? `Your claim of $${parsed.claimAmount.toLocaleString()} is within the ${parsed.state} small claims limit of $${config.maxAmount.toLocaleString()}.`
      : `Your claim of $${parsed.claimAmount.toLocaleString()} exceeds the ${parsed.state} small claims limit of $${config.maxAmount.toLocaleString()}. Consider filing in civil court or reducing your claim.`,
    maxAmount: config.maxAmount,
    filingFee: fee,
    estimatedTimeline: config.timeline,
    filingChecklist: buildFilingChecklist(parsed),
    hearingTips: buildHearingTips(parsed),
    disclaimer: DISCLAIMER,
  };
}

function buildFilingChecklist(input: SmallClaimsInput): string[] {
  return [
    "Determine the exact legal name of the person/business you are suing.",
    "Gather all evidence: contracts, receipts, photos, text messages, emails.",
    "Write a demand letter and send it (certified mail) \u2014 courts look favorably on this.",
    `Go to your local ${input.state} small claims court clerk and request the filing form.`,
    "Pay the filing fee (fee waivers available for low-income filers).",
    "Serve the defendant according to your state\u2019s rules (usually sheriff or certified mail).",
    "File proof of service with the court.",
    "Prepare your presentation: organize evidence chronologically.",
    "Bring 3 copies of everything to court (judge, defendant, yourself).",
  ];
}

function buildHearingTips(input: SmallClaimsInput): string[] {
  const tips = [
    "Arrive early. Dress professionally.",
    "Be polite and address the judge as \u201CYour Honor.\u201D",
    "Stick to facts. Do not argue with the other party \u2014 speak only to the judge.",
    "Present evidence in chronological order.",
    "If you have witnesses, bring them (or written declarations).",
    "Keep it brief: you typically have 15-20 minutes.",
  ];

  if (input.claimType === "security_deposit") {
    tips.push("Bring your lease, move-in/move-out inspection reports, and photos.");
  }

  if (input.claimType === "defective_product") {
    tips.push("Bring the product (if possible), the receipt, warranty, and any repair records.");
  }

  return tips;
}

/**
 * Quick check: should the user even bother suing?
 */
export function shouldYouSue(claimAmount: number, filingFee: number, hoursOfEffort: number = 8): {
  recommendation: string;
  costBenefitRatio: number;
} {
  const hourlyValueOfTime = 25; // conservative estimate
  const totalCost = filingFee + hoursOfEffort * hourlyValueOfTime;
  const ratio = claimAmount / totalCost;

  let recommendation: string;
  if (ratio > 3) {
    recommendation = "Strong case to file. The potential recovery significantly outweighs costs.";
  } else if (ratio > 1.5) {
    recommendation = "Worth considering. Send a demand letter first \u2014 many cases settle before court.";
  } else {
    recommendation =
      "The cost of pursuing this may not be worth it financially. Consider a demand letter or mediation instead.";
  }

  return { recommendation, costBenefitRatio: Math.round(ratio * 100) / 100 };
}
