/**
 * MAMA Access to Justice — Know Your Rights Module
 *
 * Clear, actionable rights information for police encounters,
 * workplace situations, immigration stops, and protest/assembly.
 *
 * @module know-your-rights
 * @license GPL-3.0
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const RightsScenario = z.enum([
  "police_stop_vehicle",
  "police_stop_street",
  "police_at_home",
  "arrested",
  "workplace_discrimination",
  "workplace_wage_theft",
  "workplace_retaliation",
  "immigration_stop",
  "immigration_ice_raid",
  "protest_assembly",
  "school_search",
  "debt_collector_call",
]);

export const KnowYourRightsInput = z.object({
  scenario: RightsScenario,
  state: z.string().length(2).toUpperCase().optional(),
  language: z.string().default("en"),
  age: z.enum(["minor", "adult"]).default("adult"),
});

export type KnowYourRightsInput = z.infer<typeof KnowYourRightsInput>;

export const RightsCard = z.object({
  scenario: RightsScenario,
  title: z.string(),
  quickRules: z.array(z.string()).describe("Short, memorizable rules"),
  detailedRights: z.array(
    z.object({
      right: z.string(),
      explanation: z.string(),
      legalBasis: z.string(),
    })
  ),
  doList: z.array(z.string()),
  dontList: z.array(z.string()),
  magicPhrases: z.array(z.string()).describe("Exact phrases to say"),
  afterwardSteps: z.array(z.string()),
  emergencyContacts: z.array(
    z.object({ name: z.string(); phone: z.string(); when: z.string() })
  ),
  disclaimer: z.string(),
});

export type RightsCard = z.infer<typeof RightsCard>;

// ---------------------------------------------------------------------------
// Rights database
// ---------------------------------------------------------------------------

const DISCLAIMER =
  "IMPORTANT: This is general legal information, NOT legal advice. " +
  "Laws vary by state and locality. Exercise rights calmly and respectfully \u2014 your safety comes first.";

const RIGHTS_DB: Record<string, Omit<RightsCard, "scenario" | "disclaimer">> = {
  police_stop_vehicle: {
    title: "Pulled Over by Police",
    quickRules: [
      "Stay calm. Hands on the wheel.",
      "You must provide license, registration, insurance.",
      "You do NOT have to consent to a search.",
      "You have the right to remain silent beyond identifying yourself.",
    ],
    detailedRights: [
      {
        right: "Right to Remain Silent",
        explanation: "After identifying yourself, you can say: \u2018I am exercising my right to remain silent.\u2019 You cannot be punished for this.",
        legalBasis: "5th Amendment, Miranda v. Arizona (1966)",
      },
      {
        right: "Right to Refuse Search",
        explanation: "If police ask to search your car, you can say: \u2018I do not consent to a search.\u2019 If they search anyway, do not resist \u2014 challenge it in court later.",
        legalBasis: "4th Amendment, Schneckloth v. Bustamonte (1973)",
      },
      {
        right: "Right to Record",
        explanation: "You have the right to record police encounters in all 50 states, as long as you do not interfere with their duties.",
        legalBasis: "1st Amendment, Glik v. Cunniffe (2011)",
      },
    ],
    doList: [
      "Keep hands visible at all times.",
      "Provide license, registration, and insurance when asked.",
      "Ask \u2018Am I free to go?\u2019 if the stop seems to be dragging on.",
      "Record the encounter if you can do so safely.",
      "Note the officer\u2019s name, badge number, and patrol car number.",
    ],
    dontList: [
      "Do NOT reach for anything without telling the officer first.",
      "Do NOT argue, resist, or run \u2014 even if you believe the stop is unjust.",
      "Do NOT consent to a search. Simply say: \u2018I do not consent.\u2019",
      "Do NOT lie \u2014 instead, remain silent.",
    ],
    magicPhrases: [
      "I am exercising my right to remain silent.",
      "I do not consent to a search.",
      "Am I being detained or am I free to go?",
      "I would like to speak with a lawyer.",
    ],
    afterwardSteps: [
      "Write down everything you remember as soon as possible.",
      "Save any recordings or dashcam footage.",
      "If you believe your rights were violated, file a complaint with the department\u2019s internal affairs.",
      "Contact the ACLU or a civil rights attorney if you experienced misconduct.",
    ],
    emergencyContacts: [
      { name: "ACLU", phone: "Contact local chapter", when: "Rights violated during encounter" },
      { name: "National Lawyers Guild Hotline", phone: "1-212-679-5100", when: "Arrested or detained" },
    ],
  },

  arrested: {
    title: "You\u2019ve Been Arrested",
    quickRules: [
      "Stay calm. Do not resist.",
      "Say: \u2018I want a lawyer. I am not answering questions.\u2019",
      "You have the right to make a phone call.",
      "Do NOT sign anything without a lawyer.",
    ],
    detailedRights: [
      {
        right: "Right to an Attorney",
        explanation: "You have the right to an attorney. If you cannot afford one, the court MUST appoint a public defender for you at no cost.",
        legalBasis: "6th Amendment, Gideon v. Wainwright (1963)",
      },
      {
        right: "Right to Remain Silent",
        explanation: "You do not have to answer any questions. Invoke this clearly: \u2018I am invoking my 5th Amendment right. I want a lawyer.\u2019",
        legalBasis: "5th Amendment, Miranda v. Arizona (1966)",
      },
      {
        right: "Right to Know the Charges",
        explanation: "You have the right to be told what you are being charged with.",
        legalBasis: "6th Amendment",
      },
      {
        right: "Right to a Phone Call",
        explanation: "Most jurisdictions allow at least one phone call within a reasonable time after booking.",
        legalBasis: "Varies by state statute",
      },
    ],
    doList: [
      "Clearly invoke your rights: \u2018I want a lawyer.\u2019",
      "Memorize one phone number (lawyer, family member, or bail fund).",
      "Be polite but firm.",
      "Ask for a public defender at your first court appearance if you can\u2019t afford an attorney.",
    ],
    dontList: [
      "Do NOT answer questions without a lawyer present.",
      "Do NOT consent to searches.",
      "Do NOT sign anything without a lawyer reviewing it.",
      "Do NOT discuss your case with cellmates \u2014 they can be used as witnesses.",
      "Do NOT resist arrest, even if unjust.",
    ],
    magicPhrases: [
      "I am invoking my right to remain silent.",
      "I want a lawyer.",
      "I do not consent to a search.",
      "I want to make a phone call.",
    ],
    afterwardSteps: [
      "Contact a lawyer or request a public defender immediately.",
      "Do not discuss details of your case over jail phones (they are recorded).",
      "Write down everything that happened during the arrest while your memory is fresh.",
      "Contact BailConnect or The Bail Project if you need help posting bail.",
    ],
    emergencyContacts: [
      { name: "National Lawyers Guild", phone: "1-212-679-5100", when: "Need legal representation" },
      { name: "BailConnect (MAMA)", phone: "See mama.oliwoods.ai", when: "Cannot afford bail" },
      { name: "Public Defender", phone: "Request at arraignment", when: "Cannot afford a lawyer" },
    ],
  },

  immigration_stop: {
    title: "Immigration Stop / Checkpoint",
    quickRules: [
      "You have rights regardless of immigration status.",
      "You do NOT have to answer questions about your country of birth or immigration status.",
      "You do NOT have to show immigration documents to local police.",
      "If ICE, ask: \u2018Do you have a warrant signed by a judge?\u2019",
    ],
    detailedRights: [
      {
        right: "Right to Remain Silent",
        explanation: "The 5th Amendment applies to EVERYONE in the US, regardless of immigration status.",
        legalBasis: "5th Amendment",
      },
      {
        right: "Right to Refuse Entry Without a Judicial Warrant",
        explanation: "ICE cannot enter your home without a warrant signed by a JUDGE (not an ICE agent). Administrative warrants (Form I-200) do NOT authorize entry.",
        legalBasis: "4th Amendment, ICE Policy Directive",
      },
      {
        right: "Right to an Attorney",
        explanation: "You have the right to speak with an attorney before signing any documents.",
        legalBasis: "5th Amendment Due Process",
      },
    ],
    doList: [
      "Stay calm.",
      "Ask if they have a warrant signed by a judge.",
      "If they do not have a judicial warrant, you can decline to open the door.",
      "Say: \u2018I am exercising my right to remain silent.\u2019",
      "Memorize an immigration attorney\u2019s number.",
    ],
    dontList: [
      "Do NOT open the door without seeing a judicial warrant.",
      "Do NOT sign any documents (especially \u2018voluntary departure\u2019) without a lawyer.",
      "Do NOT lie about your status \u2014 instead, remain silent.",
      "Do NOT run.",
      "Do NOT provide fake documents.",
    ],
    magicPhrases: [
      "I am exercising my right to remain silent.",
      "I do not consent to a search.",
      "Do you have a warrant signed by a judge?",
      "I need to speak with my attorney before answering any questions.",
    ],
    afterwardSteps: [
      "Write down everything: agents\u2019 names, badge numbers, what was said.",
      "Contact an immigration attorney immediately.",
      "Report the encounter to your local immigrant rights organization.",
      "If detained, you still have the right to a hearing before an immigration judge.",
    ],
    emergencyContacts: [
      { name: "National Immigrant Justice Center", phone: "1-312-660-1370", when: "Need immigration legal help" },
      { name: "ACLU Immigrants\u2019 Rights", phone: "Contact local chapter", when: "Rights violated" },
      { name: "United We Dream Hotline", phone: "1-844-363-1423", when: "ICE encounter" },
    ],
  },

  debt_collector_call: {
    title: "Debt Collector Calling You",
    quickRules: [
      "You have the right to demand they stop calling you (in writing).",
      "They CANNOT threaten you with jail for unpaid debt.",
      "They CANNOT call before 8am or after 9pm.",
      "They MUST validate the debt if you ask within 30 days.",
    ],
    detailedRights: [
      {
        right: "Right to Debt Validation",
        explanation: "Within 30 days of first contact, you can demand written proof of the debt. They must stop collection until they provide it.",
        legalBasis: "Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. \u00A7 1692g",
      },
      {
        right: "Right to Stop Contact",
        explanation: "Send a written cease-and-desist letter. They can only contact you to confirm they\u2019ll stop or to notify you of legal action.",
        legalBasis: "FDCPA, 15 U.S.C. \u00A7 1692c",
      },
      {
        right: "Protection from Harassment",
        explanation: "Debt collectors cannot use threats, profanity, repeated calls to harass, or call your workplace if you ask them to stop.",
        legalBasis: "FDCPA, 15 U.S.C. \u00A7 1692d",
      },
    ],
    doList: [
      "Ask for the debt collector\u2019s name, company, address, and phone number.",
      "Request written debt validation within 30 days.",
      "Keep records of all calls (date, time, what was said).",
      "Send all letters via certified mail with return receipt.",
    ],
    dontList: [
      "Do NOT acknowledge the debt is yours until you verify it.",
      "Do NOT give them your bank account or financial information.",
      "Do NOT agree to payment plans you can\u2019t afford.",
      "Do NOT ignore lawsuits \u2014 respond or they get a default judgment.",
    ],
    magicPhrases: [
      "I am requesting written validation of this debt under the FDCPA.",
      "Please send all future communication in writing to my address.",
      "I am recording this call for my records.",
      "I dispute this debt. Please provide proof.",
    ],
    afterwardSteps: [
      "Send a debt validation letter within 30 days (template in our Consumer Protection module).",
      "Check if the debt is past the statute of limitations for your state.",
      "File a CFPB complaint if the collector violates the FDCPA.",
      "Consider consulting a consumer rights attorney \u2014 many work on contingency for FDCPA violations.",
    ],
    emergencyContacts: [
      { name: "CFPB Complaint Line", phone: "1-855-411-2372", when: "Collector violating FDCPA" },
      { name: "National Association of Consumer Advocates", phone: "naca.net", when: "Need a consumer rights attorney" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Get a complete rights card for a given scenario.
 */
export async function getRightsCard(input: KnowYourRightsInput): Promise<RightsCard> {
  const parsed = KnowYourRightsInput.parse(input);
  const data = RIGHTS_DB[parsed.scenario];

  if (!data) {
    // Return a generic card for scenarios not yet detailed
    return {
      scenario: parsed.scenario,
      title: parsed.scenario.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      quickRules: [
        "You have the right to remain silent.",
        "You have the right to an attorney.",
        "Document everything.",
      ],
      detailedRights: [],
      doList: ["Stay calm.", "Document what happens.", "Seek legal help."],
      dontList: ["Do not volunteer information.", "Do not sign anything without a lawyer."],
      magicPhrases: ["I am exercising my right to remain silent.", "I want to speak with a lawyer."],
      afterwardSteps: ["Write down everything.", "Contact a lawyer or legal aid."],
      emergencyContacts: [
        { name: "ACLU", phone: "aclu.org", when: "Rights violated" },
      ],
      disclaimer: DISCLAIMER,
    };
  }

  return {
    scenario: parsed.scenario,
    ...data,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Get just the "magic phrases" for quick reference (e.g., for a wallet card).
 */
export function getQuickPhrases(scenario: z.infer<typeof RightsScenario>): string[] {
  const data = RIGHTS_DB[scenario];
  return data?.magicPhrases ?? [
    "I am exercising my right to remain silent.",
    "I want to speak with a lawyer.",
  ];
}

/**
 * Generate a printable wallet-sized rights card.
 */
export function generateWalletCard(scenarios: z.infer<typeof RightsScenario>[]): string {
  const lines = ["YOUR RIGHTS \u2014 KEEP THIS CARD IN YOUR WALLET", ""];

  for (const scenario of scenarios) {
    const data = RIGHTS_DB[scenario];
    if (!data) continue;
    lines.push(`=== ${data.title.toUpperCase()} ===`);
    for (const rule of data.quickRules) {
      lines.push(`  \u2022 ${rule}`);
    }
    lines.push(`  SAY: "${data.magicPhrases[0]}"`);
    lines.push("");
  }

  lines.push("---");
  lines.push("MAMA Access to Justice | mama.oliwoods.ai | Free Forever");
  lines.push(DISCLAIMER);

  return lines.join("\n");
}
