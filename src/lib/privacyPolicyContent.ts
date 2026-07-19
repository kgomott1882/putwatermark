import type { LegalDocumentSection } from "./legalDocumentTypes";

export const PRIVACY_POLICY_LAST_UPDATED = "July 19, 2026";

export type PrivacyPolicySection = LegalDocumentSection;
export type PrivacyPolicyListBlock = Extract<
  LegalDocumentSection["body"][number],
  { type: "list" }
>;

export const privacyPolicySections: PrivacyPolicySection[] = [
  {
    title: "The Short Version",
    body: [
      "Most of what you do in PutWatermark — uploading a photo, video, or PDF, designing a watermark, adding a signature, and exporting — happens entirely in your browser. Your files are not uploaded to our servers except in limited cases: longer or larger videos that require server-side processing, and PDFs temporarily uploaded to verify page count for credit billing on paid exports. In those cases, files are permanently deleted — typically within minutes of your download, and no later than 24 hours regardless of whether the file was downloaded. We collect account information only if you sign up, and we never sell your data.",
    ],
  },
  {
    title: "Information We Collect",
    body: [
      {
        type: "list",
        intro: "Information you provide directly",
        items: [
          "Account details: name, surname, email address, and a password (stored in hashed form — we never store or have access to your plain-text password), if you create an account.",
          "Marketing consent: a separate, opt-in checkbox at signup for occasional emails about PutWatermark. This is not required to create an account.",
          "Payment information: once payment integration goes live, payment will be processed by a third-party payment provider — we do not store your card or payment details ourselves.",
        ],
      },
      {
        type: "list",
        intro: "Information collected automatically",
        items: [
          "Session and authentication data: cookies used to keep you logged in, managed through our authentication provider (Supabase Auth).",
          "Basic technical information standard to any web request (such as IP address and browser type), used for security and abuse prevention, not for tracking or advertising.",
        ],
      },
      {
        type: "list",
        intro: "Your files",
        items: [
          "Photos and most video: processed entirely in your browser. These files are never uploaded to, stored on, or accessible from our servers.",
          "PDFs: watermarking happens in your browser. When you export a paid (credit) PDF, the file may be temporarily uploaded so we can verify page count for billing; it is then permanently deleted — typically within minutes, and no later than 24 hours.",
          "Longer or larger videos (exceeding what your browser can process directly) are temporarily uploaded to secure, private storage, processed, and then permanently deleted — typically within minutes of your download, and no later than 24 hours regardless of whether the file was downloaded.",
          "Logos and signatures you upload or create are processed entirely in your browser and are not uploaded to our servers.",
        ],
      },
      "We do not scan, analyze, or use the content of your files for any purpose other than applying the watermark or signature you configure.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      {
        type: "list",
        items: [
          "To create and manage your account",
          "To process credit purchases and maintain your credit balance",
          "To send account-related emails (email confirmation, password reset) and, only if you've opted in, occasional marketing emails",
          "To operate the server-side processing path for longer/larger videos and to verify PDF page counts for credit billing",
          "To detect and prevent fraud or abuse (for example, unusual signup or payment activity from a single source)",
          "To maintain and improve the service",
        ],
      },
      "We do not use your data to serve ads, and we do not sell your information to third parties.",
    ],
  },
  {
    title: "Third Parties We Use",
    body: [
      "We rely on the following providers to operate PutWatermark. Each processes data on our behalf, under their own security and privacy practices:",
      {
        type: "list",
        items: [
          "Supabase — authentication, account database, and temporary storage for server-processed videos and billing-related PDF uploads",
          "Vercel — hosting and server-side processing infrastructure",
          "Payment processing — credit purchases will be handled by a third-party payment provider. PayPal and Paystack are planned options depending on region; this section will be updated when payment integration goes live.",
        ],
      },
      "These providers may process data on servers located outside your country. We choose providers with strong security practices, but we encourage you to review their own privacy policies as well.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      {
        type: "list",
        items: [
          "Account information is retained for as long as your account exists. If you never make a purchase, we retain your account for marketing purposes only if you've opted in, and only for a limited period of inactivity, after which we'll either ask if you'd like to stay subscribed or remove your information.",
          "Uploaded files are never retained, with the sole exceptions of temporary server-side video processing and temporary PDF uploads for credit billing, each deleted within 24 hours at the absolute latest.",
          "Credit transaction history is retained for accounting and support purposes.",
        ],
      },
    ],
  },
  {
    title: "Your Rights",
    body: [
      "Depending on where you live, you may have rights including:",
      {
        type: "list",
        items: [
          "Access — request a copy of the personal information we hold about you",
          "Correction — ask us to correct inaccurate information",
          "Deletion — request that we delete your account and associated data. You can initiate this directly from your account settings; deletion requests are actioned within 30 days.",
          "Withdraw marketing consent — unsubscribe from marketing emails at any time, without affecting your ability to use the service",
          "Opt-out / non-discrimination — where applicable under laws such as the CCPA, you will not be treated differently for exercising your privacy rights",
        ],
      },
      "If you're located in South Africa, these rights are provided consistent with the Protection of Personal Information Act (POPIA). If you're located in the EU or UK, these rights are provided consistent with the GDPR. If you're located in California, these rights are provided consistent with the CCPA.",
      "To exercise any of these rights, contact us at hello@putwatermark.com.",
    ],
  },
  {
    title: "Cookies",
    body: [
      "We use only the cookies necessary for authentication and keeping you logged in. We do not currently use advertising or third-party tracking cookies.",
    ],
  },
  {
    title: "Children's Privacy",
    body: [
      "PutWatermark is not directed at children, and we do not knowingly collect personal information from children under 13 (or the relevant minimum age in your jurisdiction). If you believe a child has provided us with personal information, contact us and we will delete it.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use industry-standard measures to protect your information, including encrypted connections (HTTPS) and hashed password storage. No system is completely secure, and we can't guarantee absolute security, but we take reasonable steps to protect your data.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "We may update this policy from time to time. If we make material changes, we'll update the \"Last updated\" date above. Continued use of PutWatermark after changes take effect means you accept the updated policy.",
    ],
  },
  {
    title: "Contact Us",
    body: [
      "Questions about this policy or your data can be sent to hello@putwatermark.com.",
    ],
  },
];
