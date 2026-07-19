import type { LegalDocumentSection } from "./legalDocumentTypes";

export const REFUND_POLICY_LAST_UPDATED = "July 19, 2026";

export const refundPolicySections: LegalDocumentSection[] = [
  {
    title: "Overview",
    body: [
      "PutWatermark uses a pay-as-you-go credit model with no subscription. This policy explains when credits or purchases can be refunded. It should be read alongside our [Terms of Service](/terms).",
    ],
  },
  {
    title: "Refunds for Unused Credits",
    body: [
      "You may request a refund of your unused credit balance within 14 days of purchase. To request a refund, contact us at hello@putwatermark.com with the email address associated with your account and the date of your purchase.",
      "Refunds apply only to credits that remain unused in your balance. Once credits have been spent, they are treated as delivered service and are not eligible for refund under this policy.",
    ],
  },
  {
    title: "Credits Already Spent on Exports",
    body: [
      "Credits already spent on a completed export are non-refundable, since the associated processing has already occurred. This applies whether the export was a photo, PDF, or video, and whether processing happened in your browser or on our servers.",
    ],
  },
  {
    title: "Failed Exports and Credit Charges",
    body: [
      "Credits are deducted from your balance only after an export completes successfully. If an export fails due to a technical error on our end, you are not charged for that export.",
      "If you believe credits were deducted incorrectly after a failed export, contact us at hello@putwatermark.com and we will investigate.",
    ],
  },
  {
    title: "How Refunds Are Issued",
    body: [
      "Approved refunds for unused credit balances are returned through the same payment method used for the original purchase, subject to the rules of our payment provider. Processing times may vary depending on your bank or payment platform.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Questions about refunds can be sent to hello@putwatermark.com.",
    ],
  },
];
