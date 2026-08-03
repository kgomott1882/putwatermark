import type { LegalDocumentSection } from "./legalDocumentTypes";

export const DISCLAIMER_LAST_UPDATED = "July 13, 2026";

export const disclaimerSections: LegalDocumentSection[] = [
  {
    title: "General Information Only",
    body: [
      "Content on our blog and website, including guides, comparisons, and explanations of features, is provided for general informational purposes only. It's intended to be accurate and useful, but it isn't a substitute for professional advice specific to your situation.",
    ],
  },
  {
    title: "Not Legal, Financial, or Professional Advice",
    body: [
      "Some of our content touches on legal topics, for example copyright ownership, electronic signature validity, or real estate licensing practices. None of this content is legal advice. Laws vary by jurisdiction and change over time, and how they apply to your specific situation depends on facts we don't have. If a legal question genuinely matters to you, whether that's a contract's enforceability, a copyright dispute, or anything with real consequences, consult a qualified lawyer in your jurisdiction rather than relying on our content.",
      "The same applies to any financial information we provide: nothing on this site is financial or tax advice.",
    ],
  },
  {
    title: "Electronic Signatures",
    body: [
      "PutWatermark lets you draw or type a signature and place it on a document. While electronic signatures are legally recognized for most everyday agreements in many jurisdictions (for example, under the U.S. ESIGN Act and UETA), we don't guarantee that a signature created using PutWatermark satisfies the legal requirements for any specific document, transaction, or jurisdiction. Certain document types (such as wills or specific court filings) may be excluded from electronic signing entirely, regardless of the tool used. If a document's legal validity matters, confirm the requirements with a qualified professional before relying on an electronically signed version.",
    ],
  },
  {
    title: "Watermark Protection Is a Deterrent, Not a Guarantee",
    body: [
      "Watermarking makes unauthorized use of your content more difficult and easier to trace. It does not make theft or misuse impossible. We don't guarantee that a watermark will prevent someone from copying, cropping, editing around, or otherwise misusing your content. Similarly, we don't guarantee that a watermark alone will be sufficient evidence of ownership in any legal dispute; how much weight a watermark carries as evidence depends on the broader facts of the situation and applicable law.",
    ],
  },
  {
    title: "Third Party Links and Comparisons",
    body: [
      "Our content sometimes links to or references third party websites, tools, and products, including comparisons of PutWatermark against other watermarking services. We do our best to keep these accurate as of the time of publishing, but:",
      {
        type: "list",
        items: [
          "We don't control third party websites and aren't responsible for their content, accuracy, or availability.",
          "Third party pricing, features, and policies referenced in our comparisons may change after publishing. Always confirm current details directly with the provider in question.",
          "Linking to a third party site doesn't imply our endorsement of it, and referencing a competitor's product doesn't imply their endorsement of us.",
        ],
      },
    ],
  },
  {
    title: "No Warranty on Accuracy or Completeness",
    body: [
      "We try to keep our website and blog content accurate and current, but we make no representation or warranty that it's complete, error free, or up to date at any given time. If you notice something inaccurate, we'd appreciate you letting us know.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, PutWatermark and Jetskie Softwares are not liable for any loss or damage arising from reliance on information provided on this website or blog. This disclaimer works alongside, and doesn't replace, the limitation of liability in our [Terms of Service](/terms).",
    ],
  },
  {
    title: "Changes to This Disclaimer",
    body: [
      "We may update this disclaimer from time to time. If we make material changes, we'll update the \"Last updated\" date above.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Questions about this disclaimer can be sent to hello@putwatermark.com.",
    ],
  },
];
