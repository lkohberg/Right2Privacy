// Permanent, non-changing background facts on EU privacy policy and what is planned.
export type EuFact = { label: string; text: string };

export const EU_POLICY_FACTS: EuFact[] = [
  {
    label: "CSAR 2022",
    text: "The EU Commission proposed the Child Sexual Abuse Regulation (\u201cchat control\u201d) in May 2022, allowing orders to scan private messages of all users.",
  },
  {
    label: "Client-side scanning",
    text: "Detection orders would require scanning messages on the device before encryption \u2014 end-to-end encryption stays intact on paper, but privacy does not.",
  },
  {
    label: "Parliament 2024",
    text: "The European Parliament's position excludes end-to-end encrypted communication from scanning and rejects untargeted mass scanning.",
  },
  {
    label: "Council deadlock",
    text: "Member states in the Council have repeatedly failed to reach a majority; each presidency reopens the file with a new compromise text.",
  },
  {
    label: "Voluntary scanning extended",
    text: "The interim derogation letting providers scan voluntarily has been prolonged rather than allowed to lapse, keeping the file alive.",
  },
  {
    label: "400+ researchers",
    text: "More than 400 cryptography and security researchers warned publicly that the proposal is technically unworkable and dangerous.",
  },
  {
    label: "Court of Justice",
    text: "The CJEU has struck down general and indiscriminate data retention several times; surveillance without suspicion conflicts with EU law.",
  },
  {
    label: "Charter Articles 7 & 8",
    text: "Respect for private communication and protection of personal data are fundamental rights under the EU Charter.",
  },
  {
    label: "Data retention returns",
    text: "The Commission's \u201cProtectEU\u201d / Going Dark roadmap plans new lawful-access and data-retention rules, including access to encrypted data by 2030.",
  },
  {
    label: "Digital Omnibus",
    text: "A planned simplification package would reopen parts of the GDPR and ePrivacy rules \u2014 civil society warns it could weaken existing protections.",
  },
  {
    label: "Age verification",
    text: "Upcoming EU rules push mandatory age checks for online services, which in practice means more identification of ordinary users.",
  },
  {
    label: "Your defence",
    text: "Nothing in any proposal can read a message an attacker never holds the key to \u2014 keys stay on your device here.",
  },
];
