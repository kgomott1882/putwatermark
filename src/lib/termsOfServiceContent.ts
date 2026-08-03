import type { LegalDocumentSection } from "./legalDocumentTypes";

export const TERMS_OF_SERVICE_LAST_UPDATED = "July 19, 2026";

export const termsOfServiceSections: LegalDocumentSection[] = [
  {
    title: "1. Description of Service",
    body: [
      "PutWatermark is a browser based tool for adding watermarks and signatures to photos, videos, and PDF documents. Most processing happens directly in your browser; some longer or larger video files are processed on our servers and then permanently deleted, typically within minutes of your download and no later than 24 hours regardless of whether the file was downloaded, as described in our [Privacy Policy](/privacy).",
    ],
  },
  {
    title: "2. Eligibility",
    body: [
      "You must be at least 13 years old (or the minimum age of digital consent in your jurisdiction, if higher) to use PutWatermark. By using the service, you confirm you meet this requirement and have the legal capacity to agree to these Terms.",
    ],
  },
  {
    title: "3. Accounts",
    body: [
      {
        type: "list",
        items: [
          "You don't need an account to try the core tool or export watermarked files on the free tier.",
          "An account is required to purchase and use credits. You agree to provide accurate information when creating an account and to keep your login credentials secure.",
          "You're responsible for activity that occurs under your account. Contact us immediately at hello@putwatermark.com if you suspect unauthorized access.",
          "You may delete your account at any time from your account settings; deletion requests are processed within 30 days.",
        ],
      },
    ],
  },
  {
    title: "4. Free Tier and Credits",
    body: [
      {
        type: "list",
        items: [
          "The free tier lets you use the tool without an account, with exported files carrying a visible watermark overlay.",
          "Purchasing credits removes the free tier watermark, subject to the pricing and credit amounts shown at the time of purchase.",
          "Credits do not expire for 60 days from the date of purchase.",
          "Credits have no cash value outside the service and cannot be transferred between accounts.",
          "There is no subscription and no automatic recurring billing. Every credit purchase is a one time transaction you initiate.",
        ],
      },
    ],
  },
  {
    title: "5. Payment and Refunds",
    body: [
      {
        type: "list",
        items: [
          "All prices are listed and charged in USD.",
          "Credit purchases will be processed by a third party payment provider when payment integration goes live. PayPal and Paystack are planned options depending on region. We do not store your full payment card details.",
          "Refund eligibility and how to request a refund are described in our [Refund Policy](/refund-policy). Credits are deducted from your balance only after a successful export.",
        ],
      },
    ],
  },
  {
    title: "6. Acceptable Use",
    body: [
      "You agree not to use PutWatermark to:",
      {
        type: "list",
        items: [
          "Upload or process content you don't have the legal right to use, modify, or distribute",
          "Upload content that is illegal, infringes on others' intellectual property, or violates any third party's rights",
          "Attempt to interfere with, disrupt, reverse engineer, or gain unauthorized access to the service or its underlying systems",
          "Circumvent any usage limits, rate limits, or security measures",
          "Use the service for any fraudulent, harmful, or abusive purpose",
        ],
      },
      "We reserve the right to suspend or terminate access for violations of this section.",
    ],
  },
  {
    title: "7. Your Content",
    body: [
      {
        type: "list",
        items: [
          "You retain all ownership rights to any photo, video, PDF, logo, or signature you upload or create using PutWatermark.",
          "We do not claim any ownership over your content. Because most processing happens in your browser, we generally never receive or store your files at all.",
          "For the limited cases where a file is temporarily processed on our servers (longer/larger videos), you grant us only the minimal, temporary license necessary to process and return that file to you, nothing more, and it's permanently deleted, typically within minutes of your download and no later than 24 hours regardless of whether the file was downloaded, as described in our [Privacy Policy](/privacy).",
        ],
      },
    ],
  },
  {
    title: "8. Our Intellectual Property",
    body: [
      "The PutWatermark name, logo, software, and website design are our property (or licensed to us) and are protected by applicable intellectual property laws. These Terms don't grant you any rights to our branding or underlying software beyond using the service as intended.",
    ],
  },
  {
    title: "9. Service Availability",
    body: [
      "We aim to keep PutWatermark available and reliable, but we don't guarantee uninterrupted access. We may modify, suspend, or discontinue features at any time, and we're not liable for any unavailability or interruption of the service.",
    ],
  },
  {
    title: "10. Disclaimer of Warranties",
    body: [
      "PutWatermark is provided \"as is\" and \"as available,\" without warranties of any kind, express or implied, to the fullest extent permitted by law. We don't guarantee the service will be error free, uninterrupted, or that it will meet your specific requirements.",
    ],
  },
  {
    title: "11. Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, PutWatermark and Jetskie Softwares are not liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability for any claim relating to the service is limited to the amount you paid us in the 12 months preceding the claim.",
      "(Some jurisdictions don't allow certain liability limitations. In those cases, the relevant limitation applies only to the extent permitted by law.)",
    ],
  },
  {
    title: "12. Indemnification",
    body: [
      "You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your misuse of the service, your violation of these Terms, or content you upload that infringes on someone else's rights.",
    ],
  },
  {
    title: "13. Termination",
    body: [
      "You may stop using PutWatermark and delete your account at any time. We may suspend or terminate your access if you violate these Terms, without prior notice where reasonably necessary (for example, in cases of fraud or abuse).",
    ],
  },
  {
    title: "14. Governing Law",
    body: [
      "These Terms are governed by the laws of South Africa, without regard to conflict of law principles, except where local consumer protection laws in your jurisdiction require otherwise.",
    ],
  },
  {
    title: "15. Changes to These Terms",
    body: [
      "We may update these Terms from time to time. If we make material changes, we'll update the \"Last updated\" date above. Continuing to use PutWatermark after changes take effect means you accept the updated Terms.",
    ],
  },
  {
    title: "16. Contact",
    body: [
      "Questions about these Terms can be sent to hello@putwatermark.com.",
    ],
  },
];
