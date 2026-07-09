export type AboutSection = {
  body: readonly string[];
  title: string;
};

export const aboutPageIntro = {
  lead:
    "Most tools in this category are built to sell you a subscription.",
  highlight:
    "PutWatermark was built to be used — upload, watermark, export, and move on.",
} as const;

export const aboutSections: readonly AboutSection[] = [
  {
    title: "What we believe",
    body: [
      "Good software should solve the job in front of you, not rearrange your day around billing cycles and onboarding funnels.",
      "You should be able to open the editor, see whether it works for your file, and decide later — not hand over an email address just to find out.",
      "We believe watermarking belongs in the browser: no install, no desktop app, no waiting on a queue when a client needs a file back today.",
    ],
  },
  {
    title: "What we protect",
    body: [
      "Your photos, PDFs, and videos — and the time you spend preparing them for clients, portfolios, or publication.",
      "PutWatermark helps you add text, logos, tiled marks, and signatures so shared files carry your name or brand, not just an anonymous attachment.",
      "We are not building a social network or a content library. The point is a clean export you can send with confidence.",
    ],
  },
  {
    title: "How we price it",
    body: [
      "No monthly plan. No paywall before you can try the editor.",
      "Start free. Preview your watermark, adjust placement, and export when the result is right. When you need more volume, buy credits — once, when you are ready.",
      "You pay for usage, not for the privilege of opening the tool. That is deliberate.",
    ],
  },
  {
    title: "Who this is for",
    body: [
      "Creators, freelancers, small teams, and anyone who sends files to clients and needs a watermark now — not a relationship with another SaaS vendor.",
      "If you have ever closed a tab because a tool asked for payment before you could see whether it worked, this is for you.",
      "PutWatermark is for people who want the job done, and the option to pay only when the volume justifies it.",
    ],
  },
] as const;
