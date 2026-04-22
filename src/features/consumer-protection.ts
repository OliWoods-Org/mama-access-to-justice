/**
 * MAMA Access to Justice — Consumer Protection Module
 *
 * Scam identification, complaint filing guidance, FTC/CFPB/State AG
 * contacts, and fraud reporting workflows.
 *
 * @module consumer-protection
 * @license GPL-3.0
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const ScamType = z.enum([
  "phishing",
  "identity_theft",
  "debt_collection_abuse",
  "auto_dealer_fraud",
  "home_repair_scam",
  "romance_scam",
  "tech_support_scam",
  "fake_charity",
  "predatory_lending",
  "subscription_trap",
  "robocall",
  "other",
]);

export const ConsumerComplaintInput = z.object({
  state: z.string().length(2).toUpperCase(),
  scamType: ScamType,
  amountLost: z.number().nonnegative().optional(),
  companyName: z.string().optional(),
  description: z.string().min(10),
  hasDocumentation: z.boolean().default(false),
});

export type ConsumerComplaintInput = z.infer<typeof ConsumerComplaintInput>;

export const AgencyContact = z.object({
  name: z.string(),
  role: z.string(),
  phone: z.string().optional(),
  url: z.string().url(),
  filingUrl: z.string().url().optional(),
});

export const ConsumerProtectionResult = z.object({
  filingPlan: z.array(
    z.object({
      step: z.number(),
      agency: z.string(),
      action: z.string(),
      url: z.string().url().optional(),
      priority: z.enum(["immediate", "within_24h", "within_week"]),
    })
  ),
  relevantAgencies: z.array(AgencyContact),
  protectionTips: z.array(z.string()),
  templateComplaint: z.string(),
  estimatedRecoveryChance: z.enum(["high", "moderate", "low", "unlikely"]),
  disclaimer: z.string(),
});

export type ConsumerProtectionResult = z.infer<typeof ConsumerProtectionResult>;

// ---------------------------------------------------------------------------
// Agency database
// ---------------------------------------------------------------------------

const FEDERAL_AGENCIES: AgencyContact[] = [
  {
    name: "Federal Trade Commission (FTC)",
    role: "Primary federal consumer protection agency",
    phone: "1-877-382-4357",
    url: "https://www.ftc.gov",
    filingUrl: "https://reportfraud.ftc.gov",
  },
  {
    name: "Consumer Financial Protection Bureau (CFPB)",
    role: "Financial products and services complaints",
    phone: "1-855-411-2372",
    url: "https://www.consumerfinance.gov",
    filingUrl: "https://www.consumerfinance.gov/complaint/",
  },
  {
    name: "FBI Internet Crime Complaint Center (IC3)",
    role: "Internet-based fraud and cybercrime",
    url: "https://www.ic3.gov",
    filingUrl: "https://www.ic3.gov/File/Default.aspx",
  },
  {
    name: "Identity Theft Resource Center",
    role: "Identity theft remediation assistance",
    phone: "1-888-400-5530",
    url: "https://www.idtheftcenter.org",
  },
];

const STATE_AG_URLS: Record<string, { name: string; url: string; phone?: string }> = {
  CA: { name: "California Attorney General", url: "https://oag.ca.gov/consumers", phone: "1-800-952-5225" },
  NY: { name: "New York Attorney General", url: "https://ag.ny.gov/consumer-frauds-bureau", phone: "1-800-771-7755" },
  TX: { name: "Texas Attorney General", url: "https://www.texasattorneygeneral.gov/consumer-protection", phone: "1-800-621-0508" },
  FL: { name: "Florida Attorney General", url: "https://www.myfloridalegal.com/consumer-protection", phone: "1-866-966-7226" },
  IL: { name: "Illinois Attorney General", url: "https://www.illinoisattorneygeneral.gov/consumers/", phone: "1-800-386-5438" },
};

const DISCLAIMER =
  "IMPORTANT: This is general legal information, NOT legal advice. " +
  "For urgent fraud, contact your bank immediately to freeze accounts.";

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Build a multi-agency filing plan for a consumer complaint.
 */
export async function buildConsumerComplaintPlan(
  input: ConsumerComplaintInput
): Promise<ConsumerProtectionResult> {
  const parsed = ConsumerComplaintInput.parse(input);

  const filingPlan = buildFilingPlan(parsed);
  const agencies = getRelevantAgencies(parsed);

  return {
    filingPlan,
    relevantAgencies: agencies,
    protectionTips: getProtectionTips(parsed.scamType),
    templateComplaint: generateComplaintTemplate(parsed),
    estimatedRecoveryChance: estimateRecovery(parsed),
    disclaimer: DISCLAIMER,
  };
}

function buildFilingPlan(input: ConsumerComplaintInput) {
  const steps: ConsumerProtectionResult["filingPlan"] = [];
  let stepNum = 1;

  // Identity theft gets immediate freeze
  if (input.scamType === "identity_theft") {
    steps.push({
      step: stepNum++,
      agency: "Credit Bureaus (Equifax, Experian, TransUnion)",
      action: "Place a fraud alert and credit freeze on all three bureaus immediately.",
      url: "https://www.identitytheft.gov",
      priority: "immediate",
    });
  }

  // Financial loss => bank first
  if (input.amountLost && input.amountLost > 0) {
    steps.push({
      step: stepNum++,
      agency: "Your Bank / Credit Card Company",
      action: "Dispute the charge and request a chargeback. Document the fraud reference number.",
      priority: "immediate",
    });
  }

  // FTC for all
  steps.push({
    step: stepNum++,
    agency: "Federal Trade Commission (FTC)",
    action: "File a report at ReportFraud.ftc.gov. This goes into a database used by 3,000+ law enforcement agencies.",
    url: "https://reportfraud.ftc.gov",
    priority: "within_24h",
  });

  // Financial products => CFPB
  if (["predatory_lending", "debt_collection_abuse", "subscription_trap"].includes(input.scamType)) {
    steps.push({
      step: stepNum++,
      agency: "Consumer Financial Protection Bureau (CFPB)",
      action: "File a complaint. CFPB forwards to company and requires response within 15 days.",
      url: "https://www.consumerfinance.gov/complaint/",
      priority: "within_24h",
    });
  }

  // Internet fraud => IC3
  if (["phishing", "tech_support_scam", "romance_scam"].includes(input.scamType)) {
    steps.push({
      step: stepNum++,
      agency: "FBI IC3",
      action: "File an internet crime complaint for federal investigation tracking.",
      url: "https://www.ic3.gov/File/Default.aspx",
      priority: "within_24h",
    });
  }

  // State AG
  const stateAG = STATE_AG_URLS[input.state];
  if (stateAG) {
    steps.push({
      step: stepNum++,
      agency: stateAG.name,
      action: `File a state consumer complaint. State AGs can pursue legal action against companies operating in ${input.state}.`,
      url: stateAG.url,
      priority: "within_week",
    });
  }

  return steps;
}

function getRelevantAgencies(input: ConsumerComplaintInput): AgencyContact[] {
  const agencies = [...FEDERAL_AGENCIES];
  const stateAG = STATE_AG_URLS[input.state];
  if (stateAG) {
    agencies.push({
      name: stateAG.name,
      role: `State-level consumer protection for ${input.state}`,
      phone: stateAG.phone,
      url: stateAG.url,
    });
  }
  return agencies.map((a) => AgencyContact.parse(a));
}

function getProtectionTips(scamType: string): string[] {
  const universal = [
    "Never share your Social Security number unless absolutely necessary.",
    "Use unique passwords for every account (use a password manager).",
    "Enable two-factor authentication on all financial accounts.",
    "Check your credit report for free at AnnualCreditReport.com.",
  ];

  const specific: Record<string, string[]> = {
    phishing: [
      "Never click links in unexpected emails \u2014 go directly to the website.",
      "Check the sender\u2019s actual email address, not just the display name.",
    ],
    identity_theft: [
      "Place a credit freeze (free) with all three bureaus.",
      "File an Identity Theft Report at IdentityTheft.gov.",
    ],
    robocall: [
      "Register with the Do Not Call Registry: donotcall.gov.",
      "Never press any buttons during a robocall \u2014 it confirms your number is active.",
    ],
  };

  return [...(specific[scamType] ?? []), ...universal];
}

function generateComplaintTemplate(input: ConsumerComplaintInput): string {
  return [
    `Date: ${new Date().toISOString().split("T")[0]}`,
    `Complaint Type: ${input.scamType.replace(/_/g, " ").toUpperCase()}`,
    input.companyName ? `Company/Individual: ${input.companyName}` : "",
    input.amountLost ? `Amount Lost: $${input.amountLost.toLocaleString()}` : "",
    "",
    "Description of Incident:",
    input.description,
    "",
    "Documentation Available: " + (input.hasDocumentation ? "Yes" : "No"),
    "",
    "Desired Resolution: [Full refund / Account correction / Investigation]",
    "",
    "Contact Information:",
    "[Your Name]",
    "[Your Address]",
    "[Your Phone]",
    "[Your Email]",
  ]
    .filter(Boolean)
    .join("\n");
}

function estimateRecovery(input: ConsumerComplaintInput): "high" | "moderate" | "low" | "unlikely" {
  if (!input.amountLost || input.amountLost === 0) return "moderate";

  // Credit card chargebacks have high success
  if (input.hasDocumentation && input.amountLost < 5000) return "high";
  if (input.hasDocumentation) return "moderate";
  if (input.scamType === "romance_scam" && input.amountLost > 10000) return "unlikely";

  return "low";
}
